export class AssertException{
    message:string;
    public constructor(msg:string){
        this.message = msg;
    }
    toString():string{return this.message;}
}
export class Assert{
    static test(testCls:Object,name?:string):void{
        console.log("==Test start for " + (name||"??"));
        for(var n in testCls){
            if(!testCls.hasOwnProperty(n))continue;
            let member:any = testCls[n];
            if(typeof member !=="function")continue;
            if(n[0]==="_")continue;
            (member as Function).call(testCls);
            console.log(n+" pass.");
        }
        console.log("==Test end for " +( name||"??"));
    }
    static eq(expected :any,actual:any,message?:string):void{
        if(expected!==actual) {
            throw new AssertException(message|| `Expect ${expected} , but actual is ${actual}`);
        }
    }
    static neq(expected :any,actual:any,message?:string):void{
        if(expected===actual) {
            throw new AssertException(message|| `Expect ${expected} and ${actual} are not equal.`);
        }
    }
    static nnone(actual:any,message?:string):void{
        if(!actual) {
            throw new AssertException(message|| `Expect a non-null-undefined-''-0 value .`);
        }
    }
    static none(actual:any,message?:string):void{
        if(actual) {
            throw new AssertException(message|| `Expect none value .`);
        }
    }

    static nnull(actual:any,message?:string):void{
        if(actual===null) {
            throw new AssertException(message|| `Expect not null .`);
        }
    }
    static null(actual:any,message?:string):void{
        if(actual!==null) {
            throw new AssertException(message|| `Expect  null .`);
        }
    }
    static undefined(actual:any,message?:string):void{
        if(actual!==undefined) {
            throw new AssertException(message|| `Expect not undefined .`);
        }
    }
    static nundefined(actual:any,message?:string):void{
        if(actual===undefined) {
            throw new AssertException(message|| `Expect defined .`);
        }
    }

    static true(actual:any,message?:string):void{
        if(actual!==true) {
            throw new AssertException(message|| `Expect true .`);
        }
    }
    static false(actual:any,message?:string):void{
        if(actual!==false) {
            throw new AssertException(message|| `Expect false .`);
        }
    }
}