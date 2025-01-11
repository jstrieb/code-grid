<h1>

<a href="https://jstrieb.github.io/code-grid" target="_blank"><img src="https://github.com/jstrieb/code-grid/blob/master/public/favicon.svg?raw=true" width="125" height="125" align="left" /></a>

Code Grid

</h1>

<a href="https://jstrieb.github.io/code-grid" target="_blank">Spreadsheet for programmers where XSS is a feature, not a bug.</a>

<br />

<div align="center">
<a href="https://jstrieb.github.io/code-grid" target="_blank"><img src="https://github.com/jstrieb/code-grid/blob/master/public/opengraph.png?raw=true"></a>
</div>

<br />

> [!WARNING]
> 
> This is alpha-quality code. It is likely to have bugs. The APIs are not yet
> stable, so things like spreadsheet links may break as the code is updated.

# About

Code Grid is a web-based spreadsheet that is designed to be easy to extend.

- Write new formula functions using JavaScript
- Create HTML elements inside cells
- Navigate with Vim keybindings
- Build small applications that are easy to share and modify
- Never send data to a back end – Code Grid runs fully client-side

Cross-Site Scripting (XSS) is a class of web security vulnerabilities in which
users can execute their own (potentially malicious) code on someone else's
website. Usually it is considered a very big problem for the website owner. In
this case, I am deliberately letting you execute your code on my website to make
Code Grid do whatever you want. <!-- Maybe I'm too trusting. -->

# Examples

- TODO simple spreadsheet
- TODO charts and LaTeX
- TODO printf formula using parsers
- TODO constrained optimization and mixed-integer linear programming using SCIP
- TODO OpenCV
- TODO Keystone and unicorn
- TODO QPA

# API Documentation

Use the help menu within Code Grid to access a tutorial.

## Formulas

Formulas begin with an equals sign (`=`), and can contain:

- Numbers such as `123` and `-3.21`
- Strings such as `"asdf"` and `"multi\nline"`
- Singleton references in R1C1 notation such as `R10C3` (zero-indexed) for
  absolute references, `R[-1]c[2]` for relative references, and `RC` for
  self-references
- Ranges such as `R[-3]C:R[-1]C`
- Function calls (case insensitive) containing expressions as arguments such as
  `sum(RC0:RC[-1])`, `sLiDeR(0, 10, 1)`, and `DOLLARS(PRODUCT(1 * 2 + 3, 4, 3,
  R[-1]C))`
- Optionally parenthesized binary operations combining any of the expressions
  above such as `(RC[-2] + RC[-3]) * 100` and `1 + -2 + 3 ** 5`

## Writing Formula Functions

The formula language above can be extended by adding new formula functions.
Formula functions are written in JavaScript from the Code Grid user interface,
and saved alongside sheet data.

### Simple Formula Functions

To register formula functions, add them to the `functions` object.

``` javascript
functions.digits = (n) => {
  // Compute the number of digits that n has
  let result = 0;
  while (n > 0) {
    result++;
    n = Math.floor(n / 10);
  }
  return result;
}
```

Registered functions will become available within formulas. In this example,
`=DIGITS(1234)` will put the value 4 in the cell.

### Advanced Formula Functions

Formula functions can be `async`. They will be awaited automatically by the Code
Grid runtime. Cells that depend on async formulas will only update when the
dependencies' promises resolve.

``` javascript
functions.crypto = async (ticker) => {
  return await fetch("https://api.gemini.com/v1/pricefeed", { cache: "force-cache" })
    .then((r) => r.json())
    .then((l) => Number(
      l.filter((o) => o.pair === ticker.toUpperCase() + "USD")[0].price,
    ));
}
```

Formula functions declared using `function() { /* */ }` syntax are passed a
`this` object that enables advanced functionality. 

**JavaScript arrow functions (such as `x => x + 1`) are not passed a `this`
object!** This is inherent to JavaScript. To use `this` in formula functions,
the functions must be declared using `function(){}` syntax. To quote [MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Arrow_functions):

> An arrow function expression is a compact alternative to a traditional
> function expression, with some semantic differences and deliberate limitations
> in usage:
> 
> - Arrow functions don't have their own bindings to `this`, `arguments`, or 
>   `super`, and should not be used as methods.

The `this` object passed to formula functions when they execute contains:

- `this.row` and `this.col` – the current row and column, respectively
- `this.set` – a function that sets the cell's value to whatever parameter it is passed
  - Useful for updating the cell value asynchronously or in callbacks
- `this.element` – an HTML element that will be put in the cell if defined
- `this.style` – the style attribute passed to the cell's `<td>` element

The `element` can be set to add custom displays or interfaces to a sheet. For
example, to add marquees:

``` javascript
functions.marquee = function(x) {
  // Wrap whatever element was set before
  const oldElement = this.element;
  this.element = document.createElement("marquee");
  this.element.appendChild(
    oldElement ?? document.createTextNode(x)
  );
  // Return the input value so this cell can still be used in formulas
  return x;
}
```

The following advanced example adds a formula function for interactive
checkboxes. The ouput value of the formula is the checked state of the box. Note
the use of `this.set` in the callback to update the cell's value upon
interaction.

``` javascript
functions.checkbox = function(label) {
  let value = false;
  this.element = Object.assign(document.createElement("label"), {
    innerText: label,
    style: "display: flex; align-items: center; gap: 1ch; margin: 0 0.5em;",
  });
  this.element.appendChild(
    Object.assign(document.createElement("input"), {
      type: "checkbox",
      style: "appearance: auto;",
      oninput: (e) => this.set(e.target.checked),
    }),
  );
  return value;
};
```

