var ObjectId = (function () {
    var cnt = -1;
    return function () {
        cnt += 1;
        return "id:" + cnt;
    };
})();

// reicht alles einfach weiter
var LocalChannel = (function () {
    function LocalChannel(inbound) {
        this.inbound = inbound;
    }
    LocalChannel.prototype.emit = function (cmd, msg) {
        this.inbound.on(cmd, msg);
    };
    return LocalChannel;
})();
exports.LocalChannel = LocalChannel;

// Eingehender Kommunikationskanal
var Inbound = (function () {
    function Inbound(transport) {
        this.transport = transport;
    }
    Inbound.prototype.createObjectFromJSON = function (objJSON) {
        var revObj = JSON.parse(objJSON);
        var obj = new Obj(revObj.type, this.transport.collection);

        for (var key in revObj) {
            if (revObj.hasOwnProperty(key)) {
                obj[key] = revObj[key];
            }
        }

        return obj;
    };

    Inbound.prototype.on = function (cmd, msg) {
        if (cmd === 'update') {
            this.transport.receiveUpdate(this.createObjectFromJSON(msg));
        } else if (cmd === 'create') {
            this.transport.receiveCreate(this.createObjectFromJSON(msg));
        } else if (cmd === 'subscribe') {
            this.transport.receiveSubscribe(msg);
        } else {
            throw new Error("unkown command! " + cmd);
        }
    };
    return Inbound;
})();
exports.Inbound = Inbound;

// Ausgehender Kommunikationskanal
var Outbound = (function () {
    function Outbound(out) {
        this.out = out;
    }
    Outbound.prototype.sendUpdate = function (obj) {
        var objJSON = obj.toJSON();
        this.out.emit("update", objJSON);
    };

    Outbound.prototype.sendCreate = function (obj) {
        var objJSON = obj.toJSON();
        this.out.emit("create", objJSON);
    };

    Outbound.prototype.sendSubscribe = function (viewName) {
        this.out.emit("subscribe", viewName);
    };
    return Outbound;
})();
exports.Outbound = Outbound;

// The communication from the Client to the Server
var ClientServerImpl = (function () {
    function ClientServerImpl(outChannel, collection) {
        this.out = new Outbound(outChannel);
        this.collection = collection;
        this.collection.transport = this;
    }
    ClientServerImpl.prototype.sendUpdate = function (obj) {
        //console.log("client - sendUpdate()");
        this.out.sendUpdate(obj);
    };

    ClientServerImpl.prototype.sendCreate = function (obj) {
        //console.log("client - createUpdate()");
        this.out.sendCreate(obj);
    };

    ClientServerImpl.prototype.sendViewUpdate = function (viewName, obj) {
        //this.out.sendViewUpdate(viewName, obj);
    };

    ClientServerImpl.prototype.sendSubscribe = function (viewName) {
        this.out.sendSubscribe(viewName);
    };

    ClientServerImpl.prototype.receiveUpdate = function (obj) {
        //console.log("client - receiveUpdate()");
        this.collection.update(obj);
    };

    ClientServerImpl.prototype.receiveCreate = function (obj) {
        //console.log("client - receiveCreate()");
        this.collection.create(obj);
    };
    ClientServerImpl.prototype.receiveSubscribe = function (viewName) {
        // noting to do for the client
    };
    return ClientServerImpl;
})();
exports.ClientServerImpl = ClientServerImpl;

