# Demos

Demos, old and new.

## `modern`

`modern` is the current browser-native ESM TypeScript demo. It imports Cytoscape from a CDN, uses the local `dist/index.mjs` build, and exercises the camelCase API including `domContainer` and `nodeDom()`.

Run it from the repository root:

```sh
npm install
npm run build
npm run build:demo:modern
python3 -m http.server 8080
```

Then open:

```text
http://localhost:8080/demos/modern
```

## `legacy-webpack`

`legacy-webpack` is the original demo app that predates the TypeScript migration. It has not been significantly updated or functionally changed.

Run it, from the repository root:

```sh
npm install
npm run build

cd demos/legacy-webpack
npm install
NODE_OPTIONS=--openssl-legacy-provider ./node_modules/.bin/webpack-dev-server --debug
```

Then open:

```text
http://localhost:8080/
```

The snapshot page is:

```text
http://localhost:8080/snapshots.html
```

Use the `NODE_OPTIONS` flag with modern Node versions because this demo uses Webpack 4!

## `legacy-codepen`

`legacy-codepen` is a copy of the original CodePen at `https://codepen.io/mwri/pen/abWdVOG`.

Run it from the repository root:

```sh
npm install
npm run build
python3 -m http.server 8080
```

Then open:

```text
http://localhost:8080/demos/legacy-codepen/
```
