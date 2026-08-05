import js from "@eslint/js";
import globals from "globals";
import pluginReact from "eslint-plugin-react";

const cleanGlobals = Object.fromEntries(
  Object.entries({
    ...globals.browser,
    ...globals.node,
  }).map(([key, value]) => [key.trim(), value])
);

export default [
  { ignores: ["build/**", "node_modules/**"] },
  js.configs.recommended,
  {
    ...pluginReact.configs.flat.recommended,
    files: ["**/*.{js,mjs,cjs,jsx}"],
    languageOptions: {
      ...pluginReact.configs.flat.recommended.languageOptions,
      ecmaVersion: "latest",
      sourceType: "module",
      globals: cleanGlobals,
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      ...pluginReact.configs.flat.recommended.rules,
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "no-unused-vars": "off",
    },
  },
];
