var ObjectId = (function() {
    var cnt = -1;
    return function () {
        cnt += 1;
        return "id:"+cnt;
    }
})();

class Transport {
    static transport;

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


class View<T extends Model> {
    private _objs : {[id:string] : Model} = {};
    private _map : (obj:T, emit:(key:string, obj:T) => void ) => void;
    private _collection : Collection;

    private emit : (key:string, obj:T) => void;

    constructor(map: (obj:T, emit:(key:string, obj:T) => void ) => void , collection:Collection) {
        this._collection = collection;
        this._map = map;
        this._collection.addView(this);

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

class Collection {
    private objs : {[id:string] : Model} = {};
    private views : View<Model>[] = [];

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
            Transport.transport.sendUpdate(obj);
        } else {
            this.create(obj);
            Transport.transport.sendCreate(obj);
        }
    }

    addView(view : View<Model>) {
        this.views.push(view);
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


class User extends Model {
    constructor() { super("users"); }

    name : string;
    adr : string;

}

var theCollection = new Collection();
Transport.transport = new Transport(theCollection)

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


var user = new User();
user.name = "jonthan";
user.adr = "foo";

user.setCollection(theCollection);

user.save();


var user2 = new User();
user2.name = "matthias";
user2.adr = "foo";
user2.setCollection(theCollection);

Transport.transport.receiveUpdate(user2);

var user3 = new User();
user3.name = "jonathan";
user3.adr = "bar";
user3.setCollection(theCollection);
user3.save();