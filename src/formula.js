import { functions } from "./formula-functions.svelte.js";
import {
  sum as arraySum,
  reshape,
  undefinedArgsToIdentity,
} from "./lib/helpers.js";
import {
  str,
  regex,
  num,
  seq,
  alt,
  forwardDeclaration,
  lex,
  whitespace,
  EOF,
  anyChar,
} from "./lib/parsers.js";
import { readable, derived } from "svelte/store";

class Expression {
  // Return a concrete value from an expression given the values in the other
  // rows and columns.
  /* v8 ignore next 3 */
  compute(globals, sheet, r, c) {
    throw new Error("Not yet implemented");
  }
}

class Function extends Expression {
  name;
  args;

  constructor(name, args) {
    super();
    this.name = name;
    this.args = Array.from(args);
  }

  compute(globals, sheet, r, c) {
    const name = this.name.toLocaleLowerCase();
    const f = functions[name];
    if (f == null) {
      throw new Error(`"${name}" is not a function`);
    }
    const computed = this.args.map((arg) =>
      arg?.compute ? arg.compute(globals, sheet, r, c) : arg,
    );
    return derived(
      computed.filter((x) => x?.subscribe),
      (updated, set, update) => {
        // Mutating the updated array causes hard-to-debug problems with this
        // store later on
        updated = [...updated];
        const _this = {
          set,
          update,
          globals,
          sheet,
          row: r,
          col: c,
          width: globals.sheets[sheet].widths[c],
          height: globals.sheets[sheet].heights[r],
          // TODO: Do something with style and element
          style: "",
          element: undefined,
        };
        // TODO: propagate errors
        let result;
        try {
          result = f.apply(
            _this,
            computed.map((x) => (x?.subscribe ? updated.shift() : x)),
          );
        } catch (e) {
          result = undefined;
        }
        if (result instanceof Promise) {
          // TODO: In this case, _this.cleanup may not be set by the time the
          // function returns. That's why we check if result is a promise rather
          // than awaiting everything
          // TODO: Handle element and style after they have been set
          // TODO: Handle async error propagation
          result.catch(() => undefined).then((r) => set(r));
        } else {
          set(result);
        }
        return _this.cleanup;
      },
    );
  }
}

class BinaryOperation extends Expression {
  static operations = {
    // Arithmetic
    "+": (x, y) => x + y,
    "-": (x, y) => x - y,
    "*": (x, y) => x * y,
    "/": (x, y) => x / y,
    "%": (x, y) => x % y,
    "**": Math.pow,

    // Logical
    "!=": (x, y) => x !== y,
    "==": (x, y) => x === y,
    ">=": (x, y) => x >= y,
    ">": (x, y) => x > y,
    "<=": (x, y) => x <= y,
    "<": (x, y) => x < y,
    "&&": (x, y) => x && y,
    "||": (x, y) => x || y,
    "<>": (x, y) => x !== y,
    "=": (x, y) => x === y,

    // Bitwise
    "&": (x, y) => (x >>> 0) & (y >>> 0),
    "|": (x, y) => (x >>> 0) | (y >>> 0),
    "^": (x, y) => (x >>> 0) ^ (y >>> 0),
    ">>": (x, y) => x >> y,
    ">>>": (x, y) => x >>> y,
    "<<": (x, y) => x << y,
  };

  ast;

  constructor(ast) {
    super();
    this.ast = Array.from(ast);
  }

  static evaluate(op, x, y) {
    if (typeof x[op] === "function") {
      return x[op](y);
    } else if (typeof x[op]?.forward === "function") {
      return x[op].forward(y);
    } else if (typeof y[op]?.reverse === "function") {
      return y[op].reverse(x);
    } else {
      return BinaryOperation.operations[op](x, y);
    }
  }

  compute(...args) {
    const ast = [...this.ast];
    if (ast.length < 3) {
      console.log(ast);
      throw new Error("Binary operation AST has incorrect length");
    }
    while (ast.length > 1) {
      if (ast.length % 2 != 1) {
        console.log(ast);
        throw new Error("Binary operation AST has incorrect length");
      }
      const x = ((z) => (z?.compute ? z.compute(...args) : z))(ast.shift());
      const op = ast.shift();
      const y = ((z) => (z?.compute ? z.compute(...args) : z))(ast.shift());
      const isXStore = x?.subscribe;
      const isYStore = y?.subscribe;

      if (isXStore && isYStore) {
        ast.unshift(
          derived([x, y], ([a, b], set) =>
            set(BinaryOperation.evaluate(op, a ?? 0, b ?? 0)),
          ),
        );
      } else if (isXStore) {
        ast.unshift(
          derived([x], ([a], set) =>
            set(BinaryOperation.evaluate(op, a ?? 0, y ?? 0)),
          ),
        );
      } else if (isYStore) {
        ast.unshift(
          derived([y], ([b], set) =>
            set(BinaryOperation.evaluate(op, x ?? 0, b ?? 0)),
          ),
        );
      } else {
        ast.unshift(BinaryOperation.evaluate(op, x ?? 0, y ?? 0));
      }
    }

    const [computed] = ast;
    return computed;
  }
}

