/**
 * 计算列微型表达式解析器（FR-C-04）
 *
 * 自写 Shunting-yard 解析器，**禁用 eval**。
 * 支持：{字段} 引用、数字（含小数与负号）、+ - * /、括号、一元负号。
 * 解析期错误在"保存规则"阶段抛出（阻断性提示，FR-C-04 验收）；
 * 求值期除零返回 NaN（行级容错，不中断整批）。
 */

export type ExprNode =
  | { kind: 'num'; value: number }
  | { kind: 'field'; name: string }
  | { kind: 'op'; op: '+' | '-' | '*' | '/'; left: ExprNode; right: ExprNode }
  | { kind: 'neg'; expr: ExprNode };

type Token =
  | { t: 'num'; v: number }
  | { t: 'field'; name: string }
  | { t: 'op'; op: '+' | '-' | '*' | '/' }
  | { t: 'lparen' }
  | { t: 'rparen' };

function tokenize(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < expr.length) {
    const ch = expr[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (ch === '{') {
      const end = expr.indexOf('}', i + 1);
      if (end === -1) throw new Error('表达式括号不配对：缺少 }');
      const name = expr.slice(i + 1, end).trim();
      if (!name) throw new Error('{} 内字段名不能为空');
      tokens.push({ t: 'field', name });
      i = end + 1;
      continue;
    }
    if (/[0-9.]/.test(ch)) {
      const m = expr.slice(i).match(/^[0-9]*\.?[0-9]+/);
      if (!m) throw new Error(`无法解析数字（位置 ${i}）`);
      tokens.push({ t: 'num', v: parseFloat(m[0]) });
      i += m[0].length;
      continue;
    }
    if (ch === '+' || ch === '-' || ch === '*' || ch === '/') {
      tokens.push({ t: 'op', op: ch });
      i++;
      continue;
    }
    if (ch === '(') {
      tokens.push({ t: 'lparen' });
      i++;
      continue;
    }
    if (ch === ')') {
      tokens.push({ t: 'rparen' });
      i++;
      continue;
    }
    throw new Error(`不支持的字符「${ch}」（位置 ${i}），仅支持 {字段}、数字、+ - * / 与括号`);
  }
  return tokens;
}

const PRECEDENCE: Record<string, number> = { '+': 1, '-': 1, '*': 2, '/': 2, neg: 3 };

/** 解析为 AST；一元负号以前缀 'neg' 处理 */
export function parseExpression(expr: string): ExprNode {
  const tokens = tokenize(expr);
  if (tokens.length === 0) throw new Error('表达式不能为空');

  const output: (ExprNode | string)[] = [];
  const ops: string[] = [];
  let expectOperand = true;

  const applyOp = () => {
    const op = ops.pop();
    if (op === 'neg') {
      const e = output.pop();
      if (!e || typeof e === 'string') throw new Error('一元负号缺少操作数');
      output.push({ kind: 'neg', expr: e });
      return;
    }
    const right = output.pop();
    const left = output.pop();
    if (!left || !right || typeof left === 'string' || typeof right === 'string') {
      throw new Error('运算符缺少操作数');
    }
    output.push({ kind: 'op', op: op as '+' | '-' | '*' | '/', left, right });
  };

  for (const tok of tokens) {
    if (tok.t === 'num') {
      output.push({ kind: 'num', value: tok.v });
      expectOperand = false;
    } else if (tok.t === 'field') {
      output.push({ kind: 'field', name: tok.name });
      expectOperand = false;
    } else if (tok.t === 'lparen') {
      ops.push('(');
      expectOperand = true;
    } else if (tok.t === 'rparen') {
      while (ops.length && ops[ops.length - 1] !== '(') applyOp();
      if (!ops.length) throw new Error('括号不配对：多余的 )');
      ops.pop();
      expectOperand = false;
    } else {
      // 运算符；位置上期待操作数时的 '-' 为一元负号
      const op: string = tok.op === '-' && expectOperand ? 'neg' : tok.op;
      if (op !== 'neg' && expectOperand) throw new Error(`运算符「${tok.op}」位置错误`);
      while (
        ops.length &&
        ops[ops.length - 1] !== '(' &&
        PRECEDENCE[ops[ops.length - 1]] >= PRECEDENCE[op]
      ) {
        applyOp();
      }
      ops.push(op);
      expectOperand = true;
    }
  }
  while (ops.length) {
    if (ops[ops.length - 1] === '(') throw new Error('括号不配对：缺少 )');
    applyOp();
  }
  if (output.length !== 1 || typeof output[0] === 'string') throw new Error('表达式不完整');
  return output[0] as ExprNode;
}

export function evalExpression(node: ExprNode, getField: (name: string) => number): number {
  switch (node.kind) {
    case 'num':
      return node.value;
    case 'field':
      return getField(node.name);
    case 'neg':
      return -evalExpression(node.expr, getField);
    case 'op': {
      const l = evalExpression(node.left, getField);
      const r = evalExpression(node.right, getField);
      switch (node.op) {
        case '+':
          return l + r;
        case '-':
          return l - r;
        case '*':
          return l * r;
        case '/':
          return r === 0 ? NaN : l / r;
      }
    }
  }
}

/** 表达式引用的全部 {字段} 名（保存阶段校验用） */
export function referencedFields(expr: string): string[] {
  const out: string[] = [];
  const re = /\{([^}]+)\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(expr)) !== null) {
    const name = m[1].trim();
    if (name && !out.includes(name)) out.push(name);
  }
  return out;
}
