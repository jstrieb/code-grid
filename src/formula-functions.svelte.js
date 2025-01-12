import { debounce } from "./helpers.js";

// Import required so code that is `eval`ed can modify formula functions and
// use parser combinators. Do not remove, even though it appears "unused."
import * as parsers from "./parsers.js";
import { undefinedArgsToIdentity } from "./helpers.js";

export let functions = $state({});

export const evalCode = debounce((code, ret) => {
  if (code == null) {
    return ret();
  }

  // "Use" import so tree shaking doesn't consider it dead code. This usage must
  // occur here – the "parsers" object is unavailable in the code if this is
  // moved elsewhere.
  {
    let _ = parsers;
  }

  try {
    eval(code);
    return ret();
  } catch (e) {
    return ret(`Error: ${e.message}`);
  }
}, 500);

// All JavaScript Math functions are available as formula functions
Object.getOwnPropertyNames(Math)
  .filter((n) => typeof Math[n] === "function")
  .forEach((n) => (functions[n] = undefinedArgsToIdentity(Math[n])));

// Core functions
functions.sum = undefinedArgsToIdentity((...args) =>
  args.reduce((i, j) => i + j, 0),
);
functions.prod = undefinedArgsToIdentity((...args) =>
  args.reduce((i, j) => i * j, 1),
);
functions.avg = undefinedArgsToIdentity(
  (...args) => args.reduce((i, j) => i + j) / args.length,
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
  value = value ?? 0;
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
  this.style += "text-align: center;";
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

functions.sparkbars = (...args) => {
  const lines = "▁▂▃▄▅▆▇█";
  const min = Math.min(...args),
    max = Math.max(...args);
  const bucketSize = (max - min) / (lines.length - 1);
  return args.map((x) => lines[Math.floor((x - min) / bucketSize)]).join("");
};
