import { Sheet, State } from "../src/classes.svelte.js";
import { test, expect, beforeEach } from "vitest";
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

const originalFunctions = { ...functions };
beforeEach(() => {
  // Restore the imported, destructively-modified, global functions object so
  // that tests cannot influence each other
  Object.keys(functions).forEach((k) => {
    if (k in originalFunctions) return;
    delete functions[k];
  });
  Object.keys(originalFunctions).forEach((k) => {
    functions[k] = originalFunctions[k];
  });
});

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
  state.currentSheet.cells[1][0].formula = "=R0C[0]:R[-1]C";
  await expectSheet(state.currentSheet, [
    [1, 2, 3],
    [[1], undefined, undefined],
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
  evalCode(`functions.with_underscores = (n) => n * 2`);
  state.currentSheet.cells[0][1].formula = "=with_underscores(RC0)";
  await expectSheet(state.currentSheet, [[6, 12]]);
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
  await expectSheet(state.currentSheet, [[5, "=str_not_func(", undefined]]);
  evalCode(`functions.error = async function(x) { throw new Error(x); }`);
  await expectSheet(state.currentSheet, [[5, "=str_not_func(", undefined]]);
  evalCode(`functions.error = (x) => { throw new Error(x); }`);
  await expectSheet(state.currentSheet, [[5, "=str_not_func(", undefined]]);
});

test("Complex math expressions in formulas", async () => {
  const state = createSheet([
    ["1", "2", "3"],
    [
      "=1 + 2 * 3 - -4 / 5 % 6 + 7 * 8 - 9 ** 2 - (10 * 3 - 5 + 2 * 0.5)",
      "=R0C[-1] + R[-1]C * R0C[1] - 4 / 5 % 6 + 7 * 8 - 9 ** 2 - (10 * 3 - sUm(5, 2 * 0.5))",
      undefined,
    ],
  ]);
  await expectSheet(state.currentSheet, [
    [1, 2, 3],
    [
      1 + 2 * 3 - ((-4 / 5) % 6) + 7 * 8 - 9 ** 2 - (10 * 3 - 5 + 2 * 0.5),
      1 + 2 * 3 - ((4 / 5) % 6) + 7 * 8 - 9 ** 2 - (10 * 3 - (5 + 2 * 0.5)),
      undefined,
    ],
  ]);
});

test("Complex logical expressions in formulas", async () => {
  const state = createSheet([
    [
      "=~0 >>> 2 ^ ~0 >> 0",
      '=(!0 && !false && !!true || !!"true") && ""',
      "=~0 >>> 0 << 12",
      "=!(~0 >>> 0 & 0x1 | 0xff) || false",
      "=if(5 < 3 || 2 > 1 && 1 == 1 || 2 != 1 && 3 <= 0x5, 2 >= 1, 10)",
    ],
  ]);
  await expectSheet(state.currentSheet, [
    [
      (~0 >>> 2) ^ (~0 >> 0),
      ((!0 && !false && !!true) || !!"true") && "",
      (~0 >>> 0) << 12,
      !(((~0 >>> 0) & 0x1) | 0xff) || false,
      5 < 3 || (2 > 1 && 1 == 1) || (2 != 1 && 3 <= 0x5) ? 2 >= 1 : 10,
    ],
  ]);
});

test("Evaluating bad code", () => {
  evalCode();
  expect(evalCode(`asdf(`, (x) => x)).toBeTypeOf("string");
});

test("Miscellaneous standard library formula functions", async () => {
  const state = createSheet([["=IF(false, true, 1234.567)", "100"]]);
  await expectSheet(state.currentSheet, [[1234.567, 100]]);
  state.currentSheet.cells[0][0].formula = "=RANDINT(RC[1])";
  await expect
    .poll(() => state.currentSheet.cells[0][0].get())
    .toBeGreaterThanOrEqual(0);
  await expect
    .poll(() => state.currentSheet.cells[0][0].get())
    .toBeLessThan(100);
  state.currentSheet.cells[0][1].formula = "=10";
  await expect
    .poll(() => state.currentSheet.cells[0][0].get())
    .toBeGreaterThanOrEqual(0);
  await expect
    .poll(() => state.currentSheet.cells[0][0].get())
    .toBeLessThan(10);
});

