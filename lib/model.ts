//import Collections = require('./Collectons');
export import Storage = require('./storage');
export import Transport = require('./transport');

var ObjectId = (function() {
    var cnt = -1;
    return function () {
        cnt += 1;
        return "id:"+cnt;
    }
})();



export class View {
    name : string;

    // alle View-Objekte
    //private objs : Collections.SortedMap<string,Obj> = new Collections.SortedMap();
    objs : {[key:string] : Obj} = {};

    private map : (obj:Obj, emit:(key:string, obj:Obj) => void) => void;
    private collection : Collection;


    private emit : (key:string, obj:Obj) => void;

    constructor(name : string, map: (obj:Obj, emit:(key:string, obj:Obj) => void) => void, collection:Collection) {
        this.name = name;
        this.collection = collection;
        this.map = map;
        this.collection.addView(this);

        // definition of the emit function
        var self = this;
        this.emit = function(key:string, obj:Obj) {
            self.objs[key] = obj;
            self.collection.transport.sendViewUpdate(self.name, obj);
            self.changed();
        };

    }

    // ein object hat sich verändert
    update(obj : Obj) {
        //console.log("update view", this.name, obj.toJSON());
        this.map(obj, this.emit);
    }

    create(obj : Obj) {
        this.update(obj);
    }

    // synced from somewhere
    sync(obj : Obj) {
        this.update(obj);
    }

    delete(id : string) {
        if (this.objs[id]) delete this.objs[id];
        this.changed();
    }

    private binding : (objs : {[key:string] : Obj}) => void;
    bind(to : (objs : {[id:string] : Obj}) => void) : void {
        this.binding = to;
        this.collection.transport.sendSubscribe(this.name);
        this.binding(this.objs);
    }

    private changed() {
        if (this.binding)
            this.binding(this.objs);
    }
}


export class Collection {
    objs : {[id:string] : Obj} = {};
    views : {[viewName : string] : View} = {};
    private store : Storage.Storage = new Storage.NullStorage();
    transport : Transport.Transport;

    getObject(id : string) : Obj {
        return this.objs[id];
    }

    // a remote update occurred
    update(obj : Obj) {
        this.objs[obj.id] = obj;

        this.store.update(obj);

        for (var key in this.views) {
            this.views[key].update(obj);
        }
    }

    // a remote create occurred
    create(obj : Obj) {
        this.objs[obj.id] = obj;

        this.store.create(obj);

        for (var key in this.views) {
            this.views[key].create(obj);
        }
    }

    // a object has been loaded from database
    sync(obj: Obj) {
        this.objs[obj.id] = obj;

        for (var key in this.views) {
            this.views[key].sync(obj);
        }
    }

    save(obj : Obj) {
        if (this.objs[obj.id]) {
            this.update(obj);
            this.transport.sendUpdate(obj);
        } else {
            this.create(obj);
            this.transport.sendCreate(obj);
        }
    }

    addView(view : View) {
        this.views[view.name] = view;
    }

    // sync the views with all objects from the collection
    syncViews() {
        // init view with objects from the collection
        for (var i in this.objs) {
            var obj = this.objs[i];
            for (var j in this.views) {
                this.views[j].sync(obj);
            }
        }

    }

    setStore(store : Storage.Storage) : Storage.Promise {
        var Q = new Storage.Promise();

        this.store = store;

        this.store.init().then(() => {
            this.store.all((obj) => {
                this.sync(obj);
            });

            Q.resolve();
        });

        return Q;
    }
}


// Object definitions are derived from this class
export class Obj {

    _collection : Collection;

    constructor(modelName : string, collection : Collection) {
        this.type = modelName;
        this.id = ObjectId();
        this._collection = collection;

        this.rev = {
            token : Math.random().toString(16).substr(2),
            seq : 0
        };
    }

    save() {
        this.rev.token = Math.random().toString(16).substr(2);
        this.rev.seq = this.rev.seq += 1;
        this._collection.save(this);
    }

    private _binding : (obj : Obj) => void;
    bind(to : (obj : Obj) => void) : void {
        this._binding = to;
    }

    change(obj : Obj) {
        if (this._binding) {
            this._binding(obj);
        }
    }

    toDoc() {
        var doc = {};
        for (var key in this) {
            if (this.hasOwnProperty(key) && key.charAt(0) !== "_") {
                doc[key] = this[key];
            }
        }
        return doc;
    }

    toJSON() : string {
        return JSON.stringify(this.toDoc(), null, 2);
    }

    static createObjectFromJSON(objJSON : Obj, collection : Collection) : Obj {
        var obj = new Obj(objJSON.type, collection);

        for (var key in objJSON) {
            if (objJSON.hasOwnProperty(key)) {
                obj[key] = objJSON[key];
            }
        }

        return obj;
    }

    id : string;
    rev : {
        token : string;
        seq : number;
    };
    type : string;
}

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