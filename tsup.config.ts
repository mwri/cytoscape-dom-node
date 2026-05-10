import { defineConfig } from "tsup";

export default defineConfig({
  clean: true,
  dts: true,
  entry: ["src/index.ts"],
  footer({ format }) {
    if (format !== "cjs") {
      return undefined;
    }

    return {
      js: "module.exports = Object.assign(module.exports.default, module.exports);",
    };
  },
  format: ["cjs", "esm", "iife"],
  globalName: "cytoscapeDomNode",
  outDir: "dist",
  outExtension({ format }) {
    if (format === "cjs") {
      return { js: ".cjs" };
    }

    if (format === "esm") {
      return { js: ".mjs" };
    }

    return { js: ".global.js" };
  },
  sourcemap: true,
  target: "es2018",
});
