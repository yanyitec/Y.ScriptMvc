"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var Y;
(function (Y) {
    "use strict";
    ////////////////////////////////////
    /// 通用机制
    ///////////////////////////////////
    Y.NONE = { toString: function () { return "{object y-none}"; } };
    Y.BREAK = { toString: function () { return "{object y-break}"; } };
    Y.USEAPPLY = { toString: function () { return "{object y-useApply}"; } };
    Y.debugMode = true;
    Y.trimRegex = /(?:^\s+)|(?:\s+$)/i;
    var Observable = (function () {
        function Observable() {
        }
        Observable.prototype.subscribe = function (event, handler) {
            var subscribers;
            if (handler === undefined) {
                handler = event;
                subscribers = this.__y_observable_default_subscribers || (this.__y_observable_default_subscribers = []);
            }
            else {
                var sets = this.__y_observable_subscriberset || (this.__y_observable_subscriberset = {});
                subscribers = sets[event] || (sets[event] = []);
            }
            subscribers.push(handler);
            return this;
        };
        Observable.prototype.unsubscribe = function (event, handler) {
            var subscribers;
            if (handler === undefined) {
                handler = event;
                subscribers = this.__y_observable_default_subscribers;
            }
            else {
                subscribers = this.__y_observable_subscriberset ? this.__y_observable_subscriberset[event] : null;
            }
            if (!subscribers)
                return this;
            for (var i = 0, j = subscribers.length; i < j; i++) {
                var exist = subscribers.shift();
                if (exist !== handler)
                    subscribers.push(exist);
            }
            return this;
        };
        Observable.prototype.notify = function (event, args) {
            var subscribers;
            if (args === undefined) {
                args = event;
                subscribers = this.__y_observable_default_subscribers;
            }
            else {
                subscribers = this.__y_observable_subscriberset ? this.__y_observable_subscriberset[event] : null;
            }
            if (!subscribers)
                return this;
            var isArr = isArray(args);
            for (var i = 0, j = subscribers.length; i < j; i++) {
                if (subscribers[i].call(this, args) === Y.BREAK)
                    break;
            }
            return this;
        };
        Observable.prototype.applyNotify = function (event, args) {
            var subscribers;
            if (args === undefined) {
                args = event;
                subscribers = this.__y_observable_default_subscribers;
            }
            else {
                subscribers = this.__y_observable_subscriberset ? this.__y_observable_subscriberset[event] : null;
            }
            if (!subscribers)
                return this;
            var isArr = isArray(args);
            for (var i = 0, j = subscribers.length; i < j; i++) {
                if (subscribers[i].apply(this, args) === Y.BREAK)
                    break;
            }
            return this;
        };
        return Observable;
    }());
    Y.Observable = Observable;
    var PromiseResult = (function () {
        function PromiseResult(fullfilled, value, args) {
            if (this.useApply = args === Y.USEAPPLY) {
                this.args = value;
                this.value = value[0];
            }
            else {
                this.value = value;
                this.args = args;
            }
            this.isFullfilled = fullfilled;
        }
        PromiseResult.prototype.isRejected = function (me, reject) {
            if (!this.isFullfilled) {
                if (reject) {
                    if (this.useApply)
                        reject.apply(me, this.args);
                    else
                        reject.call(me, this.value, this.args);
                }
                return true;
            }
            return false;
        };
        PromiseResult.prototype.isResolved = function (me, resolve) {
            if (this.isFullfilled) {
                if (resolve) {
                    if (this.useApply)
                        resolve.apply(me, this.args);
                    else
                        resolve.call(me, this.value, this.args);
                }
                return true;
            }
            return false;
        };
        return PromiseResult;
    }());
    Y.PromiseResult = PromiseResult;
    var Promise = (function () {
        function Promise(statement, param) {
            var me = this;
            var resolve = function (value, value1) {
                if (value === me) {
                    var ex = new TypeError("cannot use self promise as fullfilled value.");
                    Y.logger.warn(ex, "y/Promise.resolve");
                }
                var vt = typeof value;
                if (vt === "function") {
                    try {
                        value.call(me, resolve, reject, param);
                    }
                    catch (ex) {
                        Y.logger.error(ex, "y/Module.resolve");
                        this.__y_promise_fullfill(false, ex);
                    }
                }
                else if (vt === "object" && value.then) {
                    value.then(function (v1, v2) { arguments.length <= 2 ? me.__y_promise_fullfill(true, v1, v2) : me.__y_promise_fullfill(true, toArray(arguments), Y.USEAPPLY); }, function (v1, v2) { arguments.length <= 2 ? me.__y_promise_fullfill(false, v1, v2) : me.__y_promise_fullfill(false, toArray(arguments), Y.USEAPPLY); });
                }
                else {
                    arguments.length <= 2 ? me.__y_promise_fullfill(true, value, value1) : me.__y_promise_fullfill(true, toArray(arguments), Y.USEAPPLY);
                }
            };
            var reject = function (v1, v2) { arguments.length <= 2 ? me.__y_promise_fullfill(false, v1, v2) : me.__y_promise_fullfill(false, toArray(arguments), Y.USEAPPLY); };
            if (typeof statement !== "function") {
                resolve.call(this, statement);
            }
            if (statement === undefined) {
                this.resolve = resolve;
                this.reject = reject;
            }
            else {
                if (typeof statement === "function") {
                    try {
                        statement.call(me, resolve, reject, param);
                    }
                    catch (ex) {
                        Y.logger.error(ex, "y/Promise.constructor");
                        me.__y_promise_fullfill(false, ex);
                    }
                }
                else {
                    resolve.call(this, statement === Y.NONE ? undefined : statement);
                }
            }
        }
        Promise.prototype.__y_promise_fullfill = function (isFullfilled, value, value1) {
            var _this = this;
            if (typeof isFullfilled !== "boolean") {
                this.__y_promise_result = isFullfilled;
                return;
            }
            var handlers = isFullfilled ? this.__y_promise_resolves : this.__y_promise_rejects;
            var result = this.__y_promise_result = new PromiseResult(isFullfilled, value, value1);
            this.__y_promise_rejects = undefined;
            this.__y_promise_resolves = undefined;
            this.resolve = this.reject = undefined;
            if (handlers) {
                Y.platform.async(function () {
                    if (result.useApply)
                        for (var i = 0, j = handlers.length; i < j; i++)
                            handlers[i].apply(_this, result.args);
                    else
                        for (var i = 0, j = handlers.length; i < j; i++)
                            handlers[i].call(_this, result.value, result.args);
                });
            }
        };
        Promise.prototype.then = function (resolve, reject, ck) {
            if (resolve === true || resolve === false)
                return this.fail(reject, resolve);
            if (reject === true || reject === false)
                return this.done(resolve, reject);
            return this.done(resolve, ck).fail(reject, ck);
        };
        Promise.prototype.done = function (handle, ck) {
            if (typeof handle !== "function")
                return this;
            var result = this.__y_promise_result;
            if (result) {
                result.isResolved(this, handle);
            }
            else {
                var handlers = this.__y_promise_resolves || (this.__y_promise_resolves = []);
                if (!ck || handlers.length == 0)
                    handlers.push(handle);
                else {
                    for (var i = 0, j = handlers.length; i < j; i++)
                        if (handlers[i] === handle)
                            return;
                    handlers.push(handle);
                }
            }
            return this;
        };
        Promise.prototype.fail = function (handle, ck) {
            if (typeof handle !== "function")
                return this;
            var result = this.__y_promise_result;
            if (result) {
                result.isRejected(this, handle);
            }
            else {
                var handlers = this.__y_promise_rejects || (this.__y_promise_rejects = []);
                if (!ck || handlers.length == 0)
                    handlers.push(handle);
                else {
                    for (var i = 0, j = handlers.length; i < j; i++)
                        if (handlers[i] === handle)
                            return;
                    handlers.push(handle);
                }
            }
            return this;
        };
        Promise.prototype.complete = function (handle, ck) {
            var _this = this;
            if (typeof handle !== "function")
                return this;
            var callback = function () { return handle.call(_this, _this.__y_promise_result); };
            return this.then(callback, callback, ck);
        };
        Promise.prototype.promise = function (promise) {
            var result = new Promise();
            var resolve = result.resolve, reject = result.reject;
            result.resolve = result.reject = undefined;
            this.then(function () {
                var _this = this;
                Y.platform.async(function () { return promise.call(result, resolve, reject, _this.__y_promise_result); });
            }, function () { result.__y_promise_fullfill(this.__y_promise_result); });
            return result;
        };
        //Usage:
        //1 when([m1,m2],(m)=>new Promise(m)) 第一个参数是数组
        // 2 when(promise1,promiseFun2,IThenable)
        Promise.when = function (deps, promiseMaker, arg2, arg3, arg4, arg5) {
            if (isArray(deps)) {
                //处理第一种用法
                return new Promise(function (resolve, reject) {
                    //let [deps,promiseMaker] = args;
                    var result = [];
                    var taskCount = deps.length;
                    var hasError;
                    var _loop_1 = function (i, j) {
                        var dep = deps[i];
                        if (typeof dep === "function")
                            dep = new Promise(dep);
                        else if (!dep || !dep.then) {
                            if (!promiseMaker)
                                throw new Error("promise make located at arguments[1] is required.");
                            dep = promiseMaker(dep);
                        }
                        if (!dep)
                            throw new Error("Cannot make " + deps[i] + " as Promise.");
                        dep.then(function (value) {
                            if (hasError)
                                return;
                            result[i] = value;
                            if (--taskCount == 0)
                                resolve(result);
                        }, function (err) {
                            hasError = err;
                            reject(err);
                        });
                    };
                    for (var i = 0, j = taskCount; i < j; i++) {
                        _loop_1(i, j);
                    }
                });
            }
            else {
                return Promise.when(toArray(arguments));
            }
        };
        return Promise;
    }());
    Promise.placehold = new Promise(Y.NONE);
    Y.Promise = Promise;
    var LogLevels;
    (function (LogLevels) {
        LogLevels[LogLevels["error"] = 0] = "error";
        LogLevels[LogLevels["warning"] = 1] = "warning";
        LogLevels[LogLevels["notice"] = 2] = "notice";
        LogLevels[LogLevels["info"] = 3] = "info";
        LogLevels[LogLevels["debug"] = 4] = "debug";
    })(LogLevels = Y.LogLevels || (Y.LogLevels = {}));
    var Log = (function () {
        function Log(message, path, lv) {
            if (path === void 0) { path = ""; }
            if (lv === void 0) { lv = LogLevels.info; }
            this.path = path;
            this.level = lv;
            this.time = new Date();
            if (Y.debugMode) {
                if (message instanceof Error) {
                    var err = message;
                    if (!err.stack) {
                        try {
                            throw err;
                        }
                        catch (ex) {
                            message = ex;
                        }
                    }
                }
            }
            this.message = message;
        }
        Log.prototype.toString = function () {
            var lv = this.level === undefined ? LogLevels[LogLevels.info] : (typeof this.level === "string" ? this.level : LogLevels[this.level]);
            return "[" + lv + ":" + (this.path || "") + "]" + this.message;
        };
        Log.error = function (message, path) {
            console.error(new Log(message, path, LogLevels.error));
        };
        Log.warn = function (message, path) {
            console.warn(new Log(message, path, LogLevels.warning));
        };
        Log.notice = function (message, path) {
            console.log(new Log(message, path, LogLevels.notice));
        };
        Log.info = function (message, path) {
            console.info(new Log(message, path, LogLevels.info));
        };
        Log.debug = function (message, path) {
            if (Y.debugMode)
                console.debug(new Log(message, path, LogLevels.debug));
        };
        return Log;
    }());
    Y.Log = Log;
    Y.logger = {
        error: Log.error,
        warn: Log.warn,
        notice: Log.notice,
        info: Log.info,
        debug: Log.debug
    };
    ////////////////////////////////////
    /// 平台抽象
    ///////////////////////////////////
    var tagContainers;
    var Platform = (function () {
        function Platform() {
            this.attach = window["attachEvent"] ? function (elem, evtname, fn) { elem.attachEvent("on" + evtname, fn); } : function (elem, evtname, fn) { elem.addEventListener(evtname, fn, false); };
            this.detech = window["detechEvent"] ? function (elem, evtname, fn) { elem.detechEvent("on" + evtname, fn); } : function (elem, evtname, fn) { elem.removeEventListener(evtname, fn, false); };
            this.async = window["setImmediate"] ? function (handler) { return setImmediate(handler); } : function (handler) { return setTimeout(handler, 0); };
        }
        Platform.prototype.attach = function (elem, evtName, evtHandler) { };
        //解除事件
        Platform.prototype.detech = function (elem, evtName, evtHandler) { };
        Platform.prototype.async = function (handler) { return 0; };
        Platform.prototype.cloneNode = function (elem) {
            var tag = elem.tagName;
            if (elem.cloneNode)
                return elem.cloneNode(true);
            if (!tagContainers) {
                tagContainers = {
                    "": document.createElement("div"),
                    "LEGEND": document.createElement("fieldset"),
                    "DT": document.createElement("DL"),
                    "LI": document.createElement("ul"),
                    "TR": document.createElement("tbody"),
                    "TD": document.createElement("tr"),
                    "TBODY": document.createElement("table"),
                    "OPTION": document.createElement("select")
                };
                tagContainers["THEAD"] = tagContainers["TFOOT"] = tagContainers.TBODY;
                tagContainers["DD"] = tagContainers.DT;
            }
            var ctn = tagContainers[tag] || tagContainers[""];
            var html = elem.outerHTML + "";
            ctn.innerHTML = html;
            return ctn.firstChild;
        };
        Platform.prototype.createElement = function (tagName) {
            return document.createElement(tagName);
        };
        Platform.prototype.getElement = function (selector, context) {
            if (typeof selector === "string") {
                var cssText = selector;
                var firstChar = cssText[0];
                if (firstChar === "#")
                    return document.getElementById(cssText.substr(1));
                if (firstChar === ".") {
                    context || (context = document);
                    var rs = context.getElementsByClassName(cssText.substr(1));
                    if (rs !== null && rs.length)
                        return rs[0];
                }
                else {
                    context || (context = document);
                    var rs = context.getElementsByTagName(cssText);
                    if (rs !== null && rs.length)
                        return rs[0];
                }
            }
            else
                return selector;
        };
        //获取内容
        Platform.prototype.getStatic = function (url) {
            return this.ajax({
                url: url,
                method: "GET"
            });
        };
        Platform.prototype.ajax = function (opts) {
            return new Promise(function (resolve, reject) {
                var http = null;
                if (window["XMLHttpRequest"]) {
                    http = new XMLHttpRequest();
                    if (http.overrideMimeType)
                        http.overrideMimeType("text/xml");
                }
                else if (window["ActiveXObject"]) {
                    var activeName = ["MSXML2.XMLHTTP", "Microsoft.XMLHTTP"];
                    for (var i = 0; i < activeName.length; i++)
                        try {
                            http = new ActiveXObject(activeName[i]);
                            break;
                        }
                        catch (e) { }
                }
                if (http == null)
                    throw "Cannot create XmlHttpRequest Object";
                var url = opts.url;
                if (!url)
                    throw "require url";
                var method = opts.method ? opts.method.toUpperCase() : "GET";
                var data = opts.data;
                if (typeof data === 'object') {
                    var content = "";
                    for (var n in data) {
                        content += encodeURIComponent(n) + "=" + encodeURIComponent(data[n]) + "&";
                    }
                    data = content;
                }
                if (method == "POST") {
                    http.setRequestHeader("Content-type", "application/x-www-four-urlencoded");
                }
                else if (method == "GET") {
                    if (url.indexOf("?")) {
                        if (data)
                            url += "&" + data;
                    }
                    else if (data)
                        url += "?" + data;
                    data = null;
                }
                var headers = opts.headers;
                if (headers)
                    for (var n in headers)
                        http.setRequestHeader(n, headers[n]);
                var httpRequest = http;
                httpRequest.onreadystatechange = function () {
                    if (httpRequest.readyState == 4) {
                        var result = void 0;
                        if (opts.dataType == "json") {
                            result = JSON.parse(httpRequest.responseText);
                        }
                        else if (opts.dataType == "xml") {
                            result = httpRequest.responseXML;
                        }
                        else
                            result = httpRequest.responseText;
                        resolve(result, http);
                    }
                };
                httpRequest.onerror = function (err) {
                    Y.logger.error(err, "y/ajax");
                    reject(err, httpRequest);
                };
                httpRequest.open(method, url, true);
                httpRequest.send(data);
            });
        }; //end ajax
        return Platform;
    }());
    Y.Platform = Platform;
    Y.platform = new Platform();
    var o2Str = Object.prototype.toString;
    function isArray(o) {
        if (!o)
            return false;
        return o2Str.call(o) == "[object Array]";
    }
    Y.isArray = isArray;
    var aslice = Array.prototype.slice;
    function toArray(o) {
        if (!o)
            return [];
        return aslice.call(o);
    }
    Y.toArray = toArray;
    function toJsonString(text) {
        return text ? text.replace(/\\/, "\\\\").replace(/\n/i, "\\n").replace(/\r/i, "\\r").replace(/"/i, "\\\"") : "";
    }
    Y.toJsonString = toJsonString;
    function trim(text) {
        return text ? text.replace(Y.trimRegex, "") : text;
    }
    Y.trim = trim;
    function hasClass(element, clsname) {
        var clsText = element.className;
        if (!clsText)
            return false;
        if (!clsname)
            return false;
        clsname = clsname.replace(Y.trimRegex, "");
        if (!clsname)
            return false;
        var at = 0;
        while (true) {
            at = clsText.indexOf(clsname, at);
            var lastAt = at + clsname.length;
            if (at < 0)
                return false;
            if (at > 0) {
                var ch = clsText[at - 1];
                if (ch !== " " && ch !== "\r" && ch !== "\t" && ch !== "\n") {
                    at = lastAt;
                    continue;
                }
            }
            lastAt++;
            if (lastAt < clsText.length) {
                var ch = clsText[lastAt];
                if (ch !== " " && ch !== "\r" && ch !== "\t" && ch !== "\n") {
                    at = lastAt - 1;
                    continue;
                }
            }
            return true;
        }
    }
    Y.hasClass = hasClass;
    function addClass(element, clsname) {
        if (hasClass(element, clsname))
            return false;
        element.className = element.className + " " + clsname;
        return true;
    }
    Y.addClass = addClass;
    function removeClass(element, clsname) {
        var clsText = element.className;
        if (!clsText)
            return false;
        if (!clsname)
            return false;
        clsname = clsname.replace(Y.trimRegex, "");
        if (!clsname)
            return false;
        var at = 0;
        while (true) {
            at = clsText.indexOf(clsname, at);
            var lastAt = at + clsname.length;
            if (at < 0)
                return false;
            if (at > 0) {
                var ch = clsText[at - 1];
                if (ch !== " " && ch !== "\r" && ch !== "\t" && ch !== "\n") {
                    at = lastAt;
                    continue;
                }
            }
            if (lastAt == clsText.length) {
                element.className = clsText.substring(0, at);
            }
            lastAt++;
            if (lastAt < clsText.length) {
                var ch = clsText[lastAt];
                if (ch !== " " && ch !== "\r" && ch !== "\t" && ch !== "\n") {
                    at = lastAt - 1;
                    continue;
                }
            }
            element.className = clsText.substring(0, at) + " " + clsText.substr(at);
            return true;
        }
    }
    Y.removeClass = removeClass;
    ////////////////////////////////////
    /// 多语言化
    ////////////////////////////////////
    var langId;
    function language(lng) {
        if (langId === lng)
            return;
    }
    Y.language = language;
    ////////////////////////////////////
    //Uri
    ////////////////////////////////////
    var Uri = (function () {
        function Uri(urlOrPath, relative) {
            if (!urlOrPath)
                return;
            this.orignal = urlOrPath;
            this.relative = relative;
            urlOrPath = this._parseQueryAndHash(urlOrPath);
            var basPath;
            var relativePath;
            var matches = urlOrPath.match(Uri.patten);
            //urlOrpath 是个绝对地址，它的路径就是绝对地址的路径,拼接路径
            if (matches != null) {
                relativePath = "";
                basPath = matches[4];
            }
            else {
                if (relative) {
                    if (relative instanceof Uri) {
                        matches = [null, relative.protocol, relative.domain, relative.port, relative.path];
                    }
                    else
                        matches = relative.match(Uri.patten);
                    //相对url是个绝对地址
                    if (matches) {
                        relativePath = urlOrPath;
                        basPath = (relativePath[0] == "/") ? "" : matches[4];
                    }
                    else {
                        relativePath = urlOrPath;
                        basPath = (relativePath[0] == "/") ? "" : relative;
                    }
                }
                else {
                    relativePath = urlOrPath;
                    basPath = Uri.current.path;
                }
            }
            if (matches) {
                this.protocol = matches[1];
                this.domain = matches[2];
                this.port = parseInt(matches[3]);
                this.host = "";
                if (this.protocol)
                    this.host = this.protocol + "://";
                if (this.domain)
                    this.host += this.domain;
                if (this.port)
                    this.host += ":" + this.port;
            }
            var paths = (basPath + "/" + relativePath).split("/");
            var rs = [];
            for (var i = 0, j = paths.length; i < j; i++) {
                var ps = paths[i];
                if (!ps)
                    continue;
                if (ps === ".")
                    continue;
                if (ps === "..") {
                    rs.pop();
                    continue;
                }
                rs.push(ps);
            }
            this._makeAbsolute(rs);
        }
        Uri.prototype.clone = function (target) {
            target || (target = new Uri());
            for (var n in this)
                target[n] = this[n];
        };
        Uri.prototype.toString = function () { return this.absolute; };
        Uri.prototype._makeAbsolute = function (rels) {
            this.file = rels.pop();
            this.dir = rels.join("/");
            if (this.file)
                rels.push(this.file);
            this.path = "/" + rels.join("/");
            this.location = this.absolute = (this.host || Uri.current.host) + this.path;
            if (this.querystring)
                this.absolute += "?" + this.querystring;
            if (this.hash)
                this.absolute += "#" + this.hash;
        };
        Uri.prototype._parseQueryAndHash = function (str) {
            if (!str) {
                this.query = {};
                return "";
            }
            var at = str.indexOf("?");
            var path;
            var querystring;
            var hashpart;
            if (at >= 0) {
                hashpart = querystring = str.substr(at + 1);
                path = str.substr(0, at);
            }
            else
                hashpart = str;
            at = hashpart.indexOf("#");
            if (at >= 0) {
                this.hash = hashpart.substr(at + 1);
                if (querystring)
                    querystring = hashpart.substr(0, at);
                if (!path)
                    path = hashpart.substr(0, at);
            }
            else
                path = hashpart;
            this.query = Uri.parseQueryString(this.querystring = querystring);
            return path;
        };
        Uri.parseQueryString = function (querystr, extra) {
            var result = {};
            if (!querystr)
                return result;
            var sets = querystr.split('&');
            for (var i = 0, j = sets.length; i < j; i++) {
                var set = sets[i];
                var _a = set.split('='), key = _a[0], value = _a[1];
                result[key] = value;
                if (extra)
                    extra[key] = value;
            }
            return result;
        };
        return Uri;
    }());
    Uri.patten = /^(?:([a-zA-Z][a-zA-Z0-9]*):\/\/)([^\:\/\.]+(?:\.[^\:\/\.]+)*)(?:\:(\d{2,5}))?((?:\/[^\/\?#]*)*)/i;
    Uri.current = new Uri(location.href);
    Y.Uri = Uri;
    ////////////////////////////////////
    /// 模块化
    ////////////////////////////////////
    var ControlOpts = (function () {
        function ControlOpts() {
        }
        return ControlOpts;
    }());
    var ModuleParameter = (function () {
        function ModuleParameter() {
        }
        return ModuleParameter;
    }());
    var ModuleTypes;
    (function (ModuleTypes) {
        ModuleTypes[ModuleTypes["none"] = 0] = "none";
        ModuleTypes[ModuleTypes["script"] = 1] = "script";
        ModuleTypes[ModuleTypes["css"] = 2] = "css";
        ModuleTypes[ModuleTypes["json"] = 3] = "json";
        ModuleTypes[ModuleTypes["text"] = 4] = "text";
        ModuleTypes[ModuleTypes["image"] = 5] = "image";
        ModuleTypes[ModuleTypes["page"] = 6] = "page";
    })(ModuleTypes = Y.ModuleTypes || (Y.ModuleTypes = {}));
    var ModuleOpts = (function () {
        function ModuleOpts() {
        }
        return ModuleOpts;
    }());
    Y.ModuleOpts = ModuleOpts;
    var Module = (function (_super) {
        __extends(Module, _super);
        function Module(opts, container) {
            var _this = _super.call(this) || this;
            var me = _this;
            _this.container = container;
            _this.alias = opts.alias || opts.url;
            if (opts.url) {
                _this.uri = new Uri(opts.url, (container && container.uri) ? container.uri : null);
            }
            _this.ref_count = 0;
            _this._disposing = [];
            _this.data = opts.data || {};
            _this.type = opts.type || Module.getResType(opts.url) || ModuleTypes.none;
            _this.expiry = opts.expiry;
            _this.activeTime = new Date();
            _this.element = opts.element;
            _this.value = opts.value;
            if (_this.type === ModuleTypes.none) {
                _this.resolve();
                return _this;
            }
            if (_this.value !== undefined || _this.value === Y.NONE) {
                _this.resolve(_this.value);
                return _this;
            }
            if (opts.expiry != -1) {
                if (!Module.clearTimer)
                    Module.clearTimer = setInterval(Module.clearExpired, Module.clearInterval || 60000);
            }
            var _a = _this, resolve = _a.resolve, reject = _a.reject;
            _this.reject = _this.reject = undefined;
            if (_this.uri) {
                Module.loadRes(_this.uri.absolute, _this.type).then(function (newOpts) {
                    _this._combineModuleOpts(opts, newOpts);
                    _this._init(opts, resolve, reject);
                }, function (err) { return reject(err); });
            }
            else {
                _this._init(opts, resolve, reject);
            }
            return _this;
        }
        Module.getResType = function (url) {
            if (!url)
                return;
            if (/.js$/i.test(url))
                return ModuleTypes.script;
            if (/.css$/i.test(url))
                return ModuleTypes.css;
            if (/.json$/i.test(url))
                return ModuleTypes.json;
            if (/(?:.html$)|(?:.htm$)/i.test(url))
                return ModuleTypes.page;
            if (/(?:.jpg$)|(?:.png$)|(?:.bmp$)|(?:.gif$)/i.test(url))
                return ModuleTypes.image;
            return undefined;
        };
        Module.prototype._combineModuleOpts = function (dest, src) {
            if (!src) {
                return dest;
            }
            dest.expiry = dest.expiry;
            dest.define = src.define;
            dest.lang = src.lang;
            dest.data = src.data;
            var _deps = src.shares;
            if (_deps) {
                if (!dest.shares)
                    dest.shares = [];
                for (var i = 0, j = _deps.length; i < j; i++) {
                    dest.shares.push(_deps[i]);
                }
            }
            _deps = src.scopes;
            if (_deps) {
                if (!dest.scopes)
                    dest.scopes = [];
                for (var i = 0, j = _deps.length; i < j; i++) {
                    dest.scopes.push(_deps[i]);
                }
            }
            if (src.imports)
                dest.imports = src.imports;
            dest.element = src.element;
            return dest;
        };
        Module.prototype._init = function (opts, resolve, reject) {
            var _this = this;
            var me = this;
            this.element = opts.element;
            var langUrl = opts.lang ? opts.lang.replace("{language}", langId) : null;
            var defineUrl = typeof opts.define == "string" ? opts.define : null;
            var add_ref = function (deps) {
                if (!deps)
                    return;
                for (var i = 0, j = deps.length; i < j; i++) {
                    var dep = deps[i];
                    if (dep) {
                        dep.ref_count++;
                    }
                }
            };
            var tasks = [];
            Promise.when(langUrl ? this.load(langUrl) : Promise.placehold, defineUrl ? this.load(defineUrl) : Promise.placehold, opts.imports ? this.loadMany(opts.imports) : Promise.placehold, opts.scopes ? this.loadMany(opts.scopes) : Promise.placehold, opts.shares ? this.loadMany(opts.shares) : Promise.placehold).done(function (result) {
                var langPack = result[0], define = result[1], imports = result[2], scopes = result[3], globals = result[4];
                add_ref(_this.shares = globals);
                add_ref(_this.scopes = scopes);
                add_ref(_this.imports = imports);
                _this._finish(_this.value, resolve);
            }).fail(function (err) {
                reject(err);
            });
        };
        Module.prototype._finish = function (success, resolve) {
            //this.value = success;
            //if(this.define && this.error===undefined)this.value = this.define.apply(this,this.imports);               
        };
        Module.prototype.disposing = function (handler) {
            if (this._disposing) {
                this._disposing.push(handler);
            }
            else
                throw "disposed";
            return this;
        };
        Module.prototype.dispose = function () {
            if (this._disposing === undefined)
                return;
            var release_ref = function (deps, expireTime) {
                if (!deps)
                    return;
                for (var i = 0, j = deps.length; i < j; i++) {
                    var dep = deps[i];
                    if (dep) {
                        if (--dep.ref_count == 0 && dep.expiry && dep.activeTime.valueOf() < expireTime) {
                            if (dep.alias)
                                delete Module.cache[dep.alias];
                            if (dep.uri)
                                delete Module.cache[dep.uri.absolute];
                        }
                    }
                }
            };
            var expireTime = (new Date()).valueOf() - Module.aliveMilliseconds || 300000;
            release_ref(this.scopes, expireTime);
            release_ref(this.imports, expireTime);
            release_ref(this.shares, expireTime);
            this.scopes = this.imports = this.shares = undefined;
            if (this.value && this.value.dispose) {
                this.value.dispose();
            }
            for (var n in this._disposing) {
                var fn = this._disposing[n];
                fn.call(this);
            }
        };
        Module.getDocumentHead = function () {
            if (Module.documentHead)
                return Module.documentHead;
            var heads = document.getElementsByTagName("head");
            if (heads != null && heads.length)
                return Module.documentHead = heads[0];
            return document.body || document.documentElement;
        };
        Module.prototype.toString = function () {
            return "{object,Module(alias:" + this.alias + ",url:" + this.uri + ",type:" + ModuleTypes[this.type] + ")}";
        };
        Module.prototype.load = function (urlOrOpts) {
            if (!urlOrOpts) {
                Y.logger.warn(new Error("empty argument"), "y/Module.load");
                return Module.empty;
            }
            var opts;
            if (typeof urlOrOpts === "string") {
                opts = { url: urlOrOpts, alias: urlOrOpts };
            }
            else
                opts = urlOrOpts;
            var module = Module.cache[opts.alias] || Module.cache[opts.url];
            if (module) {
                module.activeTime = new Date();
                return module;
            }
            module = new Module(opts, this);
            Module.cache[module.alias] = Module.cache[module.alias] = module;
            return module;
        };
        Module.prototype.loadMany = function (deps) {
            var _this = this;
            if (!deps) {
                Y.logger.warn(new Error("empty argument"), "y/Module.loadMany");
                return Module.empty;
            }
            if (deps.length == 0)
                return Module.empty;
            return Promise.when(deps, function (dep) {
                return _this.load(dep);
            });
        };
        Module.prototype.createController = function (controllerArea) {
            var area = Y.platform.getElement(controllerArea);
            var controllerType = this.data["y-controller-type"];
            if (!controllerType) {
                var proto = this.value;
                if (typeof proto === "function")
                    controllerType = proto;
                else {
                    controllerType = function () { };
                    controllerType.prototype = proto;
                    this.data["y-controller-type"] = controllerType;
                }
            }
            var controller = new controllerType();
            controller.module = this;
            var view;
            var viewTemplate = this.data["y-controller-view"];
            if (viewTemplate == null) {
            }
            else {
            }
            //controller.view = view;
            controller.model = view.model.$accessor;
            return controller;
        };
        Module.clearExpired = function () {
            /*let expireTime :number = (new Date()).valueOf() - Module.aliveMilliseconds|| 300000;
            let cache:{[index:string]:Module}={};
            let moduleCache:{[index:string]:Module}=Module.cache;
            let count:number = 0;
            for(let n in moduleCache){
                let module = moduleCache[n];
                if(module.ref_count<=0 && module.activeTime.valueOf()<expireTime){
                    module.dispose();
                }else{ cache[n] = module;count++;}
            }
            Module.cache = cache;
            if(count===0) {
                clearInterval(Module.clearTimer);
                Module.clearTimer = undefined;
            }*/
        };
        return Module;
    }(Promise));
    Module.clearInterval = 60000;
    Module.aliveMilliseconds = 300000;
    Module.cache = {};
    Module.loaders = {
        "script": function (url) {
            return new Promise(function (resolve, reject) {
                var elem = document.createElement("script");
                elem.src = url;
                elem.type = "text/javascript";
                var getExports = function () {
                    var exports = Module.exports;
                    if (exports === Y.NONE)
                        return undefined;
                    Module.exports = Y.NONE;
                    return exports;
                };
                if (elem["onreadystatechange"] !== undefined) {
                    elem.onreadystatechange = function () {
                        if (elem.readyState == 4 || elem.readyState == "complete") {
                            resolve({ value: getExports(), element: elem });
                        }
                    };
                }
                else
                    elem.onload = function () {
                        resolve({ value: getExports(), element: elem, url: url, type: ModuleTypes.script });
                    };
                elem.onerror = function (ex) {
                    Y.logger.error(ex, "y/module.loadRes");
                    reject(ex, elem);
                };
                Module.getDocumentHead().appendChild(elem);
            });
        },
        "css": function (url) {
            return new Promise(function (resolve, reject) {
                var elem = document.createElement("link");
                elem.href = url;
                elem.type = "text/css";
                elem.rel = "stylesheet";
                var getExports = function () {
                    return document.styleSheets[document.styleSheets.length - 1];
                };
                if (elem["onreadystatechange"] !== undefined) {
                    elem.onreadystatechange = function () {
                        if (elem.readyState == 4 || elem.readyState == "complete") {
                            resolve({ value: getExports(), element: elem, url: url, type: ModuleTypes.css });
                        }
                    };
                }
                else
                    elem.onload = function () {
                        resolve({ value: getExports(), element: elem, url: url });
                    };
                elem.onerror = function (ex) {
                    Y.logger.error(ex, "y/module.loadRes");
                    reject(ex, elem);
                };
                Module.getDocumentHead().appendChild(elem);
            });
        },
        "json": function (url) {
            return new Promise(function (resolve, reject) {
                Y.platform.getStatic(url).done(function (text) {
                    try {
                        var json = JSON.parse(text);
                        resolve({ value: json, url: url, type: ModuleTypes.json });
                    }
                    catch (ex) {
                        reject(ex);
                    }
                }).fail(reject);
            });
        },
        "text": function (url) {
            return new Promise(function (resolve, reject) {
                Y.platform.getStatic(url).done(function (text) {
                    resolve({ value: text, url: url, type: ModuleTypes.text });
                }).fail(reject);
            });
        },
        "page": function (url) {
            return new Promise(function (resolve, reject) {
                Y.platform.getStatic(url).done(function (html) {
                    var elem = document.createElement("div");
                    html = html.replace("<!DOCTYPE html>", "")
                        .replace(/<html\s/i, "<div ")
                        .replace(/<\/html>/i, "<div ")
                        .replace(/<head\s/i, "<div class='y-head' ")
                        .replace(/<\/head>/i, "</div>")
                        .replace(/<body\s/i, "<div class='y-body' ")
                        .replace(/<\/body>/i, "</div>");
                    elem.innerHTML = html;
                    var shares = [];
                    var scopes = [];
                    var scripts = toArray(elem.getElementsByTagName("script"));
                    var defineScript;
                    for (var i = 0, j = scripts.length; i < j; i++) {
                        var script = scripts[i];
                        var url_1 = script.getAttribute("src");
                        var defineAttr = script.getAttribute("y-module-define");
                        if (defineAttr !== undefined) {
                            defineScript = script;
                            defineScript.parentNode.removeChild(defineScript);
                        }
                        if (!url_1)
                            continue;
                        var alias = script.getAttribute("y-alias");
                        var scriptOpts = {
                            url: url_1,
                            alias: alias || url_1,
                            type: ModuleTypes.script
                        };
                        var isScope = script.getAttribute("y-module-scope");
                        var isGlobal = script.getAttribute("y-module-global");
                        if (isGlobal !== null && isGlobal !== undefined)
                            scriptOpts.expiry = -1;
                        (isScope !== null && isScope !== undefined ? scopes : shares).push(scriptOpts);
                        script.parentNode.removeChild(script);
                    }
                    var links = toArray(elem.getElementsByTagName("link"));
                    for (var i = 0, j = links.length; i < j; i++) {
                        var link = links[i];
                        var url_2 = link.getAttribute("href");
                        if (!url_2)
                            continue;
                        var alias = link.getAttribute("y-alias");
                        var cssOpts = {
                            url: url_2,
                            alias: alias || url_2,
                            type: ModuleTypes.css
                        };
                        var isScope = link.getAttribute("y-module-scope");
                        var isGlobal = link.getAttribute("y-module-global");
                        if (isGlobal !== null && isGlobal !== undefined)
                            cssOpts.expiry = -1;
                        (isScope !== null && isScope !== undefined ? scopes : shares).push(cssOpts);
                        link.parentNode.removeChild(link);
                    }
                    var moOpts = {
                        url: url,
                        type: ModuleTypes.page,
                        element: elem,
                        scopes: scopes,
                        shares: shares
                    };
                    if (defineScript.src) {
                        moOpts.define = defineScript.src;
                    }
                    else {
                        moOpts.define = new Function(defineScript.innerHTML);
                    }
                    resolve(moOpts);
                }).fail(reject);
            });
        }
    };
    Module.loadRes = function (url, type) {
        if (!url)
            return new Promise(Module.nonRes);
        return new Promise(function (resolve, reject) {
            if (type === undefined)
                type = Module.getResType(url);
            var loader = Module.loaders[ModuleTypes[type]];
            if (!loader) {
                var ex = new Error("Cannot load this resource " + name);
                Y.logger.error(ex, "y/module.loadRes");
                reject(ex);
                return;
            }
            resolve(loader(url));
        });
    };
    Module.empty = new Module({ type: ModuleTypes.none });
    Module.nonRes = { type: ModuleTypes.none };
    Y.Module = Module;
    Y.platform.attach(window, "aload", function () {
        var rootOpts = { url: location.href, alias: "$root", value: window };
        var parseModOpts = function (elem) {
            var url = elem.src || elem.href;
            if (!url)
                return;
            var result = {};
            var alias = elem.getAttribute("y-alias");
            var valName = elem.getAttribute("y-module-value");
            if (valName) {
                eval("valName=" + valName);
            }
            else
                valName = Y.NONE;
            result.url = url;
            result.alias = alias || url;
            result.expiry = -1;
            result.value = valName;
            return result;
        };
        var defineScript;
        var scripts = document.getElementsByTagName("script");
        for (var i = 0, j = scripts.length; i < j; i++) {
            var script = scripts[i];
            var opts = parseModOpts(script);
            if (opts)
                Module.cache[opts.alias] = Module.cache[opts.url] = new Module(opts);
            var defineAttr = script.getAttribute("y-module-define");
            if (defineAttr !== undefined && defineAttr !== null) {
                defineScript = script;
                opts.define = script.src || (new Function("(function(){" + script.innerHTML + "})()"));
            }
        }
        var links = document.getElementsByTagName("link");
        for (var i = 0, j = links.length; i < j; i++) {
            var opts = parseModOpts(links[i]);
            if (opts)
                Module.cache[opts.alias] = Module.cache[opts.url] = new Module(opts);
        }
        Module.root = new Module(rootOpts).done(function (rootModule) {
            var controller = Module.controller = rootModule.createController(document.body);
            if (controller.init)
                controller.init(controller.model, controller.view);
        });
        Module.root.uri = Uri.current;
    });
    var Model = (function () {
        function Model(name, subject) {
            if (name === undefined) {
                this._name = "";
            }
            else {
                if (name instanceof Object) {
                    Model._define(this, name);
                    return;
                }
                this._name = name;
            }
            this._subject = subject === undefined ? {} : subject;
            var self = this;
            var accessor = function (newValue) {
                if (newValue === undefined) {
                    return self._subject[self._name];
                }
                self.set_value(newValue);
                return accessor;
            };
            accessor.subscribe = function (handler) {
                self.subscribe(handler);
                return accessor;
            };
            accessor.unsubscribe = function (handler) {
                self.unsubscribe(handler);
                return accessor;
            };
            accessor.get_value = function () {
                return self.get_value();
            };
            accessor.set_value = function (value, extra) {
                self.set_value(value, extra);
                return accessor;
            };
            accessor.toString = function () { return self.get_value(); };
            this.$model = accessor.$model = this;
            this.$accessor = accessor.$accessor = accessor;
            accessor.$modelType = this.$modelType = ModelTypes.any;
        }
        Model.prototype.name = function (n) { if (n === undefined) {
            return this._name;
        } return this._name = n; };
        Model.prototype.container = function () { return this._superior; };
        Model.prototype.root = function () {
            if (this._root)
                return this._root;
            var result = this;
            while (true) {
                if (!result._superior)
                    return this._root = result;
                else
                    result = result._superior;
            }
        };
        Model.prototype.subject = function (newSubject, source) {
            if (newSubject === undefined) {
                return this._subject;
            }
            var oldSubject = this._subject;
            if (oldSubject === newSubject) {
                return oldSubject;
            }
            var oldValue = oldSubject[this._name];
            newSubject = this._subject = newSubject || {};
            var newValue = newSubject[this._name];
            if (oldValue === newValue) {
                return this._subject;
            }
            newSubject[this._name] = oldValue;
            this.set_value(newValue, source);
            return newSubject;
        };
        Model.prototype.subscribe = function (handler) {
            var handlers = this._changeHandlers;
            if (!handlers) {
                handlers = this._changeHandlers = new Array();
            }
            handlers.push(handler);
            return this;
        };
        Model.prototype.unsubscribe = function (handler) {
            var handlers = this._changeHandlers;
            if (!handlers) {
                return;
            }
            for (var i = 0, j = handlers.length; i < j; i++) {
                var existed = handlers.shift();
                if (existed !== handler) {
                    handlers.push(existed);
                }
            }
            return this;
        };
        //触发事件
        Model.prototype._notifyValuechange = function (evt, ignoreSuperior) {
            var changeHandlers = this._changeHandlers;
            if (changeHandlers) {
                for (var i = 0, j = changeHandlers.length; i < j; i++) {
                    var handler = changeHandlers.shift();
                    handler.call(this, this.$accessor, evt);
                    changeHandlers.push(handler);
                }
            }
            var value = this._subject[this._name];
            //向上传播事件
            var superior = this._superior;
            if (superior && ignoreSuperior !== true) {
                evt = new ModelEvent(this, ModelActions.child, this._subject, undefined, evt);
                superior._notifyValuechange(evt);
            }
        };
        Model.prototype.get_value = function () { return this._subject[this._name]; };
        Model.prototype.set_value = function (newValue, source) {
            var subject = this._subject;
            //得到原先的值
            var oldValue = subject[this._name];
            //如果原先的值与新赋的值一样，就直接返回，不触发任何事件。
            if (oldValue === newValue) {
                return this;
            }
            //如果有成员，赋值就不能为空，如果是空，就认为是个新的Object或数组
            if (this._members) {
                if (!newValue) {
                    newValue = this._itemProto === undefined ? {} : [];
                }
            }
            //把新的值赋给对象
            subject[this._name] = newValue;
            //如果第二个参数指定为false，表示不需要触发事件，立即返回。
            if (source === false) {
                return this;
            }
            //创建一个事件对象
            var evt = new ModelEvent(this, ModelActions.change, newValue, oldValue, source);
            if (source !== undefined && typeof source === "number") {
                evt.index = source;
            }
            //触发事件
            this._notifyValuechange(evt, source instanceof ModelEvent);
            var members = this._members;
            if (members) {
                for (var name_1 in members) {
                    if (!members.hasOwnProperty(name_1)) {
                        continue;
                    }
                    var member = members[name_1];
                    member.subject(newValue, evt);
                }
            }
            return this;
        };
        Model.prototype.prop = function (name, defination) {
            var members = this._members;
            if (defination === undefined) {
                return members[name];
            }
            var subject = undefined;
            //name ===null是itemProto，不需要给subject设置值
            if (this._name !== null) {
                subject = this._subject[this._name];
                if (typeof subject !== "object") {
                    if (subject === null || subject === undefined) {
                        subject = this._subject[this._name] = {};
                    }
                    else
                        throw "Model's value must be {} when define its prop.";
                }
            }
            var member = members ? members[name] : null;
            if (member) {
                if (defination instanceof Object) {
                    var def = member._defination || (member._defination = {});
                    for (var n in defination) {
                        def[n] = defination[n];
                    }
                }
                return member;
            }
            member = new Model(name, subject);
            member._superior = this;
            this._member(member, name);
            return member;
        };
        Model.prototype._member = function (newMember, name) {
            var members = this._members || (this._members = {});
            newMember._superior = this;
            name || (name = newMember._name);
            members[name] = newMember;
            var aname = Model.chromeKeywords[name] || name.toString();
            this.$accessor[aname] = newMember.$accessor;
            if (this.$modelType === ModelTypes.any) {
                this.$accessor.$modelType = this.$modelType = ModelTypes.object;
            }
        };
        Model._define = function (model, opts, name) {
            var defination = undefined;
            for (var n in opts) {
                if (n === "") {
                    continue;
                }
                if (!opts.hasOwnProperty(n))
                    continue;
                if (n[0] !== "@") {
                    if (!Model.memberNameRegx.test(n)) {
                        defination[n] = opts[n];
                        continue;
                    }
                    var subOpts = opts[n];
                    var sub = new Model((n || (subOpts ? subOpts["@name"] : "")) || "");
                    Model._define(sub, subOpts);
                    model._member(sub);
                    if (subOpts instanceof Array) {
                        sub.toArray(subOpts[0]);
                    }
                    continue;
                }
                (defination || (defination = {}))[n] = opts[n];
            }
            model._defination = defination;
        };
        Model.prototype.clone = function (newSubject, newName) {
            if (newSubject === void 0) { newSubject = {}; }
            var newModel = new Model(newName = newName === undefined ? this._name : newName, newSubject);
            newModel._defination = this._defination;
            if (newModel._itemProto = this._itemProto) {
                newModel.toArray(this._itemProto);
                return newModel;
            }
            newModel.$modelType = this.$modelType;
            if (newModel._computed = this._computed) {
                return newModel;
            }
            var members = this._members;
            if (members) {
                var newMembers = newModel._members || (newModel._members = {});
                var value = newSubject[newName] || (newSubject[newName] = {});
                var newAccessor = newModel.$accessor;
                for (var name_2 in members) {
                    if (!members.hasOwnProperty(name_2)) {
                        continue;
                    }
                    var member = members[name_2];
                    var newMember = member.clone(value, name_2);
                    newMembers[name_2] = newMember;
                    var aname = Model.chromeKeywords[name_2] || name_2.toString();
                    newAccessor[aname] = newMember.$accessor;
                }
            }
            return newModel;
        };
        Model.prototype.computed = function (deps, codes) {
            var _this = this;
            if (this.$modelType !== ModelTypes.any) {
                throw "Already been computed.";
            }
            var isFn = typeof codes === "function";
            var fn = null;
            var args = [];
            var argnames = [];
            for (var n in deps) {
                if (!deps.hasOwnProperty(n)) {
                    continue;
                }
                var depModel = deps[n];
                if (!depModel.subscribe) {
                    throw n + " is not a model or accessor.";
                }
                depModel.subscribe(function (sender, evt) {
                    var value = _this._computed.getValue();
                    var computedEvt = new ModelEvent(_this, ModelActions.computed, value, undefined, evt);
                    _this._notifyValuechange(computedEvt, true);
                });
                argnames.push(n);
                args.push(depModel.$accessor);
            }
            if (!isFn) {
                args.push(codes);
                fn = Function.apply(undefined, args);
                args.pop();
            }
            this._computed = new Computed(this._superior.$accessor, args, fn);
            this.get_value = function () { return _this._computed.getValue(); };
            this.set_value = function () { throw "Computed member is readonly."; };
            this.prop = function () { throw "Computed member can not define member."; };
            this.$accessor.$modelType = this.$modelType = ModelTypes.computed;
            return this;
        };
        Model.prototype.toArray = function (itemProto) {
            var _this = this;
            if (this.$modelType !== ModelTypes.any) {
                throw "Already been computed.";
            }
            var value = this._subject[this._name];
            if (!value) {
                value = this._subject[this._name] = [];
            }
            if (itemProto === undefined) {
                itemProto = new Model(null, value);
            }
            else {
                if (!(itemProto instanceof Model))
                    itemProto = new Model(itemProto);
            }
            this._itemProto = itemProto;
            this.itemProto = function () { return _this._itemProto; };
            itemProto._superior = this;
            //(itemProto as Model)._root = this.root();            
            var accessor = this.$accessor;
            this.$modelType = accessor.$modelType = ModelTypes.array;
            accessor.push = function (itemValue) { _this.push(itemValue); return accessor; };
            accessor.pop = function (returnModel) {
                var result = _this.pop(returnModel);
                return (returnModel === true) ? result.$accessor : result;
            };
            accessor.unshift = function (itemValue) { _this.unshift(itemValue); return accessor; };
            accessor.shift = function (returnModel) {
                var result = _this.shift(returnModel);
                return returnModel === true ? result.$accessor : result;
            };
            accessor.get_item = function (index, returnModel) {
                var result = _this.get_item(index, returnModel);
                return returnModel === true ? result.$accessor : result;
            };
            accessor.set_item = function (index, itemValue) { _this.set_item(index, itemValue); return accessor; };
            accessor.count = function () { return _this.count(); };
            return itemProto;
        };
        Model.prototype.itemProto = function () {
            if (this.$modelType !== ModelTypes.array) {
                throw new NotArrayException();
            }
            return this._itemProto;
        };
        Model.prototype.count = function () {
            if (this.$modelType !== ModelTypes.array) {
                throw new NotArrayException();
            }
            var value = this._subject[this._name];
            if (!value) {
                return 0;
            }
            return value.length || 0;
        };
        Model.prototype.push = function (itemValue) {
            if (this.$modelType !== ModelTypes.array) {
                throw new NotArrayException();
            }
            var value = this._subject[this._name];
            if (!value) {
                value = this._subject[this._name] = [];
            }
            var evt = new ModelEvent(null, ModelActions.add, itemValue, undefined);
            evt.index = value.length;
            var evtp = new ModelEvent(this, ModelActions.child, value, value, evt);
            value.push(itemValue);
            this._notifyValuechange(evtp);
            return this;
        };
        Model.prototype.pop = function (returnModel) {
            if (this.$modelType !== ModelTypes.array) {
                throw new NotArrayException();
            }
            var value = this._subject[this._name];
            if (!value) {
                return undefined;
            }
            if (value.length === 0) {
                return undefined;
            }
            var itemValue = value.pop();
            var itemModel = this._members[value.length];
            var evt = new ModelEvent(itemModel, ModelActions.remove, itemValue, itemValue);
            evt.index = value.length;
            if (itemModel !== undefined) {
                delete this._members[value.length];
                itemModel._notifyValuechange(evt);
            }
            else {
                var evtc = new ModelEvent(this, ModelActions.child, value, value, evt);
                this._notifyValuechange(evt);
            }
            return returnModel ? itemModel : itemValue;
        };
        Model.prototype.unshift = function (itemValue) {
            if (this.$modelType !== ModelTypes.array) {
                throw new NotArrayException();
            }
            var value = this._subject[this._name];
            if (!value) {
                value = this._subject[this._name] = [];
            }
            var members = this._members;
            for (var i = 0, j = value.length - 1; i <= 0; j--) {
                var member = members[j.toString()];
                var index = j + 1;
                if (member instanceof Model) {
                    members[index] = member;
                    member.name(index);
                }
            }
            var itemModel = members[0];
            if (itemModel != null) {
                delete members[0];
            }
            value.unshift(itemValue);
            var evt = new ModelEvent(this, ModelActions.add, value, value);
            evt.index = 0;
            this._notifyValuechange(evt);
            return this;
        };
        Model.prototype.shift = function (returnModel) {
            if (this.$modelType !== ModelTypes.array) {
                throw new NotArrayException();
            }
            var value = this._subject[this._name];
            if (!value) {
                return undefined;
            }
            if (value.length === 0) {
                return undefined;
            }
            var members = this._members;
            var itemValue = value.shift();
            var itemModel = members[0];
            for (var i = 0, j = value.length; i < j; i++) {
                var member = members[i + 1];
                if (member instanceof Model) {
                    members[i] = member;
                    member.name(i);
                }
            }
            delete members[value.length];
            var evt = new ModelEvent(this, ModelActions.remove, value, value);
            evt.index = 0;
            this._notifyValuechange(evt);
            return returnModel ? itemModel : itemValue;
        };
        Model.prototype.get_item = function (index, returnModel) {
            if (this.$modelType !== ModelTypes.array) {
                throw new NotArrayException();
            }
            var value = this._subject[this._name];
            if (!value) {
                return undefined;
            }
            if (value.length === 0 || value.length === undefined) {
                return undefined;
            }
            if (returnModel === true) {
                var members = this._members || (this._members = {});
                var itemModel = members[index];
                if (itemModel !== undefined) {
                    return itemModel;
                }
                itemModel = this._itemProto.clone(value, index);
                itemModel._superior = this;
                members[index] = itemModel;
                return itemModel;
            }
            else {
                return value[index];
            }
        };
        Model.prototype.set_item = function (index, itemValue) {
            if (this.$modelType !== ModelTypes.array) {
                throw new NotArrayException();
            }
            var value = this._subject[this._name];
            if (!value) {
                value = this._subject[this._name] = [];
            }
            var members = this._members || (this._members = {});
            var itemModel = members[index];
            if (itemModel !== undefined) {
                itemModel.set_value(itemValue, index);
            }
            else {
                var oldItemValue = value[index];
                var action = index >= value.length ? ModelActions.add : ModelActions.change;
                value[index] = itemValue;
                var evt = new ModelEvent(null, action, itemValue, oldItemValue);
                evt.index = index;
                var evtp = new ModelEvent(this, ModelActions.child, value, value, evt);
                this._notifyValuechange(evtp);
            }
            return this;
        };
        return Model;
    }());
    Model.chromeKeywords = { "name": "name_", "apply": "apply_", "call": "call_", "prototype": "prototype_" };
    Model.memberNameRegx = /^[_a-zA-Z][_a-zA-Z0-9]*$/;
    Y.Model = Model;
    var ModelTypes;
    (function (ModelTypes) {
        ModelTypes[ModelTypes["any"] = 0] = "any";
        ModelTypes[ModelTypes["object"] = 1] = "object";
        ModelTypes[ModelTypes["array"] = 2] = "array";
        ModelTypes[ModelTypes["computed"] = 3] = "computed";
    })(ModelTypes = Y.ModelTypes || (Y.ModelTypes = {}));
    var ModelActions;
    (function (ModelActions) {
        ModelActions[ModelActions["change"] = 0] = "change";
        ModelActions[ModelActions["add"] = 1] = "add";
        ModelActions[ModelActions["remove"] = 2] = "remove";
        ModelActions[ModelActions["clear"] = 3] = "clear";
        ModelActions[ModelActions["child"] = 4] = "child";
        ModelActions[ModelActions["computed"] = 5] = "computed";
    })(ModelActions = Y.ModelActions || (Y.ModelActions = {}));
    var NotArrayException = (function () {
        function NotArrayException() {
        }
        NotArrayException.prototype.toString = function () { return "Call array function on Non-Array Model."; };
        return NotArrayException;
    }());
    Y.NotArrayException = NotArrayException;
    var ModelEvent = (function () {
        function ModelEvent(model, action, value, oldValue, source) {
            this.directSource = source;
            this.value = value;
            this.oldValue = oldValue;
            this.action = action;
            if (this.model = model)
                this.$ = model.$accessor;
        }
        ModelEvent.prototype.getSource = function (final) {
            if (final !== true)
                return this.directSource;
            if (this._finalSource)
                return this._finalSource;
            var result = this.directSource;
            while (true) {
                if (result.directSource)
                    result = result.directSource;
                else
                    return this._finalSource = result;
            }
        };
        return ModelEvent;
    }());
    Y.ModelEvent = ModelEvent;
    var Computed = (function () {
        function Computed(superior, args, func) {
            this.arguments = args;
            this["function"] = func;
            this.superior = superior;
        }
        Computed.prototype.getValue = function () {
            return this["function"].apply(this.superior, this.arguments);
        };
        return Computed;
    }());
    /////////////////////////////////////////////////
    // View
    //////////////////////////////////////////////////
    var ViewOpts = (function () {
        function ViewOpts() {
        }
        return ViewOpts;
    }());
    Y.ViewOpts = ViewOpts;
    var View = (function () {
        function View(opts) {
            var elem = this.element = Y.platform.getElement(opts.element);
            var existed = this.element["y-bind-view"];
            if (existed)
                existed.dispose();
            var controller = this.controller = opts.controller || {};
            this._binders = controller._binders || (controller._binders = {});
            if (this.controller.TEXT)
                this.label = function (key) { return controller.TEXT.call(controller, key); };
            var protoView = opts.prototypeView;
            if (!protoView) {
                if (opts.model && opts.model.$model) {
                    this.model = opts.model.$accessor;
                }
                else {
                    this.model = new Model("$", { "$": opts.model || {} }).$accessor;
                }
                this._binder = this.makeBinder();
            }
            else {
                this.element.innerHTML = protoView.element ? protoView.element.innerHTML : protoView._html;
                if (opts.model && opts.model.$model) {
                    this.model = opts.model.$accessor;
                }
                else {
                    this.model = new Model("$", { "$": opts.model || {} }).$accessor;
                }
                this._binder = protoView._binder;
                this._innerViews = protoView._innerViews;
            }
            if (!opts.nobind)
                this.bind();
        }
        View.prototype.toTemplate = function () {
            this._html = this.element.innerHTML;
            this.element = undefined;
            this.model = this.model.$model.clone({}, "$").$accessor;
            return this;
        };
        View.prototype.bind = function (value) {
            if (value)
                this.model(value);
            if (this.element["y-bind-view"])
                return this;
            this._binder(this.element, this.model, this);
            return this.element["y-bind-view"] = this;
        };
        View.prototype.getFunc = function (fname) {
            var fn = this.controller[fname];
            if (fn && typeof fn === "function")
                return fn;
            return null;
        };
        View.prototype.label = function (key) {
            var text;
            var ctrlr = this.controller;
            if (!ctrlr)
                return key;
            if (ctrlr._labels)
                text = ctrlr._labels[key];
            if (text === undefined)
                if (ctrlr.module)
                    text = ctrlr.module.label(key);
            if (text === undefined)
                return key;
        };
        View.prototype.getBinder = function (name) {
            return this._binders[name] || View.binders[name];
        };
        View.prototype.makeBinder = function () {
            var exprs = [];
            parseElement({ context: this, element: this.element, expressions: exprs, model: this.model, ignoreSelf: true });
            while (true) {
                var last = exprs.pop();
                if (!last)
                    break;
                if (last.childAt === undefined && !last.parentNode) {
                    exprs.push(last);
                    break;
                }
            }
            var code = "";
            for (var i = 0, j = exprs.length; i < j; i++) {
                code += exprs[i].toCode(this);
            }
            //(this:BindContext,element:HTMLElement,bindable:IBindable):void;
            code = "var $_scopes= [];\n" + code;
            var binder = new Function("$_element", "$_self", "$_context", code);
            return binder;
        };
        View.prototype.dispose = function () {
        };
        return View;
    }());
    View.funcs = {};
    View.binders = {};
    Y.View = View;
    var ParseViewOpts = (function () {
        function ParseViewOpts() {
        }
        return ParseViewOpts;
    }());
    Y.ParseViewOpts = ParseViewOpts;
    function parseElement(opts) {
        var scope;
        var ui;
        var childModel = opts.model;
        var igoneChildren = false;
        var element = opts.element;
        var expressions = opts.expressions;
        var context = opts.context;
        var customerParsedExpression;
        if (!opts.ignoreSelf) {
            if (opts.element.nodeType == 3) {
                var embededExpr = ComputedExpression.embeded(element.textContent, { model: opts.model });
                if (embededExpr)
                    expressions.push(new BindExpression("y-text", embededExpr));
                return;
            }
            var attrs = element.attributes;
            for (var i = 0, j = attrs.length; i < j; i++) {
                var attr = attrs[i];
                var attrname = attr.name;
                var attrvalue = attr.value;
                var binder = context.getBinder(attrname);
                if (!binder)
                    continue;
                var expr = Expression.parse(attrvalue, { model: opts.model });
                if (!expr)
                    continue;
                if (attrname == "y-scope") {
                    if (expr.type != ExpressionTypes.model)
                        throw new Error("y-scope只能绑定model表达式");
                    scope = expr;
                    continue;
                }
                if (binder.parse) {
                    if (customerParsedExpression)
                        throw new Error("Already has a binder.parse");
                    customerParsedExpression = binder.parse(expr, opts, binder);
                    expr = new BindExpression(attrname, expr);
                    expressions.push(customerParsedExpression);
                }
                else {
                    expr = new BindExpression(attrname, expr);
                    expressions.push(expr);
                }
            }
        }
        if (!element.hasChildNodes || customerParsedExpression)
            return;
        if (scope) {
            expressions.push(new ScopeBeginExpression(scope));
            childModel = scope.model;
        }
        var nodes = element.childNodes;
        for (var i = 0, j = nodes.length; i < j; i++) {
            var node = nodes[i];
            if (node.nodeType == 8)
                continue;
            expressions.push(new ChildBeginExpression(i, element));
            parseElement({ context: context, element: node, expressions: expressions, model: childModel, ignoreSelf: false });
            var last = expressions.pop();
            if (last.childAt != i || last.parentNode != element) {
                expressions.push(last);
                expressions.push(new ChildEndExpression(i, element));
            }
        }
        if (scope)
            expressions.push(new ScopeEndExpression());
    }
    ;
    var ConstantBindableObject = (function () {
        function ConstantBindableObject(value) {
            this.value = value;
        }
        ConstantBindableObject.prototype.get_value = function () { return this.value; };
        ConstantBindableObject.prototype.set_value = function (val, extra) { return this; };
        ConstantBindableObject.prototype.subscribe = function (event, handler) { return this; };
        ConstantBindableObject.prototype.unsubscribe = function (event, handler) { return this; };
        return ConstantBindableObject;
    }());
    Y.ConstantBindableObject = ConstantBindableObject;
    var BindDependences = (function () {
        function BindDependences(deps, getter) {
            var _this = this;
            if (!deps || deps.length === 0) {
                this.get_value = getter;
                this.set_value = function (value, extra) { throw new Error("多个依赖项不可以设置值，它是只读的"); };
                this.subscribe = this.unsubscribe = function (handler) { };
                return;
            }
            var isArr = isArray(deps);
            if (isArr) {
                if (deps.length == 0 && deps.length == 1) {
                    isArr = false;
                    deps = deps[0];
                }
            }
            if (!isArr) {
                this.get_value = function () { return deps.get_value(); };
                this.set_value = function (value, extra) { return deps.set_value(value, extra); };
                this.subscribe = function (handler) { return deps.subscribe(handler); };
                this.unsubscribe = function (handler) { return deps.unsubscribe(handler); };
            }
            else {
                this.deps = deps;
                this.get_value = getter;
                this.subscribe = function (handler) {
                    for (var i = 0, j = deps.length; i < j; i++) {
                        deps[i].subscribe(handler);
                    }
                    return _this;
                };
                this.unsubscribe = function (handler) {
                    for (var i = 0, j = deps.length; i < j; i++) {
                        deps[i].unsubscribe(handler);
                    }
                    return _this;
                };
                this.set_value = function (value, extra) { throw new Error("多个依赖项不可以设置值，它是只读的"); };
            }
        }
        return BindDependences;
    }());
    Y.BindDependences = BindDependences;
    var ExpressionTypes;
    (function (ExpressionTypes) {
        //固定表达式  y-controller='user,http://pro.com/user' y-click="onsubmit"
        ExpressionTypes[ExpressionTypes["constant"] = 0] = "constant";
        //模型表达式 $ROOT.Title
        ExpressionTypes[ExpressionTypes["model"] = 1] = "model";
        //多语言化表达式
        ExpressionTypes[ExpressionTypes["label"] = 2] = "label";
        //函数表达式  contains($Permission,$ROOT.Check,startTime)
        ExpressionTypes[ExpressionTypes["function"] = 3] = "function";
        //对象表达式
        ExpressionTypes[ExpressionTypes["object"] = 4] = "object";
        //计算表达式 (price:$.Price,qty:Quanity)=>price*qty;
        ExpressionTypes[ExpressionTypes["computed"] = 5] = "computed";
        //绑定
        ExpressionTypes[ExpressionTypes["bind"] = 6] = "bind";
        ExpressionTypes[ExpressionTypes["childBegin"] = 7] = "childBegin";
        ExpressionTypes[ExpressionTypes["childEnd"] = 8] = "childEnd";
        ExpressionTypes[ExpressionTypes["scopeBegin"] = 9] = "scopeBegin";
        ExpressionTypes[ExpressionTypes["scopeEnd"] = 10] = "scopeEnd";
    })(ExpressionTypes = Y.ExpressionTypes || (Y.ExpressionTypes = {}));
    var Expression = (function () {
        function Expression() {
        }
        Expression.prototype.getDeps = function (context, deps) { throw new Error("Not implement"); };
        Expression.prototype.toCode = function (context) { throw new Error("Invalid invoke"); };
        Expression.parse = function (text, opts) {
            if (opts === void 0) { opts = {}; }
            if (!opts.model)
                opts.model = new Model();
            var expr;
            if (expr = LabelExpression.parse(text, opts))
                return expr;
            if (expr = ModelExpression.parse(text, opts))
                return expr;
            if (expr = FunctionExpression.parse(text, opts))
                return expr;
            if (expr = ObjectExpression.parse(text, opts))
                return expr;
            if (expr = ComputedExpression.parse(text, opts))
                return expr;
            return ConstantExpression.parse(text, opts);
        };
        return Expression;
    }());
    Y.Expression = Expression;
    var ConstantExpression = (function (_super) {
        __extends(ConstantExpression, _super);
        function ConstantExpression(value, len) {
            var _this = _super.call(this) || this;
            _this.type = ExpressionTypes.constant;
            _this.value = value;
            _this.matchLength = len;
            return _this;
        }
        ConstantExpression.prototype.getDeps = function (context, deps) { return null; };
        ConstantExpression.prototype.toCode = function (context) {
            if (this.value === null)
                return "null";
            if (this.value === undefined)
                return "undefined";
            return "\"" + toJsonString(this.value) + "\"";
        };
        ConstantExpression.parse = function (text, opts) {
            if (!text)
                return;
            var result = ConstantExpression.parseQuote(text, "\"");
            if (result)
                return result;
            result = ConstantExpression.parseQuote(text, "'");
            if (result)
                return result;
            if (ConstantExpression.strict)
                return null;
            if (opts && opts.constantEndPatten) {
                var endPatten = opts.constantEndPatten;
                var matches = text.match(endPatten);
                if (matches) {
                    result = new ConstantExpression(text.substr(0, matches.index), matches.index);
                    result.endWith = matches[0];
                    return result;
                } //else return null;
            }
            return new ConstantExpression(text, text.length);
        };
        ConstantExpression.parseQuote = function (text, quote) {
            if (text[0] != quote)
                return null;
            var quoteAt = 1;
            while (true) {
                quoteAt = text.indexOf(quote, quoteAt);
                if (quoteAt >= 1) {
                    if (text[quoteAt - 1] == "\\") {
                        quoteAt++;
                        continue;
                    }
                    else {
                        var constValue = text.substring(1, quoteAt - 1);
                        var result = new ConstantExpression(constValue, quoteAt);
                        result.endWith = quote;
                        return result;
                    }
                }
                else
                    return null;
            }
        };
        return ConstantExpression;
    }(Expression));
    ConstantExpression.strict = false;
    Y.ConstantExpression = ConstantExpression;
    var ModelExpression = (function (_super) {
        __extends(ModelExpression, _super);
        function ModelExpression(names, currentModel) {
            var _this = _super.call(this) || this;
            _this.type = ExpressionTypes.model;
            _this.names = names;
            _this.model = _this._parsePath(currentModel.$model);
            return _this;
        }
        ModelExpression.prototype._parsePath = function (curr) {
            var names = this.names.split(".");
            var rs = ["$_self"];
            for (var i = 0, j = names.length; i < j; i++) {
                var name_3 = names[i].replace(Y.trimRegex, "");
                if (!name_3)
                    throw new Error("Invalid model path : " + names.join("."));
                if (name_3 == "$root" || name_3 == "$") {
                    curr = curr.root();
                    rs = ["$_self.$model.root().$accessor"];
                }
                else if (name_3 == "$parent") {
                    var p = curr.container();
                    curr = p || curr;
                    rs.push("$_self.container().$accessor");
                }
                else if (name_3 == "$self") {
                    curr = curr;
                }
                else {
                    if (i == 0)
                        name_3 = name_3.replace(/^\$/, "");
                    curr = curr.prop(name_3, {});
                    rs.push(name_3);
                }
            }
            this.path = rs.join(".");
            return curr;
        };
        ModelExpression.prototype.getDeps = function (context, deps) {
            deps || (deps = []);
            deps.push(this.path);
            return deps;
        };
        ModelExpression.prototype.toCode = function (context) {
            return this.path;
        };
        ModelExpression.parse = function (text, opts) {
            if (!text)
                return null;
            var matches = text.match(ModelExpression.patten);
            if (matches) {
                var path = matches[0];
                var result = new ModelExpression(path, opts.model);
                result.matchLength = path.length;
                return result;
            }
            return null;
        };
        return ModelExpression;
    }(Expression));
    ModelExpression.patten = /^\s*\$(?:[a-zA-Z][a-zA-Z0-9_\$]*)?(?:\s*\.[a-zA-Z_\$][a-zA-Z0-9_\$]*)*\s*/i;
    Y.ModelExpression = ModelExpression;
    var LabelExpression = (function (_super) {
        __extends(LabelExpression, _super);
        function LabelExpression(key, len) {
            var _this = _super.call(this) || this;
            _this.type = ExpressionTypes.label;
            _this.key = key;
            _this.matchLength = len;
            return _this;
        }
        LabelExpression.prototype.getDeps = function (context, deps) { return null; };
        LabelExpression.prototype.toCode = function (context) {
            return "$_context.label(\"" + this.key + "\")";
        };
        LabelExpression.parse = function (text, opts) {
            var matches = text.match(LabelExpression.patten);
            if (matches)
                return new LabelExpression(matches[1], matches[0].length);
        };
        return LabelExpression;
    }(Expression));
    LabelExpression.patten = /^#([^#\n\r\t]+)#/;
    Y.LabelExpression = LabelExpression;
    var FunctionExpression = (function (_super) {
        __extends(FunctionExpression, _super);
        function FunctionExpression(name, args, len) {
            var _this = _super.call(this) || this;
            _this.type = ExpressionTypes["function"];
            _this.arguments = args;
            _this.funname = name;
            _this.matchLength = len;
            return _this;
        }
        FunctionExpression.prototype.getDeps = function (context, deps) {
            deps || (deps = []);
            var c = deps.length;
            for (var i = 0, j = this.arguments.length; i < j; i++) {
                this.arguments[i].getDeps(context, deps);
            }
            if (c < deps.length)
                return deps;
            return null;
        };
        FunctionExpression.parse = function (text, opts) {
            if (!text)
                return null;
            var matches = text.match(FunctionExpression.patten);
            if (!matches)
                return null;
            var fnname = matches[1];
            var len = matches[0].length;
            text = text.substr(len);
            var args = [];
            if (text[0] == ")") {
                len++;
                return new FunctionExpression(fnname, args, len);
            }
            while (true) {
                var arg = Expression.parse(text, { model: opts.model, constantEndPatten: /[,\)]/i, objectBrackets: true });
                if (arg) {
                    args.push(arg);
                    text = text.substr(arg.matchLength);
                    len += arg.matchLength;
                }
                var first = text[0];
                if (first == ",") {
                    text = text.substr(1);
                    len++;
                }
                else if (first == ")") {
                    len++;
                    break;
                }
                if (!text)
                    return null;
            }
            return new FunctionExpression(fnname, args, len);
            //if(end===")")
        };
        FunctionExpression.prototype.toCode = function (context) {
            var code = "$_context.getFunc(\"" + this.funname + "\")(";
            for (var i = 0, j = this.arguments.length; i < j; i++) {
                code += this.arguments[i].toCode(context);
                if (i != 0)
                    code += ",";
            }
            return code += ")";
        };
        return FunctionExpression;
    }(Expression));
    FunctionExpression.patten = /^\s*([a-zA-Z_][a-zA-Z0-9_\$]*)\s*\(\s*/i;
    Y.FunctionExpression = FunctionExpression;
    var ObjectExpression = (function (_super) {
        __extends(ObjectExpression, _super);
        function ObjectExpression(members, matchLength) {
            var _this = _super.call(this) || this;
            _this.type = ExpressionTypes.object;
            _this.members = members;
            _this.matchLength = matchLength;
            return _this;
        }
        ObjectExpression.prototype.getDeps = function (context, deps) {
            var members = this.members;
            deps || (deps = []);
            var count = 0;
            for (var n in members) {
                var dep = members[n].getDeps(context, deps);
                if (dep)
                    count++;
            }
            return count ? deps : null;
        };
        ObjectExpression.prototype.toCode = function (context) {
            var code = "{";
            var members = this.members;
            for (var n in members) {
                if (code.length != 1)
                    code += ",";
                code += "\"" + n + "\":" + members[n].toCode(context);
            }
            return code + "}";
        };
        ObjectExpression.parse = function (text, opts) {
            if (!text)
                return null;
            var len = 0;
            var constEndPatten;
            var needBrackets = opts && opts.objectBrackets;
            var beginPatten;
            if (needBrackets) {
                var beginToken = needBrackets[0] || "\\{";
                beginPatten = new RegExp("^\s*" + beginToken + "\s*");
            }
            else {
                beginPatten = /^\s*\{/i;
            }
            var match = text.match(beginPatten);
            if (match) {
                text = text.substr(match[0].length);
                len = match.length;
                needBrackets = true;
            }
            else {
                if (needBrackets)
                    return null;
            }
            var endPatten;
            var endToken;
            if (needBrackets) {
                endToken = needBrackets[1] ? needBrackets[1] : "\\}";
                endPatten = new RegExp("^\s*" + endToken + "\s*");
                var m = text.match(endPatten);
                if (m) {
                    len += m[0].length;
                    return new ObjectExpression({}, len);
                }
                constEndPatten = new RegExp("[" + endToken + ",]");
                endToken = endToken[endToken.length - 1];
            }
            else {
                endToken = "}";
                constEndPatten = /,/;
            }
            var obj;
            while (true) {
                var keyMatches = text.match(ObjectExpression.patten);
                //let keyExpr:KeyExpression = KeyExpression.parse(text);
                if (!keyMatches) {
                    if (needBrackets)
                        throw new Error("不正确的Object表达式,无法分析出key:" + text);
                    break;
                }
                var keyLen = keyMatches[0].length;
                var key = keyMatches[1];
                text = text.substr(keyLen);
                len += keyLen;
                if (!text) {
                    if (needBrackets)
                        return null;
                    (obj || (obj = {}))[key] = new ConstantExpression("", 0);
                    return new ObjectExpression(obj, len);
                }
                var valueExpr = Expression.parse(text, { model: opts.model, constantEndPatten: constEndPatten, objectBrackets: true });
                if (!valueExpr)
                    break;
                (obj || (obj = {}))[key] = valueExpr;
                text = text.substr(valueExpr.matchLength);
                len += valueExpr.matchLength;
                if (needBrackets && valueExpr.endWith) {
                    var endWith = valueExpr.endWith;
                    if (endWith == endToken) {
                        len++;
                        break;
                    }
                }
                if (!text)
                    break;
                if (needBrackets && text[0] == endToken)
                    break;
            }
            return obj ? new ObjectExpression(obj, len) : null;
        };
        return ObjectExpression;
    }(Expression));
    ObjectExpression.patten = /^(?:\s*,)?\s*([a-zA-Z_][a-zA-Z0-9_\$]*)\s*:\s*/i;
    Y.ObjectExpression = ObjectExpression;
    var ComputedExpression = (function (_super) {
        __extends(ComputedExpression, _super);
        function ComputedExpression(parameters, code, len) {
            var _this = _super.call(this) || this;
            _this.type = ExpressionTypes.computed;
            _this.parameters = parameters;
            _this.code = code;
            _this.matchLength = len;
            return _this;
        }
        ComputedExpression.prototype.toCode = function (context) {
            var args = "";
            var parnames = "";
            var pars = this.parameters;
            var at = 0;
            for (var n in pars) {
                if (at != 0) {
                    args += ",";
                    parnames += ",";
                }
                args += pars[n].toCode(context);
                parnames += n;
            }
            return "(function(" + parnames + "){return " + this.code + ";})(" + args + ")";
        };
        ComputedExpression.prototype.getDeps = function (context, deps) {
            deps || (deps = []);
            var c = deps.length;
            var pars = this.parameters;
            for (var n in pars) {
                pars[n].getDeps(context, deps);
            }
            if (c < deps.length)
                return deps;
            return null;
        };
        ComputedExpression.parse = function (text, opts) {
            var paramExpr = ObjectExpression.parse(text, { model: opts.model, objectBrackets: ["\\(", "\\)"] });
            if (!paramExpr)
                return null;
            var len = paramExpr.matchLength;
            text = text.substr(len);
            var matches = text.match(ComputedExpression.patten);
            if (!matches)
                return;
            len += matches[0].length;
            text = text.substr(matches[0].length);
            var semiAt = text.indexOf(";");
            if (semiAt < 0)
                return null;
            len += semiAt;
            var code = text.substr(0, semiAt);
            return new ComputedExpression(paramExpr.members, code, len);
            //ObjectExpression.parse();
        };
        ComputedExpression.embeded = function (text, opts) {
            var pars = {};
            var code = "";
            var at = 0;
            var lastAt = 0;
            var parCount = 0;
            while (true) {
                var startAt = at = text.indexOf("<[", at);
                if (startAt < 0)
                    break;
                var endAt = at = text.indexOf("]>", at);
                if (endAt < 0)
                    break;
                var exptext = text.substring(startAt + 2, endAt).replace(Y.trimRegex, "");
                if (!exptext)
                    continue;
                var exp = Expression.parse(exptext, opts);
                if (!exp || exp.type === ExpressionTypes.constant)
                    continue;
                var ctext_1 = toJsonString(text.substring(lastAt, startAt));
                var argname = "__y_EMBEDED_ARGS_" + (parCount++);
                code += "\"" + ctext_1.replace(ComputedExpression.labelPatten, "\"+$_context.label(\"$1\")+\"") + "\" + " + argname + "()";
                pars[argname] = exp;
                parCount++;
                lastAt = at + 2;
            }
            var ctext = text.substring(lastAt);
            if (ComputedExpression.labelPatten.test(ctext)) {
                code += "\"" + ctext.replace(ComputedExpression.labelPatten, "\"+$_context.label(\"$1\")+\"") + "\"";
            }
            return code ? new ComputedExpression(pars, code, text.length) : null;
            //if(pars.length) return new ComputedExpression(pars,code);
        };
        return ComputedExpression;
    }(Expression));
    ComputedExpression.patten = /^\s*=>\s*/;
    ComputedExpression.labelPatten = /##([^#\n\r\t]+)##/;
    Y.ComputedExpression = ComputedExpression;
    var BindExpression = (function (_super) {
        __extends(BindExpression, _super);
        function BindExpression(name, expr) {
            var _this = _super.call(this) || this;
            _this.type = ExpressionTypes.bind;
            _this.bindername = name;
            _this.expression = expr;
            return _this;
        }
        BindExpression.prototype.getDeps = function (context, deps) { return this.expression.getDeps(context, deps); };
        BindExpression.prototype.toCode = function (context) {
            switch (this.expression.type) {
                case ExpressionTypes.model: return this.toModelCode(context);
                case ExpressionTypes.constant: return this.toConstantCode(context);
                case ExpressionTypes["function"]: return this.toFuncCode(context);
                case ExpressionTypes.computed: return this.toComputedCode(context);
                case ExpressionTypes.label: return this.toLabelCode(context);
                case ExpressionTypes.object: return this.toLabelCode(context);
                default: throw new Error("Not implement");
            }
        };
        BindExpression.prototype.toLabelCode = function (context) {
            return "$_element.innerHTML = " + this.expression.toCode(context) + ";\n";
        };
        BindExpression.prototype.toModelCode = function (context) {
            //binders.value.call(context,context.$element, context.$self.Username.$model);
            return "$_context.getBinder(\"" + this.bindername + "\").call($_context,$_element," + this.expression.toCode(context) + ",$_context);\n";
        };
        BindExpression.prototype.toConstantCode = function (context) {
            return "$_context.getBinder(\"" + this.bindername + "\").call($_context,$_element,new Y.ConstantBindableObject(" + this.expression.toCode(context) + "),$_context);\n";
        };
        BindExpression.prototype.toFuncCode = function (context) {
            var deps = this.getDeps(context);
            var depstr = deps ? deps.join(",") : "";
            return "$_context.getBinder(\"" + this.bindername + "\").call($_context,$_element,new Y.BindDependences([" + depstr + "],function(){ return " + this.expression.toCode(context) + "}),$_context);\n";
        };
        BindExpression.prototype.toComputedCode = function (context) {
            var deps = this.getDeps(context);
            var depstr = deps ? deps.join(",") : "";
            return "$_context.getBinder(\"" + this.bindername + "\").call($_context,$_element,new Y.BindDependences([" + depstr + "],function(){ return " + this.expression.toCode(context) + "}),$_context);\n";
        };
        BindExpression.prototype.toObjectCode = function (context) {
            var deps = this.getDeps(context);
            var depstr = deps ? deps.join(",") : "";
            return "$_context.getBinder(\"" + this.bindername + "\").call($_context,new Y.BindDependences([" + depstr + "],function(){ return " + this.expression.toCode(context) + "}),$_context);\n";
        };
        return BindExpression;
    }(Expression));
    Y.BindExpression = BindExpression;
    var ChildBeginExpression = (function (_super) {
        __extends(ChildBeginExpression, _super);
        function ChildBeginExpression(at, parent) {
            var _this = _super.call(this) || this;
            _this.type = ExpressionTypes.childBegin;
            _this.childAt = at;
            _this.parentNode = parent;
            return _this;
        }
        ChildBeginExpression.prototype.getDeps = function (context, deps) { return null; };
        ChildBeginExpression.prototype.toCode = function (context) {
            return "$_element = $_element.childNodes[" + this.childAt + "];\n";
        };
        return ChildBeginExpression;
    }(Expression));
    Y.ChildBeginExpression = ChildBeginExpression;
    var ChildEndExpression = (function (_super) {
        __extends(ChildEndExpression, _super);
        function ChildEndExpression(at, parent) {
            var _this = _super.call(this) || this;
            _this.childAt = at;
            _this.parentNode = parent;
            return _this;
        }
        ChildEndExpression.prototype.getDeps = function (context, deps) { return null; };
        ChildEndExpression.prototype.toCode = function (context) {
            return "$_element = $_element.parentNode;\n";
        };
        return ChildEndExpression;
    }(Expression));
    Y.ChildEndExpression = ChildEndExpression;
    var ScopeBeginExpression = (function (_super) {
        __extends(ScopeBeginExpression, _super);
        function ScopeBeginExpression(scopeExpression) {
            var _this = _super.call(this) || this;
            _this.type = ExpressionTypes.scopeBegin;
            _this.scopeExpression = scopeExpression;
            return _this;
        }
        ScopeBeginExpression.prototype.toCode = function (context) {
            return "$_scopes.push($_self); $_self = " + this.scopeExpression.toCode(context) + ";\n";
        };
        return ScopeBeginExpression;
    }(Expression));
    var ScopeEndExpression = (function (_super) {
        __extends(ScopeEndExpression, _super);
        function ScopeEndExpression() {
            var _this = _super.call(this) || this;
            _this.type = ExpressionTypes.scopeEnd;
            return _this;
        }
        ScopeEndExpression.prototype.toCode = function (context) {
            return "$_self = $_scopes.pop();\n";
        };
        return ScopeEndExpression;
    }(Expression));
    var binders = View.binders;
    binders["y-scope"] = function () { };
    var textBinder = binders["y-text"] = function (element, bindable, context) {
        bindable.subscribe(function (sender, evt) {
            element.innerHTML = element.textContent = bindable.get_value();
        });
        element.innerHTML = element.textContent = bindable.get_value();
    };
    var valueBinder = binders["y-value"] = function (element, bindable, context) {
        var tag = element.tagName;
        if (tag === "TEXTAREA")
            return binders["y-value.textbox"](element, bindable, context);
        if (tag === "SELECT")
            return binders["y-value.select"](element, bindable, context);
        if (tag === "INPUT") {
            var t = element.type;
            if (t === "radio")
                return binders["y-value.radio"](element, bindable, context);
            if (t === "checkbox")
                return binders["y-value.checkbox"](element, bindable, context);
            return txtboxBinder(element, bindable, context);
        }
        textBinder(element, bindable, context);
    };
    valueBinder.parse = function (valueExpr, opts, binder) {
        var element = opts.element;
        var tag = element.tagName;
        var bindername;
        if (tag === "TEXTAREA")
            bindername = "y-value.textbox";
        else if (tag === "SELECT")
            bindername = "y-value.select";
        else if (tag === "INPUT") {
            var t = element.type;
            if (t === "radio")
                bindername = "y-value.radio";
            else if (t === "checkbox")
                bindername = "y-value.checkbox";
            else
                bindername = "y-value.textbox";
        }
        else
            bindername = "y-text";
        return new BindExpression(bindername, valueExpr);
    };
    binders["y-value.select"] = function (element, bindable, context) {
        var evtHandler = function () {
            bindable.set_value(element.selectedIndex > -1
                ? element.options[element.selectedIndex].value
                : element.value);
        };
        var setValue = function (element, value) {
            if (value === undefined)
                return;
            var opts = element.options;
            for (var i = 0, j = opts.length; i < j; i++) {
                if (value === opts[i].value) {
                    element.selectedIndex = i;
                    return;
                }
            }
        };
        Y.platform.attach(element, "change", evtHandler);
        var handler = function (evt) { setValue(element, evt.value); };
        bindable.subscribe(handler);
        setValue(element, bindable.get_value());
    };
    var txtboxBinder = binders["y-value.textbox"] = function (element, bindable, context) {
        var onchange = function () { tick = 0; bindable.set_value(element.value); };
        var tick;
        var evtHandler = function () {
            if (tick)
                clearTimeout(tick);
            tick = setTimeout(onchange, 180);
        };
        Y.platform.attach(element, "keydown", evtHandler);
        Y.platform.attach(element, "keyup", evtHandler);
        Y.platform.attach(element, "blur", evtHandler);
        var handler = function (sender, evt) {
            element.value = evt.value;
            evt.extra = element;
        };
        bindable.subscribe(handler);
        element.value = bindable.get_value();
    };
    binders["y-value.radio"] = function (element, bindable, context) {
        var evtHandler = function () {
            if (element.checked)
                bindable.set_value(element.value);
            else
                bindable.set_value(null);
        };
        var setValue = function (element, value) {
            if (value == element.value) {
                element.checked = true;
                element.setAttribute("checked", "checked");
            }
            else {
                element.checked = false;
                element.removeAttribute("checked");
            }
        };
        var handler = function (sender, evt) {
            setValue(element, evt.value);
            evt.extra = element;
        };
        Y.platform.attach(element, "change", evtHandler);
        Y.platform.attach(element, "blur", evtHandler);
        Y.platform.attach(element, "click", evtHandler);
        bindable.subscribe(handler);
        setValue(element, bindable.get_value());
    };
    binders["y-value.checkbox"] = function (element, bindable, context) {
        var evtHandler = function () {
            var form = element.form;
            var childNodes;
            var vals = [];
            if (form != null) {
                for (var i = 0, j = form.elements.length; i < j; i++) {
                    var child = form.elements[i];
                    if (child.name === element.name) {
                        if (child.checked) {
                            vals.push(child.value);
                        }
                    }
                }
            }
            else {
                var childNodes_1 = element.parentNode.parentElement.childNodes;
                for (var i = 0, j = childNodes_1.length; i < j; i++) {
                    var child = childNodes_1[i];
                    for (var n = 0, m = child.childNodes.length; n < m; n++) {
                        var ck = child.childNodes[n];
                        if (ck.tagName !== 'INPUT' || ck.type !== 'checkbox')
                            continue;
                        if (ck.name === element.name) {
                            if (ck.checked) {
                                vals.push(ck.value);
                            }
                        }
                    }
                }
            }
            bindable.set_value(vals.length === 0 ? null : (vals.length == 1 ? vals[0] : vals));
        };
        var setValue = function (element, value) {
            if (value === null || value === undefined) {
                element.checked = false;
                element.removeAttribute("checked");
                return;
            }
            if (o2Str.call(value) === '[object Array]') {
                var hasValue = false;
                for (var i = 0, j = value.length; i < j; i++) {
                    if (value[i] === element.value) {
                        hasValue = true;
                        break;
                    }
                    if (value[i] === element.value) {
                        element.checked = true;
                        element.setAttribute("checked", "checked");
                    }
                    else {
                        element.checked = false;
                        element.removeAttribute("checked");
                    }
                }
            }
            else {
                if (value == element.value) {
                    element.checked = true;
                    element.setAttribute("checked", "checked");
                }
                else {
                    element.checked = false;
                    element.removeAttribute("checked");
                }
            }
        };
        var handler = function (sender, evt) {
            var value = evt.value;
            evt.extra = element;
            setValue(element, value);
        };
        Y.platform.attach(element, "change", evtHandler);
        Y.platform.attach(element, "blur", evtHandler);
        Y.platform.attach(element, "click", evtHandler);
        bindable.subscribe(handler);
        element.checked = false;
        setValue(element, bindable.get_value());
    };
    var eachBinder = binders["y-each"] = function (element, bindable, context) {
        var viewId = element.getAttribute("y-each-view-id");
        var viewTemplate = context._innerViews[viewId];
        var model = bindable.$model;
        var addItemToView = function (item, anchorElement) {
            var domContainer = document.createElement(viewTemplate.element.tagName);
            var itemView = new View({
                prototypeView: viewTemplate,
                element: domContainer,
                model: item,
                controller: context.controller
            });
            var elem = itemView.element;
            if (anchorElement == null) {
                for (var i = 0, j = elem.childNodes.length; i < j; i++) {
                    element.appendChild(elem.firstChild);
                }
            }
            else {
                for (var i = 0, j = elem.childNodes.length; i < j; i++) {
                    element.insertBefore(elem.firstChild, anchorElement);
                }
            }
        };
        var handler = function (sender, evt) {
            if (evt.action == ModelActions.change) {
                element.innerHTML = "";
                for (var i = 0, j = evt.value.length; i < j; i++) {
                    var item = model.get_item(i, true);
                    addItemToView(item, null);
                }
                return;
            }
            if (evt.action == ModelActions.clear) {
                element.innerHTML = "";
                return;
            }
            if (evt.action != ModelActions.child) {
                return;
            }
            var ievt = evt.directSource;
            var elemProto = viewTemplate.element;
            switch (ievt.action) {
                case ModelActions.add:
                    var anchorElement = null;
                    if (evt.index * elemProto.childNodes.length <= element.childNodes.length - 1)
                        anchorElement = element.childNodes[evt.index];
                    addItemToView(model.get_item(evt.index, true), anchorElement);
                    break;
                case ModelActions.remove:
                    var at = evt.index * elemProto.childNodes.length;
                    for (var i = 0, j = elemProto.childNodes.length; i < j; i++) {
                        var ch = element.childNodes[at];
                        if (ch == null)
                            break;
                        element.removeChild(ch);
                    }
                    break;
                case ModelActions.clear:
                    element.innerHTML = "";
                    break;
            }
        };
        model.subscribe(handler);
        element.innerHTML = "";
    }; //end eachBinder 
    eachBinder.parse = function (valueExpr, opts, binder) {
        if (valueExpr.type != ExpressionTypes.model)
            throw new Error("each 只能绑定Model表达式");
        var model = valueExpr.model.$model;
        var itemTemplate = model.toArray();
        var eachView = new View({
            element: opts.element.cloneNode(true),
            controller: opts.context.controller,
            model: itemTemplate,
            nobind: true
        });
        //eachView.toTemplate();
        var id = "y-view-each-" + seed();
        opts.element.setAttribute("y-each-view-id", id);
        var innerViews = opts.context._innerViews || (opts.context._innerViews = {});
        innerViews[id] = eachView;
        //model.toArray(eachView.model.$model);
        return new BindExpression("y-each", valueExpr);
    };
    binders["y-visible"] = function (element, bindable, context) {
        var setValue = function (element, value) {
            if (value === false || value === "hide" || value === "hidden" || value === "off" || value === "false") {
                element.style.visibility = "visible";
                element.style.display = "";
            }
            else {
                element.style.visibility = "hidden";
                element.style.display = "none";
            }
        };
        bindable.subscribe(function (sender, evt) {
            setValue(element, evt.value);
        });
        if (element.getAttribute("y-visible-nobound") !== null)
            setValue(element, bindable.get_value());
    };
    binders["y-disable"] = function (element, bindable, context) {
        var setValue = function (element, value) {
            if (value === true || value === "disable" || value === "true") {
                element.disabled = true;
            }
            else {
                element.disabled = false;
                element.removeAttribute("disabled");
            }
        };
        bindable.subscribe(function (sender, evt) {
            setValue(element, evt.value);
        });
        setValue(element, bindable.get_value());
    };
    binders["y-event"] = function (element, bindable, context) {
        var value = bindable.get_value();
        var evtname;
        var evthandler;
        if (typeof value === "string") {
            evtname = "click";
            evthandler = value;
        }
        else {
            evtname = value.name;
            evthandler = value.handler;
            if (!evtname)
                evtname = "click";
        }
        var controller = context.controller;
        var handler = controller[evthandler];
        if (typeof handler === "function") {
            Y.platform.attach(element, evtname, handler);
        }
    };
    var _seed = 0;
    function seed() {
        return (_seed == 2100000000) ? _seed = 0 : _seed++;
    }
    Y.seed = seed;
})(Y = exports.Y || (exports.Y = {}));
