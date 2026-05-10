# cytoscape-dom-node

This extension lets you set DOM elements as nodes. When enabled providing the
DOM element by setting the `dom` node data will cause the DOM element to be
rendered on top of the node, and the node will be set to the size of the DOM
element.

For a full working demo, see [codepen abWdVOG](https://codepen.io/mwri/pen/abWdVOG).
There are also more demos in [./demo](./demo).

## Dependencies

- cytoscape ^3.19.0

## Extension registration

Import `cytoscape-dom-node`, and register it as an extension with Cytoscape:

```ts
import cytoscape from "cytoscape";
import cytoscapeDomNode from "cytoscape-dom-node";

cytoscape.use(cytoscapeDomNode);
```

CommonJS is still supported:

```js
const cytoscape = require("cytoscape");
const cytoscapeDomNode = require("cytoscape-dom-node");

cytoscape.use(cytoscapeDomNode);
```

Or it can be included via a `<script>` tag after `cytoscape`, and will register itself:

```html
<script type="text/javascript" charset="utf8" src="path/to/cytoscape.js"></script>
<script
  type="text/javascript"
  charset="utf8"
  src="path/to/cytoscape-dom-node.global.js"
></script>
```

## Usage instructions

Create a `cytoscape` instance and call `domNode` on it:

```ts
const cy = cytoscape({
  container: document.getElementById("id-of-my-cytoscape-container"),
  elements: [],
});

const domNodeRenderer = cy.domNode();
```

Now add a node with `dom` in the data, set to a DOM element:

```ts
const div = document.createElement("div");
div.innerHTML = `node ${id}`;

cy.add({
  data: {
    dom: div,
    id,
  },
});
```

The `div` you created will be shown as the node now.

You can retrieve the DOM element for a Cytoscape node id:

```ts
const nodeElement = domNodeRenderer.nodeDom(id);
```

The previous `node_dom(id)` method is kept as a backwards compatible alias.

See [codepen abWdVOG](https://codepen.io/mwri/pen/abWdVOG) for a working
example.

### Skip Node Append

The `skipNodeAppend` node data option controls whether `cytoscape-dom-node`
appends the provided DOM node to the configured DOM container. By default,
`cytoscape-dom-node` appends the node to the container.

In certain scenarios, such as when using EmberJS or another front-end framework,
you might have already rendered the nodes to the DOM. In these cases, set
`skipNodeAppend` to `true` to keep control over rendering.

```ts
const div = document.querySelector("#alreadyRenderedNodeId");
cy.add({
  data: {
    dom: div,
    id,
    skipNodeAppend: true,
  },
});
```

The legacy `skip_node_append` name remains supported.

## Options

`domContainer` allows a container element to be specified. It will be used for
nodes instead of the element `cytoscape-dom-node` would otherwise create. It is
the caller's responsibility to style the given element appropriately:

```ts
cy.domNode({ domContainer: someElement });
```

The legacy `dom_container` name remains supported.

## Interaction State

DOM nodes mirror Cytoscape selection state with the `selected` class. Selected
or grabbed nodes receive z-index `11`; other DOM nodes receive z-index `10`.

## Development

This package is authored in TypeScript and emits CommonJS, ESM, browser global,
and declaration outputs into `dist`.

Useful commands:

```sh
npm run lint
npm run typecheck
npm run test
npm run test:coverage
npm run build
npm run docs
npm run check
```
