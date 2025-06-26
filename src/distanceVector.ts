import { Topology, TopologyNode, TopologyEdge } from "./topology";
import { getCurrentTopology, drawTopology, setCanvas } from "./topologyDrawer";

/**
 * Represents the stored distances of a single node to all other nodes.
 */
class DistanceTable {
  // distanceMap[nodeId] = cost from this node to nodeId
  distanceMap: Map<number, number> = new Map();

  constructor(nodeCount: number, myId: number) {
    // Initialize distances to Infinity except for self (0).
    for (let i = 0; i < nodeCount; i++) {
      this.distanceMap.set(i, i === myId ? 0 : Infinity);
    }
  }
}

/**
 * Manages the step-by-step logic of the distance vector algorithm.
 */
class DistanceVectorAlgorithm {
  tables: DistanceTable[] = [];
  nodes: TopologyNode[] = [];
  edges: TopologyEdge[] = [];
  stable = false;

  /**
   * Initializes tables for each node in the topology.
   */
  init() {
    const topology = getCurrentTopology();
    this.nodes = topology.nodes;
    this.edges = topology.edges;
    this.tables = [];

    const nodeCount = this.nodes.length;
    this.nodes.forEach((node) => {
      const table = new DistanceTable(nodeCount, node.id);
      // Set direct edge distances
      this.edges.forEach((edge) => {
        if (edge.from === node.id) {
          table.distanceMap.set(edge.to, edge.weight);
        }
        if (edge.to === node.id) {
          table.distanceMap.set(edge.from, edge.weight);
        }
      });
      this.tables.push(table);
    });
    this.stable = false;
    this.renderTables();
  }

  /**
   * Executes one iteration of the distance vector update.
   * Each node updates distances based on neighbors' tables.
   */
  step() {
    if (this.stable) return; // No more changes

    let updated = false;
    // Try to update each node's table
    for (let i = 0; i < this.nodes.length; i++) {
      const myTable = this.tables[i];
      const myId = this.nodes[i].id;
      // Check neighbors (edges from or to this node)
      this.edges.forEach((edge) => {
        if (edge.from === myId || edge.to === myId) {
          const neighborId = edge.from === myId ? edge.to : edge.from;
          // Compare route through neighbor to all other nodes
          this.tables[neighborId].distanceMap.forEach((neighborDist, otherNode) => {
            const directToNeighbor = myTable.distanceMap.get(neighborId) || Infinity;
            const currentDist = myTable.distanceMap.get(otherNode) || Infinity;
            const newDist = directToNeighbor + neighborDist;
            if (newDist < currentDist) {
              myTable.distanceMap.set(otherNode, newDist);
              updated = true;
            }
          });
        }
      });
    }
    // If no updates, we are stable
    this.stable = !updated;
    this.renderTables();
  }

  /**
   * Injects the distance tables into the #tablesContainer element.
   */
  renderTables() {
    const container = document.getElementById("tablesContainer");
    if (!container) return;

    container.innerHTML = "";
    this.tables.forEach((table, i) => {
      const nodeId = this.nodes[i].id;
      const tableDiv = document.createElement("div");
      tableDiv.className = "distance-table";
      tableDiv.innerHTML = `
        <h2>Node ${nodeId}</h2>
        <table>
          <tr>
            <th>Dest</th>
            ${this.nodes.map(n => `<th>${n.id}</th>`).join("")}
          </tr>
          <tr>
            <td>Cost</td>
            ${
              this.nodes
                .map(n => {
                  const dist = table.distanceMap.get(n.id);
                  return `<td>${dist === Infinity ? "∞" : dist}</td>`;
                })
                .join("")
            }
          </tr>
        </table>
      `;
      container.appendChild(tableDiv);
    });
  }
}

// Create a single instance to manage the algorithm
const dvAlgorithm = new DistanceVectorAlgorithm();

/**
 * Attaches to the "Play" button to perform repeated steps until stable.
 */
window.addEventListener("load", () => {
  const canvas = document.getElementById("graphCanvas") as HTMLCanvasElement;
  setCanvas(canvas);
  dvAlgorithm.init();
  drawTopology(getCurrentTopology());

  const playBtn = document.getElementById("runDistanceVector");
  if (!playBtn) return;

  playBtn.addEventListener("click", () => {
    // Continuously step until stable
    const interval = setInterval(() => {
      if (dvAlgorithm.stable) {
        clearInterval(interval);
      } else {
        dvAlgorithm.step();
        drawTopology(getCurrentTopology());
      }
    }, 1000);
  });
});
