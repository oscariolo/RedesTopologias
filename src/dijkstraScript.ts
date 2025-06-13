import { Topology, TopologyNode, TopologyEdge } from "./topology";

// Dynamic drawing data (shared structure as in primScript.ts)
let drawnNodes: TopologyNode[] = [];
let drawnEdges: TopologyEdge[] = [];
let drawingMode = true;
let selectedStartNodeId: number | null = null;  // changed to nullable
let selectedFinishNodeId: number | null = null; // changed to nullable
let dragSourceNodeId: number | null = null;
let dragCurrentPos: { x: number; y: number } | null = null;

// Create a Topology instance from the drawn data.
function getTopology(): Topology {
  return new Topology(drawnNodes, drawnEdges);
}

// Helper to get or create the canvas.
function getOrCreateCanvas(): HTMLCanvasElement {
  let canvas = document.getElementById('graphCanvas') as HTMLCanvasElement;
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = 'graphCanvas';
    canvas.width = 600;
    canvas.height = 400;
    const container = document.getElementById('canvasContainer') || document.querySelector('.container');
    container?.appendChild(canvas);
  }
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

// Draw the topology. In drawing mode, draw nodes, edges, and a temporary drag line.
// In selection mode, overlay the Dijkstra result in red.
function drawTopology(): void {
  const canvas = getOrCreateCanvas();
  const topology = getTopology();
  console.log("Drawing topology in", drawingMode ? "drawing mode" : "selection mode");
  console.log("Drawn nodes:", drawnNodes);
  console.log("Drawn edges:", drawnEdges);
  
  if (drawingMode) {
    topology.draw(canvas);
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
  } else {
    // Validate start/finish nodes.
    let startNode = selectedStartNodeId;
    let finishNode = selectedFinishNodeId;
    if (drawnNodes.length === 0) {
      console.log("No nodes drawn.");
      return;
    }
    if (startNode === null || !drawnNodes.some(n => n.id === startNode)) {
      startNode = drawnNodes[0].id;
      console.log("Defaulting start node to", startNode);
    }
    if (finishNode === null || !drawnNodes.some(n => n.id === finishNode)) {
      finishNode = drawnNodes[drawnNodes.length - 1].id;
      console.log("Defaulting finish node to", finishNode);
    }
    console.log("Selected start:", startNode, "finish:", finishNode);
    let algorithmEdges: TopologyEdge[] | undefined;
    if (startNode !== null && finishNode !== null) {
      algorithmEdges = dijkstraAlgorithm(topology, startNode, finishNode);
      console.log("Computed Dijkstra edges:", algorithmEdges);
    } else {
      console.log("Missing start or finish; cannot compute Dijkstra path.");
    }
    topology.draw(canvas, algorithmEdges, startNode ?? undefined, undefined);
  }
}

