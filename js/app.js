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
    searchUrl = "http://api.gbif.org/v0.9/species/";
    var urls = [];
    for (var i = 0; i < species.length; i++) {
        url = encodeURI(searchUrl + species[i]);
        urls.push(url)
    }
    return urls;
}

function getAllData(urls, callback) {
    for (var i = 0; i < urls.length; i++) {
        fetchData(urls[i], function (response) {
            parsedData = JSON.parse(response);
            callback(parsedData);
        });
    }
}

function getChildrenIDs(nodeID, callback) {
    var url = "http://api.gbif.org/v0.9/species/"
    var completeUrl = url + id + '/children';
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

function updateGraphWithChildren(fatherID, childrenIDs) {
    var div = document.getElementById('divID');
    div.innerHTML = div.innerHTML + JSON.stringify(childrenIDs);
}

var div = document.getElementById('divID');
var s = new sigma({
    container: 'dataContainer',
    sideMargin: 00
});

s.bind('clickNode', function (e) {
    var nodeID = e.data.node.id;
    openSpeciesWindow(nodeID);
    getChildrenIDs(nodeID, function (ids) {
        updateGraphWithChildren(nodeID, ids);
    });

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
data = getAllData(urls, function (specie) {
    div.innerHTML = div.innerHTML + '<br>' + specie['scientificName'] + '<br>';
    id = specie['key'].toString();
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

    // Finally, let's ask our sigma instance to refresh:
    s.refresh();
});
