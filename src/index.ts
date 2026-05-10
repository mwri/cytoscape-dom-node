/**
 * Index.
 *
 * @packageDocumentation
 */

import type cytoscape from "cytoscape";

const DEFAULT_Z_INDEX = "10";
const ACTIVE_Z_INDEX = "11";
const SELECTED_CLASS_NAME = "selected";
const DEFAULT_INTERACTIVE_SELECTOR =
  "input, button, select, textarea, a[href], [contenteditable]:not([contenteditable='false']), [data-cy-dom-node-interactive]";
const DEFAULT_INTERACTIVE_EVENTS = ["pointerdown", "mousedown", "touchstart"] as const;

type CytoscapeRegistry = typeof cytoscape;

/**
 * Constructor shape for ResizeObserver implementations or polyfills.
 */
export type ResizeObserverConstructor = new (
  callback: ResizeObserverCallback,
) => ResizeObserver;

type DomNodeElement = HTMLElement & {
  __cy_id?: string;
};

interface InteractiveElementBinding {
  element: HTMLElement;
  previousPointerEvents: string;
}

interface DomNodeData {
  dom?: HTMLElement;
  skipNodeAppend?: boolean;
  skip_node_append?: boolean;
}

/**
 * Options for {@link DomNodeRenderer}.
 */
export interface DomNodeOptions {
  /**
   * Container that receives node DOM elements. When omitted, the extension
   * creates an absolutely positioned overlay next to Cytoscape's canvas.
   */
  domContainer?: HTMLElement;

  /**
   * @deprecated Use `domContainer`.
   */
  dom_container?: HTMLElement;

  /**
   * ResizeObserver implementation. This is mainly useful for tests or
   * browser environments that provide a polyfill.
   */
  resizeObserver?: ResizeObserverConstructor;

  /**
   * Selector for child controls that should receive native DOM interaction
   * instead of starting Cytoscape gestures. Set to `false` to disable this
   * automatic event isolation.
   */
  interactiveSelector?: string | false;

  /**
   * Event names stopped on interactive child controls during the capture phase.
   */
  interactiveEvents?: readonly string[];
}

declare global {
  namespace cytoscape {
    interface Core {
      /**
       * Enable DOM-backed Cytoscape nodes for this core instance.
       */
      domNode(options?: DomNodeOptions): DomNodeRenderer;
    }
  }
}

declare module "cytoscape" {
  namespace cytoscape {
    interface Core {
      /**
       * Enable DOM-backed Cytoscape nodes for this core instance.
       */
      domNode(options?: DomNodeOptions): DomNodeRenderer;
    }
  }
}

/**
 * Keeps Cytoscape node positions, dimensions, and interaction state mirrored
 * onto caller-supplied DOM elements.
 */
export class DomNodeRenderer {
  private readonly cy: cytoscape.Core;
  private readonly nodeElements = new Map<string, DomNodeElement>();
  private readonly appendedNodeIds = new Set<string>();
  private readonly interactiveElementBindings = new Map<
    string,
    InteractiveElementBinding[]
  >();
  private readonly interactiveEvents: readonly string[];
  private readonly interactiveSelector: string | false;
  private readonly resizeObserver: ResizeObserver;
  private readonly container: HTMLElement;

  private readonly handleNodeAdd = (event: cytoscape.EventObject): void => {
    this.addNode(event.target as cytoscape.NodeSingular);
  };

  private readonly handleNodeRemove = (event: cytoscape.EventObject): void => {
    this.removeNode(event.target as cytoscape.NodeSingular);
  };

  private readonly handleNodePosition = (event: cytoscape.EventObject): void => {
    this.syncNodePosition(event.target as cytoscape.NodeSingular);
  };

  private readonly handleNodeState = (event: cytoscape.EventObject): void => {
    this.syncNodeState(event.target as cytoscape.NodeSingular);
  };

  private readonly handleViewport = (): void => {
    this.syncViewport();
  };