// The communication from the Server to the Client
var ServerClientImpl = (function () {
    function ServerClientImpl(outChannel, collection) {
        this.subscribedViews = {};
        this.out = new Outbound(outChannel);
        this.collection = collection;
        this.collection.transport = this;
    }
    ServerClientImpl.prototype.sendUpdate = function (obj) {
        // do noting
    };

    ServerClientImpl.prototype.sendCreate = function (obj) {
        // do noting
    };

    ServerClientImpl.prototype.sendViewUpdate = function (viewName, obj) {
        //console.log("server - sendViewUpdate()");
        if (this.subscribedViews.hasOwnProperty(viewName)) {
            this.out.sendUpdate(obj);
        }
    };

    ServerClientImpl.prototype.sendSubscribe = function (viewName) {
        // do noting
    };

    ServerClientImpl.prototype.receiveUpdate = function (obj) {
        //console.log("server - receiveUpdate()");
        this.collection.update(obj);
    };

    ServerClientImpl.prototype.receiveCreate = function (obj) {
        //console.log("server - receiveCreate()");
        this.collection.create(obj);
    };
    ServerClientImpl.prototype.receiveSubscribe = function (viewName) {
        //console.log("receiveSubscribe", viewName);
        this.subscribedViews[viewName] = null;
    };
    return ServerClientImpl;
})();
exports.ServerClientImpl = ServerClientImpl;

var View = (function () {
    function View(name, map, collection) {
        // alle View-Objekte
        this.objs = {};
        // Welche Objekt zum konstruieren eines View-Objects benötigt werden
        this.referencedObjsForObjs = {};
        // Objekte von denen die View abhängt
        this.referencedObjsForView = {};
        this.name = name;
        this.collection = collection;
        this.map = map;
        this.collection.addView(this);

        // definition of the emit function
        var self = this;
        this.emit = function (key, obj) {
            self.objs[key] = obj;
            self.collection.transport.sendViewUpdate(self.name, obj);
            self.referencedObjsForObjs[obj.id].forEach(function (ref_id) {
                //console.log("update for referenced objs", ref_id);
                self.collection.transport.sendViewUpdate(self.name, self.referencedObjsForView[ref_id]);
            });
            self.changed();
        };

        // get function for resolving references in map-function
        this.getObj = function (viewObj) {
            // clear
            if (self.referencedObjsForObjs[viewObj.id]) {
                self.referencedObjsForObjs[viewObj.id].forEach(function (id) {
                    delete self.referencedObjsForView[id];
                });
            }
            self.referencedObjsForObjs[viewObj.id] = [];

            return function (id) {
                var obj = self.collection.getObject(id);

                self.referencedObjsForObjs[viewObj.id].push(id);
                self.referencedObjsForView[id] = viewObj;

                return obj;
            };
        };
    }
    // ein object hat sich verändert
    View.prototype.update = function (obj) {
        //console.log("update view", this.name, obj.toJSON());
        this.map(obj, this.emit, this.getObj(obj));

        // an referenced object has changed
        if (this.referencedObjsForView[obj.id]) {
            this.referencedObjsForView[obj.id] = obj;
            this.collection.transport.sendViewUpdate(this.name, obj);
        }
    };

    View.prototype.create = function (obj) {
        this.update(obj);
    };

    View.prototype.delete = function (id) {
        if (this.objs[id])
            delete this.objs[id];
        this.changed();
    };

    View.prototype.bind = function (to) {
        this.binding = to;
        this.collection.transport.sendSubscribe(this.name);
        this.binding(this.objs);
    };

    View.prototype.changed = function () {
        if (this.binding)
            this.binding(this.objs);
    };
    return View;
})();
exports.View = View;

var Collection = (function () {
    function Collection() {
        this.objs = {};
        this.views = {};
    }
    Collection.prototype.getObject = function (id) {
        return this.objs[id];
    };

    // a remote update occurred
    Collection.prototype.update = function (obj) {
        this.objs[obj.id] = obj;

        for (var key in this.views) {
            this.views[key].update(obj);
        }
    };

    // a remote create occurred
    Collection.prototype.create = function (obj) {
        this.objs[obj.id] = obj;

        for (var key in this.views) {
            this.views[key].create(obj);
        }
    };

    Collection.prototype.save = function (obj) {
        if (this.objs[obj.id]) {
            this.update(obj);
            this.transport.sendUpdate(obj);
        } else {
            this.create(obj);
            this.transport.sendCreate(obj);
        }
    };

    Collection.prototype.addView = function (view) {
        this.views[view.name] = view;
    };
    return Collection;
})();
exports.Collection = Collection;

