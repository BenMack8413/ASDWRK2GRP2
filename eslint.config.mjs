import js from "@eslint/js";
import globals from "globals";
import css from "@eslint/css";
import { defineConfig } from "eslint/config";
import prettierPlugin from "eslint-plugin-prettier";

export default defineConfig([
  { files: ["**/*.{js,mjs,cjs}"], plugins: { js, prettier: prettierPlugin }, extends: ["js/recommended", "plugin:prettier/recommended"], languageOptions: { globals: {...globals.browser, ...globals.node} }, rules: {"prettier/prettier": "error"} },
  { files: ["**/*.js"], languageOptions: { sourceType: "commonjs" } },
  { files: ["**/*.css"], plugins: { css }, language: "css/css", extends: ["css/recommended"] },
]);
