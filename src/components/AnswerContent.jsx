import { Box } from '@mui/material';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { EQUATION_UNAVAILABLE, normalizeAnswerMarkup } from '../utils/answerMarkup';

const markdownComponents = {
  table: ({ node: _node, ...props }) => (
    <Box sx={{ overflowX: 'auto', my: 1 }}>
      <table {...props} />
    </Box>
  ),
  img: ({ alt }) => alt || null,
};

function replaceInvalidEquations() {
  return function visit(node) {
    if (node.properties?.className?.includes('katex-error')) {
      node.tagName = 'em';
      node.properties = {};
      node.children = [{ type: 'text', value: EQUATION_UNAVAILABLE }];
      return;
    }
    node.children?.forEach(visit);
  };
}

export default function AnswerContent({ content }) {
  return (
    <Box
      sx={{
        typography: 'body2',
        lineHeight: 1.7,
        overflowWrap: 'anywhere',
        '& > :first-child': { mt: 0 },
        '& > :last-child': { mb: 0 },
        '& p, & ul, & ol': { my: 1 },
        '& ul, & ol': { pl: 3 },
        '& li + li': { mt: 0.25 },
        '& h1, & h2, & h3, & h4, & h5, & h6': { fontSize: '1em', mt: 1.5, mb: 0.5 },
        '& a': { color: 'primary.main' },
        '& blockquote': { ml: 0, pl: 1.5, borderLeft: '2px solid', borderColor: 'divider' },
        '& hr': { border: 0, borderTop: '1px solid', borderColor: 'divider' },
        '& pre': { overflowX: 'auto', p: 1.25, borderRadius: 1, bgcolor: 'background.paper' },
        '& :not(pre) > code': { px: 0.5, borderRadius: 0.5, bgcolor: 'background.paper' },
        '& code': { fontSize: '0.9em' },
        '& table': { borderCollapse: 'collapse', width: 'max-content', minWidth: '100%' },
        '& th, & td': { px: 1, py: 0.5, border: '1px solid', borderColor: 'divider' },
        '& .katex-display': { my: 1, py: 0.5, overflowX: 'auto', overflowY: 'hidden' },
        '& .katex-display > .katex': { textAlign: 'left', width: 'max-content', minWidth: '100%' },
        '& .katex': { overflowWrap: 'normal' },
      }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[[rehypeKatex, { trust: false, strict: 'ignore' }], replaceInvalidEquations]}
        components={markdownComponents}
      >
        {normalizeAnswerMarkup(content)}
      </ReactMarkdown>
    </Box>
  );
}
