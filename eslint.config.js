import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'test-results', 'playwright-report'] },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    // sim — чистая детерминированная логика (CLAUDE.md)
    files: ['src/sim/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: ['pixi.js', 'preact', 'preact/*', 'gsap', '@capacitor/*', '**/view/**', '**/ui/**', '**/platform/**', '**/debug/**'] }],
      'no-restricted-globals': ['error', 'window', 'document', 'performance', 'localStorage', 'navigator'],
      'no-restricted-properties': ['error', { object: 'Math', property: 'random', message: 'Use seeded Rng' }, { object: 'Date', property: 'now', message: 'Use TimeService' }],
    },
  },
);
