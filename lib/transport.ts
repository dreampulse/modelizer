import model = require('./model');

export interface OutboundCannel {
    emit(cmd :string, msg : any);
}

export interface InboundChannel {
    on(key : string, msg : any);
}

// reicht alles einfach weiter
export class LocalChannel implements OutboundCannel {
    inbound : InboundChannel[] = [];

//    constructor(inbound? : InboundChannel) {
//        this.inbound = inbound;
//    }

    emit(cmd :string, msg : any) {
        this.inbound.forEach((inbound) => {
            inbound.on(cmd, msg);
        });
    }
}

// Eingehender Kommunikationskanal
export class Inbound implements InboundChannel {
    private transport : Transport;

    constructor(transport : Transport) {
        this.transport = transport;
    }

    on(cmd : string, msg : any) {
        if (cmd === 'update') {
            this.transport.receiveUpdate(model.Obj.createObjectFromJSON(JSON.parse(msg), this.transport.collection));
        } else if (cmd === 'create') {
            this.transport.receiveCreate(model.Obj.createObjectFromJSON(JSON.parse(msg), this.transport.collection));
        } else if (cmd === 'subscribe') {
            this.transport.receiveSubscribe(msg);
        } else {
            throw new Error("unkown command! " + cmd);
        }
    }
}

// Ausgehender Kommunikationskanal
export class Outbound {
    private out : OutboundCannel;

    constructor(out : OutboundCannel) {
        this.out = out;
    }

    sendUpdate(obj : model.Obj) : void {
        var objJSON = obj.toJSON();
        this.out.emit("update", objJSON);
    }

    sendCreate(obj : model.Obj) {
        var objJSON = obj.toJSON();
        this.out.emit("create", objJSON);
    }

    sendSubscribe(viewName : string) : void {
        this.out.emit("subscribe", viewName);
    }

}

export interface Transport {
    collection : model.Collection;

    sendUpdate(obj : model.Obj) : void;
    sendCreate(obj : model.Obj) : void;

    sendViewUpdate(viewName : string, obj : model.Obj) : void ;
    sendSubscribe(viewName : string) : void;

    receiveUpdate(obj : model.Obj) : void;
    receiveCreate(obj : model.Obj) : void;

    receiveSubscribe(viewName : string) : void;
}


// The communication from the Client to the Server
export class ClientServerImpl implements Transport {
    collection : model.Collection;

    private out : Outbound;

    constructor(outChannel : OutboundCannel, collection : model.Collection) {
        this.out = new Outbound(outChannel);
        this.collection = collection;
        this.collection.transport = this;
    }

    sendUpdate(obj : model.Obj) : void {
        //console.log("client - sendUpdate()");
        this.out.sendUpdate(obj);
    }

    sendCreate(obj : model.Obj) {
        //console.log("client - createUpdate()");
        this.out.sendCreate(obj);
    }

    sendViewUpdate(viewName : string, obj : model.Obj) : void {
        //this.out.sendViewUpdate(viewName, obj);
    }

    sendSubscribe(viewName : string) : void {
        this.out.sendSubscribe(viewName);
    }

    receiveUpdate(obj : model.Obj) : void {
        //console.log("client - receiveUpdate()");
        this.collection.update(obj);
    }

    receiveCreate(obj : model.Obj) : void {
        //console.log("client - receiveCreate()");
        this.collection.create(obj);
    }
    receiveSubscribe(viewName : string) : void {
        // noting to do for the client
    }

}

// The communication from the Server to the Client
export class ServerClientImpl implements Transport {

    collection : model.Collection;
    private out : Outbound;

    private subscribedViews : {[viewName : string] : model.View} = {};


    constructor(outChannel : OutboundCannel, collection : model.Collection) {
        this.out = new Outbound(outChannel);
        this.collection = collection;
        this.collection.transport = this;
    }

    sendUpdate(obj : model.Obj) : void {
        // do noting
    }

    sendCreate(obj : model.Obj) {
        // do noting
    }

    sendViewUpdate(viewName : string, obj : model.Obj) : void {
        //console.log("server - sendViewUpdate()");
        if (this.subscribedViews.hasOwnProperty(viewName)) {
            this.out.sendUpdate(obj);
        }
    }

    sendSubscribe(viewName : string) : void {
        // do noting
    }

    receiveUpdate(obj : model.Obj) : void {
        //console.log("server - receiveUpdate()");
        this.collection.update(obj);
    }

    receiveCreate(obj : model.Obj) : void {
        //console.log("server - receiveCreate()");
        this.collection.create(obj);
    }
    receiveSubscribe(viewName : string) : void {
        //console.log("receiveSubscribe", viewName);
        this.subscribedViews[viewName] = null;
    }
}
