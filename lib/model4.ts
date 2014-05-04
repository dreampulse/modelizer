var ObjectId = (function() {
    var cnt = -1;
    return function () {
        cnt += 1;
        return "id:"+cnt;
    }
})();


interface OutboundCannel {
    emit(cmd :string, msg : any);
}

interface InboundChannel {
    on(key : string, msg : any);
}


class LocalChannel implements OutboundCannel {
    inbound : InboundChannel;

    constructor(inbound? : InboundChannel) {
        this.inbound = inbound;
    }

    emit(cmd :string, msg : any) {
        this.inbound.on(cmd, msg);
    }
}

class Inbound implements InboundChannel {
    private transport : Transport;

    constructor(transport : Transport) {
        this.transport = transport;
    }

    private createObjectFromJSON(objJSON : string) : Model {
        var revObj = JSON.parse(objJSON);
        var obj = new Model(revObj.type, this.transport.collection);

        for (var key in revObj) {
            if (revObj.hasOwnProperty(key)) {
                obj[key] = revObj[key];
            }
        }

        return obj;
    }

    on(cmd : string, msg : any) {
        if (cmd === 'update') {
            this.transport.receiveUpdate(this.createObjectFromJSON(msg));
        } else if (cmd === 'create') {
            this.transport.receiveCreate(this.createObjectFromJSON(msg));
        } else if (cmd === 'subscribe') {
            this.transport.receiveSubscribe(msg);
        } else {
            throw new Error("unkown command! " + cmd);
        }
    }
}

class Outbound {
    private out : OutboundCannel;

    constructor(out : OutboundCannel) {
        this.out = out;
    }

    sendUpdate(obj : Model) : void {
        var objJSON = obj.toJSON();
        this.out.emit("update", objJSON);
    }

    sendCreate(obj : Model) {
        var objJSON = obj.toJSON();
        this.out.emit("create", objJSON);
    }

    sendSubscribe(viewName : string) : void {
        this.out.emit("subscribe", viewName);
    }

}

interface Transport {
    collection : Collection;

    sendUpdate(obj : Model) : void;
    sendCreate(obj : Model) : void;

    sendViewUpdate(viewName : string, obj : Model) : void ;
    sendSubscribe(viewName : string) : void;

    receiveUpdate(obj : Model) : void;
    receiveCreate(obj : Model) : void;

    receiveSubscribe(viewName : string) : void;
}


// The communication from the Client to the Server
class ClientServerImpl implements Transport {
    collection : Collection;

    private out : Outbound;

    constructor(outChannel : OutboundCannel, collection : Collection) {
        this.out = new Outbound(outChannel);
        this.collection = collection;
        this.collection.transport = this;
    }

    sendUpdate(obj : Model) : void {
        console.log("client - sendUpdate()");
        this.out.sendUpdate(obj);
    }

    sendCreate(obj : Model) {
        console.log("client - createUpdate()");
        this.out.sendCreate(obj);
    }

    sendViewUpdate(viewName : string, obj : Model) : void {
        //this.out.sendViewUpdate(viewName, obj);
    }

    sendSubscribe(viewName : string) : void {
        this.out.sendSubscribe(viewName);
    }

    receiveUpdate(obj : Model) : void {
        console.log("client - receiveUpdate()");
        this.collection.update(obj);
    }

    receiveCreate(obj : Model) : void {
        console.log("client - receiveCreate()");
        this.collection.create(obj);
    }
    receiveSubscribe(viewName : string) : void {
        // noting to do for the client
    }

}

// The communication from the Server to the Client
class ServerClientImpl implements Transport {

    collection : Collection;
    private out : Outbound;

    private subscribedViews : {[viewName : string] : View} = {};


    constructor(outChannel : OutboundCannel, collection : Collection) {
        this.out = new Outbound(outChannel);
        this.collection = collection;
        this.collection.transport = this;
    }

    sendUpdate(obj : Model) : void {
        // do noting
    }

    sendCreate(obj : Model) {
        // do noting
    }

    sendViewUpdate(viewName : string, obj : Model) : void {
        console.log("server - sendViewUpdate()");
        if (this.subscribedViews.hasOwnProperty(viewName)) {
            this.out.sendUpdate(obj);
        }
    }

    sendSubscribe(viewName : string) : void {
        // do noting
    }

    receiveUpdate(obj : Model) : void {
        console.log("server - receiveUpdate()");
        this.collection.update(obj);
    }

