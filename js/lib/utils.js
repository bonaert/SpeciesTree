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

_.isDefined = function (obj) {
    return !_.isUndefined(obj);
};

function containsAny(title, stringList) {
    var titleLowerCase = title.toLowerCase();
    for (var i = 0; i < stringList.length; i++) {
        var s = stringList[i].toLowerCase();
        if (titleLowerCase.indexOf(s) !== -1) {
            return true;
        }
    }
    return false;
}

function capitalise(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}
