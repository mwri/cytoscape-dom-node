# cytoscape-dom-node

This extension lets you set DOM elements as nodes. When enabled providing the
DOM element by setting the `dom` node data will cause the DOM element to be
rendered on top of the node, and the node will be set to the size of the DOM
element.

For a full working demo, see [codepen abWdVOG](https://codepen.io/mwri/pen/abWdVOG).

## Depenedencies

* cytoscape ^3.19.0

## Extension registration

Either import/require `cytoscape-dom-node`, and register it as an extension with Cytoscape:

```js
const cytoscape = require('cytoscape');
cytoscape.use(require('cytoscape-dom-node'));
```

Or it can be included via a `<script>` tag after `cytoscape`, and will register itself:

```html
<script type="text/javascript" charset="utf8" src="path/to/cytoscape.js"></script>
<script type="text/javascript" charset="utf8" src="path/to/cytoscape-dom-node.js"></script>
```

## Usage instructions

Create a `cytoscape` instance and call `domNode` on it:

```js
let cy = cytoscape({
    'container': document.getElementById('id-of-my-cytoscape-container'),
    'elements': [],
});

cy.domNode();
```

Now add a node with `dom` in the data, set to a DOM element:

```js
let div = document.createElement("div");
div.innerHTML = `node ${id}`;

cy.add({
    'data': {
        'id':  id,
        'dom': div,
    },
});
```

The `div` you created will be shown as the node now.

See [codepen abWdVOG](https://codepen.io/mwri/pen/abWdVOG) for a working
example.

### Skip Node Append
The `skip_node_append` option is a boolean flag (passed with node data) that controls whether the `cytoscape-dom-node` appends the provided node to the provided DOM container.
By default, this option is set to false, meaning the `cytoscape-dom-node` will append the node to the container.

However, in certain scenarios, such as when using EmberJS or another front-end framework, you might have already rendered the nodes to the DOM.
In these cases, you can set `skip_node_append` to true to prevent the library from appending the node, allowing you to maintain control over the node's rendering process.

```js
let div = document.querySelector("#alreadyRenderedNodeId");
cy.add({
    'data': {
        'id': id,
        'dom': div,
        'skip_node_append': true,
    }
})
```

## Options

One option is supported, `dom_container` allows an container element to be specified which
will be used for nodes instead of the element it would otherwise create and use. It is the
callers responsibility to style the given element appropriately, for example:

```js
cy.domNode({'dom_container': some_element});
```
