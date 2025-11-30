import { functions } from "./formula-functions.svelte";

export const llmToolFunctions = $state({});

llmToolFunctions.newSheet = function (name, cells) {
  const cols = Math.max(...cells.map((row) => row.length));
  this.globals?.addSheet(name, cells.length, cols, (i, j) =>
    cells[i]?.[j]?.toString(),
  );
};
llmToolFunctions.newSheet.description =
  "cells is a 2D array of strings containing formulas, and a required argument";

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
  model: "gemini-flash-latest",
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
            thinkingConfig: {
              thinkingBudget: -1,
            },
          },
          tools: [
            // { google_search: {}, url_context: {}, },
            {
              functionDeclarations: [
                {
                  name: "evalJavaScript",
                  description:
                    "Evaluate JavaScript code in the spreadsheet context to read and modify spreadsheet state",
                  parameters: {
                    type: "object",
                    properties: {
                      code: {
                        type: "string",
                      },
                    },
                    required: ["code"],
                  },
                },
              ],
            },
          ],
          system_instruction: {
            parts: conversation
              .filter(({ role }) => role == "system")
              .map(({ text }) =>
                text.split("\n\n\n").map((s) => ({ text: s.trim() })),
              )
              .flat(Infinity),
          },
          contents: conversation
            .filter(({ role }) => role != "system")
            .filter(
              // Text can be null or set, but not empty string
              ({ text }) => text !== "",
            )
            .map(({ role, text, code, response }) => {
              if (text) {
                return { role, parts: [{ text }] };
              } else if (code) {
                return {
                  role,
                  parts: [
                    {
                      functionCall: { name: "evalJavaScript", args: { code } },
                    },
                  ],
                };
              } else if (response) {
                return {
                  role,
                  parts: [
                    {
                      function_response: {
                        name: "evalJavaScript",
                        response: { output: response },
                      },
                    },
                  ],
                };
              }
            }),
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
    const result = response?.candidates?.[0]?.content?.parts?.map(
      ({ text, functionCall }) => {
        if (functionCall) {
          return { role: "model", code: functionCall?.args?.code };
        } else {
          return { role: "model", text };
        }
      },
    );
    console.log(result);
    return result;
  },
};