test("Ranges are not flattened", async () => {
  const state = createSheet([
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["=R0C:R1C[1]", "=R[-2]C0:R[-2]C2", "=R0C0:R1C0"],
  ]);
  await expectSheet(state.currentSheet, [
    [1, 2, 3],
    [4, 5, 6],
    [
      [
        [1, 2],
        [4, 5],
      ],
      [1, 2, 3],
      [1, 4],
    ],
  ]);
});

test("Standard library functions on 2D ranges", async () => {
  const state = createSheet([
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["=SUM(R0C:R1C[1])", "=sum(R[-2]C0:R[-2]C2)", "=Sum(R0C0:R1C0)"],
  ]);
  await expectSheet(state.currentSheet, [
    [1, 2, 3],
    [4, 5, 6],
    [12, 6, 5],
  ]);
  state.currentSheet.cells[0][0].formula = undefined;
  await expectSheet(state.currentSheet, [
    [undefined, 2, 3],
    [4, 5, 6],
    [11, 5, 4],
  ]);

  state.currentSheet.cells[0][0].formula = "1";
  state.currentSheet.cells[2][0].formula = "=PROD(R0C:R1C[1])";
  state.currentSheet.cells[2][1].formula = "=Prod(R[-2]C0:R[-2]C2)";
  state.currentSheet.cells[2][2].formula = "=prod(R0C0:R1C0)";
  await expectSheet(state.currentSheet, [
    [1, 2, 3],
    [4, 5, 6],
    [40, 6, 4],
  ]);
  state.currentSheet.cells[0][0].formula = undefined;
  await expectSheet(state.currentSheet, [
    [1, 2, 3],
    [4, 5, 6],
    [0, 0, 0],
  ]);

  state.currentSheet.cells[0][0].formula = "1";
  state.currentSheet.cells[2][0].formula = "=avg(R0C:R1C[1])";
  state.currentSheet.cells[2][1].formula = "=AVG(R[-2]C0:R[-2]C2)";
  state.currentSheet.cells[2][2].formula = "=Avg(R0C0:R1C0)";
  await expectSheet(state.currentSheet, [
    [1, 2, 3],
    [4, 5, 6],
    [3, 2, 2.5],
  ]);
  state.currentSheet.cells[0][0].formula = undefined;
  await expectSheet(state.currentSheet, [
    [1, 2, 3],
    [4, 5, 6],
    [11 / 4, 5 / 3, 2],
  ]);
});

test("Function arguments and return values are not flattened", async () => {
  evalCode(
    `functions.length = (x) => x?.length ?? 0; functions.list = () => [1, 2, 3];`,
  );
  const state = createSheet([["=LIST()"]]);
  await expectSheet(state.currentSheet, [[[1, 2, 3]]]);
  state.currentSheet.cells[0][0].formula = "=LENGTH(LiST())";
  await expectSheet(state.currentSheet, [[3]]);
});

test("Overriding formula functions", async () => {
  const state = createSheet([["=LOG2(1024)"]]);
  await expectSheet(state.currentSheet, [[10]]);
  evalCode(`functions.log2 = () => 420;`);
  await expectSheet(state.currentSheet, [[420]]);
});

test("Async formula functions", async () => {
  evalCode(
    `functions.sleep = (x, ms) => new Promise(r => setTimeout(() => r(x), ms))`,
  );
  const state = createSheet([["=sleep(1024, 250)"]]);
  await expectSheet(state.currentSheet, [[1024]]);
});

test("Negative cell indexing", async () => {
  const state = createSheet([
    ["=RC-1", "=R-1c", "2", "2", "4"],
    ["0", "5", "6", "7", "8"],
  ]);
  await expectSheet(state.currentSheet, [
    [4, 5, 2, 2, 4],
    [0, 5, 6, 7, 8],
  ]);
  state.currentSheet.cells[0][2].formula = "=RC -1";
  state.currentSheet.cells[0][3].formula = "=RC - 1";
  state.currentSheet.cells[1][0].formula = "=R0C2 == R0C3";
  await expect.poll(() => state.currentSheet.cells[0][2].get()).toBeLessThan(0);
  await expect.poll(() => state.currentSheet.cells[0][3].get()).toBeLessThan(0);
  await expect.poll(() => state.currentSheet.cells[1][0].get()).toBe(true);
});

