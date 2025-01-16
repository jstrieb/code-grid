import { State } from "../src/classes.svelte.js";
import { test, expect } from "vitest";

function createSheet(cells) {
  return State.load({
    sheets: [
      {
        name: "Sheet 1",
        heights: new Array(cells.length).fill(24),
        widths: new Array(cells[0].length).fill(56),
        cells: cells.map((row) => row.map((s) => ({ formula: s }))),
      },
    ],
    formulaCode: "",
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

test("Simple Sheet", async () => {
  const state = createSheet([["1", "2", "=RC0 + RC1"]]);
  await expectSheet(state.currentSheet, [[1, 2, 3]]);
  state.currentSheet.cells[0][0].formula = "3";
  await expectSheet(state.currentSheet, [[3, 2, 5]]);
  state.currentSheet.cells[0][2].formula = "=RC[-2] * RC[-1] + 5";
  await expectSheet(state.currentSheet, [[3, 2, 11]]);
});