// Object definitions are derived from this class
var Obj = (function () {
    function Obj(modelName, collection) {
        this.type = modelName;
        this.id = ObjectId();
        this._collection = collection;

        this.rev = {
            token: Math.random().toString(16).substr(2),
            seq: 0
        };
    }
    Obj.prototype.save = function () {
        this.rev.token = Math.random().toString(16).substr(2);
        this.rev.seq = this.rev.seq += 1;
        this._collection.save(this);
    };

    Obj.prototype.bind = function (to) {
        this._binding = to;
    };

    Obj.prototype.change = function (obj) {
        if (this._binding) {
            this._binding(obj);
        }
    };

    Obj.prototype.toDoc = function () {
        var doc = {};
        for (var key in this) {
            if (this.hasOwnProperty(key) && key.charAt(0) !== "_") {
                doc[key] = this[key];
            }
        }
        return doc;
    };

    Obj.prototype.toJSON = function () {
        return JSON.stringify(this.toDoc(), null, 2);
    };
    return Obj;
})();
exports.Obj = Obj;
/*
// setup stuff
var appChannel = new LocalChannel();
var remoteCannel = new LocalChannel();
var appCollection = new Collection();
var appTransport = new ClientServerImpl(appChannel, appCollection);
var appInbound = new Inbound(appTransport);
// Example Models
class User extends Obj {
constructor() {
super("users", appCollection);
}
name : string;
adr : string;
}
// pseudo remote stuff
var remoteCollection = new Collection();
var remoteTransport = new ServerClientImpl(remoteCannel, remoteCollection);
var remoteInbound = new Inbound(remoteTransport);
appChannel.inbound = remoteInbound;
remoteCannel.inbound = appInbound;
//
//
//var fooView = new View("fooView", (obj, emit) => {
//    if (obj.type === "users") {
//        var user = <User>obj;
//        if (user.adr === "foo") {
//            emit(user.id, user);
//        }
//    }
//}, appCollection);
//
//fooView.bind( (objs) => {
//    console.log("binding local");
//    for (var key in objs) {
//        console.log(key, " -> ", objs[key].toJSON());
//    }
//});
//
//
//
//var remoteView = new View("remoteView", (obj, emit) => {
//    if (obj.type === "users") {
//        var user = <User>obj;
//        emit(user.id, user);
//    }
//}, remoteCollection);
//
//remoteView.bind( (objs) => {
//    console.log("binding remote");
//    for (var key in objs) {
//        console.log(key, " -> ", objs[key].toJSON());
//    }
//});
var localView = new View("theView", (obj, emit, getObj) => {
if (obj.type === "users") {
var user = <User>obj;
if (user.id === 'id:user2') getObj("id:user1");
emit(user.id, user);
}
}, remoteCollection);
localView.bind( (objs) => {
console.log("remote binding");
for (var key in objs) {
console.log(key, " -> ", objs[key].toJSON());
}
});
var remoteView = new View("theView", (obj, emit, getObj) => {
if (obj.type === "users") {
var user = <User>obj;
if (user.id === 'id:user2') getObj("id:user1");
emit(user.id, user);
}
}, appCollection);
remoteView.bind( (objs) => {
console.log("local binding");
for (var key in objs) {
console.log(key, " -> ", objs[key].toJSON());
}
});
// example usage
var user = new User();
user.id = "id:user1";
user.name = "jonthan";
user.adr = "foo";
user.save();
//var user2 = new User();
//user2.name = "matthias";
//user2.adr = "foo";
//appTransport.receiveUpdate(user2);
var user2 = new User();
user2.id = "id:user2";
user2.name = "jonathan";
user2.adr = "bar";
user2.save();
//var user4 = new User();
//user4._collection = remoteCollection;
//user4.name = "katharina";
//user4.adr = "foo";
//user4.save();
console.log("done()");
user.save();
console.log("done(2)");
*/
//# sourceMappingURL=model.js.map
