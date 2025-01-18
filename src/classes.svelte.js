import { formula } from "./formula.js";
import { debounce } from "./helpers.js";
import { ParseError } from "./parsers.js";
import { rederivable } from "./store.js";
import { evalCode } from "./formula-functions.svelte.js";

import { get } from "svelte/store";

const DEFAULT_WIDTH = 56,
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
  helpOpen = $state(false);
  editorOpen = $state(false);
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
    this.scrollSelection(start);
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

  constructor(name, rows, cols, formula, initial) {
    // TODO: Test optimizations using sparse arrays (without .fill)
    this.name = name;
    this.cells = new Array(rows)
      .fill()
      .map((_, i) =>
        new Array(cols)
          .fill()
          .map((_, j) => this.newCell(formula(i, j), i, j, initial?.(i, j))),
      );
    this.widths = new Array(cols).fill(DEFAULT_WIDTH);
    this.heights = new Array(rows).fill(DEFAULT_HEIGHT);
  }

  newCell(initialFormula, row, col, initialValue) {
    const cell = new Cell(initialFormula, initialValue);

    const maxUpdates = 1000;
    let updateCount = 0;
    const debouncedResetUpdateCount = debounce(() => (updateCount = 0), 100);
    // Call inside $effect.root since this can sometimes be called outside of
    // component initialization (and outside of other tracking scopes). Creating
    // our own tracking scope means we have to destroy it when we are done. For
    // more, see:
    // https://www.matsimon.dev/blog/svelte-in-depth-effect-root
    //
    // TODO: should the effect.root resulting cleanup function be saved and run?
    $effect.root(() => {
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
          const computed = parsed.compute(this.cells, row, col);
          cell.value.rederive(
            flattenArgs(computed),
            (dependencyValues, set, update) => {
              let _this = {
                row,
                col,
                set,
                update,
                style: cell.style,
                element: undefined,
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
            // TODO: Remove?
            console.warn(e);
          }
          cell.value.rederive([], (_, set) => set(cell.formula));
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
    this.cells.splice(start, n);
  }

  addCols(n, start = this.widths.length) {
    if (n < 0) {
      // Explicitly use the arguments object to avoid using the default value if
      // no start is set
      return this.deleteCols(-n, arguments[1]);
    }
    this.widths.splice(start, 0, ...new Array(n).fill(DEFAULT_WIDTH));
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
    this.cells.map((row) => row.splice(start, n));
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
  topBorder = $state(false);
  bottomBorder = $state(false);
  rightBorder = $state(false);
  leftBorder = $state(false);
  editing = $state(false);

  constructor(formula, value) {
    this.formula = formula;
    this.value = rederivable(value ?? formula);
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
    const cell = this.errorText != null ? this.errorText : this.get();
    let width = 5,
      height = 5;
    if (this.element != null) {
      width = this.element.scrollWidth;
      height = this.element.scrollHeight;
    } else if (cell != null) {
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
        innerText: cell.toString(),
      });
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
}
