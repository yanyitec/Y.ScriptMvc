"use strict";
var AssertException = (function () {
    function AssertException(msg) {
        this.message = msg;
    }
    AssertException.prototype.toString = function () { return this.message; };
    return AssertException;
}());
exports.AssertException = AssertException;
var Assert = (function () {
    function Assert() {
    }
    Assert.test = function (testCls, name) {
        console.log("==Test start for " + (name || "??"));
        for (var n in testCls) {
            if (!testCls.hasOwnProperty(n))
                continue;
            var member = testCls[n];
            if (typeof member !== "function")
                continue;
            if (n[0] === "_")
                continue;
            member.call(testCls);
            console.log(n + " pass.");
        }
        console.log("==Test end for " + (name || "??"));
    };
    Assert.eq = function (expected, actual, message) {
        if (expected !== actual) {
            throw new AssertException(message || "Expect " + expected + " , but actual is " + actual);
        }
    };
    Assert.neq = function (expected, actual, message) {
        if (expected === actual) {
            throw new AssertException(message || "Expect " + expected + " and " + actual + " are not equal.");
        }
    };
    Assert.nnone = function (actual, message) {
        if (!actual) {
            throw new AssertException(message || "Expect a non-null-undefined-''-0 value .");
        }
    };
    Assert.none = function (actual, message) {
        if (actual) {
            throw new AssertException(message || "Expect none value .");
        }
    };
    Assert.nnull = function (actual, message) {
        if (actual === null) {
            throw new AssertException(message || "Expect not null .");
        }
    };
    Assert["null"] = function (actual, message) {
        if (actual !== null) {
            throw new AssertException(message || "Expect  null .");
        }
    };
    Assert.undefined = function (actual, message) {
        if (actual !== undefined) {
            throw new AssertException(message || "Expect not undefined .");
        }
    };
    Assert.nundefined = function (actual, message) {
        if (actual === undefined) {
            throw new AssertException(message || "Expect defined .");
        }
    };
    Assert["true"] = function (actual, message) {
        if (actual !== true) {
            throw new AssertException(message || "Expect true .");
        }
    };
    Assert["false"] = function (actual, message) {
        if (actual !== false) {
            throw new AssertException(message || "Expect false .");
        }
    };
    return Assert;
}());
exports.Assert = Assert;