class UnaryOperation extends Expression {
  static operations = {
    "!": (x) => !x,
    "~": (x) => ~x,
    "-": (x) => -x,
  };

  operator;
  operand;

  constructor(operator, operand) {
    super();
    this.operator = operator;
    this.operand = operand;
  }

  static evaluate(op, x) {
    if (typeof x[op] === "function") {
      return x[op]();
    } else {
      return UnaryOperation.operations[op](x);
    }
  }

  compute(...args) {
    const { operand, operator } = this;
    const computed = operand?.compute ? operand.compute(...args) : operand;
    if (computed?.subscribe) {
      return derived([computed], ([x], set) =>
        set(UnaryOperation.evaluate(operator, x ?? 0)),
      );
    } else {
      return UnaryOperation.evaluate(operator, computed ?? 0);
    }
  }
}

class Ref extends Expression {
  s;
  r;
  c;

  constructor(s, r, c) {
    super();
    this.s = s;
    this.r = r;
    this.c = c;
  }

  compute(globals, s, r, c) {
    let sheet;
    if (this.s == null) {
      sheet = s;
    } else if (this.s.relative == null) {
      if (this.s.absolute < 0) {
        sheet =
          (this.s.absolute + globals.sheets.length) % globals.sheets.length;
      } else {
        sheet = this.s.absolute;
      }
    } else {
      sheet = s + this.s.relative;
    }
    const rows = globals.sheets[sheet].cells;

    let row;
    if (this.r == null) {
      row = r;
    } else if (this.r.relative == null) {
      if (this.r.absolute < 0) {
        row = (this.r.absolute + rows.length) % rows.length;
      } else {
        row = this.r.absolute;
      }
    } else {
      row = r + this.r.relative;
    }
    let col;
    if (this.c == null) {
      col = c;
    } else if (this.c.relative == null) {
      if (this.c.absolute < 0) {
        col = (this.c.absolute + rows[0].length) % rows[0].length;
      } else {
        col = this.c.absolute;
      }
    } else {
      col = c + this.c.relative;
    }

    try {
      return rows[row][col].value;
    } catch {
      if (sheet == s) {
        throw new Error(`Invalid cell R${row}C${col}`);
      } else {
        throw new Error(
          `Invalid cell R${i}C${j} in sheet ${globals.sheets[sheet].name}`,
        );
      }
    }
  }
}

class Range extends Expression {
  s;
  r1;
  c1;
  r2;
  c2;

  constructor(s, r1, c1, r2, c2) {
    super();
    this.s = s;
    this.r1 = r1;
    this.c1 = c1;
    this.r2 = r2;
    this.c2 = c2;
  }

  compute(globals, s, r, c) {
    let sheet;
    if (this.s == null) {
      sheet = s;
    } else if (this.s.relative == null) {
      if (this.s.absolute < 0) {
        sheet =
          (this.s.absolute + globals.sheets.length) % globals.sheets.length;
      } else {
        sheet = this.s.absolute;
      }
    } else {
      sheet = s + this.s.relative;
    }
    const rows = globals.sheets[sheet].cells;

    let startRow;
    if (this.r1 == null) {
      startRow = r;
    } else if (this.r1.relative == null) {
      if (this.r1.absolute < 0) {
        startRow = (this.r1.absolute + rows.length) % rows.length;
      } else {
        startRow = this.r1.absolute;
      }
    } else {
      startRow = r + this.r1.relative;
    }
    let startCol;
    if (this.c1 == null) {
      startCol = c;
    } else if (this.c1.relative == null) {
      if (this.c1.absolute < 0) {
        startCol = (this.c1.absolute + rows[0].length) % rows[0].length;
      } else {
        startCol = this.c1.absolute;
      }
    } else {
      startCol = c + this.c1.relative;
    }
    let endRow;
    if (this.r2 == null) {
      endRow = r;
    } else if (this.r2.relative == null) {
      if (this.r2.absolute < 0) {
        endRow = (this.r2.absolute + rows.length) % rows.length;
      } else {
        endRow = this.r2.absolute;
      }
    } else {
      endRow = r + this.r2.relative;
    }
    let endCol;
    if (this.c2 == null) {
      endCol = c;
    } else if (this.c2.relative == null) {
      if (this.c2.absolute < 0) {
        endCol = (this.c2.absolute + rows[0].length) % rows[0].length;
      } else {
        endCol = this.c2.absolute;
      }
    } else {
      endCol = c + this.c2.relative;
    }

    const height = Math.abs(startRow - endRow) + 1;
    const width = Math.abs(startCol - endCol) + 1;

    return derived(
      rows
        .slice(startRow, endRow + 1)
        .map((r) => r.slice(startCol, endCol + 1))
        .flat()
        .map(({ value }) => value),
      (values, set) => set(reshape(values, height, width)),
    );
  }
}

