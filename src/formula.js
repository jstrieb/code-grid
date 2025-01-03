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
  eval(rows, r, c) {
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
    "!=": (x, y) => x != y,
    // TODO: Should this use triple equals?
    "==": (x, y) => x == y,
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
    this.operator = this.operations[operator];
    this.operand = operand;
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
}

class Primitive extends Expression {
  value;

  constructor(n) {
    super();
    this.value = n;
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

const relNum = str("[")
  .then(num)
  .skip(str("]"))
  .map((n) => ({ relative: n }));
const absNum = num.map((n) => ({ absolute: n }));
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
