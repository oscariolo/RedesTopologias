import { Topology,  TopologyEdge } from "./topology";
import {setCanvas, onTopologyUpdate, onNodePress, getCurrentTopology } from "./topologyDrawer";

/**
 * Represents the stored distances of a single node to all other nodes.
 */
const canvas = document.getElementById('graphCanvas') as HTMLCanvasElement;
setCanvas(canvas);

interface DistanceVectorStep {
  iteration: number;
  updatingNode: string;
  allTables: Map<string, Map<string, DistanceToNode>>;
  changesDetected: boolean;
}


class NodeTable {
  nodeId: string;
  vector: Map<string, DistanceToNode>;

  // now accepts either a nodeId or another NodeTable to clone
  constructor(source: string | NodeTable) {
    if (typeof source === "string") {
      // normal construction
      this.nodeId = source;
      this.vector = new Map<string, DistanceToNode>();
    } else {
      // clone constructor
      this.nodeId = source.nodeId;
      // shallow‐copy each entry in the vector
      this.vector = new Map<string, DistanceToNode>();
      source.vector.forEach((info, key) => {
        this.vector.set(key, { distance: info.distance, fromNodeId: info.fromNodeId });
      });
    }
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

export function getNeighbors(nodeId: string, topology: Topology): TopologyEdge[] {
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

function getTableForNode(nodeId: string, nodeTables: NodeTable[], topology:Topology): NodeTable {
    let table = NodeTable.findByNodeId(nodeTables, nodeId);
    if (!table) {
        table = constructBaseTableForNode(nodeId, topology);
        nodeTables.push(table);
    }
    return table;
}

function getNeighborTables(nodeId: string, nodeTables: NodeTable[], topology:Topology): NodeTable[] {
    let neighborTables: NodeTable[] = [];
    let neighbors = getNeighbors(nodeId, topology);
    for(const table of nodeTables){
        if (neighbors.some(edge => edge.from === table.nodeId || edge.to === table.nodeId)) {
            //no agregamos el mismo nodo id 
            if (table.nodeId !== nodeId) {
                neighborTables.push(table);
            }
        }
    }


    return neighborTables
}



window.addEventListener('load', () => {
  if (!canvas) {
    console.error("Canvas element not found");
    return;
  }
  let nodeTables: NodeTable[] = [];
  let pressedNodeId: string | undefined;

  const playbtn = document.getElementById('distanceVectorPlay') as HTMLButtonElement;
  playbtn.addEventListener('click', () => {
    // Clear the table display
    const result = distanceVectorAlgorithm(pressedNodeId || "0", nodeTables, getCurrentTopology());
    nodeTables = result.tables;
    graphInTable(nodeTables.find(table => table.nodeId === pressedNodeId), pressedNodeId || "");
    displayDistanceVectorSteps(result.steps);
  });


  onNodePress((nodeId: string) => {
    pressedNodeId = nodeId;
    //Obtenemos la tabla del nodo presionado
    const result = distanceVectorAlgorithm(pressedNodeId, nodeTables, getCurrentTopology());
    nodeTables = result.tables;
    let table: NodeTable| undefined = NodeTable.findByNodeId(nodeTables, nodeId);
    graphInTable(table, nodeId);
    displayDistanceVectorSteps(result.steps);
  });


  // Listen for topology updates and rebuild the node table
  onTopologyUpdate((updatedTopology: Topology) => {
    const updatedIds = updatedTopology.nodes.map(n => n.id);

  // 1) Eliminar tablas de nodos borrados
  nodeTables = nodeTables.filter(table => updatedIds.includes(table.nodeId));

  // 2) Añadir tablas de nodos nuevos
  updatedTopology.nodes.forEach(node => {
    if (!NodeTable.existsInArray(nodeTables, node.id)) {
      nodeTables.push(constructBaseTableForNode(node.id, updatedTopology));
    }
  });

  // 3) Actualizar los pesos directos en las tablas existentes (vecinos e infinito)
  nodeTables.forEach(table => {
    const base = constructBaseTableForNode(table.nodeId, updatedTopology);
    base.vector.forEach((info, destId) => {
      // solo sobreescribimos si es el mismo nodo (dist=0) o un vecino directo
      if (info.distance === 0 || info.fromNodeId === destId) {
        table.vector.set(destId, info);
      }
      // agregamos destinos nuevos con infinito
      if (!table.vector.has(destId)) {
        table.vector.set(destId, info);
      }
    });
  });

  // 4) Re-ejecutar el algoritmo de vector distancia para propagar cambios
  const result = distanceVectorAlgorithm(pressedNodeId || nodeTables[0].nodeId, nodeTables, updatedTopology);
  nodeTables = result.tables;

  // 5) Si había un nodo seleccionado, refrescar su tabla
  if (pressedNodeId) {
    graphInTable(
      nodeTables.find(t => t.nodeId === pressedNodeId),
      pressedNodeId
    );
  }
  });
  


});


function graphInTable(table: NodeTable | undefined, nodeId: string) {
  if (table) {
      const tableElement = document.getElementById('nodeTable');
      if (tableElement) {
        tableElement.innerHTML = `
          <h3>Tabla de nodo ${nodeId}</h3>
          <table class="distance-table">
            <thead>
              <tr>
                <th>Nodo llega a</th>
                <th>Por Medio de</th>
                <th>Distancia</th>
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
            <td>${distanceInfo.fromNodeId}</td>
            <td>${distanceInfo.distance}</td>
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



function distanceVectorAlgorithm(updatingNodeTable:string="0",nodeTables: NodeTable[],topology:Topology): { tables: NodeTable[], steps: DistanceVectorStep[] } {
    const steps: DistanceVectorStep[] = [];
    let iteration = 0;
    
    // Initial step - capture starting state
    steps.push({
      iteration: iteration++,
      updatingNode: updatingNodeTable,
      allTables: captureTablesSnapshot(nodeTables),
      changesDetected: false
    });
    
    //Bajo un nodo cualquiera, despues se propaga
    let neighborTables = getNeighborTables(updatingNodeTable, nodeTables,topology);
    let nodeTable = getTableForNode(updatingNodeTable,nodeTables,topology);
    let entries = new Map<string,DistanceToNode>(nodeTable.vector);
    let mustDisperse = false;

    for(const entry of entries.keys()) {//por cada entrada de la tabla de ese nodo D(entryNode)
        let distanceArray: DistanceToNode[] = []
        //para cada vecino de ese nodo, calculamos la distancia a entryNode
        for(const neighbor of neighborTables){ 
            let distanceToEntry: number = nodeTable.vector.get(neighbor.nodeId)?.distance! + neighbor.vector.get(entry)?.distance!
            distanceArray.push({fromNodeId:neighbor.nodeId,distance:distanceToEntry})
        }
        //obtenemos el minimo de las distancias
        let minimumDistanceToNode:DistanceToNode = distanceArray.reduce((min,next)=>next.distance < min!.distance ? next:min,entries.get(entry)!);
        //verificamos si hubo actualización
        //si la hubo guardamos que nodos vecinos deben esparcir la actualización
        if(minimumDistanceToNode.fromNodeId !== nodeTable.vector.get(entry)?.fromNodeId){
            nodeTable.vector.set(entry,minimumDistanceToNode);
            mustDisperse = true;
        }
    }
    
    // Capture step after processing this node
    steps.push({
      iteration: iteration++,
      updatingNode: updatingNodeTable,
      allTables: captureTablesSnapshot(nodeTables),
      changesDetected: mustDisperse
    });
    
    if(mustDisperse){
        for(const neighbor of neighborTables){
            const neighborResult = distanceVectorAlgorithm(neighbor.nodeId,nodeTables,topology);
            steps.push(...neighborResult.steps);
        }
    }

    return { tables: nodeTables, steps };
}

function captureTablesSnapshot(nodeTables: NodeTable[]): Map<string, Map<string, DistanceToNode>> {
  const snapshot = new Map<string, Map<string, DistanceToNode>>();
  nodeTables.forEach(table => {
    const tableSnapshot = new Map<string, DistanceToNode>();
    table.vector.forEach((value, key) => {
      tableSnapshot.set(key, { distance: value.distance, fromNodeId: value.fromNodeId });
    });
    snapshot.set(table.nodeId, tableSnapshot);
  });
  return snapshot;
}

function displayDistanceVectorSteps(steps: DistanceVectorStep[]) {
  const tableElement = document.getElementById('distanceVectorSteps');
  if (tableElement) {
    tableElement.innerHTML = `
      <h3>Pasos del Algoritmo Vector Distancia</h3>
      <div class="steps-container">
        ${steps.map(step => `
          <div class="step-iteration">
            <h4>Iteración ${step.iteration} - Actualizando Nodo ${step.updatingNode} ${step.changesDetected ? '(Cambios detectados)' : '(Sin cambios)'}</h4>
            <div class="tables-grid">
              ${Array.from(step.allTables.entries()).map(([nodeId, vector]) => `
                <div class="node-table-container">
                  <h5>Tabla del Nodo ${nodeId}</h5>
                  <table class="distance-table mini-table">
                    <thead>
                      <tr>
                        <th>Destino</th>
                        <th>Por Medio de</th>
                        <th>Distancia</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${Array.from(vector.entries()).map(([dest, info]) => `
                        <tr>
                          <td>${dest}</td>
                          <td>${info.fromNodeId}</td>
                          <td>${info.distance === Infinity ? '∞' : info.distance}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }
}