import { TopologyNode, TopologyEdge, Topology } from "./topology"
import { drawTopology } from "./topologyDrawer"


class NodeTable{
    id: number;
    nodeTable: Map<number,Array<number>> = new Map(); 
    
    constructor(id: number) {
        this.id = id;
        this.nodeTable.set(id, []); //tabla inicializa con sus conocidos
    }

    
    //Dado la lista de aristas construye la tabla con sus vecinos respectivos (con distancia infinita de los demás, solo recupera de su inmediato vecino)
    constructTableFromNeighbors(aristas:TopologyEdge[]): void {
        for(const edge of aristas){
            if(edge.from === this.id){
                if(!this.nodeTable.has(this.id)){
                    this.nodeTable.set(this.id, [0]); //agrega el nodo inicial con peso 0 porque es el mismo
                }
                if(!this.nodeTable.has(edge.to)){
                    // this.nodeTable.set(edge.to, [...Array]); //agrega el vecino y su peso
                }
            }
        }
        
        
    }


    
    

}