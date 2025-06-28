import { Topology,  TopologyEdge } from "./topology";
import { getCurrentTopology, setCanvas, onTopologyUpdate, onNodePress } from "./topologyDrawer";

/**
 * Represents the stored distances of a single node to all other nodes.
 */
const canvas = document.getElementById('graphCanvas') as HTMLCanvasElement;
setCanvas(canvas);

class NodeTable {
  nodeId: string;
  vector: Map<string, DistanceToNode>;

  constructor(nodeId: string) {
    this.nodeId = nodeId;
    this.vector = new Map<string, DistanceToNode>();
  }

  equals(other: NodeTable): boolean {
    return this.nodeId === other.nodeId;
  }

  // Helper method to check if this node exists in an array
  static findByNodeId(tables: NodeTable[], nodeId: string): NodeTable | undefined {
    return tables.find(table => table.nodeId === nodeId);
  }

  static existsInArray(tables: NodeTable[], nodeId: string): boolean {
    return tables.some(table => table.nodeId === nodeId);
  }
}


interface DistanceToNode{
  distance: number; //distancia al nodo
  fromNodeId: string; //id del nodo desde el cual se calcula la distancia
}

function getNeighbors(nodeId: string, topology: Topology): TopologyEdge[] {
  return topology.edges.filter(edge => edge.from === nodeId || edge.to === nodeId);
}

function constructBaseTableForNode(nodeId:string,topology: Topology): NodeTable { //crear tabla base para un nodo
    let nodeTable = new NodeTable(nodeId);
    let neighbors = getNeighbors(nodeId, topology);
    for (const edge of neighbors) {
        let neighborId = edge.from === nodeId ? edge.to : edge.from;
        nodeTable.vector.set(neighborId, { distance: edge.weight, fromNodeId: neighborId });
    }
    //agregamos el resto de nodos con distancia infinita
    for (const node of topology.nodes) {
        if (node.id !== nodeId && !nodeTable.vector.has(node.id)) {
            nodeTable.vector.set(node.id, { distance: Infinity, fromNodeId: "-" });
        }
    }
    //agregamos el nodo mismo con distancia 0
    nodeTable.vector.set(nodeId, { distance: 0, fromNodeId: nodeId });
    return nodeTable;
}

function getTableForNode(nodeId: string, nodeTables: NodeTable[]): NodeTable {
    let table = NodeTable.findByNodeId(nodeTables, nodeId);
    if (!table) {
        table = constructBaseTableForNode(nodeId, getCurrentTopology());
        nodeTables.push(table);
    }
    return table;
}

function vectorDistanceAlgorithm(topology: Topology): NodeTable[] {
    let nodeTables: NodeTable[] = [];

    for (const nodeTable of topology.nodes) {
        let nodeId = nodeTable.id;
        let currentTable = getTableForNode(nodeId, nodeTables);
        if (!currentTable) {
            currentTable = constructBaseTableForNode(nodeId, topology);
            nodeTables.push(currentTable);
        }
    }
    let updated = true;
    while (updated) {
        updated = false;
        for (const nodeTable of nodeTables) {
            let currentNodeId = nodeTable.nodeId;
            let neighbors = getNeighbors(currentNodeId, topology);
            for (const edge of neighbors) {
                let neighborId = edge.from === currentNodeId ? edge.to : edge.from;
                let neighborTable = getTableForNode(neighborId, nodeTables);
                if (!neighborTable) continue;
                // Check if the distance can be improved
                for (const [targetNodeId, distanceInfo] of nodeTable.vector.entries()) {
                    if (distanceInfo.distance + edge.weight < neighborTable.vector.get(targetNodeId)!.distance) {
                        neighborTable.vector.set(targetNodeId, {
                            distance: distanceInfo.distance + edge.weight,
                            fromNodeId: currentNodeId
                        });
                        updated = true;
                    }
                }
            }
        }
    }
    return nodeTables;
}



window.addEventListener('load', () => {
  if (!canvas) {
    console.error("Canvas element not found");
    return;
  }
  let nodeTables: NodeTable[] = [];
  let pressedNodeId: string | null = null;
  onNodePress((nodeId: string) => {
    console.log("Node pressed:", nodeId);
    pressedNodeId = nodeId;
    //Obtenemos la tabla del nodo presionado
    let table: NodeTable| undefined = NodeTable.findByNodeId(nodeTables, nodeId);
    //injectamos la tabla en el documento 
    graphInTable(table, nodeId);
  });
  // Listen for topology updates and rebuild the node table
  onTopologyUpdate((updatedTopology: Topology) => {
    console.log("Current topology:", updatedTopology);
    nodeTables = vectorDistanceAlgorithm(updatedTopology);
    if(pressedNodeId) {
      // If a node was pressed, update its table
      let table: NodeTable | undefined = NodeTable.findByNodeId(nodeTables, pressedNodeId);
      graphInTable(table, pressedNodeId);
    }
  });
});

function graphInTable(table: NodeTable | undefined, nodeId: string) {
  if (table) {
      const tableElement = document.getElementById('nodeTable');
      if (tableElement) {
        tableElement.innerHTML = `
          <h3>Node Table for ${nodeId}</h3>
          <table class="distance-table">
            <thead>
              <tr>
                <th>Nodo X</th>
                <th>Distancia a Nodo X</th>
                <th>Por Medio de</th>
              </tr>
            </thead>
            <tbody></tbody>
          </table>
        `;
        const tbody = tableElement.querySelector("tbody");
        table.vector.forEach((distanceInfo, targetNodeId) => {
          const tr = document.createElement("tr");
          tr.innerHTML = `
            <td>${targetNodeId}</td>
            <td>${distanceInfo.distance}</td>
            <td>${distanceInfo.fromNodeId}</td>
          `;
          if (tbody) {
            tbody.appendChild(tr);
          } else {
            console.error("tbody element not found");
          }
        });
      } else {
        console.error("Node table element not found");
      }
    } else {
      console.warn(`No table found for node ${nodeId}`);
      // Clear the table display
        const tableElement = document.getElementById('nodeTable');
        if (tableElement) {
            tableElement.innerHTML = `
                <p></p>
            `;
            }
    }
}
