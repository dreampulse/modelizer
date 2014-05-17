/// <reference path="../definitions/node.d.ts" />

// http://documentup.com/montagejs/collections
var SortedSet = require("collections/sorted-set");
var ShimObject = require("collections/shim-object");

export class SortedMap<K,V> {
    private theSet : any;

    constructor() {

        var equals = function (x, y) {
            return ShimObject.equals(x.key, y.key);
        };

        var compare = function (x, y) {
            return ShimObject.compare(x.key, y.key);
        };

        this.theSet = new SortedSet(null, equals, compare);

        // set a logger
        this.theSet.logNode = function (node, log, logBefore) {
            log(" key: " + node.value.key + " value: " + node.value.value);
        };
    }

    log() {
        this.theSet.log();
    }

    add(key : K, value : V) {
        return this.theSet.add({
            key : key,
            value : value
        })
    }

    get(key : K) {
        return this.theSet.get({
            key : key
        })
    }
}

