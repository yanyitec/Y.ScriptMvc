export namespace Y {
    "use strict";
    
    
    ////////////////////////////////////
    /// export interfaces
    ///////////////////////////////////
    export interface IModel {
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
    export interface IModelEventHandler {
        (sender: IModelAccessor, evt: ModelEvent):any;
    }

    export interface IView{
        proto:IView;
        element :HTMLElement;
        model:IModel;
        clone(controller:IController,model?:IModel):IView;
    }

    export interface IController{
        _TEXT:ILabel;
        module:IModule;
    }

    export interface IModule{
        views:{[index:string]:IView}
    }
    export interface ILabel{
         (key:string):string;
    }
    export interface IPlatform{
        alert(message:string);
        //添加事件
        attach(elem:HTMLElement,evtName:string,evtHandler:Function):void;
        //解除事件
        detech(elem:HTMLElement,evtName:string,evtHandler:Function):void;
        ajax(opts):void;
        //获取内容
        getContent(url:string,callback:Function):void;
        cloneNode(element:HTMLElement):HTMLElement;
    }
    
    ////////////////////////////////////
    /// 平台抽象
    ///////////////////////////////////

    let tagContainers:{[index:string]:HTMLElement};
	
    export class Platform implements IPlatform{
        attach(elem:HTMLElement,evtName:string,evtHandler:Function):void{}
        //解除事件
        detech(elem:HTMLElement,evtName:string,evtHandler:Function):void{}
        
        constructor(){
            this.attach = window["attachEvent"] ? function (elem, evtname, fn) { (elem as any).attachEvent("on" + evtname, fn); } : function (elem, evtname, fn) { elem.addEventListener(evtname, fn as EventListenerOrEventListenerObject, false); };
	        this.detech = window["detechEvent"] ? function (elem,evtname,  fn) { (elem as any).detechEvent("on" + evtname, fn); } : function (elem, evtname, fn) { elem.removeEventListener(evtname, fn as EventListenerOrEventListenerObject, false); }
            
        }
        alert(message:string):void{
            window.alert(message);
        }
        cloneNode(elem:HTMLElement):HTMLElement{
            var tag = elem.tagName;
            if (elem.cloneNode) return elem.cloneNode(true) as HTMLElement;
            if(!tagContainers){
               tagContainers = {
                    "": document.createElement("div"),
                    "LEGEND": document.createElement("fieldset"),
                    "DT" : document.createElement("DL"),
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
	        return ctn.firstChild as HTMLElement;
        }
        //获取内容
        getContent(url:string,callback:Function):void{
            this.ajax({
                url:url,
                method:"GET",
                callback:callback
            });
        }
        ajax(opts:any):void {
            let http:any=null;
            if(window["XMLHttpRequest"]){  
                http=new XMLHttpRequest();  
                if(http.overrideMimeType) http.overrideMimeType("text/xml");
            }else if(window["ActiveXObject"]){  
                var activeName=["MSXML2.XMLHTTP","Microsoft.XMLHTTP"];  
                for(var i=0;i<activeName.length;i++) try{http=new ActiveXObject(activeName[i]); break;}catch(e){}
            }
            if(http==null)  throw "Cannot create XmlHttpRequest Object";
            
            var url = opts.url;
            if(!url) throw "require url";
            var method = opts.method ? opts.method.toUpperCase():"GET";

            if(method=="POST"){  
                http.setRequestHeader("Content-type","application/x-www-four-urlencoded");  
            }  
            var headers = opts.headers;
            if(headers) for(let n in headers) http.setRequestHeader(n,headers[n]);  
        }//end ajax

    }

    

    export let platform:IPlatform= new Platform();
    
    ////////////////////////////////////
    /// 资源加载
    ////////////////////////////////////
    let langId:string;
    export function language(lng:string):void{
        if(langId===lng) return;
    }
    

    ////////////////////////////////////
    /// 资源加载
    ////////////////////////////////////

    export let _exports:{};

    let head :HTMLElement;

    export interface SourceCallback{
        (value:any,error:any):void;
    }
    export interface ISourceOpts{
        
        type:string;
        url:string;
        alias?:string;
        callback?:SourceCallback;
        value?:any;
    }
    interface ISourceCallback{
        func:Function;
        constArgs?:any;
    }
    export class Source{
        url:string;
        type:string;
        alias:string;
        value?:any;
        error?:any;
        element?:HTMLElement;
        _callbacks?:Array<ISourceCallback>;
        constructor(opts:ISourceOpts|string,callback?:SourceCallback){
            let _opts :ISourceOpts;
            if(typeof opts ==="string"){
                _opts ={url:opts,alias:opts,type:undefined,callback:callback};
                let url = opts;
                if(url.lastIndexOf(".js"))_opts.type = "js";
                else if(url.lastIndexOf(".css")) _opts.type = "css";
                else if(url.lastIndexOf(".json")) _opts.type = "json";
            }
            this.url = _opts.url;
            this.type = _opts.type;
            this.alias = _opts.alias;
            if(_opts.value===undefined){
                this.value = _opts.value;
                
            }else{
                this._callbacks = [];
            }
            if(callback) this.callback(callback,opts);
            if(_opts.callback) this.callback(_opts.callback,opts);
            this.refresh();
            
        }
        callback(handle:Function,constArgs?:any):Source{
            if(this._callbacks===undefined){handle.call(this,this.value,this.error);}
            else this._callbacks.push({func:handle,constArgs:constArgs});
            return this;
        }
        _done(success,error):void{
            this.value = success;
            this.error = error;
             for(let i=0,j=this._callbacks.length;i<j;i++){
                let item:ISourceCallback = this._callbacks[i];
                item.func.call(this,success,error,item.constArgs);
            }  
            Y._exports = undefined;
            this._callbacks = undefined;
        }
        refresh():Source{
            if(!this.url)return;
            let me:Source = this;
            if(this.type=="json"){
                platform.getContent(this.url,function(content,error){
                    if(!error) me._done(JSON.parse(content),error);
                    else me._done(undefined,error);
                });
                return me;
            }
            if(this.type!="js" && this.type!="css"){
                platform.getContent(this.url,function(content,error){
                    me._done(content,error);
                });
                return me;
            }

            if(this.element)this.element.parentNode.removeChild(this.element);
            let elem :HTMLElement;
            
            if(this.type=="js"){
                elem = document.createElement("script");
                (elem as HTMLScriptElement).src = this.url;
                (elem as HTMLScriptElement).type = "text/javascript";
                
            }else if(this.type=="css"){
                elem = document.createElement("link");
                (elem as HTMLLinkElement).href=this.url;
                (elem as HTMLLinkElement).type="text/css";
                (elem as HTMLLinkElement).rel="stylesheet";
            }
            if(elem["onreadystatechange"]!==undefined){
                (elem as any).onreadystatechange = function(){
                    if((elem as any).readyState==4 || (elem as any).readyState=="complete"){
                       
                    }
                }
            }else elem.onload = function(){
                for(let i=0,j=me._callbacks.length;i<j;i++){
                    let item:ISourceCallback = me._callbacks[i];
                    item.func.call(me,Y._exports,me.error,item.constArgs);
                }  
                Y._exports = undefined;
                me._callbacks = undefined;
            }
            elem.onerror = function(ex){
                for(let i=0,j=me._callbacks.length;i<j;i++){
                    let item:ISourceCallback = me._callbacks[i];
                    item.func.call(me,Y._exports,me.error,item.constArgs);
                }  
                Y._exports = undefined;
                me._callbacks = undefined;
            }
            
            let myhead = head;
            if(myhead==null){
                let heads:NodeListOf<HTMLHeadElement> = document.getElementsByTagName("head");
                if(heads && heads.length) {head = myhead = heads[0];}
                else {myhead = document.body;}
            }
            this.element = elem;
            myhead.appendChild(elem);
            return this;
        }
        dispose():void{

        }
    }
    export let sourceCache :{[index:string]:Source}={};
    export function loadSource(opts:ISourceOpts|string,callback?:SourceCallback){
        let isUrl:boolean = typeof opts ==="string"; 
        let name :string=isUrl ?(opts as string): ((opts as ISourceOpts).alias|| (opts as ISourceOpts).url);
        let source:Source= this.sourceCache[name];
        if(!source){
            source = new Source(opts,callback);
            this.sourceCache[name] = source;
        }else if(callback) source.callback(callback);
        return source;
    }

    ////////////////////////////////////
    /// 模块化
    ////////////////////////////////////

    
    export interface IModuleDefination{
        deps?:Array<string|ISourceOpts>;
        imports?:Array<string|ISourceOpts>;
        lang?:string;
        define?:Function;
    }
    class Module {
        scripts:any;
        stylesheets:any;
        opts:ISourceOpts;
        url:string;
        alias:string;
        _lang?:Object;
        imports:Array<any>;
        defineProc:Function;
        value?:any;
        
        _callbacks:Array<Function>;
        controllerElement:HTMLScriptElement;
        error:any;

        constructor(opts:IModuleDefination|string){
            //this.alias =opts.alias;
            //this.url = opts.url;
            
        }
        define(dfd:IModuleDefination,defineFunc?:Function){
            let me :Module = this;
            this.defineProc = defineFunc|| dfd.define;
            let depScripts:Array<Source> = [];
            let throughout:boolean = false;
            let waitingCount = 0;
            let deps = dfd.deps;
            if(deps){
                for(let i=0,j=deps.length;i<j;i++){
                    if(this.error)return;
                    waitingCount++;
                    let dep = deps[i];
                    loadSource(dep ,function(value,err){
                        if(err) {  me.error = err;return; }
                        if(me.error ||(--waitingCount==0 && throughout)) me._done();
                    });
                }
            }
            let args = [];
            deps = dfd.imports;
            if(deps){
                for(let i=0,j=deps.length;i<j;i++){
                    if(this.error)return;
                    waitingCount++;
                    let dep = deps[i];
                    loadSource(dep ,function(value,err){
                        if(err) {  me.error = err;return; }
                        else {args.push(value);}
                        if(me.error ||(--waitingCount==0 && throughout)) me._done();
                    });
                }
            }
            if(dfd.lang){
                let url :string = dfd.lang.replace("{language}",langId);
                waitingCount++;
                new Source(url,function(value,error){
                    me._lang = value;
                    if(me.error ||(--waitingCount==0 && throughout)) me._done();
                });
            }
            this.imports = args;
            throughout = true;
            if(me.error ||(--waitingCount==0 && throughout)) me._done();
            
        }
        private _done():void{
            this.value = this.defineProc.apply(this,this.imports);
            let callbacks = this._callbacks;this._callbacks = undefined;
            if(callbacks)for(let i=0,j=callbacks.length;i<j;i++){
                callbacks[i].call(this,this,this.error);
            }
            
        }

        public refresh():void{
            if(this._callbacks===null) return;
            let callbacks :Array<Function> = this._callbacks;
            this._callbacks = null;
            this.error = undefined;
            this.controllerElement = undefined;
            let me :Module = this;
            platform.getContent(this.url,function(content,error){
                if(error){platform.alert(error);return;}
                let container = document.createElement("div");
                container.innerHTML = content;
                let at:number =0;let waitingCount :number = 0;
                for(let i =0,j= container.childNodes.length;i<j;i++){
                    let depElem :HTMLElement = container.childNodes[at] as HTMLElement;
                    let tagName:string = depElem.tagName;
                    let type :string = tagName == "SCRIPT"?"js":(tagName=="LINK"?"css":null);
                    if( type ){
                        let ctrl : string = depElem.getAttribute("y-controller");
                        let url :string = depElem.getAttribute("src") || depElem.getAttribute("href");
                        if(!url){ this.controllerElement = depElem; at++; continue;}
                        let alias :string = depElem.getAttribute("y-alias");
                        
                        let isScoped:string = depElem.getAttribute("y-module-scope");
                        waitingCount++;
                        moduleManager.loadSource({
                            alias:alias,
                            url:url,
                            isScoped: isScoped,
                            isController:ctrl,
                            callback:function(elem,error){
                                if(error) {platform.alert(me.error = error);return;}
                                if(--waitingCount==0){
                                    me._done(callbacks);
                                }
                            }
                        });
                    }
                }
            });
        }
        
        dispose():void{
            for(var n in this.stylesheets){
                var stylesheet = this.stylesheets[n];
                stylesheet.dispose();
            }
        }
    }
    

    ////////////////////////////////////
    /// Model
    ///////////////////////////////////
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
        public extra:any;
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
    export class View{
        element:HTMLElement;
        model:Model;
        controller:IController;
        _bind:IBind;
        proto : View;
        constructor(controller?:IController,model?:Model,element?:HTMLElement){
            if(controller===undefined) return;
            this.element = element;
            this.model = model ||(model= new Model());
            this.controller = controller;
            this._bind = makeBind(this.model,this.element,this.controller);
            this.proto = this;
        }
        clone(controller:IController,model?:Model):View{
            let other:View =  new View();
            let proto:View = this;
            other.element = platform.cloneNode(proto.element);
            other.model = model ===undefined?proto.model.clone():model;
            other.controller = controller;
            other.proto = proto;
            other._bind = proto._bind;
            other._bind(other.model,other.element,other.controller);
            return other;
        }
        dispose():void{
            this.proto = undefined;
            this.model = undefined;
            this._bind = undefined;
            this.controller = undefined;
        }
        
    }
    export interface IBind{
        (modelOrContext:Model|BindContext,element?:HTMLElement,controller?:IController,extra?:any):void;
    }
    export function makeBind(model:Model,element:HTMLElement,controller:IController):IBind{
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
        codes = "var $self = self.$accessor;\nvar $root = self.root().$accessor;var _binders = Y.binders;\nvar _scopes=[];var attach=Y.platform.attach;var detech = Y.platform.detech;" + codes;
        return new Function("self","_element","_controller",codes) as IBind;

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
                
                uniBinder(context._element,result.model.$accessor,context._controller,attrName);
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
        constructor(modelPath:string,name:string,context:BindContext,controller:IController){
            super();
            this.name = name;
            let result:DefineResult = defineModel(modelPath,context);
            this.modelPath = result.path;
            this.binder = context._binders[name];
            this.bind = function(context:BindContext){
                context._binders[name](context._element,result.model.$accessor,controller);
            }
        }
        
        toString():string{
            return "_binders[\"" + this.name + "\"](_element,"+this.modelPath+",_controller);\n";
        }
    }

    class EachExpression extends Expression{
        modelPath:string;
        constructor(modelPath:string,context:BindContext){
            super();
            let result:DefineResult = defineModel(modelPath,context);
            this.modelPath = result.path;
            this.bind = function(context:BindContext){
                context._binders["each"](context._element,result.model.$accessor,context._controller);
            }
        }
        
        toString():string{
            return "_binders[\"each\"](_element,"+this.modelPath+",_controller);\n";
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
                platform.attach(context._element,this.evtName,function(evt){context._controller[actionName].call(context._controller,evt||window.event,this);}); 
                
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
            tryBuildLabel(elementValue,element,context,exprs,"value");
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
        if(eachAttr){
            var eachExpr:EachExpression= new EachExpression(eachAttr,context);
            eachExpr.bind(context);
            exprs.push(eachExpr);
            return;
        }
        var children = element.childNodes;
        if(scopeAttr){
            let scopeBegin :ScopeBeginExpression = new ScopeBeginExpression(scopeAttr,context);
            scopeBegin.bind(context);
            exprs.push(scopeBegin);
        }
        
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
        if(scopeAttr){
            let lastExpr :Expression = exprs.pop();
            if(!(lastExpr instanceof ScopeBeginExpression)) {
                exprs.push(lastExpr);
                let scopeEnd:ScopeEndExpression = new ScopeEndExpression();
                scopeEnd.bind(context);
                exprs.push(scopeEnd);
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
            let expr :BindExpression = new BindExpression(path,"bibound." + bindname,context,context._controller);
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
    export interface IBinder{
        (element:HTMLElement,accessor:IModelAccessor,controller:IController,extra?:any):Function;
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
	        platform.attach(element, "keydown", evtHandler);
	        platform.attach(element, "keyup", evtHandler);
	        platform.attach(element, "blur", evtHandler);
			var handler = function (sender:IModel,evt:ModelEvent) { 
                (element as HTMLInputElement).value = evt.value; 
                evt.extra = element;
            };
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
	        platform.attach(element, "change", evtHandler);
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
			var handler = function (sender,evt) {
	            setValue((element as HTMLInputElement), evt.value);
                evt.extra = element;
	        }
	        platform.attach(element, "change", evtHandler);
	        platform.attach(element, "blur", evtHandler);
	        platform.attach(element, "click", evtHandler);
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
                evt.extra = element;
	            setValue(element, value);
	        };
	        platform.attach(element, "change", evtHandler);
	        platform.attach(element, "blur", evtHandler);
	        platform.attach(element, "click", evtHandler);
	        accessor.subscribe(handler);
	        (element as HTMLInputElement).checked = false;
            element.removeAttribute("checked");
			return function(){accessor.unsubscribe(handler);}
	    }
    };
    let uniBinder :IBinder =binders["unibound"]= function(element:HTMLElement, accessor:IModelAccessor,controller:IController,extra?:any):Function{
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

    class EachItemBindInfo{
        constructor(view:HTMLElement , bind:IBind){
            this.view = view;
            this.bind = bind;
        }
        view:HTMLElement;
        bind:IBind;
    }

    let eachBinder:IBinder = binders["each"] = function (element:HTMLElement, accessor:IModelAccessor,extra?:any) {
            let controller:IController = extra as IController;
            let model :Model = accessor.$model;
            let eachId:string = element.getAttribute("y-each-view-id");
            let itemViewProto:IView;
            if(eachId){
                itemViewProto = controller.module.views[eachId];
            }else{
                eachId = seed().toString();
                element.setAttribute("y-each-bind-id",eachId);
                var elemProto:HTMLElement = platform.cloneNode(element);
                let modelProto : Model = model.itemProto().$model;
                let bind :IBind = makeBind(modelProto,element,controller);
                itemViewProto = new View(controller,modelProto,elemProto);
                controller.module.views[eachId] = itemViewProto;
            }
	        
	        
            
            let addItemToView = function(item:Model,anchorElement:HTMLElement):void{
                let itemView:IView = itemViewProto.clone(controller,item);
                let elem :HTMLElement = itemView.element;
                if(anchorElement==null) {
                    for(let i=0,j=elem.childNodes.length;i<j;i++){
                        element.appendChild(elem.childNodes[i]);
                    }
                }else{
                    for(let i=0,j=elem.childNodes.length;i<j;i++){
                        element.insertBefore(elem.firstChild,anchorElement);
                    }

                }
            }    
	        
			var handler = function (sender,evt:ModelEvent) {
                if(evt.action == ModelActions.change){
                    element.innerHTML="";
                    for(let i=0,j=evt.value.length;i<j;i++){
                        let item :Model = model.getItem(i,true);
                        addItemToView(item,null);
                    }
                    return;
                }
                if(evt.action== ModelActions.clear){
                    element.innerHTML = "";
                    return;
                }
                if(evt.action != ModelActions.child){
                    return;
                }
                let ievt = evt.directSource;
                let elemProto = itemViewProto.element;
	            switch (ievt.action) {
                    case ModelActions.add:
                        let anchorElement:HTMLElement = null;
                        if(evt.index*elemProto.childNodes.length<=element.childNodes.length-1)anchorElement = element.childNodes[evt.index] as HTMLElement;
                        addItemToView(model.getItem(evt.index,true),anchorElement);
                        break;
                    case ModelActions.remove:
                        let at :number = evt.index*elemProto.childNodes.length;
                        for(let i=0,j=elemProto.childNodes.length;i<j;i++){
                            let ch:Node = element.childNodes[at];
                            if(ch==null) break;
                            element.removeChild(ch);
                        }
                        break;
	                case ModelActions.clear:
                        element.innerHTML="";
                        break;
	            }
	        }
			model.subscribe(handler);
            

			element.innerHTML = "";
			return function () {
			    //TODO : 应该要重新构建，而不是清空
			    model["@model.props"] = {};
			    model.unsubscribe(handler);
			}
	    }
    
    let o2Str:Function = Object.prototype.toString;


    
    let _seed = 0;
    export function seed():number{
        return (_seed==2100000000)?_seed=0:_seed++; 
    }
    
}
