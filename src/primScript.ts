import { Topology,TopologyEdge } from "./topology";
import { drawTopology, getCurrentTopology, getDrawnNodes, setCanvas } from "./topologyDrawer";

interface PrimStep {
  iteration: number;
  currentEdge: { from: string; to: string; weight: number } | null;
  mst: TopologyEdge[];
  visited: Set<string>;
  candidateEdges: { from: string; to: string; weight: number }[];
}

const canvas = document.getElementById('graphCanvas') as HTMLCanvasElement;
setCanvas(canvas);

function buildAdjacencyList(topology: Topology): Map<string, { to: string; weight: number }[]> {
  const adj = new Map<string, { to: string; weight: number }[]>();
  topology.nodes.forEach(node => adj.set(node.id, []));
  topology.edges.forEach(edge => {
    adj.get(edge.from)?.push({ to: edge.to, weight: edge.weight });
    adj.get(edge.to)?.push({ to: edge.from, weight: edge.weight });
  });
  return adj;
}

function primAlgorithm(topology: Topology, startId: string): { mstEdges: TopologyEdge[], steps: PrimStep[] } {
  const adj = buildAdjacencyList(topology);
  const mst: TopologyEdge[] = [];
  const visited = new Set<string>();
  const steps: PrimStep[] = [];
  let iteration = 0;
  
  visited.add(startId);
  
  let candidateEdges: { from: string; to: string; weight: number }[] = [
    ...(adj.get(startId) || []).map(e => ({ from: startId, to: e.to, weight: e.weight }))
  ];
  
  // Initial step
  steps.push({
    iteration: iteration++,
    currentEdge: null,
    mst: [...mst],
    visited: new Set(visited),
    candidateEdges: [...candidateEdges]
  });
  
  while (visited.size < topology.nodes.length && candidateEdges.length > 0) {
    candidateEdges.sort((a, b) => a.weight - b.weight);
    const edge = candidateEdges.shift()!;
    
    if (visited.has(edge.to)) continue;
    
    mst.push(edge);
    visited.add(edge.to);
    
    // Save step after adding edge
    steps.push({
      iteration: iteration++,
      currentEdge: edge,
      mst: [...mst],
      visited: new Set(visited),
      candidateEdges: [...candidateEdges]
    });
    
    (adj.get(edge.to) || []).forEach(nextEdge => {
      if (!visited.has(nextEdge.to)) {
        candidateEdges.push({ from: edge.to, to: nextEdge.to, weight: nextEdge.weight });
      }
    });
  }
  
  return { mstEdges: mst, steps };
}

function displayPrimSteps(steps: PrimStep[]) {
  const tableElement = document.getElementById('primSteps');
  if (tableElement) {
    tableElement.innerHTML = `
      <h3>Pasos del Algoritmo de Prim</h3>
      <table class="distance-table">
        <thead>
          <tr>
            <th>Iteración</th>
            <th>Arista Añadida</th>
            <th>Nodos Visitados</th>
            <th>Aristas Candidatas</th>
            <th>MST Actual</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    `;
    const tbody = tableElement.querySelector("tbody");
    steps.forEach((step) => {
      const tr = document.createElement("tr");
      const visitedNodes = Array.from(step.visited).join(", ");
      const candidateEdgesStr = step.candidateEdges
        .map(e => `${e.from}-${e.to}(${e.weight})`)
        .join(", ");
      const mstEdgesStr = step.mst
        .map(e => `${e.from}-${e.to}(${e.weight})`)
        .join(", ");
      const currentEdgeStr = step.currentEdge 
        ? `${step.currentEdge.from}-${step.currentEdge.to}(${step.currentEdge.weight})`
        : "Inicio";
      
      tr.innerHTML = `
        <td>${step.iteration}</td>
        <td>${currentEdgeStr}</td>
        <td>{${visitedNodes}}</td>
        <td>[${candidateEdgesStr}]</td>
        <td>${mstEdgesStr}</td>
      `;
      if (tbody) {
        tbody.appendChild(tr);
      }
    });
  }
}

window.addEventListener('load', () => {
  if (!canvas) {
    console.error("Canvas element not found");
    return;
  }  
  const runAlgoBtn = document.getElementById('runAlgorithmBtn') as HTMLButtonElement;
  runAlgoBtn?.addEventListener('click', () => {
    const startInputRaw = (document.getElementById('startNodeInput') as HTMLInputElement)?.value;
    const startInput = startInputRaw.trim();
    let startId: string;
    if (startInput === "") {
      startId = getDrawnNodes()[0]?.id
    } else {
      startId = startInput
    }
    const topology = getCurrentTopology();
    const result = primAlgorithm(topology, startId);
    drawTopology(topology, result.mstEdges);
    displayPrimSteps(result.steps);
  });
});
