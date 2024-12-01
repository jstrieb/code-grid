export const keybindings = {
  arrowleft: "Move Selection Left",
  arrowright: "Move Selection Right",
  arrowup: "Move Selection Up",
  arrowdown: "Move Selection Down",
  h: "Move Selection Left",
  l: "Move Selection Right",
  k: "Move Selection Up",
  j: "Move Selection Down",
  v: "Visual Mode",
  "Ctrl+v": "Select Column",
  "Shift+v": "Select Row",
};

export const actions = {
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

export function keyboardHandler(e, globals) {
  const key = keyEventToString(e);
  switch (key) {
    case "escape":
    case "Ctrl+c":
      switch (globals.mode) {
        case "normal":
          globals.deselect();
          break;
        case "insert":
          globals.mode = "normal";
          e.target?.blur();
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
  }

  // Don't handle keypresses from within text or other editable inputs
  if (
    ["input", "textarea"].includes(e.target?.tagName.toLocaleLowerCase()) ||
    e.target.isContentEditable
  ) {
    return;
  }

  const action = keybindings[key];
  if (action == null) {
    return;
  }
  e.preventDefault();
  actions[action]?.(e, globals);

  // TODO: Remove
  console.log(keyEventToString(e), action);
}

function keyEventToString(e) {
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
