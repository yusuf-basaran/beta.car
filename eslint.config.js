import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['**/node_modules/**', '.build/**', '.vercel/**', 'seed.js'] },
  js.configs.recommended,
  {
    files: ['**/*.js', '**/*.mjs'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: globals.browser },
    rules: {
      'no-unused-vars': 'error',
      'no-undef': 'error',
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
  {
    files: ['scripts/**', 'functions/**', 'tests/**', '*.config.js'],
    languageOptions: { globals: globals.node },
  },
];
