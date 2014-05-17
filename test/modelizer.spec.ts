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

    var appChannel : modelizer.Transport.LocalChannel;
    var app2Channel : modelizer.Transport.LocalChannel;
    var remoteCannel : modelizer.Transport.LocalChannel;

    // The Client
    var appCollection : modelizer.Collection;
    var appTransport : modelizer.Transport.ClientServerImpl;
    var appInbound : modelizer.Transport.Inbound;

    // The 2nd Client
    var app2Collection : modelizer.Collection;
    var app2Transport : modelizer.Transport.ClientServerImpl;
    var app2Inbound : modelizer.Transport.Inbound;

    // The Server
    var remoteCollection : modelizer.Collection;
    var remoteTransport : modelizer.Transport.ServerClientImpl;
    var remoteInbound : modelizer.Transport.Inbound;

    beforeEach(function() {
        //console.log(" (o) init modelizer");

        appChannel = new modelizer.Transport.LocalChannel();
        app2Channel = new modelizer.Transport.LocalChannel();
        remoteCannel = new modelizer.Transport.LocalChannel();

        appCollection = new modelizer.Collection();
        appTransport = new modelizer.Transport.ClientServerImpl(appChannel, appCollection);
        appInbound = new modelizer.Transport.Inbound(appTransport);

        app2Collection = new modelizer.Collection();
        app2Transport = new modelizer.Transport.ClientServerImpl(app2Channel, app2Collection);
        app2Inbound = new modelizer.Transport.Inbound(app2Transport);

        remoteCollection = new modelizer.Collection();
        remoteTransport = new modelizer.Transport.ServerClientImpl(remoteCannel, remoteCollection);
        remoteInbound = new modelizer.Transport.Inbound(remoteTransport);

        // connect channels
        appChannel.inbound.push(remoteInbound);
        app2Channel.inbound.push(remoteInbound);

        remoteCannel.inbound.push(appInbound);
        remoteCannel.inbound.push(app2Inbound);
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

        it("the collection of the 2nd client should be empty", function() {
            assert.deepEqual(app2Collection.objs, {});
        });
    });

    describe('view tests', function() {

        var user1 : User;
        var user2 : User;

        var user1appView : modelizer.View;
        var user1remoteView : modelizer.View;

        beforeEach(function() {
            user1 = new User("user", appCollection);
            user1.name = "user1";
            user1.email = "test@dreampulse.de";
            user1.save();

            user2 = new User("user", appCollection);
            user2.name = "user2";
            user2.email = "test@dreampulse.de";
            user2.save();

            var map = function(obj : modelizer.Obj, emit : (key:string, obj:modelizer.Obj) => void) {
                if (obj.type === "user") {
                    var user = <User>obj;
                    if (user.name === "user1") {
                        emit(user.id, user);
                    }
                };
            };

            user1appView = new modelizer.View("user1View", map, appCollection);
            user1remoteView = new modelizer.View("user1View", map, remoteCollection);

            appCollection.syncViews();
        });

        it("should return view objects", function(done){
            user1appView.bind( (objs) => {
                for (var key in objs) {
                    var user = <User>objs[key];
                    if (user.type === "user" && user.name === "user1")
                        done();
                    else done(new Error("wrong view result"));
                }
            });
        });

    });

    describe("testing storage", function() {
        var user : User;

        it("should store everything in mongodb", function(done) {
            remoteCollection.setStore(new modelizer.Storage.MongoStorage("mongodb://127.0.0.1:27017/testModelizer2", "theCollection", remoteCollection))
                .then(function () {
                    user = new User("user", appCollection);
                    user.name = "user1";
                    user.email = "test@dreampulse.de";
                    user.save();

                    done();
                });
        });
    });


});



