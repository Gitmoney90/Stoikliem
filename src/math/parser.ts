/**
 * Principia Graphica Mathematical Lexer, Parser & AST Engine
 * Supports arithmetic, implied multiplication, trigonometric/hyperbolic/transcendental functions,
 * calculus operators, polar coordinates, parametric tuples, implicit equations, and variable scopes.
 */

export type TokenType =
  | 'NUMBER'
  | 'IDENT'
  | 'PLUS'
  | 'MINUS'
  | 'STAR'
  | 'SLASH'
  | 'CARET'
  | 'PERCENT'
  | 'BANG'
  | 'LPAREN'
  | 'RPAREN'
  | 'COMMA'
  | 'EQUALS'
  | 'LT'
  | 'LE'
  | 'GT'
  | 'GE'
  | 'EOF';

export interface Token {
  type: TokenType;
  value: string;
  pos: number;
}

export type ASTNode =
  | { type: 'Number'; value: number }
  | { type: 'Variable'; name: string }
  | { type: 'Binary'; op: string; left: ASTNode; right: ASTNode }
  | { type: 'Unary'; op: string; argument: ASTNode }
  | { type: 'FunctionCall'; name: string; args: ASTNode[] }
  | { type: 'Comparison'; op: string; left: ASTNode; right: ASTNode };

