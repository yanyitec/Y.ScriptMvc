"use strict";
var Y;
(function (Y) {
    "use strict";
    var Controller = (function () {
        function Controller(opts, superior) {
            this.opts = opts;
            this._super = superior;
            this._lngtext = opts["@language"];
            var memberNameRegx = /^[a-zA-Z][_a-zA-Z0-9]*$/;
            for (var n in opts) {
                var fn = opts[n];
                if (typeof fn === 'function' && memberNameRegx.test(n))
                    this[n] = fn;
            }
        }
        Controller.prototype._text = function (key) {
            var result = "";
            var ctrlr = this;
            while (ctrlr) {
                var lng = ctrlr._lngtext;
                if (lng) {
                    result = lng[key];
                    if (result !== undefined)
                        return result;
                }
                ctrlr = ctrlr._super;
            }
            return key;
        };
        return Controller;
    }());
    Y.Controller = Controller;
})(Y = exports.Y || (exports.Y = {}));
