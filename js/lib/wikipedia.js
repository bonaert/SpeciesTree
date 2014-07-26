/*jslint browser: true, devel: true, nomen: true */
function Wikipedia() {
    var self = this;
    this.url_article = 'http://en.wikipedia.org/w/api.php?action=query&prop=extracts&format=json&exlimit=10&redirects&titles=';
    this.url_image = "http://en.wikipedia.org/w/api.php?action=query&redirects&generator=images&gimlimit=20&prop=imageinfo&iiprop=url|dimensions|mime&format=json&titles=";


    this.article = function (commonName, speciesName, onSuccess) {
        var names = this._get_good_names([commonName, speciesName]);
        var urls = self._build_urls(names, self._makeArticleUrl);
        self._makeRequestUntilGoodContent(urls, self.processArticle, self._ArticleHasGoodContent, onSuccess);
    };

    this.image = function (commonName, speciesName, onSuccess) {
        var names = this._get_good_names([commonName, speciesName]);
        var urls = self._build_urls(names, self._makeImageUrl);
        self._makeRequestUntilGoodContent(urls, self.process_image, self._imageHasGoodContent, onSuccess);
    };

    // Process data
    this.processArticle = function (data) {
        var pages = data.query.pages;
        var content_keys = self._getContentKeys(pages);

        if (self._isNoContent(content_keys, pages)) {
            console.info("No result for article.");
            return undefined;
        }

        return pages[content_keys[0]];
    };

    this.process_image = function (data) {
        if (_.isUndefined(data.query) || _.isUndefined(data.query.pages)) {
            return undefined;
        }

        var result = data.query.pages;
        var keys = _.keys(result).sort(function (a, b) {
            return a - b;
        });

        return _.map(keys, function (key) {
            return result[key];
        });
    };

    this._getContentKeys = function (result) {
        var keys = _.keys(result);
        return _.filter(keys, function (key) {
            return (key !== -1) && _.isDefined(result[key].extract);
        });
    };

    this._isNoContent = function (content_keys, pages) {
        return content_keys.length === 0 && _.isDefined(pages[-1]) && (pages[-1].missing === "");
    };


    // Good content check
    this._ArticleHasGoodContent = function (result) {
        if (_.isUndefined(result) || _.isUndefined(result.extract)) {
            // No content
            return false;
        } else if (result.extract.indexOf('may refer') !== -1) {
            // Content is a disambiguation page
            return false;
        } else {
            return true;
        }
    };

    this._imageHasGoodContent = function (result) {
        return !_.isUndefined(result);
    };


    // Filter
    this._get_good_names = function (names) {
        var defined_names = _.select(names, _.identity);
        return _.unique(defined_names);
    };


    // Url
    this._build_urls = function (names, make_url) {
        return _.map(names, make_url);
    };

    this._makeArticleUrl = function (name) {
        return encodeURI(self.url_article + name + '&callback=?');
    };

    this._makeImageUrl = function (name) {
        return encodeURI(self.url_image + name + '&callback=?');
    };


    // General function
    this._makeRequestUntilGoodContent = function (urls, process_data, has_good_content, onSuccess) {
        if (urls.length === 0) {
            onSuccess(undefined);
            return;
        }

        var url = urls[0];
        this._makeRequest(url, function (data) {
            var result = process_data(data);
            if (has_good_content(result)) {
                onSuccess(result);
            } else {
                self._makeRequestUntilGoodContent(_.tail(urls), process_data, has_good_content, onSuccess);
            }
        });
    };

    this._makeRequest = function (url, onSuccess) {
        $.getJSON(url, onSuccess);
    };
}
