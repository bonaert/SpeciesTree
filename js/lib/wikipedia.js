function Wikipedia() {
    this.url_article = 'http://en.wikipedia.org/w/api.php?action=query&prop=extracts&format=json&exlimit=10&redirects=&titles='

    this.article = function (title, onSuccess) {
        var url = encodeURI(this.url_article + title + '&callback=?');
        this._makeRequest(url, onSuccess);
    }

    this._makeRequest = function (url, onSuccess) {
        $.getJSON(url, function (data) {
            console.log(data);
            var result = data.query.pages;
            var keys = [];
            for (var key in result) {
                keys.push(key);
                console.log(key);
            };

            var result = result[keys[0]];
            onSuccess(result);
        });
    }
}
