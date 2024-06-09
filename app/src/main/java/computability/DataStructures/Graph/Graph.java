package computability.DataStructures.Graph;
import java.util.ArrayList;
import java.util.List;
public class Graph {

    private List<Node> nodes;

    /**
     * Create a new graph.
     */
    public Graph() {
        this.nodes = new ArrayList<>();
    }

    /**
     * Get the nodes in the graph.
     * @return The nodes in the graph.
     */
    public List<Node> getNodes() {
        return nodes;
    }

    /**
     * Add a node to the graph.
     * @param node The node to add.
     */
    public void addNode(Node node) {
        nodes.add(node);
    }

    /**
     * Remove a node from the graph.
     * @param node The node to remove.
     */
    public void removeNode(Node node) {
        nodes.remove(node);
    }
}
