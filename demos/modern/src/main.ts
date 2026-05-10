import cytoscape from "cytoscape";
import cytoscapeDomNode from "cytoscape-dom-node";

type Tone = "blue" | "green" | "red" | "amber" | "violet" | "teal";

const colors: Tone[] = ["blue", "green", "red", "amber", "violet", "teal"];
const branchDistance = 200;
const branchSpawnDistance = 86;
const relaxationDuration = 400;
const relaxationIterations = 34;
const nodeSpacing = 300;
const existingNodeMaxShift = 120;
const newNodeMaxShift = 150;

cytoscape.use(cytoscapeDomNode);

const graphContainer = requiredElement("#cy") as HTMLDivElement;
const domContainer = requiredElement("#dom-layer") as HTMLDivElement;
const nodeCount = requiredElement("#node-count");
const edgeCount = requiredElement("#edge-count");
const selectedNode = requiredElement("#selected-node");
const domLookup = requiredElement("#dom-lookup");
const domCount = requiredElement("#dom-count");
const deleteNodeButton = requiredElement("#delete-node") as HTMLButtonElement;
let nextNodeIndex = 0;

const cy = cytoscape({
  container: graphContainer,
  elements: [],
  style: [
    {
      selector: "node",
      style: {
        "background-opacity": 0,
        label: "",
      },
    },
    {
      selector: "edge",
      style: {
        "curve-style": "bezier",
        "line-color": "#94a3b8",
        opacity: 0.65,
        "target-arrow-color": "#94a3b8",
        "target-arrow-shape": "triangle",
        width: 2,
      },
    },
  ],
});

const renderer = cy.domNode({
  domContainer,
});

function requiredElement(selector: string): HTMLElement {
  const element = document.querySelector<HTMLElement>(selector);

  if (!element) {
    throw new Error(`Missing required demo element: ${selector}`);
  }

  return element;
}

function createDomNode(id: string, index: number): HTMLElement {
  const element = document.createElement("article");
  const tone = colors[index % colors.length] ?? "blue";

  element.className = `dom-node tone-${tone}`;
  element.innerHTML = `
    <header>
      <strong>${id.toUpperCase()}</strong>
      <span>${index % 2 === 0 ? "Active" : "Queued"}</span>
    </header>
    <p>${String(index + 3)} linked tasks</p>
    <meter min="0" max="100" value="${String(45 + ((index * 13) % 45))}"></meter>
  `;
  element.addEventListener("click", () => {
    cy.getElementById(id).select();
  });

  return element;
}

function addNode(
  sourceId: string | null = null,
  animatePlacement = false,
): cytoscape.NodeSingular {
  const index = nextNodeIndex;
  const id = `n${String(index)}`;
  const targetPosition = nextNodePosition(sourceId, index);
  const startPosition =
    animatePlacement && sourceId
      ? branchStartPosition(sourceId, targetPosition)
      : targetPosition;

  const node = cy.add({
    data: {
      dom: createDomNode(id, index),
      id,
    },
    position: startPosition,
  }) as cytoscape.NodeSingular;
  nextNodeIndex += 1;

  if (sourceId) {
    cy.add({
      data: {
        id: `${sourceId}-${id}`,
        source: sourceId,
        target: id,
      },
    });
  }

  updateStatus();

  if (animatePlacement) {
    node.animate({
      duration: 360,
      easing: "ease-out-cubic",
      position: targetPosition,
    });
  }

  return node;
}

function runLayout(): void {
  cy.nodes().unlock();
  cy.layout({
    animate: true,
    animationDuration: 650,
    componentSpacing: 90,
    fit: true,
    name: "cose",
    nodeOverlap: 30,
    padding: 80,
    randomize: false,
  }).run();
}

function nextNodePosition(sourceId: string | null, index: number): cytoscape.Position {
  if (!sourceId) {
    return {
      x: 220,
      y: 180,
    };
  }

  const source = cy.getElementById(sourceId);
  const siblingCount = source.connectedEdges().targets().length;
  const angle = index * 0.86 + siblingCount * 0.72;
  const distance = branchDistance + (siblingCount % 3) * 26;
  const position = source.position();

  return {
    x: position.x + Math.cos(angle) * distance,
    y: position.y + Math.sin(angle) * distance,
  };
}

