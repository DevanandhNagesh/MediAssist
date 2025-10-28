module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true
  },
  extends: ['standard', 'plugin:react/recommended'],
  parserOptions: {
    ecmaFeatures: {
      jsx: true
    },
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  settings: {
    react: {
      version: 'detect'
    }
  },
  rules: {
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
    'space-before-function-paren': ['error', 'never'],
    semi: ['error', 'always'],
    'multiline-ternary': 'off'
  }
};
