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
}
