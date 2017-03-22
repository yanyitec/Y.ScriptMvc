///<reference path="model.ts" />
import _M = require("./model");

export namespace Y {
    "use strict";
    export interface IController{
        _TEXT:ILabel;
    }
    
    export class View{
        element:HTMLElement;
        model:_M.Y.Model;
        controller:any;
        _bind:Function;
        constructor(controller:any,element?:HTMLElement,model?:_M.Y.Model){
            this.controller = controller;
            if(element==null) return;
            this.element = element;
            let m:_M.Y.Model = this.model = model || new _M.Y.Model();
            let bindContext :BindContext = new BindContext(m,element,controller);
            let exprs :Array<Expression> = [];
            buildBind(element,bindContext,exprs);
            var codes = exprs.join("");
            codes = "var $self = $root;var _scopes=[];" + codes;
            this._bind = new Function("$root","_element","_controller","_binders",codes);
        }

        clone():View{
            var cloned = new View(this.controller);
            
            return cloned;
        }
    }
    export interface IBind{
        (context:BindContext):void;
    }
    export interface ILabel{
        (key:string):string;
    }
    export class BindContext{
        
        $root:_M.Y.IModelAccessor;
        $self:_M.Y.IModelAccessor;
        _element:HTMLElement;
        _binders:{[index:string]:IBinder};
        _controller:IController;
        _scopes:Array<_M.Y.IModelAccessor>;
        constructor(root:_M.Y.Model,element:HTMLElement,controller:IController){
            this.$self = this.$root = root.$accessor;
            this._element = element;
            this._binders = binders;
            this._controller = controller;
            this._scopes = [];
        }
    }

    class Expression{
        bind(context:BindContext):void{}
        

        toCode():string{throw "abstract function";}
    }
    class ScopeBeginExpression extends Expression{
        modelPath:string;
        constructor(modelPath:string,context:BindContext){
            super();
            var result = defineModel(modelPath,context);
            this.modelPath = result.path;
            this.bind = (context:BindContext):void=>{
                context._scopes.push(context.$self);
                context.$self = result.model.$accessor;
                
            }
            //this.childAt = at;
        }
        toString():string{
            return "_scopes.push($self);\n$self = " + this.modelPath + ";\n";
        }
    }
    class ScopeEndExpression extends Expression{
        modelPath:string;
        constructor(){
            super();
            this.bind = (context:BindContext):void=>{
                context.$self = context._scopes.pop();
            }
            //this.childAt = at;
        }
        toString():string{
            return "$self = _scopes.pop();\n";
        }
    }

    class ChildBeginExpression extends Expression{
        childAt:number;
        element:HTMLElement;
        constructor(at:number,element:HTMLElement){
            super();
            this.childAt = at;
            this.element = element;
            this.bind = (context:BindContext):void=>{
                context._element = context._element.childNodes[at] as HTMLElement;
            }
            //this.childAt = at;
        }
        toString():string{
            return "_element = _element.childNodes["+this.childAt+"];\n";
        }
    }
    class ChildEndExpression extends Expression{
        childAt:number;
        constructor(at:number){
            super();
            this.childAt = at;
            this.bind = (context:BindContext):void=>{
                context._element = context._element.parentNode as HTMLElement;
            }
            //this.childAt = at;
        }
        toString():string{
            return "_element = _element.parentNode;\n";
        }

    }

    class BindExpression extends Expression{
        modelPath:string;
        name:string;
        binder:IBinder;
        constructor(modelPath:string,name:string,context:BindContext){
            super();
            this.name = name;
            let result:DefineResult = defineModel(modelPath,context);
            this.modelPath = result.path;
            this.binder = context._binders[name];
            this.bind = function(){
                this._binders[name](this._element,result.model.$accessor);
            }
        }
        
        toString():string{
            return "_binders[\"" + this.name + "\"](_element,"+this.modelPath+");";
        }
    }

    class LabelExpression extends Expression{
        
        key:string;
        constructor(key:string,element:HTMLElement){
            super();
            this.key = key;
            this.bind = (context:BindContext)=>{
                element.innerHTML = context._controller._TEXT(key);
            };
        }
        toString():string{
            return "_element.innerHTML=_controller._TEXT(\"" + this.key + "\");";
        }
    }
    class EventExpression extends Expression{
        
