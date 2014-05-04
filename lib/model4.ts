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
            // not implemented yet
        } else if (cmd === 'view update') {
            // not implemented yet
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

    sendViewUpdate(viewName : string, obj : Model) : void {
        var objJSON = obj.toJSON();
        this.out.emit("view update", {
            view : viewName,
            obj : obj
        });
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


class ClientServerImpl implements Transport {
    collection : Collection;

    private out : Outbound;

    constructor(outChannel : OutboundCannel, collection : Collection) {
        this.out = new Outbound(outChannel);
        this.collection = collection;
        this.collection.transport = this;
    }

    sendUpdate(obj : Model) : void {
        this.out.sendUpdate(obj);
    }

    sendCreate(obj : Model) {
        this.out.sendCreate(obj);
    }

    sendViewUpdate(viewName : string, obj : Model) : void {
        this.out.sendViewUpdate(viewName, obj);
    }

    sendSubscribe(viewName : string) : void {
        this.out.sendSubscribe(viewName);
    }

    receiveUpdate(obj : Model) : void {
        this.collection.update(obj);
    }

    receiveCreate(obj : Model) : void {
        this.collection.create(obj);
    }
    receiveSubscribe(viewName : string) : void {

    }

}

class ServerClientImpl implements Transport {
    // spezial implementierung

    collection : Collection;

    private out : Outbound;

    constructor(outChannel : OutboundCannel, collection : Collection) {
        this.out = new Outbound(outChannel);
        this.collection = collection;
        this.collection.transport = this;
    }

    sendUpdate(obj : Model) : void {
        this.out.sendUpdate(obj);
    }

    sendCreate(obj : Model) {
        this.out.sendCreate(obj);
    }

    sendViewUpdate(viewName : string, obj : Model) : void {
        this.out.sendViewUpdate(viewName, obj);
    }

    sendSubscribe(viewName : string) : void {
        this.out.sendSubscribe(viewName);
    }

    receiveUpdate(obj : Model) : void {
        this.collection.update(obj);
    }

    receiveCreate(obj : Model) : void {
        this.collection.create(obj);
    }
    receiveSubscribe(viewName : string) : void {

    }
}


class View {
    private objs : {[id:string] : Model} = {};
    private map : (obj:Model, emit:(key:string, obj:Model) => void ) => void;
    private collection : Collection;
    name : string;

    private emit : (key:string, obj:Model) => void;

    constructor(name : string, map: (obj:Model, emit:(key:string, obj:Model) => void ) => void , collection:Collection) {
        this.name = name;
        this.collection = collection;
        this.map = map;
        this.collection.addView(this);

        // definition of the emit function
        var self = this;
        this.emit = function(key:string, obj:Model) {
            self.objs[key] = obj;
            self.collection.transport.sendViewUpdate(self.name, obj);
            self.changed();
        }
    }

    // ein object hat sich verändert
    update(obj : Model) {
        this.map(obj, this.emit);
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
        this.binding(this.objs);
    }
}


class Collection {
    private objs : {[id:string] : Model} = {};
    private views : {[viewName : string] : View} = {};
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
            this.views[key].update(obj);
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


class Model {

    _collection : Collection;

    constructor(modelName : string, collection : Collection) {
        this.type = modelName;
        this.id = ObjectId();
        this._collection = collection;
    }

    save() {
        this._collection.save(this);
        this.ref +=1;
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
    ref : number = 0;
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








var fooView = new View("fooView", (obj, emit) => {
    if (obj.type === "users") {
        var user = <User>obj;
        if (user.adr === "foo") {
            emit(user.id, user);
        }
    }
}, appCollection);

fooView.bind( (objs) => {
    console.log("binding local");
    for (var key in objs) {
        console.log(key, " -> ", objs[key].toJSON());
    }
});



var remoteView = new View("remoteView", (obj, emit) => {
    if (obj.type === "users") {
        var user = <User>obj;
        emit(user.id, user);
    }
}, remoteCollection);

remoteView.bind( (objs) => {
    console.log("binding remote");
    for (var key in objs) {
        console.log(key, " -> ", objs[key].toJSON());
    }
});


// example usage

var user = new User();
user.name = "jonthan";
user.adr = "foo";
user.save();


//var user2 = new User();
//user2.name = "matthias";
//user2.adr = "foo";

//appTransport.receiveUpdate(user2);

//var user3 = new User();
//user3.name = "jonathan";
//user3.adr = "bar";
//user3.save();

var user4 = new User();
user4._collection = remoteCollection;
user4.name = "katharina";
user4.adr = "foo";
user4.save();