test("Negative range indexing", async () => {
  const state = createSheet([
    ["=R[1]C0:R[1]C-1", undefined, undefined],
    ["1", "2", "3"],
  ]);
  await expectSheet(state.currentSheet, [
    [[1, 2, 3], undefined, undefined],
    [1, 2, 3],
  ]);
  state.currentSheet.addCols(1);
  await expectSheet(state.currentSheet, [
    [[1, 2, 3, undefined], undefined, undefined],
    [1, 2, 3, undefined],
  ]);
  state.currentSheet.cells[1][3].formula = "4";
  await expectSheet(state.currentSheet, [
    [[1, 2, 3, 4], undefined, undefined],
    [1, 2, 3, 4],
  ]);
  state.currentSheet.deleteCols(1);
  state.currentSheet.cells[0][0].formula = "4";
  state.currentSheet.cells[0][1].formula = "=R0C0:R-1C0";
  await expectSheet(state.currentSheet, [
    [4, [4, 1], undefined],
    [1, 2, 3],
  ]);
  state.currentSheet.cells[0][1].formula = "=R-1C0:R-1C-1";
  await expectSheet(state.currentSheet, [
    [4, [1, 2, 3], undefined],
    [1, 2, 3],
  ]);
  state.currentSheet.cells[0][1].formula = "=R0C-1:R-1C-1";
  await expectSheet(state.currentSheet, [
    [4, [undefined, 3], undefined],
    [1, 2, 3],
  ]);
});

test("Formula functions can access `this`", async () => {
  const state = createSheet([["=BOLD(RC[1] + 1)", "3"]]);
  await expectSheet(state.currentSheet, [[4, 3]]);
});

test("Cells with empty formula have undefined value", async () => {
  const state = createSheet([["", "3"]]);
  await expectSheet(state.currentSheet, [[undefined, 3]]);
  state.currentSheet.cells[0][1].formula = "";
  await expectSheet(state.currentSheet, [[undefined, undefined]]);
});

test("Formulas use strict equality", async () => {
  const state = createSheet([[`=10 == "10"`, `="1" != 1`]]);
  await expectSheet(state.currentSheet, [[false, true]]);
});

test("Formula this object has everything it's supposed to", async () => {
  evalCode(
    `functions.from_this = function(key) { return key in this && this[key] != null; }`,
  );
  const cases = [
    `=!from_this("fake")`,
    `=from_this("row")`,
    `=from_this("col")`,
    `=from_this("set")`,
    `=from_this("update")`,
    `=from_this("style")`,
    `=from_this("globals")`,
    `=!from_this("element")`,
    `=from_this("element", DOLLARS(10))`,
  ];
  const state = createSheet([cases]);
  await expectSheet(state.currentSheet, [cases.map(() => true)]);
});

function crossSheetRef(withBang) {
  const bang = withBang ? "!" : "";
  return async () => {
    const state = createSheet([
      [
        `10`,
        `=S0${bang}RC[-1]`,
        `=S[1]${bang}R0C1`,
        `=S1${bang}R2C2`,
        `=S[1]${bang}R[99]C99`,
        `=S[-1]${bang}R1C2`,
      ],
    ]);
    await expectSheet(state.sheets[0], [
      [10, 10, undefined, undefined, undefined, undefined],
    ]);

    state.sheets.push(
      new Sheet("Sheet 2", 3, 10, (i, j) => `${i * j}`, undefined, state),
    );
    await expectSheet(
      state.sheets[1],
      new Array(3)
        .fill()
        .map((_, i) => new Array(10).fill().map((_, j) => i * j)),
    );
    await expectSheet(state.sheets[0], [[10, 10, 0, 4, undefined, undefined]]);

    state.sheets.unshift(
      new Sheet(
        "Sheet 0",
        4,
        4,
        (i, j) => `=(${i} + 1) / (${j} + 1)`,
        undefined,
        state,
      ),
    );
    await expectSheet(
      state.sheets[0],
      new Array(4)
        .fill()
        .map((_, i) => new Array(4).fill().map((_, j) => (i + 1) / (j + 1))),
    );
    await expectSheet(state.sheets[1], [
      [10, 1, 0, undefined, undefined, 2 / 3],
    ]);

    state.sheets[0].cells[0][0].formula = `=S-1${bang}R2C5`;
    await expectSheet(
      state.sheets[0],
      new Array(4)
        .fill()
        .map((_, i) =>
          new Array(4)
            .fill()
            .map((_, j) => (i == 0 && j == 0 ? 10 : (i + 1) / (j + 1))),
        ),
    );
    await expectSheet(state.sheets[1], [
      [10, 10, 0, undefined, undefined, 2 / 3],
    ]);
  };
}

