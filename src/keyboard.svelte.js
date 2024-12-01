export const keybindings = {
  arrowleft: "Move Selection Left",
  arrowright: "Move Selection Right",
  arrowup: "Move Selection Up",
  arrowdown: "Move Selection Down",
  h: "Move Selection Left",
  l: "Move Selection Right",
  k: "Move Selection Up",
  j: "Move Selection Down",
};

export const actions = {
  "Move Selection Up": (e, globals) => {
    switch (globals.selected.type) {
      case "cell":
        const { x, y } = globals.selected.end;
        globals.setSelectionStart("cell", { x, y: y - 1 });
        break;
      case "row":
        globals.setSelectionStart("row", globals.selected.end - 1);
        break;
      case undefined:
        globals.setSelectionStart("cell", { x: 0, y: 0 });
    }
  },
  "Move Selection Down": (e, globals) => {
    switch (globals.selected.type) {
      case "cell":
        const { x, y } = globals.selected.end;
        globals.setSelectionStart("cell", { x, y: y + 1 });
        break;
      case "row":
        globals.setSelectionStart("row", globals.selected.end + 1);
        break;
      case undefined:
        globals.setSelectionStart("cell", { x: 0, y: 0 });
    }
  },
  "Move Selection Left": (e, globals) => {
    switch (globals.selected.type) {
      case "cell":
        const { x, y } = globals.selected.end;
        globals.setSelectionStart("cell", { y, x: x - 1 });
        break;
      case "col":
        globals.setSelectionStart("col", globals.selected.end - 1);
        break;
      case undefined:
        globals.setSelectionStart("cell", { x: 0, y: 0 });
    }
  },
  "Move Selection Right": (e, globals) => {
    switch (globals.selected.type) {
      case "cell":
        const { x, y } = globals.selected.end;
        globals.setSelectionStart("cell", { y, x: x + 1 });
        break;
      case "col":
        globals.setSelectionStart("col", globals.selected.end + 1);
        break;
      case undefined:
        globals.setSelectionStart("cell", { x: 0, y: 0 });
    }
  },
};

export function keyboardHandler(e, globals) {
  // Don't handle keypresses from within text or other editable inputs
  if (
    ["input", "textarea"].includes(e.target?.tagName.toLocaleLowerCase()) ||
    e.target.isContentEditable
  ) {
    return;
  }

  const action = keybindings[keyEventToString(e)];
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
