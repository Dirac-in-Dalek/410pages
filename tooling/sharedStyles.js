import postcss from 'postcss';

/** Keep width thresholds in the responsive policy, including compound media queries. */
export function checkSharedStyles(css) {
  const errors = [];
  postcss.parse(css).walkAtRules('media', (rule) => {
    if (/(?:min|max)-width\s*:\s*\d|width\s*(?:<=?|>=?)\s*\d|var\(/.test(rule.params)) {
      errors.push(
        `Line ${rule.source.start.line}: use theme(screens.<role>) for width queries; CSS var() is not valid here.`
      );
    }
  });
  return errors;
}
