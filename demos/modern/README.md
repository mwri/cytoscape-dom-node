# Modern Demo

This TypeScript demo exercises the TypeScript-era package shape with
browser-native ESM and the local `dist/index.mjs` build. It uses the current
camelCase API, including `domContainer` and `nodeDom()`.

Run from the repository root:

```sh
npm install
npm run build
npm run build:demo:modern
python3 -m http.server 8080
```

Then open:

```text
http://localhost:8080/demo/modern/
```

The demo can also be served directly from this directory because `dist` is a
symlink to the repository build output:

```sh
cd demo/modern
python3 -m http.server 8080
```

Re-run `npm run build` after changing `src/index.ts`. Re-run
`npm run build:demo:modern` after changing `demo/modern/src/main.ts`. The demo
TypeScript output is generated into `demo/modern/generated`.
