"use strict";
///<reference path="model.ts" />
///<reference path="assert.ts" />
var AM = require("./assert");
var _M = require("./model");
var Y = _M.Y;
var A = AM.Assert;
var modelTest = {
    "Model Read/Write/Event": function () {
        var subject = { "myname": "yanyi" };
        var name = "myname";
        var m = new Y.Model(name, subject);
        A.eq("yanyi", m.getValue());
        A.eq(subject, m.subject());
        A.eq(name, m.name());
        m.valuechange(function (sender, evt) {
            //发送者是模型
            A.eq(m.$accessor, sender);
            A.eq(m, evt.model);
            A.eq("yiy", evt.value);
            A.eq("yanyi", evt.oldValue);
            A.eq(Y.ModelActions.change, evt.action);
        });
        m.setValue("yiy");
        A.eq("yiy", m.getValue());
        A.eq("yiy", subject["myname"]);
    },
    "Accessor Read/Write/Event": function () {
        var subject = { "myname": "yanyi" };
        var name = "myname";
        var model = new Y.Model(name, subject);
        var m = model.$accessor;
        A.eq(model, model.$model);
        A.eq(model, m.$model);
        A.eq(m, m.$accessor);
        A.eq(m, model.$accessor);
        A.eq("yanyi", m());
        m.valuechange(function (sender, evt) {
            //发送者是模型
            A.eq(model.$accessor, sender);
            A.eq(model, evt.model);
            A.eq("yiy", evt.value);
            A.eq("yanyi", evt.oldValue);
            A.eq(Y.ModelActions.change, evt.action);
        });
        m("yiy");
        A.eq("yiy", m());
        A.eq("yiy", subject["myname"]);
        A.eq("yiy", m.toString());
    },
    "Member&Tree&Event progration": function () {
        var subjectObj = {};
        var userObj = { Alias: "yiy" };
        var profileObj = { Nick: "yi", Gender: "male" };
        var interestsObj = { football: true, tenis: true };
        userObj["Profile"] = profileObj;
        profileObj["Interests"] = interestsObj;
        subjectObj["User"] = userObj;
        var user = new Y.Model("User", subjectObj);
        A.eq("User", user.name());
        A.eq(userObj, user.getValue());
        var profile = user.prop("Profile", {});
        A.eq("Profile", profile.name());
        A.eq(profileObj, profile.getValue());
        A.eq(userObj, profile.subject());
        A.eq(user, profile["super"]());
        var interests = profile.prop("Interests", {});
        var football = interests.prop("football", {});
        A.eq(user, football.root());
        A.eq(user, interests.root());
        A.eq(user, profile.root());
        var userEvtInvoked = false;
        user.valuechange(function (sender, e) {
            A.eq(user.$accessor, sender);
            A.eq(Y.ModelActions.child, e.action);
            A.eq(userObj, e.value);
            var src = e.getSource();
            A.eq(Y.ModelActions.change, src.action);
            A.eq(profile, src.model);
            A.eq(newProfileObj, src.value);
            A.eq(profileObj, src.oldValue);
            userEvtInvoked = true;
        });
        var interestsEvtInvoked = false;
        interests.valuechange(function (sender, e) {
            A.eq(interests.$accessor, sender);
            A.eq(Y.ModelActions.change, e.action);
            A.eq(newProfileObj.Interests, e.value);
            A.eq(interestsObj, e.oldValue);
            var src = e.getSource();
            A.eq(Y.ModelActions.change, src.action);
            A.eq(profile, src.model);
            A.eq(newProfileObj, src.value);
            A.eq(profileObj, src.oldValue);
            interestsEvtInvoked = true;
        });
        var footballEvtInvoked = false;
        football.valuechange(function (sender, e) {
            A.eq(football.$accessor, sender);
            A.eq(Y.ModelActions.change, e.action);
            A.eq(newProfileObj.Interests.football, e.value);
            A.eq(interestsObj.football, e.oldValue);
            var directSource = e.getSource();
            A.eq(interests, directSource.model);
            A.eq(Y.ModelActions.change, directSource.action);
            A.eq(newProfileObj.Interests, directSource.value);
            A.eq(profileObj.Interests, directSource.oldValue);
            var src = e.getSource(true);
            A.eq(Y.ModelActions.change, src.action);
            A.eq(profile, src.model);
            A.eq(newProfileObj, src.value);
            A.eq(profileObj, src.oldValue);
            footballEvtInvoked = true;
        });
        var newProfileObj = { Nick: "yiy", Gender: "Secret", Interests: { football: false, tenis: false } };
        profile.setValue(newProfileObj);
        A["true"](userEvtInvoked);
        A["true"](interestsEvtInvoked);
        A["true"](footballEvtInvoked);
        A.eq(newProfileObj.Interests, interests.getValue());
        A.eq(false, football.getValue());
        //Access
        var mU = user.$accessor;
        A.nnone(mU.Profile);
        A.nnone(mU.Profile.Interests);
        A.nnone(mU.Profile.Interests.football);
    },
    "Clone": function () {
        var userModel = new Y.Model();
        var profileModel = userModel.prop("Profile", null);
        var nameModel = userModel.prop("Name", null);
        var nickModel = profileModel.prop("Nick", null);
        var subject = {
            Name: "YIY",
            Profile: {
                Nick: "YI"
            }
        };
        var newModel = userModel.clone({ "": subject });
        A.eq("YIY", newModel.prop("Name").getValue());
        var newProifle = newModel.prop("Profile");
        A.eq(subject.Profile, newProifle.getValue());
        var newNick = newProifle.prop("Nick");
        A.eq("YI", newNick.getValue());
    },
    "Push": function () {
        var model = new Y.Model();
        model.toArray();
        model.push(5);
        var arr = model.getValue();
        A.nnone(arr);
        A.eq(5, arr[0]);
        A.eq(1, arr.length);
        A.eq(1, model.count());
        var acc = model.$accessor;
        acc.push(6);
        A.eq(6, arr[1]);
        A.eq(2, arr.length);
        A.eq(2, model.count());
    },
    "itemProto&getItemAt&setItemAt": function () {
        var model = new Y.Model();
        var itemProto = model.toArray();
        var arr = model.getValue();
        itemProto.prop("Id", null);
        itemProto.prop("Name", null);
        var itemValue = { Id: 1, Name: "yiy" };
        var set0Invoked = false;
        var set0 = function (sender, e) {
            A.eq(model.$accessor, sender);
            A.eq(Y.ModelActions.child, e.action);
            A.eq(arr, e.value);
            var src = e.getSource(true);
            A.eq(Y.ModelActions.add, src.action);
            A.eq(0, src.index);
            A.undefined(src.oldValue);
            A.eq(itemValue, src.value);
            set0Invoked = true;
        };
        model.$accessor.valuechange(set0);
        model.setItem(0, itemValue);
        A["true"](set0Invoked);
        var item0 = model.getItem(0, true);
        A.nnone(item0.prop("Id"));
        A.eq(1, item0.$accessor.Id());
        A.eq("yiy", item0.prop("Name").getValue());
        A.eq(itemValue, model.getItem(0));
        //reset
        model.valuechange(set0, true);
        var item0EvtInvoked = false;
        var newItemValue = { Id: 2, Name: "YI" };
        set0Invoked = false;
        set0 = function (sender, e) {
            set0Invoked = true;
            A.eq(model.$accessor, sender);
            A.eq(Y.ModelActions.child, e.action);
            A.eq(arr, e.value);
            var src = e.getSource(true);
            A.eq(Y.ModelActions.change, src.action);
            A.eq(0, src.index);
            A.eq(newItemValue, src.value);
            A.eq(itemValue, src.oldValue);
            set0Invoked = true;
        };
        item0.valuechange(function (sender, e) {
            item0EvtInvoked = true;
            A.eq(item0.$accessor, sender);
            A.eq(Y.ModelActions.change, e.action);
            A.eq(e.oldValue, itemValue);
            A.eq(e.value, newItemValue);
            A.eq(0, e.index);
        });
        model.setItem(0, newItemValue);
        A.eq(2, item0.$accessor.Id());
        A.eq("YI", item0.prop("Name").getValue());
        A.eq(newItemValue, model.getItem(0));
    }
};
A.test(modelTest, "Model");
