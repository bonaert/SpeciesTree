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

    this.fetchChildren = function (onSucess) {
        this._fetchChildrenIDs(function (childrenIDs) {
            self.childrenIDs = childrenIDs;
            self._fetchChildrenData(onSucess);
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

            var response = data[0];

            var results = response['results'];
            for (var i = 0; i < results.length; i++) {
                var id = parseInt(results[i]["key"]);
                console.log(id);
                childrenIDs.push(id);
            }

            callback(childrenIDs);
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
                child['key'] = parseInt(child['key']);
                self.children[child['key']] = child;

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
            urls.push(url)
        }
        return urls;
    };

    this._fetchData = function (url, onSucess) {
        this._fetchMultipleData([url], onSucess);
    }

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
    }

    this._makeRequest = function (url) {
        return this._createRequest(url);
    };

    this._createRequest = function (url) {
        return $.ajax({
            type: 'GET',
            url: url
        });
    }
}
