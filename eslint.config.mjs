import { javascript } from "@eslint/js";
import { css } from "@eslint/css";
import globals from "globals";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    files: ["**/*.{js,mjs,cjs}"],
    ...javascript.configs.recommended,
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      "prettier/prettier": "error",
    },
  },
  {
    files: ["**/*.js"],
    languageOptions: { sourceType: "commonjs" },
  },
  {
    files: ["**/*.css"],
    ...css.configs.recommended,
  },
]);
