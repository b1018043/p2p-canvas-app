import protons from "protons";

import EventEmitter from 'events';

/**
 * @typedef {import('libp2p')} Libp2p
 */

const { Request } = protons(`
message Request{
    enum Type{
        START_CANVAS_OPERATE = 0;
        END_CANVAS_OPERATE = 1;
        DOING_CANVAS_OPERATE = 2;
        DRAW_CANVAS_OPERATE = 3;
    }

    required Type type = 1;
    optional StartCanvasOperate startCanvasOperate = 2;
    optional DoingCanvasOperate doingCanvasOperate = 3;
    optional DrawCanvasOperate drawCanvasOperate = 4;
}

message StartCanvasOperate{
    required int64 startX = 1;
    required int64 startY = 2;
}

message DoingCanvasOperate{
    required int64 nextX = 1;
    required int64 nextY = 2;
}

message DrawCanvasOperate{
    required int64 oldX = 1;
    required int64 oldY = 2;
    required int64 nextX = 3;
    required int64 nextY = 4;
}

`);

class PubsubCanvas extends EventEmitter{
    /**
     * 
     * @param {Libp2p} node 通信に使うためのlibp2pのnode
     * @param {string} topic pubsubで利用するtopic
     */
    constructor(node,topic){
        super();

        this.node = node;
        this.topic = topic;

        this.connectedPeers = new Set();
        this.userHandles = new Map([
            [this.node.peerId.toB58String(),{oldX:-1,oldY:-1}]
        ]);

        this.node.connectionManager.on('peer:connect',(conn)=>{
            const remotePeerInfo = conn.remotePeer.toB58String();
            if(this.connectedPeers.has(remotePeerInfo)) return;
            console.log('connected to', remotePeerInfo);
            this.connectedPeers.add(remotePeerInfo);
        });

        this.node.connectionManager.on('peer:disconnect',(conn)=>{
            const remotePeerInfo = conn.remotePeer.toB58String();
            console.log('disconnected from',remotePeerInfo);
            this.connectedPeers.delete(remotePeerInfo);
        })

        this._onMessage = this._onMessage.bind(this);

        if(this.node.isStarted()) this.join();
    }

    join(){
        this.node.pubsub.on(this.topic,this._onMessage);
        this.node.pubsub.subscribe(this.topic);
    }

    leave(){
        this.node.pubsub.removeListener(this.topic,this._onMessage);
        this.node.pubsub.unsubscribe(this.topic);
    }

    // アロー関数で記述するとどうなるんだろ🤔
    _onMessage(mes){
        try {
            const request = Request.decode(mes.data);
            switch(request.type){
                case Request.Type.START_CANVAS_OPERATE:
                    this.userHandles.set(
                        mes.from,
                        {
                            oldX: request.startCanvasOperate.startX,
                            oldY: request.startCanvasOperate.startY
                        }
                    )
                    break;
                case Request.Type.END_CANVAS_OPERATE:
                    this.userHandles.delete(mes.from)
                    break;
                case Request.Type.DOING_CANVAS_OPERATE:
                    if(!this.userHandles.has(mes.from)) return;
                    this.emit('canvas:operate:doing',{
                        id: mes.from,
                        oldX: this.userHandles.get(mes.from).oldX,
                        oldY: this.userHandles.get(mes.from).oldY,
                        nextX: request.doingCanvasOperate.nextX,
                        nextY: request.doingCanvasOperate.nextY,
                    })
                    this.userHandles.set(mes.from,{
                        oldX: request.doingCanvasOperate.nextX,
                        oldY: request.doingCanvasOperate.nextY,
                    })
                    break;
                case Request.Type.DRAW_CANVAS_OPERATE:
                    this.emit('canvas:operate:draw',{
                        oldX: request.drawCanvasOperate.oldX,
                        oldY: request.drawCanvasOperate.oldY,
                        nextX: request.drawCanvasOperate.nextX,
                        nextY: request.drawCanvasOperate.nextY
                    })
                    break;
                default:
                    break;
            }
        } catch (err) {
            console.error(err);
        }
    }

    /**
     * canvasに線を入力し始めた際の処理
     * @param {number} startX
     * @param {number} startY
     */
    async sendStartCanvasOperateRequest(startX,startY){
        const mes = Request.encode({
            type: Request.Type.START_CANVAS_OPERATE,
            startCanvasOperate:{
                startX,
                startY
            }
        });

        try {
            await this.node.pubsub.publish(this.topic,mes);
        } catch (err) {
            console.error(err);
        }
    }

    async sendEndCanvasOperateRequest(){
        const mes = Request.encode({
            type: Request.Type.END_CANVAS_OPERATE,
        });

        try {
            await this.node.pubsub.publish(this.topic,mes);
        } catch (err) {
            console.error(err);
        }
    }

    /**
     * @param {number} nextX
     * @param {number} nextY
     */
    async sendDoingCanvasOperate(nextX,nextY){
        const mes = Request.encode({
            type: Request.Type.DOING_CANVAS_OPERATE,
            doingCanvasOperate:{
                nextX,
                nextY
            }
        });

        try {
            await this.node.pubsub.publish(this.topic,mes);
        } catch (err) {
            console.error(err);
        }
    }

    /**
     * canvas入力時の処理
     * @param {number} oldX 移動前のX座標 
     * @param {number} oldY 移動前のY座標
     * @param {number} nextX 移動後のX座標
     * @param {number} nextY 移動後のY座標
     */
    async sendDrawCanvasOperate(oldX,oldY,nextX,nextY){
        const mes = Request.encode({
            type: Request.Type.DRAW_CANVAS_OPERATE,
            drawCanvasOperate:{
                oldX,oldY,nextX,nextY
            }
        });

        try {
            await this.node.pubsub.publish(this.topic,mes);
        } catch (error) {
            console.error(error);
        }
    }
}


export default PubsubCanvas;
export const TOPIC = 'osslab/demo/canvas/1.0.0';
