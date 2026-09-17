// ESLint flat config for the Express backend, the Cloudflare Worker and the shared modules.
// Globals are scoped per runtime: Worker and shared code must not reach for Node globals.
import js from "@eslint/js";
import globals from "globals";

const WORKER_SOURCES = ["cloudflare/src/**/*.js"];
const SHARED_SOURCES = ["shared/**/*.js"];

export default [
  {
    ignores: ["**/node_modules/**", "cloudflare/.wrangler/**", "data/**", "**/.dryrun/**"],
  },
  js.configs.recommended,
  {
    files: ["**/*.js", "**/*.mjs"],
    languageOptions: { ecmaVersion: 2024, sourceType: "module" },
    rules: {
      "no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrors: "none" }],
      "no-var": "error",
      "prefer-const": "error",
      eqeqeq: ["error", "smart"],
      "no-implicit-coercion": ["error", { allow: ["!!"] }],
      // Validators deliberately match control characters (input hygiene, href scheme checks).
      "no-control-regex": "off",
    },
  },
  {
    // Express, scripts and tests (tests may use Node APIs for both runtimes).
    files: ["**/*.js", "**/*.mjs"],
    ignores: [...WORKER_SOURCES, ...SHARED_SOURCES],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    // Worker code runs on workerd: web platform globals only.
    files: WORKER_SOURCES,
    languageOptions: { globals: { ...globals.serviceworker, ...globals.es2024 } },
  },
  {
    // Shared modules are imported by both runtimes: language globals only.
    files: SHARED_SOURCES,
    languageOptions: { globals: { ...globals.es2024 } },
  },
];
