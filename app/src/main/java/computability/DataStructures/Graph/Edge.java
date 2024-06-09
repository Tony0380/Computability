package computability.DataStructures.Graph;

public abstract class Edge {

    private Node start;
    private Node end;

    /**
     * Create a new edge between the given nodes.
     * @param start The start node of the edge.
     * @param end The end node of the edge.
     */
    public Edge(Node start, Node end) {
        this.start = start;
        this.end = end;
    }

    /**
     * Get the start node of the edge.
     * @return The start node of the edge.
     */
    public Node getStart() {
        return start;
    }

    /**
     * Get the end node of the edge.
     * @return The end node of the edge.
     */
    public Node getEnd() {
        return end;
    }

    /**
     * Get the weight of the edge.
     * @return The weight of the edge.
     */
    public abstract double getWeight();

    /**
     * Set the weight of the edge.
     * @param weight The weight of the edge.
     */
    public abstract void setWeight(double weight);

    /**
     * Get the other node connected to the given node by this edge.
     * @param node The node to get the other node for.
     * @return The other node connected to the given node by this edge.
     */
    public Node getOtherNode(Node node) {
        if (node == start) {
            return end;
        } else if (node == end) {
            return start;
        } else {
            throw new IllegalArgumentException("Node is not connected by this edge.");
        }
    }

    /**
     * Get the string representation of the edge.
     * @return The string representation of the edge.
     */
    @Override
    public String toString() {
        return start.getName() + " -> " + end.getName() + " (" + getWeight() + ")";
    }
}
