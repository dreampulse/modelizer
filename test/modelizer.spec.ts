/// <reference path="../definitions/node.d.ts" />
/// <reference path="../definitions/mocha.d.ts" />

var assert = require("assert");

import modelizer = require('../lib/model');



class User extends modelizer.Obj {
//  constructor() {
//      super("users", appCollection);
//  }

    name : string;
    email : string;
}


describe('modelizer', function() {

    var appChannel : modelizer.LocalChannel;
    var remoteCannel : modelizer.LocalChannel;

    var appCollection : modelizer.Collection;
    var appTransport : modelizer.ClientServerImpl;
    var appInbound : modelizer.Inbound;


    var remoteCollection : modelizer.Collection;
    var remoteTransport : modelizer.ServerClientImpl;
    var remoteInbound : modelizer.Inbound;

    beforeEach(function() {
        //console.log(" (o) init modelizer");

        appChannel = new modelizer.LocalChannel();
        remoteCannel = new modelizer.LocalChannel();

        appCollection = new modelizer.Collection();
        appTransport = new modelizer.ClientServerImpl(appChannel, appCollection);
        appInbound = new modelizer.Inbound(appTransport);


        remoteCollection = new modelizer.Collection();
        remoteTransport = new modelizer.ServerClientImpl(remoteCannel, remoteCollection);
        remoteInbound = new modelizer.Inbound(remoteTransport);

        appChannel.inbound = remoteInbound;
        remoteCannel.inbound = appInbound;

    });


    describe('tests with one sample object', function() {

        var user : User;

        beforeEach(function () {
            //console.log(' (o) create test object');
            user = new User("user", appCollection);
            user.name = "jonathan";
            user.email = "modelizer@dreampulse.de";
            user.save();
        });

        it("should store object in local collection", function() {
            assert.equal(appCollection.objs[user.id].rev.token, user.rev.token, "not same token");
            assert.equal(appCollection.objs[user.id].rev.seq, user.rev.seq, "not same seq number");
        });

        it("should store the object in remote collection", function() {
            var remoteObj = <User>remoteCollection.objs[user.id];
            assert.equal(remoteObj.rev.token, user.rev.token, "not same obj");
            assert.equal(remoteObj.rev.seq, user.rev.seq, "not same seq number");

            assert.equal(remoteObj.name, user.name, "not same attribute");
            assert.equal(remoteObj.email, user.email, "not same attribute");
        });
    });


});



