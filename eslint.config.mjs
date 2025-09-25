import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import pluginReactHooks from "eslint-plugin-react-hooks";

export default [
  // Lint only project source files
  {
    files: [
      "src/**/*.{ts,tsx,js,jsx}",
      "api/**/*.{ts,js}",
      "utils/**/*.{ts,js}",
      "scripts/**/*.{ts,js}",
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
  },
  // Node globals for API code
  {
    files: ["api/**/*.{ts,js}"],
    languageOptions: {
      globals: globals.node,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
  },
  {
    files: ["**/*.cjs"],
    languageOptions: {
      globals: globals.node,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "script",
      },
    },
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  pluginReact.configs.flat.recommended,
  {
    plugins: {
      "react-hooks": pluginReactHooks,
    },
    rules: {
      // Match legacy .eslintrc.json behavior
      "@typescript-eslint/no-unused-vars": "off",
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "no-empty": "off",
      "no-case-declarations": "off",
      "no-useless-catch": "off",
      "react/no-unescaped-entities": "off",
      // React Hooks rules (keep rules-of-hooks, relax deps for stability)
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "off",
    },
    settings: {
      react: {
        version: "detect",
      },
    },
  },
  // Node/test files: set Node globals and test-specific tweaks
  {
    files: [
      "tests/**/*.{ts,js}",
      "test/**/*.{ts,js}",
      "test-*.{ts,js}",
      "scripts/**/*.{ts,js}",
      "test-audd-api.js",
    ],
    languageOptions: {
      globals: {
        ...globals.node,
        fetch: "readonly",
        FormData: "readonly",
        console: "readonly",
        process: "readonly",
      },
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    rules: {
      "no-empty-pattern": "off",
    },
  },
  {
    ignores: [
      // build and deps
      "dist/",
      "node_modules/",
      // reports and artifacts
      "playwright-report/",
      "test-results/",
      "playwright-report.json",
      // infra/config files
      "*.config.js",
      "*.config.ts",
      "*.cjs",
      ".netlify/",
      "netlify/functions/",
      ".vercel/",
      "vercel.json",
      // public assets
      "public/",
    ],
  },
];