        actionName:string;
        evtName:string;
        constructor(evtName:string,actionName:string){
            super();
            this.actionName = actionName;

            this.evtName = evtName.indexOf("on")==0?evtName.substr(2):evtName;
            this.bind = (context:BindContext)=>{
                attach(context._element,this.evtName,function(evt){context._controller[actionName].call(context._controller,evt||window.event,this);}); 
                
            };
        }
        toString():string{
            return "attach(_element,\""+this.evtName+"\",function(evt){_controller."+this.actionName+".call(_controller,evt||window.event,this);});";
        }
    }

    var trimReg = /(^\s+)|(\s+$)/;
    let varExprText:string = "[a-zA-Z_\\$][a-zA-Z0-9_\\$]*";
    let jsonPathExprText:string = varExprText + "(?:."+varExprText+")*";
    //双向绑定value {{User.Name}}
    let valueReg :RegExp= new RegExp("^\\{\\{("+jsonPathExprText+")\\}\\}$");
    //单向绑定text {User.Name}
    let textReg:RegExp = new RegExp("^\\{("+jsonPathExprText+")\\}$");
    //文本标签绑定 #Yes#
    let labelReg :RegExp= new RegExp("^#("+jsonPathExprText+")#$"); 
    //事件绑定 !OnSubmit,
    let eventReg:RegExp = new RegExp("^\\!"+varExprText+"$"); 
    //计算绑定 %(price:Price,count:Count,rate:$.Rate)=>
    let declareExprText = varExprText + "\\s*\\:\\s*" + jsonPathExprText;
    let argListExprText = declareExprText + "(?:\\s*,\\s*"+declareExprText+")*";
    let computedReg:RegExp =new RegExp("^%\\(" + argListExprText + ")\\)=>");
    class DefineResult{
        model:_M.Y.Model;
        path : string;
        constructor(path:string,model:_M.Y.Model){
            this.model = model;
            this.path = path;
        }
    }
    function definePath(modelPath:string,context:BindContext):DefineResult{
        var paths = modelPath.split(".");
        var first = paths.shift();
        var accessor = context.$self;
        if(first=="$root" || first == "$"){
            accessor = context.$root;
        }else if(first=="$parent"){
            accessor = context.$self.$model.super().$accessor;
        }else {
            modelPath = "$self." + modelPath;
            paths.unshift(first);
        }
        let model :_M.Y.Model = accessor.$model;
        for(let i:number=0,j:number=paths.length;i<j;i++){
            var pathname = paths[i].replace(trimReg,"");
            if (pathname=="") throw "Invalid expression:" + modelPath;
            model = model.prop(pathname,{});
        }
        return new DefineResult(modelPath,model);
    }
    function defineModel(pathOrExpr:string,context:BindContext):DefineResult{
        return definePath(pathOrExpr,context);
    }

    
    
    function buildBind(element:HTMLElement,context: BindContext,exprs:Array<Expression>):void{
        if(!element.tagName){
            var html = element.innerHTML;
            if(tryBuildLabel(html,element,context,exprs))return;
            if(tryBuildUniBound(html,element,context,exprs )) return;
        }
                
        let eachAttr: string;
        let scopeAttr:string ;
        
        for(var n in binders){
            
            var attr = element.getAttribute(n);
            if(!attr) continue;
            if(n=="y-scope" || n=="scope") {scopeAttr =attr ;continue;}
            if(n=="y-each" || n=="each"){eachAttr = attr;continue;}
            if(tryBuildUniBound(attr,element,context,exprs )) continue; 
            if(tryBuildUniBound(attr,element,context,exprs )) continue; 
            if(tryBuildEventBound(attr,n,element,context,exprs )) continue;         
        }
        if(!element.hasChildNodes()) return;
        var children = element.childNodes;
        
        
        for(let i:number=0,j:number = element.childNodes.length;i<j;i++){
            let child:HTMLElement = element.childNodes[i] as HTMLElement;
            let startExpr:ChildBeginExpression = new  ChildBeginExpression(i,element);
            buildBind(child,context,exprs);
            var last:ChildBeginExpression = exprs.pop() as ChildBeginExpression;
            if(last.childAt!==i || last.element!=element) {
                exprs.push(last); 
                let endExpr:ChildEndExpression = new ChildEndExpression(i);
                exprs.push(endExpr);
            }
            
        }
        

    }
    function tryBuildLabel(exprText:string,element:HTMLElement,context: BindContext,exprs:Array<Expression>):boolean{
        var match:RegExpMatchArray = exprText.match(labelReg);
        if(match!=null){
            let text:string = match[1];
            let expr :LabelExpression = new LabelExpression(text,element);
            expr.bind(context);
            exprs.push(expr);
            return true;
        }
        return false;
    }
    //单向绑定
    function tryBuildUniBound(exprText:string,element:HTMLElement,context: BindContext,exprs:Array<Expression>):boolean{
        var match:RegExpMatchArray = exprText.match(textReg);
        if(match!=null){
            let path:string = match[1];
            let expr :BindExpression = new BindExpression(path,"unibound." + getBindName(element),context);
            expr.bind(context);
            exprs.push(expr);
            return true;
        }
        return false;
    }
    //双向绑定
    function tryBuildBiBound(exprText:string,element:HTMLElement,context: BindContext,exprs:Array<Expression>):boolean{
        var match:RegExpMatchArray = exprText.match(valueReg);
        if(match!=null){
            let path:string = match[1];
            let expr :BindExpression = new BindExpression(path,"bibound." + getBindName(element),context);
            expr.bind(context);
            exprs.push(expr);
            return true;
        }
        return false;
    }
    //事件绑定
    function tryBuildEventBound(exprText:string,evtName:string,element:HTMLElement,context: BindContext,exprs:Array<Expression>):boolean{
        var match:RegExpMatchArray = exprText.match(eventReg);
        if(match!=null){
            let actionName:string = match[1];
            evtName = evtName.indexOf("y-")==0?evtName.substr(2):evtName;
            let expr :EventExpression = new EventExpression(evtName,actionName);
            expr.bind(context);
            exprs.push(expr);
            return true;
        }
        return false;
    }

