"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
///<reference path="model.ts" />
var _M = require("./model");
var Y;
(function (Y) {
    "use strict";
    var View = (function () {
        function View(controller, element, model) {
            this.controller = controller;
            if (element == null)
                return;
            this.element = element;
            var m = this.model = model || new _M.Y.Model();
            var bindContext = new BindContext(m, element, controller);
            var exprs = [];
            buildBind(element, bindContext, exprs);
            var codes = exprs.join("");
            codes = "var $self = $root;var _scopes=[];" + codes;
            this._bind = new Function("$root", "_element", "_controller", "_binders", codes);
        }
        View.prototype.clone = function () {
            var cloned = new View(this.controller);
            return cloned;
        };
        return View;
    }());
    Y.View = View;
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
    var BindExpression = (function (_super) {
        __extends(BindExpression, _super);
        function BindExpression(modelPath, name, context) {
            var _this = _super.call(this) || this;
            _this.name = name;
            var result = defineModel(modelPath, context);
            _this.modelPath = result.path;
            _this.binder = context._binders[name];
            _this.bind = function () {
                this._binders[name](this._element, result.model.$accessor);
            };
            return _this;
        }
        BindExpression.prototype.toString = function () {
            return "_binders[\"" + this.name + "\"](_element," + this.modelPath + ");";
        };
        return BindExpression;
    }(Expression));
    var LabelExpression = (function (_super) {
        __extends(LabelExpression, _super);
        function LabelExpression(key, element) {
            var _this = _super.call(this) || this;
            _this.key = key;
            _this.bind = function (context) {
                element.innerHTML = context._controller._TEXT(key);
            };
            return _this;
        }
        LabelExpression.prototype.toString = function () {
            return "_element.innerHTML=_controller._TEXT(\"" + this.key + "\");";
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
                attach(context._element, _this.evtName, function (evt) { context._controller[actionName].call(context._controller, evt || window.event, this); });
            };
            return _this;
        }
        EventExpression.prototype.toString = function () {
            return "attach(_element,\"" + this.evtName + "\",function(evt){_controller." + this.actionName + ".call(_controller,evt||window.event,this);});";
        };
        return EventExpression;
    }(Expression));
    var trimReg = /(^\s+)|(\s+$)/;
    var varExprText = "[a-zA-Z_\\$][a-zA-Z0-9_\\$]*";
    var jsonPathExprText = varExprText + "(?:." + varExprText + ")*";
    //双向绑定value {{User.Name}}
    var valueReg = new RegExp("^\\{\\{(" + jsonPathExprText + ")\\}\\}$");
    //单向绑定text {User.Name}
    var textReg = new RegExp("^\\{(" + jsonPathExprText + ")\\}$");
    //文本标签绑定 #Yes#
    var labelReg = new RegExp("^#(" + jsonPathExprText + ")#$");
    //事件绑定 !OnSubmit,
    var eventReg = new RegExp("^\\!" + varExprText + "$");
    //计算绑定 %(price:Price,count:Count,rate:$.Rate)=>
    var declareExprText = varExprText + "\\s*\\:\\s*" + jsonPathExprText;
    var argListExprText = declareExprText + "(?:\\s*,\\s*" + declareExprText + ")*";
    var computedReg = new RegExp("^%\\(" + argListExprText + ")\\)=>");
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
        if (!element.tagName) {
            var html = element.innerHTML;
            if (tryBuildLabel(html, element, context, exprs))
                return;
            if (tryBuildUniBound(html, element, context, exprs))
                return;
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
            if (tryBuildUniBound(attr, element, context, exprs))
                continue;
            if (tryBuildEventBound(attr, n, element, context, exprs))
                continue;
        }
        if (!element.hasChildNodes())
            return;
        var children = element.childNodes;
        for (var i = 0, j = element.childNodes.length; i < j; i++) {
            var child = element.childNodes[i];
            var startExpr = new ChildBeginExpression(i, element);
            buildBind(child, context, exprs);
            var last = exprs.pop();
            if (last.childAt !== i || last.element != element) {
                exprs.push(last);
                var endExpr = new ChildEndExpression(i);
                exprs.push(endExpr);
            }
        }
    }
    function tryBuildLabel(exprText, element, context, exprs) {
        var match = exprText.match(labelReg);
        if (match != null) {
            var text = match[1];
            var expr = new LabelExpression(text, element);
            expr.bind(context);
            exprs.push(expr);
            return true;
        }
        return false;
    }
    //单向绑定
    function tryBuildUniBound(exprText, element, context, exprs) {
        var match = exprText.match(textReg);
        if (match != null) {
            var path = match[1];
            var expr = new BindExpression(path, "unibound." + getBindName(element), context);
            expr.bind(context);
            exprs.push(expr);
            return true;
        }
        return false;
    }
    //双向绑定
    function tryBuildBiBound(exprText, element, context, exprs) {
        var match = exprText.match(valueReg);
        if (match != null) {
            var path = match[1];
            var expr = new BindExpression(path, "bibound." + getBindName(element), context);
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
                bindname = "value";
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
    var attach = window["attachEvent"] ? function (elem, evtname, fn) { elem.attachEvent("on" + evtname, fn); } : function (elem, evtname, fn) { elem.addEventListener(evtname, fn, false); };
    var detech = window["detechEvent"] ? function (evtname, elem, fn) { elem.detechEvent("on" + evtname, fn); } : function (elem, evtname, fn) { elem.removeEventListener(evtname, fn, false); };
    var binders = {
        "value.textbox": function (element, accessor) {
            var onchange = function () { tick = 0; accessor(element.value); };
            var tick;
            var evtHandler = function () {
                if (tick)
                    clearTimeout(tick);
                tick = setTimeout(onchange, 180);
            };
            attach(element, "keydown", evtHandler);
            attach(element, "keyup", evtHandler);
            attach(element, "blur", evtHandler);
            var handler = function (sender, evt) { element.value = evt.value; };
            accessor.subscribe(handler);
            element.value = accessor();
            return function () { if (tick)
                clearTimeout(tick); accessor.unsubscribe(handler); };
        },
        "value.select": function (element, accessor) {
            var evtHandler = function () {
                accessor(element.selectedIndex > -1
                    ? element.options[element.selectedIndex].value
                    : element.value);
            };
            var setValue = function (element, value) {
                var opts = element.options;
                for (var i = 0, j = opts.length; i < j; i++) {
                    if (value === opts[i].value) {
                        element.selectedIndex = i;
                        element.value = value;
                        return;
                    }
                }
            };
            attach(element, "change", evtHandler);
            var handler = function (evt) { setValue(element, evt.value); };
            accessor.subscribe(handler);
            setValue(element, accessor());
            return function () { accessor.unsubscribe(handler); };
        },
        "value.radio": function (element, accessor) {
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
            var handler = function (evt) {
                setValue(element, evt.value);
            };
            attach(element, "change", evtHandler);
            attach(element, "blur", evtHandler);
            attach(element, "click", evtHandler);
            accessor.subscribe(handler);
            setValue(element, accessor());
            return function () { accessor.unsubscribe(handler); };
        },
        "value.checkbox": function (element, accessor) {
            var evtHandler = function () {
                var p = element.parentNode;
                var vals = [];
                for (var i = 0, j = p.childNodes.length; i < j; i++) {
                    var child = p.childNodes[i];
                    if (child.name === element.name) {
                        if (child.checked) {
                            vals.push(child.value);
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
                    for (var i = 0, j = value.length; i < j; i++) {
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
            var handler = function (evt) {
                var value = evt.value;
                setValue(element, value);
            };
            attach(element, "change", evtHandler);
            attach(element, "blur", evtHandler);
            attach(element, "click", evtHandler);
            accessor.subscribe(handler);
            setValue(element, accessor());
            return function () { accessor.unsubscribe(handler); };
        }
    };
    var eachBinder = binders["each"] = function (element, accessor) {
        var model = accessor.$model;
        var tpl = model.itemProto();
        var elem = tpl["@bind.element"];
        var childCount = elem.childNodes.length;
        var binder = tpl["@bind.binder"];
        var setValue = function () {
            element.innerHTML = "";
            for (var i = 0, j = model.count(); i < j; i++) {
                var item = model.getItem(i, true);
                var el = cloneNode(elem);
                binder(el, item.accessor);
                for (var n = 0, m = childCount; n < m; n++) {
                    element.appendChild(el.firstChild);
                }
            }
        };
        var handler = function (evt) {
            switch (evt.reason) {
                case "array.push":
                    var item = model.getItem(model.count() - 1, true);
                    var el = elem.clone(true);
                    binder(el, item);
                    for (var i = 0, j = childCount; i < j; i++) {
                        element.appendChild(el.firstChild);
                    }
                    break;
                case "array.pop":
                    for (var i = 0, j = childCount; i < j; i++) {
                        element.removeChild(element.lastChild);
                    }
                    break;
                case "array.unshift":
                    var item = model.getItem(model.count() - 1, true);
                    var el = elem.clone(true);
                    binder(el, item);
                    if (element.firstChild) {
                        for (var i = childCount - 1; i >= 0; i--) {
                            element.insertBefore(el.childNodes[i], element.firstChild);
                        }
                    }
                    else {
                        for (var i = 0, j = childCount; i < j; i++) {
                            element.appendChild(el.childNodes[i]);
                        }
                    }
                    break;
                case "array.shift":
                    for (var i = 0, j = childCount; i < j; i++) {
                        element.removeChild(element.firstChild);
                    }
                    break;
                case "array.remove":
                    var at = childCount * evt.index;
                    for (var i = 0, j = childCount; i < j; i++) {
                        element.removeChild(element.firstChild);
                    }
                    break;
                default:
                    setValue();
            }
        };
        model.subscribe(handler);
        setValue();
        return function () {
            //TODO : 应该要重新构建，而不是清空
            model["@model.props"] = {};
            model.unsubscribe(handler);
        };
    };
    var o2Str = Object.prototype.toString;
    var tagContainers = {
        "": document.createElement("div"),
        "LEGEND": document.createElement("fieldset"),
        "DT": document.createElement("DL"),
        "LI": document.createElement("ul"),
        "TR": document.createElement("tbody"),
        "TD": document.createElement("tr"),
        "TBODY": document.createElement("table"),
        "OPTION": document.createElement("select")
    };
    //oToStr = Object.prototype.toString;
    tagContainers["THEAD"] = tagContainers["TFOOT"] = tagContainers.TBODY;
    tagContainers["DD"] = tagContainers.DT;
    var cloneNode = function (elem) {
        var tag = elem.tagName;
        if (elem.cloneNode)
            return elem.cloneNode(true);
        var ctn = tagContainers[tag] || tagContainers[""];
        var html = elem.outerHTML + "";
        ctn.innerHTML = html;
        //var html = ctn.innerHTML;
        //ctn.innerHTML = html;
        return ctn.firstChild;
    };
})(Y = exports.Y || (exports.Y = {}));
