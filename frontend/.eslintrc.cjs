module.exports = {
  root: true,
  env: {
    browser: true,
    es2020: true,
    node: true,
  },
  extends: [
    'eslint:recommended'
  ],
  ignorePatterns: [
    'dist',
    'node_modules',
    '.eslintrc.cjs',
    'vite.config.ts',
    '**/*.d.ts'
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true
    }
  },
  rules: {
    'no-unused-vars': 'warn',
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'prefer-const': 'error',
    'no-var': 'error'
  },
  overrides: [
    {
      files: ['*.ts', '*.tsx'],
      parser: '@typescript-eslint/parser',
      plugins: ['@typescript-eslint'],
      rules: {
        'no-unused-vars': 'off',
        '@typescript-eslint/no-unused-vars': [
          'warn',
          { 
            argsIgnorePattern: '^_',
            varsIgnorePattern: '^_' 
          }
        ]
      }
    }
  ]
} 