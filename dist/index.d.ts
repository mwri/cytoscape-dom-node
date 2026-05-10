import cytoscape from 'cytoscape';

/**
 * Index.
 *
 * @packageDocumentation
 */

type CytoscapeRegistry = typeof cytoscape;
/**
 * Constructor shape for ResizeObserver implementations or polyfills.
 */
type ResizeObserverConstructor = new (callback: ResizeObserverCallback) => ResizeObserver;
/**
 * Options for {@link DomNodeRenderer}.
 */
interface DomNodeOptions {
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
declare class DomNodeRenderer {
    private readonly cy;
    private readonly nodeElements;
    private readonly appendedNodeIds;
    private readonly interactiveElementBindings;
    private readonly interactiveEvents;
    private readonly interactiveSelector;
    private readonly resizeObserver;
    private readonly container;
    private readonly handleNodeAdd;
    private readonly handleNodeRemove;
    private readonly handleNodePosition;
    private readonly handleNodeState;
    private readonly handleViewport;
    private readonly stopInteractiveEvent;
    constructor(cy: cytoscape.Core, options?: DomNodeOptions);
    /**
     * Return the DOM element that backs a Cytoscape node id.
     */
    nodeDom(id: string): HTMLElement | undefined;
    /**
     * @deprecated Use {@link nodeDom}.
     */
    node_dom(id: string): HTMLElement | undefined;
    /**
     * Remove event handlers and disconnect resize observation.
     */
    destroy(): void;
    private bindEvents;
    private addNode;
    private removeNode;
    private syncViewport;
    private syncNodeSize;
    private syncNodePosition;
    private syncNodeState;
    private bindInteractiveElements;
    private clearInteractiveElements;
    private clearInteractiveElementBindings;
}

/**
 * Register the extension with Cytoscape.
 */
declare function register(cytoscapeInstance?: CytoscapeRegistry): void;

export { DomNodeRenderer as CytoscapeDomNode, type DomNodeOptions, DomNodeRenderer, type ResizeObserverConstructor, register as default };
