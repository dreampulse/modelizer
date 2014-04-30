
class Type {
    static string : string = "string";
    static number : string = "number";
}


/**
 *  Generic stuff for all Attributes
 *  (the storage)
 */
class BasicAttribute<T> {
    //store : Array<T> = [];
    store : T[] = [];
    add(attr: T) {
        this.store.push(attr);
    }
}

/**
 *  Attribute primitives
 */

interface Attribute {
    name : string;
    type : Type;
    annotations : Array<any>;
}

/**
 *  Attribute Objects
 */

interface AttributeObject {
    name : string;
    obj : Definition;
}

/**
 *  Attribute Arrays
 */

interface AttributeArray {
    name : string;
    obj : Definition;
}


class Definition {
    attrs = new BasicAttribute<Attribute>();
    attr(name : string, type : Type, ...annotations : any[]) {
        this.attrs.add({
            name : name,
            type : type,
            annotations : annotations
        });

        return this;
    }

    attrObjs = new BasicAttribute<AttributeObject>();
    attrObj(name : string, obj : Definition) {
        this.attrObjs.add({
            name : name,
            obj : obj
        });

        return this;
    }

    attrArrays = new BasicAttribute<AttributeArray>();
    attrArray(name : string, obj : Definition) {
        this.attrArrays.add({
            name : name,
            obj : obj
        });

        return this;
    }

}


// TODO: Types sollten selber wissen wie sie sich serialisieren
function serialize(obj : Obj, def : Definition) : string {
    var result = {};

    function copy(obj, def) {
        var newObj = {};

        // copy attributes
        def.attrs.forEach( attr => {
            // type check here
            newObj[attr.name] = obj[attr.name];
        });

        // copy attribute objects
        def.attrObjs.forEach( attr => {
            newObj[attr.name] = copy(obj[attr.name], attr.obj);
        });

        // copy array with objects
        def.attrArrays.forEach( attr => {
            newObj[attr.name] = [];

            (<Array<any>>obj[attr.name]).forEach( el => {
                newObj[attr.name].push(copy(el, attr.obj))
            });
        });

        return newObj;
    }

    result = copy(obj, def);

    return "";
}

class Transport {
    send(doc : string) {

    }

    objSaved(obj : Obj) {

    }
}

// Muss Interface werden
class Collection {
    private _model : Model;
    private _objs : {[key:string] : Obj} = {};

    constructor(model : Model) {
        this._model = model;
    }

    set(obj : Obj) {
        this._objs[obj._id] = obj;
    }

    tmpAll() {
        return this._objs;
    }
}

class Obj {
    private _transport : Transport;
    private _collection : Collection;
    private _def : Definition;
    constructor(def, transport, collection) {
        this._def = def;
        this._transport = transport;
        this._collection = collection;
    }

    _id : string;
    content : any;

    save() {
        //this._transport.objSaved(this);
        this._collection.set(this);
    }

}

class Model {
    def : Definition;
    transport : Transport;
    collection : Collection;
    constructor() {
        this.def = new Definition();
        this.transport = new Transport();
        this.collection = new Collection(this);
    }

    create() : Obj {
        return new Obj(this.def, this.transport, this.collection);
    }
}


var myModel = new Model();
myModel.def
    .attr('attribute1', Type.string)
    .attr('attribute2', Type.string)
    .attrObj('nested', new Definition()
        .attr('sub1', Type.string)
        .attr('sub2', Type.string)
    )
    .attrArray('array', new Definition()
        .attr('content', Type.string)
    )
;

console.log('myModel', JSON.stringify(myModel.def, null, 2));

var myObj = myModel.create();
myObj._id = "foo";
myObj.content = "bar";
myObj.save();

console.log("myObj", myModel.collection.tmpAll());
