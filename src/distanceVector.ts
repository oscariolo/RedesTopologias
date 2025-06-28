import { Topology, TopologyNode, TopologyEdge } from "./topology";
import { getCurrentTopology, drawTopology, setCanvas, getDrawnNodes, onTopologyUpdate } from "./topologyDrawer";

/**
 * Represents the stored distances of a single node to all other nodes.
 */
let drawnNodes: TopologyNode[] = [];
const canvas = document.getElementById('graphCanvas') as HTMLCanvasElement;
setCanvas(canvas);


interface NodeTable{ 
  nodeId: number; //nodo
  vector: Map<number, DistanceToNode>; //vector de distancias a otros nodos
}

interface DistanceToNode{
  distance: number; //distancia al nodo
  fromNodeId: number; //id del nodo desde el cual se calcula la distancia
}


function vectorDistanceAlgorithm(topology: Topology): NodeTable[] {
  let newTables: NodeTable[] = [];



  // Aquí puedes implementar el algoritmo de vector de distancias
  
  return newTables;;
}



window.addEventListener('load', () => {
  if (!canvas) {
    console.error("Canvas element not found");
    return;
  }
  // Listen for topology updates and rebuild the node table
  onTopologyUpdate((updatedTopology: Topology) => {
    //let startingTable = constructNodeTable(updatedTopology);
    // You can now use startingTable for your distance vector algorithm
    let tables = vectorDistanceAlgorithm(updatedTopology);
  });
});
