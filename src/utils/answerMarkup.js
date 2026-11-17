// Normalize TeX wrappers before Markdown interprets the backslashes as escapes.
const answerTokens = new RegExp([
  /(?<fenced>^[ \t]{0,3}(?<fence>`{3,}|~{3,})[^\n]*\n[\s\S]*?(?:^[ \t]{0,3}\k<fence>[`~]*[ \t]*(?=\r?$)|(?![\s\S])))/.source,
  /(?<code>(?<backticks>`+)[\s\S]*?\k<backticks>(?!`))/.source,
  /(?<link>!?\[[^\]\n]*\]\([^\n)]*\))/.source,
  /(?<escaped>\\\\|\\\$)/.source,
  /\\\[(?<display>[\s\S]+?)\\\]/.source,
  /\\\((?<inline>[\s\S]+?)\\\)/.source,
  /\$\$(?<dollars>[\s\S]+?)\$\$/.source,
  /\[(?<bracketedCases>[^\][\r\n]{0,180}\\begin\{cases\}[\s\S]+?\\end\{cases\})[ \t]*\]/.source,
  /(?<environment>\\begin\{(?<env>equation\*?|align\*?|aligned|gather\*?|cases|[pbvBV]?matrix)\}[\s\S]+?\\end\{\k<env>\})/.source,
  /\$(?![\s$]|\d[\d,.]*[ \t]+[a-zA-Z]{2,}\b)(?<single>(?:\\[^\r\n]|[^\\$\r\n])+?)(?<!\s)\$(?![\d$])/.source,
  /(?<unfinished>(?:\\[[(]|\$\$|\[[^\][\r\n]{0,180}(?=\\begin\{cases\})|\\begin\{(?:cases|aligned|align\*?|gather\*?|equation\*?|[pbvBV]?matrix)\})[^\r\n]*(?:\r?\n(?![ \t]*(?:\r?$|(?:\d+[.)]|[-+*])[ \t]))[^\r\n]*)*)/.source,
  /\[source:\s*\d{0,3}\]/i.source,
  /\$/.source,
].join('|'), 'gm');

export const EQUATION_UNAVAILABLE = 'Equation unavailable';

function displayMath(formula, linePrefix) {
  const indent = linePrefix.match(/^ *(?:(?:\d+[.)]|[-+*]) +)?/)[0].length;
  const pad = ' '.repeat(indent);
  return `\n\n${pad}$$\n${formula.trim().split('\n').map((line) => pad + line).join('\n')}\n${pad}$$\n\n`;
}

export function normalizeAnswerMarkup(content) {
  return content.replace(answerTokens, (token, ...match) => {
    const groups = match.at(-1);
    if (groups.fenced || groups.code || groups.link || groups.escaped) return token;
    const display = groups.display || groups.dollars || groups.environment || groups.bracketedCases;
    if (display) {
      const offset = match.at(-3);
      const lineStart = content.lastIndexOf('\n', offset - 1) + 1;
      return displayMath(display, content.slice(lineStart, offset));
    }
    if (groups.inline || groups.single) {
      const formula = (groups.inline || groups.single).trim().replace(/\s*\n\s*/g, ' ');
      return formula ? `$${formula}$` : token;
    }
    if (groups.unfinished) return `*${EQUATION_UNAVAILABLE}*`;
    return token === '$' ? '\\$' : '';
  });
}
