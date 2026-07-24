import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  outDir: "dist",
  format: ["esm"],
  platform: "node",
  target: "node22",
  clean: true,
  dts: false,
  minify: false,
  deps: {
    skipNodeModulesBundle: true,
  },
});
