export namespace Y {
    "use strict";
    export class Controller{
        private opts:{[index:string]:any};
        private _super:Controller;
        private _lngtext:{[index:string]:string};
        public constructor(opts:{[index:string]:any},superior?:Controller){
            this.opts = opts;
            this._super = superior;
            this._lngtext = opts["@language"]; 
            let memberNameRegx :RegExp = /^[a-zA-Z][_a-zA-Z0-9]*$/;
            for(let n in opts){
                let fn:any = opts[n];
                if(typeof fn ==='function' && memberNameRegx.test(n)) this[n] = fn;
            }
        }
        public _text(key:string):string{
            let result :string = "";
            let ctrlr:Controller = this;
            
            while(ctrlr){
                let lng:{[index:string]:string} = ctrlr._lngtext;
                if(lng){
                    result = lng[key];
                    if(result!==undefined)return result;
                }
                ctrlr = ctrlr._super;
            }
            return key;
        }
        
        
    }
}