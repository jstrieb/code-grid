import { writable } from "svelte/store";

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
}
