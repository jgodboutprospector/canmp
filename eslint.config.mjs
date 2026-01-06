import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Ignore utility scripts
    "scripts/**",
    "database/**",
  ]),
  // Global rule overrides
  {
    files: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.mjs"],
    rules: {
      // Downgrade no-explicit-any to warning - will be fixed incrementally
      "@typescript-eslint/no-explicit-any": "warn",
      // Allow require imports in certain cases
      "@typescript-eslint/no-require-imports": "warn",
    },
  },
  // Override rules for test files
  {
    files: ["**/*.test.tsx", "**/*.test.ts", "jest.config.js"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-unused-vars": "warn",
    },
  },
]);

export default eslintConfig;
