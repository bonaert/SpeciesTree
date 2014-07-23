function Wikipedia() {
    var self = this;
    this.url_article = 'http://en.wikipedia.org/w/api.php?action=query&prop=extracts&format=json&exlimit=10&redirects=&titles='
    this.url_image = "http://en.wikipedia.org/w/api.php?action=query&redirects&generator=images&gimlimit=20&prop=imageinfo&iiprop=url|dimensions|mime&format=json&titles="

    this.article = function (commonName, speciesName, onSuccess) {
        if (typeof commonName === "undefined") {
            this._simple_article(speciesName, onSuccess);
            return;
        }

        var url = self._make_article_url(commonName);

        this._makeRequest(url, function (data) {
            var result = self.process_article(data);

            if (typeof result === "undefined") {
                self._simple_article(speciesName, onSuccess);
                return;
            } else if (typeof result.extract === "undefined") {
                self._simple_article(speciesName, onSuccess);
                return;
            } else if (result.extract.indexOf('may refer') !== -1) {
                self._simple_article(speciesName, onSuccess);
                return;
            }

            onSuccess(result);
        });
    }

    this._simple_article = function (name, onSuccess) {
        var url = self._make_article_url(name);
        self._makeRequest(url, function (data) {
            onSuccess(self.process_article(data));
        });
    }

    this._make_article_url = function (name) {
        return encodeURI(this.url_article + name + '&callback=?');
    }

    this._get_useful_keys = function (result) {
        var keys = [];
        for (var key in result) {

            // Bad key, usually present when there was no corresponding text
            if (key === -1) {
                continue;
            }

            // Strangely, sometimes there is a result, but no text associated
            // Maybe due to an error of the Wikipedia Api Extract add on
            // Therefore we exclude it
            if (typeof result[key].extract === "undefined") {
                continue;
            }

            keys.push(key);
        };
        return keys;
    }

    this.process_article = function (data) {
        var result = data.query.pages;
        var keys = self._get_useful_keys(result);

        if (keys.length === 0 && (typeof result[-1] !== "undefined") && (result[-1].missing === "")) {
            console.info("No result for article.");
            return undefined;
        }

        return result[keys[0]];
    }

    this.image = function (commonName, speciesName, onSuccess) {
        if (typeof commonName === "undefined") {
            this._simple_image(speciesName, onSuccess);
            return;
        }

        var url = self._make_image_url(commonName);

        this._makeRequest(url, function (data) {
            var result = self.process_image(data);

            if (typeof result === "undefined") {
                self._simple_image(speciesName, onSuccess);
                return;
            }

            onSuccess(result);
        });
    }

    this._make_image_url = function (name) {
        return encodeURI(this.url_image + name + '&callback=?');
    }

    this._simple_image = function (name, onSuccess) {
        var url = self._make_image_url(name);
        self._makeRequest(url, function (data) {
            onSuccess(self.process_image(data));
        });
    }

    this._get_image_keys = function (result) {
        var keys = [];
        for (var key in result) {
            keys.push(key);
        }
        return keys;
    }

    this.process_image = function (data) {
        console.log(data);
        if (typeof data.query === "undefined") {
            return undefined;
        } else if (typeof data.query.pages === "undefined") {
            return undefined;
        }

        var result = data.query.pages;
        var keys = self._get_image_keys(result).sort(function (a, b) {
            return a - b;
        });
        var imagesData = [];
        for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            imagesData.push(result[key]);
        };

        return imagesData;
    }


    this._makeRequest = function (url, onSuccess) {
        $.getJSON(url, onSuccess);
    }
}
