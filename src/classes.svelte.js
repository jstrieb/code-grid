import { formula } from "./formula.js";
import { debounce, randomId } from "./helpers.js";
import { ParseError } from "./parsers.js";
import { rederivable } from "./store.js";
import { evalCode } from "./formula-functions.svelte.js";

import { get } from "svelte/store";

export const DEFAULT_WIDTH = 56,
  DEFAULT_HEIGHT = 24;

function minmax(min, x, max) {
  return Math.min(Math.max(x, min), max);
}

export class State {
  sheets = $state([]);
  currentSheetIndex = $state(0);
  currentSheet = $derived(this.sheets[this.currentSheetIndex]);
  selected = $state(new Selection());
  mode = $state("normal");
  keyQueue = $state([]);
  pasteBuffer = $state(new Register());
  elements = $state({});
  helpOpen = $state(false);
  editorOpen = $state(false);
  imageOpen = $state(false);
  formulaCode = $state(`// Examples of user-defined formula functions

functions.factorial = (n) => {
  if (n == 0) return 1;
  return n * functions.factorial(n - 1);
};

// Formula functions that modify the containing element using "this" must be
// declared with the "function" keyword - they cannot be arrow functions.
functions.checkbox = function (label) {
  let value;
  this.update((previous) => {
    value = previous;
    return previous;
  });
  this.element = Object.assign(document.createElement("label"), {
    innerText: label,
    style: "display: flex; align-items: center; gap: 1ch; margin: 0 0.5em;",
  });
  this.element.appendChild(
    Object.assign(document.createElement("input"), {
      type: "checkbox",
      style: "appearance: auto;",
      checked: value,
      oninput: (e) => this.set(e.target.checked),
    }),
  );
  return value;
};

// Formula functions can be async
functions.crypto = async (ticker) => {
  return await fetch("https://api.gemini.com/v1/pricefeed", {
    cache: "force-cache",
  })
    .then((r) => r.json())
    .then((l) =>
      Number(
        l.filter((o) => o.pair === ticker.toUpperCase() + "USD")[0].price,
      ),
    );
};
`);

  static load(data) {
    let result = new State(
      data.sheets.map((sheet) => {
        let s = new Sheet(
          sheet.name,
          sheet.heights.length,
          sheet.widths.length,
          (i, j) => sheet.cells[i][j].formula,
          (i, j) => sheet.cells[i][j].value,
        );
        s.widths = sheet.widths;
        s.heights = sheet.heights;
        return s;
      }),
      data.formulaCode,
    );
    return result;
  }

  constructor(sheets, formulaCode) {
    this.sheets = sheets;
    this.sheets.forEach((sheet) => {
      sheet.globals = this;
    });
    if (formulaCode != null) {
      this.formulaCode = formulaCode;
      evalCode(this.formulaCode);
    }
  }

  getSelectedCells() {
    switch (this.selected.type) {
      case "cell":
        const { x: startCol, y: startRow } = this.selected.min;
        const { x: endCol, y: endRow } = this.selected.max;
        return this.currentSheet.cells
          .slice(startRow, endRow + 1)
          .map((row) => row.slice(startCol, endCol + 1));
      case "row":
        return this.currentSheet.cells.slice(
          this.selected.min,
          this.selected.max + 1,
        );
      case "col":
        return this.currentSheet.cells.map((row) =>
          row.slice(this.selected.min, this.selected.max + 1),
        );
    }
  }

  yank() {
    // TODO: Put a paste-able table into the clipboard as well
    switch (this.selected.type) {
      // Block scoping of case branches required for const declarations
      case "cell": {
        const {
          min: { x: startX, y: startY },
          max: { x: endX, y: endY },
        } = this.selected;
        this.pasteBuffer = new Register(
          "cell",
          this.getSelectedCells(),
          this.currentSheet.widths.slice(startX, endX + 1),
          this.currentSheet.heights.slice(startY, endY + 1),
        );
        break;
      }
      case "row": {
        const { min, max } = this.selected;
        this.pasteBuffer = new Register(
          "row",
          this.getSelectedCells(),
          undefined,
          this.currentSheet.heights.slice(min, max + 1),
        );
        break;
      }
      case "col": {
        const { min, max } = this.selected;
        this.pasteBuffer = new Register(
          "col",
          this.getSelectedCells(),
          this.currentSheet.widths.slice(min, max + 1),
        );
        break;
      }
    }
  }

