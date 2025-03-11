import { Register, DEFAULT_WIDTH, DEFAULT_HEIGHT } from "./classes.svelte";

export const keybindings = {
  "Shift+tab": "Move Selection Left",
  tab: "Move Selection Right",
  arrowleft: "Move Selection Left",
  arrowright: "Move Selection Right",
  arrowup: "Move Selection Up",
  arrowdown: "Move Selection Down",
  h: "Move Selection Left",
  l: "Move Selection Right",
  k: "Move Selection Up",
  j: "Move Selection Down",
  // TODO: For w, b, and e, move selections with wrapping
  b: "Move Selection Left",
  w: "Move Selection Right",
  e: "Move Selection Right",
  v: "Visual Mode",
  // TODO: Find a keyboard shortcut for this if Ctrl+v is paste
  // "Ctrl+v": "Select Column",
  "Shift+v": "Select Row",
  "Ctrl+a": "Select All",
  "Shift+o": "Insert Row Above",
  o: "Insert Row Below",
  d: "Delete (Vim)",
  "Ctrl+c": "Copy",
  "Meta+c": "Copy",
  "Ctrl+v": "Paste",
  "Ctrl+Shift+v": "Paste values",
  "Meta+v": "Paste",
  "Meta+Shift+v": "Paste values",
  p: "Put After",
  "Shift+p": "Put Before",
  backspace: "Delete",
  y: "Yank",
  delete: "Delete",
  x: "Clear Cells",
  s: "Clear Cells and Insert",
  enter: "Edit",
  "=": "Insert Equals",
  i: "Edit in Formula Bar",
  0: "Go to Start of Row",
  "Shift+^": "Go to Start of Row",
  "Shift+$": "Go to End of Row",
  "Shift+?": "Toggle Help",
  ":": "Toggle Code Editor",
  "Shift+:": "Toggle Code Editor",
  "Ctrl+s": "Toggle Save and Load",
  "Super+s": "Toggle Save and Load",
  g: "Go To",
  "Shift+g": "Go to Bottom",
  "Ctrl+z": "Undo",
  "Meta+z": "Undo",
  u: "Undo",
  "Ctrl+Shift+z": "Redo",
  "Ctrl+y": "Redo",
  "Meta+y": "Redo",
  "Ctrl+r": "Redo",
  // Unpressable keys added just for documentation
  "g+g": "Go to Top",
  "d+d": "Delete (Vim)",
  "y+y": "Yank",
  // TODO: Figure out how to not show keys that must be preceded by g such as
  // gT and gt
};

async function getClipboard() {
  let clipboard = await navigator.clipboard.read();
  const types = {};
  for (const item of clipboard) {
    for (const type of item.types) {
      if (type in types || !type.startsWith("text/")) continue;
      const blob = await item.getType(type);
      types[type] = await blob.text();
    }
  }
  return types;
}

// For parsing tables from the paste buffer
const domParser = new DOMParser();
function setPasteBufferFromClipboard(globals, clipboard) {
  pasteHtml: if (clipboard["text/html"]) {
    const doc = domParser.parseFromString(clipboard["text/html"], "text/html");
    // TODO: Handle rich text with no table
    const table = doc.querySelector("table");
    if (table == null) {
      break pasteHtml;
    }
    if (table.id == globals.pasteBuffer.id) {
      // The table is already in the paste buffer
      return;
    }
    // TODO: Handle tables with inconsistent numbers of <td> elements per row
    const widths = Array.from(table.querySelectorAll("tr:first-child td")).map(
      (element) =>
        Number(
          // element.width could be undefined, the empty string, or zero
          element.width || DEFAULT_WIDTH,
        ),
    );
    const heights = Array.from(table.querySelectorAll("tr td:first-child")).map(
      (element) =>
        Number(
          // element.height could be undefined, the empty string, or zero
          element.height || DEFAULT_HEIGHT,
        ),
    );
    if (widths.length > globals.currentSheet.widths.length) {
      throw new Error("Not yet implemented");
    }
    if (heights.length > globals.currentSheet.heights.length) {
      throw new Error("Not yet implemented");
    }
    let type = "cell";
    if (widths.length == globals.currentSheet.widths.length) {
      type = "row";
    } else if (heights.length == globals.currentSheet.heights.length) {
      type = "col";
    }
    globals.pasteBuffer = new Register(
      type,
      Array.from(table.querySelectorAll("tr")).map((row) =>
        Array.from(row.querySelectorAll("td")).map(
          ({ dataset: { formula }, innerText: value }) => ({
            formula,
            get: () => value,
          }),
        ),
      ),
      widths,
      heights,
    );
    return;
  }

  if (clipboard["text/plain"]) {
    const data = clipboard["text/plain"]
      .split("\n")
      .map((row) =>
        row.split("\t").map((formula) => ({ formula, get: () => formula })),
      );
    if (!data) return;
    if (data[0].length > globals.currentSheet.widths.length) {
      throw new Error("Not yet implemented");
    }
    if (data.length > globals.currentSheet.heights.length) {
      throw new Error("Not yet implemented");
    }
    let type = "cell";
    if (data[0].length == globals.currentSheet.widths.length) {
      type = "row";
    } else if (data.length == globals.currentSheet.heights.length) {
      type = "col";
    }
    globals.pasteBuffer = new Register(
      type,
      data,
      new Array(data[0].length).fill(DEFAULT_WIDTH),
      new Array(data.length).fill(DEFAULT_HEIGHT),
    );
  }
}