function leftAssociativeBinOp(subparser, cls, operations) {
  return lex(
    seq(
      subparser,
      seq(alt(...operations.map(lex)), subparser)
        .many()
        .map((l) => l.flat()),
    ).map(([first, last]) => (last.length ? new cls([first, ...last]) : first)),
  );
}

function rightAssociativeBinOp(subparser, cls, operations) {
  let result = forwardDeclaration();
  result.become(
    lex(
      alt(
        seq(subparser, alt(...operations.map(lex)), result).map(
          (x) => new cls(x),
        ),
        subparser,
      ),
    ),
  );
  return result;
}

function init(cls) {
  return (args) => new cls(...args);
}

const expression = forwardDeclaration();

const name = regex(/[a-zA-Z_][a-zA-Z0-9_]*/);
const fun = seq(
  name,
  str("(")
    .then(expression.sep_by(lex(",")).optional([]))
    .skip(str(")")),
).map(init(Function));

const cellDigits = regex(/-?\d[_\d]*/).map((x) =>
  parseInt(x.replaceAll("_", "")),
);
const relNum = str("[")
  .then(cellDigits)
  .skip(str("]"))
  .map((n) => ({ relative: n }));
const absNum = cellDigits.map((n) => ({ absolute: n }));
const cellNum = relNum.or(absNum).optional();
const r = regex(/[rR]/);
const c = regex(/[cC]/);
const s = regex(/[sS]/);

const ref = seq(
  s.then(cellNum).skip(regex(/!?/)).optional(),
  r.then(cellNum),
  c.then(cellNum),
).map(init(Ref));

const range = seq(
  s.then(cellNum).skip(regex(/!?/)).optional(),
  r.then(cellNum),
  c.then(cellNum).skip(lex(":")),
  r.then(cellNum),
  c.then(cellNum),
).map(init(Range));

const stringChar = alt(
  str("\\\\").map((_) => "\\"),
  str('\\"').map((_) => '"'),
  str("\\'").map((_) => "'"),
  str("\\t").map((_) => "\t"),
  str("\\n").map((_) => "\n"),
  anyChar,
);
const string = alt(
  whitespace
    .then(str('"'))
    .then(stringChar.until(str('"')).optional([]).concat())
    .skip(str('"'))
    .skip(whitespace),
  whitespace
    .then(str("'"))
    .then(stringChar.until(str("'")).optional([]).concat())
    .skip(str("'"))
    .skip(whitespace),
);

const logic = forwardDeclaration();
const value = lex(
  alt(
    lex(num),
    lex(string),
    lex(fun),
    lex(ref),
    lex("true").map((_) => true),
    lex("false").map((_) => false),
    lex("(").then(logic).skip(lex(")")),
  ),
);
const unary = forwardDeclaration();
unary.become(
  lex(
    alt(
      seq(alt(...Object.keys(UnaryOperation.operations).map(lex)), unary).map(
        init(UnaryOperation),
      ),
      value,
    ),
  ),
);
const power = rightAssociativeBinOp(unary, BinaryOperation, ["**"]);
const product = leftAssociativeBinOp(power, BinaryOperation, ["*", "/", "%"]);
const sum = leftAssociativeBinOp(product, BinaryOperation, ["+", "-"]);

const shift = leftAssociativeBinOp(sum, BinaryOperation, ["<<", ">>>", ">>"]);

const relational = leftAssociativeBinOp(shift, BinaryOperation, [
  "<=",
  "<",
  ">=",
  ">",
]);
const equality = leftAssociativeBinOp(relational, BinaryOperation, [
  "==",
  "!=",
  "=",
  "<>",
]);

const bitwiseAnd = leftAssociativeBinOp(equality, BinaryOperation, ["&"]);
const bitwiseXor = leftAssociativeBinOp(bitwiseAnd, BinaryOperation, ["^"]);
const bitwiseOr = leftAssociativeBinOp(bitwiseXor, BinaryOperation, ["|"]);

const logicalAnd = leftAssociativeBinOp(bitwiseOr, BinaryOperation, ["&&"]);
const logicalOr = leftAssociativeBinOp(logicalAnd, BinaryOperation, ["||"]);
logic.become(logicalOr);

expression.become(alt(lex(range), logic));
export const formula = alt(str("=").then(expression), lex(num)).skip(EOF);
