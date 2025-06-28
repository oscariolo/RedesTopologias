export interface TopologyNode {
	id: string;
	x: number;
	y: number;
}

export interface TopologyEdge {
	from:  string;
	to:  string;
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
