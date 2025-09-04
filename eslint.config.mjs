import js from '@eslint/js';
import globals from 'globals';
import css from '@eslint/css';
import { defineConfig } from 'eslint/config';

export default defineConfig([
    {
        files: ['**/*.{js,mjs,cjs}'],
        plugins: { js },
        rules: { 'no-unused-vars': 'off', 'no-undef': 'off' },
        extends: ['js/recommended'],
        languageOptions: { globals: { ...globals.browser, ...globals.node } },
    },
    { files: ['**/*.js'], languageOptions: { sourceType: 'commonjs' } },
]);
