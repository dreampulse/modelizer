
var ObjectId = (function() {
    var cnt = -1;
    return function () {
        cnt += 1;
        return "id:"+cnt;
    }
})();


class View<T extends Model> {
    private _objs : {[id:string] : Model} = {};
    private _map : (obj:T, emit:(key:string, obj:T) => void ) => void;
    private _collection : Collection;

    private emit : (key:string, obj:T) => void;

    constructor(map: (obj:T, emit:(key:string, obj:T) => void ) => void , collection:Collection) {
        this._collection = collection;
        this._map = map;
        this._collection.addView(this);

        // definition of the emit function
        var self = this;
        this.emit = function(key:string, obj:T) {
            self._objs[key] = obj;
            self.changed();
        }
    }

    // ein object hat sich verändert
    update(obj : T) {
        this._map(obj, this.emit);
    }

    delete(id : string) {
        if (this._objs[id]) delete this._objs[id];
        this.changed();
    }

    private _binding : (objs : {[id:string] : Model}) => void;
    bind(to : (objs : {[id:string] : Model}) => void) : void {
        this._binding = to;
    }

    private changed() {
        this._binding(this._objs);
    }
}

class LocalConnector {
    private transport1;
    private transport2;

    constructor(trans1 : Transport, trans2 : Transport) {
        this.transport1 = trans1;
        this.transport2 = trans2;

        // setup Transport 1
        this.transport1.sendUpdate = (obj : Model) => {
            var objJSON = obj.toJSON();
            var revObj = <Model>obj;
            this.transport2.receiveUpdate(revObj);
        }

        this.transport1.sendCreate = (obj : Model) => {
            var objJSON = obj.toJSON();
            var revObj = <Model>obj;

            this.transport2.receiveCreate(revObj);
        }

        // setup Transport 2
        this.transport2.sendUpdate = (obj : Model) => {
            var objJSON = obj.toJSON();
            var revObj = <Model>obj;

            this.transport1.receiveUpdate(revObj);
        }

        this.transport2.sendCreate = (obj : Model) => {
            var objJSON = obj.toJSON();
            var revObj = <Model>obj;

            this.transport1.receiveCreate(revObj);
        }

    }
}

class Transport {

    private collection : Collection;
    constructor(collection : Collection) {
        this.collection = collection;
    }

    sendUpdate(obj : Model) {
        //console.log("sendUpdate()", obj.toJSON());
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
}


class Collection {
    private objs : {[id:string] : Model} = {};
    private views : View<Model>[] = [];
    private transport : Transport;

    getObject(id : string) : Model {
        return this.objs[id];
    }

    update(obj : Model) {
        this.objs[obj.id] = obj;

        this.views.forEach(view => {
            view.update(obj);
        });
    }

    create(obj : Model) {
        this.objs[obj.id] = obj;

        this.views.forEach(view => {
            view.update(obj);
        });
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

    addView(view : View<Model>) {
        this.views.push(view);
    }

    setTransport(transport : Transport) {
        this.transport = transport;
    }
}


class Model {

    constructor(modelName : string) {
        this.type = modelName;
        this.id = ObjectId();
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

    private _collection : Collection;
    setCollection(collection:Collection) {
        this._collection = collection;
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

// Example Models

class User extends Model {
    constructor() { super("users"); }

    name : string;
    adr : string;

}

var theCollection = new Collection();
var theTransport = new Transport(theCollection)
theCollection.setTransport(theTransport);


var remoteCollection = new Collection();
var remoteTransport = new Transport(remoteCollection);
remoteCollection.setTransport(remoteTransport);

var theConnector = new LocalConnector(theTransport, remoteTransport);



var fooView = new View<User>((obj, emit) => {
    if (obj.type === "users") {
        var user = <User>obj;
        if (user.adr === "foo") {
            emit(user.id, user);
        }
    }
}, theCollection);

fooView.bind( (objs) => {
    console.log("binding foo");
    for (var key in objs) {
        console.log(key, " -> ", objs[key].toJSON());
    }
});



var remoteView = new View<User>((obj, emit) => {
    emit(user.id, user);
}, remoteCollection);

remoteView.bind( (objs) => {
    console.log("binding remote");
    for (var key in objs) {
        console.log(key, " -> ", objs[key].toJSON());
    }
});



var user = new User();
user.setCollection(theCollection);
user.name = "jonthan";
user.adr = "foo";
user.save();


var user2 = new User();
user2.setCollection(theCollection);
user2.name = "matthias";
user2.adr = "foo";

theTransport.receiveUpdate(user2);

var user3 = new User();
user3.setCollection(theCollection);
user3.name = "jonathan";
user3.adr = "bar";
user3.save();