export function normalizeMathInput(input: string): string {
  let text = input;

  // 1. Greek letters & mathematical constants
  text = text
    .replace(/θ|Θ/g, 'theta')
    .replace(/π|Π/g, 'pi')
    .replace(/τ/g, 'tau')
    .replace(/φ|Φ/g, 'phi');

  // 2. Comparison & inequality symbols
  text = text
    .replace(/≤/g, '<=')
    .replace(/≥/g, '>=')
    .replace(/≠/g, '!=');

  // 3. Multiplication, division, and plus-minus symbols
  text = text
    .replace(/×|·|•/g, '*')
    .replace(/÷/g, '/')
    .replace(/\\pm\b/g, '±')
    .replace(/\+-/g, '±');

  // 4. Superscript numbers & signs: e.g. x² -> x^(2), x⁻¹ -> x^(-1), x³ -> x^(3)
  const SUPERSCRIPT_MAP: Record<string, string> = {
    '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4',
    '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9',
    '⁺': '+', '⁻': '-', 'ⁿ': 'n',
  };
  text = text.replace(/([⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻ⁿ]+)/g, (_, match) => {
    const chars = Array.from(match).map((c: any) => SUPERSCRIPT_MAP[c] || c).join('');
    return `^(${chars})`;
  });

  // 5. Square root symbols: √x -> sqrt(x), √(x+1) -> sqrt(x+1)
  text = text.replace(/√\s*([a-zA-Z0-9]+)/g, 'sqrt($1)');
  text = text.replace(/√\s*\(/g, 'sqrt(');
  text = text.replace(/∛\s*([a-zA-Z0-9]+)/g, 'cbrt($1)');
  text = text.replace(/∛\s*\(/g, 'cbrt(');

  // 6. Absolute value bars: |expr| -> abs(expr)
  let prevText = '';
  while (prevText !== text) {
    prevText = text;
    text = text.replace(/\|([^|]+)\|/g, 'abs($1)');
  }

  return text;
}

export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const text = normalizeMathInput(input);
  const len = text.length;

  while (i < len) {
    const ch = text[i];

    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    if (/[0-9]/.test(ch) || (ch === '.' && i + 1 < len && /[0-9]/.test(text[i + 1]))) {
      let start = i;
      let hasDot = false;
      while (i < len && (/[0-9]/.test(text[i]) || (text[i] === '.' && !hasDot))) {
        if (text[i] === '.') hasDot = true;
        i++;
      }
      // Check for scientific notation: e.g. 1e-4, 2.5e3
      if (i < len && (text[i] === 'e' || text[i] === 'E') && i + 1 < len && (/[0-9]/.test(text[i + 1]) || (text[i + 1] === '-' || text[i + 1] === '+') && i + 2 < len && /[0-9]/.test(text[i + 2]))) {
        i++; // skip e
        if (text[i] === '-' || text[i] === '+') i++;
        while (i < len && /[0-9]/.test(text[i])) i++;
      }
      tokens.push({ type: 'NUMBER', value: text.slice(start, i), pos: start });
      continue;
    }

    if (/[a-zA-Z_]/.test(ch)) {
      let start = i;
      while (i < len && /[a-zA-Z0-9_]/.test(text[i])) {
        i++;
      }
      tokens.push({ type: 'IDENT', value: text.slice(start, i), pos: start });
      continue;
    }

    if (ch === '<') {
      if (text[i + 1] === '=') {
        tokens.push({ type: 'LE', value: '<=', pos: i });
        i += 2;
      } else {
        tokens.push({ type: 'LT', value: '<', pos: i });
        i++;
      }
      continue;
    }

    if (ch === '>') {
      if (text[i + 1] === '=') {
        tokens.push({ type: 'GE', value: '>=', pos: i });
        i += 2;
      } else {
        tokens.push({ type: 'GT', value: '>', pos: i });
        i++;
      }
      continue;
    }

    if (ch === '=') {
      if (text[i + 1] === '=') {
        tokens.push({ type: 'EQUALS', value: '==', pos: i });
        i += 2;
      } else {
        tokens.push({ type: 'EQUALS', value: '=', pos: i });
        i++;
      }
      continue;
    }

    if (ch === '+') { tokens.push({ type: 'PLUS', value: '+', pos: i++ }); continue; }
    if (ch === '-') { tokens.push({ type: 'MINUS', value: '-', pos: i++ }); continue; }
    if (ch === '*' || ch === '×' || ch === '·') { tokens.push({ type: 'STAR', value: '*', pos: i++ }); continue; }
    if (ch === '/' || ch === '÷') { tokens.push({ type: 'SLASH', value: '/', pos: i++ }); continue; }
    if (ch === '^') { tokens.push({ type: 'CARET', value: '^', pos: i++ }); continue; }
    if (ch === '%') { tokens.push({ type: 'PERCENT', value: '%', pos: i++ }); continue; }
    if (ch === '!') { tokens.push({ type: 'BANG', value: '!', pos: i++ }); continue; }
    if (ch === '(') { tokens.push({ type: 'LPAREN', value: '(', pos: i++ }); continue; }
    if (ch === ')') { tokens.push({ type: 'RPAREN', value: ')', pos: i++ }); continue; }
    if (ch === ',') { tokens.push({ type: 'COMMA', value: ',', pos: i++ }); continue; }

    // Pipe |x| for abs
    if (ch === '|') {
      tokens.push({ type: 'IDENT', value: 'abs_pipe', pos: i++ });
      continue;
    }

    // Skip unknown or error
    i++;
  }

  tokens.push({ type: 'EOF', value: '', pos: len });
  return tokens;
}

/**
 * Inserts implicit multiplication tokens between:
 * - Number followed by Ident or LPAREN: e.g. 2x -> 2 * x, 2(x) -> 2 * (x)
 * - Ident (not a function name) followed by Ident or LPAREN (if variable): x y -> x * y
 * - RPAREN followed by Number, Ident, or LPAREN: (x+1)(x-1) -> (x+1) * (x-1)
 */
const KNOWN_FUNCTIONS = new Set([
  'sin', 'cos', 'tan', 'sec', 'csc', 'cot',
  'asin', 'acos', 'atan', 'atan2',
  'sinh', 'cosh', 'tanh',
  'exp', 'ln', 'log', 'log10', 'log2',
  'sqrt', 'cbrt', 'abs', 'sign',
  'floor', 'ceil', 'round',
  'min', 'max', 'fact', 'gamma',
]);

function insertImplicitMultiplications(tokens: Token[]): Token[] {
  const result: Token[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const cur = tokens[i];
    result.push(cur);

    if (i + 1 < tokens.length) {
      const next = tokens[i + 1];

      const isCurrentEndOperand =
        cur.type === 'NUMBER' ||
        cur.type === 'RPAREN' ||
        cur.type === 'BANG' ||
        (cur.type === 'IDENT' && !KNOWN_FUNCTIONS.has(cur.value.toLowerCase()));

      const isNextStartOperand =
        next.type === 'NUMBER' ||
        next.type === 'LPAREN' ||
        next.type === 'IDENT';

      // Special check: don't insert * if current ident is a known function and next is LPAREN (e.g. sin(x))
      if (cur.type === 'IDENT' && KNOWN_FUNCTIONS.has(cur.value.toLowerCase()) && next.type === 'LPAREN') {
        continue;
      }

      if (isCurrentEndOperand && isNextStartOperand) {
        result.push({ type: 'STAR', value: '*', pos: cur.pos });
      }
    }
  }

  return result;
}

export class Parser {
  private tokens: Token[];
  private current = 0;

  constructor(input: string) {
    const rawTokens = tokenize(input);
    this.tokens = insertImplicitMultiplications(rawTokens);
  }

  private peek(): Token {
    return this.tokens[this.current] || { type: 'EOF', value: '', pos: 0 };
  }

  private isAtEnd(): boolean {
    return this.peek().type === 'EOF';
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.tokens[this.current - 1];
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  private match(...types: TokenType[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  private consume(type: TokenType, message: string): Token {
    if (this.check(type)) return this.advance();
    throw new Error(`${message} at position ${this.peek().pos}`);
  }

  public parse(): ASTNode {
    const node = this.comparison();
    if (!this.isAtEnd()) {
      throw new Error(`Unexpected token '${this.peek().value}' at position ${this.peek().pos}`);
    }
    return node;
  }

  private comparison(): ASTNode {
    let expr = this.additive();

    while (this.match('EQUALS', 'LT', 'LE', 'GT', 'GE')) {
      const opToken = this.tokens[this.current - 1];
      const right = this.additive();
      expr = {
        type: 'Comparison',
        op: opToken.value === '==' ? '=' : opToken.value,
        left: expr,
        right,
      };
    }

    return expr;
  }

  private additive(): ASTNode {
    let expr = this.multiplicative();

    while (this.match('PLUS', 'MINUS')) {
      const op = this.tokens[this.current - 1].value;
      const right = this.multiplicative();
      expr = { type: 'Binary', op, left: expr, right };
    }

    return expr;
  }

  private multiplicative(): ASTNode {
    let expr = this.unary();

    while (this.match('STAR', 'SLASH', 'PERCENT')) {
      const op = this.tokens[this.current - 1].value;
      const right = this.unary();
      expr = { type: 'Binary', op, left: expr, right };
    }

    return expr;
  }

  private unary(): ASTNode {
    if (this.match('PLUS')) {
      return this.unary();
    }
    if (this.match('MINUS')) {
      return { type: 'Unary', op: '-', argument: this.unary() };
    }

    return this.power();
  }

  private power(): ASTNode {
    let expr = this.postfix();

    if (this.match('CARET')) {
      const right = this.unary(); // Right-associative exponentiation: 2^3^4 = 2^(3^4)
      expr = { type: 'Binary', op: '^', left: expr, right };
    }

    return expr;
  }

  private postfix(): ASTNode {
    let expr = this.primary();

    while (this.match('BANG')) {
      expr = { type: 'Unary', op: '!', argument: expr };
    }

    return expr;
  }

  private primary(): ASTNode {
    if (this.match('NUMBER')) {
      const val = parseFloat(this.tokens[this.current - 1].value);
      return { type: 'Number', value: val };
    }

    if (this.match('IDENT')) {
      const name = this.tokens[this.current - 1].value;
      const lower = name.toLowerCase();

      // Check for constants
      if (lower === 'pi') return { type: 'Number', value: Math.PI };
      if (lower === 'e') return { type: 'Number', value: Math.E };
      if (lower === 'tau') return { type: 'Number', value: 2 * Math.PI };
      if (lower === 'phi') return { type: 'Number', value: (1 + Math.sqrt(5)) / 2 };

      // Check if followed by parentheses -> Function Call
      if (this.check('LPAREN')) {
        this.advance();
        const args: ASTNode[] = [];
        if (!this.check('RPAREN')) {
          do {
            args.push(this.additive());
          } while (this.match('COMMA'));
        }
        this.consume('RPAREN', `Expected ')' after function arguments`);
        return { type: 'FunctionCall', name: lower, args };
      }

      // Check if it's a known single-arg function called with implicit arg or direct power: e.g. sin x or sin^2(x)
      if (KNOWN_FUNCTIONS.has(lower)) {
        // e.g. sin x -> sin(x)
        const arg = this.unary();
        return { type: 'FunctionCall', name: lower, args: [arg] };
      }

      return { type: 'Variable', name };
    }

    if (this.match('LPAREN')) {
      const expr = this.comparison();
      this.consume('RPAREN', `Expected ')' to close parenthesis`);
      return expr;
    }

    throw new Error(`Unexpected token '${this.peek().value}' at position ${this.peek().pos}`);
  }
}
