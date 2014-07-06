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

var s = new sigma({
    container: 'dataContainer',
    sideMargin: 00
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

var div = document.getElementById('divID');

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





function parseData(jsonPath) {
    sigma.parsers.json(jsonPath, {
        container: 'dataContainer',
        settings: {
            defaultNodeColor: '#d9443c'
        }
    });
}

//parseData('../data/data.json');

//var url = "http://api.gbif.org/v0.9/species/5231190"
//fetchData(url, processData);
//url = "http://api.gbif.org/v0.9/species/6"
//fetchData(url, processData);





//var request = createCORSRequest("get", );
//if (request) {
//   request.onload = function () {

//   };
//request.onreadystatechange = handler;
//   request.send();
//}

var base = {
    "root": [
    "Animalia",
    "Archeaea",
    "Bacteria",
    "Chromista",
    "Fungi",
    "Plantae",
    "Protozoa",
    "Viruses"
    ]
}

var baseUrl = "http://www.catalogueoflife.org/col/webservice?name=";

function httpGet(theUrl) {
    var xmlHttp = null;

    xmlHttp = new XMLHttpRequest();
    xmlHttp.open("GET", theUrl, false);
    xmlHttp.send(null);
    return xmlHttp.responseText;
}

//data = httpGet(baseUrl + base["root"][0]);
