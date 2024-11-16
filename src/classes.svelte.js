import { writable, get } from "svelte/store";

const DEFAULT_WIDTH = 56,
  DEFAULT_HEIGHT = 24;

export class Sheet {
  name = $state();
  cells = $state();
  widths = $state();
  heights = $state();

  constructor(name, rows, cols, initial) {
    // TODO: Test optimizations using sparse arrays (wihtout .fill)
    this.name = name;
    this.cells = new Array(rows)
      .fill()
      .map((_, i) =>
        new Array(cols).fill().map((_, j) => new Cell(initial(i, j))),
      );
    this.widths = new Array(cols).fill(DEFAULT_WIDTH);
    this.heights = new Array(rows).fill(DEFAULT_HEIGHT);
  }

  addRows(n, start = this.heights.length) {
    this.heights.splice(start, 0, ...new Array(n).fill(DEFAULT_HEIGHT));
    this.cells.splice(
      start,
      0,
      ...new Array(n)
        .fill()
        .map(() =>
          new Array(this.widths.length).fill().map((_) => new Cell(undefined)),
        ),
    );
  }

  deleteRows(n, start = this.heights.length - n) {
    this.heights.splice(start, n);
    this.cells.splice(start, n);
  }

  addCols(n, start = this.widths.length) {
    this.widths.splice(start, 0, ...new Array(n).fill(DEFAULT_WIDTH));
    this.cells.map((row) =>
      row.splice(
        start,
        0,
        ...new Array(n).fill().map(() => new Cell(undefined)),
      ),
    );
  }

  deleteCols(n, start = this.widths.length - n) {
    this.widths.splice(start, n);
    this.cells.map((row) => row.splice(start, n));
  }
}

export class Cell {
  value = $state();

  constructor(value) {
    this.value = writable(value);
  }

  get() {
    return get(this.value);
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
    const cell = this.get();
    let width = 5,
      height = 5;
    if (cell instanceof Element) {
      width = cell.scrollWidth;
      height = cell.scrollHeight;
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
                max-height: max-content;`,
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
}
