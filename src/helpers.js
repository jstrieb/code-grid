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
//
// This function also takes care to make sure the resulting wrapped function has
// the same toString representation as the original.
export function undefinedArgsToIdentity(f) {
  function result(...args) {
    let id = 0;
    if (args.some((x) => typeof x === "string")) {
      id = "";
    }
    return f.apply(
      this,
      args.map((x) => (x != null ? x : id)),
    );
  }
  result.toString = () => f.toString();
  return result;
}