  put(after = true, values = false) {
    switch (this.pasteBuffer.type) {
      case "cell":
        // TODO: Handle different selection types -- larger than paste buffer,
        // smaller than paste buffer, etc., possibly by extrapolating formulas
        // TODO: What does putting "before" even mean for a cell range? Before
        // in the X direction or the Y direction? Both? Neither?
        switch (this.selected.type) {
          case "cell":
            const {
              min: { x, y },
            } = this.selected;
            if (
              this.currentSheet.widths.length - x <
              this.pasteBuffer.widths.length
            ) {
              this.currentSheet.addCols(
                this.pasteBuffer.widths.length -
                  (this.currentSheet.widths.length - x),
              );
            }
            if (
              this.currentSheet.heights.length - y <
              this.pasteBuffer.heights.length
            ) {
              this.currentSheet.addRows(
                this.pasteBuffer.heights.length -
                  (this.currentSheet.heights.length - y),
              );
            }
            this.pasteBuffer.data.forEach((row, i) => {
              row.forEach(({ value, formula }, j) => {
                // TODO: Handle sheet overflow (e.g., pasting 3x3 cells on the
                // last row of a sheet raises an index error)
                this.currentSheet.cells[i + y][j + x].formula = values
                  ? value
                  : formula;
              });
            });
            break;
          case "row":
          case "col":
            // TODO: Handle properly
            throw new Error("Not yet implemented");
        }
        break;
      case "row":
        let y;
        switch (this.selected.type) {
          case "cell":
            if (after) {
              y = this.selected.max.y + 1;
            } else {
              y = this.selected.min.y;
            }
            break;
          case "row":
            if (after) {
              y = this.selected.max + 1;
            } else {
              y = this.selected.min;
            }
            break;
          case "col":
            if (after) {
              y = this.currentSheet.heights.length;
            } else {
              y = 0;
            }
            break;
        }
        this.deselect();
        const numRows = this.pasteBuffer.heights.length;
        // Add rows, then fill them. This handles cases with rows from other
        // sheets that are the wrong size and need to be extended or shrunk.
        this.currentSheet.addRows(numRows, y);
        this.pasteBuffer.heights.forEach((h, i) => {
          this.currentSheet.heights[i + y] = h;
        });
        this.currentSheet.cells.slice(y, y + numRows).forEach((row, i) =>
          row.forEach((cell, j) => {
            cell.formula =
              this.pasteBuffer.data[i][j][values ? "value" : "formula"];
          }),
        );
        this.setSelectionStart("cell", { x: 0, y });
        break;
      case "col":
        let x;
        switch (this.selected.type) {
          case "cell":
            if (after) {
              x = this.selected.max.x + 1;
            } else {
              x = this.selected.min.x;
            }
            break;
          case "row":
            if (after) {
              x = this.currentSheet.widths.length;
            } else {
              x = 0;
            }
            break;
          case "col":
            if (after) {
              x = this.selected.max + 1;
            } else {
              x = this.selected.min;
            }
            break;
        }
        this.deselect();
        const numCols = this.pasteBuffer.widths.length;
        // Add cols, then fill them. This handles cases with cols from other
        // sheets that are the wrong size and need to be extended or shrunk.
        this.currentSheet.addCols(numCols, x);
        this.pasteBuffer.widths.forEach((w, i) => {
          this.currentSheet.widths[i + x] = w;
        });
        this.currentSheet.cells.forEach((row, i) =>
          row.slice(x, x + numCols).forEach((cell, j) => {
            cell.formula =
              this.pasteBuffer.data[i][j][values ? "value" : "formula"];
          }),
        );
        this.setSelectionStart("cell", { x, y: 0 });
        break;
    }
  }

