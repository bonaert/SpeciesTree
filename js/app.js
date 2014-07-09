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

    graph.addNode({
        id: rootID,
        label: tree.getRoot()['scientificName'],
        size: 8,
        x: 5,
        y: 1,
        color: '#09c614'
    });

    tree.fetchChildren(function (child) {
        var childID = child['key'].toString();

        // Add child node
        graph.addNode({
            id: childID,
            label: child['scientificName'],
            size: 8,
            x: graph.nodes().length,
            y: 15,
            color: '#09c614'
        });

        // Add edge between root and child
        graph.addEdge({
            id: rootID + '-' + childID,
            source: rootID,
            target: childID
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
        x: 4.5,
        y: 1,
        size: 8,
        color: '#09c614'
    });



    tree.fetchChildren(function (child) {
        div.innerHTML = div.innerHTML + '<br>' + child['scientificName'] + '<br>';
        var childID = child['key'].toString();
        s.graph.addNode({
            id: childID,
            label: child['scientificName'],
            size: 8,
            x: childID,
            y: 3,
            color: '#09c614'
        });

        s.graph.addEdge({
            id: rootID + '-' + childID,
            source: rootID,
            target: childID
        });

        console.log(s.graph.nodes(rootID));
        div.innerHTML = div.innerHTML + JSON.stringify(s.graph.nodes(rootID));

        // Finally, let's ask our sigma instance to refresh:
        s.refresh();
    });

    return s;
}

var tree = new Tree();
var s = buildInitialGraph(tree);
