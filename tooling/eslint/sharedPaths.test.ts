import { Linter } from 'eslint';
import { expect, it } from 'vitest';
import plugin from './sharedPaths.js';

const lint = (code: string) =>
  new Linter().verify(code, [
    {
      languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
      plugins: { shared: plugin },
      rules: Object.fromEntries(Object.keys(plugin.rules).map((name) => [`shared/${name}`, 'error'])),
    },
  ]);

it.each([
  ['localStorage.getItem("key")', 'browser-storage'],
  ['window["sessionStorage"].setItem("key", "value")', 'browser-storage'],
  ['window.matchMedia("(min-width: 1024px)")', 'responsive-policy'],
  ['const C = () => <div className="text-[13px]" />', 'typography-tokens'],
  ['const C = () => <div className={`text-[0.8rem] ${active}`} />', 'typography-tokens'],
  ['const C = () => <div style={{fontSize: 14}} />', 'typography-tokens'],
  ['const C = () => <button className="ui-btn ui-btn--solid" />', 'button-component'],
  ['const C = () => <div className="shadow-[0_8px_18px_rgba(209,15,37,0.08)]" />', 'color-tokens'],
])('rejects a bypass: %s', (code, name) => {
  expect(lint(code).some((error) => error.ruleId === `shared/${name}`)).toBe(true);
});

it('accepts semantic tokens, the responsive policy, the adapter and Button', () => {
  expect(
    lint(`
    safeSetStorageItem('key', 'value');
    window.matchMedia(DESKTOP_MEDIA_QUERY);
    const Anchor = () => <a href="#abc">내용</a>;
    const Styled = () => <span style={{fontSize: 'var(--type-body-size)'}}>내용</span>;
    const C = () => <Button variant="solid" className="text-[length:var(--font-compact-action)] shadow-[var(--shadow-primary-action)]" />;
  `)
  ).toEqual([]);
});