window.addEventListener('load', () => {
  const canvas = getOrCreateCanvas();
  
  canvas.addEventListener('pointerdown', (e: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    const posX = e.clientX - rect.left;
    const posY = e.clientY - rect.top;
    if (drawingMode) {
      let clickedOnNode = false;
      for (const node of drawnNodes) {
        const dx = node.x - posX;
        const dy = node.y - posY;
        if (Math.sqrt(dx * dx + dy * dy) <= 10) {
          dragSourceNodeId = node.id;
          dragCurrentPos = { x: posX, y: posY };
          clickedOnNode = true;
          break;
        }
      }
      if (!clickedOnNode) {
        const newNode: TopologyNode = { id: drawnNodes.length, x: posX, y: posY };
        drawnNodes.push(newNode);
        drawTopology();
      }
    } else {
      // In selection mode, allow selecting start and finish nodes.
      for (const node of drawnNodes) {
        const dx = node.x - posX;
        const dy = node.y - posY;
        if (Math.sqrt(dx * dx + dy * dy) <= 10) {
          if (selectedStartNodeId === null) {
            selectedStartNodeId = node.id;
            console.log("Selected start node: " + node.id);
          } else {
            selectedFinishNodeId = node.id;
            console.log("Selected finish node: " + node.id);
          }
          drawTopology();
          break;
        }
      }
    }
  });
  
  canvas.addEventListener('pointermove', (e: PointerEvent) => {
    if (drawingMode && dragSourceNodeId !== null) {
      const rect = canvas.getBoundingClientRect();
      dragCurrentPos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      drawTopology();
    }
  });
  
  canvas.addEventListener('pointerup', (e: PointerEvent) => {
    if (drawingMode && dragSourceNodeId !== null) {
      const rect = canvas.getBoundingClientRect();
      const posX = e.clientX - rect.left;
      const posY = e.clientY - rect.top;
      let targetNode: TopologyNode | undefined;
      for (const node of drawnNodes) {
        const dx = node.x - posX;
        const dy = node.y - posY;
        if (Math.sqrt(dx * dx + dy * dy) <= 10) {
          targetNode = node;
          break;
        }
      }
      if (targetNode && targetNode.id !== dragSourceNodeId) {
        const weightInput = window.prompt("Enter weight for the edge from node " + dragSourceNodeId + " to node " + targetNode.id, "1");
        const weight = weightInput ? parseFloat(weightInput) : 1;
        drawnEdges.push({ from: dragSourceNodeId, to: targetNode.id, weight });
      }
      dragSourceNodeId = null;
      dragCurrentPos = null;
      drawTopology();
    }
  });
  
  canvas.addEventListener('pointerleave', () => {
    if (drawingMode) {
      dragSourceNodeId = null;
      dragCurrentPos = null;
      drawTopology();
    }
  });
  
  const finishBtn = document.getElementById('finishTopologyBtn') as HTMLButtonElement;
  finishBtn?.addEventListener('click', () => {
    drawingMode = false;
    if (drawnNodes.length > 0) {
      if (selectedStartNodeId === null) {
        selectedStartNodeId = drawnNodes[0].id;
      }
      if (selectedFinishNodeId === null) {
        selectedFinishNodeId = drawnNodes[drawnNodes.length - 1].id;
      }
    }
    drawTopology();
  });
  
  const runAlgoBtn = document.getElementById('runAlgorithmBtn') as HTMLButtonElement;
  // In the runAlgoBtn handler ensure that a start node of "0" is parsed correctly
  runAlgoBtn?.addEventListener('click', () => {
    const startInputRaw = (document.getElementById('startNodeInput') as HTMLInputElement)?.value;
    const finishInputRaw = (document.getElementById('endNodeInput') as HTMLInputElement)?.value;
    const startInput = startInputRaw.trim();
    const finishInput = finishInputRaw.trim();
    if (startInput !== "") {
      const parsedStart = parseInt(startInput, 10);
      if (!isNaN(parsedStart)) {
        selectedStartNodeId = parsedStart;
        console.log("Parsed start node:", parsedStart);
      } else {
        console.log("Invalid start node input, defaulting to first node.");
        selectedStartNodeId = drawnNodes[0].id;
      }
    } else {
      console.log("Start node empty, defaulting to first node.");
      selectedStartNodeId = drawnNodes[0].id;
    }
    if (finishInput !== "") {
      const parsedFinish = parseInt(finishInput, 10);
      if (!isNaN(parsedFinish)) {
        selectedFinishNodeId = parsedFinish;
        console.log("Parsed finish node:", parsedFinish);
      } else {
        console.log("Invalid finish node input, defaulting to last node.");
        selectedFinishNodeId = drawnNodes[drawnNodes.length - 1].id;
      }
    } else {
      console.log("Finish node empty, defaulting to last node.");
      selectedFinishNodeId = drawnNodes[drawnNodes.length - 1].id;
    }
    drawTopology();
  });
  
  drawTopology();
});
