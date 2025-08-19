/* eslint-disable */
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    ignores: [
      'dist',
      'docs',
      'examples',
      'legacy',
      'legacy/**',
      'shopify-app',
      'shopify-app/**',
      'supabase',
      'supabase/**',
      'node_modules',
      'kumo-edge-client.ts',
      'kumo-edge-functions.ts',
      'kumo-rfm-tests.ts',
      'kumo-rfm-typescript-sdk.ts',
    ],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: false,
        sourceType: 'module',
        ecmaVersion: 'latest',
      },
    },
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'off',
      'no-empty': 'off',
    },
  },
);
