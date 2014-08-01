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

    this.JUMPED_AROUND = -54;

    this.gbif = new GBIF();
    this.parentIDs = [];
    this.parentInfo = [];

    this.basicChildrenInformation = {};
    this.childrenDescription = {};
    this.childrenIDs = [];
    this.isVirusChildren = false;

    this.getRootTaxon = function () {
        return this.levels[this.level - 1];
    };

    this.getChildTaxon = function () {
        return this.levels[this.level];
    };

    this.isAtSpeciesLevel = function () {
        return this.level === this.levels.length - 1;
    };

    this.isAtKingdomLevel = function () {
        return (this.level === 1);
    };

    this.getParentInfo = function () {
        if (!this.isAtKingdomLevel()) {
            return _.last(self.parentInfo);
        }
    };

    this.getBasicInformation = function (id) {
        if (id === 0) {
            return {
                'id': 0,
                'scientificName': 'Life'
            }
        } else if (id === this.rootID) {
            return this.root;
        } else {
            return self.basicChildrenInformation[id];
        }
    };

    this.setRootToChild = function (childID) {
        this.parentIDs.push(this.rootID);
        this.parentInfo.push(this.getBasicInformation(this.rootID));

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

    this._getMaximumInformation = function (nodeID) {
        return this.childrenDescription[nodeID] || this.basicChildrenInformation[nodeID];
    };

    this.setRootToParent = function () {
        // Can't go up, since where at the kingdom level
        if (this.isAtKingdomLevel()) {
            return;
        }

        var parentID = this.parentIDs.pop();
        this.rootID = parentID;
        this.root = this.parentInfo.pop();
        this.basicChildrenInformation = {};
        this.childrenDescription = {};
        this.childrenIDs = [];
        this.level = this.level - 1;

        // Remove flag when where stepping outside virus subtaxons
        if (this.rootID === 0) {
            this.isVirusChildren = false;
        }
    };

    this.fetchBasicChildrenInformation = function (onSuccess) {
        self.gbif.fetchBasicChildrenInformation(this.rootID, function (results) {
            var selectedResults = self.selectResults(results);
            _.each(selectedResults, function(result){
                if (result.rank){
                    result.rank = result.rank.toLowerCase();
                }
            });
            self.addResultsToDatabase(selectedResults);
            onSuccess(selectedResults);
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

    this.selectResults = function (children) {
        // It is not self.levels[self.level + 1], because self.level starts at 1, instead of 0
        var currentChildLevel = self.levels[self.level];

        // For other kingdom, the children will (strangely) include children not immediately
        // lower-level (instead of kingdom->phylum, some are kingdom->genus). We filter those.
        // Viruses are subject to a different type of classification, where the children of a kingdom
        // have as level order (instead of phylum).Therefore, this restriction cannot take place.
        return _.filter(children, function (child) {
            return child.rank.toLowerCase() === currentChildLevel || self.isVirusChildren;
        });
    };

    this.addResultsToDatabase = function (children) {
        self.basicChildrenInformation = {};
        self.childrenDescription = {};
        self.childrenIDs = [];

        _.forEach(children, function (child) {
            self.childrenIDs.push(child.id);
            self.basicChildrenInformation[child.id] = child;
        });
    };

    this.search = function (name, callback) {
        self.gbif.search(name, function (results) {
            callback(results);
        });
    };

    this.setRoot = function (id, root) {
        this.rootID = id;
        this.root = root;
        this.basicChildrenInformation = {};
        this.childrenDescription = {};
        this.childrenIDs = [];
        this.level = self.get_level(root.rank);
        this.updateParents();

        // Add flag when where stepping into virus subtaxons
        if (id === 8 || _.contains(self.parentIDs, 8)) {
            this.isVirusChildren = true;
        }
    };

    this.isChild = function (id) {
        return _.contains(self.childrenIDs, id);
    };

    this.get_level = function (rank) {
        return self.levels.indexOf(rank.toLowerCase()) + 1;
    };

    this.updateParents = function () {
        self.parentIDs = [0];
        self.parentInfo = [
            {
                'id': 0,
                'scientificName': 'Life'
            }
        ];

        self.gbif.getParents(self.rootID, function (parents) {
            _.each(parents, function (parent) {
                self.parentInfo.push(parent);
                self.parentIDs.push(parent.id);
            });
        });
    }
}
