/**
 * @fileoverview ESLint configuration for LegacyAI Voice Agent System
 * @author LegacyAI Subagent Fleet
 * @created 2025-10-01T00:00:00Z
 * @lastModified 2025-10-01T00:00:00Z
 */

module.exports = {
  env: {
    node: true,
    es2021: true,
    jest: true,
  },
  extends: [
    'eslint:recommended',
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    // Code Quality
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'no-console': 'off', // We use console.log for logging
    'no-debugger': 'warn',

    // Best Practices
    'eqeqeq': ['error', 'always'],
    'no-var': 'error',
    'prefer-const': 'error',
    'prefer-arrow-callback': 'warn',

    // Code Style
    'indent': ['error', 2],
    'quotes': ['error', 'single', { avoidEscape: true }],
    'semi': ['error', 'always'],
    'comma-dangle': ['error', 'never'],
    'object-curly-spacing': ['error', 'always'],
    'array-bracket-spacing': ['error', 'never'],

    // Error Handling
    'no-throw-literal': 'error',
    'prefer-promise-reject-errors': 'error',

    // Documentation
    'spaced-comment': ['warn', 'always'],
    'multiline-comment-style': ['warn', 'starred-block']
  },
  overrides: [
    {
      files: ['**/__tests__/**/*.js'],
      env: {
        jest: true,
      },
      rules: {
        'no-unused-expressions': 'off',
      },
    },
  ],
};
