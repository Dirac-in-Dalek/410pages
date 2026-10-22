import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import sharedPaths from './tooling/eslint/sharedPaths.js';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'output/**',
      '.worktrees/**',
      '**/node_modules/**',
      'docs/**',
      '**/*.{test,spec}.{ts,tsx,js}',
      'scripts/**',
      'shared/api/database.types.ts',
    ],
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    extends: [js.configs.recommended],
    languageOptions: { globals: { ...globals.browser, ...globals.node, ...globals.serviceworker } },
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    files: [
      'app/**/*.{ts,tsx}',
      'components/**/*.{ts,tsx}',
      'features/**/*.{ts,tsx}',
      'lib/**/*.ts',
      'shared/**/*.{ts,tsx,js}',
    ],
    plugins: { 'shared-paths': sharedPaths },
    rules: {
      'shared-paths/browser-storage': 'error',
      'shared-paths/responsive-policy': 'error',
      'shared-paths/typography-tokens': 'error',
      'shared-paths/button-component': 'error',
    },
  },
  {
    files: ['app/**/*.tsx', 'components/**/*.tsx', 'features/**/*.tsx', 'shared/ui/**/*.tsx'],
    rules: { 'shared-paths/color-tokens': 'error' },
  },
  { files: ['shared/lib/browserStorage.ts'], rules: { 'shared-paths/browser-storage': 'off' } },
  { files: ['shared/policy/responsive.js'], rules: { 'shared-paths/responsive-policy': 'off' } },
  { files: ['shared/ui/Button.tsx'], rules: { 'shared-paths/button-component': 'off' } }
);
