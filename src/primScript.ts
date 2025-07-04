import { Topology,TopologyEdge } from "./topology";
import { drawTopology, getCurrentTopology, getDrawnNodes, setCanvas } from "./topologyDrawer";

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

function primAlgorithm(topology: Topology, startId: string): TopologyEdge[] {
  const adj = buildAdjacencyList(topology);
  const mst: TopologyEdge[] = [];
  const visited = new Set<string>();
  visited.add(startId);
  
  let candidateEdges: { from: string; to: string; weight: number }[] = [
    ...(adj.get(startId) || []).map(e => ({ from: startId, to: e.to, weight: e.weight }))
  ];
  
  while (visited.size < topology.nodes.length && candidateEdges.length > 0) {
    candidateEdges.sort((a, b) => a.weight - b.weight);
    const edge = candidateEdges.shift()!;
    if (visited.has(edge.to)) continue;
    mst.push(edge);
    visited.add(edge.to);
    (adj.get(edge.to) || []).forEach(nextEdge => {
      if (!visited.has(nextEdge.to)) {
        candidateEdges.push({ from: edge.to, to: nextEdge.to, weight: nextEdge.weight });
      }
    });
  }
  return mst;
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
    const algorithmEdges = primAlgorithm(topology, startId);
    drawTopology(topology, algorithmEdges);
  });
});