test("Cross-sheet formula references (with !)", crossSheetRef(true));
test("Cross-sheet formula references (without !)", crossSheetRef(false));

function crossSheetRange(withBang) {
  const bang = withBang ? "!" : "";
  return async () => {
    const state = createSheet([
      [`=s-1${bang}R1C0:R1C-1`, `=s0${bang}R1C0:R1C-1`, `=s${bang}R1C0:R1C-1`],
      ["1", "2", "3"],
    ]);
    await expectSheet(state.sheets[0], [
      [
        [1, 2, 3],
        [1, 2, 3],
        [1, 2, 3],
      ],
      [1, 2, 3],
    ]);

    state.sheets.unshift(
      new Sheet("Sheet 0", 4, 4, (i, j) => `=${i} + ${j}`, undefined, state),
    );
    await expectSheet(
      state.sheets[0],
      new Array(4)
        .fill()
        .map((_, i) => new Array(4).fill().map((_, j) => i + j)),
    );
    await expectSheet(state.sheets[1], [
      [
        [1, 2, 3],
        [1, 2, 3, 4],
        [1, 2, 3],
      ],
      [1, 2, 3],
    ]);

    state.sheets.push(
      new Sheet(
        "Sheet 2",
        4,
        4,
        (i, j) => `=(${i} + 1) * ${j}`,
        undefined,
        state,
      ),
    );
    await expectSheet(
      state.sheets[2],
      new Array(4)
        .fill()
        .map((_, i) => new Array(4).fill().map((_, j) => (i + 1) * j)),
    );
    await expectSheet(state.sheets[1], [
      [
        [0, 2, 4, 6],
        [1, 2, 3, 4],
        [1, 2, 3],
      ],
      [1, 2, 3],
    ]);

    state.sheets[1].cells[0][0].formula = `=s[1]${bang}R1C0:R1C-1`;
    await expectSheet(state.sheets[1], [
      [
        [0, 2, 4, 6],
        [1, 2, 3, 4],
        [1, 2, 3],
      ],
      [1, 2, 3],
    ]);
  };
}

test("Cross-sheet formula ranges (with !)", crossSheetRange(true));
test("Cross-sheet formula ranges (without !)", crossSheetRange(false));

test("Delete rows in the middle of a sheet", async () => {
  const state = createSheet([
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
    ["=SUM(R0C:R[-1]C)", "=SUM(R0C:R[-1]C)", "=SUM(R0C:R[-1]C)"],
  ]);
  await expectSheet(state.currentSheet, [
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9],
    [12, 15, 18],
  ]);
  state.currentSheet.deleteRows(1, 1);
  await expectSheet(state.currentSheet, [
    [1, 2, 3],
    [7, 8, 9],
    [8, 10, 12],
  ]);
});

test("Delete columns in the middle of a sheet", async () => {
  const state = createSheet([
    ["1", "2", "3", "=SUM(RC0:RC[-1])"],
    ["4", "5", "6", "=SUM(RC0:RC[-1])"],
    ["7", "8", "9", "=SUM(RC0:RC[-1])"],
  ]);
  await expectSheet(state.currentSheet, [
    [1, 2, 3, 6],
    [4, 5, 6, 15],
    [7, 8, 9, 24],
  ]);
  state.currentSheet.deleteCols(1, 1);
  await expectSheet(state.currentSheet, [
    [1, 3, 4],
    [4, 6, 10],
    [7, 9, 16],
  ]);
});