  setSelectedBorders(value = true) {
    switch (this.selected.type) {
      case "cell":
        const { x: startCol, y: startRow } = this.selected.min;
        const { x: endCol, y: endRow } = this.selected.max;
        for (let i = startCol; i < endCol + 1; i++) {
          this.currentSheet.cells[startRow][i].topBorder = value;
          this.currentSheet.cells[endRow][i].bottomBorder = value;
        }
        for (let i = startRow; i < endRow + 1; i++) {
          this.currentSheet.cells[i][startCol].leftBorder = value;
          this.currentSheet.cells[i][endCol].rightBorder = value;
        }
        break;
      case "row":
        for (let i = 0; i < this.currentSheet.widths.length; i++) {
          this.currentSheet.cells[this.selected.min][i].topBorder = value;
          this.currentSheet.cells[this.selected.max][i].bottomBorder = value;
        }
        break;
      case "col":
        for (let i = 0; i < this.currentSheet.heights.length; i++) {
          this.currentSheet.cells[i][this.selected.min].leftBorder = value;
          this.currentSheet.cells[i][this.selected.max].rightBorder = value;
        }
        break;
    }
  }

  scrollSelection(end) {
    if (end == null) {
      return;
    }

    // Don't scroll just from tapping a cell;
    if (this.selected.isSingleton()) {
      return;
    }

    // Scroll if highlighting at the edge of the screen
    switch (this.selected.type) {
      case "cell":
        if (end.x > this.selected.end.x) {
          this.currentSheet.cells[end.y]?.[end.x + 2]?.scrollIntoView();
        } else {
          this.currentSheet.cells[end.y]?.[end.x - 2]?.scrollIntoView();
        }
        if (end.y > this.selected.end.y) {
          this.currentSheet.cells[end.y + 2]?.[end.x]?.scrollIntoView();
        } else {
          this.currentSheet.cells[end.y - 2]?.[end.x]?.scrollIntoView();
        }
        break;
      case "row":
        // TODO
        break;
      case "col":
        // TODO
        break;
    }
  }

  withinSheet(type, selection) {
    let result;
    switch (type) {
      case "cell":
        const maxX = this.currentSheet.widths.length - 1;
        const maxY = this.currentSheet.heights.length - 1;
        result = {
          x: minmax(0, selection.x, maxX),
          y: minmax(0, selection.y, maxY),
        };
        break;
      case "row":
        result = minmax(0, selection, this.currentSheet.heights.length - 1);
        break;
      case "col":
        result = minmax(0, selection, this.currentSheet.widths.length - 1);
        break;
    }
    return result;
  }

  setSelectionStart(type, start) {
    start = this.withinSheet(type, start);
    this.setSelectedBorders(false);
    this.selected.type = type;
    this.selected._start = start;
    this.selected._end = start;
    this.setSelectedBorders(true);
  }

  setSelectionEnd(end) {
    end = this.withinSheet(this.selected.type, end);
    switch (this.selected.type) {
      case "cell":
        if (
          !(this.selected.start.x == end.x && this.selected.start.y == end.y)
        ) {
          this.mode = "visual";
        }
        break;
      case "row":
      case "col":
        if (this.selected.start != end) {
          this.mode = "visual";
        }
        break;
    }
    this.scrollSelection(end);
    this.setSelectedBorders(false);
    this.selected._end = end;
    this.setSelectedBorders(true);
  }

  deselect() {
    this.setSelectionStart(undefined, undefined);
    this.mode = "normal";
  }

  addSheet(name, rows, cols, formula, initial, start = this.sheets.length) {
    const sheet = new Sheet(name, rows, cols, formula, initial);
    sheet.globals = this;
    this.sheets.splice(start, 0, sheet);
  }

