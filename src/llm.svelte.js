export const llmToolFunctions = $state({});

llmToolFunctions.newSheet = function (name, cells) {
  const cols = Math.max(...cells.map((row) => row.length));
  this.globals?.addSheet(name, cells.length, cols, (i, j) =>
    cells[i]?.[j]?.toString(),
  );
  this.globals.currentSheetIndex = this.globals.sheets.length - 1;
};
llmToolFunctions.newSheet.description =
  "takes a 2D array of strings containing formulas";

llmToolFunctions.addFunction = function (code) {
  this.globals.formulaCode += `\n${code}\n`;
};
llmToolFunctions.addFunction.description =
  "set functions.formula_name to a new JavaScript function in code to add a formula function";

llmToolFunctions.getCellValue = function (sheetIndex, row, col) {
  return this.globals.sheets[sheetIndex]?.cells[row]?.[col]?.get();
};

llmToolFunctions.getCellFormula = function (sheetIndex, row, col) {
  return this.globals.sheets[sheetIndex]?.cells[row]?.[col]?.formula ?? "";
};

llmToolFunctions.setCellFormula = function (sheetIndex, row, col, formula) {
  this.globals.sheets[sheetIndex].cells[row][col].formula = formula;
};

// TODO: Save models to IndexDB (or local storage)
export const llmModels = $state({});

llmModels.Gemini = {
  model: "gemini-2.5-flash-preview-04-17",
  async request(prompt, systemPrompt) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          system_instruction: {
            parts: systemPrompt.split("\n\n").map((s) => ({ text: s.trim() })),
          },
          tools: [
            {
              google_search: {},
            },
          ],
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
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
    return response?.candidates?.[0]?.content?.parts?.map(({ text }) => text);
  },
};
