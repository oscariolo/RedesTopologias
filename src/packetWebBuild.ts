import { setCanvas } from "./topologyDrawer";



const canvas = document.getElementById('graphCanvas') as HTMLCanvasElement;
setCanvas(canvas);
window.addEventListener('load', () => {

    const canvas = document.getElementById('graphCanvas') as HTMLCanvasElement;
    if (!canvas) {
        console.error("Canvas element not found");
        return;
    }
   



});