function runGentleRelaxation(newNode: cytoscape.NodeSingular): void {
  const newNodeId = newNode.id();
  const nodes: cytoscape.NodeSingular[] = [];
  const initialPositions = new Map<string, cytoscape.Position>();
  const relaxedPositions = new Map<string, cytoscape.Position>();

  cy.nodes().forEach((node) => {
    const position = clonePosition(node.position());

    nodes.push(node);
    initialPositions.set(node.id(), position);
    relaxedPositions.set(node.id(), clonePosition(position));
  });

  for (let iteration = 0; iteration < relaxationIterations; iteration += 1) {
    const deltas = new Map<string, cytoscape.Position>();

    for (const node of nodes) {
      deltas.set(node.id(), { x: 0, y: 0 });
    }

    applyEdgeSprings(deltas, relaxedPositions);
    applyNodeSeparation(nodes, deltas, relaxedPositions);
    applyRelaxationStep(nodes, deltas, initialPositions, relaxedPositions, newNodeId);
  }

  for (const node of nodes) {
    const targetPosition = requirePosition(relaxedPositions, node.id());

    node.stop();
    node.animate({
      duration: relaxationDuration,
      easing: "ease-out-cubic",
      position: targetPosition,
    });
  }
}

function applyEdgeSprings(
  deltas: Map<string, cytoscape.Position>,
  positions: Map<string, cytoscape.Position>,
): void {
  cy.edges().forEach((edge) => {
    const source = edge.source();
    const target = edge.target();
    const sourcePosition = requirePosition(positions, source.id());
    const targetPosition = requirePosition(positions, target.id());
    const dx = targetPosition.x - sourcePosition.x;
    const dy = targetPosition.y - sourcePosition.y;
    const distance = Math.hypot(dx, dy) || 1;
    const spring = (distance - branchDistance) * 0.018;
    const x = (dx / distance) * spring;
    const y = (dy / distance) * spring;

    addDelta(deltas, source.id(), x, y);
    addDelta(deltas, target.id(), -x, -y);
  });
}

function applyNodeSeparation(
  nodes: cytoscape.NodeSingular[],
  deltas: Map<string, cytoscape.Position>,
  positions: Map<string, cytoscape.Position>,
): void {
  for (let leftIndex = 0; leftIndex < nodes.length; leftIndex += 1) {
    const leftNode = nodes[leftIndex];

    if (!leftNode) {
      continue;
    }

    for (let rightIndex = leftIndex + 1; rightIndex < nodes.length; rightIndex += 1) {
      const rightNode = nodes[rightIndex];

      if (!rightNode) {
        continue;
      }

      const leftPosition = requirePosition(positions, leftNode.id());
      const rightPosition = requirePosition(positions, rightNode.id());
      const dx = rightPosition.x - leftPosition.x;
      const dy = rightPosition.y - leftPosition.y;
      const distance = Math.hypot(dx, dy) || 1;

      if (distance >= nodeSpacing) {
        continue;
      }

      const push = (nodeSpacing - distance) * 0.026;
      const x = (dx / distance) * push;
      const y = (dy / distance) * push;

      addDelta(deltas, leftNode.id(), -x, -y);
      addDelta(deltas, rightNode.id(), x, y);
    }
  }
}

function applyRelaxationStep(
  nodes: cytoscape.NodeSingular[],
  deltas: Map<string, cytoscape.Position>,
  initialPositions: Map<string, cytoscape.Position>,
  positions: Map<string, cytoscape.Position>,
  newNodeId: string,
): void {
  for (const node of nodes) {
    const id = node.id();
    const current = requirePosition(positions, id);
    const delta = requirePosition(deltas, id);
    const initial = requirePosition(initialPositions, id);
    const isNewNode = id === newNodeId;
    const anchorStrength = isNewNode ? 0.02 : 0.07;
    const maxShift = isNewNode ? newNodeMaxShift : existingNodeMaxShift;
    const next = {
      x: current.x + delta.x,
      y: current.y + delta.y,
    };

    next.x += (initial.x - next.x) * anchorStrength;
    next.y += (initial.y - next.y) * anchorStrength;

    positions.set(id, clampShift(initial, next, maxShift));
  }
}

