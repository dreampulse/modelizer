//import Collections = require('./Collectons');
var Storage = require('./storage');
exports.Storage = Storage;
var Transport = require('./transport');
exports.Transport = Transport;

var ObjectId = (function () {
    var cnt = -1;
    return function () {
        cnt += 1;
        return "id:" + cnt;
    };
})();

var View = (function () {
    function View(name, map, collection) {
        // alle View-Objekte
        //private objs : Collections.SortedMap<string,Obj> = new Collections.SortedMap();
        this.objs = {};
        this.name = name;
        this.collection = collection;
        this.map = map;
        this.collection.addView(this);

        // definition of the emit function
        var self = this;
        this.emit = function (key, obj) {
            self.objs[key] = obj;
            self.collection.transport.sendViewUpdate(self.name, obj);
            self.changed();
        };
    }
    // ein object hat sich verändert
    View.prototype.update = function (obj) {
        //console.log("update view", this.name, obj.toJSON());
        this.map(obj, this.emit);
    };

    View.prototype.create = function (obj) {
        this.update(obj);
    };

    // synced from somewhere
    View.prototype.sync = function (obj) {
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
        this.store = new exports.Storage.NullStorage();
    }
    Collection.prototype.getObject = function (id) {
        return this.objs[id];
    };

    // a remote update occurred
    Collection.prototype.update = function (obj) {
        this.objs[obj.id] = obj;

        this.store.update(obj);

        for (var key in this.views) {
            this.views[key].update(obj);
        }
    };

    // a remote create occurred
    Collection.prototype.create = function (obj) {
        this.objs[obj.id] = obj;

        this.store.create(obj);

        for (var key in this.views) {
            this.views[key].create(obj);
        }
    };

    // a object has been loaded from database
    Collection.prototype.sync = function (obj) {
        this.objs[obj.id] = obj;

        for (var key in this.views) {
            this.views[key].sync(obj);
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

    // sync the views with all objects from the collection
    Collection.prototype.syncViews = function () {
        for (var i in this.objs) {
            var obj = this.objs[i];
            for (var j in this.views) {
                this.views[j].sync(obj);
            }
        }
    };

    Collection.prototype.setStore = function (store) {
        var _this = this;
        var Q = new exports.Storage.Promise();

        this.store = store;

        this.store.init().then(function () {
            _this.store.all(function (obj) {
                _this.sync(obj);
            });

            Q.resolve();
        });

        return Q;
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

    Obj.createObjectFromJSON = function (objJSON, collection) {
        var obj = new Obj(objJSON.type, collection);

        for (var key in objJSON) {
            if (objJSON.hasOwnProperty(key)) {
                obj[key] = objJSON[key];
            }
        }

        return obj;
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
