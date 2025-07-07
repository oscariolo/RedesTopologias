import { setCanvas, onTopologyUpdate, drawTopology, getDrawnNodes } from "./topologyDrawer";
import { Topology, TopologyEdge } from "./topology";

const canvas = document.getElementById('graphCanvas') as HTMLCanvasElement;
setCanvas(canvas);

const tablesContainer = document.getElementById('tablesContainer') as HTMLDivElement;
const graphButton = document.getElementById('graphButton') as HTMLButtonElement;

onTopologyUpdate(updateTables);

function updateTables() { // Removed unused 'topology' parameter
    tablesContainer.innerHTML = ''; // Clear existing tables
    const nodes = getDrawnNodes();

    nodes.forEach(sourceNode => {
        const table = document.createElement('table');
        table.id = `table-${sourceNode.id}`;
        const caption = table.createCaption();
        caption.textContent = `Tabla de enrutamiento ${sourceNode.id}`;
        const thead = table.createTHead();
        const headerRow = thead.insertRow();
        headerRow.innerHTML = '<th>Destination</th><th>Weight</th>';

        const tbody = table.createTBody();
        nodes.forEach(destinationNode => {
            if (sourceNode.id !== destinationNode.id) {
                const row = tbody.insertRow();
                row.innerHTML = `<td>${destinationNode.id}</td><td><input type="number" min="1" id="weight-${sourceNode.id}-${destinationNode.id}"></td>`;
            }
        });

        tablesContainer.appendChild(table);
    });

    // Add event listeners for bidirectional weights
    const processedPairs = new Set<string>(); // Keep track of processed pairs

    nodes.forEach(sourceNode => {
        nodes.forEach(destinationNode => {
            if (sourceNode.id === destinationNode.id) return;

            // Create a unique key for the pair, sorted to be order-independent
            const pairKey = [sourceNode.id, destinationNode.id].sort().join('-');

            if (!processedPairs.has(pairKey)) {
                const weightInput1 = document.getElementById(`weight-${sourceNode.id}-${destinationNode.id}`) as HTMLInputElement;
                const weightInput2 = document.getElementById(`weight-${destinationNode.id}-${sourceNode.id}`) as HTMLInputElement;

                if (weightInput1 && weightInput2) {
                    weightInput1.addEventListener('input', () => {
                        weightInput2.value = weightInput1.value;
                    });
                    weightInput2.addEventListener('input', () => {
                        weightInput1.value = weightInput2.value;
                    });
                }
                processedPairs.add(pairKey); // Mark this pair as processed
            }
        });
    });
}

graphButton.addEventListener('click', () => {
    const nodes = getDrawnNodes();
    const edges: TopologyEdge[] = [];

    nodes.forEach(sourceNode => {
        nodes.forEach(destinationNode => {
            if (sourceNode.id !== destinationNode.id) {
                const weightInput = document.getElementById(`weight-${sourceNode.id}-${destinationNode.id}`) as HTMLInputElement;
                if (weightInput && weightInput.value) {
                    edges.push({
                        from: sourceNode.id,
                        to: destinationNode.id,
                        weight: parseInt(weightInput.value, 10)
                    });
                }
            }
        });
    });

    const topology = new Topology(nodes, edges);
    drawTopology(topology, edges);
});

window.addEventListener('load', () => {

    const canvas = document.getElementById('graphCanvas') as HTMLCanvasElement;
    if (!canvas) {
        console.error("Canvas element not found");
        return;
    }
});