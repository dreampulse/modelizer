/// <reference path="../definitions/mongodb.d.ts" />

import model = require('./model');

export class Promise {
    private callback;

    then = function(callback) {
        this.callback = callback;
    };

    resolve = function() {
        this.callback();
    }
}

export interface Storage {
    init() : Promise;

    create(obj: model.Obj);
    update(obj : model.Obj);
    delete(id : string);

    get(id : string, callback : (obj : model.Obj) => void);
    all(callback : (obj : model.Obj) => void);
}

export class NullStorage implements Storage {
    init() { return new Promise(); }
    create(obj: model.Obj) {}
    update(obj : model.Obj) {}
    delete(id : string) {}
    get(id : string, callback : (obj : model.Obj) => void) { }
    all(callback : (obj : model.Obj) => void) {}
}

export class MongoStorage implements Storage {
    private mongoClient = require('mongodb').MongoClient;
    private uri : string;
    private mongoCollectionStr : string;
    private collection : model.Collection;

    constructor(uri : string, mongoCollectionStr : string, collection : model.Collection) {
        this.uri = uri;
        this.mongoCollectionStr = mongoCollectionStr;
        this.collection = collection;

    }

    init() {
        var Q = new Promise();

        this.mongoClient.connect(this.uri, {db: {native_parser: true}}, (err, db) => {
            if(err) throw err;

            var coll = db.collection(this.mongoCollectionStr);
            coll.ensureIndex( {'id' : 1}, {unique : true} , (err, indexName) => {
                if(err) throw err;
            });

            // implement interface
            this.create = function(obj : model.Obj) {
                coll.insert(JSON.parse(obj.toJSON()), (err, result) => {
                    if(err) throw err;
                });
            };

            this.update = function(obj: model.Obj) {
                coll.update({'id' : obj.id}, obj, (err, result) => {
                    if(err) throw err;
                });
            };

            this.delete = function(id : string) {
                coll.remove({'id' : id}, (err, result) => {
                    if(err) throw err;
                });
            };

            this.get = function(id : string, callback : (obj : model.Obj) => void) {
                coll.findOne({'id' : id}, {'_id' : 0}, (err, result) => {
                    if(err) throw err;

                    var obj = model.Obj.createObjectFromJSON(result, this.collection);
                    callback(obj);
                });
            };

            this.all = function(callback : (obj : model.Obj) => void) {
                coll.find({}, {'_id' : 0}).each((err, item) => {
                    if (err) throw err;
                    if (item === null) return;

                    var obj = model.Obj.createObjectFromJSON(item, this.collection);
                    callback(obj);
                });
            };

            Q.resolve();
        });

        return Q;
    }

    create(obj: model.Obj) {
//        throw new Error("Not connected to database");
    }
    update(obj : model.Obj) {
//        throw new Error("Not connected to database");
    }
    delete(id : string) {
//        throw new Error("Not connected to database");
    }
    get(id : string, callback : (obj : model.Obj) => void) {
//        throw new Error("Not connected to database");
    }
    all(callback : (obj : model.Obj) => void) {
//        throw new Error("Not connected to database");
    }
}