The `style` can be set to alter the display of the cell. For example, to make
the cell's text centered:

``` javascript
functions.center = function(x) {
  this.style += "text-align: center;"
  return x;
}
```

The `set` function is useful in interactive elment callbacks, as demonstrated
above. It is also useful for functions that run on a timeout or interval. For
example:

``` javascript
functions.sleep = async function(ms) {
  // Will say "sleeping" until complete
  this.set("Sleeping...");
  await new Promise(r => setTimeout(r, ms));
  return "Complete!";
}

functions.time = function() {
  // Will auto-update once per second with the Unix time
  setInterval(() => this.set(Date.now()), 1000);
  return Date.now();
}
```

# How Code Grid Works

## Code Table of Contents

The links below are listed in the order the code should be read to understand
the application from the highest to lowest level.

- [`src/App.svelte`](src/App.svelte) – entrypoint to the main, high-level
  application
- [`src/Table.svelte`](src/Table.svelte) and
  [`src/Cell.svelte`](src/Cell.svelte) – interactive spreadsheet UI code
- [`src/classes.svelte.js`](src/classes.svelte.js) – classes that manage state
  throughout the application
  - `Sheet.newCell` is responsible for reactively rederiving the store that
    computes a cell's value; it is run whenever the cell's value changes
- [`src/store.js`](src/store.js) – implementation of "rederivable" stores that
  can change their derived dependencies without invalidating their object
  reference
  - Every cell's value is a rederivable store that is rederived when its formula
    changes, and updated whenever any of its dependencies' values changes
- [`src/formula.js`](src/formula.js) – formula parsing logic
- [`src/parsers.js`](src/parsers.js) – parser combinator library used for formula parsing
- [`src/keyboard.js`](src/keyboard.js) – mapping of keyboard shortcuts to handlers
- [`src/*.svelte`](src/) – UI components
- [`src/formula-functions.js`](src/formula-functions.js) – "standard library"
  formula functions available in every spreadsheet
  - Includes functionality to `eval` user code and add functions to the formula
    function object
- [`src/global.css`](src/global.css) and [`public/*`](public/) – global
  stylesheet, favicons, etc.

## Cool Code Highlights

- Spreadsheet formulas are built on a custom Svelte store that is
  "[rederivable](https://github.com/jstrieb/code-grid/blob/05a1545730555a671186717950bb758148161bab/src/store.js)."
  It functions like a Svelte derived store, except it can add or remove
  dependencies it is derived from without changing its object reference.
- The [menu
  implementation](https://github.com/jstrieb/code-grid/blob/05a1545730555a671186717950bb758148161bab/src/ShyMenu.svelte)
  (and the [right click
  menu](https://github.com/jstrieb/code-grid/blob/05a1545730555a671186717950bb758148161bab/src/ContextMenu.svelte))
  features advanced usage of the new Svelte snippets feature, and would have
  been much harder to build (maybe even impossible) using slots in Svelte 4.
- [Formulas are
  parsed](https://github.com/jstrieb/code-grid/blob/05a1545730555a671186717950bb758148161bab/src/formula.js)
  using a custom [parser combinator
  implementation](https://github.com/jstrieb/code-grid/blob/05a1545730555a671186717950bb758148161bab/src/parsers.js).
- The [SVG favicon uses
  CSS](https://github.com/jstrieb/code-grid/blob/05a1545730555a671186717950bb758148161bab/public/favicon.svg?short_path=04e3b01#L2)
  to invert its own colors based on user light/dark-mode preferences.
- All spreadsheet data is saved to the URL, so sheets can be shared without
  using a storage back end or database.

# Warning

Clicking Code Grid links can be risky, because the links can run arbitrary code.
Only click links from those you trust. Links running code in your browser means
that those links:

- Can impersonate my website
- Can redirect to malicious pages
- Can steal locally stored data about other Code Grid spreadsheets
- Can make requests to other websites

# Known Issues

See the list of bugs at the bottom of [`todo.md`](todo.md).

# Project Status & Contributing

Code Grid is under active development. 

Bug reports and feature requests via [GitHub
Issues](https://github.com/jstrieb/code-grid/issues) are encouraged. Pull
requests with more than 20 lines of code are unlikely to be merged quickly,
unless attached to prior discussion or accompanied by substantial, explanatory,
English prose. In other words, pull requests containing code without context may
be merged after much delay, or may not be merged at all.

Since Code Grid is a fully static web application with no server-side
processing, it is extremely scalable, and has a very low maintenance burden. As
such, even if something were to happen to me, and I could not continue to work
on the project, the [public version](https://jstrieb.github.io/code-grid) should
continue to remain functional and available online as long as my GitHub account
is open, and [jstrieb.github.io](https://jstrieb.github.io) domain is active.

## Support the Project

The best ways to support the project are to:

- Share the project on sites like Twitter, Reddit, and Hacker News
- Report any bugs, glitches, errors, or shortcomings that you find
- Star the repository and follow me on GitHub
- Host a version of the code translated into another language

If you insist on spending money to show your support, please do so in a way
that benefits as many people as possible. In particular, donations to the
following organizations help me, as well as the general, Internet-using public:

- [Electronic Frontier Foundation](https://supporters.eff.org/donate/)
- [The Internet Archive](https://archive.org/donate/index.php)
- [Signal Foundation](https://signal.org/donate/)
- [Mozilla](https://donate.mozilla.org/en-US/)

# Acknowledgments & Greetz

Thanks to [Logan Snow](https://github.com/lsnow99) for consulting on all manner
of web esoterica, and for testing early versions of Code Grid.

Thanks to [Amy Liu](https://www.linkedin.com/in/amyjl) for feedback on early
versions of Code Grid.
