import { Topology, TopologyNode, TopologyEdge } from "./topology";

// Prim algorithm and its helper functions now reside here.
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
let drawingMode = true;
let selectedStartNodeId: number | null = null; // already nullable
let dragSourceNodeId: number | null = null;
let dragCurrentPos: { x: number; y: number } | null = null;

function getTopology(): Topology {
  return new Topology(drawnNodes, drawnEdges);
}

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

function drawTopology(): void {
  const canvas = getOrCreateCanvas();
  const topology = getTopology();
  // When drawing, always highlight the first placed node as start
  if (drawingMode) {
    // Pass drawnNodes[0].id (if exists) as selected node to highlight it.
    topology.draw(canvas, undefined, drawnNodes.length > 0 ? drawnNodes[0].id : undefined, undefined);
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
    let startNode = selectedStartNodeId;
    if (startNode === null && drawnNodes.length > 0) {
      startNode = drawnNodes[0].id;
    }
    let algorithmEdges: TopologyEdge[] | undefined;
    if (startNode !== null) {
      algorithmEdges = primAlgorithm(topology, startNode);
    }
    // In selection mode, highlight the chosen start node.
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
      // In selection mode, only allow choosing a start node.
      for (const node of drawnNodes) {
        const dx = node.x - posX;
        const dy = node.y - posY;
        if (Math.sqrt(dx * dx + dy * dy) <= 10) {
          if (selectedStartNodeId === null) {
            selectedStartNodeId = node.id;
            console.log("Selected start node: " + node.id);
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
    if (drawnNodes.length > 0 && selectedStartNodeId === null) {
      selectedStartNodeId = drawnNodes[0].id;
    }
    drawTopology();
  });
  
  const runAlgoBtn = document.getElementById('runAlgorithmBtn') as HTMLButtonElement;
  runAlgoBtn?.addEventListener('click', () => {
    const startInputRaw = (document.getElementById('startNodeInput') as HTMLInputElement)?.value;
    const startInput = startInputRaw.trim();
    // Using strict check so that "0" is a valid value.
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
      console.log("Start input empty, defaulting to first node.");
      selectedStartNodeId = drawnNodes[0].id;
    }
    drawTopology();
  });
  
  drawTopology();
});

window.addEventListener("DOMContentLoaded", () => {
  // ...existing code if needed...
});
