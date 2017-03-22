export namespace Y {
    "use strict";
    export interface IModel {
        //valuechange(handler: IModelEventHandler, remove?: boolean): void;
        subscribe(handler:IModelEventHandler):void;
        unsubscribe(handler:IModelEventHandler):void;
        $model: Model;
        $modelType : ModelTypes;
        $accessor: IModelAccessor;
        
        push?(itemValue: any): IModel;
        pop?(returnModel?: boolean): any;
        unshift?(itemValue: any): IModel;
        shift?(returnModel?: boolean): any;
        getItem?(index: number, returnModel?:boolean): any;
        setItem?(index: number, returnModel?: boolean): any;
        count?(): number;
    }
    
    export interface IModelAccessor extends IModel {
        (newValue?: any): any;
    }
    
    export class Model implements IModel {
        private static chromeKeywords: { [id: string]: string }
            = { "name": "name_", "apply": "apply_", "call": "call_", "prototype": "prototype_" };
        private _changeHandlers: IModelEventHandler[];
        private _subject: Object;
        private _name: string | number;
        private _defination: Object;
        private _members: { [id: string]: Model };
        private _superior: Model;
        private _itemProto?: Model;
        private _computed?: Computed;
        private _root?:Model;
        public $accessor: IModelAccessor;
        public $model: Model;
        public $modelType:ModelTypes;

        public constructor(name?: string | number|Object, subject?: Object) {
            if(name===undefined){
                this._name = "";
            }else {
                if(name instanceof Object){
                    Model._define(this,name);
                    return;
                }
                this._name = name as string|number;
            }
            
            this._subject = subject===undefined?{}:subject;
            let self :Model = this;
            let accessor: IModelAccessor  = <IModelAccessor>function(newValue?:any):any{
                if (newValue === undefined) { return self._subject[self._name]; }
                self.setValue(newValue);
                return accessor;
            };
            
            accessor.subscribe = (handler: IModelEventHandler):void => {
                self.subscribe(handler);
            };
            accessor.unsubscribe = (handler: IModelEventHandler):void => {
                self.unsubscribe(handler);
            };
            accessor.toString =  ():string => { return self.getValue();}
            this.$model = accessor.$model = this;
            this.$accessor = accessor.$accessor = accessor;
            accessor.$modelType = this.$modelType = ModelTypes.any;     
        }
        public name(n?:string|number):string|number{if(n===undefined){return this._name;}return this._name=n;}
        public super(): Model { return this._superior; }
        public root():Model{ 
            if(this._root) return this._root;
            let result :Model = this;
            while(true){
                if(!result._superior) return this._root = result;
                else result = result._superior;
            }
        }
        
        public subject(newSubject?: any, source?:ModelEvent): any {
            if (newSubject === undefined) { return this._subject; }
            var oldSubject: Object = this._subject;
            if (oldSubject === newSubject) { return oldSubject; }
            var oldValue = oldSubject[this._name];
            newSubject= this._subject = newSubject || {};
            var newValue = newSubject[this._name];
            if(oldValue===newValue){
                return this._subject;
            }
            newSubject[this._name] = oldValue;
            this.setValue(newValue,source);
            
            return newSubject;
        }
        
        
        public subscribe(handler: IModelEventHandler):void{
            let handlers: IModelEventHandler[] = this._changeHandlers;
            if (!handlers) { handlers = this._changeHandlers = new Array<IModelEventHandler>(); }
            handlers.push(handler);
        }
        public unsubscribe(handler: IModelEventHandler):void{
            let handlers: IModelEventHandler[] = this._changeHandlers;
            if (!handlers) { return; }
            for (let i: number = 0, j: number = handlers.length; i < j; i++) {
                let existed: IModelEventHandler = handlers.shift();
                if (existed !== handler) { handlers.push(existed); }
            }            
        }
        //触发事件
        private _notifyValuechange(evt: ModelEvent,ignoreSuperior?:boolean):void {
            let changeHandlers: IModelEventHandler[] = this._changeHandlers;
            if (changeHandlers) {
                for (var i: number = 0, j: number = changeHandlers.length; i < j; i++) {
                    let handler: IModelEventHandler = changeHandlers.shift();
                    handler.call(this, this.$accessor, evt);
                    changeHandlers.push(handler);
                }
            }
           
            
            var value = this._subject[this._name];
            
            //向上传播事件
            var superior: Model = this._superior;
            if (superior && ignoreSuperior!==true) {
                evt = new ModelEvent(this, ModelActions.child, this._subject, undefined, evt);
                superior._notifyValuechange(evt);
            }
            
            
        }
        public getValue(): any { return this._subject[this._name]; }
        public setValue(newValue: any,source?:ModelEvent|number|boolean): any {
            let subject: Object = this._subject;
            //得到原先的值
            let oldValue:any = subject[this._name];
            //如果原先的值与新赋的值一样，就直接返回，不触发任何事件。
            if (oldValue === newValue) { return this; }
            //如果有成员，赋值就不能为空，如果是空，就认为是个新的Object或数组
            if (this._members) {
                if (!newValue) { newValue = this._itemProto === undefined?{}:[]; }
            }
            //把新的值赋给对象
            subject[this._name] = newValue;
            //如果第二个参数指定为false，表示不需要触发事件，立即返回。
            if (source === false) { return this; }
            //创建一个事件对象
            let evt: ModelEvent = new ModelEvent(this, ModelActions.change, newValue, oldValue, source as ModelEvent);
            if(source!==undefined && typeof source==="number"){evt.index = source;}
            //触发事件
            this._notifyValuechange(evt,source instanceof ModelEvent);
            let members: { [id: string]: Model } = this._members;
            if (members) {
                
                for (var name in members) {
                    if (!members.hasOwnProperty(name)) { continue; }
                    var member: Model = members[name];
                    member.subject(newValue,evt);
                }
            }
            return this;
        }
        public prop(name: string | number, defination?: Object): any {
            
            let members: { [index: string]: any } = this._members;
            if (defination === undefined) { return members[name]; }

            let subject:any = undefined;
            //name ===null是itemProto，不需要给subject设置值
            if(this._name!==null){
                subject = this._subject[this._name];
                if (typeof subject !== "object") {
                    if (subject === null || subject === undefined) { subject = this._subject[this._name] = {}; }
                    else throw "Model's value must be {} when define its prop.";
                }
            }
            
            let member: Model = members?members[name]:null;
            if(member){
                if(defination instanceof Object){
                    var def :{} = member._defination||( member._defination={});
                    for(let n in defination){
                        def[n] = defination[n];
                    }
                }
                return member;
            }
            member = new Model(name, subject);
            member._superior = this;
            this._member(member,name);
            return member;
        }
        private _member(newMember:Model,name?:string|number):void{
            let members: { [index: string]: any } = this._members || (this._members = {});
            newMember._superior = this;
            name || (name = newMember._name);
            members[name] = newMember;
            var aname: string = Model.chromeKeywords[name] || name.toString();
            this.$accessor[aname] = newMember.$accessor;
            if(this.$modelType === ModelTypes.any) {
                this.$accessor.$modelType = this.$modelType = ModelTypes.object;
            }
        }
        private static memberNameRegx :RegExp = /^[_a-zA-Z][_a-zA-Z0-9]*$/;
        private static _define(model:Model,opts?:{},name?:string|number):void{
            
            let defination:{} = undefined;
            for(let n in opts){
                if(n===""){continue;}
                if(!opts.hasOwnProperty(n))continue;
                if(n[0]!=="@"){
                    if(!Model.memberNameRegx.test(n)){defination[n] = opts[n];continue;} 
                    let subOpts :Object = opts[n];
                    let sub :Model = new Model((n||(subOpts?subOpts["@name"]:""))||"");
                    Model._define(sub,subOpts);
                    model._member(sub);
                    if(subOpts instanceof Array){
                        sub.toArray(subOpts[0]);
                    }
                    continue;
                }
                (defination||(defination={}))[n] = opts[n];
            }
            model._defination = defination;
        }
        public clone(newSubject: Object = {},newName?:string|number): Model {
            var newModel: Model = new Model(newName = newName===undefined?this._name:newName, newSubject);
            newModel._defination = this._defination;
            newModel.$modelType = this.$modelType;
            if(newModel._itemProto = this._itemProto){
                newModel.toArray(this._itemProto);return newModel;
            }
            if(newModel._computed=this._computed){
                return newModel;
            }
            var members: { [id: string]: Model } = this._members;
            if (members ) {
                var newMembers: { [index: string]: Model } = newModel._members || (newModel._members = {});
                var value:any = newSubject[newName] || (newSubject[newName]={});
                var newAccessor :any = newModel.$accessor;
                for (var name in members) {
                    if (!members.hasOwnProperty(name)) { continue; }
                    var member: Model = members[name];
                    var newMember: Model = member.clone(value,name);
                    newMembers[name] = newMember;
                    var aname: string = Model.chromeKeywords[name] || name.toString();
                    newAccessor[aname] = newMember.$accessor;
                }
            }
            return newModel;
        }
        public computed(deps: { [index: string]: IModel }, codes: Function | string): Model {
            if (this.$modelType !== ModelTypes.any) { throw "Already been computed."; }
            var isFn: boolean = typeof codes === "function";
            var fn: Function = null;
            let args: Array<IModel|string> = [];
            let argnames: Array<string> = [];
            for (let n in deps) {
                if (!deps.hasOwnProperty(n)) { continue; }
                let depModel: IModel = deps[n];
                if (!depModel.subscribe) { throw n + " is not a model or accessor."; }
                depModel.subscribe((sender: IModelAccessor, evt: ModelEvent): void => {
                    var value:any = this._computed.getValue();
                    let computedEvt: ModelEvent = new ModelEvent(this, ModelActions.computed, value, undefined, evt);
                    this._notifyValuechange(computedEvt,true);
                });
                argnames.push(n);
                args.push(depModel.$accessor);
            }

            if (!isFn) {
                args.push(codes as string);
                fn = Function.apply(undefined, args);
                args.pop();
            }
            this._computed = new Computed(this._superior.$accessor, args as Array<IModelAccessor>, fn);
            this.getValue = () => this._computed.getValue();
            this.setValue = () => { throw "Computed member is readonly."; };
            this.prop = () => { throw "Computed member can not define member."; };
            this.$accessor.$modelType = this.$modelType = ModelTypes.computed;
            return this;
        }

        public toArray(itemProto?: Model|{}): Model {
            if (this.$modelType!==ModelTypes.any) { throw "Already been computed."; }
            
            var value: any = this._subject[this._name];
            if (!value) { value = this._subject[this._name] = []; }

            if (itemProto === undefined) { itemProto = new Model(null, value); }
            else {
                if(!(itemProto instanceof Model)) itemProto = new Model(itemProto); 
            }
            this._itemProto = itemProto as Model;
            this .itemProto = ():Model=>{return this._itemProto;};
            (itemProto as Model)._superior = this;
            
            var accessor: IModelAccessor = this.$accessor;
            this.$modelType = accessor.$modelType = ModelTypes.array;
            
            accessor.push = (itemValue: any):IModel => { (this as IModel).push(itemValue); return accessor; };
            accessor.pop = (returnModel?: boolean):any => { 
                let result:any = this.pop(returnModel); 
                return (returnModel===true)?result.$accessor:result;
            };
            accessor.unshift = (itemValue: any):IModel => { (this as IModel).unshift(itemValue); return accessor; };
            accessor.shift = (returnModel?: boolean):any => { 
                let result:any = this.shift(returnModel); 
                return returnModel===true?result.$accessor:result;
            };
            accessor.getItem = (index: number, returnModel?: boolean):any => { 
                let result :any = this.getItem(index, returnModel); 
                return returnModel===true?result.$accessor:result;
            };
            accessor.setItem = (index: number, itemValue: any):IModel => { (this as IModel).setItem(index, itemValue); return accessor; };
            accessor.count = () => { return (this as IModel).count(); };
            return itemProto as Model;
        } 
        public itemProto (): IModel {
            if(this.$modelType!==ModelTypes.array) {throw new NotArrayException();}
            return this._itemProto;
        }
        public count(): number {
            if(this.$modelType!==ModelTypes.array) {throw new NotArrayException();}
            let value: any = this._subject[this._name];
            if (!value) { return 0; }
            return value.length || 0;
        }
        public push(itemValue: any): IModel {
            if(this.$modelType!==ModelTypes.array) {throw new NotArrayException();}
            let value: any = this._subject[this._name];
            if (!value) { value = this._subject[this._name] = []; }

            var evt: ModelEvent = new ModelEvent(null, ModelActions.add, itemValue,undefined);
            evt.index = value.length;
            var evtp :ModelEvent = new ModelEvent(this,ModelActions.child,value,value,evt);
            value.push(itemValue);
            this._notifyValuechange(evtp);
            return this;
        }
        public pop(returnModel?: boolean): any {
            if(this.$modelType!==ModelTypes.array) {throw new NotArrayException();}
            let value: any = this._subject[this._name];
            if (!value) { return undefined; }
            if (value.length === 0) { return undefined; }

            var itemValue: any = value.pop();
            var itemModel: Model = this._members[value.length];
            let evt: ModelEvent = new ModelEvent(itemModel, ModelActions.remove, itemValue, itemValue);
            evt.index = value.length;
            if (itemModel !== undefined) { 
                delete this._members[value.length]; 
                (itemModel as any)._notifyValuechange(evt);
            }
            else{
                let evtc: ModelEvent = new ModelEvent(this, ModelActions.child, value, value,evt);
                this._notifyValuechange(evt);
                
            }
            

            return returnModel ? itemModel : itemValue;
        }
        public unshift(itemValue: any): Model {
            if(this.$modelType!==ModelTypes.array) {throw new NotArrayException();}
            let value: any = this._subject[this._name];
            if (!value) { value = this._subject[this._name] = []; }
            let members: { [index: string]: Model } = this._members;
            for (let i: number = 0, j: number = value.length - 1; i <= 0; j--) {
                var member: Model = members[j.toString()];
                var index: number = j + 1;
                if (member instanceof Model) { members[index] = member; member.name(index); }
            }
            var itemModel: Model = members[0];
            if (itemModel != null) { delete members[0]; }
            value.unshift(itemValue);
            var evt: ModelEvent = new ModelEvent(this, ModelActions.add, value, value);
            evt.index = 0;
            
            this._notifyValuechange(evt);
            return this;
        }
        public shift(returnModel?: boolean):any {
            if(this.$modelType!==ModelTypes.array) {throw new NotArrayException();}
            let value: any = this._subject[this._name];
            if (!value) { return undefined; }
            if (value.length === 0) { return undefined; }

            let members: { [index: string]: Model } = this._members;
            var itemValue: any = value.shift();
            var itemModel: Model = members[0];
            
            for (let i: number = 0, j: number = value.length ; i <j; i++) {
                var member: Model = members[i + 1];
                if (member instanceof Model) { members[i] = member; member.name(i); }
            }
            delete members[value.length];

            var evt: ModelEvent = new ModelEvent(this, ModelActions.remove, value, value);
            evt.index = 0;
            
            this._notifyValuechange(evt);

            return returnModel ? itemModel : itemValue;
        }
        public getItem(index: number, returnModel?: boolean): any {
            if(this.$modelType!==ModelTypes.array) {throw new NotArrayException();}
            let value: any = this._subject[this._name];
            if (!value) { return undefined; }
            if (value.length === 0 || value.length === undefined) { return undefined; }
            if (returnModel === true) {
                var members: { [index: string]: Model } = this._members || (this._members={});
                var itemModel: Model = members[index];
                if (itemModel !== undefined) { return itemModel; }
                itemModel = this._itemProto.clone(value,index);
                members[index] = itemModel;
                return itemModel;
            } else {
                return value[index];
            }
        }
        public setItem(index: number, itemValue: any): Model {
            if(this.$modelType!==ModelTypes.array) {throw new NotArrayException();}
            let value: any = this._subject[this._name];
            if (!value) { value = this._subject[this._name] = []; }
            
            let members: { [index: string]: Model } = this._members || (this._members={});
            let itemModel: Model = members[index];

            if (itemModel !== undefined) {
                itemModel.setValue(itemValue,index);
            } else {
                let oldItemValue: any = value[index];
                let action :ModelActions = index>=value.length?ModelActions.add:ModelActions.change;
                value[index] = itemValue;
                let evt: ModelEvent = new ModelEvent(null, action, itemValue, oldItemValue);
                evt.index = index;

                let evtp: ModelEvent = new ModelEvent(this, ModelActions.child, value, value,evt);

                this._notifyValuechange(evtp);
            }
            return this;
        }
    }

    export enum ModelTypes {
        any,
        object,
        array,
        computed
    }
    export enum ModelActions {
        change,
        add,
        remove,
        clear,
        child,
        computed
    }
    export class NotArrayException{
        toString():string{return "Call array function on Non-Array Model.";}
    }
    export class ModelEvent {
        public action: ModelActions;
        public model: Model;
        public $:IModelAccessor;
        public directSource: ModelEvent;
        private _finalSource?:ModelEvent;
        public value:any;
        public oldValue: any;
        public index: number;
        public constructor(model: Model, action: ModelActions, value: any, oldValue: any, source?: ModelEvent) {
            this.directSource = source;
           
            this.value = value;
            this.oldValue = oldValue;
            this.action = action;
            if(this.model = model)this.$ = model.$accessor;
        }
        public getSource(final?:boolean):ModelEvent{
            if(final!==true) return this.directSource;
            if(this._finalSource)return this._finalSource;
            let result:ModelEvent = this.directSource;
            while(true){
                if(result.directSource) result = result.directSource;
                else return this._finalSource=result;
            }
        }
    }
    export interface IModelEventHandler {
        (sender: IModelAccessor, evt: ModelEvent):any;
    }
    
    class Computed {
        arguments: Array<IModelAccessor>;
        function: Function;
        superior: IModelAccessor;
        constructor(superior: IModelAccessor, args: Array<IModelAccessor>, func: Function) {
            this.arguments = args;
            this.function = func;
            this.superior = superior;
        }
        getValue(): any {
            return this.function.apply(this.superior, this.arguments);
        }
    }
    /////////////////////////////////////////////////
    // View
    //////////////////////////////////////////////////
    "use strict";
    export interface IController{
        _TEXT:ILabel;
    }
    
    export class View{
        element:HTMLElement;
        model:IModelAccessor;
        controller:any;
        _bind:Function;
        constructor(controller:any,element?:HTMLElement,model?:Model){
            this.controller = controller;
            if(element==null) return;
            this.element = element;
            model ||(model= new Model());
            this.model = model.$accessor;
            let bindContext :BindContext = new BindContext(model,element,controller);
            let exprs :Array<Expression> = [];
            buildBind(element,bindContext,exprs);
            while(true){
                let expr:Expression = exprs.pop();
                if(!(expr instanceof ChildEndExpression)){
                    exprs.push(expr);
                    break;
                }
            }
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
        
        $root:IModelAccessor;
        $self:IModelAccessor;
        _element:HTMLElement;
        _binders:{[index:string]:IBinder};
        _controller:IController;
        _scopes:Array<IModelAccessor>;
        constructor(root:Model,element:HTMLElement,controller:IController){
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

    class UniboundExpression extends Expression{
        modelPath:string;

        attr:string;
        constructor(modelPath:string,context:BindContext,attrName:string="value"){
            super();
            this.attr = attrName;
            let result:DefineResult = defineModel(modelPath,context);
            this.modelPath = result.path;
            this.bind = function(context:BindContext){
                uniBinder(context._element,result.model.$accessor,attrName);
            }
        }
        
        toString():string{
            return "_binders[\"unibound\"](_element,"+this.modelPath+",\""+this.attr+"\");\n";
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
            this.bind = function(context:BindContext){
                context._binders[name](context._element,result.model.$accessor);
            }
        }
        
        toString():string{
            return "_binders[\"" + this.name + "\"](_element,"+this.modelPath+");\n";
        }
    }

    class LabelExpression extends Expression{
        attr : string;
        key:string;
        constructor(key:string,element:HTMLElement,attr:string="textContent"){
            super();
            this.key = key;
            this.attr = attr;
            this.bind = (context:BindContext)=>{
                element[attr] = context._controller._TEXT(key);
            };
        }
        toString():string{
            return "_element[\""+this.attr+"\"]=_controller._TEXT(\"" + this.key + "\");\n";
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
            return "attach(_element,\""+this.evtName+"\",function(evt){_controller."+this.actionName+".call(_controller,evt||window.event,this);});\n";
        }
    }

    var trimReg = /(^\s+)|(\s+$)/;
    let varExprText:string = "[a-zA-Z_\\$][a-zA-Z0-9_\\$]*";
    let jsonPathExprText:string = varExprText + "(?:."+varExprText+")*";
    //双向绑定value {{User.Name}}
    let valueReg :RegExp= new RegExp("^\\s*\\{\\{("+jsonPathExprText+")\\}\\}\\s*$");
    //单向绑定text {User.Name}
    let textReg:RegExp = new RegExp("^\\s*\\{("+jsonPathExprText+")\\}\\s*$");
    //文本标签绑定 #Yes#
    let labelReg :RegExp= new RegExp("^#([^#]+)#$"); 
    //事件绑定 !OnSubmit,
    let eventReg:RegExp = new RegExp("^\\!"+varExprText+"$"); 
    //计算绑定 %(price:Price,count:Count,rate:$.Rate)=>
    let declareExprText = varExprText + "\\s*\\:\\s*" + jsonPathExprText;
    let argListExprText = declareExprText + "(?:\\s*,\\s*"+declareExprText+")*";
    let computedReg:RegExp =new RegExp("^%\\((" + argListExprText + ")\\)=>");
    class DefineResult{
        model:Model;
        path : string;
        constructor(path:string,model:Model){
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
        let model :Model = accessor.$model;
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
        let tagName:string = element.tagName;
        if(!tagName){
            var html = element.textContent;
            if(tryBuildLabel(html,element,context,exprs))return;
            if(tryBuildUniBound(html,element,context,exprs,"textContent" )) return;
            return;
        }
        var elementValue = (element as HTMLInputElement).value;
        if(elementValue) {
            tryBuildUniBound(elementValue,element,context,exprs,"value");
            tryBuildBiBound(elementValue,element,context,exprs); 
        }
        let eachAttr: string;
        let scopeAttr:string ;
        
        for(var n in binders){
            
            var attr = element.getAttribute(n);
            if(!attr) continue;
            if(n=="y-scope" || n=="scope") {scopeAttr =attr ;continue;}
            if(n=="y-each" || n=="each"){eachAttr = attr;continue;}
            if(tryBuildUniBound(attr,element,context,exprs )) continue; 
            
            if(tryBuildEventBound(attr,n,element,context,exprs )) continue;         
        }
        if(!element.hasChildNodes()) return;
        var children = element.childNodes;
        
        
        for(let i:number=0,j:number = element.childNodes.length;i<j;i++){
            let child:HTMLElement = element.childNodes[i] as HTMLElement;
            let startExpr:ChildBeginExpression = new  ChildBeginExpression(i,element);
            startExpr.bind(context);
            exprs.push(startExpr);
            buildBind(child,context,exprs);
            let endExpr:ChildEndExpression = new ChildEndExpression(i);
            endExpr.bind(context);
            var last:ChildBeginExpression = exprs.pop() as ChildBeginExpression;
            if(last.childAt!==i || last.element!=element) {
                exprs.push(last); 
                
                exprs.push(endExpr);
            }
            
        }
        

    }
    function tryBuildLabel(exprText:string,element:HTMLElement,context: BindContext,exprs:Array<Expression>,attrName:string="textContent"):boolean{
        var match:RegExpMatchArray = exprText.match(labelReg);
        if(match!=null){
            let text:string = match[1];
            let expr :LabelExpression = new LabelExpression(text,element,attrName);
            expr.bind(context);
            exprs.push(expr);
            return true;
        }
        return false;
    }
    //单向绑定
    function tryBuildUniBound(exprText:string,element:HTMLElement,context: BindContext,exprs:Array<Expression>,attrName:string="value"):boolean{
        if(!exprText) return false;
        var match:RegExpMatchArray = exprText.match(textReg);
        if(match!=null){
            let path:string = match[1];
            let expr :UniboundExpression = new UniboundExpression(path,context,attrName);
            expr.bind(context);
            exprs.push(expr);
            return true;
        }
        return false;
    }
    //双向绑定
    function tryBuildBiBound(exprText:string,element:HTMLElement,context: BindContext,exprs:Array<Expression>):boolean{
        let bindname = getBindName(element);
        if(bindname=="checkbox" || bindname=="radio"){
            exprText = (element as HTMLInputElement).getAttribute("checked");
        } 
        if(!exprText) return false;
        let match:RegExpMatchArray = exprText.match(valueReg);
        if(match!=null){
            let path:string = match[1];
            let expr :BindExpression = new BindExpression(path,"bibound." + bindname,context);
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
            else bindname="textbox";
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
        (element:HTMLElement,accessor:IModelAccessor,extra?:any):Function;
    }

    let binders :{[index:string]:IBinder}={
            "bibound.text":function(element:HTMLElement, accessor:IModelAccessor):Function{
                var handler = function (sender:IModel,evt:ModelEvent) { element.innerHTML = evt.value; };
                accessor.subscribe(handler);
                element.innerHTML="";
                return function(){accessor.unsubscribe(handler);}
            },
            "bibound.value":function(element:HTMLElement, accessor:IModelAccessor):Function{
                var handler = function (sender:IModel,evt:ModelEvent) { (element as HTMLInputElement).value = evt.value; };
                accessor.subscribe(handler);
                (element as HTMLInputElement).value="";
                return function(){accessor.unsubscribe(handler);}
            },
	    "bibound.textbox": function (element:HTMLElement, accessor:IModelAccessor) {
	        let onchange = function () { tick = 0; accessor((element as HTMLInputElement).value); }
	        let tick:number;
	        let evtHandler= function () {
	            if (tick) clearTimeout(tick);
	            tick = setTimeout(onchange, 180);
	         }
	        attach(element, "keydown", evtHandler);
	        attach(element, "keyup", evtHandler);
	        attach(element, "blur", evtHandler);
			var handler = function (sender:IModel,evt:ModelEvent) { (element as HTMLInputElement).value = evt.value; };
	        accessor.subscribe(handler);
	        (element as HTMLInputElement).value = "";
	        return function () { if (tick) clearTimeout(tick);accessor.unsubscribe(handler);}
	    },
	    "bibound.select": function (element:HTMLElement, accessor:IModelAccessor) {
	        var evtHandler = function () { 
                accessor(
                    (element as HTMLSelectElement).selectedIndex > -1 
                    ? ((element as HTMLSelectElement).options[(element as HTMLSelectElement).selectedIndex] as HTMLOptionElement).value 
                    : (element as HTMLSelectElement).value
                ); 
            }
	        let setValue:Function = function (element:HTMLElement, value:any) {
                if(value===undefined) return;
	            var opts = (element as HTMLSelectElement).options;
	            for (var i = 0, j = opts.length; i < j; i++) {
	                if (value === (opts[i] as HTMLOptionElement).value) {
	                    (element as HTMLSelectElement).selectedIndex = i;
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
	        "bibound.radio": function (element:HTMLElement, accessor:IModelAccessor) {
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
	    "bibound.checkbox": function (element:HTMLElement, accessor) {
	        var evtHandler = function () {
                let form:HTMLFormElement = (element as HTMLInputElement).form;
                let childNodes:NodeList;
                let vals:Array<string> = [];
                if(form!=null) {
                    for (var i = 0, j = form.elements.length; i < j; i++) {
                        let child = form.elements[i] as HTMLInputElement;
                        if (child.name === (element as HTMLInputElement).name) {
                            if (child.checked) { vals.push(child.value); }
                        }
                    }
                }else{
                    let childNodes = element.parentNode.parentElement.childNodes;
                    for (let i:number = 0, j:number = childNodes.length; i < j; i++) {
                        let child:Node = childNodes[i];
                        for(let n:number=0,m= child.childNodes.length;n<m;n++ ){
                            let ck = child.childNodes[n] as HTMLInputElement;
                            if(ck.tagName!=='INPUT' || ck.type!=='checkbox') continue;
                            if (ck.name === (element as HTMLInputElement).name) {
                                if (ck.checked) { vals.push(ck.value); }
                            }
                        }
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
                    let hasValue:boolean = false;
	                for (var i = 0, j = value.length; i < j; i++) {
	                    if (value[i] === element.value) {hasValue =true;break;}
	                }
                    if (value[i] === element.value) {
	                    element.checked = true;
	                    element.setAttribute("checked", "checked");
	                } else {
	                    element.checked = false;
	                    element.removeAttribute("checked");
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
			let handler:IModelEventHandler = function (sender:IModel,evt:ModelEvent) {
	            var value = evt.value;
	            setValue(element, value);
	        };
	        attach(element, "change", evtHandler);
	        attach(element, "blur", evtHandler);
	        attach(element, "click", evtHandler);
	        accessor.subscribe(handler);
	        (element as HTMLInputElement).checked = false;
            element.removeAttribute("checked");
			return function(){accessor.unsubscribe(handler);}
	    }
    };
    let uniBinder :IBinder =binders["unibound"]= function(element:HTMLElement, accessor:IModelAccessor,extra?:any):Function{
        let setValue:Function;
        if(element.tagName=="SELECT"){
            setValue = function (element:HTMLElement, value:any) {
                if(value===undefined) return;
	            var opts = (element as HTMLSelectElement).options;
	            for (var i = 0, j = opts.length; i < j; i++) {
	                if (value === (opts[i] as HTMLOptionElement).value) {
	                    (element as HTMLSelectElement).selectedIndex = i;
	                    return;
	                }
	            }
	        }
        }else{
            setValue = function (element:HTMLElement, value:any) {
                element[extra?extra.toString():"value"] = value===undefined?"":value;
            }
        }
        
        var handler = function (sender:IModel,evt:ModelEvent) {setValue(element,evt.value); };
        accessor.subscribe(handler);
        setValue(element,undefined);
        return function(){accessor.unsubscribe(handler);}
    };

    let eachBinder:IBinder = binders["each"] = function (element:HTMLElement, accessor:IModelAccessor) {
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
