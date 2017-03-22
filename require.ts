export namespace Y {
    "use strict";
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
}