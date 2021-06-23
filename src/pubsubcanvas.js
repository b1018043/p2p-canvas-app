import protons from "protons";

import uint8arrayFromString from 'uint8arrays/from-string';
import uint8arrayToString from 'uint8arrays/to-string';

import EventEmitter from 'events';

/**
 * @typedef {import('libp2p')} Libp2p
 */

const { Request } = protons(`
message Request{
    enum Type{
        DRAW_CANVAS_OPERATE = 0;
    }

    required Type type = 1;
    optional DrawCanvasOperate drawCanvasOperate = 2;
}

message DrawCanvasOperate{
    required int64 oldX = 1;
    required int64 oldY = 2;
    required int64 nextX = 3;
    required int64 nextY = 4;
    required bytes color = 5;
    required int64 bold = 6;
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

    // NOTE: bind文を削除するためにアロー関数を利用している
    _onMessage=(mes)=>{
        try {
            const request = Request.decode(mes.data);
            switch(request.type){
                case Request.Type.DRAW_CANVAS_OPERATE:
                    this.emit('canvas:operate:draw',{
                        oldX: request.drawCanvasOperate.oldX,
                        oldY: request.drawCanvasOperate.oldY,
                        nextX: request.drawCanvasOperate.nextX,
                        nextY: request.drawCanvasOperate.nextY,
                        color: uint8arrayToString(request.drawCanvasOperate.color),
                        bold: request.drawCanvasOperate.bold,
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
     * canvas入力時の処理
     * @param {number} oldX 移動前のX座標 
     * @param {number} oldY 移動前のY座標
     * @param {number} nextX 移動後のX座標
     * @param {number} nextY 移動後のY座標
     * @param {string} color 線の色
     * @param {number} bold 線の太さ
     */
    async sendDrawCanvasOperate(oldX,oldY,nextX,nextY,color="#000",bold=5){
        const mes = Request.encode({
            type: Request.Type.DRAW_CANVAS_OPERATE,
            drawCanvasOperate:{
                oldX,oldY,nextX,nextY,
                color: uint8arrayFromString(color),
                bold
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
