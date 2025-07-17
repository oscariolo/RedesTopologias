import { Topology, TopologyEdge } from "./topology";
import { drawTopology, getCurrentTopology, setCanvas } from "./topologyDrawer";

interface DijkstraStep {
  iteration: number;
  currentNode: string;
  distances: Map<string, number>;
  previous: Map<string, string | null>;
  visited: Set<string>;
  queue: string[];
}

const canvas = document.getElementById('graphCanvas') as HTMLCanvasElement;
setCanvas(canvas);
// Dijkstra's algorithm to compute the shortest path from startId to finishId.
// Función dijkstraAlgorithm: Calcula el camino más corto desde el nodo inicio hasta el nodo final utilizando el algoritmo de Dijkstra.
function dijkstraAlgorithm(topology: Topology, startId: string, finishId: string): { pathEdges: TopologyEdge[], steps: DijkstraStep[] } {
  const steps: DijkstraStep[] = [];
  
  // Construir la lista de adyacencia.
  const adj = new Map<string, { to: string; weight: number }[]>();
  topology.nodes.forEach(node => adj.set(node.id, []));
  topology.edges.forEach(edge => {
    adj.get(edge.from)?.push({ to: edge.to, weight: edge.weight });
    adj.get(edge.to)?.push({ to: edge.from, weight: edge.weight });
  });
  
  // Inicializar distancias y predecesores.
  const dist = new Map<string, number>();
  const prev = new Map<string, string | null>();
  topology.nodes.forEach(node => {
    dist.set(node.id, Infinity);
    prev.set(node.id, null);
  });
  dist.set(startId, 0);
  
  // Usar un arreglo como cola de prioridad de nodos.
  let queue = topology.nodes.map(n => n.id);
  const visited = new Set<string>();
  let iteration = 0;
  
  while (queue.length > 0) {
    // Ordenar la cola según la distancia acumulada.
    queue.sort((a, b) => dist.get(a)! - dist.get(b)!);
    const u = queue.shift()!;
    visited.add(u);
    
    // Guardar el estado actual como un paso
    steps.push({
      iteration: iteration++,
      currentNode: u,
      distances: new Map(dist),
      previous: new Map(prev),
      visited: new Set(visited),
      queue: [...queue]
    });
    
    if (u === finishId) break; // Si llegamos al nodo final, terminamos.
    
    // Relajar las aristas de los vecinos.
    const neighbors = adj.get(u) || [];
    for (const { to, weight } of neighbors) {
      if (!queue.includes(to)) continue;
      const alt = dist.get(u)! + weight;
      if (alt < dist.get(to)!) {
        dist.set(to, alt);
        prev.set(to, u);
      }
    }
  }
  
  // Reconstruir el camino óptimo.
  const path: string[] = [];
  let u: string | null = finishId;
  while (u !== null) {
    path.unshift(u);
    u = prev.get(u) ?? null;
  }
  
  // Generar las aristas correspondientes al camino.
  const pathEdges: TopologyEdge[] = [];
  for (let i = 0; i < path.length - 1; i++) {
    const edge = topology.edges.find((e: TopologyEdge) =>
      (e.from === path[i] && e.to === path[i + 1]) || (e.from === path[i + 1] && e.to === path[i])
    );
    pathEdges.push({ from: path[i], to: path[i + 1], weight: edge ? edge.weight : 0 });
  }
  
  return { pathEdges, steps };
}

function displayDijkstraSteps(steps: DijkstraStep[]) {
  const tableElement = document.getElementById('dijkstraSteps');
  if (tableElement) {
    tableElement.innerHTML = `
      <h3>Pasos del Algoritmo de Dijkstra</h3>
      <table class="distance-table">
        <thead>
          <tr>
            <th>Iteración</th>
            <th>Nodo Actual</th>
            <th>Visitados</th>
            <th>Cola</th>
            <th>Distancias</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    `;
    const tbody = tableElement.querySelector("tbody");
    steps.forEach((step) => {
      const tr = document.createElement("tr");
      // Sort visited and queue nodes alphabetically
      const visitedNodes = Array.from(step.visited).sort().join(", ");
      const queueNodes = step.queue.sort().join(", ");
      // Sort distances alphabetically by node ID
      const distances = Array.from(step.distances.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([node, dist]) => `${node}: ${dist === Infinity ? '∞' : dist}`)
        .join(", ");
      
      tr.innerHTML = `
        <td>${step.iteration}</td>
        <td>${step.currentNode}</td>
        <td>{${visitedNodes}}</td>
        <td>[${queueNodes}]</td>
        <td>${distances}</td>
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
    const endInputRaw = (document.getElementById('endNodeInput') as HTMLInputElement)?.value;
    const startInput = startInputRaw.trim();
    const endInput = endInputRaw.trim();
    
    const topology = getCurrentTopology();
    
    let startId: string;
    if (startInput !== "") {
      // Check if the node exists in the topology
      if (topology.nodes.some(node => node.id === startInput)) {
        startId = startInput;
      } else {
        alert(`Node "${startInput}" does not exist in the topology`);
        return;
      }
    } else {
      // Use first available node if no input provided
      startId = topology.nodes[0]?.id ?? "A";
    }
    
    let finishId: string;
    if (endInput !== "") {
      // Check if the node exists in the topology
      if (topology.nodes.some(node => node.id === endInput)) {
        finishId = endInput;
      } else {
        alert(`Node "${endInput}" does not exist in the topology`);
        return;
      }
    } else {
      // Use second available node if no input provided, or first if only one node
      finishId = topology.nodes[1]?.id ?? topology.nodes[0]?.id ?? "B";
    }
    
    if (topology.nodes.length < 2) {
      alert("Please create at least 2 nodes to run Dijkstra algorithm");
      return;
    }
    
    const result = dijkstraAlgorithm(topology, startId, finishId);
    drawTopology(topology, result.pathEdges);
    displayDijkstraSteps(result.steps);
  });
});

