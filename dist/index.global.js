"use strict";
var cytoscapeDomNode = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
  var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

  // src/index.ts
  var index_exports = {};
  __export(index_exports, {
    CytoscapeDomNode: () => DomNodeRenderer,
    DomNodeRenderer: () => DomNodeRenderer,
    default: () => register
  });
  var DEFAULT_Z_INDEX = "10";
  var ACTIVE_Z_INDEX = "11";
  var SELECTED_CLASS_NAME = "selected";
  var DomNodeRenderer = class {
    constructor(cy, options = {}) {
      __publicField(this, "cy");
      __publicField(this, "nodeElements", /* @__PURE__ */ new Map());
      __publicField(this, "resizeObserver");
      __publicField(this, "container");
      __publicField(this, "handleNodeAdd", (event) => {
        this.addNode(event.target);
      });
      __publicField(this, "handleNodeRemove", (event) => {
        this.removeNode(event.target);
      });
      __publicField(this, "handleNodePosition", (event) => {
        this.syncNodePosition(event.target);
      });
      __publicField(this, "handleNodeState", (event) => {
        this.syncNodeState(event.target);
      });
      __publicField(this, "handleViewport", () => {
        this.syncViewport();
      });
      this.cy = cy;
      this.container = resolveDomContainer(cy, options);
      this.resizeObserver = new (resolveResizeObserver(options))((entries) => {
        for (const entry of entries) {
          this.syncNodeSize(entry.target);
        }
      });
      this.bindEvents();
      cy.nodes().forEach((node) => {
        this.addNode(node);
      });
      this.syncViewport();
    }
    /**
     * Return the DOM element that backs a Cytoscape node id.
     */
    nodeDom(id) {
      return this.nodeElements.get(id);
    }
    /**
     * @deprecated Use {@link nodeDom}.
     */
    node_dom(id) {
      return this.nodeDom(id);
    }
    /**
     * Remove event handlers and disconnect resize observation.
     */
    destroy() {
      this.cy.off("add", "node", this.handleNodeAdd);
      this.cy.off("remove", "node", this.handleNodeRemove);
      this.cy.off("pan zoom", this.handleViewport);
      this.cy.off("position bounds", "node", this.handleNodePosition);
      this.cy.off("select unselect grab free", "node", this.handleNodeState);
      this.resizeObserver.disconnect();
      this.nodeElements.clear();
    }
    bindEvents() {
      this.cy.on("add", "node", this.handleNodeAdd);
      this.cy.on("remove", "node", this.handleNodeRemove);
      this.cy.on("pan zoom", this.handleViewport);
      this.cy.on("position bounds", "node", this.handleNodePosition);
      this.cy.on("select unselect grab free", "node", this.handleNodeState);
    }
    addNode(node) {
      const data = node.data();
      const element = data.dom;
      if (!element) {
        return;
      }
      const nodeId = node.id();
      const shouldAppend = data.skipNodeAppend !== true && data.skip_node_append !== true;
      if (shouldAppend && element.parentNode !== this.container) {
        this.container.appendChild(element);
      }
      element.__cy_id = nodeId;
      this.nodeElements.set(nodeId, element);
      this.resizeObserver.observe(element);
      this.syncNodeSize(element);
      this.syncNodePosition(node);
      this.syncNodeState(node);
    }
    removeNode(node) {
      const element = this.nodeElements.get(node.id());
      if (!element) {
        return;
      }
      this.resizeObserver.unobserve(element);
      delete element.__cy_id;
      this.nodeElements.delete(node.id());
    }
    syncViewport() {
      const pan = this.cy.pan();
      const zoom = this.cy.zoom();
      const transform = `translate(${String(pan.x)}px, ${String(
        pan.y
      )}px) scale(${String(zoom)})`;
      setMsTransform(this.container, transform);
      this.container.style.transform = transform;
    }
    syncNodeSize(element) {
      if (!element.__cy_id) {
        return;
      }
      const node = this.cy.getElementById(element.__cy_id);
      if (node.empty()) {
        return;
      }
      node.style({
        height: element.offsetHeight,
        shape: "rectangle",
        width: element.offsetWidth
      });
    }
    syncNodePosition(node) {
      const element = this.nodeElements.get(node.id());
      if (!element) {
        return;
      }
      const position = node.position();
      const transform = `translate(-50%, -50%) translate(${position.x.toFixed(
        2
      )}px, ${position.y.toFixed(2)}px)`;
      element.style.webkitTransform = transform;
      setMsTransform(element, transform);
      element.style.transform = transform;
      element.style.display = "inline";
      element.style.position = "absolute";
    }
    syncNodeState(node) {
      const element = this.nodeElements.get(node.id());
      if (!element) {
        return;
      }
      const isSelected = node.selected();
      const isActive = isSelected || node.grabbed();
      element.classList.toggle(SELECTED_CLASS_NAME, isSelected);
      element.style.zIndex = isActive ? ACTIVE_Z_INDEX : DEFAULT_Z_INDEX;
    }
  };
  function register(cytoscapeInstance) {
    if (!cytoscapeInstance) {
      return;
    }
    cytoscapeInstance(
      "core",
      "domNode",
      function domNode(options) {
        return new DomNodeRenderer(this, options);
      }
    );
  }
  function resolveDomContainer(cy, options) {
    var _a;
    const providedContainer = (_a = options.domContainer) != null ? _a : options.dom_container;
    if (providedContainer) {
      return providedContainer;
    }
    const cyContainer = cy.container();
    const canvas = cyContainer == null ? void 0 : cyContainer.querySelector("canvas");
    if (!(canvas == null ? void 0 : canvas.parentNode)) {
      throw new Error(
        "cytoscape-dom-node requires a Cytoscape container with a canvas, or a domContainer option."
      );
    }
    const container = document.createElement("div");
    container.style.position = "absolute";
    container.style.transformOrigin = "0 0";
    container.style.zIndex = DEFAULT_Z_INDEX;
    canvas.parentNode.appendChild(container);
    return container;
  }
  function resolveResizeObserver(options) {
    var _a;
    const ResizeObserverClass = (_a = options.resizeObserver) != null ? _a : globalThis.ResizeObserver;
    if (!ResizeObserverClass) {
      throw new Error(
        "cytoscape-dom-node requires ResizeObserver. Provide a polyfill or pass resizeObserver."
      );
    }
    return ResizeObserverClass;
  }
  function setMsTransform(element, transform) {
    element.style.msTransform = transform;
  }
  var globalCytoscape = globalThis;
  if (globalCytoscape.cytoscape) {
    register(globalCytoscape.cytoscape);
  }
  return __toCommonJS(index_exports);
})();
//# sourceMappingURL=index.global.js.map