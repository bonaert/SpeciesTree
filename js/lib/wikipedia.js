function Wikipedia() {
    var self = this;
    this.url_article = 'http://en.wikipedia.org/w/api.php?action=query&prop=extracts&format=json&exlimit=10&redirects=&titles='
    this.url_image = "http://en.wikipedia.org/w/api.php?action=query&redirects&generator=images&gimlimit=20&prop=imageinfo&iiprop=url|dimensions|mime&format=json&gimcontinueg&titles="

    this.article = function (title, onSuccess) {
        var url = encodeURI(this.url_article + title + '&callback=?');
        this._makeRequest(url, function (data) {
            self.process_article(data, onSuccess);
        });
    }

    this.process_article = function (data, onSuccess) {
        console.log(data);
        var result = data.query.pages;

        if ((typeof result[-1] !== "undefined") && (result[-1].missing === "")) {
            console.info("Zero");
            onSuccess(undefined);
            return;
        }


        var keys = [];
        for (var key in result) {
            keys.push(key);
            console.log(key);
        };

        var result = result[keys[0]];
        onSuccess(result);
    }

    this.image = function (title, onSuccess) {
        var url = encodeURI(this.url_image + title + '&callback=?');
        this._makeRequest(url, function (data) {
            self.process_image(data, onSuccess);
        });
    }

    this.process_image = function (data, onSuccess) {
        console.log(data);
        var result = data.query.pages;
        var imagesData = [];
        for (var key in result) {
            imagesData.push(result[key]);
        };

        onSuccess(imagesData);
    }

    this._makeRequest = function (url, onSuccess) {
        $.getJSON(url, onSuccess);
    }
}
