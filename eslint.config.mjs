import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default [
  {
    ignores: [
      "coverage/**",
      "dist/**",
      "docs/**",
      "node_modules/**",
      "demo/legacy-webpack/node_modules/**",
      "demo/legacy-webpack/public/cytoscape-dom-node-demo.bundle.js",
      "demo/legacy-codepen/codepen.js",
      "demo/modern/generated/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked.map((config) => ({
    ...config,
    files: ["**/*.ts"],
  })),
  ...tseslint.configs.stylisticTypeChecked.map((config) => ({
    ...config,
    files: ["**/*.ts"],
  })),
  {
    files: ["**/*.ts"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-deprecated": "off",
      "@typescript-eslint/no-extraneous-class": "off",
      "@typescript-eslint/no-namespace": "off",
      "@typescript-eslint/no-unnecessary-condition": "off",
    },
  },
  {
    files: ["demo/legacy-webpack/src/**/*.js"],
    languageOptions: {
      globals: {
        clearInterval: "readonly",
        document: "readonly",
        Math: "readonly",
        setInterval: "readonly",
        setTimeout: "readonly",
      },
    },
  },
  {
    files: ["demo/legacy-webpack/webpack.config.js"],
    languageOptions: {
      globals: {
        __dirname: "readonly",
        module: "readonly",
        process: "readonly",
        require: "readonly",
      },
      sourceType: "commonjs",
    },
  },
  {
    files: ["src/index.js"],
    languageOptions: {
      sourceType: "commonjs",
    },
  },
];
