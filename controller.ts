export namespace Y {
    "use strict";
    export interface IControllerDoneHandler{
        (controller:IController):IController;
    }
    export interface IController{
        view:HTMLElement;
        model:any;
        done(handler:IControllerDoneHandler):IController;
        langtext(key:string):string;
        

    }
    
    export class Controller{
        static currentProto:any;
        
        static retriveOrRegister(opts:any):any{
            let id:string = opts["@id"];
            if(!id){
                opts["@resuseable"]=false;
                return buildControllerType(opts);
            } 
            let existed = controllerTypes[id];
            if(!opts["-register"] && existed){
                return existed;
            }
            let controllerType = buildControllerType(opts);
            controllerTypes[id] = controllerType;
            checkExpireControllerTypes();
        }

    }
    
    function buildControllerType(opts:any){
        let result:Function = function(opts){
            if(this.init) this.init(opts);
            this.super = opts.super;
            this.done(function(){
                if(this["@reuseable"]){
                    if(this.view)this.view = this.view.cloneNode();

                    if(this.binder) {
                        this.model = this.model.clone();
                        this.binder(this.view,this.model,this);
                    }
                }
                
                if(opts.area){
                    opts.area.innerHTML = "";
                    opts.area.appendChild(this.view);
                }
                if(this.load) this.load(this.view,this.model.$accessor);
            });
            
        }
        let proto = result.prototype ={
            super:undefined,//Controller,
            view:undefined,//HTMLElement,
            model:undefined,//any,
            binder:undefined,
            _doneHandlers:undefined,//Array<IControllerDoneHandler>|boolean;
            lang:undefined,//{[index:string]:string};
            lngtext: function(key:string):string{
                let result :string = "";
                let ctrlr:any = this;
                
                while(ctrlr){
                    let lng:{[index:string]:string} = ctrlr._lngtext;
                    if(lng){
                        result = lng[key];
                        if(result!==undefined)return result;
                    }
                    ctrlr = ctrlr._super;
                }
                return key;
            },
            done: function(handler:IControllerDoneHandler):IController{
                if(proto._doneHandlers===true){ 
                    handler.call(this as IController,this as IController);
                    this.done = (handler:IControllerDoneHandler):IController=>{
                        handler.call(this as IController,this as IController);
                        return this as IController;
                    };
                    return this as IController;
                }
                proto._doneHandlers.push({handler:handler,self:this});return this as IController;
            }
        };

        let resolve = function(){
            if(--asyncTaskCount>0)return;
            if((Y as any).view && proto.view){
                var binder = (Y as any).view.makeBinder(proto.view);
                proto.binder = binder;
                proto.model = binder.model;
            }
            let doneHandlers = proto._doneHandlers;
            for(let i:number=0,j:number = doneHandlers.length;i<j;i++){
                let arg = doneHandlers[i];
                arg.handler.call(arg.self,arg.self);
            }
        }
        if(opts.content){
            loadMvc(opts.content,proto);
        }
        let asyncTaskCount:number=0;
        if(opts.url){
            proto._doneHandlers=[];
            asyncTaskCount++;
            helper.getUrl(opts.url,function(content){
               loadMvc(content,proto);
               resolve();
            });
        }else {
            if(opts.viewUrl){
                proto._doneHandlers=[];
                asyncTaskCount++;
                helper.getUrl(opts.url,function(content){
                    containerElement.innerHTML = content;
                    let children:NodeList = containerElement.childNodes;
                    let viewElem :HTMLElement = null;
                    let scriptElem :HTMLScriptElement=null;
                    for(let i:number=0,j:number=children.length;i<j;i++){
                        let child :HTMLElement = children[i] as HTMLElement;
                        if(child.getAttribute("y-view")){
                            viewElem = child;break;
                        }
                        
                    }
                    proto.view = viewElem;
                    resolve();
                });
            }
            if(opts.controllerUrl){
                asyncTaskCount++;
                helper.loadScript(opts.controllerUrl,function(){
                    resolve();
                });
            }
        }
        if(opts.langUrl){
            asyncTaskCount++;
            helper.getUrl(opts.url,function(content){
                proto.lang = JSON.parse(content);
                resolve();
            });
        }
        if(opts.proto){
            for(var n in opts.proto){
                proto[n] = opts.proto;
            }
        }
        if(opts.view){
            proto.view = opts.view;
        }
        if(asyncTaskCount===0) {
            proto._doneHandlers=true;
        }
        return result;
    }
    function loadMvc(content,proto){
        if(!containerElement) {containerElement = helper.createElement?helper.createElement("div"):document.createElement("div");}
        containerElement.innerHTML = content;
        let children:NodeList = containerElement.childNodes;
        let viewElem :HTMLElement = null;
        let scriptElem :HTMLScriptElement=null;
        for(let i:number=0,j:number=children.length;i<j;i++){
            let child :HTMLElement = children[i] as HTMLElement;
            if(child.getAttribute("y-view")){
                viewElem = child;
            }
            if(child.getAttribute("y-controller")){
                scriptElem = child as HTMLScriptElement;
            }
        }
        proto.view = viewElem;
        Y.Controller.currentProto=null;
        helper.appendScript(scriptElem);
        var cProto = Y.Controller.currentProto;
        for(let n in cProto){
            proto[n] = cProto;
        }
    }
    let controllerTypes : {[index:string]:Function}={};
    let dropExpireControllerTypeTimer:number;
    function dropExiredControllerTypes(){
        let types :{[index:string]:Function}= {};
        let now:number = new Date().valueOf();
        let aliveCount:number = 0;
        for(var n in controllerTypes){
            var ctype:any = controllerTypes[n] ;
            if(ctype.expireTime>=now){
                types[n] = ctype;aliveCount++;
            }else{
                if(ctype.dispose) ctype.dispose();
            }
        }
        controllerTypes = types;
        if(aliveCount===0 && dropExpireControllerTypeTimer) {
            clearInterval(dropExpireControllerTypeTimer);
            dropExpireControllerTypeTimer=0;
        }
    }
    function checkExpireControllerTypes(){
        if(!dropExpireControllerTypeTimer){
            dropExpireControllerTypeTimer = setInterval(dropExiredControllerTypes,Controller["@expireCheckInterval"]||5000);
        }
    }
    enum CacheTypes{
        //不缓存
        noCache,
        //永不超期
        forever,
        //缓存一段时间
        cache
    }

    let containerElement :HTMLElement=null;

    let helper :any = {
        createElement:function(name:string):HTMLElement {return document.createElement(name);},
        appendScript:function(script:HTMLScriptElement|string){
            if(typeof script ==="string"){
                let scriptNode :HTMLScriptElement = helper.createElement("script");
                scriptNode.type="text/javascript";scriptNode.innerText = script as string;
                script = scriptNode;
            }
            let heads:NodeListOf<HTMLHeadElement> = document.getElementsByTagName("head");
            if(heads && heads.length) {heads[0].appendChild(script as HTMLScriptElement);}
            else {document.body.appendChild(script as HTMLScriptElement);}
        },
        loadScript:function(url,callback){
            let scriptNode :any = helper.createElement("script");
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
            helper.appendScript(scriptNode);
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
    
    //是否有注册的控制器
    function hasRegisteredControlller(){
        for(var n in controllerTypes) return true;
        return false;
    }
    
    
    
}