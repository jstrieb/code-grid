import { State } from "../src/classes.svelte.js";
import { test, expect } from "vitest";
import { evalCode, functions } from "../src/formula-functions.svelte.js";

function createSheet(cells, formulaCode = "") {
  return State.load({
    sheets: [
      {
        name: "Sheet 1",
        heights: new Array(cells.length).fill(24),
        widths: new Array(cells[0].length).fill(56),
        cells: cells.map((row) => row.map((s) => ({ formula: s }))),
      },
    ],
    formulaCode: formulaCode,
  });
}

function expectSheet(sheet, cells) {
  return Promise.all(
    cells
      .map((row, i) =>
        row.map((cell, j) =>
          // Poll because after formulas are set, it takes an unknown amount of
          // time for new values to propagate through the graph, and for async
          // results to settle
          expect.poll(() => sheet.cells[i][j].get()).toEqual(cell),
        ),
      )
      .flat(),
  );
}

test("Simple sheet with changes", async () => {
  const state = createSheet([["1", "2", "=R0C0 + R0C1"]]);
  await expectSheet(state.currentSheet, [[1, 2, 3]]);
  state.currentSheet.cells[0][2].formula = "=SUM(R[0]C0:RC[-1])";
  await expectSheet(state.currentSheet, [[1, 2, 3]]);
  state.currentSheet.cells[0][0].formula = "3";
  await expectSheet(state.currentSheet, [[3, 2, 5]]);
  state.currentSheet.cells[0][2].formula = "=RC[-2] * RC[-1] + 5";
  await expectSheet(state.currentSheet, [[3, 2, 11]]);
});

test("Add and remove columns", async () => {
  const state = createSheet([["1", "2", "3"]]);
  await expectSheet(state.currentSheet, [[1, 2, 3]]);
  state.currentSheet.addCols(1);
  await expectSheet(state.currentSheet, [[1, 2, 3, undefined]]);
  state.currentSheet.cells[0][3].formula = "=prod(RC0:RC[-1])";
  await expectSheet(state.currentSheet, [[1, 2, 3, 6]]);
  state.currentSheet.cells[0][3].formula = "=RC0 * RC1 * RC2";
  await expectSheet(state.currentSheet, [[1, 2, 3, 6]]);
  state.currentSheet.addCols(-1);
  await expectSheet(state.currentSheet, [[1, 2, 3]]);
  state.currentSheet.addCols(1);
  await expectSheet(state.currentSheet, [[1, 2, 3, undefined]]);
  state.currentSheet.deleteCols(1);
  await expectSheet(state.currentSheet, [[1, 2, 3]]);
});

test("Add and remove rows", async () => {
  const state = createSheet([["1", "2", "3"]]);
  await expectSheet(state.currentSheet, [[1, 2, 3]]);
  state.currentSheet.addRows(1);
  await expectSheet(state.currentSheet, [
    [1, 2, 3],
    [undefined, undefined, undefined],
  ]);
  state.currentSheet.cells[1][0].formula = "=prod(R[-1]C:R0C2)";
  await expectSheet(state.currentSheet, [
    [1, 2, 3],
    [6, undefined, undefined],
  ]);
  state.currentSheet.cells[1][0].formula = "=R0C * R[-1]C1 * R0C2";
  await expectSheet(state.currentSheet, [
    [1, 2, 3],
    [6, undefined, undefined],
  ]);
  state.currentSheet.addRows(-1);
  await expectSheet(state.currentSheet, [[1, 2, 3]]);
  state.currentSheet.addRows(1);
  await expectSheet(state.currentSheet, [
    [1, 2, 3],
    [undefined, undefined, undefined],
  ]);
  state.currentSheet.deleteRows(1);
  await expectSheet(state.currentSheet, [[1, 2, 3]]);
});

test("Self-referential cell that converges", async () => {
  const state = createSheet([["1024"]]);
  await expectSheet(state.currentSheet, [[1024]]);
  state.currentSheet.cells[0][0].formula = "=RC / 2";
  await expect.poll(() => state.currentSheet.cells[0][0].get()).toBeCloseTo(0);
});

test("Self-referential cell that does not converge", async () => {
  const state = createSheet([["1024"]]);
  await expectSheet(state.currentSheet, [[1024]]);
  state.currentSheet.cells[0][0].formula = "=RC + 1";
  await expect
    .poll(() => state.currentSheet.cells[0][0].get())
    .toBeGreaterThan(1024);
});

test("Simple custom formula functions", async () => {
  evalCode(
    `functions.factorial = (n) => n == 0 ? 1 : (n * functions.factorial(n - 1))`,
  );
  const state = createSheet([["6", "=factorial(RC0)"]]);
  await expectSheet(state.currentSheet, [[6, 720]]);
  // Clean up
  delete functions.factorial;
});

test("Errors in cells", async () => {
  const state = createSheet([["5", "=str_not_func(", "=factorial(RC0)"]]);
  await expectSheet(state.currentSheet, [
    [5, "=str_not_func(", "=factorial(RC0)"],
  ]);
  evalCode(
    `functions.factorial = (n) => n == 0 ? 1 : (n * functions.factorial(n - 1))`,
  );
  await expectSheet(state.currentSheet, [[5, "=str_not_func(", 120]]);
  evalCode(`functions.error = function(x) { throw new Error(x); }`);
  state.currentSheet.cells[0][2].formula = '=error("test")';
  await expectSheet(state.currentSheet, [[5, "=str_not_func(", 120]]);
  evalCode(`functions.error = async function(x) { throw new Error(x); }`);
  await expectSheet(state.currentSheet, [[5, "=str_not_func(", 120]]);
  evalCode(`functions.error = (x) => { throw new Error(x); }`);
  await expectSheet(state.currentSheet, [[5, "=str_not_func(", 120]]);
  // Clean up
  delete functions.factorial;
  delete functions.error;
});
