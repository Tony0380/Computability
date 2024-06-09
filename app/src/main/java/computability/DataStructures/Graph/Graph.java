package computability.DataStructures.Graph;
import java.util.ArrayList;
import java.util.List;
public abstract class Graph {

    private List<Node> nodes;
    private List<Edge> edges;

    /**
     * Create a new graph.
     */
    public Graph() {
        this.nodes = new ArrayList<>();
        this.edges = new ArrayList<>();
    }

    /**
     * Get the nodes in the graph.
     * @return The nodes in the graph.
     */
    public List<Node> getNodes() {
        return nodes;
    }

    /**
     * Get the edges in the graph.
     * @return The edges in the graph.
     */
    public List<Edge> getEdges() {
        return edges;
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

    /**
     * Add an edge to the graph.
     * @param edge The edge to add.
     */
    public void addEdge(Edge edge) {
        edges.add(edge);
    }

    /**
     * Remove an edge from the graph.
     * @param edge The edge to remove.
     */
    public void removeEdge(Edge edge) {
        edges.remove(edge);
    }

    /**
     * Get the edges that are connected to the given node.
     * @param node The node to get the edges for.
     * @return The edges that are connected to the given node.
     */
    public List<Edge> getEdgesForNode(Node node) {
        List<Edge> edgesForNode = new ArrayList<>();
        for (Edge edge : edges) {
            if (edge.getStart() == node || edge.getEnd() == node) {
                edgesForNode.add(edge);
            }
        }
        return edgesForNode;
    }

    /**
     * Get the nodes that are connected to the given node by an edge.
     * @param node The node to get the neighbors for.
     * @return The nodes that are connected to the given node by an edge.
     */
    public List<Node> getNeighborsForNode(Node node) {
        List<Node> neighbors = new ArrayList<>();
        for (Edge edge : getEdgesForNode(node)) {
            neighbors.add(edge.getOtherNode(node));
        }
        return neighbors;
    }

    /**
     * Get the edge between the given nodes.
     * @param start The start node of the edge.
     * @param end The end node of the edge.
     * @return The edge between the given nodes, or null if no such edge exists.
     */
    public Edge getEdgeBetweenNodes(Node start, Node end) {
        for (Edge edge : edges) {
            if ((edge.getStart() == start && edge.getEnd() == end) || (edge.getStart() == end && edge.getEnd() == start)) {
                return edge;
            }
        }
        return null;
    }

    /**
     * Get the degree of the given node.
     * @param node The node to get the degree for.
     * @return The degree of the given node.
     */
    public int getDegreeForNode(Node node) {
        return getEdgesForNode(node).size();
    }

    /**
     * Get the number of nodes in the graph.
     * @return The number of nodes in the graph.
     */
    public int getNumberOfNodes() {
        return nodes.size();
    }

    /**
     * Get the number of edges in the graph.
     * @return The number of edges in the graph.
     */
    public int getNumberOfEdges() {
        return edges.size();
    }

    /**
     * Check if the graph is connected.
     * @return True if the graph is connected, false otherwise.
     */
    public boolean isConnected() {
        return getNumberOfNodes() > 0 && getNumberOfEdges() >= getNumberOfNodes() - 1;
    }

    /**
     * Check if the graph is complete.
     * @return True if the graph is complete, false otherwise.
     */
    public boolean isComplete() {
        for (Node node : nodes) {
            if (getDegreeForNode(node) != getNumberOfNodes() - 1) {
                return false;
            }
        }
        return true;
    }
}
