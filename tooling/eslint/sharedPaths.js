/**
 * @param {string} description
 * @param {import('eslint').Rule.RuleModule['create']} create
 * @returns {import('eslint').Rule.RuleModule}
 */
const rule = (description, create) => ({
  meta: { type: 'problem', schema: [], messages: { shared: description } },
  create,
});

const storageNames = new Set(['localStorage', 'sessionStorage']);
const rawFont = /\btext-\[(?:length:)?\d+(?:\.\d+)?(?:px|rem|pt)\]/;
const rawWidthQuery = /\(\s*(?:min|max)-width\s*:/;
const fixedFont = (value) => typeof value === 'number' || /^\d+(?:\.\d+)?(?:px|rem|pt)$/.test(value);
const literalColor = /(?:rgba?\(|#[0-9a-f]{3,8}\b)/i;

function inStyleContext(node) {
  for (let parent = node.parent; parent; parent = parent.parent) {
    if (parent.type === 'JSXAttribute') return ['className', 'style'].includes(parent.name.name);
    if (parent.type === 'Property') {
      const key = parent.computed ? parent.key.value : (parent.key.name ?? parent.key.value);
      if (/^(?:color|background.*|.*Shadow|border.*Color|fill|stroke)$/.test(key)) return true;
    }
  }
  return false;
}

export default {
  rules: {
    'browser-storage': rule(
      'Use the shared browserStorage adapter so unavailable storage is handled consistently.',
      (context) => ({
        MemberExpression(node) {
          const name = node.computed ? node.property.value : node.property.name;
          if (storageNames.has(name)) context.report({ node, messageId: 'shared' });
        },
        Identifier(node) {
          if (!storageNames.has(node.name)) return;
          const parent = node.parent;
          if (parent.type === 'MemberExpression' && parent.property === node && !parent.computed) return;
          if (parent.type === 'Property' && parent.key === node && !parent.computed && !parent.shorthand)
            return;
          context.report({ node, messageId: 'shared' });
        },
      })
    ),
    'responsive-policy': rule(
      'Use a query from shared/policy/responsive instead of a separate width threshold.',
      (context) => ({
        Literal(node) {
          if (typeof node.value === 'string' && rawWidthQuery.test(node.value)) {
            context.report({ node, messageId: 'shared' });
          }
        },
        TemplateElement(node) {
          if (rawWidthQuery.test(node.value.raw)) context.report({ node, messageId: 'shared' });
        },
      })
    ),
    'typography-tokens': rule(
      'Use a semantic typography role/token; define font sizes in the central stylesheet.',
      (context) => ({
        Literal(node) {
          if (typeof node.value === 'string' && rawFont.test(node.value))
            context.report({ node, messageId: 'shared' });
        },
        TemplateElement(node) {
          if (rawFont.test(node.value.raw)) context.report({ node, messageId: 'shared' });
        },
        Property(node) {
          const key = node.computed ? node.key.value : (node.key.name ?? node.key.value);
          if (key === 'fontSize' && node.value.type === 'Literal' && fixedFont(node.value.value))
            context.report({ node, messageId: 'shared' });
        },
      })
    ),
    'button-component': rule(
      'Use the shared Button component for the common button appearance and behavior.',
      (context) => ({
        Literal(node) {
          if (typeof node.value === 'string' && /(?:^|\s)ui-btn(?:\s|$)/.test(node.value)) {
            context.report({ node, messageId: 'shared' });
          }
        },
        TemplateElement(node) {
          if (/(?:^|\s)ui-btn(?:\s|$)/.test(node.value.raw)) context.report({ node, messageId: 'shared' });
        },
      })
    ),
    'color-tokens': rule(
      'Define literal UI colors in the central stylesheet and consume semantic tokens.',
      (context) => ({
        Literal(node) {
          if (typeof node.value === 'string' && literalColor.test(node.value) && inStyleContext(node)) {
            context.report({ node, messageId: 'shared' });
          }
        },
        TemplateElement(node) {
          if (literalColor.test(node.value.raw) && inStyleContext(node))
            context.report({ node, messageId: 'shared' });
        },
      })
    ),
  },
};
