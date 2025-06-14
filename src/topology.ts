export interface TopologyNode {
	id: number;
	x: number;
	y: number;
}

export interface TopologyEdge {
	from: number;
	to: number;
	weight: number;
}

export class Topology {
	nodes: TopologyNode[];
	edges: TopologyEdge[];

	constructor(nodes: TopologyNode[], edges: TopologyEdge[]) {
		this.nodes = nodes;
		this.edges = edges;
	}

	// Draw the topology on the provided canvas.
	// Optionally provide algorithmEdges for overlay, a selectedNode to highlight in blue, and a hoveredNode to highlight in yellow.
	draw(
		canvas: HTMLCanvasElement,
		algorithmEdges?: TopologyEdge[],
		selectedNodeId?: number,
		hoveredNodeId?: number
	): void {
		const ctx = canvas.getContext('2d');
		if (!ctx) return;
		// Clear canvas
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		// Draw topology edges in light gray and show edge weight at midpoint
		this.edges.forEach(edge => {
			const from = this.nodes.find(n => n.id === edge.from)!;
			const to = this.nodes.find(n => n.id === edge.to)!;
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
				const from = this.nodes.find(n => n.id === edge.from)!;
				const to = this.nodes.find(n => n.id === edge.to)!;
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
		this.nodes.forEach(node => {
			// Draw node with white fill and black border
			ctx.beginPath();
			ctx.arc(node.x, node.y, 15, 0, Math.PI * 2); // increased radius to 15
			ctx.fillStyle = '#FFFFFF';
			ctx.fill();
			ctx.lineWidth = 2;
			ctx.strokeStyle = '#000000';
			ctx.stroke();
			
			// If selected or hovered, draw an additional highlight
			if (selectedNodeId !== undefined && node.id === selectedNodeId) {
				ctx.strokeStyle = 'blue';
				ctx.lineWidth = 3;
				ctx.stroke();
			} else if (hoveredNodeId !== undefined && node.id === hoveredNodeId) {
				ctx.strokeStyle = 'yellow';
				ctx.lineWidth = 3;
				ctx.stroke();
			}
			
			// Draw node label with bold black text
			ctx.fillStyle = '#000000';
			ctx.font = 'bold 16px sans-serif';
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';
			ctx.fillText(node.id.toString(), node.x, node.y);
		});
	}
}
