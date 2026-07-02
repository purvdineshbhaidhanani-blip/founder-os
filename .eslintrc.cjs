/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
    project: "./tsconfig.eslint.json",
  },
  plugins: ["@typescript-eslint"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
  ],
  env: {
    node: true,
    es2022: true,
  },
  ignorePatterns: ["dist/", "node_modules/", "web/dist/", "web/node_modules/", "*.cjs"],
  rules: {
    "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "@typescript-eslint/no-explicit-any": "warn",
    "no-console": "off",
    // `(string & {})` is the standard TS idiom for a literal-union type that still
    // allows any string while preserving editor autocomplete — intentional here,
    // not a mistake, so this specific `{}` usage is allowed rather than the whole
    // rule disabled.
    "@typescript-eslint/ban-types": ["error", { extendDefaults: true, types: { "{}": false } }],
    // Worker-loop `while (true)` with an internal return/break exit is a standard,
    // clear pattern already in use in the runtime layer — allow it in loops only.
    "no-constant-condition": ["error", { checkLoops: false }],
  },
  overrides: [
    {
      files: ["web/**/*.ts", "web/**/*.tsx"],
      parserOptions: {
        ecmaFeatures: { jsx: true },
        project: "./web/tsconfig.json",
      },
      env: {
        browser: true,
        node: false,
      },
    },
  ],
};
