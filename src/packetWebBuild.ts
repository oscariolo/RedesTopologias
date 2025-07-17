import { setCanvas, drawTopology, setUseLetterIds } from "./topologyDrawer";
import { Topology, TopologyEdge, TopologyNode } from "./topology";

const canvas = document.getElementById('graphCanvas') as HTMLCanvasElement;
setCanvas(canvas);
setUseLetterIds(true); // Use letter IDs for this module

const tablesContainer = document.getElementById('tablesContainer') as HTMLDivElement;
const graphButton = document.getElementById('graphButton') as HTMLButtonElement;
const generateNodesBtn = document.getElementById('generateNodesBtn') as HTMLButtonElement;
const clearButton = document.getElementById('clearButton') as HTMLButtonElement;
const nodeCountInput = document.getElementById('nodeCountInput') as HTMLInputElement;

let nodes: TopologyNode[] = [];

// Generate node position using circular layout to avoid overlaps
function generateNodePositions(nodeCount: number): TopologyNode[] {
    const nodes: TopologyNode[] = [];
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) * 0.7; // Use 70% of available space
    
    for (let i = 0; i < nodeCount; i++) {
        const angle = (2 * Math.PI * i) / nodeCount;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        const nodeId = String.fromCharCode(65 + i); // A, B, C, D...
        
        nodes.push({
            id: nodeId,
            x: x,
            y: y
        });
    }
    
    return nodes;
}

function generateNodeTables() {
    const nodeCount = parseInt(nodeCountInput.value);
    if (nodeCount < 2 || nodeCount > 26) {
        alert('Please enter a number between 2 and 26');
        return;
    }
    
    nodes = generateNodePositions(nodeCount);
    tablesContainer.innerHTML = ''; // Clear existing tables

    nodes.forEach(sourceNode => {
        const tableContainer = document.createElement('div');
        tableContainer.className = 'node-table-container';
        
        const table = document.createElement('table');
        table.className = 'distance-table';
        table.id = `table-${sourceNode.id}`;
        
        const caption = table.createCaption();
        caption.textContent = `Routing Table for Node ${sourceNode.id}`;
        caption.style.fontWeight = 'bold';
        caption.style.marginBottom = '10px';
        
        const thead = table.createTHead();
        const headerRow = thead.insertRow();
        headerRow.innerHTML = '<th>Connect to Node</th><th>Weight</th><th>Enable Connection</th>';

        const tbody = table.createTBody();
        nodes.forEach(destinationNode => {
            if (sourceNode.id !== destinationNode.id) {
                const row = tbody.insertRow();
                const cellDestination = row.insertCell();
                const cellWeight = row.insertCell();
                const cellEnable = row.insertCell();
                
                cellDestination.textContent = destinationNode.id;
                
                const weightInput = document.createElement('input');
                weightInput.type = 'number';
                weightInput.min = '1';
                weightInput.max = '999';
                weightInput.value = '1';
                weightInput.id = `weight-${sourceNode.id}-${destinationNode.id}`;
                weightInput.disabled = true;
                cellWeight.appendChild(weightInput);
                
                const enableCheckbox = document.createElement('input');
                enableCheckbox.type = 'checkbox';
                enableCheckbox.id = `enable-${sourceNode.id}-${destinationNode.id}`;
                enableCheckbox.addEventListener('change', () => {
                    weightInput.disabled = !enableCheckbox.checked;
                    // Sync with the reverse connection
                    const reverseCheckbox = document.getElementById(`enable-${destinationNode.id}-${sourceNode.id}`) as HTMLInputElement;
                    const reverseWeight = document.getElementById(`weight-${destinationNode.id}-${sourceNode.id}`) as HTMLInputElement;
                    if (reverseCheckbox && reverseWeight) {
                        reverseCheckbox.checked = enableCheckbox.checked;
                        reverseWeight.disabled = !enableCheckbox.checked;
                        if (enableCheckbox.checked) {
                            reverseWeight.value = weightInput.value;
                        }
                    }
                });
                
                weightInput.addEventListener('input', () => {
                    // Sync weight with reverse connection
                    const reverseWeight = document.getElementById(`weight-${destinationNode.id}-${sourceNode.id}`) as HTMLInputElement;
                    if (reverseWeight) {
                        reverseWeight.value = weightInput.value;
                    }
                });
                
                cellEnable.appendChild(enableCheckbox);
            }
        });

        tableContainer.appendChild(table);
        tablesContainer.appendChild(tableContainer);
    });
}

function generateTopology() {
    if (nodes.length === 0) {
        alert('Please generate node tables first');
        return;
    }
    
    const edges: TopologyEdge[] = [];
    const processedPairs = new Set<string>();

    nodes.forEach(sourceNode => {
        nodes.forEach(destinationNode => {
            if (sourceNode.id === destinationNode.id) return;
            
            // Create a unique key for the pair, sorted to avoid duplicates
            const pairKey = [sourceNode.id, destinationNode.id].sort().join('-');
            if (processedPairs.has(pairKey)) return;
            
            const enableCheckbox = document.getElementById(`enable-${sourceNode.id}-${destinationNode.id}`) as HTMLInputElement;
            const weightInput = document.getElementById(`weight-${sourceNode.id}-${destinationNode.id}`) as HTMLInputElement;
            
            if (enableCheckbox && enableCheckbox.checked && weightInput && weightInput.value) {
                edges.push({
                    from: sourceNode.id,
                    to: destinationNode.id,
                    weight: parseInt(weightInput.value, 10)
                });
            }
            
            processedPairs.add(pairKey);
        });
    });

    const topology = new Topology(nodes, edges);
    drawTopology(topology);
}

function clearCanvas() {
    nodes = [];
    tablesContainer.innerHTML = '';
    const ctx = canvas.getContext('2d');
    if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
}

generateNodesBtn.addEventListener('click', generateNodeTables);
graphButton.addEventListener('click', generateTopology);
clearButton.addEventListener('click', clearCanvas);

window.addEventListener('load', () => {
    const canvas = document.getElementById('graphCanvas') as HTMLCanvasElement;
    if (!canvas) {
        console.error("Canvas element not found");
        return;
    }
    
    // Set canvas size
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    
    // Handle window resize
    window.addEventListener('resize', () => {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
        // Regenerate node positions if nodes exist
        if (nodes.length > 0) {
            const nodeCount = nodes.length;
            nodes = generateNodePositions(nodeCount);
        }
    });
});