  deleteSheets(n, start = this.sheets.length - n) {
    return this.sheets.splice(start, n);
  }
}

function flattenArgs(computed) {
  if (computed?.refs == null) {
    return computed.value;
  }
  return (
    computed.refs
      .map((r) => flattenArgs(r))
      .flat()
      // Hack for detecting stores instead of primitive values
      .filter((r) => r?.subscribe != null)
  );
}

function flattenComputedToFunction(computed) {
  if (computed?.refs == null) {
    return (...args) => args;
  }
  let thunk = computed.thunk ?? ((...args) => args);
  let refArgsCounts = computed.refs.map((r) => r?.numRefArgs ?? 1);
  return async (...args) => {
    let offset = 0;
    // Call the thunk with the correct args from the flattened list. Use `.call`
    // and `.apply` to pass the correct `this` value.
    return await thunk.apply(
      this,
      (
        await Promise.all(
          computed.refs.map((r, i) => {
            const oldOffset = offset;
            offset += refArgsCounts[i];
            // Recurse with the relevant portion of the flattened arguments list
            return flattenComputedToFunction.call(
              this,
              r,
            )(...args.slice(oldOffset, offset));
          }),
        )
      ).flat(),
    );
  };
}

export class Sheet {
  name = $state();
  cells = $state();
  widths = $state();
  heights = $state();
  // Don't reactively update based on changes to globals to avoid risk of
  // circular reactive references.
  globals;

  constructor(name, rows, cols, formula, initial) {
    // TODO: Test optimizations using sparse arrays (without .fill)
    this.name = name;
    this.cells = new Array(rows)
      .fill()
      .map((_, i) =>
        new Array(cols)
          .fill()
          .map((_, j) => this.newCell(formula?.(i, j), i, j, initial?.(i, j))),
      );
    this.widths = new Array(cols).fill(DEFAULT_WIDTH);
    this.heights = new Array(rows).fill(DEFAULT_HEIGHT);
  }

  newCell(initialFormula, row, col, initialValue) {
    const cell = new Cell(initialFormula, initialValue, row, col);

    const maxUpdates = 1000;
    let updateCount = 0;
    const debouncedResetUpdateCount = debounce(() => (updateCount = 0), 100);
    // Call inside $effect.root since this can sometimes be called outside of
    // component initialization (and outside of other tracking scopes). Creating
    // our own tracking scope means we have to destroy it when we are done. For
    // more, see:
    // https://www.matsimon.dev/blog/svelte-in-depth-effect-root
    //
    // TODO: Are there places where cells are being deleted, but not cleaned up?
    cell.cleanup = $effect.root(() => {
      // Having this effect outside of the Cell.svelte file means that we can
      // lazily render cells, and still have off-screen cell values be updated.
      $effect(() => {
        cell.style = "";
        cell.errorText = undefined;
        cell.element = undefined;

        // Re-run this effect if rows or columns are added or removed
        this.heights.length;
        this.widths.length;

        if (cell.formula == null || cell.formula == "") {
          cell.value.rederive([], (_, set) => set(undefined));
          return;
        }

        try {
          const parsed = formula.parse(cell.formula);
          const computed = parsed.compute(
            this.globals,
            this.globals.sheets.indexOf(this),
            cell.row,
            cell.col,
          );
          cell.value.rederive(
            flattenArgs(computed),
            (dependencyValues, set, update) => {
              let _this = {
                set,
                update,
                // Recompute the sheet index in case it's changed between the
                // parsed.compute call above and when this callback is called
                sheet: this.globals.sheets.indexOf(this),
                row: cell.row,
                col: cell.col,
                width: this.widths[cell.col],
                height: this.heights[cell.row],
                style: cell.style,
                element: undefined,
                globals: this.globals,
              };
              flattenComputedToFunction
                .call(
                  _this,
                  computed,
                )(...dependencyValues)
                .then(([result]) => {
                  update((old) => {
                    // TODO: Find a better trigger for resets than just waiting
                    // after updates finish. If, for example, a self-referential
                    // cell's async formula takes longer than the debounce time to
                    // compute, it may run forever.
                    debouncedResetUpdateCount();
                    // Do a finite number of iterations if we're not converging.
                    if (updateCount++ > maxUpdates) {
                      return old;
                    }

                    // Svelte implementation of writable stores (from which
                    // rederivable stores inherit) does not check for approximate
                    // floating point equality when determining if dependents
                    // should refresh. Doing so here prevents spurious cyclic
                    // updates as values converge.
                    if (
                      Number.isFinite(old) &&
                      Number.isFinite(result) &&
                      Math.abs(old - result) < Number.EPSILON
                    ) {
                      return old;
                    }
                    return result;
                  });
                  cell.style = _this.style;
                  cell.element = _this.element;
                  cell.errorText = _this.errorText;
                })
                .catch((e) => {
                  set(undefined);
                  cell.errorText = `Error: ${e?.message ?? e}`;
                });
            },
          );
        } catch (e) {
          if (!(e instanceof ParseError)) {
            cell.errorText = `Error: ${e.message}`;
            cell.value.rederive([], (_, set) => set(undefined));
          } else {
            cell.value.rederive([], (_, set) => set(cell.formula));
          }
        }
      });
    });

    return cell;
  }

