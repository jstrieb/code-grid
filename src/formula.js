import { functions } from "./formula-functions.svelte.js";
import {
  sum as arraySum,
  reshape,
  undefinedArgsToIdentity,
} from "./helpers.js";
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
} from "./parsers.js";

class Expression {
  // Return a concrete value from an expression given the values in the other
  // rows and columns.
  /* v8 ignore next 3 */
  compute(rows, r, c) {
    throw new Error("Not yet implemented");
  }
}

class ExpressionValue {
  thunk;
  refs;
  numRefArgs;

  // Everything except for ranges should pass thunks that return a singleton
  // array. This is to prevent accidental flattening of list arguments while the
  // reference tree is being flattened.
  constructor(thunk, refs, numRefArgs = undefined) {
    this.thunk = thunk;
    this.refs = refs;
    this.numRefArgs = numRefArgs;
    if (this.numRefArgs == null) {
      this.numRefArgs = arraySum(refs.map(({ numRefArgs: n }) => n));
    }
  }
}

function singleton(f) {
  return async function (...args) {
    return [await f.apply(this, args)];
  };
}

class Function extends Expression {
  name;
  args;

  constructor(name, args) {
    super();
    this.name = name;
    this.args = Array.from(args);
  }

  compute(rows, r, c) {
    const name = this.name.toLocaleLowerCase();
    const f = functions[name];
    if (f == null) {
      throw new Error(`"${name}" is not a function`);
    }
    const refs = this.args.map((a) => a.compute(rows, r, c));
    return new ExpressionValue(singleton(f), refs);
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

  compute(rows, r, c) {
    const thunk = (...args) => {
      this.ast
        .filter((x) => typeof x === "string")
        .forEach((op) => {
          const x = args.shift();
          const y = args.shift();
          args.unshift(BinaryOperation.operations[op](x, y));
        });
      // Note that args is a singleton list
      return args;
    };
    const refs = this.ast
      .filter((x) => x?.compute)
      .map((x) => x.compute(rows, r, c));
    return new ExpressionValue(undefinedArgsToIdentity(thunk), refs);
  }
}

class UnaryOperation extends Expression {
  static operations = {
    "!": (x) => !x,
    "~": (x) => ~x,
  };

  operator;
  operand;

  constructor(operator, operand) {
    super();
    this.operator = UnaryOperation.operations[operator];
    this.operand = operand;
  }

  compute(rows, r, c) {
    const thunk = (x) => [this.operator(x)];
    const refs = [this.operand.compute(rows, r, c)];
    return new ExpressionValue(undefinedArgsToIdentity(thunk), refs);
  }
}

class Ref extends Expression {
  r;
  c;

  constructor(r, c) {
    super();
    this.r = r;
    this.c = c;
  }

  compute(rows, r, c) {
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
    return new ExpressionValue((x) => [x], [rows[row][col]], 1);
  }
}

class Range extends Expression {
  r1;
  c1;
  r2;
  c2;

  constructor(r1, c1, r2, c2) {
    super();
    this.r1 = r1;
    this.c1 = c1;
    this.r2 = r2;
    this.c2 = c2;
  }

  compute(rows, r, c) {
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

    // Reshape ranges that have more than one row and column
    const thunk = (...args) => [
      height > 1 && width > 1 ? reshape(args, height, width) : args,
    ];
    const refs = rows
      .slice(startRow, endRow + 1)
      .map((r) => r.slice(startCol, endCol + 1))
      .flat();
    return new ExpressionValue(thunk, refs, refs.length);
  }
}

class Primitive extends Expression {
  value;

  constructor(n) {
    super();
    this.value = n;
  }

  compute() {
    return new ExpressionValue(() => [this.value], []);
  }
}

class Num extends Primitive {}
class Str extends Primitive {}
class Bool extends Primitive {}

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

const expression = forwardDeclaration();

const name = regex(/[a-zA-Z_][a-zA-Z0-9_]*/);
const fun = seq(
  name,
  str("(")
    .then(expression.sep_by(lex(",")).optional([]))
    .skip(str(")")),
).map((args) => new Function(...args));

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

const ref = seq(r.then(cellNum), c.then(cellNum)).map(
  (args) => new Ref(...args),
);

const range = seq(
  r.then(cellNum),
  c.then(cellNum).skip(lex(":")),
  r.then(cellNum),
  c.then(cellNum),
).map((args) => new Range(...args));

const number = num.map((args) => new Num(args));

const stringChar = alt(
  str("\\\\").map((_) => "\\"),
  str('\\"').map((_) => '"'),
  str("\\t").map((_) => "\t"),
  str("\\n").map((_) => "\n"),
  anyChar,
);
const string = whitespace
  .then(str('"'))
  .then(stringChar.until(str('"')).optional([]).concat())
  .skip(str('"'))
  .skip(whitespace)
  .map((args) => new Str(args));

const logic = forwardDeclaration();
const value = lex(
  alt(
    lex(number),
    lex(string),
    lex(fun),
    lex(ref),
    lex("true").map((_) => new Bool(true)),
    lex("false").map((_) => new Bool(false)),
    lex("(").then(logic).skip(lex(")")),
  ),
);
const unary = forwardDeclaration();
unary.become(
  lex(
    alt(
      seq(alt(lex("!"), lex("~")), unary).map(
        (args) => new UnaryOperation(...args),
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
]);

const bitwiseAnd = leftAssociativeBinOp(equality, BinaryOperation, ["&"]);
const bitwiseXor = leftAssociativeBinOp(bitwiseAnd, BinaryOperation, ["^"]);
const bitwiseOr = leftAssociativeBinOp(bitwiseXor, BinaryOperation, ["|"]);

const logicalAnd = leftAssociativeBinOp(bitwiseOr, BinaryOperation, ["&&"]);
const logicalOr = leftAssociativeBinOp(logicalAnd, BinaryOperation, ["||"]);
logic.become(logicalOr);

expression.become(alt(lex(range), logic));
export const formula = alt(str("=").then(expression), number).skip(EOF);
