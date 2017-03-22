"use strict";
var Y;
(function (Y) {
    "use strict";
    var containerElement = null;
    var helper = {
        createElement: function (name) { return document.createElement(name); },
        appendScript: function (script) {
            if (typeof script === "string") {
                var scriptNode = helper.createElement("script");
                scriptNode.type = "text/javascript";
                scriptNode.innerText = script;
                script = scriptNode;
            }
            var heads = document.getElementsByTagName("head");
            if (heads && heads.length) {
                heads[0].appendChild(script);
            }
            else {
                document.body.appendChild(script);
            }
        },
        loadScript: function (url, callback) {
            var scriptNode = helper.createElement("script");
            scriptNode.type = "text/javascript";
            scriptNode.src = url;
            if (callback) {
                if (scriptNode.onload !== undefined) {
                    scriptNode.onload = function () { callback(scriptNode); };
                }
                else if (scriptNode.onreadystatechange) {
                    scriptNode.onreadystatechange = function () {
                        if (scriptNode.readyState === 4 || scriptNode.readyState === 'complete') {
                            callback(scriptNode);
                        }
                    };
                }
                scriptNode.onerror = function (e) {
                    callback(scriptNode, e || event);
                };
            }
            helper.appendScript(scriptNode);
        },
        getUrl: function (url, callback) {
            if (url === "full") {
                return "\n    <div y-view></div>\n                <script type='javascript' y-controller>\nY.Controller.once({\n    ready:function(view,model){\n\n    }\n});\n                </script>\n";
            }
            if (url === "view") {
                return "<div>abc</div>";
            }
        }
    };
})(Y = exports.Y || (exports.Y = {}));
