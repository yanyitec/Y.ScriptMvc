"use strict";
var Y;
(function (Y) {
    "use strict";
    var Controller = (function () {
        function Controller() {
        }
        Controller.retriveOrRegister = function (opts) {
            var id = opts["@id"];
            if (!id) {
                opts["@resuseable"] = false;
                return buildControllerType(opts);
            }
            var existed = controllerTypes[id];
            if (!opts["-register"] && existed) {
                return existed;
            }
            var controllerType = buildControllerType(opts);
            controllerTypes[id] = controllerType;
            checkExpireControllerTypes();
        };
        return Controller;
    }());
    Y.Controller = Controller;
    function buildControllerType(opts) {
        var result = function (opts) {
            if (this.init)
                this.init(opts);
            this["super"] = opts["super"];
            this.done(function () {
                if (this["@reuseable"]) {
                    if (this.view)
                        this.view = this.view.cloneNode();
                    if (this.binder) {
                        this.model = this.model.clone();
                        this.binder(this.view, this.model, this);
                    }
                }
                if (opts.area) {
                    opts.area.innerHTML = "";
                    opts.area.appendChild(this.view);
                }
                if (this.load)
                    this.load(this.view, this.model.$accessor);
            });
        };
        var proto = result.prototype = {
            "super": undefined,
            view: undefined,
            model: undefined,
            binder: undefined,
            _doneHandlers: undefined,
            lang: undefined,
            lngtext: function (key) {
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
            },
            done: function (handler) {
                var _this = this;
                if (proto._doneHandlers === true) {
                    handler.call(this, this);
                    this.done = function (handler) {
                        handler.call(_this, _this);
                        return _this;
                    };
                    return this;
                }
                proto._doneHandlers.push({ handler: handler, self: this });
                return this;
            }
        };
        var resolve = function () {
            if (--asyncTaskCount > 0)
                return;
            if (Y.view && proto.view) {
                var binder = Y.view.makeBinder(proto.view);
                proto.binder = binder;
                proto.model = binder.model;
            }
            var doneHandlers = proto._doneHandlers;
            for (var i = 0, j = doneHandlers.length; i < j; i++) {
                var arg = doneHandlers[i];
                arg.handler.call(arg.self, arg.self);
            }
        };
        if (opts.content) {
            loadMvc(opts.content, proto);
        }
        var asyncTaskCount = 0;
        if (opts.url) {
            proto._doneHandlers = [];
            asyncTaskCount++;
            helper.getUrl(opts.url, function (content) {
                loadMvc(content, proto);
                resolve();
            });
        }
        else {
            if (opts.viewUrl) {
                proto._doneHandlers = [];
                asyncTaskCount++;
                helper.getUrl(opts.url, function (content) {
                    containerElement.innerHTML = content;
                    var children = containerElement.childNodes;
                    var viewElem = null;
                    var scriptElem = null;
                    for (var i = 0, j = children.length; i < j; i++) {
                        var child = children[i];
                        if (child.getAttribute("y-view")) {
                            viewElem = child;
                            break;
                        }
                    }
                    proto.view = viewElem;
                    resolve();
                });
            }
            if (opts.controllerUrl) {
                asyncTaskCount++;
                helper.loadScript(opts.controllerUrl, function () {
                    resolve();
                });
            }
        }
        if (opts.langUrl) {
            asyncTaskCount++;
            helper.getUrl(opts.url, function (content) {
                proto.lang = JSON.parse(content);
                resolve();
            });
        }
        if (opts.proto) {
            for (var n in opts.proto) {
                proto[n] = opts.proto;
            }
        }
        if (opts.view) {
            proto.view = opts.view;
        }
        if (asyncTaskCount === 0) {
            proto._doneHandlers = true;
        }
        return result;
    }
    function loadMvc(content, proto) {
        if (!containerElement) {
            containerElement = helper.createElement ? helper.createElement("div") : document.createElement("div");
        }
        containerElement.innerHTML = content;
        var children = containerElement.childNodes;
        var viewElem = null;
        var scriptElem = null;
        for (var i = 0, j = children.length; i < j; i++) {
            var child = children[i];
            if (child.getAttribute("y-view")) {
                viewElem = child;
            }
            if (child.getAttribute("y-controller")) {
                scriptElem = child;
            }
        }
        proto.view = viewElem;
        Y.Controller.currentProto = null;
        helper.appendScript(scriptElem);
        var cProto = Y.Controller.currentProto;
        for (var n in cProto) {
            proto[n] = cProto;
        }
    }
    var controllerTypes = {};
    var dropExpireControllerTypeTimer;
    function dropExiredControllerTypes() {
        var types = {};
        var now = new Date().valueOf();
        var aliveCount = 0;
        for (var n in controllerTypes) {
            var ctype = controllerTypes[n];
            if (ctype.expireTime >= now) {
                types[n] = ctype;
                aliveCount++;
            }
            else {
                if (ctype.dispose)
                    ctype.dispose();
            }
        }
        controllerTypes = types;
        if (aliveCount === 0 && dropExpireControllerTypeTimer) {
            clearInterval(dropExpireControllerTypeTimer);
            dropExpireControllerTypeTimer = 0;
        }
    }
    function checkExpireControllerTypes() {
        if (!dropExpireControllerTypeTimer) {
            dropExpireControllerTypeTimer = setInterval(dropExiredControllerTypes, Controller["@expireCheckInterval"] || 5000);
        }
    }
    var CacheTypes;
    (function (CacheTypes) {
        //不缓存
        CacheTypes[CacheTypes["noCache"] = 0] = "noCache";
        //永不超期
        CacheTypes[CacheTypes["forever"] = 1] = "forever";
        //缓存一段时间
        CacheTypes[CacheTypes["cache"] = 2] = "cache";
    })(CacheTypes || (CacheTypes = {}));
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
    //是否有注册的控制器
    function hasRegisteredControlller() {
        for (var n in controllerTypes)
            return true;
        return false;
    }
})(Y = exports.Y || (exports.Y = {}));