  addRows(n, start = this.heights.length) {
    if (n < 0) {
      // Explicitly use the arguments object to avoid using the default value if
      // no start is set
      return this.deleteRows(-n, arguments[1]);
    }
    this.heights.splice(start, 0, ...new Array(n).fill(DEFAULT_HEIGHT));
    this.cells
      .slice(start)
      .flat(Infinity)
      .forEach((cell) => {
        cell.row += n;
      });
    this.cells.splice(
      start,
      0,
      ...new Array(n)
        .fill()
        .map((_, i) =>
          new Array(this.widths.length)
            .fill()
            .map((_, j) => this.newCell(undefined, start + i, j)),
        ),
    );
  }

  deleteRows(n, start = this.heights.length - n) {
    this.heights.splice(start, n);
    this.cells
      .slice(start)
      .flat(Infinity)
      .forEach((cell) => {
        cell.row -= n;
      });
    this.cells
      .splice(start, n)
      .flat(Infinity)
      .forEach((cell) => cell.cleanup());
  }

  addCols(n, start = this.widths.length) {
    if (n < 0) {
      // Explicitly use the arguments object to avoid using the default value if
      // no start is set
      return this.deleteCols(-n, arguments[1]);
    }
    this.widths.splice(start, 0, ...new Array(n).fill(DEFAULT_WIDTH));
    this.cells.forEach((row) =>
      row.slice(start).forEach((cell) => {
        cell.col += n;
      }),
    );
    this.cells.map((row, i) =>
      row.splice(
        start,
        0,
        ...new Array(n)
          .fill()
          .map((_, j) => this.newCell(undefined, i, start + j)),
      ),
    );
  }

  deleteCols(n, start = this.widths.length - n) {
    this.widths.splice(start, n);
    this.cells.forEach((row) =>
      row.slice(start).forEach((cell) => {
        cell.col -= n;
      }),
    );
    this.cells
      .map((row) => row.splice(start, n))
      .flat(Infinity)
      .forEach((cell) => cell.cleanup());
  }

  autoResizeCol(i) {
    const newWidth = Math.max(
      ...this.cells
        .map((row) => row[i])
        .map((cell) => cell.naturalSize().width),
    );
    if (!Number.isNaN(newWidth)) {
      this.widths[i] = newWidth;
    }
  }

  autoResizeRow(i) {
    const newHeight = Math.max(
      ...this.cells[i].map((cell) => cell.naturalSize().height),
    );
    if (!Number.isNaN(newHeight)) {
      this.heights[i] = newHeight;
    }
  }
}

