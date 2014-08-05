/*jslint browser: true, devel: true, nomen: true, vars: true  */
function GBIF() {
    var self = this;

    this.baseUrl = "http://api.gbif.org/v1/species/";
    this.baseSearchUrl = "http://api.gbif.org/v1/species?name=";

    this.cache = {};

    this._get_from_cache = function (id) {
        if (self.cache[id] && self.cache[id].length !== 0) {
            console.info("Cache hit! ID:" + id.toString());
            console.info(self.cache[id]);
        }
        return self.cache[id];
    };

    this._set_in_cache = function (id, results) {
        return self.cache[id] = results;
    };

    this.fetchBasicChildrenInformation = function (id, onSuccess) {
        this._fetchBasicChildrenInformation(id, function (children) {
            var fixedChildren = self._exchangeKeyWithID(children);
            onSuccess(fixedChildren);
        });
    };

    this._exchangeKeyWithID = function (results) {
        _.each(results, function(result) {
            self.exchangeKeyWithId(result);
        });
        return results;
    };

    this.make_children_url = function (id) {
        return self.baseUrl + id.toString() + '/children?limit=100';
    };

    this._fetchBasicChildrenInformation = function (id, callback) {
        if (id === 0) {
            self._fetchRootNodesBasicInformation(callback);
            return;
        }

        var cached = self._get_from_cache(id);
        if (cached) {
            callback(cached);
        } else {
            var completeUrl = self.make_children_url(id);
            this._makeRequest(completeUrl, function (data) {
                var result = data.results;
                self._set_in_cache(id, result);
                callback(result);
            });
        }
    };

    this._fetchRootNodesBasicInformation = function (callback) {
        $.getJSON('data/data.json', callback);
    };

    this._buildUrls = function (IDs) {
        return _.map(IDs, this._buildUrl);
    };

    this._buildUrl = function (ID) {
        return encodeURI(self.baseUrl + ID);
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
        return _.map(urls, this._createRequest);
    };

    this._makeRequest = function(url, callback) {
        return $.getJSON(url, callback);
    };

    this._createRequest = function (url) {
        return $.ajax({
            type: 'GET',
            url: url
        });
    };

    this.search = function (name, callback) {
        var url = this._makeSearchUrl(name);
        $.getJSON(url, function (data) {
            var processedResults = self._processSearchResults(name, data);
            callback(processedResults);
        })
    };

    this._makeSearchUrl = function (name) {
        return encodeURI(self.baseSearchUrl + name.toLowerCase());
    };

    this._processSearchResults = function (name, data) {
        var results = data.results;
        if (results && results.length !== 0) {
            var result = self.selectSearchResult(name, results);
            var fixedResult = self.exchangeKeyWithId(result);
            return fixedResult;
        } else {
            return undefined;
        }
    };

    this.exchangeKeyWithId = function (result) {
        if (result.key) {
            result.id = parseInt(result.key);
            delete result.key
        }
        return result;
    };

    this.selectSearchResult = function (name, results) {
        var highConfidenceMatch = self.getHighConfidenceMatch(name, results);
        if (highConfidenceMatch) {
            return highConfidenceMatch;
        } else {
            return self.getLowConfidenceMatch(name, results);
        }
    };

    this.getHighConfidenceMatch = function (name, results) {
        var lowerCaseName = name.toLowerCase();
        return _.find(results, function (result) {
            var vernacularName = result.vernacularName;
            return vernacularName && vernacularName.toLowerCase() === lowerCaseName;
        })
    };

    this.getLowConfidenceMatch = function (name, results) {
        var lowerCaseName = name.toLowerCase();
        return _.find(results, function (result) {
            var resultName = result.canonicalName || result.scientificName;
            return resultName && resultName.toLowerCase() === lowerCaseName;
        })
    };

    this.getParents = function (id, callback) {
        var url = encodeURI(self.baseUrl + id.toString() + '/parents');
        $.getJSON(url, function(data){
            var fixedResults = self._exchangeKeyWithID(data);
            callback(fixedResults);
        })
    };
}
