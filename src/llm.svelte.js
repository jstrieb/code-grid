import { functions } from "./formula-functions.svelte";

export const llmToolFunctions = $state({});

llmToolFunctions.newSheet = function (name, cells) {
  const cols = Math.max(...cells.map((row) => row.length));
  this.globals?.addSheet(name, cells.length, cols, (i, j) =>
    cells[i]?.[j]?.toString(),
  );
};
llmToolFunctions.newSheet.description =
  "takes a 2D array of strings containing formulas";

llmToolFunctions.addRow = function (sheetIndex, offset) {
  this.globals.sheets[sheetIndex]?.addRows(1, offset);
};

llmToolFunctions.addCol = function (sheetIndex, offset) {
  this.globals.sheets[sheetIndex]?.addCols(1, offset);
};

llmToolFunctions.addFunction = function (code) {
  this.globals.formulaCode += `\n${code}\n`;
};
llmToolFunctions.addFunction.description =
  "set functions.formula_name to a new JavaScript function in code to add a formula function";

llmToolFunctions.getCell = function (sheetIndex, row, col) {
  const cell = this.globals.sheets[sheetIndex]?.cells[row]?.[col];
  const result = {
    formula: cell?.formula,
  };
  const value = cell?.get();
  if (value != result.formula) {
    result.value = value;
  }
  if (cell.errorText) {
    result.error = cell.errorText;
  }
  return result;
};
llmToolFunctions.getCell.description =
  "returns a cell object with a value and formula fields";

llmToolFunctions.setCellFormula = function (sheetIndex, row, col, formula) {
  this.globals.sheets[sheetIndex].cells[row][col].formula = formula;
};

llmToolFunctions.getFormulaFunctionsList = function () {
  return Object.keys(functions);
};

llmToolFunctions.getFormulaFunction = function (name) {
  return functions[name].toString();
};

llmToolFunctions.getSheets = function () {
  return this.globals.sheets.map(({ name, cells }) => ({
    name,
    rows: cells.length,
    cols: cells[0]?.length ?? 0,
  }));
};

llmToolFunctions.query = function (value) {
  throw new Error("Implemented in Llm.svelte");
};

// TODO: Save models to IndexDB (or local storage)
export const llmModels = $state({});

llmModels.Gemini = {
  model: "gemini-2.5-flash-preview-04-17",
  async request(conversation) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          generation_config: {
            temperature: 0.5,
          },
          system_instruction: {
            parts: conversation
              .filter(({ role }) => role == "system")
              .map(({ text }) =>
                text.split("\n\n\n").map((s) => ({ text: s.trim() })),
              )
              .flat(Infinity),
          },
          tools: [
            {
              google_search: {},
            },
          ],
          contents: conversation
            .filter(({ role }) => role != "system")
            .map(({ role, text, code }) => ({
              role,
              parts: [{ text: text ?? "```javascript\n" + code + "\n```" }],
            })),
        }),
      },
    )
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
        return r.json();
      })
      .catch((e) => {
        console.error(e);
        throw e;
      });
    return response?.candidates?.[0]?.content?.parts
      ?.map(({ text }) => text.trim())
      .filter((text) => text);
  },
};
