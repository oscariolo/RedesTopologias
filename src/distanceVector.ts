import { Topology,  TopologyEdge } from "./topology";
import {setCanvas, onTopologyUpdate, onNodePress, getCurrentTopology } from "./topologyDrawer";

/**
 * Represents the stored distances of a single node to all other nodes.
 */
const canvas = document.getElementById('graphCanvas') as HTMLCanvasElement;
setCanvas(canvas);

interface DistanceVectorStep {
  stepNumber: number;
  updatingNode: string;
  nodeTableBefore: Map<string, DistanceToNode>;
  nodeTableAfter: Map<string, DistanceToNode>;
  changesDetected: boolean;
  description: string;
}

interface AlgorithmState {
  allSteps: DistanceVectorStep[];
  currentStepIndex: number;
  isRunning: boolean;
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
  let algorithmState: AlgorithmState = {
    allSteps: [],
    currentStepIndex: 0,
    isRunning: false
  };

  const playbtn = document.getElementById('distanceVectorPlay') as HTMLButtonElement;
  playbtn.addEventListener('click', () => {
    if (!algorithmState.isRunning) {
      // Start new algorithm run
      if (pressedNodeId) {
        const result = distanceVectorAlgorithm(pressedNodeId, nodeTables, getCurrentTopology());
        nodeTables = result.tables;
        algorithmState.allSteps = result.steps;
        algorithmState.currentStepIndex = 0;
        algorithmState.isRunning = true;
        playbtn.textContent = 'Next Step';
        
        // Show first step
        if (algorithmState.allSteps.length > 0) {
          displayCurrentStep(algorithmState.allSteps[0]);
        }
      }
    } else {
      // Continue to next step
      algorithmState.currentStepIndex++;
      if (algorithmState.currentStepIndex < algorithmState.allSteps.length) {
        displayCurrentStep(algorithmState.allSteps[algorithmState.currentStepIndex]);
      } else {
        // Algorithm finished
        algorithmState.isRunning = false;
        playbtn.textContent = 'Play';
        graphInTable(nodeTables.find(table => table.nodeId === pressedNodeId), pressedNodeId || "");
        displayDistanceVectorSteps(algorithmState.allSteps);
      }
    }
  });


  onNodePress((nodeId: string) => {
    pressedNodeId = nodeId;
    // Reset algorithm state when selecting a new node
    algorithmState.isRunning = false;
    algorithmState.currentStepIndex = 0;
    algorithmState.allSteps = [];
    playbtn.textContent = 'Play';
    
    // Show the initial table for the selected node
    let table: NodeTable | undefined = getTableForNode(nodeId, nodeTables, getCurrentTopology());
    graphInTable(table, nodeId);
    
    // Clear step display
    const stepDisplay = document.getElementById('currentStepDisplay');
    if (stepDisplay) {
      stepDisplay.innerHTML = '<p>Presiona Play para comenzar el algoritmo paso a paso</p>';
    }
  });


