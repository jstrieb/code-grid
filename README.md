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

Cross-Site Scripting (XSS) is a class of web security vulnerabilities in which a
user can execute their own (potentially malicious) code on someone else's
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

TODO

# How Code Grid Works

## Code Table of Contents

TODO

## Cool Code Stuff

- The [SVG favicon uses
  CSS](https://github.com/jstrieb/code-grid/blob/05a1545730555a671186717950bb758148161bab/public/favicon.svg?short_path=04e3b01#L2)
  to invert its own colors based on user light/dark-mode preferences.
- Spreadsheet formulas are built on a custom Svelte store that is
  "[rederivable](https://github.com/jstrieb/code-grid/blob/05a1545730555a671186717950bb758148161bab/src/store.js)."
  It functions like a Svelte derived store, except it can add or remove
  dependencies it is derived from without changing its object reference.
- All spreadsheet data is saved to the URL, so sheets can be shared without
  using a storage back end or database.
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

# Warning

Clicking Code Grid links can be risky, because the links can run arbitrary code.
Only click links from those you trust.

TODO

# Known Issues

TODO

In the meantime, see [`todo.md`](todo.md).

# Project Status & Contributing

Code Grid is under active development. 

Bug reports and feature requests via [GitHub
Issues](https://github.com/jstrieb/code-grid/issues) are encouraged. Pull
requests with more than 20 lines of code are unlikely to be merged quickly,
unless attached to prior discussion or accompanied by substantial, explanatory,
English prose. In other words, pull requests containing code without context may
be merged after much delay, or may not be merged at all.

Since Code Grid is a fully static web application with no server-side processing
(other than serving files), it is extremely scalable, and has a very low
maintenance burden. As such, even if something were to happen to me, and I could
not continue to work on the project, the [public
version](https://jstrieb.github.io/code-grid) should continue to remain
functional and available online as long as my GitHub account is open, and
[jstrieb.github.io](https://jstrieb.github.io) domain is active.

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
