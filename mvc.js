"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var Y;
(function (Y) {
    "use strict";
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
    "use strict";
    var View = (function () {
        function View(controller, element, model) {
            this.controller = controller;
            if (element == null)
                return;
            this.element = element;
            model || (model = new Model());
            this.model = model.$accessor;
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
    var UniboundExpression = (function (_super) {
        __extends(UniboundExpression, _super);
        function UniboundExpression(modelPath, context, attrName) {
            if (attrName === void 0) { attrName = "value"; }
            var _this = _super.call(this) || this;
            _this.attr = attrName;
            var result = defineModel(modelPath, context);
            _this.modelPath = result.path;
            _this.bind = function (context) {
                uniBinder(context._element, result.model.$accessor, attrName);
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
        function BindExpression(modelPath, name, context) {
            var _this = _super.call(this) || this;
            _this.name = name;
            var result = defineModel(modelPath, context);
            _this.modelPath = result.path;
            _this.binder = context._binders[name];
            _this.bind = function (context) {
                context._binders[name](context._element, result.model.$accessor);
            };
            return _this;
        }
        BindExpression.prototype.toString = function () {
            return "_binders[\"" + this.name + "\"](_element," + this.modelPath + ");\n";
        };
        return BindExpression;
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
                attach(context._element, _this.evtName, function (evt) { context._controller[actionName].call(context._controller, evt || window.event, this); });
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
        var children = element.childNodes;
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
            var expr = new BindExpression(path, "bibound." + bindname, context);
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
    var attach = window["attachEvent"] ? function (elem, evtname, fn) { elem.attachEvent("on" + evtname, fn); } : function (elem, evtname, fn) { elem.addEventListener(evtname, fn, false); };
    var detech = window["detechEvent"] ? function (evtname, elem, fn) { elem.detechEvent("on" + evtname, fn); } : function (elem, evtname, fn) { elem.removeEventListener(evtname, fn, false); };
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
            attach(element, "keydown", evtHandler);
            attach(element, "keyup", evtHandler);
            attach(element, "blur", evtHandler);
            var handler = function (sender, evt) { element.value = evt.value; };
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
            attach(element, "change", evtHandler);
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
                setValue(element, value);
            };
            attach(element, "change", evtHandler);
            attach(element, "blur", evtHandler);
            attach(element, "click", evtHandler);
            accessor.subscribe(handler);
            element.checked = false;
            element.removeAttribute("checked");
            return function () { accessor.unsubscribe(handler); };
        }
    };
    var uniBinder = binders["unibound"] = function (element, accessor, extra) {
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
