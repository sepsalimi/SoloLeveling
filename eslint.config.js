const expoConfig = require("eslint-config-expo/flat");
const tsParser = require("@typescript-eslint/parser");
const tsPlugin = require("@typescript-eslint/eslint-plugin");

module.exports = [
  ...expoConfig,
  { ignores: ["dist/**", "node_modules/**", ".expo/**"] },
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: { parser: tsParser },
    plugins: { "@typescript-eslint": tsPlugin },
    settings: { "import/resolver": { typescript: { project: "./tsconfig.json" } } },
    rules: { "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }] }
  },
  {
    files: ["supabase/functions/**/*.ts"],
    rules: { "import/no-unresolved": ["error", { ignore: ["^https://"] }] }
  }
];
