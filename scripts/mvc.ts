export namespace Y {
    "use strict";
    
    
    ////////////////////////////////////
    /// export interfaces
    ////////////////////////////////////
   
    
    

    

    export interface IView{
        element :HTMLElement;
        model:IModel;
        clone(controller?:IController,model?:IModel,element?:HTMLElement):IView;
    }

    export interface IController{
        view:IView;
        model:IModelAccessor;
        _TEXT:ILabel;
        views:{[index:string]:IView};
        creator:IController;
        module:Module;
        data:{[index:string]:any};
        init(model:IModelAccessor,view:IView):void;
        dispose():void;

    }

    
    export interface ILabel{
         (key:string):string;
    }

    ////////////////////////////////////
    /// 通用机制
    ///////////////////////////////////
    export let NONE = {toString:function(){return "{object y-none}";}};
    export let BREAK = {toString:function(){return "{object y-break}";}};
    export let USEAPPLY ={toString:function(){return "{object y-useApply}";}};
    export let debugMode :boolean = true;
    export let trimRegex = /(?:^\s+)|(?:\s+$)/i;
    //观察者模式基类
    export interface IObservable{
        subscribe(event:string|Function,handler?:Function):IObservable;
         unsubscribe(event:string|Function,handler?:Function):IObservable;
    }
    export class Observable implements IObservable{
        private __y_observable_subscriberset?:{[index:string]:Function[]};
        private __y_observable_default_subscribers:Function[];
        public subscribe(event:string|Function,handler?:Function):Observable{
            let subscribers : Function[];
            if(handler===undefined){
                handler = event as Function;
                subscribers = this.__y_observable_default_subscribers || (this.__y_observable_default_subscribers=[]);
            }else {
                let sets = this.__y_observable_subscriberset || (this.__y_observable_subscriberset={});
                subscribers = sets[event as string] || (sets[event as string]=[]);
            }
            subscribers.push(handler);
            return this;
        }
        public unsubscribe(event:string|Function,handler?:Function):Observable{
            let subscribers : Function[];
            if(handler===undefined){
                handler = event as Function;
                subscribers = this.__y_observable_default_subscribers ;
            }else {
                subscribers = this.__y_observable_subscriberset?this.__y_observable_subscriberset[event as string]:null;
            }
            if(!subscribers) return this;
            for(let i =0,j=subscribers.length;i<j;i++){
                let exist:Function = subscribers.shift();
                if(exist!==handler) subscribers.push(exist);
            }
            return this;
        }
        public notify(event:any,args?:any):Observable{
            let subscribers : Function[];
            if(args===undefined){
                args = event as Function;
                subscribers = this.__y_observable_default_subscribers ;
            }else {
                subscribers = this.__y_observable_subscriberset?this.__y_observable_subscriberset[event as string]:null;
            }
            if(!subscribers) return this;
            let isArr = isArray(args);
            for(let i =0,j=subscribers.length;i<j;i++){
                if(subscribers[i].call(this,args) ===BREAK) break;
            }
            return this;
        }
        public applyNotify(event:any,args?:any):Observable{
            let subscribers : Function[];
            if(args===undefined){
                args = event as Function;
                subscribers = this.__y_observable_default_subscribers ;
            }else {
                subscribers = this.__y_observable_subscriberset?this.__y_observable_subscriberset[event as string]:null;
            }
            if(!subscribers) return this;
            let isArr = isArray(args);
            for(let i =0,j=subscribers.length;i<j;i++){
                if(subscribers[i].apply(this,args) === BREAK) break;
            }
            return this;
        }
    }
   
    export class PromiseResult{
        public constructor(fullfilled?:boolean,value?:any,args?:any){
            if(this.useApply = args === USEAPPLY){
                this.args= value;
                this.value = value[0];
            }else{
                this.value = value;this.args = args;
            }
            
            this.isFullfilled = fullfilled;
            
        }
        value:any;
        args?:any;
        isFullfilled:boolean;
        useApply:boolean;
        isRejected(me?:any,reject?:Function):boolean{
            if(!this.isFullfilled){
                if(reject){
                    if(this.useApply) reject.apply(me,this.args);
                    else reject.call(me,this.value,this.args);
                }
                return true;
            }
            return false;
        }
        isResolved(me?:any,resolve?:Function):boolean{
            if(this.isFullfilled){
                if(resolve){
                    if(this.useApply) resolve.apply(me,this.args);
                    else resolve.call(me,this.value,this.args);
                }
                
                return true;
            }
            return false;
        }
    }
    export interface IThenable{
        then(resolve:Function,reject?:Function,ck?:boolean):IThenable;
    }
    
    
    export class Promise implements IThenable{
        __y_promise_resolves?: Function[];
        __y_promise_rejects?: Function[];
        __y_promise_result?:PromiseResult;
        resolve?:Function;
        reject?:Function;

        constructor(statement?:any,param?:any){
            let me :Promise = this;
            let resolve = function(value?:any,value1?:any):void{
                
                if(value===me) {
                    let ex = new TypeError("cannot use self promise as fullfilled value.");
                    logger.warn(ex,"y/Promise.resolve");
                }
                let vt = typeof value;
                if(vt==="function"){
                    try{
                        (value as Function).call(me,resolve,reject,param);
                    }catch(ex){
                        logger.error(ex,"y/Module.resolve");
                        this.__y_promise_fullfill(false,ex);
                    }
                }else if(vt==="object" && (<IThenable>value).then) {
                    
                    (<IThenable>value).then(
                        function(v1,v2){arguments.length<=2?me.__y_promise_fullfill(true,v1,v2): me.__y_promise_fullfill(true,toArray(arguments),USEAPPLY);}
                        ,function(v1,v2){arguments.length<=2?me.__y_promise_fullfill(false,v1,v2): me.__y_promise_fullfill(false,toArray(arguments),USEAPPLY);}
                    );
                }else {
                    arguments.length<=2?me.__y_promise_fullfill(true,value,value1): me.__y_promise_fullfill(true,toArray(arguments),USEAPPLY);
                }
            };
            let reject = function(v1,v2){arguments.length<=2?me.__y_promise_fullfill(false,v1,v2): me.__y_promise_fullfill(false,toArray(arguments),USEAPPLY);}
            if(typeof statement!=="function"){
                resolve.call(this,statement);
            }
            if(statement===undefined){
                this.resolve = resolve;
                this.reject = reject;
            }else{
                if(typeof statement==="function"){
                    try{
                        statement.call(me,resolve,reject,param);
                    }catch(ex){
                        logger.error(ex,"y/Promise.constructor");
                        me.__y_promise_fullfill( false,ex);
                    }
                }else{
                    resolve.call(this,statement===NONE?undefined:statement);
                }
            }
        }
        private __y_promise_fullfill(isFullfilled:boolean|PromiseResult,value?:any,value1?:any):void{
            if(typeof isFullfilled !=="boolean") {
                this.__y_promise_result = isFullfilled as PromiseResult;
                return;
            }
            let handlers :Function[] = isFullfilled ? this.__y_promise_resolves : this.__y_promise_rejects;
            let result:PromiseResult = this.__y_promise_result = new PromiseResult(isFullfilled as boolean,value,value1);
            this.__y_promise_rejects = undefined;
            this.__y_promise_resolves = undefined;
            this.resolve = this.reject = undefined;
            if(handlers){
                platform.async(()=>{
                    if(result.useApply)for(let i =0,j=handlers.length;i<j;i++) handlers[i].apply(this,result.args);
                    else for(let i =0,j=handlers.length;i<j;i++) handlers[i].call(this,result.value,result.args);
                });
            }
            
        }
        then(resolve:boolean|Function,reject?:boolean|Function,ck?:boolean):IThenable{
            if(resolve===true|| resolve===false) return this.fail(<Function>reject,resolve as boolean);
            if(reject===true|| reject ===false) return this.done(<Function>resolve,reject as boolean);
            return this.done(<Function>resolve,ck).fail(<Function>reject,ck);
        }
        done(handle:Function,ck?:boolean):Promise{
            if(typeof handle!=="function") return this;
            let result :PromiseResult = this.__y_promise_result;
            if(result){
                 result.isResolved(this,handle);
            }else{
                let handlers = this.__y_promise_resolves||(this.__y_promise_resolves=[]);
                if(!ck || handlers.length==0)
                    handlers.push(handle);
                else {
                    for(let i=0,j=handlers.length;i<j;i++) if(handlers[i]===handle)return;
                    handlers.push(handle);
                }
            }
            return this;
        }
        fail(handle:Function,ck?:boolean):Promise{
            if(typeof handle !=="function") return this;
            let result :PromiseResult = this.__y_promise_result;
            if(result){
                result.isRejected(this,handle);
            }else{
                let handlers = this.__y_promise_rejects||(this.__y_promise_rejects=[]);
                if(!ck || handlers.length==0)
                    handlers.push(handle);
                else {
                    for(let i=0,j=handlers.length;i<j;i++) if(handlers[i]===handle)return;
                    handlers.push(handle);
                }
            }
            return this;
        }
        complete(handle:Function,ck?:boolean):Promise{
            if(typeof handle !=="function") return this;
            let callback = ()=>handle.call(this,this.__y_promise_result);
            return this.then(callback,callback,ck) as Promise;
        }
        promise(promise:Function):Promise{
            let result:Promise = new Promise();
            let {resolve,reject}   = result;
            result.resolve = result.reject = undefined;
            this.then(
                function(){ platform.async(()=> promise.call(result,resolve,reject,(<Promise>this).__y_promise_result));}
                ,function(){ result.__y_promise_fullfill((<Promise>this).__y_promise_result);}
            );
            return result;
            
        }
        
        //Usage:
        //1 when([m1,m2],(m)=>new Promise(m)) 第一个参数是数组
        // 2 when(promise1,promiseFun2,IThenable)
        static when(deps,promiseMaker?:any,arg2?:any,arg3?:any,arg4?:any,arg5?:any):Promise{   
            if(isArray(deps)){
                //处理第一种用法
                return new Promise((resolve,reject)=>{
                    //let [deps,promiseMaker] = args;
                    let result=[];
                    let taskCount =deps.length;
                    let hasError :any;
                    for(let i =0,j=taskCount;i<j;i++){
                        let dep = deps[i];
                        if(typeof dep==="function") dep = new Promise(dep);
                        else if(!dep || !(<Promise>dep).then) {
                            if(!promiseMaker) throw new Error("promise make located at arguments[1] is required.");
                            dep = promiseMaker(dep);
                        }
                        if(!dep) throw new Error("Cannot make " + deps[i] + " as Promise.");
                        (dep as Promise).then((value)=>{
                            if(hasError) return;
                            result[i] = value;
                            if(--taskCount==0) resolve(result);
                        },(err)=>{
                            hasError = err;
                            reject(err);
                        });
                    }
                });
            }else {
                return Promise.when(toArray(arguments));
            }
        }
        static readonly placehold :Promise = new Promise(NONE);
        
    }  
    export enum LogLevels{
        error,
        warning,
        notice,
        info,
        debug
    }

    export interface ILogger{
        error(message:any,path?:string):any;
        warn(message:any,path?:string):any;
        notice(message:any,path?:string):any;
        info(message:any,path?:string):any;
        debug(message:any,path?:string):any;
    }
    export class Log{
        constructor(message,path:string="",lv:LogLevels=LogLevels.info){
            this.path = path;
            this.level = lv;
            this.time = new Date();
            if(debugMode) {
                if(message instanceof Error){
                    let err :Error = message as Error;
                    if(!err.stack){
                        try{
                            throw err;
                        }catch(ex){
                            message = ex;
                        }
                    }
                }
            }
            this.message = message;
        }
        level?:LogLevels|string;
        message:any;
        path?:string;
        time:Date;
        toString(){
            let lv = this.level===undefined?LogLevels[LogLevels.info]:(typeof this.level ==="string"?this.level:LogLevels[this.level]);
            return "["+lv + ":"+(this.path||"")+"]" + this.message;
        }

        static error(message:any,path:string):any{
            console.error(new Log(message,path,LogLevels.error));
        }
        static warn(message:any,path?:string):any{
            
            console.warn(new Log(message,path,LogLevels.warning));
        }
        static notice(message:any,path?:string):any{
            console.log(new Log(message,path,LogLevels.notice));
        }
        static info(message:any,path?:string):any{
            console.info(new Log(message,path,LogLevels.info));
        }
        static debug(message:any,path?:string):any{
            if(debugMode)console.debug(new Log(message,path,LogLevels.debug));
        }
    } 
    
    export let logger :ILogger = {
        error:Log.error,
        warn:Log.warn,
        notice:Log.notice,
        info:Log.info,
        debug:Log.debug
    };
    
    
    ////////////////////////////////////
    /// 平台抽象
    ///////////////////////////////////
   

    let tagContainers:{[index:string]:HTMLElement};
	
    export class Platform {
        attach(elem:EventTarget,evtName:string,evtHandler:Function):void{}
        //解除事件
        detech(elem:EventTarget,evtName:string,evtHandler:Function):void{}
        async(handler:(...args:any[])=>any):number{return 0;}
        
        constructor(){
            this.attach = window["attachEvent"] ? function (elem, evtname, fn) { (elem as any).attachEvent("on" + evtname, fn); } : function (elem, evtname, fn) { elem.addEventListener(evtname, fn as EventListenerOrEventListenerObject, false); };
	        this.detech = window["detechEvent"] ? function (elem,evtname,  fn) { (elem as any).detechEvent("on" + evtname, fn); } : function (elem, evtname, fn) { elem.removeEventListener(evtname, fn as EventListenerOrEventListenerObject, false); }
            this.async = window["setImmediate"]?(handler:(...args:any[])=>any):number=>{return setImmediate(handler);} :(handler:(...args:any[])=>any):number=>{return setTimeout(handler,0);}
        }
        
        cloneNode(elem:HTMLElement):HTMLElement{
            let tag = elem.tagName;
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
            let ctn = tagContainers[tag] || tagContainers[""];
            let html = elem.outerHTML + "";
            ctn.innerHTML = html;
	        return ctn.firstChild as HTMLElement;
        }
        createElement(tagName:string):HTMLElement {
            return document.createElement(tagName);
        }
        getElement(selector:any,context?:any):HTMLElement{
            if(typeof selector ==="string"){
                let cssText = selector as string;
                let firstChar = cssText[0];
                if(firstChar==="#") return document.getElementById(cssText.substr(1));
                if(firstChar===".") {
                    context || (context = document);
                    let rs = (context as HTMLElement).getElementsByClassName(cssText.substr(1));
                    if(rs!==null && rs.length) return rs[0] as HTMLElement;
                }else {
                    context || (context = document);
                    let rs = (context as HTMLElement).getElementsByTagName(cssText);
                    if(rs!==null && rs.length) return rs[0] as HTMLElement;
                }
            }else return selector;
        }
        //获取内容
        getStatic(url:string):Promise{
            return this.ajax({
                url:url,
                method:"GET"
            });
        }
        ajax(opts:any):Promise {
            return new Promise((resolve,reject)=>{
                let http:any=null;
                if(window["XMLHttpRequest"]){  
                    http=new XMLHttpRequest();  
                    if(http.overrideMimeType) http.overrideMimeType("text/xml");
                }else if(window["ActiveXObject"]){  
                    let activeName=["MSXML2.XMLHTTP","Microsoft.XMLHTTP"];  
                    for(let i=0;i<activeName.length;i++) try{http=new ActiveXObject(activeName[i]); break;}catch(e){}
                }
                if(http==null)  throw "Cannot create XmlHttpRequest Object";
                
                let url = opts.url;
                if(!url) throw "require url";
                let method = opts.method ? opts.method.toUpperCase():"GET";

                let data = opts.data;
                if(typeof data==='object'){
                    let content = "";
                    for(let n in data){
                        content += encodeURIComponent(n) + "=" + encodeURIComponent(data[n]) + "&";
                    }
                    data = content;
                }

                if(method=="POST"){  
                    http.setRequestHeader("Content-type","application/x-www-four-urlencoded");  
                } else if(method=="GET"){
                    if(url.indexOf("?")) {if(data) url +="&" + data;}
                    else if(data) url += "?" + data;
                    data = null;
                }
                let headers = opts.headers;
                if(headers) for(let n in headers) http.setRequestHeader(n,headers[n]);  
                let httpRequest:XMLHttpRequest = http as XMLHttpRequest; 
                httpRequest.onreadystatechange = ()=>{
                    if(httpRequest.readyState==4){
                        let result;
                        if(opts.dataType=="json"){ result = JSON.parse(httpRequest.responseText);}
                        else if(opts.dataType=="xml"){result = httpRequest.responseXML;}
                        else result = httpRequest.responseText;
                        resolve(result,http);
                    }
                };
                httpRequest.onerror = (err)=>{
                    logger.error(err,"y/ajax");
                    reject(err,httpRequest);
                };
                
                httpRequest.open(method,url,true);
                httpRequest.send(data);
            });
        }//end ajax

    }

    

    export let platform:Platform= new Platform();
    let o2Str:Function = Object.prototype.toString;
    export function isArray(o:any){
        if(!o)return false;
        return o2Str.call(o) == "[object Array]";
    }
    let aslice :Function = Array.prototype.slice;
    export function toArray(o:any):any[]{
        if(!o) return [];
        return aslice.call(o);
    }
    export function toJsonString(text:string){
        return text?text.replace(/\\/,"\\\\").replace(/\n/i,"\\n").replace(/\r/i,"\\r").replace(/"/i,"\\\""):"";
    }
    export function trim(text:string){
        return text?text.replace(trimRegex,""):text;
    }
    
    

    
    ////////////////////////////////////
    /// 多语言化
    ////////////////////////////////////
    let langId:string;
    export function language(lng:string):void{
        if(langId===lng) return;
    }
    ////////////////////////////////////
    //Uri
    ////////////////////////////////////
    export class Uri {
        orignal:string;
        protocol:string;
        domain:string;
        port:number;
        absolute:string;
        host:string;
        path :string;
        file:string;
        dir:string;
        location:string;
        querystring:string;
        query:{[index:string]:string};
        relative:string|Uri;
        hash:string;
        static patten:RegExp = /^(?:([a-zA-Z][a-zA-Z0-9]*):\/\/)([^\:\/\.]+(?:\.[^\:\/\.]+)*)(?:\:(\d{2,5}))?((?:\/[^\/\?#]*)*)/i
        clone(target?:any){
            target || (target=new Uri());
            for(let n in this) target[n] = this[n];
        }
        constructor(urlOrPath?:string,relative?:string|Uri){
            if(!urlOrPath)return;
            this.orignal = urlOrPath;
            this.relative = relative;
            urlOrPath = this._parseQueryAndHash(urlOrPath);
            let basPath;
            let relativePath;
            let matches :any[]= urlOrPath.match(Uri.patten);
            //urlOrpath 是个绝对地址，它的路径就是绝对地址的路径,拼接路径
            if(matches!=null) {
                relativePath = "";
                basPath = matches[4];
            }else{
                if(relative){
                    if(relative instanceof Uri){
                        matches =[null,(<Uri>relative).protocol,(<Uri>relative).domain,(<Uri>relative).port,(<Uri>relative).path];
                    }else matches = (<string>relative).match(Uri.patten);
                    //相对url是个绝对地址
                    if(matches){
                        relativePath = urlOrPath;
                        basPath = (relativePath[0]=="/")?"":matches[4];
                    }else{
                        relativePath = urlOrPath;
                        basPath = (relativePath[0]=="/")?"":relative;
                    } 
                } else {
                    relativePath = urlOrPath;
                    basPath = Uri.current.path;
                }
            }            
           
            if(matches){
                this.protocol = matches[1];
                this.domain = matches[2];
                this.port = parseInt(matches[3]);
                this.host = "";
                if(this.protocol) this.host = this.protocol + "://";
                if(this.domain) this.host += this.domain;
                if(this.port) this.host += ":" + this.port;
            }

            let paths = (basPath +"/" +relativePath).split("/");
            let rs =[];
            for(let i =0,j=paths.length;i<j;i++){
                let ps = paths[i];
                if(!ps) continue;
                if(ps===".") continue;
                if(ps==="..") {rs.pop();continue;}
                rs.push(ps);
            }
            this._makeAbsolute(rs);
        }
        toString():string {return this.absolute;}

        private _makeAbsolute(rels:string[]){
            this.file = rels.pop();
            this.dir = rels.join("/");
            if(this.file)rels.push(this.file);
            this.path = "/" + rels.join("/");

            this.location = this.absolute = (this.host || Uri.current.host) + this.path;
            if(this.querystring) this.absolute += "?" + this.querystring;
            if(this.hash) this.absolute +="#" + this.hash;
        }
        private _parseQueryAndHash(str:string){
            if(!str){this.query ={};return "";}
            let at = str.indexOf("?");
            let path:string;
            let querystring :string;
            let hashpart :string;
            if(at>=0) {
                hashpart = querystring = str.substr(at+1);
                path = str.substr(0,at);
            }else hashpart = str;

            at = hashpart.indexOf("#");
            if(at>=0) {
                this.hash = hashpart.substr(at+1);
                if(querystring) querystring =  hashpart.substr(0,at);
                if(!path) path = hashpart.substr(0,at);
            }else path = hashpart;
            this.query = Uri.parseQueryString(this.querystring =querystring);
            return path;
        }
        
        static parseQueryString(querystr:string,extra?:any):{[index:string]:string}{
            let result:{[index:string]:string}={};
            if(!querystr)return result;
            let sets = querystr.split('&');
            for(let i =0,j=sets.length;i<j;i++){
                let set:string = sets[i];
                let [key,value] = set.split('=');
                result[key] = value;
                if(extra) extra[key]=value;
            }
            return <{[index:string]:string}>result;
        }
        static readonly current:Uri = new Uri(location.href);
    }

    ////////////////////////////////////
    /// 模块化
    ////////////////////////////////////
   
    class ControlOpts{
        template:HTMLElement;
        define:Function|string;
    }
    class ModuleParameter{
        activate:(module:Module)=>void;
        disposing:(module:Module)=>void;
    }
    export enum ModuleTypes{
        none,
        script,
        css,
        json,
        text,
        image,
        page
    }
    export class ModuleOpts{
        alias?:string;
        type?:ModuleTypes;
        url?:string;
        value?:any;
        expiry?:number|Date;
        element?:HTMLElement;
        shares?:Array<string|ModuleOpts>;
        scopes?:Array<string|ModuleOpts>;
        imports?:Array<string|ModuleOpts>;
        lang?:string;
        inScope?:boolean;
        data?:{[index:string]:any};
        define?:Function|string;
    }
    export class Module extends Promise {
        //资源的唯一编号
        alias?:string;
        uri?:Uri;
        //load返回的值
        value:any;
        //资源类型
        type:ModuleTypes;
        //资源上的数据
        data:{[index:string]:any};
        expiry:number|Date;
        //引用计数
        ref_count:number;
        element?:HTMLElement;
        texts?:{[index:string]:string};
        scopes:any;
        shares:any;
        imports:Array<any>;
        _disposing:Array<Function>;
        error:any;
        activeTime:Date;
        container?:Module;
        private _path?:string;
       
        public constructor(opts:ModuleOpts,container?:Module){
            super();
            let me :Module = this;
            this.container = container;
            this.alias = opts.alias|| opts.url;
            if(opts.url){
                this.uri = new Uri(opts.url,(container&& container.uri)?container.uri:null);
            }
            this.ref_count = 0;
            this._disposing = [];
            this.data = opts.data || {};
            this.type = opts.type || Module.getResType(opts.url) || ModuleTypes.none;
            this.expiry = opts.expiry;
            this.activeTime = new Date();
            this.element = opts.element;
            this.value = opts.value;
            if(this.type === ModuleTypes.none){
                this.resolve();
                return;
            }
            if(this.value!==undefined || this.value ===NONE){
                this.resolve(this.value);return;
            }
            if(opts.expiry!=-1){
                if(!Module.clearTimer)Module.clearTimer = setInterval(Module.clearExpired,Module.clearInterval || 60000);
            }
            let {resolve,reject} = this;
            this.reject = this.reject = undefined;
            if(this.uri){
                Module.loadRes(this.uri.absolute,this.type).then((newOpts)=>{
                    this._combineModuleOpts(opts,newOpts);
                    this._init(opts,resolve,reject);
                },(err)=>reject(err));
            }else{
                this._init(opts,resolve,reject);
            }
            
        }

        public static getResType(url:string):ModuleTypes{
            if(!url)return;
            if(/.js$/i.test(url))return ModuleTypes.script;
            if(/.css$/i.test(url)) return ModuleTypes.css;
            if(/.json$/i.test(url)) return ModuleTypes.json;
            if(/(?:.html$)|(?:.htm$)/i.test(url)) return ModuleTypes.page;
            if(/(?:.jpg$)|(?:.png$)|(?:.bmp$)|(?:.gif$)/i.test(url)) return ModuleTypes.image;
            return undefined;
        }
         
        

        private _combineModuleOpts(dest:ModuleOpts,src?:ModuleOpts):ModuleOpts{
            if(!src){return dest;}
            dest.expiry = dest.expiry;
            dest.define = src.define;
            dest.lang = src.lang;
            dest.data = src.data;
            let _deps :Array<ModuleOpts|string> = src.shares;
            if(_deps){
                if(!dest.shares) dest.shares = [];
                for(let i=0,j=_deps.length;i<j;i++){
                    dest.shares.push(_deps[i]);
                }
            }
            _deps = src.scopes;
            if(_deps){
                if(!dest.scopes) dest.scopes = [];
                for(let i=0,j=_deps.length;i<j;i++){
                    dest.scopes.push(_deps[i]);
                }
            }
            if(src.imports)dest.imports = src.imports;
            dest.element = src.element;
            return dest;
        } 
        private _init(opts:ModuleOpts,resolve:Function,reject:Function){
            let me :Module = this;
            this.element = opts.element;
            let langUrl = opts.lang?opts.lang.replace("{language}",langId):null;
            let defineUrl = typeof opts.define=="string"?opts.define:null;
            let add_ref :(deps:Module[])=>void = (deps:Module[]):void=>{
                if(!deps)return;
                for(let i=0,j=deps.length;i<j;i++){
                    let dep = deps[i];
                    if(dep){
                        dep.ref_count++;
                    }
                }
            };
            let tasks = [];
            
            
            Promise.when(
                langUrl?this.load(langUrl):Promise.placehold,
                defineUrl?this.load(defineUrl):Promise.placehold,
                opts.imports?this.loadMany(opts.imports):Promise.placehold,
                opts.scopes?this.loadMany(opts.scopes):Promise.placehold,
                opts.shares?this.loadMany(opts.shares):Promise.placehold
            ).done((result)=>{
                let [langPack,define,imports,scopes,globals] = result;
                add_ref(this.shares= globals);
                add_ref(this.scopes = scopes);
                add_ref(this.imports = imports);
               
                this._finish(this.value,resolve);
            }).fail((err)=>{
                reject(err);
            }); 
        }
        
        private _finish(success:any,resolve:Function):void{
            //this.value = success;
            
            //if(this.define && this.error===undefined)this.value = this.define.apply(this,this.imports);               
            
            
        }
        public disposing(handler:Function):Module{
            if(this._disposing){
                this._disposing.push(handler);
            }else throw "disposed";
            return this;
        }

        public dispose():void{
            if(this._disposing===undefined)return;
            let release_ref :(deps:Module[],expireTime:number)=>void=(deps:Module[],expireTime:number):void=>{
                if(!deps)return;
                for(let i=0,j=deps.length;i<j;i++){
                    let dep = deps[i];
                    if(dep){
                        if(--dep.ref_count==0 && dep.expiry && dep.activeTime.valueOf()<expireTime){
                            if(dep.alias) delete Module.cache[dep.alias];
                            if(dep.uri) delete Module.cache[dep.uri.absolute];
                        }
                    }
                }
            };
            let expireTime :number = (new Date()).valueOf() - Module.aliveMilliseconds|| 300000;
            release_ref(this.scopes,expireTime);
            release_ref(this.imports,expireTime);
            release_ref(this.shares,expireTime);
            this.scopes = this.imports = this.shares = undefined;
            if(this.value && this.value.dispose){
                this.value.dispose();
            }
            for(let n in this._disposing){
                let fn = this._disposing[n];
                fn.call(this);
            }
        }
        public static clearTimer:number;
        public static clearInterval:number = 60000;
        public static aliveMilliseconds :number = 300000;
        public static cache:{[index:string]:Module} = {};
        public static exports :any;
        
        public static loaders :{[index:string]:(url:string)=>Promise}={
            "script":(url:string):Promise=>{
                return new Promise((resolve,reject)=>{
                    let elem:HTMLScriptElement = document.createElement("script") as HTMLScriptElement;
                    elem.src = url;
                    elem.type = "text/javascript";
                    let getExports = ():any=>{
                        let exports :any = Module.exports;
                        if(exports===NONE)return undefined;
                        Module.exports = NONE;
                        return exports;
                    };
                    if(elem["onreadystatechange"]!==undefined){
                        (elem as any).onreadystatechange = function(){
                            if((elem as any).readyState==4 || (elem as any).readyState=="complete"){
                                resolve({value:getExports(),element:elem});
                            }
                        }
                    }else elem.onload = function(){
                        resolve({value:getExports(),element:elem,url:url,type:ModuleTypes.script});
                    }
                    elem.onerror = function(ex){
                        logger.error(ex,"y/module.loadRes");
                        reject(ex,elem);
                    }
                    Module.getDocumentHead().appendChild(elem);
                });
                
            },
            "css":(url:string):Promise=>{
                return new Promise(function(resolve,reject){
                    let elem:HTMLLinkElement = document.createElement("link") as HTMLLinkElement;
                    elem.href = url;
                    elem.type = "text/css";
                    elem.rel = "stylesheet";
                    let getExports = ():any=>{
                        return document.styleSheets[document.styleSheets.length-1];
                    };
                    if(elem["onreadystatechange"]!==undefined){
                        (elem as any).onreadystatechange = function(){
                            if((elem as any).readyState==4 || (elem as any).readyState=="complete"){
                                resolve({value:getExports(),element:elem,url:url,type:ModuleTypes.css});
                            }
                        }
                    }else elem.onload = function(){
                        resolve({value:getExports(),element:elem,url:url});
                    }
                    elem.onerror = function(ex){
                        logger.error(ex,"y/module.loadRes");
                        reject(ex,elem);
                    }
                
                    Module.getDocumentHead().appendChild(elem);
                });
                
            },
            "json":(url:string):Promise=>{
                return new Promise((resolve,reject)=>{
                    platform.getStatic(url).done((text)=>{
                        try{
                            let json = JSON.parse(text);
                            resolve({value:json,url:url,type:ModuleTypes.json});
                        }catch(ex){
                            reject(ex);
                        }
                    }).fail(reject);
                });
            },
            "text":(url:string):Promise=>{
                return new Promise((resolve,reject)=>{
                    platform.getStatic(url).done((text)=>{
                        resolve({value:text,url:url,type:ModuleTypes.text});
                    }).fail(reject);
                });
                
            },
            "page":(url:string):Promise=>{
                return new Promise((resolve,reject)=>{
                    platform.getStatic(url).done((html)=>{
                        let elem = document.createElement("div");
                        html = html.replace("<!DOCTYPE html>","")
                                .replace(/<html\s/i,"<div ")
                                .replace(/<\/html>/i,"<div ")
                                .replace(/<head\s/i,"<div class='y-head' ")
                                .replace(/<\/head>/i,"</div>")
                                .replace(/<body\s/i,"<div class='y-body' ")
                                .replace(/<\/body>/i,"</div>");

                        elem.innerHTML = html;
                        let shares :Array<ModuleOpts>=[];
                        let scopes :Array<ModuleOpts>=[];
                        let scripts:any[] = toArray(elem.getElementsByTagName("script"));
                        let defineScript :HTMLScriptElement;
                        for(let i =0,j=scripts.length;i<j;i++){
                            let script:HTMLScriptElement = scripts[i] as HTMLScriptElement;
                            let url:string = script.getAttribute("src");
                            let defineAttr = script.getAttribute("y-module-define");
                            if(defineAttr!==undefined){
                                defineScript = script;
                                defineScript.parentNode.removeChild(defineScript);
                            }
                            if(!url) continue;
                            let alias:string = script.getAttribute("y-alias");
                            
                            let scriptOpts :ModuleOpts = {
                                url:url,
                                alias:alias || url,
                                type:ModuleTypes.script,
                            };
                            let isScope = script.getAttribute("y-module-scope");
                            let isGlobal = script.getAttribute("y-module-global");
                            if(isGlobal!==null && isGlobal!==undefined)scriptOpts.expiry = -1;
                            (isScope!==null&&isScope!==undefined?scopes:shares).push(scriptOpts);
                            script.parentNode.removeChild(script);
                        }
                        let links:any[] = toArray(elem.getElementsByTagName("link"));
                        for(let i =0,j=links.length;i<j;i++){
                            let link:HTMLLinkElement = links[i] as HTMLLinkElement;
                            let url:string = link.getAttribute("href");
                            if(!url) continue;
                            let alias:string = link.getAttribute("y-alias");
                            
                            let cssOpts :ModuleOpts = {
                                url:url,
                                alias:alias || url,
                                type:ModuleTypes.css
                            };
                            let isScope = link.getAttribute("y-module-scope");
                            let isGlobal = link.getAttribute("y-module-global");
                            if(isGlobal!==null && isGlobal!==undefined)cssOpts.expiry = -1;
                            (isScope!==null&&isScope!==undefined?scopes:shares).push(cssOpts);
                            link.parentNode.removeChild(link);
                        }
                        let moOpts:ModuleOpts = {
                            url: url,
                            type: ModuleTypes.page,
                            element : elem,
                            scopes:scopes,
                            shares:shares
                        };

                        if(defineScript.src){
                            moOpts.define = defineScript.src;
                        }else{
                            moOpts.define = new Function(defineScript.innerHTML);
                        }
                        resolve(moOpts);
                    }).fail(reject);
                });
            }
        };
        private static documentHead:HTMLHeadElement;
        private static getDocumentHead():HTMLElement{
            if(Module.documentHead)return Module.documentHead;
            let heads = document.getElementsByTagName("head");
            if(heads!=null && heads.length) return Module.documentHead = heads[0];
            return document.body|| document.documentElement;
        }
        public static loadRes:(url:string ,type?:ModuleTypes)=>Promise = function(url:string ,type?:ModuleTypes):Promise{
            if(!url) return new Promise(Module.nonRes);
            return new Promise((resolve,reject)=>{
                if(type===undefined) type = Module.getResType(url);
                let loader : (url:string)=>void = Module.loaders[ModuleTypes[<number>type]];
                if(!loader){
                    let ex = new Error("Cannot load this resource " + name);
                    logger.error(ex,"y/module.loadRes");
                    reject(ex);
                    return;
                }
                resolve(loader(url));
            });
        }
        public toString(){
            return "{object,Module(alias:"+this.alias+",url:"+this.uri+",type:"+ModuleTypes[this.type]+")}";
        }
        public static readonly empty :Module = new Module({type : ModuleTypes.none});
        public static readonly nonRes :ModuleOpts = {type : ModuleTypes.none};
        public load(urlOrOpts:string|ModuleOpts):Module{
            if(!urlOrOpts) {
                logger.warn(new Error("empty argument"),"y/Module.load");
                return Module.empty;
            }
            let opts :ModuleOpts;
            if(typeof urlOrOpts ==="string"){
                opts = {url:<string>urlOrOpts,alias:<string>urlOrOpts};
            } else opts = urlOrOpts;
            let module :Module = Module.cache[opts.alias] || Module.cache[opts.url];
            if(module){
                module.activeTime = new Date();
                return module;
            }
            module = new Module(opts,this);
            Module.cache[module.alias] = Module.cache[module.alias] = module;
            return module;
        }
        public loadMany(deps:Array<ModuleOpts|string>):Promise{
            if(!deps ){
                logger.warn(new Error("empty argument"),"y/Module.loadMany");
                return Module.empty; 
            } 
            if(deps.length==0) return Module.empty;
            return Promise.when(deps,(dep:ModuleOpts|string):Promise=>{
                return this.load(dep);
            });
        }
        
        public createController(controllerArea:string|HTMLElement):any{
            let area:HTMLElement= platform.getElement(controllerArea);
            let controllerType = this.data["y-controller-type"];
            if(!controllerType){
                let proto = this.value;
                if(typeof proto==="function") controllerType = proto;
                else{
                    controllerType = function(){};
                    controllerType.prototype = proto;
                    this.data["y-controller-type"] = controllerType;
                }
            }
            let controller:IController = new controllerType();
            controller.module = this;
            let view:View;
            let viewTemplate:View = this.data["y-controller-view"] as View;
            if(viewTemplate==null){
                //view = new View(controller,null,area);
                //this.data["y-controller-view"] = view.clone();
            }else{
                //view = viewTemplate.clone(controller, null, area) as View;
            }
            //controller.view = view;
            controller.model = view.model.$accessor;
            return controller;
        }

        public static clearExpired(){
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
        }
        static root:Module;
        static controller:IController;
    }

    platform.attach(window,"aload",function(){
        let rootOpts :ModuleOpts={url:location.href,alias:"$root",value : window};
        
        
        let parseModOpts:(elem:HTMLElement)=>ModuleOpts =(elem:HTMLElement):ModuleOpts =>{
            let url = (elem as HTMLScriptElement).src || (elem as HTMLLinkElement).href;
            if(!url)return;
            let result:ModuleOpts = {};
            let alias = elem.getAttribute("y-alias");
            let valName:any = elem.getAttribute("y-module-value");
            if(valName){
                eval("valName=" + valName);
            }else valName = NONE;
            result.url = url;
            result.alias = alias || url;
            result.expiry =-1;
            result.value = valName;
            return result;
        };
        let defineScript :HTMLScriptElement;
        let scripts = document.getElementsByTagName("script");
        for(let i=0,j=scripts.length;i<j;i++){
            let script = scripts[i];
            let opts:ModuleOpts = parseModOpts(script);
            if(opts) Module.cache[opts.alias] = Module.cache[opts.url] = new Module(opts);
            let defineAttr = script.getAttribute("y-module-define");
            if(defineAttr!==undefined && defineAttr!==null) {
                defineScript = script;
                opts.define = script.src || (new Function("(function(){" + script.innerHTML + "})()"));
            }
        }
        let links = document.getElementsByTagName("link");  
        for(let i=0,j=links.length;i<j;i++){
            let opts:ModuleOpts = parseModOpts(links[i]);
            if(opts)Module.cache[opts.alias] = Module.cache[opts.url] = new Module(opts);
        }
        Module.root = new Module(rootOpts).done((rootModule)=>{
            let controller :IController= Module.controller =rootModule.createController(document.body);
            if(controller.init) controller.init(controller.model,controller.view);
        }) as Module;
        Module.root.uri = Uri.current;
        
    });

    
    //export let module = Module.define; 

    ////////////////////////////////////
    /// Model
    ////////////////////////////////////
    export interface IValuable{
        set_value(newValue: any,source?:ModelEvent|number|boolean):IValuable;
        get_value():any;
    }
    export interface IModel extends IObservable,IValuable {
        //subscribe(handler:IModelEventHandler):void;
        //unsubscribe(handler:IModelEventHandler):void;
        
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
                self.set_value(newValue);
                return accessor;
            };
            
            accessor.subscribe = (handler: IModelEventHandler):IModel => {
                self.subscribe(handler);
                return accessor;
            };
            accessor.unsubscribe = (handler: IModelEventHandler):IModel => {
                self.unsubscribe(handler);
                return accessor;
            };
             accessor.get_value = ():any => {
                return self.get_value();
            };
             accessor.set_value = (value:any,extra?:any):IValuable => {
                self.set_value(value,extra);
                return accessor;
            };
            accessor.toString =  ():string => { return self.get_value();}
            this.$model = accessor.$model = this;
            this.$accessor = accessor.$accessor = accessor;
            accessor.$modelType = this.$modelType = ModelTypes.any;     
        }
        public name(n?:string|number):string|number{if(n===undefined){return this._name;}return this._name=n;}
        public container(): Model { return this._superior; }
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
            let oldSubject: Object = this._subject;
            if (oldSubject === newSubject) { return oldSubject; }
            let oldValue = oldSubject[this._name];
            newSubject= this._subject = newSubject || {};
            let newValue = newSubject[this._name];
            if(oldValue===newValue){
                return this._subject;
            }
            newSubject[this._name] = oldValue;
            this.set_value(newValue,source);
            
            return newSubject;
        }
        
        
        public subscribe(handler: IModelEventHandler):IModel{
            let handlers: IModelEventHandler[] = this._changeHandlers;
            if (!handlers) { handlers = this._changeHandlers = new Array<IModelEventHandler>(); }
            handlers.push(handler);
            return this;
        }
        public unsubscribe(handler: IModelEventHandler):IModel{
            let handlers: IModelEventHandler[] = this._changeHandlers;
            if (!handlers) { return; }
            for (let i: number = 0, j: number = handlers.length; i < j; i++) {
                let existed: IModelEventHandler = handlers.shift();
                if (existed !== handler) { handlers.push(existed); }
            }      
            return this;      
        }
        //触发事件
        private _notifyValuechange(evt: ModelEvent,ignoreSuperior?:boolean):void {
            let changeHandlers: IModelEventHandler[] = this._changeHandlers;
            if (changeHandlers) {
                for (let i: number = 0, j: number = changeHandlers.length; i < j; i++) {
                    let handler: IModelEventHandler = changeHandlers.shift();
                    handler.call(this, this.$accessor, evt);
                    changeHandlers.push(handler);
                }
            }
           
            
            let value = this._subject[this._name];
            
            //向上传播事件
            let superior: Model = this._superior;
            if (superior && ignoreSuperior!==true) {
                evt = new ModelEvent(this, ModelActions.child, this._subject, undefined, evt);
                superior._notifyValuechange(evt);
            }
            
            
        }
        public get_value(): any { return this._subject[this._name]; }
        public set_value(newValue: any,source?:ModelEvent|number|boolean): any {
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
                
                for (let name in members) {
                    if (!members.hasOwnProperty(name)) { continue; }
                    let member: Model = members[name];
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
                    let def :{} = member._defination||( member._defination={});
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
            let aname: string = Model.chromeKeywords[name] || name.toString();
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
            let newModel: Model = new Model(newName = newName===undefined?this._name:newName, newSubject);
            newModel._defination = this._defination;
            newModel.$modelType = this.$modelType;
            if(newModel._itemProto = this._itemProto){
                newModel.toArray(this._itemProto);return newModel;
            }
            if(newModel._computed=this._computed){
                return newModel;
            }
            let members: { [id: string]: Model } = this._members;
            if (members ) {
                let newMembers: { [index: string]: Model } = newModel._members || (newModel._members = {});
                let value:any = newSubject[newName] || (newSubject[newName]={});
                let newAccessor :any = newModel.$accessor;
                for (let name in members) {
                    if (!members.hasOwnProperty(name)) { continue; }
                    let member: Model = members[name];
                    let newMember: Model = member.clone(value,name);
                    newMembers[name] = newMember;
                    let aname: string = Model.chromeKeywords[name] || name.toString();
                    newAccessor[aname] = newMember.$accessor;
                }
            }
            return newModel;
        }
        public computed(deps: { [index: string]: IModel }, codes: Function | string): Model {
            if (this.$modelType !== ModelTypes.any) { throw "Already been computed."; }
            let isFn: boolean = typeof codes === "function";
            let fn: Function = null;
            let args: Array<IModel|string> = [];
            let argnames: Array<string> = [];
            for (let n in deps) {
                if (!deps.hasOwnProperty(n)) { continue; }
                let depModel: IModel = deps[n];
                if (!depModel.subscribe) { throw n + " is not a model or accessor."; }
                depModel.subscribe((sender: IModelAccessor, evt: ModelEvent): void => {
                    let value:any = this._computed.getValue();
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
            this.get_value = () => this._computed.getValue();
            this.set_value = () => { throw "Computed member is readonly."; };
            this.prop = () => { throw "Computed member can not define member."; };
            this.$accessor.$modelType = this.$modelType = ModelTypes.computed;
            return this;
        }

        public toArray(itemProto?: Model|{}): Model {
            if (this.$modelType!==ModelTypes.any) { throw "Already been computed."; }
            
            let value: any = this._subject[this._name];
            if (!value) { value = this._subject[this._name] = []; }

            if (itemProto === undefined) { itemProto = new Model(null, value); }
            else {
                if(!(itemProto instanceof Model)) itemProto = new Model(itemProto); 
            }
            this._itemProto = itemProto as Model;
            (this as Model).itemProto = ():Model=>{return this._itemProto;};
            (itemProto as Model)._superior = this;
            
            let accessor: IModelAccessor = this.$accessor;
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

            let evt: ModelEvent = new ModelEvent(null, ModelActions.add, itemValue,undefined);
            evt.index = value.length;
            let evtp :ModelEvent = new ModelEvent(this,ModelActions.child,value,value,evt);
            value.push(itemValue);
            this._notifyValuechange(evtp);
            return this;
        }
        public pop(returnModel?: boolean): any {
            if(this.$modelType!==ModelTypes.array) {throw new NotArrayException();}
            let value: any = this._subject[this._name];
            if (!value) { return undefined; }
            if (value.length === 0) { return undefined; }

            let itemValue: any = value.pop();
            let itemModel: Model = this._members[value.length];
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
                let member: Model = members[j.toString()];
                let index: number = j + 1;
                if (member instanceof Model) { members[index] = member; member.name(index); }
            }
            let itemModel: Model = members[0];
            if (itemModel != null) { delete members[0]; }
            value.unshift(itemValue);
            let evt: ModelEvent = new ModelEvent(this, ModelActions.add, value, value);
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
            let itemValue: any = value.shift();
            let itemModel: Model = members[0];
            
            for (let i: number = 0, j: number = value.length ; i <j; i++) {
                let member: Model = members[i + 1];
                if (member instanceof Model) { members[i] = member; member.name(i); }
            }
            delete members[value.length];

            let evt: ModelEvent = new ModelEvent(this, ModelActions.remove, value, value);
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
                let members: { [index: string]: Model } = this._members || (this._members={});
                let itemModel: Model = members[index];
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
                itemModel.set_value(itemValue,index);
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
    
    export interface IABind{
        (modelOrContext:Model|ABindContext,element?:HTMLElement,controller?:IController,extra?:any):void;
    }
    
    
    export class ABindContext{
        
        $root:IModelAccessor;
        $self:IModelAccessor;
        _element:HTMLElement;
        _binders:{[index:string]:IABinder};
        _controller:IController;
        _scopes:Array<IModelAccessor>;
        constructor(root:Model,element:HTMLElement,controller:IController){
            this.$self = this.$root = root.$accessor;
            this._element = element;
            //this._binders = binders;
            this._controller = controller;
            this._scopes = [];
        }
    }

    class BExpression{
        bind(context:ABindContext):void{}
        

        toCode():string{throw "abstract function";}
    }
    

    

    class UniboundExpression extends BExpression{
        modelPath:string;

        attr:string;
        constructor(modelPath:string,context:ABindContext,attrName:string="value"){
            super();
            this.attr = attrName;
            let result:DefineResult = defineModel(modelPath,context);
            this.modelPath = result.path;
            this.bind = function(context:ABindContext){
                
                uniBinder(context._element,result.model.$accessor,context._controller,attrName);
            }
        }
        
        toString():string{
            return "_binders[\"unibound\"](_element,"+this.modelPath+",\""+this.attr+"\");\n";
        }
    }

    class BinderExpression extends BExpression{
        modelPath:string;
        name:string;
        binder:IABinder;
        constructor(modelPath:string,name:string,context:ABindContext,controller:IController){
            super();
            this.name = name;
            let result:DefineResult = defineModel(modelPath,context);
            this.modelPath = result.path;
            this.binder = context._binders[name];
            this.bind = function(context:ABindContext){
                context._binders[name](context._element,result.model.$accessor,controller);
            }
        }
        
        toString():string{
            return "_binders[\"" + this.name + "\"](_element,"+this.modelPath+",_controller);\n";
        }
    }

    

    
    class EventExpression extends BExpression{
        
        actionName:string;
        evtName:string;
        constructor(evtName:string,actionName:string){
            super();
            this.actionName = actionName;

            this.evtName = evtName.indexOf("on")==0?evtName.substr(2):evtName;
            this.bind = (context:ABindContext)=>{
                platform.attach(context._element,this.evtName,function(evt){context._controller[actionName].call(context._controller,evt||window.event,this);}); 
                
            };
        }
        toString():string{
            return "attach(_element,\""+this.evtName+"\",function(evt){_controller."+this.actionName+".call(_controller,evt||window.event,this);});\n";
        }
    }

    let trimReg = /(^\s+)|(\s+$)/;
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
    function definePath(modelPath:string,context:ABindContext):DefineResult{
        let paths = modelPath.split(".");
        let first = paths.shift();
        let accessor = context.$self;
        if(first=="$root" || first == "$"){
            accessor = context.$root;
        }else if(first=="$parent"){
            accessor = context.$self.$model.container().$accessor;
        }else {
            modelPath = "$self." + modelPath;
            paths.unshift(first);
        }
        let model :Model = accessor.$model;
        for(let i:number=0,j:number=paths.length;i<j;i++){
            let pathname = paths[i].replace(trimReg,"");
            if (pathname=="") throw "Invalid expression:" + modelPath;
            model = model.prop(pathname,{});
        }
        return new DefineResult(modelPath,model);
    }
    function defineModel(pathOrExpr:string,context:ABindContext):DefineResult{
        return definePath(pathOrExpr,context);
    }

    
    
   
    

    function getBindName(element:HTMLElement):string{
        let bindname :string = null;
        if(element.tagName=="TEXTAREA") bindname = "textbox";
        else if(element.tagName=="SELECT") bindname = "select";
        else if(element.tagName=="INPUT"){
            let t = (element as HTMLInputElement).type;
            if(t==="checkbox") bindname = "checkbox";
            else if(t==="radio") bindname = "radio";
            else bindname="textbox";
        }
        else bindname = "text";
        return bindname;
    }
    function buildBindCodes(element:HTMLElement,codes?:Array<string>){
        if(codes===null || codes===undefined) codes = [];
        let exprs:Array<BExpression> = [];
    }
    let valuebinder = function(element,expr,context){
        let deps = expr.getDeps(context);
        deps.subscribe((evt)=>{
            element.value = expr.getValue(context);
        });
        platform.attach(element,"ab",()=>{
            deps.setValue(element.value);
        });
    }
    export class ViewOpts{
        element:HTMLElement;
        controller?:{};
        model?:any;
        prototypeView?:View;
        nobind?:boolean;
    }
    export class View{
        controller:any;
        model :IModelAccessor; 
        element:HTMLElement;
        _html?:string;
        protected _binder:IBinder;
        _binders :{[index:string]:IBinder};
        _innerViews?:{[index:string]:View};
        

        constructor(opts:ViewOpts){
            let elem = this.element =platform.getElement(opts.element);
            let existed = this.element["y-bind-view"] as View;
            if(existed) existed.dispose();
            let controller:any = this.controller = opts.controller||{};
            this._binders = controller._binders|| (controller._binders={});
            if(this.controller.TEXT) this.label = (key:string):string =>controller.TEXT.call(controller,key);
            let protoView= opts.prototypeView;
            if(!protoView){
                if(opts.model && (opts.model as IModel).$model){
                    this.model = (opts.model as IModel).$accessor;
                }else{
                    this.model = new Model("$",{"$":opts.model||{}}).$accessor;
                }
                
                this._binder = this.makeBinder();
            }else{
                this.element.innerHTML = protoView.element  ? protoView.element.innerHTML: protoView._html;
                if(opts.model && (opts.model as IModel).$model){
                    this.model = (opts.model as IModel).$accessor;
                }else{
                    this.model = new Model("$",{"$":opts.model||{}}).$accessor;
                }
                this._binder = protoView._binder;
            }
            if(!opts.nobind) this.bind();
        }
        toTemplate():View{
            this._html = this.element.innerHTML;
            this.element = undefined;
            this.model = this.model.$model.clone({},"$").$accessor;
            return this;
        }
        bind(value?:any):View{
            if(value) this.model(value);
            if(this.element["y-bind-view"]) return this;
            this._binder(this.element as HTMLElement,this.model,this);
            return this.element["y-bind-view"] = this;
        }
        
        getFunc(fname:string):Function{
            let fn = this.controller[fname];
            if(fn && typeof fn==="function")return fn;
            return null;
        }
        label(key:string):string{
            let text:string;
            let ctrlr = this.controller;
            if(!ctrlr) return key;
            if(ctrlr._labels) text = ctrlr._labels[key];
            if(text===undefined)if(ctrlr.module) text = ctrlr.module.label(key);
            if(text===undefined) return key;
        }
        getBinder(name:string){
            return this._binders[name]|| View.binders[name];
        }
        makeBinder():IBinder{
            let exprs:Expression[] = [];
            parseElement({context:this,element:this.element as HTMLElement ,expressions: exprs,model:this.model,ignoreSelf:true});
            while(true){
                let last = exprs.pop();
                if(!last) break;
                if((<ChildBeginExpression>last).childAt===undefined &&  !(<ChildBeginExpression>last).parentNode){
                    exprs.push(last);break;
                }
            }
            let code ="";
            for(let i=0,j=exprs.length;i<j;i++){
                code += exprs[i].toCode(this);
            }
            //(this:BindContext,element:HTMLElement,bindable:IBindable):void;
            code = "var $_scopes= [];\n" + code;
            let binder = new Function("$_element","$_self","$_context",code) as IBinder;
            return binder ; 
        }
        dispose():void{

        }
        static readonly funcs:{[index:string]:Function}={};
        static readonly binders :{[index:string]:IBinder}={};
        
    }  
    export class ParseViewOpts{
        context:View;
        element:HTMLElement;
        expressions:Expression[];
        model:IModel;
        ignoreSelf?:boolean;
    }
    function parseElement(opts:ParseViewOpts){
        let scope:ModelExpression;
        let ui :Expression;
        let childModel:IModel = opts.model;
        let igoneChildren = false;
        let element = opts.element;
        let expressions = opts.expressions;
        let context = opts.context;
        let customerParsedExpression:Expression;
        if(!opts.ignoreSelf){
            if(opts.element.nodeType==3){
                let embededExpr = ComputedExpression.embeded(element.textContent,{model:opts.model});
                if(embededExpr)   expressions.push(new BindExpression("y-text",embededExpr));
                return;
            }
            
            let attrs = element.attributes;
            
            for(let i =0,j=attrs.length;i<j;i++){
                let attr = attrs[i];
                let attrname = attr.name;
                let attrvalue = attr.value;
                let binder = context.getBinder(attrname);
                if(!binder) continue;
                let expr = Expression.parse(attrvalue,{model:opts.model});
                if(!expr) continue;
                if(attrname=="y-scope"){
                    if(expr.type!= ExpressionTypes.model) throw new Error("y-scope只能绑定model表达式");
                    scope = expr as ModelExpression;
                    continue;
                }
                
                
                if(binder.parse) {
                    if(customerParsedExpression) throw new Error("Already has a binder.parse");
                    customerParsedExpression = binder.parse(expr,opts,binder);
                    expr = new BindExpression(attrname,expr);
                    expressions.push(customerParsedExpression);
                }else{
                    expr = new BindExpression(attrname,expr);
                    expressions.push(expr);
                }
            }
        }
        
        if(!element.hasChildNodes || customerParsedExpression) return; 
        
        if(scope) {
            expressions.push(new ScopeBeginExpression(scope));
            childModel = scope.model;
        }
        let nodes = element.childNodes;
        for(let i =0,j=nodes.length;i<j;i++){
            let node = nodes[i];
            expressions.push(new ChildBeginExpression(i,element as HTMLElement));
            parseElement({context:context,element:node as HTMLElement ,expressions: expressions,model:childModel,ignoreSelf:false});
            let last = expressions.pop() as ChildBeginExpression;
            if(last.childAt!=i || last.parentNode!=element){
                expressions.push(last);
                expressions.push(new ChildEndExpression(i,element));
            }
        }
        if(scope) expressions.push(new ScopeEndExpression());
    }
    export interface IBindable extends IValuable,IObservable{};
    export class ConstantBindableObject implements IBindable{
        value:any;
        constructor(value:any){
            this.value = value;
        }
        get_value(){return this.value;}
        set_value(val:any,extra?:any){return this;}
        subscribe(event:string|Function,handler?:Function):IObservable{return this;}
        unsubscribe(event:string|Function,handler?:Function):IObservable{return this;}

    }
    export class BindDependences implements IBindable{
        deps:IObservable[];
        constructor(deps:IBindable[]|IBindable, getter){
            if(!deps || (<IObservable[]>deps).length===0){
                this.get_value = getter;
                this.set_value = (value:any,extra?:any):any=>{ throw new Error("多个依赖项不可以设置值，它是只读的");}
                this.subscribe = this.unsubscribe = (handler:Function):any=>{}
                return;
            }
            let isArr = isArray(deps);
            if(isArr){
                if((<IObservable[]>deps).length==0 && (<IObservable[]>deps).length==1){isArr = false;deps = deps[0];}
            }
            if(!isArr){
                this.get_value = ():any=> (<IBindable>deps).get_value();
                this.set_value = (value:any,extra?:any):any=>(<IBindable>deps).set_value(value,extra);
                this.subscribe = (handler:Function):any =>(<IBindable>deps).subscribe(handler );
                this.unsubscribe = (handler:Function):any =>(<IBindable>deps).unsubscribe(handler);
            }else{
                this.deps = deps as IObservable[];
                this.get_value = getter;
                this.subscribe = (handler:Function)=>{
                    for(let i=0,j=(<IObservable[]>deps).length;i<j;i++){
                        (deps[i] as IObservable).subscribe(handler);
                    }
                    return this;
                }
                this.unsubscribe = (handler:Function)=>{
                    for(let i=0,j=(<IObservable[]>deps).length;i<j;i++){
                        (deps[i] as IObservable).unsubscribe(handler);
                    }
                    return this;
                }
                this.set_value = (value:any,extra?:any):any=>{ throw new Error("多个依赖项不可以设置值，它是只读的");}
            }
        }
        subscribe:(event:string|Function,handler?:Function)=>IObservable;
        unsubscribe:(event:string|Function,handler?:Function)=>IObservable;
        get_value:()=>any;
        set_value:(value:any,extra?:any)=>any;

    }
     
    export enum ExpressionTypes{
        //固定表达式  y-controller='user,http://pro.com/user' y-click="onsubmit"
        constant,
        //模型表达式 $ROOT.Title
        model,
        //多语言化表达式
        label,
        //函数表达式  contains($Permission,$ROOT.Check,startTime)
        function,
        //对象表达式
        object,
        //计算表达式 (price:$.Price,qty:Quanity)=>price*qty;
        computed,
        //绑定
        bind,
        childBegin,
        childEnd,
        scopeBegin,
        scopeEnd        

    }
    export interface ParseExpressionOpts{
        model?:IModel;
        //对象表达式是否必须要有{}
        objectBrackets?:boolean|string[];
        //固定值的结束标记
        constantEndPatten?:RegExp;
    }
    export class Expression{
        type:ExpressionTypes;   
        matchLength:number; 
        getDeps(context:View,deps?:string[]):string[]{throw new Error("Not implement");}
        
        toCode(context:View):string{throw new Error("Invalid invoke");}
        static parse(text:string,opts:ParseExpressionOpts={}):Expression{
            if(!opts.model) opts.model = new Model();
            let expr :Expression;
            if(expr = LabelExpression.parse(text,opts)) return expr;
            if(expr = ModelExpression.parse(text,opts)) return expr;
            if(expr = FunctionExpression.parse(text,opts)) return expr;
            if(expr = ObjectExpression.parse(text,opts)) return expr;
            if(expr = ComputedExpression.parse(text,opts)) return expr;
            return ConstantExpression.parse(text,opts);
            
        }    
    }
    export class ConstantExpression extends Expression{
        value:string;
        endWith:string;
        constructor(value:string,len:number){
            super();
            this.type = ExpressionTypes.constant;
            this.value = value;
            this.matchLength = len;
        }
        getDeps(context:View,deps?:string[]):string[]{return null;}

        toCode(context:View):string{
            if(this.value===null) return "null";
            if(this.value===undefined) return "undefined";
            return  "\"" + toJsonString(this.value) + "\"";
        } 
        static strict:boolean = false;
        
        static parse(text:string , opts?:ParseExpressionOpts):ConstantExpression{
            if(!text) return;
            let result  = ConstantExpression.parseQuote(text,"\"");
            if(result) return result;
            result  = ConstantExpression.parseQuote(text,"'");
            if(result) return result;
            if(ConstantExpression.strict) return null;
            if(opts && opts.constantEndPatten) {
                let endPatten = opts.constantEndPatten;
                let matches = text.match(endPatten);
                if(matches) {
                    result = new ConstantExpression(text.substr(0,matches.index),matches.index );
                    result.endWith = matches[0];
                    return result;
                }//else return null;
            }
            return new ConstantExpression(text,text.length);
            
        }
        static parseQuote(text:string,quote:string){
            if(text[0]!=quote) return null;
            let quoteAt = 1;
            while(true){
                quoteAt = text.indexOf(quote,quoteAt);
                if(quoteAt>=1){
                    if(text[quoteAt-1]=="\\"){quoteAt++;continue;}
                    else{
                        let constValue = text.substring(1,quoteAt-1);
                        let result = new ConstantExpression(constValue,quoteAt);
                        result.endWith = quote;
                        return result;
                    }
                }else return null;
            }
        }
    }
    export class ModelExpression extends Expression{
        names:string;
        path:string;
        model:IModel;
        constructor(names:string,currentModel:IModel){
            super();
            this.type = ExpressionTypes.model;
            this.names =names;
            this.model = this._parsePath(currentModel.$model);
        }
        
        _parsePath(curr:Model):Model{
            let names = this.names.split(".");
            let rs :string[]=["$_self"];
            for(let i=0,j=names.length;i<j;i++){
                let name = names[i].replace(trimRegex,"");
                if(!name) throw new Error("Invalid model path : " + names.join("."));
                if(name=="$root" || name=="$"){
                    curr = curr.root();
                    rs = ["$_self.$model.root().$accessor"];
                }else if(name=="$parent"){
                    let p :Model = curr.container();
                    curr=p ||curr;
                    rs.push("$_self.container().$accessor")
                }else if(name == "$self"){
                    curr = curr;
                }else{
                    if(i==0) name = name.replace(/^\$/,"");
                    curr = curr.prop(name,{});
                    rs.push(name);
                } 
            }
            this.path =  rs.join(".");
            return curr;
        }
        getDeps(context:View,deps?:string[]):string[]{
            deps||(deps=[]);
            deps.push(this.path);
            return deps;
        }

        toCode(context:View):string{
            return  this.path;
        } 
        static patten:RegExp = /^\s*\$(?:[a-zA-Z][a-zA-Z0-9_\$]*)?(?:\s*\.[a-zA-Z_\$][a-zA-Z0-9_\$]*)*\s*/i;
        static parse(text:string,opts?:ParseExpressionOpts):ModelExpression{
            if(!text) return null;
            let matches = text.match(ModelExpression.patten);
            if(matches){
                let path = matches[0];
                let result:ModelExpression = new ModelExpression(path,opts.model);
                result.matchLength = path.length;
                return result;
            } 
            return null;
        }
    }
    export class LabelExpression extends Expression{
        key:string;
        constructor(key:string,len:number){
            super();
            this.type = ExpressionTypes.label;
            this.key = key;
            this.matchLength = len;
        }
        getDeps(context:View,deps?:string[]):string[]{return null;}
            
        toCode(context:View):string{
            return `$_context.label("${this.key}")`;
        }
        static patten :RegExp = /^#([^#\n\r\t]+)#/;
        static parse(text:string,opts?:ParseExpressionOpts):LabelExpression{
            
            let matches = text.match(LabelExpression.patten);
            if(matches) return new LabelExpression(matches[1],matches[0].length);
        }
    }
    export class FunctionExpression extends Expression{
        arguments:Expression[];
        funname:string;
        constructor(name:string,args:Expression[],len:number){
            super();
            this.type = ExpressionTypes.function;
            this.arguments = args;
            this.funname = name;
            this.matchLength = len;
        }

        getDeps(context:View,deps?:string[]):string[]{
            deps||(deps=[]);
            let c = deps.length;
            for(let i=0,j=this.arguments.length;i<j;i++){
                this.arguments[i].getDeps(context,deps);
            }
            if(c<deps.length)return deps;
            return null;
        }
        static patten :RegExp = /^\s*([a-zA-Z_][a-zA-Z0-9_\$]*)\s*\(\s*/i;
        static parse(text:string,opts?:ParseExpressionOpts):FunctionExpression{
            if(!text)return null;
            let matches = text.match(FunctionExpression.patten);
            if(!matches)return null;

            let fnname = matches[1];
            let len :number=matches[0].length;
            text = text.substr(len);
            let args:Expression[] =[];
            if(text[0]==")"){
                len++;
                return new FunctionExpression(fnname,args,len);
            }
            while(true){
                let arg = Expression.parse(text,{model:opts.model,constantEndPatten:/[,\)]/i,objectBrackets:true});
                if(arg){
                    args.push(arg);
                    text =text.substr(arg.matchLength);
                    len+= arg.matchLength;
                }
                
                let first:string = text[0];
                if(first==","){
                    text=text.substr(1);
                    len++;
                }else if(first==")"){
                    len++;break;
                }
                if(!text)return null;
            }
            return new FunctionExpression(fnname,args,len);
            //if(end===")")
        }
        toCode(context:View):string{
            let code:string = "$_context.getFunc(\"" + this.funname + "\")(";
            for(let i=0,j=this.arguments.length;i<j;i++){
                code += this.arguments[i].toCode(context);
                if(i!=0) code+= ",";
            }
            return code += ")";
        } 
    }  
    export class ObjectExpression extends Expression{
        members:{[index:string]:Expression}
        constructor(members:{[index:string]:Expression},matchLength:number){
            super();
            this.type = ExpressionTypes.object;
            this.members = members;
            this.matchLength = matchLength;
        }
        getDeps(context:View,deps?:string[]):string[]{
            let members = this.members;
            deps||(deps=[]);
            let count=0;
            for(let n in members){
                let dep = members[n].getDeps(context,deps);
                if(dep) count++;
            }
            return count?deps:null;
        }

        toCode(context:View):string{
            let code ="{";
            let members = this.members;
            for(let n in members){
                if(code.length!=1) code += ",";
                code += "\"" + n + "\":" + members[n].toCode(context);
            }
            return code + "}";
        } 
        static patten:RegExp=/^(?:\s*,)?\s*([a-zA-Z_][a-zA-Z0-9_\$]*)\s*:\s*/i;
        static parse(text:string , opts?:ParseExpressionOpts):ObjectExpression{
            if(!text) return null;

            let len :number = 0;
            let constEndPatten :RegExp ;
            let needBrackets = opts && opts.objectBrackets;
            let beginPatten:RegExp;
            
            if(needBrackets){
                let beginToken = needBrackets[0]||"\\{";
                beginPatten = new RegExp("^\s*" + beginToken + "\s*");
                
            }else{
                beginPatten = /^\s*\{/i;
                
            } 
            let match = text.match(beginPatten);
            if(match){   
                text = text.substr(match[0].length);
                len = match.length;
                needBrackets = true;
            }else{
                if(needBrackets) return null;
            }
            let endPatten :RegExp;
            let endToken :string;
            if(needBrackets){
                endToken= needBrackets[1]?needBrackets[1]:"\\}";
                endPatten = new RegExp("^\s*" + endToken + "\s*");
                
                let m = text.match(endPatten);
                if(m){
                    len += m[0].length;
                    return new ObjectExpression({},len);
                }
                constEndPatten=  new RegExp("[" + endToken + ",]");
                endToken = endToken[endToken.length-1];
            }else{
                endToken = "}";
                constEndPatten = /,/;
            }
            let obj :{[index:string]:Expression};
            while(true){
                let keyMatches = text.match(ObjectExpression.patten);
                //let keyExpr:KeyExpression = KeyExpression.parse(text);
                if(!keyMatches) {
                    if(needBrackets) throw new Error("不正确的Object表达式,无法分析出key:" + text);
                    break;
                }
                let keyLen  = keyMatches[0].length;
                let key =keyMatches[1];
                text = text.substr(keyLen);
                len += keyLen;
                if(!text){
                    if(needBrackets) return null;
                    (obj||(obj={}))[key] = new ConstantExpression("",0);
                    return new ObjectExpression(obj,len);
                }
                
                let valueExpr = Expression.parse(text,{model:opts.model,constantEndPatten:constEndPatten,objectBrackets:true});
                if(!valueExpr)break;
                (obj||(obj={}))[key] = valueExpr;
                text = text.substr(valueExpr.matchLength);
                len += valueExpr.matchLength;
                if(needBrackets && (<ConstantExpression>valueExpr).endWith){
                    let endWith = (<ConstantExpression>valueExpr).endWith;
                    if(endWith==endToken){ len ++;break;}
                }
                if(!text)break;
                if(needBrackets && text[0]==endToken)break;
            }
            return obj?new ObjectExpression(obj,len):null;
        }
    }
    export class ComputedExpression extends Expression{
        parameters:{[index:string]:Expression};
        code:string;
        constructor(parameters:{[index:string]:Expression},code:string,len:number){
            super();
            this.type = ExpressionTypes.computed;
            this.parameters = parameters;
            this.code = code;
            this.matchLength = len;
        }
        private _func:Function;
       
        toCode(context:View):string{
            let args ="";
            let parnames = "";
            let pars = this.parameters;
            let at = 0;
            for(let n in pars){
                if(at!=0) {args +=",";parnames+=",";}
                args+= pars[n].toCode(context);
                parnames+=n;
            }
            return `(function(${parnames}){return ${this.code};})(${args})`;
        }
        getDeps(context:View,deps?:string[]):string[]{
            deps||(deps=[]);
            let c = deps.length;
            let pars = this.parameters;
            for(let n in pars){
                pars[n].getDeps(context,deps);
            }
            if(c<deps.length)return deps;
            return null;
        }
        static patten:RegExp = /^\s*=>\s*/;
        static parse(text:string,opts?:ParseExpressionOpts):ComputedExpression{
            let paramExpr = ObjectExpression.parse(text,{model:opts.model,objectBrackets:["\\(","\\)"]});
            if(!paramExpr)return null;
            let len = paramExpr.matchLength;
            text = text.substr(len);
            let matches = text.match(ComputedExpression.patten);
            if(!matches)return;
            len += matches[0].length;
            text = text.substr(matches[0].length);
            let semiAt = text.indexOf(";");
            if(semiAt<0)return null;
            len+= semiAt;
            let code = text.substr(0,semiAt);
            return new ComputedExpression((<ObjectExpression>paramExpr).members,code,len);
            //ObjectExpression.parse();
        }
        static labelPatten:RegExp = /##([^#\n\r\t]+)##/;
        static embeded(text:string,opts?:ParseExpressionOpts):ComputedExpression{
            let pars :{[index:string]:Expression} = {};
            let code = "";
            let at =0;
            let lastAt = 0;
            let parCount=0;
            while(true){
                let startAt =at = text.indexOf("<[",at);
                if(startAt<0)break;
                let endAt =at = text.indexOf("]>",at);
                if(endAt<0) break;
                let exptext = text.substring(startAt + 2,endAt).replace(trimRegex,"");
                if(!exptext) continue;
                let exp = Expression.parse(exptext,opts);
                
                if(!exp || exp.type === ExpressionTypes.constant)continue;
                let ctext = toJsonString(text.substring(lastAt,startAt));
                let argname ="__y_EMBEDED_ARGS_" + (parCount++);
                code += "\"" + ctext.replace(ComputedExpression.labelPatten,"\"+$_context.label(\"$1\")+\"") + "\" + " + argname + "()";
                pars[argname] = exp;
                parCount++;
                lastAt = at +2;
            }
            let ctext = text.substring(lastAt);
            if(ComputedExpression.labelPatten.test(ctext)){
                code += "\"" + ctext.replace(ComputedExpression.labelPatten,"\"+$_context.label(\"$1\")+\"") + "\"";
            }
            
            return code?new ComputedExpression(pars,code,text.length):null;
            
            //if(pars.length) return new ComputedExpression(pars,code);
        }
        
    }
    export class BindExpression extends Expression{
        bindername:string;
        expression:Expression;
        constructor(name:string,expr:Expression){
            super();
            this.type = ExpressionTypes.bind;
            this.bindername = name;
            this.expression = expr;
        }
        getDeps(context:View,deps?:string[]):string[]{return this.expression.getDeps(context,deps);}
            
        toCode(context:View):string{
            switch(this.expression.type){
                case ExpressionTypes.model:return this.toModelCode(context);
                case ExpressionTypes.constant:return this.toConstantCode(context);
                case ExpressionTypes.function:return this.toFuncCode(context);
                case ExpressionTypes.computed:return this.toComputedCode(context);
                case ExpressionTypes.label:return this.toLabelCode(context);
                case ExpressionTypes.object:return this.toLabelCode(context);
                default:throw new Error("Not implement");
            }
        }   
        toLabelCode(context:View):string{
            return `$_element.innerHTML = ` +this.expression.toCode(context) + ";\n";
        }
        toModelCode(context:View):string{
            //binders.value.call(context,context.$element, context.$self.Username.$model);
            return  `$_context.getBinder("${this.bindername}").call($_context,$_element,`+ this.expression.toCode(context) + ",$_context);\n";
        } 
        toConstantCode(context:View):string{
            return  `$_context.getBinder("${this.bindername}").call($_context,$_element,new Y.ConstantBindableObject(`+this.expression.toCode(context)+"),$_context);\n";
        } 
        toFuncCode(context:View):string{
            let deps = this.getDeps(context);
            let depstr = deps? deps.join(","):"";
            return  `$_context.getBinder("${this.bindername}").call($_context,$_element,new Y.BindDependences([${depstr}],function(){ return `+ this.expression.toCode(context) + "}),$_context);\n";
        }  
          
        toComputedCode(context:View):string{
            let deps = this.getDeps(context);
            let depstr = deps? deps.join(","):"";
            return  `$_context.getBinder("${this.bindername}").call($_context,$_element,new Y.BindDependences([${depstr}],function(){ return `+ this.expression.toCode(context) + "}),$_context);\n";
        }  
        
        toObjectCode(context:View):string{
            let deps = this.getDeps(context);
            let depstr = deps? deps.join(","):"";
            return  `$_context.getBinder("${this.bindername}").call($_context,new Y.BindDependences([${depstr}],function(){ return `+ this.expression.toCode(context) + "}),$_context);\n";
        } 
    }    
    export class ChildBeginExpression extends Expression{
        childAt:number;
        parentNode:HTMLElement;
        constructor(at:number, parent:HTMLElement){
            super();
            this.type = ExpressionTypes.childBegin;
            this.childAt = at;
            this.parentNode = parent;
        }
        getDeps(context:View,deps?:string[]):string[]{return null;}
            
        toCode(context:View):string{
            return `$_element = $_element.childNodes[${this.childAt}];\n`;
        }
    }
    export class ChildEndExpression extends Expression{
        childAt:number;
        parentNode:HTMLElement;
        constructor(at:number,parent:HTMLElement){
            super();
            this.childAt = at;
            this.parentNode = parent;
        }
        getDeps(context:View,deps?:string[]):string[]{return null;}
            
        toCode(context:View):string{
            return `$_element = $_element.parentNode;\n`;
        }
    }
    class ScopeBeginExpression extends Expression{
        scopeExpression:ModelExpression;
        constructor(scopeExpression:ModelExpression){
            super();
            this.type = ExpressionTypes.scopeBegin;
            this.scopeExpression = scopeExpression;
        }
        toCode(context:View):string{
            return "$_scopes.push($_self); $_self = "+this.scopeExpression.toCode(context)+";\n";
        }
        
    }
    class ScopeEndExpression extends Expression{
        modelPath:string;
        constructor(){
            super();
            this.type = ExpressionTypes.scopeEnd;
        }
        toCode(context:View):string{
            return "$_self = $_scopes.pop();\n";
        }
    }
    
    export interface IBinder{
        (element:HTMLElement,bindable:IBindable,context:View):void;
        parse?:(valueExpr:Expression,opts:ParseViewOpts,binder:IBinder)=>Expression;
    }
    
    
    
    let binders:{[index:string]:IBinder} = View.binders;
    binders["y-scope"] = function(){};
    binders["y-text"] = function(element:HTMLElement,bindable:IBindable,context:View){
        bindable.subscribe(function(sender,evt){
            element.innerHTML = element.textContent = bindable.get_value();
        });
        element.innerHTML = element.textContent = bindable.get_value();
    }
    binders["y-value"] = function(element:HTMLElement,bindable:IBindable,context:View){
        bindable.subscribe(function(sender, evt){
            (<HTMLInputElement>element).value = bindable.get_value();
        });
        platform.attach(element,"blur",()=>{
            bindable.set_value((<HTMLInputElement>element).value);
        });
        (<HTMLInputElement>element).value = bindable.get_value();
    }
    let eachBinder :IBinder = binders["y-each"]  = function (element:HTMLElement,bindable:IBindable,context:View) {
        let viewTemplate = context._innerViews[element.getAttribute("y-each-view-id")];        
        let model = (bindable as IModel).$model;
        let addItemToView = function(item:Model,anchorElement:HTMLElement):void{
            let domContainer = document.createElement(viewTemplate.element.tagName);
            let itemView:View = new View({
                prototypeView : viewTemplate,
                element:domContainer,
                model : item
            });
            let elem :HTMLElement = itemView.element;
            if(anchorElement==null) {
                for(let i=0,j=elem.childNodes.length;i<j;i++){
                     element.appendChild(elem.firstChild);
                }
            }else{
                for(let i=0,j=elem.childNodes.length;i<j;i++){
                    element.insertBefore(elem.firstChild,anchorElement);
                }

            }
        }    
	        
		let handler = function (sender,evt:ModelEvent) {
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
            let elemProto = viewTemplate.element;
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
	}//end eachBinder 

    eachBinder.parse= function(valueExpr:Expression,opts:ParseViewOpts,binder:IBinder):Expression{
        if(valueExpr.type!=ExpressionTypes.model) throw new Error("each 只能绑定Model表达式");
        let model:Model = (<ModelExpression>valueExpr).model.$model;
        let eachView = new View({
            element:opts.element.cloneNode(true) as HTMLElement,
            controller : opts.context.controller,
            nobind:true
        });
        //eachView.toTemplate();
        let id = "y-view-each-" + seed();
        opts.element.setAttribute("y-each-view-id",id);
        let innerViews = opts.context._innerViews || (opts.context._innerViews={});
        innerViews[id] = eachView;
        model.toArray(eachView.model.$model);
        return new BindExpression("y-each",valueExpr);
    }
    
    
    
    

    
    export interface IABinder{
        (element:HTMLElement,accessor:IModelAccessor,controller:IController,extra?:any):Function;
    }

    export let _binders :{[index:string]:IABinder}={
            "bibound.text":function(element:HTMLElement, accessor:IModelAccessor):Function{
                let handler = function (sender:IModel,evt:ModelEvent) { element.innerHTML = evt.value; };
                accessor.subscribe(handler);
                element.innerHTML="";
                return function(){accessor.unsubscribe(handler);}
            },
            "bibound.value":function(element:HTMLElement, accessor:IModelAccessor):Function{
                let handler = function (sender:IModel,evt:ModelEvent) { (element as HTMLInputElement).value = evt.value; };
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
			let handler = function (sender:IModel,evt:ModelEvent) { 
                (element as HTMLInputElement).value = evt.value; 
                evt.extra = element;
            };
	        accessor.subscribe(handler);
	        (element as HTMLInputElement).value = "";
	        return function () { if (tick) clearTimeout(tick);accessor.unsubscribe(handler);}
	    },
	    "bibound.select": function (element:HTMLElement, accessor:IModelAccessor) {
	        let evtHandler = function () { 
                accessor(
                    (element as HTMLSelectElement).selectedIndex > -1 
                    ? ((element as HTMLSelectElement).options[(element as HTMLSelectElement).selectedIndex] as HTMLOptionElement).value 
                    : (element as HTMLSelectElement).value
                ); 
            }
	        let setValue:Function = function (element:HTMLElement, value:any) {
                if(value===undefined) return;
	            let opts = (element as HTMLSelectElement).options;
	            for (let i = 0, j = opts.length; i < j; i++) {
	                if (value === (opts[i] as HTMLOptionElement).value) {
	                    (element as HTMLSelectElement).selectedIndex = i;
	                    return;
	                }
	            }
	        }
	        platform.attach(element, "change", evtHandler);
			let handler = function (evt) { setValue(element, evt.value); }
	        accessor.subscribe(handler);
	        setValue(element, accessor());
			return function(){accessor.unsubscribe(handler);}
	    },
	    "bibound.radio": function (element:HTMLElement, accessor:IModelAccessor) {
	        let evtHandler = function () {
	            if ((element as HTMLInputElement).checked) accessor((element as HTMLInputElement).value);
	            else accessor(null);
	        }
	        let setValue = function (element:HTMLInputElement, value:any) {
	            if (value == element.value) {
	                element.checked = true;
	                element.setAttribute("checked", "checked");
	            } else {
	                element.checked = false;
	                element.removeAttribute("checked");
	            }
	        }
			let handler = function (sender,evt) {
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
	        let evtHandler = function () {
                let form:HTMLFormElement = (element as HTMLInputElement).form;
                let childNodes:NodeList;
                let vals:Array<string> = [];
                if(form!=null) {
                    for (let i = 0, j = form.elements.length; i < j; i++) {
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
	        let setValue = function (element, value) {
	            if (value === null || value === undefined) {
	                element.checked = false;
	                element.removeAttribute("checked");
	                return;
	            }
	            if (o2Str.call(value) === '[object Array]') {
                    let hasValue:boolean = false;
	                for (let i = 0, j = value.length; i < j; i++) {
	                    if (value[i] === element.value) {hasValue =true;break;}
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
			let handler:IModelEventHandler = function (sender:IModel,evt:ModelEvent) {
	            let value = evt.value;
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
    let uniBinder :IABinder =_binders["unibound"]= function(element:HTMLElement, accessor:IModelAccessor,controller:IController,extra?:any):Function{
        let setValue:Function;
        if(element.tagName=="SELECT"){
            setValue = function (element:HTMLElement, value:any) {
                if(value===undefined) return;
	            let opts = (element as HTMLSelectElement).options;
	            for (let i = 0, j = opts.length; i < j; i++) {
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
        
        let handler = function (sender:IModel,evt:ModelEvent) {setValue(element,evt.value); };
        accessor.subscribe(handler);
        setValue(element,undefined);
        return function(){accessor.unsubscribe(handler);}
    };



    export interface IControllerOpts{
        url?:string;
        area:HTMLElement|string;
    }

    
    
    

    
    let _seed = 0;
    export function seed():number{
        return (_seed==2100000000)?_seed=0:_seed++; 
    }
    
}