  // Listen for topology updates and rebuild the node table
  onTopologyUpdate((updatedTopology: Topology) => {
    const updatedIds = updatedTopology.nodes.map(n => n.id);

    // Reset algorithm state on topology change
    algorithmState.isRunning = false;
    algorithmState.currentStepIndex = 0;
    algorithmState.allSteps = [];
    playbtn.textContent = 'Play';

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

    // 4) Si había un nodo seleccionado, refrescar su tabla inicial
    if (pressedNodeId && NodeTable.existsInArray(nodeTables, pressedNodeId)) {
      const table = getTableForNode(pressedNodeId, nodeTables, updatedTopology);
      graphInTable(table, pressedNodeId);
    }

    // Clear displays
    const stepDisplay = document.getElementById('currentStepDisplay');
    if (stepDisplay) {
      stepDisplay.innerHTML = '<p>Selecciona un nodo y presiona Play para comenzar</p>';
    }
    const stepsDisplay = document.getElementById('distanceVectorSteps');
    if (stepsDisplay) {
      stepsDisplay.innerHTML = '';
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
        // Sort entries alphabetically by node ID
        const sortedEntries = Array.from(table.vector.entries()).sort(([a], [b]) => a.localeCompare(b));
        sortedEntries.forEach(([targetNodeId, distanceInfo]) => {
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



function distanceVectorAlgorithm(startingNode: string = "0", nodeTables: NodeTable[], topology: Topology): { tables: NodeTable[], steps: DistanceVectorStep[] } {
    const steps: DistanceVectorStep[] = [];
    let stepNumber = 0;
    
    // Create a queue of nodes to process
    const nodesToProcess: string[] = [startingNode];
    const processedNodes = new Set<string>();
    
    while (nodesToProcess.length > 0) {
        const currentNodeId = nodesToProcess.shift()!;
        
        if (processedNodes.has(currentNodeId)) {
            continue;
        }
        
        const nodeTable = getTableForNode(currentNodeId, nodeTables, topology);
        const tableBefore = new Map<string, DistanceToNode>();
        nodeTable.vector.forEach((value, key) => {
            tableBefore.set(key, { distance: value.distance, fromNodeId: value.fromNodeId });
        });
        
        const neighborTables = getNeighborTables(currentNodeId, nodeTables, topology);
        let hasChanges = false;
        
        // Update distances for this node
        for (const [destNode, currentInfo] of nodeTable.vector.entries()) {
            if (destNode === currentNodeId) continue;
            
            let bestDistance = currentInfo.distance;
            let bestNextHop = currentInfo.fromNodeId;
            
            // Check all neighbors for better paths
            for (const neighbor of neighborTables) {
                const distanceToNeighbor = nodeTable.vector.get(neighbor.nodeId)?.distance || Infinity;
                const distanceFromNeighborToDest = neighbor.vector.get(destNode)?.distance || Infinity;
                const totalDistance = distanceToNeighbor + distanceFromNeighborToDest;
                
                if (totalDistance < bestDistance) {
                    bestDistance = totalDistance;
                    bestNextHop = neighbor.nodeId;
                    hasChanges = true;
                }
            }
            
            if (hasChanges && (bestDistance !== currentInfo.distance || bestNextHop !== currentInfo.fromNodeId)) {
                nodeTable.vector.set(destNode, { distance: bestDistance, fromNodeId: bestNextHop });
            }
        }
        
        const tableAfter = new Map<string, DistanceToNode>();
        nodeTable.vector.forEach((value, key) => {
            tableAfter.set(key, { distance: value.distance, fromNodeId: value.fromNodeId });
        });
        
        steps.push({
            stepNumber: stepNumber++,
            updatingNode: currentNodeId,
            nodeTableBefore: tableBefore,
            nodeTableAfter: tableAfter,
            changesDetected: hasChanges,
            description: `Actualizando tabla del nodo ${currentNodeId}`
        });
        
        processedNodes.add(currentNodeId);
        
        // If changes were made, add neighbors to process queue
        if (hasChanges) {
            for (const neighbor of neighborTables) {
                if (!processedNodes.has(neighbor.nodeId) && !nodesToProcess.includes(neighbor.nodeId)) {
                    nodesToProcess.push(neighbor.nodeId);
                }
            }
        }
    }
    
    return { tables: nodeTables, steps };
}

function displayCurrentStep(step: DistanceVectorStep) {
  const stepDisplay = document.getElementById('currentStepDisplay');
  if (stepDisplay) {
    stepDisplay.innerHTML = `
      <h3>Paso ${step.stepNumber} - ${step.description}</h3>
      <div class="step-tables">
        <div class="table-comparison">
          <div class="before-after-container">
            <div class="table-section">
              <h4>Tabla ANTES - Nodo ${step.updatingNode}</h4>
              <table class="distance-table mini-table">
                <thead>
                  <tr>
                    <th>Destino</th>
                    <th>Por Medio de</th>
                    <th>Distancia</th>
                  </tr>
                </thead>
                <tbody>
                  ${Array.from(step.nodeTableBefore.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([dest, info]) => `
                    <tr>
                      <td>${dest}</td>
                      <td>${info.fromNodeId}</td>
                      <td>${info.distance === Infinity ? '∞' : info.distance}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
            <div class="arrow-section">
              <div class="arrow">${step.changesDetected ? '➜ CAMBIOS' : '➜ SIN CAMBIOS'}</div>
            </div>
            <div class="table-section">
              <h4>Tabla DESPUÉS - Nodo ${step.updatingNode}</h4>
              <table class="distance-table mini-table">
                <thead>
                  <tr>
                    <th>Destino</th>
                    <th>Por Medio de</th>
                    <th>Distancia</th>
                  </tr>
                </thead>
                <tbody>
                  ${Array.from(step.nodeTableAfter.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([dest, info]) => {
                    const beforeInfo = step.nodeTableBefore.get(dest);
                    const hasChanged = beforeInfo && (beforeInfo.distance !== info.distance || beforeInfo.fromNodeId !== info.fromNodeId);
                    return `
                      <tr ${hasChanged ? 'class="changed-row"' : ''}>
                        <td>${dest}</td>
                        <td>${info.fromNodeId}</td>
                        <td>${info.distance === Infinity ? '∞' : info.distance}</td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

function displayDistanceVectorSteps(steps: DistanceVectorStep[]) {
  const tableElement = document.getElementById('distanceVectorSteps');
  if (tableElement) {
    tableElement.innerHTML = `
      <h3>Resumen Completo del Algoritmo Vector Distancia</h3>
      <div class="steps-container">
        ${steps.map(step => `
          <div class="step-iteration">
            <h4>Paso ${step.stepNumber} - ${step.description} ${step.changesDetected ? '(Cambios detectados)' : '(Sin cambios)'}</h4>
            <div class="step-summary">
              <p><strong>Nodo actualizado:</strong> ${step.updatingNode}</p>
              <p><strong>Cambios:</strong> ${step.changesDetected ? 'Sí' : 'No'}</p>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }
}