    receiveCreate(obj : Model) : void {
        console.log("server - receiveCreate()");
        this.collection.create(obj);
    }
    receiveSubscribe(viewName : string) : void {
        console.log("receiveSubscribe", viewName);
        this.subscribedViews[viewName] = null;
    }
}


class View {
    name : string;

    private objs : {[id:string] : Model} = {};
    private referencedObjsForObjs : {[id:string] : string[]} = {};           // die referenzierten Obj. die für dieses Obj benötigt werden -> für get
    private referencedObjsForView : {[ref_id:string] : Model} = {};        // die referenzierten Obj. die für die View benötigt werden -> für update

    private map : (obj:Model, emit:(key:string, obj:Model) => void, get:(id:string) => Model ) => void;
    private collection : Collection;


    private emit : (key:string, obj:Model) => void;
    private getObj : (viewObj:Model) => (id:string) => Model;

    constructor(name : string, map: (obj:Model, emit:(key:string, obj:Model) => void, get:(id:string) => Model) => void, collection:Collection) {
        this.name = name;
        this.collection = collection;
        this.map = map;
        this.collection.addView(this);

        // definition of the emit function
        var self = this;
        this.emit = function(key:string, obj:Model) {
            self.objs[key] = obj;
            self.collection.transport.sendViewUpdate(self.name, obj);
            self.referencedObjsForObjs[obj.id].forEach((ref_id) => {
                console.log("update for referenced objs", ref_id);
                self.collection.transport.sendViewUpdate(self.name, self.referencedObjsForView[ref_id]);
            });
            self.changed();
        }

        // get function for resolving references in map-function
        this.getObj = function(viewObj : Model) {

            // clear
            if (self.referencedObjsForObjs[viewObj.id]) {
                self.referencedObjsForObjs[viewObj.id].forEach((id) => {
                    delete self.referencedObjsForView[id];
                });
            }
            self.referencedObjsForObjs[viewObj.id] = [];

            return function(id:string) : Model {
                var obj = self.collection.getObject(id);

                self.referencedObjsForObjs[viewObj.id].push(id);
                self.referencedObjsForView[id] = viewObj;

                return obj;
            };
        }
    }

    // ein object hat sich verändert
    update(obj : Model) {
        //console.log("update view", this.name, obj.toJSON());
        this.map(obj, this.emit, this.getObj(obj));

        // an referenced object has changed
        if (this.referencedObjsForView[obj.id]) {
            this.referencedObjsForView[obj.id] = obj;
            this.collection.transport.sendViewUpdate(this.name, obj);
        }

    }

    create(obj : Model) {
        this.update(obj);
    }

    delete(id : string) {
        if (this.objs[id]) delete this.objs[id];
        this.changed();
    }

    private binding : (objs : {[id:string] : Model}) => void;
    bind(to : (objs : {[id:string] : Model}) => void) : void {
        this.binding = to;
        this.collection.transport.sendSubscribe(this.name);
        this.binding(this.objs);
    }

    private changed() {
        if (this.binding)
            this.binding(this.objs);
    }
}


class Collection {
    private objs : {[id:string] : Model} = {};
    views : {[viewName : string] : View} = {};
    transport : Transport;

    getObject(id : string) : Model {
        return this.objs[id];
    }

    // a remote update occurred
    update(obj : Model) {
        this.objs[obj.id] = obj;

        for (var key in this.views) {
            this.views[key].update(obj);
        }
    }

    // a remote create occurred
    create(obj : Model) {
        this.objs[obj.id] = obj;

        for (var key in this.views) {
            this.views[key].create(obj);
        }
    }

    save(obj : Model) {
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
}


class Model { // rename to Obj

    _collection : Collection;

    constructor(modelName : string, collection : Collection) {
        this.type = modelName;
        this.id = ObjectId();
        this._collection = collection;
    }

    save() {
        this._collection.save(this);
        this.rev +=1;
    }

    private _binding : (obj : Model) => void;
    bind(to : (obj : Model) => void) : void {
        this._binding = to;
    }

    change(obj : Model) {
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

    id : string;
    rev : number = 0;
    type : string;
}


// setup stuff

var appChannel = new LocalChannel();
var remoteCannel = new LocalChannel();

var appCollection = new Collection();
var appTransport = new ClientServerImpl(appChannel, appCollection);
var appInbound = new Inbound(appTransport);


// Example Models

class User extends Model {
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