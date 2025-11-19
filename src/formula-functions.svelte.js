import { debounce } from "./helpers.js";

// Import required so code that is `eval`ed can modify formula functions and
// use parser combinators. Do not remove, even though it appears "unused."
import * as parsers from "./parsers.js";
import * as classes from "./classes.svelte.js";
import * as compression from "./compress.js";
import { llmToolFunctions, llmModels } from "./llm.svelte.js";
import { undefinedArgsToIdentity } from "./helpers.js";

export let functions = $state({});

export function evalCode(code, ret = () => {}) {
  if (code == null) {
    return ret();
  }

  // No op that "uses" the imports so tree shaking doesn't consider them dead
  // code. This usage must occur here – the imported objects are unavailable in
  // the code if this is moved elsewhere. Lots of other no op usages of imported
  // objects are eliminated by vite, but empirically, this one seems to stay in
  // the final build.
  try {
    throw parsers;
  } catch {}
  try {
    throw classes;
  } catch {}
  try {
    throw compression;
  } catch {}
  try {
    throw llmToolFunctions;
  } catch {}
  try {
    throw llmModels;
  } catch {}

  try {
    eval(
      code +
        // Allows user code to show up in the devtools debugger as "user-code.js"
        "\n//# sourceURL=user-code.js",
    );
    // Canonicalize function names, since only lowercased version is used
    Object.entries(functions).forEach(([name, f]) => {
      functions[name.toLocaleLowerCase()] = f;
    });
    return ret();
  } catch (e) {
    return ret(e);
  }
}
export const evalDebounced = debounce(evalCode, 500);

// All JavaScript Math functions are available as formula functions
Object.getOwnPropertyNames(Math)
  .filter((n) => typeof Math[n] === "function")
  .forEach((n) => (functions[n] = undefinedArgsToIdentity(Math[n])));

// Core functions
functions.sum = undefinedArgsToIdentity((...args) =>
  args.flat(Infinity).reduce((i, j) => i + j, 0),
);
functions.prod = undefinedArgsToIdentity((...args) =>
  args.flat(Infinity).reduce((i, j) => i * j, 1),
);
functions.avg = undefinedArgsToIdentity(
  (...args) =>
    args.flat(Infinity).reduce((i, j) => i + j) / args.flat(Infinity).length,
);
functions.randint = (n) => Math.floor(Math.random() * n);
functions.if = (x, yes, no) => (x ? yes : no);

// Aliases
functions.add = functions.sum;
functions.plus = functions.sum;
functions.times = functions.prod;
functions.product = functions.prod;
functions.mult = functions.prod;
functions.average = functions.avg;
functions.rand = functions.random;

// Miscellaneous utility functions
functions.slider = function slider(min, max, step, value) {
  this.update((previous) => {
    value = value ?? previous ?? 0;
  });
  this.element = Object.assign(document.createElement("input"), {
    min,
    max,
    step,
    value,
    type: "range",
    style: `width: 100%;
            appearance: auto;
            margin: 0 0.5ch;`,
    oninput: (e) => this.set(Number(e.target.value)),
  });
  return value;
};

functions.bold = function (s) {
  this.style += "font-weight: bold;";
  return s;
};

functions.center = function (s) {
  const e = this.element;
  this.element = Object.assign(document.createElement("div"), {
    style: `
      display: flex;
      flex-direction: column;
      flex-wrap: nowrap;
      justify-content: center;
      align-items: center;
      text-align: center;
      width: 100%;
      height: 100%;
      min-width: 0;
      min-height: 0;
    `,
  });
  this.element.appendChild(e ?? document.createTextNode(s));
  return s;
};

const dollarFormat = Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});
functions.dollars = undefinedArgsToIdentity(function (d) {
  this.element = document.createTextNode(dollarFormat.format(d));
  return d;
});

const percentFormat = new Intl.NumberFormat("en-US", {
  style: "percent",
  maximumFractionDigits: 4,
});
functions.percent = function (p) {
  this.element = document.createTextNode(percentFormat.format(p));
  return p;
};

functions.sparkbars = (...args) => {
  const lines = "▁▂▃▄▅▆▇█";
  const min = Math.min(...args),
    max = Math.max(...args);
  const bucketSize = (max - min) / (lines.length - 1);
  return args.map((x) => lines[Math.floor((x - min) / bucketSize)]).join("");
};

functions.checkbox = function (label) {
  let value;
  this.update((previous) => {
    value = !!previous;
    return !!previous;
  });
  const e = this.element;
  this.element = Object.assign(document.createElement("label"), {
    style: `
      display: flex; 
      justify-content: center;
      align-items: center; 
      gap: 1ch; 
      margin: 0 0.5em;
      width: 100%;
    `,
  });
  this.element.appendChild(
    Object.assign(document.createElement("input"), {
      type: "checkbox",
      style: "appearance: auto;",
      checked: value,
      oninput: (e) => this.set(e.target.checked),
    }),
  );
  this.element.appendChild(e ?? document.createTextNode(label));
  return value;
};
