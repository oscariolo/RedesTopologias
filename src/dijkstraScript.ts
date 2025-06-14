import { Topology, TopologyNode, TopologyEdge } from "./topology";

let drawnNodes: TopologyNode[] = [];
let drawnEdges: TopologyEdge[] = [];
let dragSourceNodeId: number | null = null; 
let dragCurrentPos: { x: number; y: number } | null = null;
let pointerDownPos: { x: number; y: number } | null = null;


// Create a Topology instance from the drawn data.
function getTopology(): Topology {
  return new Topology(drawnNodes, drawnEdges);
}

// Helper to get or create the canvas.
function getOrCreateCanvas(): HTMLCanvasElement {
  let canvas = document.getElementById('graphCanvas') as HTMLCanvasElement;
  return canvas;
}

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

function getNextNodeId(): number {
  let id = 0;
  const usedIds = new Set(drawnNodes.map(n => n.id));
  while (usedIds.has(id)) { id++; }
  return id;
}


// Draw the topology. In drawing mode, draw nodes, edges, and a temporary drag line.
// In selection mode, overlay the Dijkstra result in red.
function drawTopology(): void {
  const canvas = getOrCreateCanvas();
  const topology = getTopology();
  const startNode = drawnNodes.length > 0 ? drawnNodes[0].id : undefined;
  topology.draw(canvas, undefined, startNode, undefined);
  
  if (dragSourceNodeId !== null && dragCurrentPos) {
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const src = drawnNodes.find(n => n.id === dragSourceNodeId);
      if (src) {
        ctx.strokeStyle = 'rgba(0,0,255,0.7)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(src.x, src.y);
        ctx.lineTo(dragCurrentPos.x, dragCurrentPos.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }
}

window.addEventListener('load', () => {
  const canvas = getOrCreateCanvas();
  
  canvas.addEventListener('pointerdown', (e: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    const posX = e.clientX - rect.left;
    const posY = e.clientY - rect.top;
    pointerDownPos = { x: posX, y: posY };
    const hitNode = drawnNodes.find(node => Math.hypot(node.x - posX, node.y - posY) <= 10);
    if (hitNode) {
      dragSourceNodeId = hitNode.id;
      dragCurrentPos = { x: posX, y: posY };
    } else {
      dragSourceNodeId = null;
    }
  });

   // ADD CONTEXTMENU EVENT HANDLER FOR NODE DELETION:
  canvas.addEventListener('contextmenu', (e: MouseEvent) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const posX = e.clientX - rect.left;
    const posY = e.clientY - rect.top;
    const target = drawnNodes.find(node => Math.hypot(node.x - posX, node.y - posY) <= 10);
    if (target) {
      // Remove the node and its connected edges.
      drawnNodes = drawnNodes.filter(n => n.id !== target.id);
      drawnEdges = drawnEdges.filter(edge => edge.from !== target.id && edge.to !== target.id);
      drawTopology();
    }
  });
  

   canvas.addEventListener('pointermove', (e: PointerEvent) => {
    if (dragSourceNodeId !== null) {
      const rect = canvas.getBoundingClientRect();
      dragCurrentPos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      drawTopology();
    }
  });
  
    canvas.addEventListener('pointerup', (e: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    const posX = e.clientX - rect.left;
    const posY = e.clientY - rect.top;
    
    if (dragSourceNodeId !== null) {
      const targetNode = drawnNodes.find(node => Math.hypot(node.x - posX, node.y - posY) <= 10);
      if (targetNode && targetNode.id !== dragSourceNodeId) {
        const weightInput = window.prompt("Enter weight for the edge from node " + dragSourceNodeId + " to node " + targetNode.id, "1");
        const weight = weightInput ? parseFloat(weightInput) : 1;
        drawnEdges.push({ from: dragSourceNodeId, to: targetNode.id, weight });
      }
    } else if (pointerDownPos !== null) {
      const dx = posX - pointerDownPos.x;
      const dy = posY - pointerDownPos.y;
      if (Math.hypot(dx, dy) < 5) {
        const newId = getNextNodeId();
        drawnNodes.push({ id: newId, x: posX, y: posY });
      }
    }
    
    dragSourceNodeId = null;
    dragCurrentPos = null;
    pointerDownPos = null;
    drawTopology();
  });
  
   canvas.addEventListener('pointerleave', () => {
    dragSourceNodeId = null;
    dragCurrentPos = null;
    pointerDownPos = null;
    drawTopology();
  });
  
  
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
    const topology = getTopology();
    let finishId: number;
    if (endInput !== "") {
      const parsedEnd = parseInt(endInput, 10);
      if (!isNaN(parsedEnd)) {
        finishId = parsedEnd;
      } else {
        finishId = drawnNodes[0]?.id ?? 0;
      }
    } else {
      finishId = drawnNodes[0]?.id ?? 0;
    }
    const algorithmEdges = dijkstraAlgorithm(topology, startId,finishId);
    const canvas = getOrCreateCanvas();
    topology.draw(canvas, algorithmEdges, startId, undefined);
  });
  
  drawTopology();
});
