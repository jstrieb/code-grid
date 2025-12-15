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
    const memo = {};
    return new Parser((i) => {
      if (i in memo) return memo[i];
      const { parsed, rest } = this.p(i);
      memo[i] = new ParseResult(f(parsed), rest);
      return memo[i];
    });
  }

  result(r) {
    return this.map((_) => r);
  }

  combine(f) {
    const memo = {};
    return new Parser((i) => {
      if (i in memo) return memo[i];
      const { parsed, rest } = this.p(i);
      memo[i] = new ParseResult(f(...parsed), rest);
      return memo[i];
    });
  }

  and(parser) {
    const memo = {};
    return new Parser((i) => {
      if (i in memo) return memo[i];
      const { parsed, rest } = this.p(i);
      const { parsed: parsed2, rest: rest2 } = parser.p(rest);
      memo[i] = new ParseResult([parsed, parsed2], rest2);
      return memo[i];
    });
  }

  or(parser) {
    const memo = {};
    return new Parser((i) => {
      if (i in memo) return memo[i];
      try {
        memo[i] = this.p(i);
      } catch (e) {
        if (!(e instanceof ParseError)) throw e;
        memo[i] = parser.p(i);
      }
      return memo[i];
    });
  }

  then(parser) {
    const memo = {};
    return new Parser((i) => {
      if (i in memo) return memo[i];
      let { parsed, rest } = this.p(i);
      ({ parsed, rest } = parser.p(rest));
      memo[i] = new ParseResult(parsed, rest);
      return memo[i];
    });
  }

  skip(parser) {
    const memo = {};
    return new Parser((i) => {
      if (i in memo) return memo[i];
      let { parsed, rest } = this.p(i);
      ({ rest } = parser.p(rest));
      memo[i] = new ParseResult(parsed, rest);
      return memo[i];
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
  const memo = {};
  return new Parser((inString) => {
    if (inString in memo) return memo[inString];
    let parsed,
      rest = inString,
      result = [];
    for (let i = 0; i < parsers.length; i++) {
      ({ parsed, rest } = parsers[i].p(rest));
      result.push(parsed);
    }
    memo[inString] = new ParseResult(result, rest);
    return memo[inString];
  });
}

export function alt(...parsers) {
  const memo = {};
  return new Parser((inString) => {
    if (inString in memo) return memo[inString];
    let lastError;
    for (let i = 0; i < parsers.length; i++) {
      try {
        memo[inString] = parsers[i].p(inString);
        return memo[inString];
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
  regex(/-?0b[01][_01]*/).map((x) => parseInt(x.replace(/0b/, ""), 2)),
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
