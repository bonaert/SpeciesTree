function Tree() {
    var self = this;
    this.levels = ['kingdom', 'phylum', 'order', 'family', 'genus', 'species'];
    this.level = 0;

    this.rootID = 0;
    this.root = {
        'key': 0,
        'scientificName': 'Life'
    };

    this.children = {};
    this.childrenIDs = [];

    this._buildTreeRoot = function () {
        return {
            'key': 0,
            'scientificName': 'Life'
        };
    };

    this.getRootID = function () {
        return this.rootID;
    };

    this.getRoot = function () {
        return this.root;
    };

    this.getNumChildren = function () {
        return this.childrenIDs.length;
    };

    this.setRootToChild = function (childID) {
        this.rootID = childID;
        this.root = this.children[childID];
        this.children = {};
        this.childrenID = {};
    };

    this.fetchChildren = function (callback) {
        this._fetchChildrenIDs(function (childrenIDs) {
            self.childrenIDs = childrenIDs;
            self._fetchChildrenData(callback);
        });
    };

    this._fetchChildrenIDs = function (callback) {
        if (this.rootID === 0) {
            callback([1, 2, 3, 4, 5, 6, 7, 8]);
            return;
        }

        var url = "http://api.gbif.org/v0.9/species/";
        var completeUrl = url + this.rootID.toString() + '/children';

        this._fetchData(completeUrl, function (data) {
            var childrenIDs = [];
            console.log(data);

            var parsedData = JSON.parse(data);

            var results = parsedData['results'];
            for (var i = 0; i < results.length; i++) {
                var id = results[i]["key"];
                childrenIDs.push(id);
            }

            callback(childrenIDs);
        });
    };

    this._fetchChildrenData = function (callback) {
        var urls = this._buildUrls(this.childrenIDs);
        this._getAllData(urls, function (childData) {
            var child = JSON.parse(childData);

            // Convert string ID to integer ID
            child['key'] = parseInt(child['key']);

            self.children[child['key']] = child;
            callback(child);
        });
    };


    this._buildUrls = function (IDs) {
        var searchUrl = "http://api.gbif.org/v0.9/species/";
        var urls = [];
        for (var i = 0; i < IDs.length; i++) {
            var url = encodeURI(searchUrl + IDs[i]);
            urls.push(url)
        }
        return urls;
    };

    this._getAllData = function (urls, callback) {
        for (var i = 0; i < urls.length; i++) {
            this._fetchData(urls[i], function (data) {
                callback(data);
            });
        }
    };

    this._fetchData = function (url, callback) {
        var request = this._createCORSRequest("get", url);
        if (request) {
            request.onload = function () {
                var data = request.response;
                callback(data);
            };
            request.send();
        }
    };

    this._createCORSRequest = function (method, url) {
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
    };
}