export const actions = {
  Copy: async (e, globals) => {
    const cells = globals.getSelectedCells();
    if (cells == null) {
      return;
    }

    globals.yank();
    const { type, end } = globals.selected;
    globals.setSelectionStart(type, end);
    globals.mode = "normal";

    // CSV format
    // const plain = cells
    //   .map((row) =>
    //     row
    //       .map((cell) => {
    //         const value = cell.get().toString().replace('"', '""');
    //         return `"${value}"`;
    //       })
    //       .join(","),
    //   )
    //   .join("\r\n");

    const plain = cells
      .map((row) => row.map((cell) => cell.get()?.toString() ?? "").join("\t"))
      .join("\n");

    const table = document.createElement("table");
    // Get ID from paste buffer for correlation upon paste
    table.id = globals.pasteBuffer.id;
    table.dataset.origin = "https://jstrieb.github.io/code-grid";
    cells.forEach((row, i) => {
      const tr = document.createElement("tr");
      row.forEach((cell, j) => {
        const td = document.createElement("td");
        td.dataset.formula = cell.formula;
        td.innerText = cell.get()?.toString() ?? "";
        // TODO: Set width and height
        tr.appendChild(td);
      });
      table.appendChild(tr);
    });
    const html = table.outerHTML;

    const clipboard = {};
    if (!("ClipboardItem" in window && "clipboard" in navigator)) {
      // TODO: Fallback
      throw new Error("Cannot copy in non-secure contexts (TODO)");
      return;
    }
    if (ClipboardItem.supports("text/plain")) {
      clipboard["text/plain"] = new Blob([plain], { type: "text/plain" });
    }
    if (ClipboardItem.supports("text/html")) {
      clipboard["text/html"] = new Blob([html], { type: "text/html" });
    }
    await navigator.clipboard?.write([new ClipboardItem(clipboard)]);
  },

  Paste: async (e, globals) => {
    // TODO: Notify the user of paste error
    setPasteBufferFromClipboard(globals, await getClipboard());
    return actions["Put After"](e, globals);
  },

  "Paste values": async (e, globals) => {
    // TODO: Notify the user of paste error
    setPasteBufferFromClipboard(globals, await getClipboard());
    switch (globals.mode) {
      case "normal":
      case "visual":
        globals.put(true, true);
        break;
    }
  },

  "Toggle Save and Load": (e, globals) => {
    globals.imageOpen = !globals.imageOpen;
  },

  "Put Before": (e, globals) => {
    switch (globals.mode) {
      case "normal":
      case "visual":
        globals.put(false);
        break;
    }
  },

  "Put After": (e, globals) => {
    switch (globals.mode) {
      case "normal":
      case "visual":
        globals.put(true);
        break;
    }
  },

  Yank: (e, globals) => {
    // TODO: Proper verbs for yanking with motions
    if (
      globals.mode == "normal" &&
      globals.selected.isSingleton() &&
      globals.keyQueue[globals.keyQueue.length - 1] != "y"
    ) {
      globals.keyQueue.push("y");
      return;
    } else if (globals.keyQueue[globals.keyQueue.length - 1] == "y") {
      globals.keyQueue.pop();
    }
    if (globals.mode == "normal" && globals.selected.isSingleton()) {
      const { x, y } = globals.selected.start;
      globals.setSelectionStart("row", y);
      globals.yank();
      globals.deselect();
      globals.setSelectionStart("cell", {
        x,
        y: Math.min(y, globals.currentSheet.heights.length - 1),
      });
      return;
    }
    globals.yank();
    const { type, end } = globals.selected;
    globals.setSelectionStart(type, end);
    globals.mode = "normal";
  },

  "Delete (Vim)": (e, globals) => {
    // TODO: Proper verbs for deleting with motions
    if (
      globals.mode == "normal" &&
      globals.selected.isSingleton() &&
      globals.keyQueue[globals.keyQueue.length - 1] != "d"
    ) {
      globals.keyQueue.push("d");
      return;
    } else if (globals.keyQueue[globals.keyQueue.length - 1] == "d") {
      globals.keyQueue.pop();
    }
    if (globals.mode == "normal" && globals.selected.isSingleton()) {
      const { x, y } = globals.selected.start;
      globals.setSelectionStart("row", y);
      globals.yank();
      globals.deselect();
      globals.currentSheet.deleteRows(1, y);
      globals.setSelectionStart("cell", {
        x,
        y: Math.min(y, globals.currentSheet.heights.length - 1),
      });
      return;
    }
    globals.yank();
    actions.Delete(e, globals);
  },

  "Insert Row Above": (e, globals) => {
    let row;
    switch (globals.selected.type) {
      case "cell":
        row = globals.selected.min.y;
        break;
      case "row":
        row = globals.selected.min;
        break;
      case "col":
      case undefined:
        row = 0;
        break;
    }
    globals.deselect();
    globals.currentSheet.addRows(1, row);
    globals.setSelectionStart("cell", { x: 0, y: row });
    globals.currentSheet.cells[row][0].editing = true;
  },

  "Insert Row Below": (e, globals) => {
    let row;
    switch (globals.selected.type) {
      case "cell":
        row = globals.selected.max.y;
        break;
      case "row":
        row = globals.selected.max;
        break;
      case "col":
      case undefined:
        row = globals.currentSheet.heights.length - 1;
        break;
    }
    row += 1;
    globals.deselect();
    globals.currentSheet.addRows(1, row);
    globals.setSelectionStart("cell", { x: 0, y: row });
    globals.currentSheet.cells[row][0].editing = true;
  },

  "Clear Cells and Insert": (e, globals) => {
    globals.yank();
    const cells = globals
      .getSelectedCells()
      .flat(Infinity)
      .forEach((cell) => {
        cell.formula = "";
      });
    let x, y;
    switch (globals.selected.type) {
      case "cell":
        x = globals.selected.min.x;
        y = globals.selected.min.y;
        break;
      case "row":
        x = 0;
        y = globals.selected.min;
        break;
      case "col":
        x = globals.selected.min;
        y = 0;
        break;
    }
    globals.setSelectionStart("cell", { x, y });
    globals.currentSheet.cells[y][x].editing = true;
  },

  "Clear Cells": (e, globals) => {
    globals.yank();
    const cells = globals.getSelectedCells().flat(Infinity);
    const { start, type } = globals.selected;
    globals.deselect();
    cells.forEach((cell) => {
      cell.formula = "";
    });
    globals.setSelectionStart(type, start);
    globals.mode = "normal";
  },

  Delete: (e, globals) => {
    const { max, min } = globals.selected;
    switch (globals.selected.type) {
      case "cell":
        const cells = globals.getSelectedCells().flat(Infinity);
        cells.forEach((cell) => {
          cell.formula = "";
        });
        globals.setSelectionEnd(globals.selected.start);
        break;
      case "row":
        globals.deselect();
        globals.currentSheet.deleteRows(max - min + 1, min);
        globals.setSelectionStart("cell", {
          x: 0,
          y: Math.min(min, globals.currentSheet.heights.length - 1),
        });
        break;
      case "col":
        globals.deselect();
        globals.currentSheet.deleteCols(max - min + 1, min);
        globals.setSelectionStart("cell", {
          y: 0,
          x: Math.min(min, globals.currentSheet.widths.length - 1),
        });
        break;
    }
    globals.mode = "normal";
  },

  Undo: (e, globals) => {
    // TODO: Save selection in pushed state
    globals.deselect();
    window.history.back();
  },

  Redo: (e, globals) => {
    // TODO: Save selection in pushed state
    globals.deselect();
    window.history.forward();
  },

  "Insert Equals": (e, globals) => {
    switch (globals.mode) {
      case "normal":
        switch (globals.selected.type) {
          case "cell":
            const { x: col, y: row } = globals.selected.end;
            globals.currentSheet.cells[row][col].formula = "=";
            globals.currentSheet.cells[row][col].editing = true;
            break;
          // TODO: Edit first cell of row or column?
        }
        break;
      case "visual":
        switch (globals.selected.type) {
          case "cell":
            const { x: col, y: row } = globals.selected.start;
            // TODO: Edit first cell of any selection?
            if (
              col == globals.selected.end.x &&
              row == globals.selected.end.y
            ) {
              globals.currentSheet.cells[row][col].formula = "=";
              globals.currentSheet.cells[row][col].editing = true;
            }
            break;
        }
        break;
    }
  },

  "Toggle Code Editor": (e, globals) => {
    globals.editorOpen = !globals.editorOpen;
  },

  "Select All": (e, globals) => {
    globals.mode = "visual";
    globals.setSelectionStart("cell", { x: 0, y: 0 });
    globals.setSelectionEnd({
      x: globals.currentSheet.widths.length - 1,
      y: globals.currentSheet.heights.length - 1,
    });
  },

  "Go To": (e, globals) => {
    if (globals.keyQueue[globals.keyQueue.length - 1] != "g") {
      globals.keyQueue.push("g");
      return;
    }
    // Specifically for gg
    globals.keyQueue.pop();
    switch (globals.mode) {
      case "normal":
        switch (globals.selected.type) {
          case undefined:
          case "cell":
            const x = globals.selected?.start?.x ?? 0;
            globals.setSelectionStart("cell", { x, y: 0 });
            break;
          case "row":
            globals.setSelectionStart("row", 0);
            break;
        }
        break;
      case "visual":
        switch (globals.selected.type) {
          case undefined:
          case "cell":
            const x = globals.selected?.start?.x ?? 0;
            globals.setSelectionEnd({ x, y: 0 });
            break;
          case "row":
            globals.setSelectionEnd(0);
            break;
        }
        break;
    }
  },

  "Go to Bottom": (e, globals) => {
    switch (globals.mode) {
      case "normal":
        switch (globals.selected.type) {
          case undefined:
          case "cell":
            const x = globals.selected?.start?.x ?? 0;
            globals.setSelectionStart("cell", {
              x,
              y: globals.currentSheet.heights.length - 1,
            });
            break;
          case "row":
            globals.setSelectionStart(
              "row",
              globals.currentSheet.widths.length - 1,
            );
            break;
        }
        break;
      case "visual":
        switch (globals.selected.type) {
          case undefined:
          case "cell":
            const x = globals.selected?.start?.x ?? 0;
            globals.setSelectionEnd({
              x,
              y: globals.currentSheet.heights.length - 1,
            });
            break;
          case "row":
            globals.setSelectionEnd(globals.currentSheet.heights.length - 1);
            break;
        }
        break;
    }
  },

  "Toggle Help": (e, globals) => {
    globals.helpOpen = !globals.helpOpen;
  },

  "Go to Start of Row": (e, globals) => {
    switch (globals.mode) {
      case "normal":
        switch (globals.selected.type) {
          case undefined:
          case "cell":
            const y = globals.selected?.start?.y ?? 0;
            globals.setSelectionStart("cell", { x: 0, y });
            break;
          case "col":
            globals.setSelectionStart("col", 0);
            break;
        }
        break;
      case "visual":
        switch (globals.selected.type) {
          case undefined:
          case "cell":
            const y = globals.selected?.start?.y ?? 0;
            globals.setSelectionEnd({ x: 0, y });
            break;
          case "col":
            globals.setSelectionEnd(0);
            break;
        }
        break;
    }
  },

  "Go to End of Row": (e, globals) => {
    switch (globals.mode) {
      case "normal":
        switch (globals.selected.type) {
          case undefined:
          case "cell":
            const y = globals.selected?.start?.y ?? 0;
            globals.setSelectionStart("cell", {
              x: globals.currentSheet.widths.length - 1,
              y,
            });
            break;
          case "col":
            globals.setSelectionStart(
              "col",
              globals.currentSheet.widths.length - 1,
            );
            break;
        }
        break;
      case "visual":
        switch (globals.selected.type) {
          case undefined:
          case "cell":
            const y = globals.selected?.start?.y ?? 0;
            globals.setSelectionEnd({
              x: globals.currentSheet.widths.length - 1,
              y,
            });
            break;
          case "col":
            globals.setSelectionEnd(globals.currentSheet.widths.length - 1);
            break;
        }
        break;
    }
  },

  "Edit in Formula Bar": (e, globals) => {
    switch (globals.mode) {
      case "normal":
        switch (globals.selected.type) {
          case "cell":
            globals.elements.formulaBar.focus();
            break;
          // TODO: Edit first cell of row or column?
        }
        break;
      case "visual":
        switch (globals.selected.type) {
          case "cell":
            const { x: col, y: row } = globals.selected.start;
            // TODO: Edit first cell of any selection?
            if (
              col == globals.selected.end.x &&
              row == globals.selected.end.y
            ) {
              globals.elements.formulaBar.focus();
            }
            break;
        }
        break;
    }
  },

  Edit: (e, globals) => {
    switch (globals.mode) {
      case "normal":
        switch (globals.selected.type) {
          case "cell":
            const { x: col, y: row } = globals.selected.end;
            globals.currentSheet.cells[row][col].editing = true;
            break;
          // TODO: Edit first cell of row or column?
        }
        break;
      case "visual":
        switch (globals.selected.type) {
          case "cell":
            const { x: col, y: row } = globals.selected.start;
            // TODO: Edit first cell of any selection?
            if (
              col == globals.selected.end.x &&
              row == globals.selected.end.y
            ) {
              globals.currentSheet.cells[row][col].editing = true;
            }
            break;
        }
        break;
    }
  },

  "Visual Mode": (e, globals) => {
    switch (globals.mode) {
      case "normal":
        globals.mode = "visual";
        break;
      case "visual":
        globals.mode = "normal";
        globals.setSelectionStart(globals.selected.type, globals.selected.end);
        break;
    }
  },

  "Select Row": (e, globals) => {
    switch (globals.mode) {
      case "normal":
        globals.mode = "visual";
        break;
    }
    switch (globals.selected.type) {
      case "cell":
        const start = globals.selected.start.y,
          end = globals.selected.end.y;
        globals.setSelectionStart("row", start);
        globals.setSelectionEnd(end);
        break;
      case "row":
        globals.setSelectionStart("row", globals.selected.end);
        break;
      case undefined:
      case "col":
        globals.setSelectionStart("row", 0);
        break;
    }
  },

  "Select Column": (e, globals) => {
    switch (globals.mode) {
      case "normal":
        globals.mode = "visual";
        break;
    }
    switch (globals.selected.type) {
      case "cell":
        const start = globals.selected.start.x,
          end = globals.selected.end.x;
        globals.setSelectionStart("col", start);
        globals.setSelectionEnd(end);
        break;
      case "col":
        globals.setSelectionStart("col", globals.selected.end);
        break;
      case undefined:
      case "row":
        globals.setSelectionStart("col", 0);
        break;
    }
  },

  "Move Selection Up": (e, globals) => {
    let setSelection;
    switch (globals.mode) {
      case "visual":
        setSelection = (type, end) => globals.setSelectionEnd(end);
        break;
      case "normal":
      default:
        setSelection = (type, end) => globals.setSelectionStart(type, end);
        break;
    }
    switch (globals.selected.type) {
      case "cell":
        const { x, y } = globals.selected.end;
        setSelection("cell", { x, y: y - 1 });
        break;
      case "row":
        setSelection("row", globals.selected.end - 1);
        break;
      case undefined:
        setSelection("cell", { x: 0, y: 0 });
    }
  },

  "Move Selection Down": (e, globals) => {
    let setSelection;
    switch (globals.mode) {
      case "visual":
        setSelection = (type, end) => globals.setSelectionEnd(end);
        break;
      case "normal":
      default:
        setSelection = (type, end) => globals.setSelectionStart(type, end);
        break;
    }
    switch (globals.selected.type) {
      case "cell":
        const { x, y } = globals.selected.end;
        setSelection("cell", { x, y: y + 1 });
        break;
      case "row":
        setSelection("row", globals.selected.end + 1);
        break;
      case undefined:
        setSelection("cell", { x: 0, y: 0 });
    }
  },

  "Move Selection Left": (e, globals) => {
    let setSelection;
    switch (globals.mode) {
      case "visual":
        setSelection = (type, end) => globals.setSelectionEnd(end);
        break;
      case "normal":
      default:
        setSelection = (type, end) => globals.setSelectionStart(type, end);
        break;
    }
    switch (globals.selected.type) {
      case "cell":
        const { x, y } = globals.selected.end;
        setSelection("cell", { y, x: x - 1 });
        break;
      case "col":
        setSelection("col", globals.selected.end - 1);
        break;
      case undefined:
        setSelection("cell", { x: 0, y: 0 });
    }
  },

  "Move Selection Right": (e, globals) => {
    let setSelection;
    switch (globals.mode) {
      case "visual":
        setSelection = (type, end) => globals.setSelectionEnd(end);
        break;
      case "normal":
      default:
        setSelection = (type, end) => globals.setSelectionStart(type, end);
        break;
    }
    switch (globals.selected.type) {
      case "cell":
        const { x, y } = globals.selected.end;
        setSelection("cell", { y, x: x + 1 });
        break;
      case "col":
        setSelection("col", globals.selected.end + 1);
        break;
      case undefined:
        setSelection("cell", { x: 0, y: 0 });
    }
  },
};

