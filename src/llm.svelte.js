export const llmToolFunctions = $state({});

llmToolFunctions.newSheet = function (name, cells) {
  const cols = Math.max(...cells.map((row) => row.length));
  this.globals?.addSheet(name, cells.length, cols, (i, j) =>
    cells[i][j]?.toString(),
  );
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
  return this.globals.sheets[sheetIndex]?.cells[row]?.[col]?.formula;
};

llmToolFunctions.setCellFormula = function (sheetIndex, row, col, formula) {
  this.globals.sheets[sheetIndex].cells[row][col].formula = formula;
};

// TODO: Save models to IndexDB (or local storage)
export const llmModels = $state({});

llmModels.Gemini = {
  async request(prompt, systemPrompt, { apiKey }) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro-exp-03-25:generateContent?key=${apiKey}`,
      // `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          system_instruction: {
            parts: systemPrompt.split("\n\n").map((s) => ({ text: s.trim() })),
          },
          generationConfig: {
            response_mime_type: "application/json",
            response_schema: {
              type: "OBJECT",
              properties: {
                code: { type: "STRING" },
              },
            },
          },
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
        if (!r.ok) throw new Error(r.statusText);
        return r.json();
      })
      .catch((e) => {
        console.error(e);
        throw e;
      });
    const j = response?.candidates?.[0]?.content?.parts
      ?.map(({ text }) => text)
      .join("\n\n");
    return JSON.parse(j).code;
  },
};
