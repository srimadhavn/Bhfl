function isValidEdge(entry) {
  return /^[A-Z]->[A-Z]$/.test(entry);
}

function buildNestedTree(root, childrenMap) {
  const children = [...(childrenMap.get(root) || [])].sort();
  const result = {};

  for (const child of children) {
    result[child] = buildNestedTree(child, childrenMap);
  }

  return result;
}

function computeDepth(root, childrenMap) {
  const children = childrenMap.get(root) || new Set();

  if (children.size === 0) {
    return 1;
  }

  let maxChildDepth = 0;
  for (const child of children) {
    maxChildDepth = Math.max(maxChildDepth, computeDepth(child, childrenMap));
  }

  return maxChildDepth + 1;
}

function hasDirectedCycle(nodes, childrenMap) {
  const state = new Map();

  const visit = (node) => {
    const nodeState = state.get(node) || 0;
    if (nodeState === 1) {
      return true;
    }
    if (nodeState === 2) {
      return false;
    }

    state.set(node, 1);
    for (const child of childrenMap.get(node) || []) {
      if (visit(child)) {
        return true;
      }
    }
    state.set(node, 2);
    return false;
  };

  for (const node of nodes) {
    if ((state.get(node) || 0) === 0 && visit(node)) {
      return true;
    }
  }

  return false;
}

function getConnectedComponents(nodesInOrder, undirectedAdj) {
  const visited = new Set();
  const components = [];

  for (const startNode of nodesInOrder) {
    if (visited.has(startNode)) {
      continue;
    }

    const stack = [startNode];
    const component = [];
    visited.add(startNode);

    while (stack.length > 0) {
      const node = stack.pop();
      component.push(node);

      for (const neighbor of undirectedAdj.get(node) || []) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          stack.push(neighbor);
        }
      }
    }

    components.push(component);
  }

  return components;
}

function processHierarchyData(data) {
  const invalidEntries = [];
  const duplicateEdges = [];
  const duplicateRecorded = new Set();
  const seenValidEdge = new Set();
  const uniqueEdges = [];

  for (const rawEntry of data) {
    const entry = typeof rawEntry === "string" ? rawEntry.trim() : String(rawEntry);

    if (!isValidEdge(entry)) {
      invalidEntries.push(entry);
      continue;
    }

    const [parent, child] = entry.split("->");
    if (parent === child) {
      invalidEntries.push(entry);
      continue;
    }

    if (seenValidEdge.has(entry)) {
      if (!duplicateRecorded.has(entry)) {
        duplicateEdges.push(entry);
        duplicateRecorded.add(entry);
      }
      continue;
    }

    seenValidEdge.add(entry);
    uniqueEdges.push({ entry, parent, child });
  }

  const childToParent = new Map();
  const acceptedEdges = [];

  for (const edge of uniqueEdges) {
    if (!childToParent.has(edge.child)) {
      childToParent.set(edge.child, edge.parent);
      acceptedEdges.push(edge);
    }
  }

  const childrenMap = new Map();
  const indegree = new Map();
  const undirectedAdj = new Map();
  const nodeSet = new Set();
  const nodesInOrder = [];

  const addNode = (node) => {
    if (!nodeSet.has(node)) {
      nodeSet.add(node);
      nodesInOrder.push(node);
      childrenMap.set(node, new Set());
      indegree.set(node, 0);
      undirectedAdj.set(node, new Set());
    }
  };

  for (const { parent, child } of acceptedEdges) {
    addNode(parent);
    addNode(child);

    childrenMap.get(parent).add(child);
    indegree.set(child, (indegree.get(child) || 0) + 1);
    undirectedAdj.get(parent).add(child);
    undirectedAdj.get(child).add(parent);
  }

  const components = getConnectedComponents(nodesInOrder, undirectedAdj);
  const hierarchies = [];

  let totalTrees = 0;
  let totalCycles = 0;
  let largestTreeRoot = "";
  let largestDepth = 0;

  for (const componentNodes of components) {
    const nodeSetInComponent = new Set(componentNodes);
    const roots = componentNodes
      .filter((node) => (indegree.get(node) || 0) === 0)
      .sort();

    const root = roots.length > 0 ? roots[0] : [...nodeSetInComponent].sort()[0];
    const cyclic = hasDirectedCycle(componentNodes, childrenMap);

    if (cyclic) {
      totalCycles += 1;
      hierarchies.push({
        root,
        tree: {},
        has_cycle: true,
      });
      continue;
    }

    const tree = {
      [root]: buildNestedTree(root, childrenMap),
    };
    const depth = computeDepth(root, childrenMap);

    totalTrees += 1;
    if (
      depth > largestDepth ||
      (depth === largestDepth && (largestTreeRoot === "" || root < largestTreeRoot))
    ) {
      largestDepth = depth;
      largestTreeRoot = root;
    }

    hierarchies.push({
      root,
      tree,
      depth,
    });
  }

  return {
    hierarchies,
    invalidEntries,
    duplicateEdges,
    summary: {
      total_trees: totalTrees,
      total_cycles: totalCycles,
      largest_tree_root: largestTreeRoot,
    },
  };
}

module.exports = {
  processHierarchyData,
};