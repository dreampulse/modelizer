var ObjectId = (function() {
    var cnt = -1;
    return function () {
        cnt += 1;
        return "id:"+cnt;
    }
})();

class Transport {
    static transport = new Transport();

    sendUpdate(obj : Model) {
        console.log("sendUpdate()", obj.toJSON());
    }

    sendCreate(obj : Model) {
        console.log("sendCreate()", obj.toJSON());
    }

    receiveUpdate(modelName : string, newObject : Model) {
        Collection.getCollection(modelName).update(newObject);
    }

    receiveCreate(modelName : string, newObject : Model) {
        Collection.getCollection(modelName).create(newObject);
    }
}

class View {
    private _objs : {[id:string] : Model} = {};
    private _map : (obj : Model) => boolean;

    constructor(collection:string, map : (obj : Model) => boolean) {
        this._map = map;
        Collection.getCollection(collection).addView(this);
    }

    // ein object hat sich verändert
    update(obj : Model) {
        if (this._map(obj)) {
            this._objs[obj.id] = obj;
        } else {  // soll raus
            if (this._objs[obj.id]) delete this._objs[obj.id];
        }
        this.changed();
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
    private static collections : {[name:string] : Collection} = {};
    static getCollection(modelName : string) : Collection {
        if (Collection.collections[modelName]) {
            return Collection.collections[modelName];
        } else {
            return Collection.collections[modelName] = new Collection();
        }
    }

    private _objs : {[id:string] : Model} = {};
    private _views : View[] = [];

    update(obj : Model) {
        this._objs[obj.id] = obj;

        this._views.forEach(sel => {
            sel.update(obj);
        });
    }

    create(obj : Model) {
        this._objs[obj.id] = obj;

        this._views.forEach(sel => {
            sel.update(obj);
        });
    }

    save(obj : Model) {
        if (this._objs[obj.id]) {
            this.update(obj);
            Transport.transport.sendUpdate(obj);
        } else {
            this.create(obj);
            Transport.transport.sendCreate(obj);
        }
    }

    addView(view : View) {
        this._views.push(view);
    }
}

class Model {
    private _collection;

    constructor(modelName : string) {
        this._collection = Collection.getCollection(modelName);
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
}


class User extends Model {
    constructor() { super("users"); }

    name : string;
    adr : string;

}

var fooView= new View("users", (user:User) => {
    return user.adr === "foo";
});

fooView.bind( (objs) => {
    console.log("binding foo");
    for (var key in objs) {
        console.log(key, " -> ", objs[key].toJSON());
    }
});

var jonathanView = new View("users", (user:User) => {
    return user.name === "jonathan";
});

jonathanView.bind( (objs) => {
    console.log("binding jonathan");
    for (var key in objs) {
        console.log(key, " -> ", objs[key].toJSON());
    }
});



var user = new User();
user.name = "jonthan";
user.adr = "foo";

user.save();


var user2 = new User();
user2.name = "matthias";
user2.adr = "foo";
Transport.transport.receiveUpdate("users", user2);

var user3 = new User();
user3.name = "jonathan";
user3.adr = "bar";
user3.save();