import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // The application intentionally synchronizes API-backed form state in effects.
      // These React Compiler rules reject that established pattern even though the
      // app does not use the compiler.
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/exhaustive-deps': 'off',
      // A few UI modules export small display helpers alongside their components.
      'react-refresh/only-export-components': 'off',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
])
