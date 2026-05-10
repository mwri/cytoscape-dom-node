import cytoscape from "cytoscape";
import register, {
  CytoscapeDomNode,
  DomNodeRenderer,
  type DomNodeOptions,
} from "../src/index.ts";

class TestResizeObserver implements ResizeObserver {
  public static instances: TestResizeObserver[] = [];

  public readonly observedElements = new Set<Element>();

  public constructor(private readonly callback: ResizeObserverCallback) {
    TestResizeObserver.instances.push(this);
  }

  public observe = (target: Element): void => {
    this.observedElements.add(target);
  };

  public unobserve = (target: Element): void => {
    this.observedElements.delete(target);
  };

  public disconnect = (): void => {
    this.observedElements.clear();
  };

  public trigger(target: Element): void {
    this.callback(
      [
        {
          target,
        } as ResizeObserverEntry,
      ],
      this,
    );
  }
}

function setElementSize(
  element: HTMLElement,
  size: { height: number; width: number },
): void {
  Object.defineProperties(element, {
    offsetHeight: {
      configurable: true,
      value: size.height,
    },
    offsetWidth: {
      configurable: true,
      value: size.width,
    },
  });
}

function createCore(elements: cytoscape.ElementDefinition[]): cytoscape.Core {
  return cytoscape({
    elements,
    headless: true,
    styleEnabled: true,
    style: [
      {
        selector: "node",
        style: {
          "background-opacity": 0,
        },
      },
    ],
  });
}

function createRenderer(
  cy: cytoscape.Core,
  options: Omit<DomNodeOptions, "resizeObserver"> = {},
): DomNodeRenderer {
  return cy.domNode({
    ...options,
    resizeObserver: TestResizeObserver,
  });
}

function createFakeCore(container?: HTMLElement): cytoscape.Core {
  return {
    container: () => container,
    nodes: () => ({
      forEach: () => undefined,
    }),
    off: vi.fn(),
    on: vi.fn(),
    pan: () => ({ x: 0, y: 0 }),
    zoom: () => 1,
  } as unknown as cytoscape.Core;
}

beforeAll(() => {
  cytoscape.use(register);
});

beforeEach(() => {
  TestResizeObserver.instances = [];
  document.body.innerHTML = "";
});

afterEach(() => {
  document.body.innerHTML = "";
});

it("registers a domNode core extension and appends existing DOM nodes", () => {
  const domContainer = document.createElement("div");
  const dom = document.createElement("div");
  setElementSize(dom, { height: 25, width: 75 });

  const cy = createCore([
    {
      data: {
        dom,
        id: "a",
      },
      position: {
        x: 12,
        y: 34,
      },
    },
  ]);
  cy.getElementById("a").position({ x: 12, y: 34 });

  const renderer = createRenderer(cy, { domContainer });

  expect(renderer).toBeInstanceOf(DomNodeRenderer);
  expect(CytoscapeDomNode).toBe(DomNodeRenderer);
  expect(renderer.nodeDom("a")).toBe(dom);
  expect(renderer.node_dom("a")).toBe(dom);
  expect(domContainer.children).toHaveLength(1);
  expect(domContainer.firstElementChild).toBe(dom);
  expect((dom as HTMLElement & { __cy_id?: string }).__cy_id).toBe("a");
  expect(dom.style.position).toBe("absolute");
  expect(dom.style.display).toBe("inline");
  expect(dom.style.transform).toBe("translate(-50%, -50%) translate(12.00px, 34.00px)");
  expect(dom.style.zIndex).toBe("10");
  expect(cy.getElementById("a").style("width")).toBe("75px");
  expect(cy.getElementById("a").style("height")).toBe("25px");
});

it("ignores nodes without DOM data", () => {
  const domContainer = document.createElement("div");
  const cy = createCore([
    {
      data: {
        id: "a",
      },
    },
  ]);

  const renderer = createRenderer(cy, { domContainer });

  expect(renderer.nodeDom("a")).toBeUndefined();
  expect(domContainer.children).toHaveLength(0);
});

it("supports the legacy dom_container and skip_node_append option names", () => {
  const domContainer = document.createElement("div");
  const existingParent = document.createElement("div");
  const dom = document.createElement("div");
  existingParent.appendChild(dom);

  const cy = createCore([
    {
      data: {
        dom,
        id: "a",
        skip_node_append: true,
      },
    },
  ]);

  createRenderer(cy, { dom_container: domContainer });

  expect(dom.parentElement).toBe(existingParent);
  expect(domContainer.children).toHaveLength(0);
});

it("supports the camelCase skipNodeAppend option on node data", () => {
  const domContainer = document.createElement("div");
  const existingParent = document.createElement("div");
  const dom = document.createElement("div");
  existingParent.appendChild(dom);

  const cy = createCore([
    {
      data: {
        dom,
        id: "a",
        skipNodeAppend: true,
      },
    },
  ]);

  createRenderer(cy, { domContainer });

  expect(dom.parentElement).toBe(existingParent);
  expect(domContainer.children).toHaveLength(0);
});

