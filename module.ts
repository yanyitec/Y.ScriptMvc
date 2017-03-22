export namespace Y {
    "use strict";
    let taskTimer :number;
    class Task{
        public handler:Function;
        public self:any;
        public args:Array<any>;
        public frequency:number;
        public step:number;
        public isApply:boolean;
        constructor(handler:Function,args:Array<any>,self?:any,frequency?:number){
            this.handler = handler;
            this.self = self;
            this.args = args;
            if(args.length !==undefined && args.push && args.pop){
                this.isApply = true;
            }else {
                this.isApply = false;
            }
            this.frequency = frequency || 0;
            this.step = 0;
        }
    }
    let tasks :Array<Task> = [];
    export function task(handler:Function,args?:Array<any>,self?:any,frequency?:number){
        let t = new Task(handler,args,self,frequency);
        tasks.push(t);
        if(!taskTimer){
            taskTimer = setInterval(runTasks,20);
        }
    }
    function runTasks(){
        for(let i:number=0,j:number=tasks.length;i<j;i++){
            let tsk:Task = tasks.shift();
            if(tsk.frequency==tsk.step){
                let result:any;
                if(tsk.isApply) result = tsk.handler.apply(tsk.self,tsk.args);
                else result = tsk.handler.call(tsk.self,tsk.args);
                if(result!=="keep-alive") continue;
            }
            if(++tsk.step>tsk.frequency) tsk.step=0;
            tasks.push(tsk);
        }
        if(tasks.length==0) {
            clearInterval(taskTimer);
            taskTimer = 0;
        }
    }
    let promiseTimer :number;
    let promises =[];
    function executePromises(){
        let ob :any = null;
        while((ob = promises.shift())){
            if(ob.setResult){
                ob.func(ob.result);
                continue;
            }
            let promise:any = ob.self._innerPromiseObject;
            try{
                ob.func.call(ob.self,ob.resolve,ob.reject);
                promise.exceptionHandlers=null;
            }catch(e){   
                if(!promise) return;
                var handlers = promise.exceptionHandlers;
                if(!handlers) return;
                for(let i:number=0,j:number=handlers.length;i<j;i++){
                    let ob = handlers[i];
                    if(ob.handler ===ob.type) ob.handler.call(this,e);
                    else if(e instanceof ob.type) ob.handler.call(this,e);
                }
                promise.result = e;
                promise.exceptionHandlers=true;   
            }
            
        }
        promiseTimer=0;
    }
    export interface IPromise{
        then(doneHandler,failHandler,exHandler):IPromise;
        done(doneHandler:Function):IPromise;
        fail(failHandler:Function):IPromise;
        catch(exType:any,handler?:any):IPromise;
        promise():IPromise;
    }
    export class Promise implements IPromise{
        private _innerPromiseObject;
        public constructor(asyncFunc?:Function){
            if(!asyncFunc)return;
            if(!promiseTimer) promiseTimer = setTimeout(executePromises);
            promises.push({
                self:this,
                func: asyncFunc,
                resolve:(result:any)=>{
                    if(!promiseTimer) promiseTimer = setTimeout(executePromises);
                    promises.push({
                        setResult:true,
                        func:(rst:any)=>{this.resolve(rst);},
                        result:result
                    });
                    this.resolve(result);
                },
                reject:(result:any)=>{
                    if(!promiseTimer) promiseTimer = setTimeout(executePromises);
                    promises.push({
                        setResult:true,
                        func:(rst:any)=>{this.reject(rst);},
                        result:result
                    });
                    this.resolve(result);
                },
            });
            
        }
        public then(doneHandler,failHandler,exHandler):Promise{
            if(doneHandler)this.done(doneHandler);
            if(failHandler) this.fail(failHandler);
            if(exHandler) this.catch(exHandler);
            return this;
        }
        
        public done(doneHandler:Function):Promise{
            let promise:any = this._innerPromiseObject;
            if(promise){
                if(promise.doneHandlers===true){
                    this.done = function(handler:Function){
                        handler.call(this,this._innerPromiseObject.result);return this;
                    }
                    doneHandler.call(this,this._innerPromiseObject.result);
                }else if(promise.doneHandlers===false){
                    this.done = (handler:Function):Promise=>{return this;}
                }
                return this;
            }
            if(!promise)promise = this._innerPromiseObject = {doneHandlers:[]};
            let doneHandlers :Array<Function> = promise.doneHandlers || (promise.doneHandlers=[]);
            doneHandlers.push(doneHandler);
            return this;
        }
        public fail(failHandler:Function):Promise{
            let promise:any = this._innerPromiseObject;
            if(promise){
                if(promise.failHandlers===true){
                    this.fail = function(handler:Function){
                        handler.call(this,this._innerPromiseObject.result);return this;
                    }
                    failHandler.call(this,this._innerPromiseObject.result);
                }else if(promise.doneHandlers===false){
                    this.fail = (handler:Function):Promise=>{return this;}
                }
                return this;
            }
            if(!promise) promise = this._innerPromiseObject = {failHandlers:[]};
            let failHandlers :Array<Function> = promise.failHandlers || (promise.failHandlers=[]);
            failHandlers.push(failHandler);
            return this;
        }
        public catch(exType:any,handler?:any):Promise{
            if(handler===undefined) handler = exType;
            let promise:any = this._innerPromiseObject;
            if(promise){
                if(promise.exceptionHandlers===true){
                    this.catch = function(handler:Function){
                        if(exType===handler){
                            handler.call(this,this._innerPromiseObject.result);return this;
                        }else{
                            if(this._innerPromiseObject.result instanceof exType){
                                handler.call(this,this._innerPromiseObject.result);return this;
                            }
                        }
                        
                    }
                    handler.call(this,this._innerPromiseObject.result);
                }else if(promise.exceptionHandlers===false){
                    this.catch = (handler:Function):Promise=>{return this;}
                }
                return this;
            }
            if(!promise) promise = this._innerPromiseObject = {exceptionHandlers:[]};
            let exceptionHandlers :Array<any> = promise.exceptionHandlers || (promise.exceptionHandlers=[]);
            exceptionHandlers.push({handler:handler,type:exType});
            return this;
        }
        public resolve(result?:any):Promise{
            let promise :any = this._innerPromiseObject ||(this._innerPromiseObject={});
            var doneHandlers:Array<Function> = promise.doneHandlers;
            promise.result = result;
            promise.doneHandlers = true;
            promise.failHandlers = null;
            if(doneHandlers){
                for(let i:number=0,j:number=doneHandlers.length;i<j;i++){
                    doneHandlers[i].call(this,result);
                }
            }
            this.reject = this.resolve = (r?:any):Promise=>{throw "Already resolved.";}
            return this;
        }
        public reject(result?:any):Promise{
            let promise :any = this._innerPromiseObject ||(this._innerPromiseObject={});
            var failHandlers:Array<Function> = promise.failHandlers;
            promise.result = result;
            promise.doneHandlers = null;
            promise.failHandlers = true;
            if(failHandlers){
                for(let i:number=0,j:number=failHandlers.length;i<j;i++){
                    failHandlers[i].call(this,result);
                }
            }
            this.reject = this.resolve = (r?:any):Promise=>{throw "Already rejected.";}
            return this;
        }

        public promise():IPromise{
            let self:Promise = this;
            return {
                then : function(done,fail,ex):IPromise{self.then(done,fail,ex);return this;},
                done:function(done):IPromise{self.done(done);return this;},
                fail:function(fail):IPromise{self.fail(fail);return this;},
                catch:function(type,handler):IPromise{self.catch(type,handler);return this;},
                promise:function():IPromise{return this;}
            };
        }
        
    }

    export class Request {
        public url:string;
        public headers :{[index:string]:string};
        public static ioFunc;
        public constructor(url:string){
            this.url = url;
        }
        public get():IPromise{
            var promise = new Promise();
            Request.ioFunc({url:this.url,method:"GET",headers:this.headers}).done((body,headers)=>{
                promise.resolve(new Response(this,body,headers));
            }).fail((ex)=>{
                promise.reject(ex);
            });
            return promise.promise();
        }
        public delete():IPromise{
            var promise = new Promise();
            Request.ioFunc({url:this.url,method:"DELETE",headers:this.headers}).done((body,headers)=>{
                promise.resolve(new Response(this,body,headers));
            }).fail((ex)=>{
                promise.reject(ex);
            });
            return promise.promise();
        }
        public post(data:any):IPromise{
            var promise = new Promise();
            Request.ioFunc({url:this.url,method:"POST",headers:this.headers,data:data}).done((body,headers)=>{
                promise.resolve(new Response(this,body,headers));
            }).fail((ex)=>{
                promise.reject(ex);
            });
            return promise.promise();
        }
        public put(data:any):IPromise{
            var promise = new Promise();
            Request.ioFunc({url:this.url,method:"PUT",headers:this.headers,data:data}).done((body,headers)=>{
                promise.resolve(new Response(this,body,headers));
            }).fail((ex)=>{
                promise.reject(ex);
            });
            return promise.promise();
        }
    }
    export class Response{
        public content:string;
        public headers:{[index:string]:string};
        public request:Request;
        public constructor(request:Request,content:string,headers:{[index:string]:string}){
            this.request = request;
            this.content = content;
            this.headers = headers;
        }
        public toJson():any{
            return JSON.parse(this.content);
        }
    }
    interface ICache{
        expireTime:number;
        expireInterval:number;
        value:any;
    }
    let caches :{[index:string]:ICache} = {};
    export class Cache
    {
        _caches:{[index:string]:ICache};
        interval:number;
        _timer:number;
        public constructor(interval?:number){
            this.interval = interval||60000;
        }
        public get(key:string):any{
            let item:ICache = this._caches[key];
            if(!item)return;
            item.expireTime = new Date().valueOf() + item.expireInterval;
            return item.value;
        }
        public put(key:string,value:any,expiry:Date|number){
            let item:ICache ={
                value:value,
                expireTime : expiry instanceof Date?expiry.valueOf():((new Date()).valueOf() + expiry),
                expireInterval: expiry instanceof Date?undefined:(expiry || 600000)
            };
            this._caches[key] = item;
            if(!this._timer){
                this._timer = setInterval(()=>{
                    this.clearExpired();
                },this.interval);
            }
            return this;
        }
        public delete(key:string){
            delete this._caches[key];
            let hasItems :boolean = false;
            for(let n in this._caches) {hasItems=true;break;}
            if(!hasItems){
                if(this._timer){ clearInterval(this._timer); this._timer =0;}
            }
            return true;
        }
        public clearExpired():void{
            let caches:{[index:string]:ICache} = this._caches;
            let newC :{[index:string]:ICache} ={};
            let now :number = new Date().valueOf();
            for(var n in caches){
                let item :ICache = caches[n];
                if(item.expireTime>=now){
                    newC[n] = item;
                }
            }
            this._caches = newC;
        }
    }
    export let cache:Cache = new Cache();
    
    export let Helper :any = {
        createElement:function(name:string):HTMLElement {return document.createElement(name);},
        appendScript:function(script:HTMLScriptElement|string){
            if(typeof script ==="string"){
                let scriptNode :HTMLScriptElement = Helper.createElement("script");
                scriptNode.type="text/javascript";scriptNode.innerText = script as string;
                script = scriptNode;
            }
            let heads:NodeListOf<HTMLHeadElement> = document.getElementsByTagName("head");
            if(heads && heads.length) {heads[0].appendChild(script as HTMLScriptElement);}
            else {document.body.appendChild(script as HTMLScriptElement);}
        },
        loadScript:function(url,callback){
            let scriptNode :any = Helper.createElement("script");
            scriptNode.type="text/javascript";

            scriptNode.src=url;
            if(callback){
                if(scriptNode.onload!==undefined){
                    scriptNode.onload = function(){ callback(scriptNode);}
                }else if(scriptNode.onreadystatechange){
                    scriptNode.onreadystatechange = function(){
                        if(scriptNode.readyState===4 || scriptNode.readyState==='complete'){
                            callback(scriptNode);
                        }
                    }
                }
                scriptNode.onerror = function(e){
                    callback(scriptNode,e||event);
                }
            }
            Helper.appendScript(scriptNode);
        },
        getUrl:function(url:string,callback:Function){
            if(url==="full"){
                return `
    <div y-view></div>
                <script type='javascript' y-controller>
Y.Controller.once({
    ready:function(view,model){

    }
});
                </script>
`;
            }
            if(url==="view"){
                return `<div>abc</div>`;
            }
        }

    };
    export interface IRoleLoader {
        (name: string,match:RegExpExecArray,self:Require): any;
    }

    export class Rule{
        public reg:RegExp; 
        public loader:IRoleLoader;
        constructor(rulereg:string | RegExp,loader:IRoleLoader){
            this.reg = typeof rulereg ==="string"?new RegExp(rulereg): rulereg;
            this.loader = loader; 
        }
    }
    enum RequireStates{
        Loading,
        Ready
    }
    class Require extends Promise{
        status:RequireStates;
        name:string;
        result:any;
        public constructor(name:string){
            super();
            this.name= name;
            this.status = RequireStates.Loading;
            for(let i:number=0,j:number = rules.length;i<j;i++){
                var rule = rules[i];
                var match = name.match(rule.reg);
                if(match){
                    rule.loader.call(this,name,match,this);
                    break;
                }
            }
            this.reject( name + " cannot match any rule.");
        }
        
    }
    var rules :Array<Rule>=[];

    let required:{[index:string]:Require} = {};
    export function require(depnames:Array<string>):IPromise{
        let c:number = depnames.length;
        let results:{[index:string]:any} = {};
        let ret :Promise = new Promise();
        for(let i:number=0,j:number = depnames.length;i<j;i++){
            var depname = depnames[i];
            var dep = required[depname] || (required[depname] = new Require(depname));
            dep.done((d:Require)=>{
                results[d.name] = d.result;
                if(--c==0) ret.resolve(results);
            });
        }
        return ret;
    }
    //loadModule({url:url}).done(function(module){});
    //
}