// Extending jQuery.when
if (jQuery.when.all === undefined) {
    jQuery.when.all = function (deferreds) {
        var deferred = new jQuery.Deferred();

        $.when.apply(jQuery, deferreds).then(
            function () {
                deferred.resolve(Array.prototype.slice.call(arguments));
            },
            function () {
                deferred.fail(Array.prototype.slice.call(arguments));
            }
        );

        return deferred;
    }
}

function Tree() {
    var self = this;
    this.levels = ['kingdom', 'phylum', 'order', 'family', 'genus', 'species'];
    this.level = 0;

    this.rootID = 0;
    this.root = {
        'key': 0,
        'scientificName': 'Life'
    };

    this.basicChildrenInformation = {};
    this.completeChildrenInformation = {};
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

    this._getMaximumInformation = function (nodeID) {
        if (this.completeChildrenInformation.hasOwnProperty(nodeID)) {
            return this.completeChildrenInformation[nodeID];
        }
        return this.basicChildrenInformation[nodeID];
    };

    this.setRootToChild = function (childID) {
        this.rootID = childID;
        this.root = this._getMaximumInformation(childID);
        this.basicChildrenInformation = {};
        this.completeChildrenInformation = {};
        this.childrenIDs = [];
    };

    this._buildBasicChildrenInformationrray = function () {
        var result = [];
        for (var i = 0; i < self.childrenIDs.length; i++) {
            var id = self.childrenIDs[i];
            result.push(self.basicChildrenInformation[id]);
        }
        return result;
    }

    this.fetchBasicChildrenInformation = function (onSucess) {
        this._fetchBasicChildrenInformation(function (children) {
            self._processBasicChildrenInformationCallback(children);
            var infoArray = self._buildBasicChildrenInformationrray();
            onSucess(infoArray);
        })
    };

    this.fetchCompleteChildrenInformation = function (childID) {
        return;
    };


    this._processBasicChildrenInformationCallback = function (children) {
        self.basicChildrenInformation = {};
        self.completeChildrenInformation = {};
        self.childrenIDs = [];

        console.log(children);

        for (var i = 0; i < children.length; i++) {
            var child = children[i];

            // Convert string ID to integer ID
            // Replace key as id in child object, for consistency
            child.id = parseInt(child.key);
            delete child.key

            self.childrenIDs.push(child.id);
            self.basicChildrenInformation[child.id] = child;
        }
    }

    this._fetchRootNodesBasicInformation = function (callback) {
        var request = $.getJSON('data/data.json', function (data) {
            callback(data);
        });
    }

    this._fetchBasicChildrenInformation = function (callback) {
        if (this.rootID === 0) {
            console.info("Fetch local info");
            this._fetchRootNodesBasicInformation(callback);
            return;
        }

        var baseUrl = "http://api.gbif.org/v0.9/species/";
        var completeUrl = baseUrl + this.rootID.toString() + '/children';

        this._fetchData(completeUrl, function (data) {
            callback(data[0].results);
        });
    };

    this._fetchChildrenData = function (onSuccess) {
        var urls = this._buildUrls(this.childrenIDs);
        this._fetchMultipleData(urls, function (results) {
            var parsedResults = [];
            for (var i = 0; i < results.length; i++) {
                var child = results[i][0];
                console.log(child);


                // Convert string ID to integer ID
                child.key = parseInt(child.key);
                self.completeChildrenInformation[child.key] = child;

                parsedResults.push(child);
            }
            onSuccess(parsedResults);
        });
    };


    this._buildUrls = function (IDs) {
        var searchUrl = "http://api.gbif.org/v0.9/species/";
        var urls = [];
        for (var i = 0; i < IDs.length; i++) {
            var url = encodeURI(searchUrl + IDs[i]);
            urls.push(url);
        }
        return urls;
    };

    this._fetchData = function (url, onSucess) {
        this._fetchMultipleData([url], onSucess);
    };

    this._fetchMultipleData = function (urls, onSuccess) {
        var requests = this._makeAllRequests(urls);
        var errorFunction = function () {};
        $.when.all(requests).done(onSuccess, errorFunction);
    };

    this._makeAllRequests = function (urls) {
        var requests = [];
        for (var i = 0; i < urls.length; i++) {
            var url = urls[i];
            var request = this._makeRequest(url);
            requests.push(request);
        }
        return requests;
    };

    this._makeRequest = function (url) {
        return this._createRequest(url);
    };

    this._createRequest = function (url) {
        return $.ajax({
            type: 'GET',
            url: url
        });
    };
}
