"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var Y;
(function (Y) {
    "use strict";
    var SourceTypes;
    (function (SourceTypes) {
        SourceTypes[SourceTypes["script"] = 0] = "script";
        SourceTypes[SourceTypes["css"] = 1] = "css";
        SourceTypes[SourceTypes["json"] = 2] = "json";
        SourceTypes[SourceTypes["text"] = 3] = "text";
        SourceTypes[SourceTypes["image"] = 4] = "image";
    })(SourceTypes = Y.SourceTypes || (Y.SourceTypes = {}));
    ////////////////////////////////////
    /// 平台抽象
    ///////////////////////////////////
    var tagContainers;
    var Platform = (function () {
        function Platform() {
            this.attach = window["attachEvent"] ? function (elem, evtname, fn) { elem.attachEvent("on" + evtname, fn); } : function (elem, evtname, fn) { elem.addEventListener(evtname, fn, false); };
            this.detech = window["detechEvent"] ? function (elem, evtname, fn) { elem.detechEvent("on" + evtname, fn); } : function (elem, evtname, fn) { elem.removeEventListener(evtname, fn, false); };
        }
        Platform.prototype.attach = function (elem, evtName, evtHandler) { };
        //解除事件
        Platform.prototype.detech = function (elem, evtName, evtHandler) { };
        Platform.prototype.alert = function (message) {
            window.alert(message);
        };
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
        Platform.prototype.getContent = function (url, callback) {
            this.ajax({
                url: url,
                method: "GET",
                callback: callback
            });
        };
        Platform.prototype.ajax = function (opts) {
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
                for (var n_1 in headers)
                    http.setRequestHeader(n_1, headers[n_1]);
            var httpRequest = http;
            function callback() {
                if (httpRequest.readyState == 4 && opts.callback) {
                    var result = void 0;
                    if (opts.dataType == "json") {
                        result = JSON.parse(httpRequest.responseText);
                    }
                    else if (opts.dataType == "xml") {
                        result = httpRequest.responseXML;
                    }
                    else
                        result = httpRequest.responseText;
                    opts.callback.call(http, result);
                }
            }
            httpRequest.onreadystatechange = callback;
            if (opts.callback)
                httpRequest.onerror = function (err) {
                    opts.callback.call(httpRequest, err);
                };
            httpRequest.open(method, url, true);
            httpRequest.send(data);
        }; //end ajax
        return Platform;
    }());
    Y.Platform = Platform;
    Y.platform = new Platform();
    var o2Str = Object.prototype.toString;
    function isArray(o) {
        if (!o)
            return false;
        return o2Str.call(o) == "[Object Array]";
    }
    Y.isArray = isArray;
    window["exports"] = {};
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
    /// 资源加载
    ////////////////////////////////////
    var head;
    var _exports;
    var Source = (function () {
        function Source(opts, callback) {
            var _opts;
            if (typeof opts === "string") {
                _opts = { url: opts, alias: opts, type: undefined, callback: callback };
                var url = opts;
                if (url.lastIndexOf(".js"))
                    _opts.type = SourceTypes.script;
                else if (url.lastIndexOf(".css"))
                    _opts.type = SourceTypes.css;
                else if (url.lastIndexOf(".json"))
                    _opts.type = SourceTypes.json;
            }
            this.url = _opts.url;
            this.type = _opts.type;
            this.alias = _opts.alias || this.url;
            this.extras = _opts.extras;
            if (callback)
                this.callback(callback);
            if (_opts.callback)
                this.callback(_opts.callback);
            if (_opts.value !== undefined) {
                this.value = _opts.value;
                this._done(this.value, undefined);
            }
            else {
                this._callbacks = [];
                this.refresh();
            }
        }
        Source.prototype.callback = function (handle) {
            if (this._callbacks === undefined) {
                handle.call(this, this.value, this.error);
            }
            else
                this._callbacks.push(handle);
            return this;
        };
        Source.prototype._done = function (success, error) {
            this.value = success;
            this.error = error;
            for (var i = 0, j = this._callbacks.length; i < j; i++) {
                var item = this._callbacks[i];
                item.call(this, success, error);
            }
            _exports = undefined;
            this._callbacks = undefined;
        };
        Source.prototype.refresh = function () {
            if (!this.url)
                return this;
            var me = this;
            if (this.type == SourceTypes.json) {
                Y.platform.getContent(this.url, function (content, error) {
                    if (!error)
                        me._done(JSON.parse(content), error);
                    else
                        me._done(undefined, error);
                });
                return me;
            }
            if (this.type != SourceTypes.css && this.type != SourceTypes.script) {
                Y.platform.getContent(this.url, function (content, error) {
                    me._done(content, error);
                });
                return me;
            }
            if (this.element)
                this.element.parentNode.removeChild(this.element);
            var elem;
            if (this.type == SourceTypes.script) {
                elem = document.createElement("script");
                elem.src = this.url;
                elem.type = "text/javascript";
            }
            else if (this.type == SourceTypes.css) {
                elem = document.createElement("link");
                elem.href = this.url;
                elem.type = "text/css";
                elem.rel = "stylesheet";
            }
            if (elem["onreadystatechange"] !== undefined) {
                elem.onreadystatechange = function () {
                    if (elem.readyState == 4 || elem.readyState == "complete") {
                    }
                };
            }
            else
                elem.onload = function () {
                    for (var i = 0, j = me._callbacks.length; i < j; i++) {
                        var item = me._callbacks[i];
                        item.call(me, _exports, me.error);
                    }
                    _exports = undefined;
                    me._callbacks = undefined;
                };
            elem.onerror = function (ex) {
                _exports = undefined;
                me._callbacks = undefined;
                elem.parentNode.removeChild(elem);
                for (var i = 0, j = me._callbacks.length; i < j; i++) {
                    var item = me._callbacks[i];
                    item.call(me, _exports, me.error);
                }
            };
            var myhead = head;
            if (myhead == null) {
                var heads = document.getElementsByTagName("head");
                if (heads && heads.length) {
                    head = myhead = heads[0];
                }
                else {
                    myhead = document.body;
                }
            }
            this.element = elem;
            myhead.appendChild(elem);
            return this;
        };
        Source.prototype.dispose = function () {
        };
        Source.load = function (opts, callback) {
            var isUrl = typeof opts === "string";
            var name = isUrl ? opts : (opts.alias || opts.url);
            if (isUrl) {
                name = opts;
            }
            else {
                var _opts = opts;
                if (_opts.nocache === true)
                    return new Source(opts, callback);
                name = (_opts.alias || _opts.url);
            }
            var source = Source.cache[name];
            if (!source) {
                source = new Source(opts, callback);
                if (source.url) {
                    Source.cache[source.url] = source;
                }
                if (source.alias) {
                    Source.cache[source.alias] = source;
                }
            }
            else if (callback)
                source.callback(callback);
            return source;
        };
        Source.loadMany = function (opts, nocache, callback) {
            var _this = this;
            var result = {};
            if (typeof nocache === "function") {
                callback = nocache;
                nocache = false;
            }
            var waitingCount = 1;
            var hasError;
            for (var n in opts) {
                if (hasError)
                    break;
                var srcOpts = opts[n];
                if (typeof srcOpts === "string")
                    srcOpts = { url: srcOpts, nocache: nocache, extras: n };
                Source.load(srcOpts, function (value, error) {
                    if (hasError)
                        return;
                    if (error) {
                        hasError = error;
                        return;
                    }
                    var src = _this;
                    result[src.extras] = src;
                    if (--waitingCount == 0 && callback)
                        callback(result, undefined);
                });
            }
            if (--waitingCount == 0 && callback)
                callback(result, undefined);
            return result;
        };
        return Source;
    }());
    Source.cache = {};
    Y.Source = Source;
    ////////////////////////////////////
    /// 模块化
    ////////////////////////////////////
    var Module = (function () {
        function Module(idOrOpts, callback) {
            var opts;
            if (typeof idOrOpts === "string") {
                this.id = idOrOpts.toString();
            }
            else {
                opts = idOrOpts;
                this.id = opts.id;
            }
            this.ref_count = 0;
            this._disposing = [];
            this._callbacks = [];
            if (opts)
                this.data = opts.data;
            if (!this.data)
                this.data = {};
            this.activeTime = new Date();
            if (this.id) {
                Module.cache[this.id] = this;
                if (!Module.clearTimer)
                    Module.clearTimer = setInterval(Module.clearExpired, Module.clearInterval || 60000);
            }
            if (callback)
                this.callback(callback);
            if (opts)
                this._init(opts);
            else
                this._getOptsAndInit(idOrOpts.toString());
        }
        Module.prototype._getOptsAndInit = function (url) {
            var me = this;
            Y.platform.getContent(url, function (html, error) {
                var elem = document.createElement("div");
                html = html.replace("<!DOCTYPE html>", "")
                    .replace(/<html\s/i, "<div ")
                    .replace(/<\/html>/i, "<div ")
                    .replace(/<head\s/i, "<div class='y-head' ")
                    .replace(/<\/head>/i, "</div>")
                    .replace(/<body\s/i, "<div class='y-body' ")
                    .replace(/<\/body>/i, "</div>");
                elem.innerHTML = html;
                var deps = [];
                var scripts = elem.getElementsByTagName("script");
                var script;
                var links = elem.getElementsByTagName("link");
                for (var i = 0, j = scripts.length; i < j; i++) {
                    var sElem = scripts[i];
                    var src = sElem.getAttribute("src");
                    var isModule = sElem.getAttribute("y-module");
                    if (isModule) {
                        script = sElem;
                        sElem.parentNode.removeChild(sElem);
                    }
                    if (!src)
                        continue;
                    var alias = script.getAttribute("y-alias");
                    var scriptOpts = {
                        url: src,
                        alias: alias || src,
                        type: SourceTypes.script
                    };
                    deps.push(scriptOpts);
                    sElem.parentNode.removeChild(sElem);
                }
                for (var i = 0, j = links.length; i < j; i++) {
                    var sElem = links[i];
                    var src = sElem.getAttribute("href");
                    if (!src)
                        continue;
                    var alias = script.getAttribute("y-alias");
                    var cssOpts = {
                        url: src,
                        alias: alias || src,
                        type: SourceTypes.css
                    };
                    deps.push(cssOpts);
                    sElem.parentNode.removeChild(sElem);
                }
                var moOpts = {
                    template: elem,
                    deps: deps
                };
                if (script === undefined) {
                    return me._init(moOpts);
                }
                if (script.src) {
                    new Source({ url: script.src, type: SourceTypes.script }, function (scriptElem, error) {
                        if (error) {
                            me.error = error;
                            me._done();
                            return;
                        }
                        moOpts = this._combineModuleOpts(moOpts);
                        me._init(moOpts);
                    });
                }
                else {
                    var code = "(function(){" + script.innerHTML + "})();";
                    try {
                        eval(code);
                    }
                    catch (ex) {
                        me.error = ex;
                        return me._done();
                    }
                    moOpts = this.combineModuleOpts(moOpts);
                    me._init(moOpts);
                }
            });
        };
        Module.prototype._combineModuleOpts = function (dest, src) {
            src || (src = Module.exportModuleOpts);
            if (!src) {
                this.error = "未定义module";
                return this._done();
            }
            else {
                Module.exportModuleOpts = undefined;
            }
            dest.define = src.define;
            dest.lang = src.lang;
            dest.data = src.data;
            var _deps = src.deps;
            if (_deps) {
                if (!dest.deps)
                    dest.deps = [];
                for (var i = 0, j = _deps.length; i < j; i++) {
                    dest.deps.push(_deps[i]);
                }
            }
            dest.imports = src.imports;
            return dest;
        };
        Module.prototype._init = function (opts) {
            var me = this;
            this.defineProc = opts.define;
            this.viewTemplate = opts.template;
            var depScripts = [];
            var waitingCount = 1;
            var deps = opts.deps;
            if (deps) {
                for (var i = 0, j = deps.length; i < j; i++) {
                    if (this.error)
                        return;
                    waitingCount++;
                    var dep = deps[i];
                    Source.load(dep, function (value, err) {
                        if (err) {
                            me.error = err;
                            return;
                        }
                        if (me.error || (--waitingCount == 0))
                            me._done();
                    });
                }
            }
            var args = [];
            deps = opts.imports;
            if (deps) {
                for (var i = 0, j = deps.length; i < j; i++) {
                    if (this.error)
                        return;
                    waitingCount++;
                    var dep = deps[i];
                    Source.load(dep, function (value, err) {
                        if (err) {
                            me.error = err;
                            return;
                        }
                        if (me.error || (--waitingCount == 0))
                            me._done();
                        args.push(value);
                    });
                }
            }
            if (opts.lang) {
                var url = opts.lang.replace("{language}", langId);
                waitingCount++;
                new Source(url, function (value, error) {
                    me.texts = value;
                    if (me.error || (--waitingCount == 0))
                        me._done();
                });
            }
            this.imports = args;
            if (me.error || (--waitingCount == 0))
                me._done();
        };
        Module.prototype.callback = function (handle) {
            if (!handle)
                return this;
            if (this._callbacks === undefined) {
                handle.call(this, this.value, this.error);
            }
            else
                this._callbacks.push(handle);
            return this;
        };
        Module.prototype._done = function () {
            if (this.defineProc && this.error === undefined)
                this.value = this.defineProc.apply(this, this.imports);
            var callbacks = this._callbacks;
            this._callbacks = undefined;
            if (callbacks)
                for (var i = 0, j = callbacks.length; i < j; i++) {
                    callbacks[i].call(this, this.value, this.error);
                }
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
            for (var n in this._disposing) {
                var fn = this._disposing[n];
                fn.call(this);
            }
        };
        Module.load = function (url, callback) {
            var module = Module.cache[url];
            if (module) {
                module.activeTime = new Date();
                module.callback(callback);
                return;
            }
            else {
                module = new Module(url, callback);
            }
        };
        Module.define = function (opts) {
            Module.exportModuleOpts = opts;
        };
        Module.clearExpired = function () {
            var expireTime = (new Date()).valueOf() - Module.aliveMilliseconds || 300000;
            var cache = {};
            var moduleCache = Module.cache;
            var count = 0;
            for (var n in moduleCache) {
                var module_1 = moduleCache[n];
                if (module_1.ref_count <= 0 && module_1.activeTime.valueOf() < expireTime) {
                    module_1.dispose();
                }
                else {
                    cache[n] = module_1;
                    count++;
                }
            }
            Module.cache = cache;
            if (count === 0) {
                clearInterval(Module.clearTimer);
                Module.clearTimer = undefined;
            }
        };
        return Module;
    }());
    Module.cache = {};
    Module.clearInterval = 60000;
    Module.aliveMilliseconds = 300000;
    Y.module = Module.define;
    ////////////////////////////////////
    /// Model
    ///////////////////////////////////
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
                self.setValue(newValue);
                return accessor;
            };
            accessor.subscribe = function (handler) {
                self.subscribe(handler);
            };
            accessor.unsubscribe = function (handler) {
                self.unsubscribe(handler);
            };
            accessor.toString = function () { return self.getValue(); };
            this.$model = accessor.$model = this;
            this.$accessor = accessor.$accessor = accessor;
            accessor.$modelType = this.$modelType = ModelTypes.any;
        }
        Model.prototype.name = function (n) { if (n === undefined) {
            return this._name;
        } return this._name = n; };
        Model.prototype["super"] = function () { return this._superior; };
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
            this.setValue(newValue, source);
            return newSubject;
        };
        Model.prototype.subscribe = function (handler) {
            var handlers = this._changeHandlers;
            if (!handlers) {
                handlers = this._changeHandlers = new Array();
            }
            handlers.push(handler);
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
        Model.prototype.getValue = function () { return this._subject[this._name]; };
        Model.prototype.setValue = function (newValue, source) {
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
                for (var name in members) {
                    if (!members.hasOwnProperty(name)) {
                        continue;
                    }
                    var member = members[name];
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
            newModel.$modelType = this.$modelType;
            if (newModel._itemProto = this._itemProto) {
                newModel.toArray(this._itemProto);
                return newModel;
            }
            if (newModel._computed = this._computed) {
                return newModel;
            }
            var members = this._members;
            if (members) {
                var newMembers = newModel._members || (newModel._members = {});
                var value = newSubject[newName] || (newSubject[newName] = {});
                var newAccessor = newModel.$accessor;
                for (var name in members) {
                    if (!members.hasOwnProperty(name)) {
                        continue;
                    }
                    var member = members[name];
                    var newMember = member.clone(value, name);
                    newMembers[name] = newMember;
                    var aname = Model.chromeKeywords[name] || name.toString();
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
            this.getValue = function () { return _this._computed.getValue(); };
            this.setValue = function () { throw "Computed member is readonly."; };
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
            accessor.getItem = function (index, returnModel) {
                var result = _this.getItem(index, returnModel);
                return returnModel === true ? result.$accessor : result;
            };
            accessor.setItem = function (index, itemValue) { _this.setItem(index, itemValue); return accessor; };
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
        Model.prototype.getItem = function (index, returnModel) {
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
                members[index] = itemModel;
                return itemModel;
            }
            else {
                return value[index];
            }
        };
        Model.prototype.setItem = function (index, itemValue) {
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
                itemModel.setValue(itemValue, index);
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
    var View = (function () {
        function View(controller, model, element) {
            if (controller === undefined)
                return;
            this.element = element;
            this.model = model || (model = new Model());
            this.controller = controller;
            this._bind = makeBind(this.model, this.element, this.controller);
        }
        View.prototype.clone = function (controller, model, element) {
            var other = new View();
            var proto = this;
            var elem = Y.platform.cloneNode(proto.element);
            if (element) {
                element.innerHTML = "";
                for (var i = 0, j = elem.childNodes.length; i < j; i++) {
                    element.appendChild(elem.firstChild);
                }
                this.element = element;
            }
            else
                this.element = elem;
            if (model === null) {
                other.model = this.model;
            }
            else if (model === undefined) {
                other.model = proto.model.clone();
            }
            else
                other.model = model;
            other._bind = proto._bind;
            if (controller) {
                other.controller = controller;
                other._bind(other.model, other.element, other.controller);
            }
            return other;
        };
        View.prototype.dispose = function () {
            this.element = undefined;
            this.model = undefined;
            this._bind = undefined;
            this.controller = undefined;
        };
        return View;
    }());
    Y.View = View;
    function makeBind(model, element, controller) {
        var bindContext = new BindContext(model, element, controller);
        var exprs = [];
        buildBind(element, bindContext, exprs);
        while (true) {
            var expr = exprs.pop();
            if (!(expr instanceof ChildEndExpression)) {
                exprs.push(expr);
                break;
            }
        }
        var codes = exprs.join("");
        codes = "var $self = self.$accessor;\nvar $root = self.root().$accessor;var _binders = Y.binders;\nvar _scopes=[];var attach=Y.platform.attach;var detech = Y.platform.detech;" + codes;
        return new Function("self", "_element", "_controller", codes);
    }
    Y.makeBind = makeBind;
    var BindContext = (function () {
        function BindContext(root, element, controller) {
            this.$self = this.$root = root.$accessor;
            this._element = element;
            this._binders = binders;
            this._controller = controller;
            this._scopes = [];
        }
        return BindContext;
    }());
    Y.BindContext = BindContext;
    var Expression = (function () {
        function Expression() {
        }
        Expression.prototype.bind = function (context) { };
        Expression.prototype.toCode = function () { throw "abstract function"; };
        return Expression;
    }());
    var ScopeBeginExpression = (function (_super) {
        __extends(ScopeBeginExpression, _super);
        function ScopeBeginExpression(modelPath, context) {
            var _this = _super.call(this) || this;
            var result = defineModel(modelPath, context);
            _this.modelPath = result.path;
            _this.bind = function (context) {
                context._scopes.push(context.$self);
                context.$self = result.model.$accessor;
            };
            return _this;
            //this.childAt = at;
        }
        ScopeBeginExpression.prototype.toString = function () {
            return "_scopes.push($self);\n$self = " + this.modelPath + ";\n";
        };
        return ScopeBeginExpression;
    }(Expression));
    var ScopeEndExpression = (function (_super) {
        __extends(ScopeEndExpression, _super);
        function ScopeEndExpression() {
            var _this = _super.call(this) || this;
            _this.bind = function (context) {
                context.$self = context._scopes.pop();
            };
            return _this;
            //this.childAt = at;
        }
        ScopeEndExpression.prototype.toString = function () {
            return "$self = _scopes.pop();\n";
        };
        return ScopeEndExpression;
    }(Expression));
    var ChildBeginExpression = (function (_super) {
        __extends(ChildBeginExpression, _super);
        function ChildBeginExpression(at, element) {
            var _this = _super.call(this) || this;
            _this.childAt = at;
            _this.element = element;
            _this.bind = function (context) {
                context._element = context._element.childNodes[at];
            };
            return _this;
            //this.childAt = at;
        }
        ChildBeginExpression.prototype.toString = function () {
            return "_element = _element.childNodes[" + this.childAt + "];\n";
        };
        return ChildBeginExpression;
    }(Expression));
    var ChildEndExpression = (function (_super) {
        __extends(ChildEndExpression, _super);
        function ChildEndExpression(at) {
            var _this = _super.call(this) || this;
            _this.childAt = at;
            _this.bind = function (context) {
                context._element = context._element.parentNode;
            };
            return _this;
            //this.childAt = at;
        }
        ChildEndExpression.prototype.toString = function () {
            return "_element = _element.parentNode;\n";
        };
        return ChildEndExpression;
    }(Expression));
    var UniboundExpression = (function (_super) {
        __extends(UniboundExpression, _super);
        function UniboundExpression(modelPath, context, attrName) {
            if (attrName === void 0) { attrName = "value"; }
            var _this = _super.call(this) || this;
            _this.attr = attrName;
            var result = defineModel(modelPath, context);
            _this.modelPath = result.path;
            _this.bind = function (context) {
                uniBinder(context._element, result.model.$accessor, context._controller, attrName);
            };
            return _this;
        }
        UniboundExpression.prototype.toString = function () {
            return "_binders[\"unibound\"](_element," + this.modelPath + ",\"" + this.attr + "\");\n";
        };
        return UniboundExpression;
    }(Expression));
    var BindExpression = (function (_super) {
        __extends(BindExpression, _super);
        function BindExpression(modelPath, name, context, controller) {
            var _this = _super.call(this) || this;
            _this.name = name;
            var result = defineModel(modelPath, context);
            _this.modelPath = result.path;
            _this.binder = context._binders[name];
            _this.bind = function (context) {
                context._binders[name](context._element, result.model.$accessor, controller);
            };
            return _this;
        }
        BindExpression.prototype.toString = function () {
            return "_binders[\"" + this.name + "\"](_element," + this.modelPath + ",_controller);\n";
        };
        return BindExpression;
    }(Expression));
    var EachExpression = (function (_super) {
        __extends(EachExpression, _super);
        function EachExpression(modelPath, context) {
            var _this = _super.call(this) || this;
            var result = defineModel(modelPath, context);
            _this.modelPath = result.path;
            _this.bind = function (context) {
                context._binders["each"](context._element, result.model.$accessor, context._controller);
            };
            return _this;
        }
        EachExpression.prototype.toString = function () {
            return "_binders[\"each\"](_element," + this.modelPath + ",_controller);\n";
        };
        return EachExpression;
    }(Expression));
    var LabelExpression = (function (_super) {
        __extends(LabelExpression, _super);
        function LabelExpression(key, element, attr) {
            if (attr === void 0) { attr = "textContent"; }
            var _this = _super.call(this) || this;
            _this.key = key;
            _this.attr = attr;
            _this.bind = function (context) {
                element[attr] = context._controller._TEXT(key);
            };
            return _this;
        }
        LabelExpression.prototype.toString = function () {
            return "_element[\"" + this.attr + "\"]=_controller._TEXT(\"" + this.key + "\");\n";
        };
        return LabelExpression;
    }(Expression));
    var EventExpression = (function (_super) {
        __extends(EventExpression, _super);
        function EventExpression(evtName, actionName) {
            var _this = _super.call(this) || this;
            _this.actionName = actionName;
            _this.evtName = evtName.indexOf("on") == 0 ? evtName.substr(2) : evtName;
            _this.bind = function (context) {
                Y.platform.attach(context._element, _this.evtName, function (evt) { context._controller[actionName].call(context._controller, evt || window.event, this); });
            };
            return _this;
        }
        EventExpression.prototype.toString = function () {
            return "attach(_element,\"" + this.evtName + "\",function(evt){_controller." + this.actionName + ".call(_controller,evt||window.event,this);});\n";
        };
        return EventExpression;
    }(Expression));
    var trimReg = /(^\s+)|(\s+$)/;
    var varExprText = "[a-zA-Z_\\$][a-zA-Z0-9_\\$]*";
    var jsonPathExprText = varExprText + "(?:." + varExprText + ")*";
    //双向绑定value {{User.Name}}
    var valueReg = new RegExp("^\\s*\\{\\{(" + jsonPathExprText + ")\\}\\}\\s*$");
    //单向绑定text {User.Name}
    var textReg = new RegExp("^\\s*\\{(" + jsonPathExprText + ")\\}\\s*$");
    //文本标签绑定 #Yes#
    var labelReg = new RegExp("^#([^#]+)#$");
    //事件绑定 !OnSubmit,
    var eventReg = new RegExp("^\\!" + varExprText + "$");
    //计算绑定 %(price:Price,count:Count,rate:$.Rate)=>
    var declareExprText = varExprText + "\\s*\\:\\s*" + jsonPathExprText;
    var argListExprText = declareExprText + "(?:\\s*,\\s*" + declareExprText + ")*";
    var computedReg = new RegExp("^%\\((" + argListExprText + ")\\)=>");
    var DefineResult = (function () {
        function DefineResult(path, model) {
            this.model = model;
            this.path = path;
        }
        return DefineResult;
    }());
    function definePath(modelPath, context) {
        var paths = modelPath.split(".");
        var first = paths.shift();
        var accessor = context.$self;
        if (first == "$root" || first == "$") {
            accessor = context.$root;
        }
        else if (first == "$parent") {
            accessor = context.$self.$model["super"]().$accessor;
        }
        else {
            modelPath = "$self." + modelPath;
            paths.unshift(first);
        }
        var model = accessor.$model;
        for (var i = 0, j = paths.length; i < j; i++) {
            var pathname = paths[i].replace(trimReg, "");
            if (pathname == "")
                throw "Invalid expression:" + modelPath;
            model = model.prop(pathname, {});
        }
        return new DefineResult(modelPath, model);
    }
    function defineModel(pathOrExpr, context) {
        return definePath(pathOrExpr, context);
    }
    function buildBind(element, context, exprs) {
        var tagName = element.tagName;
        if (!tagName) {
            var html = element.textContent;
            if (tryBuildLabel(html, element, context, exprs))
                return;
            if (tryBuildUniBound(html, element, context, exprs, "textContent"))
                return;
            return;
        }
        var elementValue = element.value;
        if (elementValue) {
            tryBuildLabel(elementValue, element, context, exprs, "value");
            tryBuildUniBound(elementValue, element, context, exprs, "value");
            tryBuildBiBound(elementValue, element, context, exprs);
        }
        var eachAttr;
        var scopeAttr;
        for (var n in binders) {
            var attr = element.getAttribute(n);
            if (!attr)
                continue;
            if (n == "y-scope" || n == "scope") {
                scopeAttr = attr;
                continue;
            }
            if (n == "y-each" || n == "each") {
                eachAttr = attr;
                continue;
            }
            if (tryBuildUniBound(attr, element, context, exprs))
                continue;
            if (tryBuildEventBound(attr, n, element, context, exprs))
                continue;
        }
        if (!element.hasChildNodes())
            return;
        if (eachAttr) {
            var eachExpr = new EachExpression(eachAttr, context);
            eachExpr.bind(context);
            exprs.push(eachExpr);
            return;
        }
        var children = element.childNodes;
        if (scopeAttr) {
            var scopeBegin = new ScopeBeginExpression(scopeAttr, context);
            scopeBegin.bind(context);
            exprs.push(scopeBegin);
        }
        for (var i = 0, j = element.childNodes.length; i < j; i++) {
            var child = element.childNodes[i];
            var startExpr = new ChildBeginExpression(i, element);
            startExpr.bind(context);
            exprs.push(startExpr);
            buildBind(child, context, exprs);
            var endExpr = new ChildEndExpression(i);
            endExpr.bind(context);
            var last = exprs.pop();
            if (last.childAt !== i || last.element != element) {
                exprs.push(last);
                exprs.push(endExpr);
            }
        }
        if (scopeAttr) {
            var lastExpr = exprs.pop();
            if (!(lastExpr instanceof ScopeBeginExpression)) {
                exprs.push(lastExpr);
                var scopeEnd = new ScopeEndExpression();
                scopeEnd.bind(context);
                exprs.push(scopeEnd);
            }
        }
    }
    function tryBuildLabel(exprText, element, context, exprs, attrName) {
        if (attrName === void 0) { attrName = "textContent"; }
        var match = exprText.match(labelReg);
        if (match != null) {
            var text = match[1];
            var expr = new LabelExpression(text, element, attrName);
            expr.bind(context);
            exprs.push(expr);
            return true;
        }
        return false;
    }
    //单向绑定
    function tryBuildUniBound(exprText, element, context, exprs, attrName) {
        if (attrName === void 0) { attrName = "value"; }
        if (!exprText)
            return false;
        var match = exprText.match(textReg);
        if (match != null) {
            var path = match[1];
            var expr = new UniboundExpression(path, context, attrName);
            expr.bind(context);
            exprs.push(expr);
            return true;
        }
        return false;
    }
    //双向绑定
    function tryBuildBiBound(exprText, element, context, exprs) {
        var bindname = getBindName(element);
        if (bindname == "checkbox" || bindname == "radio") {
            exprText = element.getAttribute("checked");
        }
        if (!exprText)
            return false;
        var match = exprText.match(valueReg);
        if (match != null) {
            var path = match[1];
            var expr = new BindExpression(path, "bibound." + bindname, context, context._controller);
            expr.bind(context);
            exprs.push(expr);
            return true;
        }
        return false;
    }
    //事件绑定
    function tryBuildEventBound(exprText, evtName, element, context, exprs) {
        var match = exprText.match(eventReg);
        if (match != null) {
            var actionName = match[1];
            evtName = evtName.indexOf("y-") == 0 ? evtName.substr(2) : evtName;
            var expr = new EventExpression(evtName, actionName);
            expr.bind(context);
            exprs.push(expr);
            return true;
        }
        return false;
    }
    function getBindName(element) {
        var bindname = null;
        if (element.tagName == "TEXTAREA")
            bindname = "textbox";
        else if (element.tagName == "SELECT")
            bindname = "select";
        else if (element.tagName == "INPUT") {
            var t = element.type;
            if (t === "checkbox")
                bindname = "checkbox";
            else if (t === "radio")
                bindname = "radio";
            else
                bindname = "textbox";
        }
        else
            bindname = "text";
        return bindname;
    }
    function buildBindCodes(element, codes) {
        if (codes === null || codes === undefined)
            codes = [];
        var exprs = [];
    }
    var binders = {
        "bibound.text": function (element, accessor) {
            var handler = function (sender, evt) { element.innerHTML = evt.value; };
            accessor.subscribe(handler);
            element.innerHTML = "";
            return function () { accessor.unsubscribe(handler); };
        },
        "bibound.value": function (element, accessor) {
            var handler = function (sender, evt) { element.value = evt.value; };
            accessor.subscribe(handler);
            element.value = "";
            return function () { accessor.unsubscribe(handler); };
        },
        "bibound.textbox": function (element, accessor) {
            var onchange = function () { tick = 0; accessor(element.value); };
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
            accessor.subscribe(handler);
            element.value = "";
            return function () { if (tick)
                clearTimeout(tick); accessor.unsubscribe(handler); };
        },
        "bibound.select": function (element, accessor) {
            var evtHandler = function () {
                accessor(element.selectedIndex > -1
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
            accessor.subscribe(handler);
            setValue(element, accessor());
            return function () { accessor.unsubscribe(handler); };
        },
        "bibound.radio": function (element, accessor) {
            var evtHandler = function () {
                if (element.checked)
                    accessor(element.value);
                else
                    accessor(null);
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
            accessor.subscribe(handler);
            setValue(element, accessor());
            return function () { accessor.unsubscribe(handler); };
        },
        "bibound.checkbox": function (element, accessor) {
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
                    for (var i_1 = 0, j_1 = childNodes_1.length; i_1 < j_1; i_1++) {
                        var child = childNodes_1[i_1];
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
                accessor(vals.length === 0 ? null : (vals.length == 1 ? vals[0] : vals));
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
            accessor.subscribe(handler);
            element.checked = false;
            element.removeAttribute("checked");
            return function () { accessor.unsubscribe(handler); };
        }
    };
    var uniBinder = binders["unibound"] = function (element, accessor, controller, extra) {
        var setValue;
        if (element.tagName == "SELECT") {
            setValue = function (element, value) {
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
        }
        else {
            setValue = function (element, value) {
                element[extra ? extra.toString() : "value"] = value === undefined ? "" : value;
            };
        }
        var handler = function (sender, evt) { setValue(element, evt.value); };
        accessor.subscribe(handler);
        setValue(element, undefined);
        return function () { accessor.unsubscribe(handler); };
    };
    var EachItemBindInfo = (function () {
        function EachItemBindInfo(view, bind) {
            this.view = view;
            this.bind = bind;
        }
        return EachItemBindInfo;
    }());
    var eachBinder = binders["each"] = function (element, accessor, extra) {
        var controller = extra;
        var model = accessor.$model;
        var eachId = element.getAttribute("y-each-view-id");
        var itemViewProto;
        if (eachId) {
            itemViewProto = controller.module.data["y-views"][eachId];
        }
        else {
            eachId = seed().toString();
            element.setAttribute("y-each-bind-id", eachId);
            var elemProto = Y.platform.cloneNode(element);
            var modelProto = model.itemProto().$model;
            var bind = makeBind(modelProto, element, controller);
            itemViewProto = new View(controller, modelProto, elemProto);
            controller.module.data["y-views"][eachId] = itemViewProto;
        }
        var addItemToView = function (item, anchorElement) {
            var itemView = itemViewProto.clone(controller, item);
            var elem = itemView.element;
            if (anchorElement == null) {
                for (var i = 0, j = elem.childNodes.length; i < j; i++) {
                    element.appendChild(elem.childNodes[i]);
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
                    var item = model.getItem(i, true);
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
            var elemProto = itemViewProto.element;
            switch (ievt.action) {
                case ModelActions.add:
                    var anchorElement = null;
                    if (evt.index * elemProto.childNodes.length <= element.childNodes.length - 1)
                        anchorElement = element.childNodes[evt.index];
                    addItemToView(model.getItem(evt.index, true), anchorElement);
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
        return function () {
            //TODO : 应该要重新构建，而不是清空
            model["@model.props"] = {};
            model.unsubscribe(handler);
        };
    }; //end eachBind
    function controll(opts) {
        var area = (opts.area) ? Y.platform.getElement(opts.area) : null;
        Module.load(opts.url, function (proto, error) {
            if (error) {
                opts.callback(undefined, error);
                return;
            }
            var module = this;
            if (proto === undefined) {
                if (area && this.viewTemplate) {
                    area.innerHTML = this.viewTemplate.innerHTML;
                }
                return;
            }
            var controllerType = module.data["y-controllerType"];
            if (!controllerType) {
                controllerType = proto;
                if (typeof proto === "object") {
                    controllerType = function () { };
                    controllerType.prototype = proto;
                }
                module.data["y-controllerType"] = controllerType;
            }
            var controller = new controllerType();
            controller.module = module;
            var view = module.data["y-mainView"];
            if (!view) {
                view = new View(controller, undefined, area);
                module.data["y-views"] = [];
                module.data["y-mainView"] = view.clone(undefined, null, undefined);
            }
            else {
                view = view.clone(controller, null, area);
            }
            controller.view = view;
            controller.model = view.model.$accessor;
            var remotes = module.data["controller.data"];
            if (remotes) {
            }
            controller.load(controller.model, controller.view);
            if (opts.callback)
                opts.callback(controller);
        });
    }
    Y.controll = controll;
    Y.platform.attach(window, "load", function () {
        var scripts = document.getElementsByTagName("script");
        for (var i = 0, j = scripts.length; i < j; i++) {
            var booturl = scripts[i].getAttribute("y-boot-url");
            if (booturl) {
                var elemId = scripts[i].getAttribute("y-boot-area");
                Y.controll({
                    url: booturl,
                    area: document.getElementById(elemId)
                });
            }
        }
    });
    var _seed = 0;
    function seed() {
        return (_seed == 2100000000) ? _seed = 0 : _seed++;
    }
    Y.seed = seed;
})(Y = exports.Y || (exports.Y = {}));