  private readonly stopInteractiveEvent = (event: Event): void => {
    event.stopPropagation();
  };

  public constructor(cy: cytoscape.Core, options: DomNodeOptions = {}) {
    this.cy = cy;
    this.container = resolveDomContainer(cy, options);
    this.interactiveEvents = options.interactiveEvents ?? DEFAULT_INTERACTIVE_EVENTS;
    this.interactiveSelector =
      options.interactiveSelector ?? DEFAULT_INTERACTIVE_SELECTOR;
    this.resizeObserver = new (resolveResizeObserver(options))((entries) => {
      for (const entry of entries) {
        this.syncNodeSize(entry.target as DomNodeElement);
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
  public nodeDom(id: string): HTMLElement | undefined {
    return this.nodeElements.get(id);
  }

  /**
   * @deprecated Use {@link nodeDom}.
   */
  public node_dom(id: string): HTMLElement | undefined {
    return this.nodeDom(id);
  }

  /**
   * Remove event handlers and disconnect resize observation.
   */
  public destroy(): void {
    this.cy.off("add", "node", this.handleNodeAdd);
    this.cy.off("remove", "node", this.handleNodeRemove);
    this.cy.off("pan zoom", this.handleViewport);
    this.cy.off("position bounds", "node", this.handleNodePosition);
    this.cy.off("select unselect grab free", "node", this.handleNodeState);
    this.resizeObserver.disconnect();
    this.nodeElements.clear();
    this.appendedNodeIds.clear();
    this.clearInteractiveElements();
  }

  private bindEvents(): void {
    this.cy.on("add", "node", this.handleNodeAdd);
    this.cy.on("remove", "node", this.handleNodeRemove);
    this.cy.on("pan zoom", this.handleViewport);
    this.cy.on("position bounds", "node", this.handleNodePosition);
    this.cy.on("select unselect grab free", "node", this.handleNodeState);
  }

  private addNode(node: cytoscape.NodeSingular): void {
    const data = node.data() as DomNodeData;
    const element = data.dom as DomNodeElement | undefined;

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
    if (shouldAppend) {
      this.appendedNodeIds.add(nodeId);
    } else {
      this.appendedNodeIds.delete(nodeId);
    }
    this.bindInteractiveElements(nodeId, element);
    this.resizeObserver.observe(element);

    this.syncNodeSize(element);
    this.syncNodePosition(node);
    this.syncNodeState(node);
  }

  private removeNode(node: cytoscape.NodeSingular): void {
    const nodeId = node.id();
    const element = this.nodeElements.get(nodeId);

    if (!element) {
      return;
    }

    this.resizeObserver.unobserve(element);
    delete element.__cy_id;
    this.nodeElements.delete(nodeId);
    this.clearInteractiveElements(nodeId);

    if (this.appendedNodeIds.delete(nodeId)) {
      element.parentNode?.removeChild(element);
    }
  }

  private syncViewport(): void {
    const pan = this.cy.pan();
    const zoom = this.cy.zoom();
    const transform = `translate(${String(pan.x)}px, ${String(
      pan.y,
    )}px) scale(${String(zoom)})`;

    setMsTransform(this.container, transform);
    this.container.style.transform = transform;
  }

  private syncNodeSize(element: DomNodeElement): void {
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
      width: element.offsetWidth,
    });
  }

  private syncNodePosition(node: cytoscape.NodeSingular): void {
    const element = this.nodeElements.get(node.id());

    if (!element) {
      return;
    }

    const position = node.position();
    const transform = `translate(-50%, -50%) translate(${position.x.toFixed(
      2,
    )}px, ${position.y.toFixed(2)}px)`;

    element.style.webkitTransform = transform;
    setMsTransform(element, transform);
    element.style.transform = transform;
    element.style.display = "inline";
    element.style.position = "absolute";
  }

  private syncNodeState(node: cytoscape.NodeSingular): void {
    const element = this.nodeElements.get(node.id());

    if (!element) {
      return;
    }

    const isSelected = node.selected();
    const isActive = isSelected || node.grabbed();

    element.classList.toggle(SELECTED_CLASS_NAME, isSelected);
    element.style.zIndex = isActive ? ACTIVE_Z_INDEX : DEFAULT_Z_INDEX;
  }

  private bindInteractiveElements(nodeId: string, root: DomNodeElement): void {
    this.clearInteractiveElements(nodeId);

    if (!this.interactiveSelector) {
      return;
    }

    const elements = root.querySelectorAll<HTMLElement>(this.interactiveSelector);
    const bindings: InteractiveElementBinding[] = [];

    for (const element of elements) {
      bindings.push({
        element,
        previousPointerEvents: element.style.pointerEvents,
      });
      element.style.pointerEvents = "auto";

      for (const eventName of this.interactiveEvents) {
        element.addEventListener(eventName, this.stopInteractiveEvent, true);
      }
    }

    if (bindings.length > 0) {
      this.interactiveElementBindings.set(nodeId, bindings);
    }
  }

  private clearInteractiveElements(nodeId?: string): void {
    if (nodeId) {
      this.clearInteractiveElementBindings(nodeId);
      return;
    }

    for (const id of this.interactiveElementBindings.keys()) {
      this.clearInteractiveElementBindings(id);
    }
  }

  private clearInteractiveElementBindings(nodeId: string): void {
    const bindings = this.interactiveElementBindings.get(nodeId);

    if (!bindings) {
      return;
    }

    for (const binding of bindings) {
      binding.element.style.pointerEvents = binding.previousPointerEvents;

      for (const eventName of this.interactiveEvents) {
        binding.element.removeEventListener(eventName, this.stopInteractiveEvent, true);
      }
    }

    this.interactiveElementBindings.delete(nodeId);
  }
}

/**
 * Backwards-compatible class export for consumers that referenced the previous
 * implementation name from bundled output.
 */
export { DomNodeRenderer as CytoscapeDomNode };

/**
 * Register the extension with Cytoscape.
 */
export default function register(cytoscapeInstance?: CytoscapeRegistry): void {
  if (!cytoscapeInstance) {
    return;
  }

  cytoscapeInstance(
    "core",
    "domNode",
    function domNode(this: cytoscape.Core, options?: DomNodeOptions): DomNodeRenderer {
      return new DomNodeRenderer(this, options);
    },
  );
}

function resolveDomContainer(cy: cytoscape.Core, options: DomNodeOptions): HTMLElement {
  const providedContainer = options.domContainer ?? options.dom_container;

  if (providedContainer) {
    return providedContainer;
  }

  const cyContainer = cy.container();
  const canvas = cyContainer?.querySelector("canvas");

  if (!canvas?.parentNode) {
    throw new Error(
      "cytoscape-dom-node requires a Cytoscape container with a canvas, or a domContainer option.",
    );
  }

  const container = document.createElement("div");
  container.style.position = "absolute";
  container.style.transformOrigin = "0 0";
  container.style.zIndex = DEFAULT_Z_INDEX;

  canvas.parentNode.appendChild(container);

  return container;
}

function resolveResizeObserver(options: DomNodeOptions): ResizeObserverConstructor {
  const ResizeObserverClass = options.resizeObserver ?? globalThis.ResizeObserver;

  if (!ResizeObserverClass) {
    throw new Error(
      "cytoscape-dom-node requires ResizeObserver. Provide a polyfill or pass resizeObserver.",
    );
  }

  return ResizeObserverClass;
}

function setMsTransform(element: HTMLElement, transform: string): void {
  (element.style as CSSStyleDeclaration & { msTransform?: string }).msTransform =
    transform;
}

const globalCytoscape = globalThis as typeof globalThis & {
  cytoscape?: CytoscapeRegistry;
};

/* v8 ignore next 3 */
if (globalCytoscape.cytoscape) {
  register(globalCytoscape.cytoscape);
}
