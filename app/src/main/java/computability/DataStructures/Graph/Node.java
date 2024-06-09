package main.java.computability.DataStructures.Graph;
import java.util.ArrayList;
import java.util.List;

/**
 * A node in a graph.
 */
public class Node {
    private String name;
    private List<Edge> edges;

    /**
     * Create a new node with the given name.
     * @param name The name of the node.
     */
    public Node(String name) {
        this.name = name;
        this.edges = new ArrayList<>();
    }

    /**
     * Add an edge to the node.
     * @return The edge that was added.
     */
    public String getName() {
        return name;
    }

    /**
     * Get the edges that are connected to this node.
     * @return The edges that are connected to this node.
     */
    public List<Edge> getEdges() {
        return edges;
    }

    /**
     * Add an edge to the node.
     * @param edge The edge to add.
     */
    public void addEdge(Edge edge) {
        edges.add(edge);
    }

    /**
     * Remove an edge from the node.
     * @param edge The edge to remove.
     */
    public void removeEdge(Edge edge) {
        edges.remove(edge);
    }
}