export class Cell {
  value = $state();
  style = $state("");
  errorText = $state();
  element = $state();
  formula = $state();
  td = $state();
  row = $state();
  col = $state();
  topBorder = $state(false);
  bottomBorder = $state(false);
  rightBorder = $state(false);
  leftBorder = $state(false);
  editing = $state(false);

  constructor(formula, value, row, col) {
    this.formula = formula;
    this.value = rederivable(value ?? formula);
    this.row = row;
    this.col = col;
  }

  get() {
    return get(this.value);
  }

  scrollIntoView() {
    this.td?.scrollIntoView({
      block: "nearest",
      inline: "nearest",
    });
  }

  naturalSize() {
    // TODO: Make this function faster.
    //       - svelte/store/get is slow
    //       - Writing DOM elements to the body and measuring is slow
    //
    // Note that measuring actual internal parts of cells doesn't work reliably
    // because cell inner elements all have their width explicitly set. Changing
    // the width and re-measuring can result in inconsistent results. That is
    // why we create new <div>s instead of measuring existing ones.
    const value = this.errorText != null ? this.errorText : this.get();
    let width = 5,
      height = 5;
    if (value != null) {
      const div = Object.assign(document.createElement("div"), {
        // Match padding of cell in Cell.svelte
        style: `padding: 0.1em 0.2em; 
                z-index: -1; 
                min-width: max-content;
                width: max-content;
                max-width: max-content;
                min-height: max-content;
                height: max-content;
                max-height: max-content; 
                ${this.style ?? ""}`,
      });
      if (this.element != null) {
        div.appendChild(this.element.cloneNode(true));
      } else {
        div.innerText = value.toString();
      }
      document.body.append(div);
      width = div.scrollWidth;
      height = div.scrollHeight;
      div.remove();
    }
    // Add 5 since the exact value still sometimes overflows (due to padding?)
    return {
      width: (width ?? 5) + 5,
      height: (height ?? 5) + 5,
    };
  }

  deselect() {
    this.topBorder = false;
    this.bottomBorder = false;
    this.leftBorder = false;
    this.rightBorder = false;
  }
}

export class Selection {
  type = $state();
  _start = $state();
  _end = $state();

  get start() {
    return this._start;
  }

  get end() {
    return this._end;
  }

  set start(_) {
    throw new Error(
      "Do not set start directly! Set it through one of the methods.",
    );
  }

  set end(_) {
    throw new Error(
      "Do not set end directly! Set it through one of the methods.",
    );
  }

  get min() {
    switch (this.type) {
      case "cell":
        return {
          x: Math.min(this.start.x, this.end.x),
          y: Math.min(this.start.y, this.end.y),
        };
      case "row":
      case "col":
        return Math.min(this.start, this.end);
    }
  }

  get max() {
    switch (this.type) {
      case "cell":
        return {
          x: Math.max(this.start.x, this.end.x),
          y: Math.max(this.start.y, this.end.y),
        };
      case "row":
      case "col":
        return Math.max(this.start, this.end);
    }
  }

  contains(i, j) {
    switch (this.type) {
      case "cell":
        return (
          this.min.y <= i &&
          i <= this.max.y &&
          this.min.x <= j &&
          j <= this.max.x
        );
      case "row":
      case "col":
        return this.min <= i && i <= this.max;
    }
  }

  row(i) {
    return this.type == "row" && this.contains(i);
  }

  col(i) {
    return this.type == "col" && this.contains(i);
  }

  isSingleton() {
    return (
      this.type == "cell" &&
      this.start.x == this.end.x &&
      this.start.y == this.end.y
    );
  }
}

// Called "registers" in Vim, they're just buffers for yanked data
export class Register {
  type = $state();
  data = $state();
  widths = $state();
  heights = $state();
  // Used to correlate clipboard data with paste buffer data
  id = $state();

  constructor(type, data, widths, heights) {
    this.type = type;
    this.data = data?.map((row) =>
      row.map((cell) => ({ formula: cell.formula, value: cell.get() })),
    );
    this.widths = widths;
    this.heights = heights;
    this.id = randomId();
  }
}
