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
      // TypeScript handles unused vars via tsconfig strict mode
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      // Keep relaxed for gradual migration — enable as tech debt is resolved
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/ban-ts-comment": "warn",
      "no-empty": "warn",
      "no-case-declarations": "off",
      "no-useless-catch": "warn",
      "react/no-unescaped-entities": "off",
      // React Hooks rules
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
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