function addDelta(
  deltas: Map<string, cytoscape.Position>,
  id: string,
  x: number,
  y: number,
): void {
  const delta = requirePosition(deltas, id);

  delta.x += x;
  delta.y += y;
}

function clampShift(
  initial: cytoscape.Position,
  next: cytoscape.Position,
  maxShift: number,
): cytoscape.Position {
  const dx = next.x - initial.x;
  const dy = next.y - initial.y;
  const distance = Math.hypot(dx, dy);

  if (distance <= maxShift) {
    return next;
  }

  return {
    x: initial.x + (dx / distance) * maxShift,
    y: initial.y + (dy / distance) * maxShift,
  };
}

function clonePosition(position: cytoscape.Position): cytoscape.Position {
  return {
    x: position.x,
    y: position.y,
  };
}

function requirePosition(
  positions: Map<string, cytoscape.Position>,
  id: string,
): cytoscape.Position {
  const position = positions.get(id);

  if (!position) {
    throw new Error(`Missing position for demo node: ${id}`);
  }

  return position;
}

function branchStartPosition(
  sourceId: string,
  targetPosition: cytoscape.Position,
): cytoscape.Position {
  const sourcePosition = cy.getElementById(sourceId).position();
  const dx = targetPosition.x - sourcePosition.x;
  const dy = targetPosition.y - sourcePosition.y;
  const length = Math.hypot(dx, dy) || 1;

  return {
    x: sourcePosition.x + (dx / length) * branchSpawnDistance,
    y: sourcePosition.y + (dy / length) * branchSpawnDistance,
  };
}

function selectedOrLastNodeId(): string | null {
  const selected = cy.nodes(":selected");

  if (selected.length > 0) {
    return selected[0]?.id() ?? null;
  }

  return cy.nodes().last()[0]?.id() ?? null;
}

function deleteSelectedNode(): void {
  const selected = cy.nodes(":selected")[0];

  if (!selected) {
    return;
  }

  const fallbackNode = selectFallbackNode(selected);

  selected.remove();
  fallbackNode?.select();
  cy.fit(undefined, 70);
  updateStatus();
}

function selectFallbackNode(removedNode: cytoscape.NodeSingular): cytoscape.NodeSingular | null {
  const neighborhood = removedNode.neighborhood("node");
  const sibling = neighborhood[0] ?? cy.nodes().not(removedNode)[0];

  return sibling ?? null;
}

function updateStatus(): void {
  const selected = cy.nodes(":selected")[0];
  const domElement = selected ? renderer.nodeDom(selected.id()) : undefined;

  nodeCount.textContent = String(cy.nodes().length);
  edgeCount.textContent = String(cy.edges().length);
  selectedNode.textContent = selected ? selected.id() : "None";
  domLookup.textContent = domElement ? domElement.tagName.toLowerCase() : "None";
  domCount.textContent = String(domContainer.childElementCount);
  deleteNodeButton.disabled = !selected;
}

requiredElement("#add-node").addEventListener("click", () => {
  const node = addNode(selectedOrLastNodeId(), true);

  cy.nodes().unselect();
  node.select();
  window.setTimeout(() => {
    runGentleRelaxation(node);
  }, 370);
});

requiredElement("#select-random").addEventListener("click", () => {
  const nodes = cy.nodes();
  const node = nodes[Math.floor(Math.random() * nodes.length)];

  cy.nodes().unselect();
  node?.select();
});

deleteNodeButton.addEventListener("click", deleteSelectedNode);

requiredElement("#run-layout").addEventListener("click", runLayout);

requiredElement("#fit-graph").addEventListener("click", () => {
  cy.fit(undefined, 70);
});

cy.on("select unselect add remove", updateStatus);

const initialNodeIds = ["n0", "n1", "n2", "n3", "n4", "n5"];

for (const [index, id] of initialNodeIds.entries()) {
  const parentId = index === 0 ? null : initialNodeIds[Math.max(0, index - 1)];
  const node = addNode(parentId ?? null);

  if (node.id() !== id) {
    throw new Error(`Expected demo node id ${id}, received ${node.id()}`);
  }
}

cy.getElementById("n2").select();
cy.fit(undefined, 90);
updateStatus();
