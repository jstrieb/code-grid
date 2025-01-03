class ParseResult {
  parsed;
  rest;

  constructor(parsed, rest) {
    this.parsed = parsed;
    this.rest = rest;
  }
}

export class ParseError extends Error {
  constructor(e) {
    super(`Parse failed: ${e}`);
  }
}

class Parser {
  p;

  constructor(p) {
    this.p = p;
  }

  map(f) {
    return new Parser((i) => {
      const { parsed, rest } = this.p(i);
      return new ParseResult(f(parsed), rest);
    });
  }

  result(r) {
    return this.map((_) => r);
  }

  combine(f) {
    return new Parser((i) => {
      const { parsed, rest } = this.p(i);
      return new ParseResult(f(...parsed), rest);
    });
  }

  and(parser) {
    return new Parser((i) => {
      const { parsed, rest } = this.p(i);
      const { parsed: parsed2, rest: rest2 } = parser.p(rest);
      return new ParseResult([parsed, parsed2], rest2);
    });
  }

  or(parser) {
    return new Parser((i) => {
      try {
        return this.p(i);
      } catch (e) {
        if (!(e instanceof ParseError)) throw e;
        return parser.p(i);
      }
    });
  }

  then(parser) {
    return new Parser((i) => {
      let { parsed, rest } = this.p(i);
      ({ parsed, rest } = parser.p(rest));
      return new ParseResult(parsed, rest);
    });
  }

  skip(parser) {
    return new Parser((i) => {
      let { parsed, rest } = this.p(i);
      ({ rest } = parser.p(rest));
      return new ParseResult(parsed, rest);
    });
  }

  concat() {
    return this.map((l) => l.join(""));
  }

  many() {
    return new Parser((i) => {
      const result = [];
      while (i) {
        try {
          const { parsed, rest } = this.p(i);
          result.push(parsed);
          i = rest;
        } catch (e) {
          if (!(e instanceof ParseError)) throw e;
          break;
        }
      }
      return new ParseResult(result, i);
    });
  }

  until(parser, endOnEOF) {
    return new Parser((i) => {
      const result = [];
      while (i) {
        try {
          const { rest } = parser.p(i);
          // Switch i to rest to consume the delimiter
          return new ParseResult(result, i);
        } catch (e) {
          if (!(e instanceof ParseError)) throw e;
          const { parsed, rest } = this.p(i);
          result.push(parsed);
          i = rest;
          if (rest === "" && endOnEOF) {
            return new ParseResult(result, rest);
          }
        }
      }
      return new ParseResult(result, i);
    });
  }

  sep_by(parser) {
    return this.and(parser.then(this).many())
      .skip(parser.optional())
      .map(([first, rest]) => [first, ...rest]);
  }

  optional(result) {
    return this.or(new Parser((i) => new ParseResult(result, i)));
  }

  become(parser) {
    this.p = parser.p;
  }

  parse(s) {
    const { parsed } = this.p(s);
    return parsed;
  }
}

export const empty = new Parser((i) => new ParseResult("", i));

export function str(s) {
  const err = new ParseError(`Expected ${s}.`);
  return new Parser((i) => {
    if (i?.startsWith?.(s)) {
      return new ParseResult(s, i.slice(s.length));
    } else {
      throw err;
    }
  });
}

export function regex(r) {
  const err = new ParseError(`Expected ${r}.`);
  return new Parser((i) => {
    const match = r.exec(i);
    if (match && match.index === 0) {
      return new ParseResult(match[0], i.slice(match[0].length));
    } else {
      throw err;
    }
  });
}

export function seq(...parsers) {
  return new Parser((inString) => {
    let parsed,
      rest = inString,
      result = [];
    for (let i = 0; i < parsers.length; i++) {
      ({ parsed, rest } = parsers[i].p(rest));
      result.push(parsed);
    }
    return new ParseResult(result, rest);
  });
}

export function alt(...parsers) {
  return new Parser((inString) => {
    let lastError;
    for (let i = 0; i < parsers.length; i++) {
      try {
        return parsers[i].p(inString);
      } catch (e) {
        if (!(e instanceof ParseError)) throw e;
        lastError = e;
      }
    }
    throw lastError;
  });
}

export function forwardDeclaration() {
  const err = new ParseError("Forward declared parser never called 'become.'");
  return new Parser((_) => {
    throw err;
  });
}

export const EOF = (() => {
  const err = new ParseError("Expecting end of string.");
  return new Parser((s) => {
    if (s !== "") {
      throw err;
    }
    return new ParseResult("", "");
  });
})();
export const anyChar = new Parser((s) => new ParseResult(s[0], s.slice(1)));
export const num = alt(
  regex(/-?\d[_\d]*\.\d+/).map((x) => parseFloat(x.replaceAll("_", ""))),
  regex(/-?(0x[0-9A-Fa-f][_0-9A-Fa-f]*|\d[_\d]*)/).map((x) =>
    parseInt(x.replaceAll("_", "")),
  ),
);
export const whitespace = regex(/\s*/);

export function lex(p) {
  if (typeof p === "string") {
    p = str(p);
  }
  return whitespace.then(p).skip(whitespace);
}
