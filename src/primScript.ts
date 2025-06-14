import { Topology, TopologyNode, TopologyEdge } from "./topology";

function buildAdjacencyList(topology: Topology): Map<number, { to: number; weight: number }[]> {
  const adj = new Map<number, { to: number; weight: number }[]>();
  topology.nodes.forEach(node => adj.set(node.id, []));
  topology.edges.forEach(edge => {
    adj.get(edge.from)?.push({ to: edge.to, weight: edge.weight });
    adj.get(edge.to)?.push({ to: edge.from, weight: edge.weight });
  });
  return adj;
}

function primAlgorithm(topology: Topology, startId: number): TopologyEdge[] {
  const adj = buildAdjacencyList(topology);
  const mst: TopologyEdge[] = [];
  const visited = new Set<number>();
  visited.add(startId);
  
  let candidateEdges: { from: number; to: number; weight: number }[] = [
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

let drawnNodes: TopologyNode[] = [];
let drawnEdges: TopologyEdge[] = [];
let dragSourceNodeId: number | null = null; 
let dragCurrentPos: { x: number; y: number } | null = null;
let pointerDownPos: { x: number; y: number } | null = null;

function getNextNodeId(): number {
  let id = 0;
  const usedIds = new Set(drawnNodes.map(n => n.id));
  while (usedIds.has(id)) { id++; }
  return id;
}

function getTopology(): Topology {
  return new Topology(drawnNodes, drawnEdges);
}

function getOrCreateCanvas(): HTMLCanvasElement {
  let canvas = document.getElementById('graphCanvas') as HTMLCanvasElement;
  return canvas;
}

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
  
  canvas.addEventListener('pointermove', (e: PointerEvent) => {
    if (dragSourceNodeId !== null) {
      const rect = canvas.getBoundingClientRect();
      dragCurrentPos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      drawTopology();
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
  runAlgoBtn?.addEventListener('click', () => {
    const startInputRaw = (document.getElementById('startNodeInput') as HTMLInputElement)?.value;
    const startInput = startInputRaw.trim();
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
    const algorithmEdges = primAlgorithm(topology, startId);
    const canvas = getOrCreateCanvas();
    topology.draw(canvas, algorithmEdges, startId, undefined);
  });
  drawTopology();
});
