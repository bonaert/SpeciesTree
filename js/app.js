function openSpeciesWindow(nodeId) {
    var win = window.open('http://www.gbif.org/species/' + nodeId.toString(), '_blank');
    if (win) {
        //Browser has allowed it to be opened
        win.focus();
    } else {
        //Broswer has blocked it
        alert('Please allow popups for this site');
    }
}

function expandSubtree(s, tree, childID) {
    tree.setRootToChild(childID);
    var rootID = tree.getRootID().toString();

    var graph = s.graph;
    graph.clear();
    s.refresh();

    graph.addNode({
        id: rootID,
        label: tree.getRoot()['scientificName'],
        size: 3,
        x: 5,
        y: 5,
        color: '#c69309'
    });

    tree.fetchChildren(function (child, numChildren) {
        var childNum = graph.nodes().length - 1;
        var childID = child['key'].toString();

        var xPos = 5 + 5 * Math.cos(2 * Math.PI * childNum / numChildren);
        var yPos = 5 + 5 * Math.sin(2 * Math.PI * childNum / numChildren);

        // Add child node
        graph.addNode({
            id: childID,
            label: child['scientificName'],
            size: 3,
            x: xPos,
            y: yPos,
            color: '#09c614'
        });

        // Add edge between root and child
        graph.addEdge({
            id: rootID + '-' + childID,
            source: rootID,
            target: childID,
            edgeColor: 'target'
        });


        // Finally, let's ask our sigma instance to refresh:
        // This will lead to a refresh each time a new node is added, which may
        // be excessive. Must measure, and then find if it's necessary to optimize by
        // adding everything, and, at the end, refresh the graph (once for the whole process)
        s.refresh();
    });
}

function buildInitialGraph(tree) {
    var div = document.getElementById('divID');
    var s = new sigma({
        container: 'dataContainer',
        sideMargin: 0
    });

    s.bind('clickNode', function (node) {
        var nodeID = parseInt(node.data.node.id);
        //openSpeciesWindow(nodeID);

        if (nodeID === tree.getRootID()) {
            expandSuperTree(s, tree, nodeID);
        } else {
            expandSubtree(s, tree, nodeID);
        }
    });

    console.log(tree);
    var rootID = tree.getRootID().toString();
    s.graph.addNode({
        // Main attributes:
        id: rootID,
        label: tree.getRoot()['scientificName'],
        // Display attributes:
        x: 5,
        y: 5,
        size: 3,
        color: '#c69309'
    });



    tree.fetchChildren(function (child, numChildren) {
        var childNum = s.graph.nodes().length;
        var childID = child['key'].toString();

        var xPos = 5 + 5 * Math.cos(2 * Math.PI * childNum / numChildren);
        var yPos = 5 + 5 * Math.sin(2 * Math.PI * childNum / numChildren);

        // Add child node
        s.graph.addNode({
            id: childID,
            label: child['scientificName'],
            size: 3,
            x: xPos,
            y: yPos,
            color: '#09c614'
        });

        // Add edge between the root and the child
        s.graph.addEdge({
            id: rootID + '-' + childID,
            source: rootID,
            target: childID,
            edgeColor: 'target'
        });

        // Finally, let's ask our sigma instance to refresh:
        s.refresh();
    });

    return s;
}

var tree = new Tree();
var s = buildInitialGraph(tree);
