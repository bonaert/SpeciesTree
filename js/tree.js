/*jslint browser: true, devel: true, nomen: true, vars: true  */
function Tree() {
    var self = this;
    this.levels = ['life', 'kingdom', 'phylum', 'class', 'order', 'family', 'genus', 'species'];
    this.level = 1;

    this.rootID = 0;
    this.root = {
        'id': 0,
        'scientificName': 'Life'
    };
    this.parentIDs = [0];

    this.basicChildrenInformation = {};
    this.childrenDescription = {};
    this.childrenIDs = [];
    this.isVirusChildren = false;

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
        if (this.childrenDescription.hasOwnProperty(nodeID)) {
            return this.childrenDescription[nodeID];
        }
        return this.basicChildrenInformation[nodeID];
    };

    this.isSpeciesLevel = function () {
        return this.level === this.levels.length - 1;
    };

    this.getTaxon = function () {
        return this.levels[this.level];
    };

    this.setRootToChild = function (childID) {
        this.parentIDs.push(this.rootID);

        this.rootID = childID;
        this.root = this._getMaximumInformation(childID);
        this.basicChildrenInformation = {};
        this.childrenDescription = {};
        this.childrenIDs = [];
        this.level = this.level + 1;

        // Add flag when where stepping into virus subtaxons
        if (childID === 8) {
            this.isVirusChildren = true;
        }
    };

    this.isAtKingdomLevel = function () {
        return (this.parentIDs.length === 1);
    };

    this.setRootToParent = function () {
        // Can't go up, since where at the kingdom level
        if (this.isAtKingdomLevel()) {
            return;
        }

        var parentID = this.parentIDs.pop();
        this.rootID = parentID;
        this.root = {
            'id': parentID,
            'scientificName': 'No idea! See tree.setRootToParent function'
        };
        this.basicChildrenInformation = {};
        this.childrenDescription = {};
        this.childrenIDs = [];
        this.level = this.level - 1;

        // Remove flag when where stepping outside virus subtaxons
        if (this.rootID === 0) {
            this.isVirusChildren = false;
        }
    };

    this._buildBasicChildrenInformationrray = function () {
        return _.map(self.childrenIDs, function (id) {
            return self.basicChildrenInformation[id];
        });
    };

    this.fetchBasicChildrenInformation = function (onSucess) {
        this._fetchBasicChildrenInformation(function (children) {
            self._processBasicChildrenInformationCallback(children);
            var infoArray = self._buildBasicChildrenInformationrray();
            onSucess(infoArray);
        });
    };

    this.fetchChildDescription = function (childID, onSuccess) {
        var url = this._buildUrl(childID) + '/descriptions';
        this._fetchData(url, function (response) {
            var result = [];

            var data = response[0].results;
            _.forEach(data, function (description) {
                if (description.language === "ENGLISH") {
                    result.push({
                        "type": description.type,
                        "description": description.description
                    });
                }
            });

            self.childrenDescription[childID] = result;
            onSuccess(result);
        });
    };


    this._processBasicChildrenInformationCallback = function (children) {
        self.basicChildrenInformation = {};
        self.childrenDescription = {};
        self.childrenIDs = [];


        // It is not self.levels[self.level + 1], because self.level starts at 1, instead of 0
        var currentChildLevel = self.levels[self.level];

        for (var i = 0; i < children.length; i++) {
            var child = children[i];

            // Viruses are subject to a different type of classification, where the children are order-level (instead of phylum).
            // Therefore, this restriction cannot take place. For other kingdom, the children will (strangely) include
            // childs not immedially lower-level (instead of kingdom->phylum, some are kingdom->genus).
            if (!this.isVirusChildren && child.rank.toLowerCase() !== currentChildLevel) {
                continue;
            }

            // Convert string ID to integer ID
            // Replace key as id in child object, for consistency
            child.id = parseInt(child.key);
            delete child.key

            self.childrenIDs.push(child.id);
            self.basicChildrenInformation[child.id] = child;
        }
    };

    this._fetchRootNodesBasicInformation = function (callback) {
        $.getJSON('data/data.json', callback);
    };

    this._fetchBasicChildrenInformation = function (callback) {
        if (this.rootID === 0) {
            this._fetchRootNodesBasicInformation(callback);;
        } else {
            var baseUrl = "http://api.gbif.org/v0.9/species/";
            var completeUrl = baseUrl + this.rootID.toString() + '/children?limit=100';

            this._fetchData(completeUrl, function (data) {
                callback(data[0].results);
            });
        }
    };

    this._fetchChildrenData = function (onSuccess) {
        var urls = this._buildUrls(this.childrenIDs);
        this._fetchMultipleData(urls, function (results) {
            var parsedResults = [];
            _.each(results, function (result) {
                var child = result[0];

                // Convert string ID to integer ID
                child.key = parseInt(child.key);
                self.childrenDescription[child.key] = child;

                parsedResults.push(child);
            });
            onSuccess(parsedResults);
        });
    };


    this._buildUrls = function (IDs) {
        return _.map(IDs, this._buildUrl);
    };

    this._buildUrl = function (ID) {
        var searchUrl = "http://api.gbif.org/v0.9/species/";
        return encodeURI(searchUrl + ID);
    }

    this._fetchData = function (url, onSucess) {
        this._fetchMultipleData([url], onSucess);
    };

    this._fetchMultipleData = function (urls, onSuccess) {
        var requests = this._makeAllRequests(urls);
        var errorFunction = function () {};
        $.when.all(requests).done(onSuccess, errorFunction);
    };

    this._makeAllRequests = function (urls) {
        return _.map(urls, this._createRequest);
    };

    this._createRequest = function (url) {
        return $.ajax({
            type: 'GET',
            url: url
        });
    };
}
