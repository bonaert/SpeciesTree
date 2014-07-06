function createCORSRequest(method, url) {
    var xhr = new XMLHttpRequest();
    if ("withCredentials" in xhr) {
        xhr.open(method, url, true);
    } else if (typeof XDomainRequest != "undefined") {
        xhr = new XDomainRequest();
        xhr.open(method, url);
    } else {
        xhr = null;
    }
    return xhr;
}

function fetchData(url, processData) {
    var request = createCORSRequest("get", url);
    if (request) {
        request.onload = function () {
            data = request.response;
            processData(data);
        };
        request.send();
    }
}

function getAllUrls(species) {
    var searchUrl = "http://api.gbif.org/v0.9/species/";
    var urls = [];
    for (var i = 0; i < species.length; i++) {
        var url = encodeURI(searchUrl + species[i]);
        urls.push(url)
    }
    return urls;
}

function getAllData(urls, callback) {
    for (var i = 0; i < urls.length; i++) {
        fetchData(urls[i], function (response) {
            var parsedData = JSON.parse(response);
            callback(parsedData);
        });
    }
}

function getChildrenIDs(nodeID, callback) {
    var url = "http://api.gbif.org/v0.9/species/"
    var completeUrl = url + nodeID + '/children';
    fetchData(completeUrl, function (data) {
        var ids = []
        var parsedData = JSON.parse(data);
        var results = parsedData['results'];
        for (var i = 0; i < results.length; i++) {
            var id = results[i]["key"];
            ids.push(id);
        }
        callback(ids);
    });
}

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

function expandSubtree(s, fatherID) {
    getChildrenIDs(fatherID, function (childrenIDs) {
        updateGraphWithChildren(s, fatherID, childrenIDs);
    });
}

function updateGraphWithChildren(sig, fatherID, childrenIDs) {
    var div = document.getElementById('divID');
    div.innerHTML = div.innerHTML + JSON.stringify(childrenIDs);
    addRootNodeWithChildrenConnected(sig, fatherID, childrenIDs);
}

function addRootNodeWithChildrenConnected(sig, rootID, childrenID) {
    var graph = sig.graph;
    var root = graph.nodes(rootID);
    var scientificName = root['label'];
    console.log(root);

    graph.clear();

    // Add root node
    graph.addNode({
        id: rootID,
        label: scientificName,
        size: 8,
        x: childrenID.length / 2,
        y: 1,
        color: '#09c614'
    });

    var urls = getAllUrls(childrenID);

    getAllData(urls, function (child) {

        div.innerHTML = div.innerHTML + '<br>' + child['scientificName'] + '<br>';

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

function buildInitialGraph() {
    var div = document.getElementById('divID');
    var s = new sigma({
        container: 'dataContainer',
        sideMargin: 00
    });

    s.bind('clickNode', function (e) {
        var nodeID = e.data.node.id;
        //openSpeciesWindow(nodeID);
        expandSubtree(s, nodeID);
    });

    s.graph.addNode({
        // Main attributes:
        id: 'n0',
        label: 'Life',
        // Display attributes:
        x: 4.5,
        y: 1,
        size: 8,
        color: '#09c614'
    });



    species = [1, 2, 3, 4, 5, 6, 7, 8]
    urls = getAllUrls(species);
    getAllData(urls, function (specie) {
        div.innerHTML = div.innerHTML + '<br>' + specie['scientificName'] + '<br>';
        var id = specie['key'].toString();
        s.graph.addNode({
            id: id,
            label: specie['scientificName'],
            size: 8,
            x: id,
            y: 3,
            color: '#09c614'
        });

        s.graph.addEdge({
            id: 'n0-' + id,
            source: 'n0',
            target: id
        });

        console.log(s.graph.nodes(id));
        div.innerHTML = div.innerHTML + JSON.stringify(s.graph.nodes(id));

        // Finally, let's ask our sigma instance to refresh:
        s.refresh();
    });

    return s;
}

var s = buildInitialGraph();
var div = document.getElementById('divID');
