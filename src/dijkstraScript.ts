import { Topology, TopologyNode, TopologyEdge } from "./topology";
import { drawTopology, getCurrentTopology, getDrawnNodes, setCanvas } from "./topologyDrawer";

let drawnNodes: TopologyNode[] = [];
const canvas = document.getElementById('graphCanvas') as HTMLCanvasElement;
setCanvas(canvas);
// Dijkstra's algorithm to compute the shortest path from startId to finishId.
function dijkstraAlgorithm(topology: Topology, startId: number, finishId: number): TopologyEdge[] {
  // Build adjacency list
  const adj = new Map<number, { to: number; weight: number }[]>();
  topology.nodes.forEach(node => adj.set(node.id, []));
  topology.edges.forEach(edge => {
    adj.get(edge.from)?.push({ to: edge.to, weight: edge.weight });
    adj.get(edge.to)?.push({ to: edge.from, weight: edge.weight });
  });
  
  const dist = new Map<number, number>();
  const prev = new Map<number, number | null>();
  topology.nodes.forEach(node => {
    dist.set(node.id, Infinity);
    prev.set(node.id, null);
  });
  dist.set(startId, 0);
  
  const Q = new Set(topology.nodes.map(n => n.id));
  
  while (Q.size > 0) {
    // Get the node in Q with the smallest distance.
    let u: number | null = null;
    Q.forEach(id => {
      if (u === null || (dist.get(id)! < dist.get(u)!)) {
        u = id;
      }
    });
    if (u === null) break;
    Q.delete(u);
    if (u === finishId) break;
    
    const neighbors = adj.get(u) || [];
    for (const { to, weight } of neighbors) {
      if (!Q.has(to)) continue;
      const alt = dist.get(u)! + weight;
      if (alt < dist.get(to)!) {
        dist.set(to, alt);
        prev.set(to, u);
      }
    }
  }
  
  // Reconstruct path.
  const path: number[] = [];
  let u: number | null = finishId;
  while (u !== null) {
    path.unshift(u);
    // Use nullish coalescing to allow 0 to be a valid node id.
    u = prev.get(u) ?? null;
  }
  
  const pathEdges: TopologyEdge[] = [];
  for (let i = 0; i < path.length - 1; i++) {
    const edge = topology.edges.find(e =>
      (e.from === path[i] && e.to === path[i+1]) || (e.from === path[i+1] && e.to === path[i])
    );
    const weight = edge ? edge.weight : 0;
    pathEdges.push({ from: path[i], to: path[i+1], weight });
  }
  return pathEdges;
}

window.addEventListener('load', () => {
  if (!canvas) {
    console.error("Canvas element not found");
    return;
  }
  const runAlgoBtn = document.getElementById('runAlgorithmBtn') as HTMLButtonElement;
  // In the runAlgoBtn handler ensure that a start node of "0" is parsed correctly
  runAlgoBtn?.addEventListener('click', () => {
    const startInputRaw = (document.getElementById('startNodeInput') as HTMLInputElement)?.value;
    const endInputRaw = (document.getElementById('endNodeInput') as HTMLInputElement)?.value;
    const startInput = startInputRaw.trim();
    const endInput = endInputRaw.trim();
    let startId: number;
    if (startInput !== "") {
      const parsedStart = parseInt(startInput, 10);
      if (!isNaN(parsedStart)) {
        startId = parsedStart;
      } else {
        startId = drawnNodes[0]?.id ?? 0;
      }
    } else {
      startId = drawnNodes[0]?.id ?? 0;
    }
    const topology = getCurrentTopology();
    let finishId: number;
    if (endInput !== "") {
      const parsedEnd = parseInt(endInput, 10);
      if (!isNaN(parsedEnd)) {
        finishId = parsedEnd;
      } else {
        finishId = getDrawnNodes()[0]?.id ?? 0;
      }
    } else {
      finishId = drawnNodes[0]?.id ?? 0;
    }
    const algorithmEdges = dijkstraAlgorithm(topology, startId,finishId);
    drawTopology(topology, algorithmEdges);
  });
});