it("mirrors viewport, position, and resize changes", () => {
  const domContainer = document.createElement("div");
  const dom = document.createElement("div");
  setElementSize(dom, { height: 10, width: 20 });

  const cy = createCore([
    {
      data: {
        dom,
        id: "a",
      },
      position: {
        x: 1,
        y: 2,
      },
    },
  ]);

  createRenderer(cy, { domContainer });

  cy.pan({ x: 5, y: 6 });
  cy.zoom(2);
  expect(domContainer.style.transform).toBe("translate(5px, 6px) scale(2)");

  cy.getElementById("a").position({ x: 30, y: 40 });
  expect(dom.style.transform).toBe("translate(-50%, -50%) translate(30.00px, 40.00px)");

  setElementSize(dom, { height: 15, width: 45 });
  TestResizeObserver.instances[0]?.trigger(dom);

  expect(cy.getElementById("a").style("width")).toBe("45px");
  expect(cy.getElementById("a").style("height")).toBe("15px");
});

it("ignores resize entries that no longer map to a live node", () => {
  const domContainer = document.createElement("div");
  const dom = document.createElement("div") as HTMLElement & { __cy_id?: string };
  const cy = createCore([
    {
      data: {
        dom,
        id: "a",
      },
    },
  ]);

  createRenderer(cy, { domContainer });
  const observer = TestResizeObserver.instances[0];

  delete dom.__cy_id;
  expect(() => observer?.trigger(dom)).not.toThrow();

  dom.__cy_id = "missing";
  expect(() => observer?.trigger(dom)).not.toThrow();
});

it("syncs selected state that already exists before renderer setup", () => {
  const domContainer = document.createElement("div");
  const dom = document.createElement("div");
  const cy = createCore([
    {
      data: {
        dom,
        id: "a",
      },
      selected: true,
    },
  ]);

  createRenderer(cy, { domContainer });

  expect(dom.classList.contains("selected")).toBe(true);
  expect(dom.style.zIndex).toBe("11");

  cy.getElementById("a").emit("free");

  expect(dom.classList.contains("selected")).toBe(true);
  expect(dom.style.zIndex).toBe("11");
});

it("keeps z-index high while selected and lowers it after unselect", () => {
  const domContainer = document.createElement("div");
  const dom = document.createElement("div");
  const cy = createCore([
    {
      data: {
        dom,
        id: "a",
      },
    },
  ]);

  createRenderer(cy, { domContainer });
  const node = cy.getElementById("a");

  node.select();
  expect(dom.classList.contains("selected")).toBe(true);
  expect(dom.style.zIndex).toBe("11");

  node.unselect();
  expect(dom.classList.contains("selected")).toBe(false);
  expect(dom.style.zIndex).toBe("10");
});

it("disconnects event handlers and resize observation on destroy", () => {
  const domContainer = document.createElement("div");
  const dom = document.createElement("div");
  const cy = createCore([
    {
      data: {
        dom,
        id: "a",
      },
    },
  ]);

  const renderer = createRenderer(cy, { domContainer });
  const observer = TestResizeObserver.instances[0];

  expect(observer?.observedElements.has(dom)).toBe(true);

  renderer.destroy();
  cy.getElementById("a").select();

  expect(observer?.observedElements.size).toBe(0);
  expect(dom.classList.contains("selected")).toBe(false);
});

it("unobserves DOM elements when Cytoscape nodes are removed", () => {
  const domContainer = document.createElement("div");
  const dom = document.createElement("div") as HTMLElement & { __cy_id?: string };
  const cy = createCore([
    {
      data: {
        dom,
        id: "a",
      },
    },
  ]);

  const renderer = createRenderer(cy, { domContainer });
  const observer = TestResizeObserver.instances[0];

  cy.getElementById("a").remove();

  expect(renderer.nodeDom("a")).toBeUndefined();
  expect(observer?.observedElements.has(dom)).toBe(false);
  expect(dom.__cy_id).toBeUndefined();
});

it("creates a DOM overlay next to Cytoscape canvas when no container is passed", () => {
  const cyContainer = document.createElement("div");
  const canvas = document.createElement("canvas");
  cyContainer.appendChild(canvas);

  const renderer = new DomNodeRenderer(createFakeCore(cyContainer), {
    resizeObserver: TestResizeObserver,
  });
  const overlay = cyContainer.lastElementChild as HTMLElement;

  expect(renderer).toBeInstanceOf(DomNodeRenderer);
  expect(overlay).not.toBe(canvas);
  expect(overlay.style.position).toBe("absolute");
  expect(overlay.style.transformOrigin).toBe("0 0");
  expect(overlay.style.zIndex).toBe("10");
});

it("throws clear setup errors for missing container or ResizeObserver", () => {
  expect(() => {
    new DomNodeRenderer(createFakeCore(), {
      resizeObserver: TestResizeObserver,
    });
  }).toThrow("requires a Cytoscape container");

  expect(() => {
    new DomNodeRenderer(createFakeCore(document.createElement("div")), {
      domContainer: document.createElement("div"),
    });
  }).toThrow("requires ResizeObserver");
});

it("keeps register tolerant of undefined Cytoscape values", () => {
  register();

  expect(typeof register).toBe("function");
});
