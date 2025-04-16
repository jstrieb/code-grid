export function debounce(f, delay, max = undefined) {
  let t;
  let iterations = 0;
  return (...args) => {
    clearTimeout(t);
    if (max != null && iterations > max) {
      iterations = 0;
      f(...args);
    } else {
      iterations++;
      t = setTimeout(() => {
        iterations = 0;
        f(...args);
      }, delay);
    }
  };
}

export function sum(l) {
  return l.reduce((x, accum) => x + accum, 0);
}

// Wrap a function such that its args are automatically converted to additive
// identity if undefined or null. This is zero by default, unless any of the
// args are strings, in which case the additive identity is the empty string.
// Args are converted recursively, so this works even if the function is passed
// a 2D range.
//
// f.apply is used because f might be a formula function that needs the "this"
// object. This function also takes care to make sure the resulting wrapped
// function has the same toString representation as the original, because the
// toString representation is used to display formula function code in the help
// viewer.
export function undefinedArgsToIdentity(f) {
  function result(...args) {
    let id = 0;
    if (args.flat(Infinity).some((x) => typeof x === "string")) {
      id = "";
    }
    return f.apply(this, replaceWithId(args, id));
  }
  result.toString = () => f.toString();
  return result;
}
function replaceWithId(a, id) {
  return a.map((x) => (Array.isArray(x) ? replaceWithId(x, id) : (x ?? id)));
}

export function reshape(l, rows, cols) {
  return new Array(rows)
    .fill()
    .map((_, i) => new Array(cols).fill().map((_, j) => l[i * cols + j]));
}

export function randomId(length = 16) {
  const result = new Uint8Array(length);
  crypto.getRandomValues(result);
  return Array.from(result)
    .map((b) => b.toString(36))
    .join("");
}

export function replaceValues(k, v) {
  if (k == "formula" && v === "") {
    // Keep the URL shorter by not storing empty formulas
    return undefined;
  }
  if (k != "value") {
    return v;
  }
  if (v === "") {
    return undefined;
  }
  // TODO: Do other things to make the data URL smaller
  return v;
}

export function handleButtonInsertBlur(e) {
  const insert = e.relatedTarget?.dataset?.insert;
  if (insert != null) {
    const textarea = e.target;
    textarea.setRangeText(
      insert,
      textarea.selectionStart,
      textarea.selectionEnd,
      "end",
    );
    // The blur event is not cancelable :(
    const { selectionStart: start, selectionEnd: end } = textarea;
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start, end);
    }, 1);
    return true;
  }
  return false;
}