    function getBindName(element:HTMLElement):string{
        let bindname :string = null;
        if(element.tagName=="TEXTAREA") bindname = "textbox";
        else if(element.tagName=="SELECT") bindname = "select";
        else if(element.tagName=="INPUT"){
            var t = (element as HTMLInputElement).type;
            if(t==="checkbox") bindname = "checkbox";
            else if(t==="radio") bindname = "radio";
            else bindname="value";
        }
        else bindname = "text";
        return bindname;
    }
    function buildBindCodes(element:HTMLElement,codes?:Array<string>){
        if(codes===null || codes===undefined) codes = [];
        let exprs:Array<Expression> = [];


    }
    let attach = window["attachEvent"] ? function (elem, evtname, fn) { elem.attachEvent("on" + evtname, fn); } : function (elem, evtname, fn) { elem.addEventListener(evtname, fn, false); };

	let detech = window["detechEvent"] ? function (evtname, elem, fn) { elem.detechEvent("on" + evtname, fn); } : function (elem, evtname, fn) { elem.removeEventListener(evtname, fn, false); }
	export interface IBinder{
        (element:HTMLElement,accessor:_M.Y.IModelAccessor):Function;
    }

    let binders :{[index:string]:IBinder}={
	        "value.textbox": function (element:HTMLElement, accessor:_M.Y.IModelAccessor) {
	            var onchange = function () { tick = 0; accessor((element as HTMLInputElement).value); }
	            var tick;
	            var evtHandler= function () {
	                if (tick) clearTimeout(tick);
	                tick = setTimeout(onchange, 180);
	            }
	            attach(element, "keydown", evtHandler);
	            attach(element, "keyup", evtHandler);
	            attach(element, "blur", evtHandler);
				var handler = function (sender:_M.Y.IModel,evt:_M.Y.ModelEvent) { (element as HTMLInputElement).value = evt.value; };
	            accessor.subscribe(handler);
	            (element as HTMLInputElement).value = accessor();
	            return function () { if (tick) clearTimeout(tick);accessor.unsubscribe(handler);}
	        },
	        
	        "value.select": function (element:HTMLElement, accessor:_M.Y.IModelAccessor) {
	            var evtHandler = function () { 
                    accessor(
                        (element as HTMLSelectElement).selectedIndex > -1 
                        ? ((element as HTMLSelectElement).options[(element as HTMLSelectElement).selectedIndex] as HTMLOptionElement).value 
                        : (element as HTMLSelectElement).value
                    ); 
                }
	            var setValue = function (element, value) {
	                var opts = element.options;
	                for (var i = 0, j = opts.length; i < j; i++) {
	                    if (value === opts[i].value) {
	                        element.selectedIndex = i;
	                        element.value = value;
	                        return;
	                    }
	                }
	            }
	            attach(element, "change", evtHandler);
				var handler = function (evt) { setValue(element, evt.value); }
	            accessor.subscribe(handler);
	            setValue(element, accessor());
				return function(){accessor.unsubscribe(handler);}
	        },
	        "value.radio": function (element:HTMLElement, accessor:_M.Y.IModelAccessor) {
	            var evtHandler = function () {
	                if ((element as HTMLInputElement).checked) accessor((element as HTMLInputElement).value);
	                else accessor(null);
	            }
	            var setValue = function (element:HTMLInputElement, value:any) {
	                if (value == element.value) {
	                    element.checked = true;
	                    element.setAttribute("checked", "checked");
	                } else {
	                    element.checked = false;
	                    element.removeAttribute("checked");
	                }
	            }
				var handler = function (evt) {
	                setValue((element as HTMLInputElement), evt.value);
	            }
	            attach(element, "change", evtHandler);
	            attach(element, "blur", evtHandler);
	            attach(element, "click", evtHandler);
	            accessor.subscribe(handler);
	            setValue((element as HTMLInputElement), accessor());
				return function(){accessor.unsubscribe(handler);}
	        },
	        "value.checkbox": function (element:HTMLElement, accessor) {
	            var evtHandler = function () {
	                var p = element.parentNode;
	                var vals = [];
	                for (var i = 0, j = p.childNodes.length; i < j; i++) {
	                    var child = p.childNodes[i] as HTMLInputElement;
	                    if (child.name === (element as HTMLInputElement).name) {
	                        if (child.checked) { vals.push(child.value); }
	                    }
	                }
	                accessor(vals.length === 0 ? null : (vals.length == 1 ? vals[0] : vals));
	            }
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
	                        } else {
	                            element.checked = false;
	                            element.removeAttribute("checked");
	                        }
	                    }
	                } else {
	                    if (value == element.value) {
	                        element.checked = true;
	                        element.setAttribute("checked", "checked");
	                    } else {
	                        element.checked = false;
	                        element.removeAttribute("checked");
	                    }
	                }
	            }
				var handler = function (evt) {
	                var value = evt.value;
	                setValue(element, value);
	            };
	            attach(element, "change", evtHandler);
	            attach(element, "blur", evtHandler);
	            attach(element, "click", evtHandler);
	            accessor.subscribe(handler);
	            setValue(element, accessor());
				return function(){accessor.unsubscribe(handler);}
	        }
	        
    };
    let eachBinder:IBinder = binders["each"] = function (element:HTMLElement, accessor:_M.Y.IModelAccessor) {
	        var model = accessor.$model;
	        var tpl = model.itemProto();
	        var elem = tpl["@bind.element"];
	        var childCount = elem.childNodes.length;
	        var binder = tpl["@bind.binder"];
	        var setValue = function () {
	            element.innerHTML = "";
	            for (var i = 0, j = model.count() ; i < j; i++) {
	                var item = model.getItem(i, true);
	                var el = cloneNode(elem);
	                binder(el, item.accessor);
	                for (var n = 0, m = childCount; n < m; n++) {
	                    element.appendChild(el.firstChild);
	                }
	            }
	        }
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
	                    } else {
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
	        }
			model.subscribe(handler);
            

			setValue();
			return function () {
			    //TODO : 应该要重新构建，而不是清空
			    model["@model.props"] = {};
			    model.unsubscribe(handler);
			}
	    }
    
    let o2Str:Function = Object.prototype.toString;


    let tagContainers:{[index:string]:HTMLElement} = {
	        "": document.createElement("div"),
	        "LEGEND": document.createElement("fieldset"),
            "DT" : document.createElement("DL"),
	        "LI": document.createElement("ul"),
	        "TR": document.createElement("tbody"),
	        "TD": document.createElement("tr"),
	        "TBODY": document.createElement("table"),
	        "OPTION": document.createElement("select")
    };
	    //oToStr = Object.prototype.toString;
	tagContainers["THEAD"] = tagContainers["TFOOT"] = tagContainers.TBODY;
	tagContainers["DD"] = tagContainers.DT;
	let cloneNode:Function = function (elem:HTMLElement) {
	    var tag = elem.tagName;
	    if (elem.cloneNode) return elem.cloneNode(true);
	    var ctn = tagContainers[tag] || tagContainers[""];
	    var html = elem.outerHTML + "";
	    ctn.innerHTML = html;

	    //var html = ctn.innerHTML;
	    //ctn.innerHTML = html;
	    return ctn.firstChild;
	}
}