var ObjectId = (function() {
    var cnt = -1;
    return function () {
        cnt += 1;
        return "id:"+cnt;
    }
})();


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
            self.collection.transport.sendViewUpdate(obj);
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
        this.collection.transport.sendSubscribe(this);
        this.binding(this.objs);
    }

    private changed() {
        this.binding(this.objs);
    }
}


class LocalConnector {
    private transportApp;
    private transportRemote;

    private createObjectFromJSON(objJSON : string, coll : Collection) : Model {
        var revObj = JSON.parse(objJSON);
        var obj = new Model(revObj.type, coll);

        for (var key in revObj) {
            if (revObj.hasOwnProperty(key)) {
                obj[key] = revObj[key];
            }
        }

        return obj;
    }

    constructor(transApp : Transport, transRemote : Transport) {
        this.transportApp = transApp;
        this.transportRemote = transRemote;

        // setup Transport 1
        this.transportApp.sendUpdate = (obj : Model) => {
            var objJSON = obj.toJSON();
            var revObj = this.createObjectFromJSON(objJSON, this.transportRemote.collection);
            this.transportRemote.receiveUpdate(revObj);
        };

        this.transportApp.sendCreate = (obj : Model) => {
            var objJSON = obj.toJSON();
            var revObj = this.createObjectFromJSON(objJSON, this.transportRemote.collection);
            this.transportRemote.receiveCreate(revObj);
        };

        // setup Transport 2
        this.transportRemote.sendUpdate = (obj : Model) => {
            var objJSON = obj.toJSON();
            var revObj = this.createObjectFromJSON(objJSON, this.transportApp.collection);
            this.transportApp.receiveUpdate(revObj);
        };

        this.transportRemote.sendCreate = (obj : Model) => {
            var objJSON = obj.toJSON();
            var revObj = this.createObjectFromJSON(objJSON, this.transportApp.collection);
            this.transportApp.receiveCreate(revObj);
        }



    }
}

class Transport {

    collection : Collection;

    sendUpdate(obj : Model) {
        //console.log("sendUpdate()", obj.toJSON());
    }

    sendViewUpdate(obj : Model) {

    }

    sendCreate(obj : Model) {
        //console.log("sendCreate()", obj.toJSON());
    }

    receiveUpdate(newObject : Model) {
        this.collection.update(newObject);
    }

    receiveCreate(newObject : Model) {
        this.collection.create(newObject);
    }

    sendSubscribe(view : View) {

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

    setTransport(transport : Transport) {
        this.transport = transport;
        this.transport.collection = this;
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

var appCollection = new Collection();
var appTransport = new Transport();
appCollection.setTransport(appTransport);


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
var remoteTransport = new Transport();
remoteCollection.setTransport(remoteTransport);

var appConnector = new LocalConnector(appTransport, remoteTransport);



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



