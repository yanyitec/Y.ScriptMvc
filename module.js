"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var Y;
(function (Y) {
    "use strict";
    var taskTimer;
    var Task = (function () {
        function Task(handler, args, self, frequency) {
            this.handler = handler;
            this.self = self;
            this.args = args;
            if (args.length !== undefined && args.push && args.pop) {
                this.isApply = true;
            }
            else {
                this.isApply = false;
            }
            this.frequency = frequency || 0;
            this.step = 0;
        }
        return Task;
    }());
    var tasks = [];
    function task(handler, args, self, frequency) {
        var t = new Task(handler, args, self, frequency);
        tasks.push(t);
        if (!taskTimer) {
            taskTimer = setInterval(runTasks, 20);
        }
    }
    Y.task = task;
    function runTasks() {
        for (var i = 0, j = tasks.length; i < j; i++) {
            var tsk = tasks.shift();
            if (tsk.frequency == tsk.step) {
                var result = void 0;
                if (tsk.isApply)
                    result = tsk.handler.apply(tsk.self, tsk.args);
                else
                    result = tsk.handler.call(tsk.self, tsk.args);
                if (result !== "keep-alive")
                    continue;
            }
            if (++tsk.step > tsk.frequency)
                tsk.step = 0;
            tasks.push(tsk);
        }
        if (tasks.length == 0) {
            clearInterval(taskTimer);
            taskTimer = 0;
        }
    }
    var promiseTimer;
    var promises = [];
    function executePromises() {
        var ob = null;
        while ((ob = promises.shift())) {
            if (ob.setResult) {
                ob.func(ob.result);
                continue;
            }
            var promise = ob.self._innerPromiseObject;
            try {
                ob.func.call(ob.self, ob.resolve, ob.reject);
                promise.exceptionHandlers = null;
            }
            catch (e) {
                if (!promise)
                    return;
                var handlers = promise.exceptionHandlers;
                if (!handlers)
                    return;
                for (var i = 0, j = handlers.length; i < j; i++) {
                    var ob_1 = handlers[i];
                    if (ob_1.handler === ob_1.type)
                        ob_1.handler.call(this, e);
                    else if (e instanceof ob_1.type)
                        ob_1.handler.call(this, e);
                }
                promise.result = e;
                promise.exceptionHandlers = true;
            }
        }
        promiseTimer = 0;
    }
    var Promise = (function () {
        function Promise(asyncFunc) {
            var _this = this;
            if (!asyncFunc)
                return;
            if (!promiseTimer)
                promiseTimer = setTimeout(executePromises);
            promises.push({
                self: this,
                func: asyncFunc,
                resolve: function (result) {
                    if (!promiseTimer)
                        promiseTimer = setTimeout(executePromises);
                    promises.push({
                        setResult: true,
                        func: function (rst) { _this.resolve(rst); },
                        result: result
                    });
                    _this.resolve(result);
                },
                reject: function (result) {
                    if (!promiseTimer)
                        promiseTimer = setTimeout(executePromises);
                    promises.push({
                        setResult: true,
                        func: function (rst) { _this.reject(rst); },
                        result: result
                    });
                    _this.resolve(result);
                }
            });
        }
        Promise.prototype.then = function (doneHandler, failHandler, exHandler) {
            if (doneHandler)
                this.done(doneHandler);
            if (failHandler)
                this.fail(failHandler);
            if (exHandler)
                this["catch"](exHandler);
            return this;
        };
        Promise.prototype.done = function (doneHandler) {
            var _this = this;
            var promise = this._innerPromiseObject;
            if (promise) {
                if (promise.doneHandlers === true) {
                    this.done = function (handler) {
                        handler.call(this, this._innerPromiseObject.result);
                        return this;
                    };
                    doneHandler.call(this, this._innerPromiseObject.result);
                }
                else if (promise.doneHandlers === false) {
                    this.done = function (handler) { return _this; };
                }
                return this;
            }
            if (!promise)
                promise = this._innerPromiseObject = { doneHandlers: [] };
            var doneHandlers = promise.doneHandlers || (promise.doneHandlers = []);
            doneHandlers.push(doneHandler);
            return this;
        };
        Promise.prototype.fail = function (failHandler) {
            var _this = this;
            var promise = this._innerPromiseObject;
            if (promise) {
                if (promise.failHandlers === true) {
                    this.fail = function (handler) {
                        handler.call(this, this._innerPromiseObject.result);
                        return this;
                    };
                    failHandler.call(this, this._innerPromiseObject.result);
                }
                else if (promise.doneHandlers === false) {
                    this.fail = function (handler) { return _this; };
                }
                return this;
            }
            if (!promise)
                promise = this._innerPromiseObject = { failHandlers: [] };
            var failHandlers = promise.failHandlers || (promise.failHandlers = []);
            failHandlers.push(failHandler);
            return this;
        };
        Promise.prototype["catch"] = function (exType, handler) {
            var _this = this;
            if (handler === undefined)
                handler = exType;
            var promise = this._innerPromiseObject;
            if (promise) {
                if (promise.exceptionHandlers === true) {
                    this["catch"] = function (handler) {
                        if (exType === handler) {
                            handler.call(this, this._innerPromiseObject.result);
                            return this;
                        }
                        else {
                            if (this._innerPromiseObject.result instanceof exType) {
                                handler.call(this, this._innerPromiseObject.result);
                                return this;
                            }
                        }
                    };
                    handler.call(this, this._innerPromiseObject.result);
                }
                else if (promise.exceptionHandlers === false) {
                    this["catch"] = function (handler) { return _this; };
                }
                return this;
            }
            if (!promise)
                promise = this._innerPromiseObject = { exceptionHandlers: [] };
            var exceptionHandlers = promise.exceptionHandlers || (promise.exceptionHandlers = []);
            exceptionHandlers.push({ handler: handler, type: exType });
            return this;
        };
        Promise.prototype.resolve = function (result) {
            var promise = this._innerPromiseObject || (this._innerPromiseObject = {});
            var doneHandlers = promise.doneHandlers;
            promise.result = result;
            promise.doneHandlers = true;
            promise.failHandlers = null;
            if (doneHandlers) {
                for (var i = 0, j = doneHandlers.length; i < j; i++) {
                    doneHandlers[i].call(this, result);
                }
            }
            this.reject = this.resolve = function (r) { throw "Already resolved."; };
            return this;
        };
        Promise.prototype.reject = function (result) {
            var promise = this._innerPromiseObject || (this._innerPromiseObject = {});
            var failHandlers = promise.failHandlers;
            promise.result = result;
            promise.doneHandlers = null;
            promise.failHandlers = true;
            if (failHandlers) {
                for (var i = 0, j = failHandlers.length; i < j; i++) {
                    failHandlers[i].call(this, result);
                }
            }
            this.reject = this.resolve = function (r) { throw "Already rejected."; };
            return this;
        };
        Promise.prototype.promise = function () {
            var self = this;
            return {
                then: function (done, fail, ex) { self.then(done, fail, ex); return this; },
                done: function (done) { self.done(done); return this; },
                fail: function (fail) { self.fail(fail); return this; },
                "catch": function (type, handler) { self["catch"](type, handler); return this; },
                promise: function () { return this; }
            };
        };
        return Promise;
    }());
    Y.Promise = Promise;
    var Request = (function () {
        function Request(url) {
            this.url = url;
        }
        Request.prototype.get = function () {
            var _this = this;
            var promise = new Promise();
            Request.ioFunc({ url: this.url, method: "GET", headers: this.headers }).done(function (body, headers) {
                promise.resolve(new Response(_this, body, headers));
            }).fail(function (ex) {
                promise.reject(ex);
            });
            return promise.promise();
        };
        Request.prototype["delete"] = function () {
            var _this = this;
            var promise = new Promise();
            Request.ioFunc({ url: this.url, method: "DELETE", headers: this.headers }).done(function (body, headers) {
                promise.resolve(new Response(_this, body, headers));
            }).fail(function (ex) {
                promise.reject(ex);
            });
            return promise.promise();
        };
        Request.prototype.post = function (data) {
            var _this = this;
            var promise = new Promise();
            Request.ioFunc({ url: this.url, method: "POST", headers: this.headers, data: data }).done(function (body, headers) {
                promise.resolve(new Response(_this, body, headers));
            }).fail(function (ex) {
                promise.reject(ex);
            });
            return promise.promise();
        };
        Request.prototype.put = function (data) {
            var _this = this;
            var promise = new Promise();
            Request.ioFunc({ url: this.url, method: "PUT", headers: this.headers, data: data }).done(function (body, headers) {
                promise.resolve(new Response(_this, body, headers));
            }).fail(function (ex) {
                promise.reject(ex);
            });
            return promise.promise();
        };
        return Request;
    }());
    Y.Request = Request;
    var Response = (function () {
        function Response(request, content, headers) {
            this.request = request;
            this.content = content;
            this.headers = headers;
        }
        Response.prototype.toJson = function () {
            return JSON.parse(this.content);
        };
        return Response;
    }());
    Y.Response = Response;
    var caches = {};
    var Cache = (function () {
        function Cache(interval) {
            this.interval = interval || 60000;
        }
        Cache.prototype.get = function (key) {
            var item = this._caches[key];
            if (!item)
                return;
            item.expireTime = new Date().valueOf() + item.expireInterval;
            return item.value;
        };
        Cache.prototype.put = function (key, value, expiry) {
            var _this = this;
            var item = {
                value: value,
                expireTime: expiry instanceof Date ? expiry.valueOf() : ((new Date()).valueOf() + expiry),
                expireInterval: expiry instanceof Date ? undefined : (expiry || 600000)
            };
            this._caches[key] = item;
            if (!this._timer) {
                this._timer = setInterval(function () {
                    _this.clearExpired();
                }, this.interval);
            }
            return this;
        };
        Cache.prototype["delete"] = function (key) {
            delete this._caches[key];
            var hasItems = false;
            for (var n in this._caches) {
                hasItems = true;
                break;
            }
            if (!hasItems) {
                if (this._timer) {
                    clearInterval(this._timer);
                    this._timer = 0;
                }
            }
            return true;
        };
        Cache.prototype.clearExpired = function () {
            var caches = this._caches;
            var newC = {};
            var now = new Date().valueOf();
            for (var n in caches) {
                var item = caches[n];
                if (item.expireTime >= now) {
                    newC[n] = item;
                }
            }
            this._caches = newC;
        };
        return Cache;
    }());
    Y.Cache = Cache;
    Y.cache = new Cache();
    Y.Helper = {
        createElement: function (name) { return document.createElement(name); },
        appendScript: function (script) {
            if (typeof script === "string") {
                var scriptNode = Y.Helper.createElement("script");
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
            var scriptNode = Y.Helper.createElement("script");
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
            Y.Helper.appendScript(scriptNode);
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
    var Rule = (function () {
        function Rule(rulereg, loader) {
            this.reg = typeof rulereg === "string" ? new RegExp(rulereg) : rulereg;
            this.loader = loader;
        }
        return Rule;
    }());
    Y.Rule = Rule;
    var RequireStates;
    (function (RequireStates) {
        RequireStates[RequireStates["Loading"] = 0] = "Loading";
        RequireStates[RequireStates["Ready"] = 1] = "Ready";
    })(RequireStates || (RequireStates = {}));
    var Require = (function (_super) {
        __extends(Require, _super);
        function Require(name) {
            var _this = _super.call(this) || this;
            _this.name = name;
            _this.status = RequireStates.Loading;
            for (var i = 0, j = rules.length; i < j; i++) {
                var rule = rules[i];
                var match = name.match(rule.reg);
                if (match) {
                    rule.loader.call(_this, name, match, _this);
                    break;
                }
            }
            _this.reject(name + " cannot match any rule.");
            return _this;
        }
        return Require;
    }(Promise));
    var rules = [];
    var required = {};
    function require(depnames) {
        var c = depnames.length;
        var results = {};
        var ret = new Promise();
        for (var i = 0, j = depnames.length; i < j; i++) {
            var depname = depnames[i];
            var dep = required[depname] || (required[depname] = new Require(depname));
            dep.done(function (d) {
                results[d.name] = d.result;
                if (--c == 0)
                    ret.resolve(results);
            });
        }
        return ret;
    }
    Y.require = require;
    //loadModule({url:url}).done(function(module){});
    //
})(Y = exports.Y || (exports.Y = {}));
