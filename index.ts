///<reference path="model.ts" />
///<reference path="assert.ts" />
import AM = require("./assert");
import _M = require("./model");
import Y = _M.Y;
import A = AM.Assert;
let modelTest={
    "Model Read/Write/Event":function(){
        let subject:Object={"myname":"yanyi"};
        let name :string="myname";
        let m:Y.Model = new Y.Model(name,subject);
        A.eq("yanyi",m.getValue());
        A.eq(subject,m.subject());
        A.eq(name,m.name());
        m.valuechange((sender:Y.IModelAccessor,evt:Y.ModelEvent)=>{
            //发送者是模型
            A.eq(m.$accessor,sender);
            A.eq(m,evt.model);
            A.eq("yiy",evt.value);
            A.eq("yanyi",evt.oldValue);
            A.eq(Y.ModelActions.change,evt.action);
        });
        m.setValue("yiy");
        A.eq("yiy",m.getValue());
        A.eq("yiy",subject["myname"]);
    },
    "Accessor Read/Write/Event":function(){
        let subject:Object={"myname":"yanyi"};
        let name :string="myname";
        let model : Y.Model = new Y.Model(name,subject);
        let m:Y.IModelAccessor = model.$accessor;
        A.eq(model,model.$model);
        A.eq(model,m.$model);
        A.eq(m,m.$accessor);
        A.eq(m,model.$accessor);
        A.eq("yanyi",(m as Function)());
        m.valuechange((sender:Y.IModelAccessor,evt:Y.ModelEvent)=>{
            //发送者是模型
            A.eq(model.$accessor,sender);
            A.eq(model,evt.model);
            A.eq("yiy",evt.value);
            A.eq("yanyi",evt.oldValue);
            A.eq(Y.ModelActions.change,evt.action);
        });
        m("yiy");
        A.eq("yiy",(m as Function)());
        A.eq("yiy",subject["myname"]);
        A.eq("yiy",m.toString());
    },
    "Member/Tree/Event progration":function(){
        let subjectObj:Object={};
        let userObj :any= {Alias:"yiy"};
        let profileObj:any ={Nick:"yi",Gender:"male"};
        let interestsObj:any ={football:true,tenis:true};
        userObj["Profile"] = profileObj;
        profileObj["Interests"] = interestsObj;
        subjectObj["User"]=userObj;
        let user :Y.Model = new Y.Model("User",subjectObj);
        A.eq("User",user.name());
        A.eq(userObj,user.getValue());
        let profile:Y.Model = user.prop("Profile",{});
        A.eq("Profile",profile.name());
        A.eq(profileObj,profile.getValue());
        A.eq(userObj,profile.subject());
        A.eq(user,profile.super());
        let interests :Y.Model = profile.prop("Interests",{});
        let football: Y.Model  = interests.prop("football",{});
        A.eq(user,football.root());
        A.eq(user,interests.root());
        A.eq(user,profile.root());
        let userEvtInvoked :boolean=false;
        user.valuechange((sender:Y.IModelAccessor,e:Y.ModelEvent)=>{
            A.eq(user.$accessor, sender);
            A.eq(Y.ModelActions.child,e.action);
            A.eq(userObj,e.value);
            let src : Y.ModelEvent = e.getSource();
            A.eq(Y.ModelActions.change,src.action);
            A.eq(profile,src.model);
            A.eq(newProfileObj,src.value);
            A.eq(profileObj,src.oldValue);
            userEvtInvoked = true;
        });
        let interestsEvtInvoked :boolean=false;
        interests.valuechange((sender:Y.IModelAccessor,e:Y.ModelEvent)=>{
            A.eq(interests.$accessor, sender);
            A.eq(Y.ModelActions.change,e.action);
            A.eq(newProfileObj.Interests,e.value);
            A.eq(interestsObj,e.oldValue);
            let src : Y.ModelEvent = e.getSource();
            A.eq(Y.ModelActions.change,src.action);
            A.eq(profile,src.model);
            A.eq(newProfileObj,src.value);
            A.eq(profileObj,src.oldValue);
            interestsEvtInvoked=true;
        });
        let footballEvtInvoked :boolean=false;
        football.valuechange((sender:Y.IModelAccessor,e:Y.ModelEvent)=>{
            A.eq(football.$accessor, sender);
            A.eq(Y.ModelActions.change,e.action);
            A.eq(newProfileObj.Interests.football,e.value);
            A.eq(interestsObj.football,e.oldValue);
            let directSource:Y.ModelEvent = e.getSource();
            A.eq(interests,directSource.model);
            A.eq(Y.ModelActions.change,directSource.action);
            A.eq(newProfileObj.Interests,directSource.value);
            A.eq(profileObj.Interests,directSource.oldValue);

            let src : Y.ModelEvent = e.getSource(true);
            A.eq(Y.ModelActions.change,src.action);
            A.eq(profile,src.model);
            A.eq(newProfileObj,src.value);
            A.eq(profileObj,src.oldValue);
            footballEvtInvoked = true;
        });
        var newProfileObj:any = {Nick:"yiy",Gender:"Secret",Interests:{football:false,tenis:false}};
        profile.setValue(newProfileObj);
        A.true(userEvtInvoked);
        A.true(interestsEvtInvoked);
        A.true(footballEvtInvoked);
        A.eq(newProfileObj.Interests,interests.getValue());
        A.eq(false,football.getValue());

        //Access
        let mU:any = user.$accessor;
        A.nnone(mU.Profile);
        A.nnone(mU.Profile.Interests);
        A.nnone(mU.Profile.Interests.football);
    },
    "Clone":function(){
        let userModel : Y.Model = new Y.Model();
        let profileModel :Y.Model = userModel.prop("Profile",null);
        let nameModel:Y.Model = userModel.prop("Name",null);
        let nickModel : Y.Model = profileModel.prop("Nick",null);
        let subject :any = {
            Name:"YIY",
            Profile:{
                Nick:"YI"
            }
        };
        let newModel : Y.Model = userModel.clone({"":subject});
        A.eq("YIY",newModel.prop("Name").getValue());
        let newProifle:Y.Model = newModel.prop("Profile");
        A.eq(subject.Profile,newProifle.getValue());
        let newNick :Y.Model = newProifle.prop("Nick");
        A.eq("YI",newNick.getValue());
    },
    "Push":function(){
        let model : Y.Model = new Y.Model();
        model.toArray();
        model.push(5);
        let arr:Array<number> = model.getValue() as Array<number>;
        A.nnone(arr);
        A.eq(5,arr[0]);
        A.eq(1, arr.length);
        A.eq(1, model.count());
        let acc : Y.IModelAccessor = model.$accessor;
        acc.push(6);
        A.eq(6,arr[1]);
        A.eq(2, arr.length);
        A.eq(2, model.count());
    },
    "itemProto/getItem/setItem":function(){
        let model : Y.Model = new Y.Model();
        let itemProto : Y.Model = model.toArray();
        let arr :any = model.getValue();
        itemProto.prop("Id",null);
        itemProto.prop("Name",null);
        let itemValue:any = {Id:1,Name:"yiy"};
        let set0Invoked:boolean = false;
        let set0:Y.IModelValueChangeHandler = (sender:Y.IModelAccessor,e:Y.ModelEvent):void=>{
            A.eq(model.$accessor,sender);
            A.eq(Y.ModelActions.child,e.action);
            A.eq(arr,e.value);
            let src:Y.ModelEvent = e.getSource(true);
            A.eq(Y.ModelActions.add,src.action);
            A.eq(0,src.index);
            A.undefined(src.oldValue);
            A.eq(itemValue,src.value);
            set0Invoked = true;
        };
        model.$accessor.valuechange(set0);
        model.setItem(0,itemValue);
        A.true(set0Invoked);
        let item0:Y.Model = model.getItem(0,true) as Y.Model;
        A.nnone(item0.prop("Id"));
        A.eq(1,(item0.$accessor as any).Id());
        A.eq("yiy",item0.prop("Name").getValue());
        A.eq(itemValue,model.getItem(0));

        //reset
        model.valuechange(set0,true);
        let item0EvtInvoked:boolean = false;
        let newItemValue :any = {Id:2,Name:"YI"};
        set0Invoked=false;
        set0 = (sender:Y.IModelAccessor,e:Y.ModelEvent):void=>{
            set0Invoked=true;
            A.eq(model.$accessor,sender);
            A.eq(Y.ModelActions.child,e.action);
            A.eq(arr,e.value);
            let src:Y.ModelEvent = e.getSource(true);
            A.eq(Y.ModelActions.change,src.action);
            A.eq(0,src.index);
            A.eq(newItemValue,src.value);
            A.eq(itemValue,src.oldValue);
            set0Invoked = true;
        };
        item0.valuechange((sender:Y.IModelAccessor,e:Y.ModelEvent)=>{
            item0EvtInvoked = true;
            A.eq(item0.$accessor,sender);
            A.eq(Y.ModelActions.change,e.action);
            A.eq(e.oldValue,itemValue);
            A.eq(e.value,newItemValue);
            A.eq(0,e.index);
        });
        model.setItem(0,newItemValue);
        A.eq(2,(item0.$accessor as any).Id());
        A.eq("YI",item0.prop("Name").getValue());
        A.eq(newItemValue,model.getItem(0));
    }
};
A.test(modelTest,"Model");