// TODO: This whole thing probably needs to be reworked and rearchitected
export function keyboardHandler(e, globals) {
  const key = keyEventToString(e);
  switch (key) {
    case "escape":
      if (
        ["input", "textarea"].includes(e.target?.tagName.toLocaleLowerCase()) ||
        e.target.isContentEditable
      ) {
        globals.mode = "normal";
        e.target?.blur();
        globals.keyQueue = [];
        break;
      }
      switch (globals.mode) {
        case "normal":
          switch (globals.selected.type) {
            case "cell":
              globals.deselect();
              break;
            case "row":
              globals.setSelectionStart("cell", {
                x: 0,
                y: globals.selected.start,
              });
              break;
            case "col":
              globals.setSelectionStart("cell", {
                x: globals.selected.start,
                y: 0,
              });
              break;
          }
          break;
        case "insert":
          if (
            e.target.selectionStart != null &&
            e.target.selectionStart == e.target.selectionEnd
          ) {
            globals.mode = "normal";
            e.target?.blur();
          }
          break;
        case "visual":
          globals.mode = "normal";
          globals.setSelectionStart(
            globals.selected.type,
            globals.selected.end,
          );
          break;
        default:
          globals.mode = "normal";
          break;
      }
      globals.keyQueue = [];
      break;
    case "enter":
      if (
        globals.mode == "insert" ||
        e.target?.tagName.toLocaleLowerCase() == "input" ||
        e.target.isContentEditable
      ) {
        globals.mode = "normal";
        e.target?.blur();
        // TODO: Select next cell (next row? next column? next non-blank?)
      }
      break;
    case "tab":
      switch (globals.mode) {
        case "insert":
          globals.mode = "normal";
          e.target?.blur();
          actions["Move Selection Right"]?.(e, globals);
          break;
      }
      break;
    case "Shift+tab":
      switch (globals.mode) {
        case "insert":
          globals.mode = "normal";
          e.target?.blur();
          actions["Move Selection Left"]?.(e, globals);
          break;
      }
      break;
  }

  // Don't handle keypresses from within text or other editable inputs
  if (
    globals.mode == "insert" ||
    ["input", "textarea"].includes(e.target?.tagName.toLocaleLowerCase()) ||
    e.target.isContentEditable
  ) {
    return;
  }

  if (key?.match(/^[0-9]$/)) {
    if (
      key != "0" ||
      globals.keyQueue[globals.keyQueue.length - 1]?.match(/^[0-9]$/)
    ) {
      globals.keyQueue.push(key);
      return;
    }
  }

  const action = keybindings[key];
  // TODO: Remove
  console.log(keyEventToString(e), action);
  if (action == null) {
    return;
  }
  e.preventDefault();

  let iterations = 1;
  const queue = globals.keyQueue.join("");
  const match = queue.match(/^[1-9][0-9]*/);
  if (match) {
    iterations = parseInt(match[0]);
    globals.keyQueue = queue.replace(/^[1-9][0-9]*/, "").split("");
  }
  for (let i = 0; i < iterations; i++) {
    actions[action]?.(e, globals);
  }
}

export function keyEventToString(e) {
  const key = e.key.toLocaleLowerCase();
  switch (key) {
    case "control":
    case "shift":
    case "alt":
    case "meta":
      return;
  }
  let keyString = [key];
  if (e.metaKey) {
    keyString.unshift("Meta");
  }
  if (e.shiftKey) {
    keyString.unshift("Shift");
  }
  if (e.altKey) {
    keyString.unshift("Alt");
  }
  if (e.ctrlKey) {
    keyString.unshift("Ctrl");
  }
  return keyString.join("+");
}
