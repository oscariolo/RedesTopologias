import { Topology, TopologyEdge, TopologyNode } from "./topology";

let drawnNodes: TopologyNode[] = [];
let drawnEdges: TopologyEdge[] = [];
let dragSourceNodeId: string | null = null;
let dragCurrentPos: { x: number; y: number } | null = null;
let canvas: HTMLCanvasElement;
let pointerDownPos: { x: number; y: number } | null = null;

// Callback system for topology updates
type TopologyUpdateCallback = (topology: Topology) => void;
let topologyUpdateCallbacks: TopologyUpdateCallback[] = [];

export function onTopologyUpdate(callback: TopologyUpdateCallback) {
  topologyUpdateCallbacks.push(callback);
}

export function offTopologyUpdate(callback: TopologyUpdateCallback) {
  topologyUpdateCallbacks = topologyUpdateCallbacks.filter(cb => cb !== callback);
}

function emitTopologyUpdate() {
  const topology = getCurrentTopology();
  topologyUpdateCallbacks.forEach(callback => callback(topology));
}

export function setCanvas(newCanvas: HTMLCanvasElement) {
    canvas = newCanvas;
}

function getNextNodeId(): string {
  let id = 0;
  const usedIds = new Set(drawnNodes.map(n => parseInt(n.id)));
  while (usedIds.has(id)) { id++; }
  return id.toString();
}

export function getCurrentTopology(): Topology {
  return new Topology(drawnNodes, drawnEdges);
}

export function getDrawnNodes(): TopologyNode[] {
  return drawnNodes;}


export function drawTopology(topology: Topology, algorithmEdges?: TopologyEdge[]){
    const ctx = canvas.getContext('2d');
		if (!ctx) return;
		// Clear canvas
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		// Draw topology edges in light gray and show edge weight at midpoint
		topology.edges.forEach(edge => {
			const from = topology.nodes.find(n => n.id === edge.from)!;
			const to = topology.nodes.find(n => n.id === edge.to)!;
			ctx.strokeStyle = '#ccc';
			ctx.lineWidth = 5;
			ctx.beginPath();
			ctx.moveTo(from.x, from.y);
			ctx.lineTo(to.x, to.y);
			ctx.stroke();
			// Draw weight at the midpoint
			const midX = (from.x + to.x) / 2;
			const midY = (from.y + to.y) / 2;
			ctx.fillStyle = 'black';
			ctx.font = '12px sans-serif';
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';
			ctx.fillText(edge.weight.toString(), midX, midY);
		});
		// Draw algorithm result edges (if any) in red and show weight 
		if (algorithmEdges) {
			algorithmEdges.forEach(edge => {
				const from = topology.nodes.find(n => n.id === edge.from)!;
				const to = topology.nodes.find(n => n.id === edge.to)!;
				ctx.strokeStyle = 'red';
				ctx.lineWidth = 3;
				ctx.beginPath();
				ctx.moveTo(from.x, from.y);
				ctx.lineTo(to.x, to.y);
				ctx.stroke();
				// Draw weight at midpoint
				const midX = (from.x + to.x) / 2;
				const midY = (from.y + to.y) / 2;
				ctx.fillStyle = 'red';
				ctx.font = '12px sans-serif';
				ctx.textAlign = 'center';
				ctx.textBaseline = 'middle';
				ctx.fillText(edge.weight.toString(), midX, midY);
			});
		}
		// Draw nodes and labels with updated styling:
		topology.nodes.forEach(node => {
			// Draw node with white fill and black border
			ctx.beginPath();
			ctx.arc(node.x, node.y, 15, 0, Math.PI * 2); // increased radius to 15
			ctx.fillStyle = '#FFFFFF';
			ctx.fill();
			ctx.lineWidth = 2;
			ctx.strokeStyle = '#000000';
			ctx.stroke();
			// Draw node label with bold black text
			ctx.fillStyle = '#000000';
			ctx.font = 'bold 16px sans-serif';
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';
			ctx.fillText(node.id.toString(), node.x, node.y);
		});
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
  
  canvas.addEventListener('pointerdown', (e: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    const posX = e.clientX - rect.left;
    const posY = e.clientY - rect.top;
    pointerDownPos = { x: posX, y: posY };
    const hitNode = drawnNodes.find(node => Math.hypot(node.x - posX, node.y - posY) <= 20);
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
      drawTopology(getCurrentTopology(), undefined);
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
      drawTopology(getCurrentTopology(), undefined);
      emitTopologyUpdate(); // Emit signal when topology changes
    }
  });
  
  canvas.addEventListener('pointerup', (e: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    const posX = e.clientX - rect.left;
    const posY = e.clientY - rect.top;
    
    let topologyChanged = false;
    
    if (dragSourceNodeId !== null) {
      const targetNode = drawnNodes.find(node => Math.hypot(node.x - posX, node.y - posY) <= 10);
      if (targetNode && targetNode.id !== dragSourceNodeId) {
        const weightInput = window.prompt("Enter weight for the edge from node " + dragSourceNodeId + " to node " + targetNode.id, "1");
        const weight = weightInput ? parseFloat(weightInput) : 1;
        drawnEdges.push({ from: dragSourceNodeId, to: targetNode.id, weight });
        topologyChanged = true;
      }
    } else if (pointerDownPos !== null) {
      const dx = posX - pointerDownPos.x;
      const dy = posY - pointerDownPos.y;
      if (Math.hypot(dx, dy) < 5) {
        const newId = getNextNodeId();
        drawnNodes.push({ id: newId, x: posX, y: posY });
        topologyChanged = true;
      }
    }
    
    dragSourceNodeId = null;
    dragCurrentPos = null;
    pointerDownPos = null;
    drawTopology(getCurrentTopology(), undefined);
    
    if (topologyChanged) {
      emitTopologyUpdate(); // Emit signal when topology changes
    }
  });
  
  canvas.addEventListener('pointerleave', () => {
    dragSourceNodeId = null;
    dragCurrentPos = null;
    pointerDownPos = null;
    drawTopology(getCurrentTopology(), undefined);
  });
  
});
