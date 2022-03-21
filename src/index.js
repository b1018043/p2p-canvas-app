import Libp2p from 'libp2p';
import WS from 'libp2p-websockets';
import WebRTCStar from 'libp2p-webrtc-star';
import WebSocketStar from 'libp2p-websocket-star';

import Bootstrap from 'libp2p-bootstrap';
import KadDHT from 'libp2p-kad-dht';
import MPLEX from 'libp2p-mplex';
import {NOISE} from 'libp2p-noise';
import filters from 'libp2p-websockets/src/filters';
import Gossipsub from 'libp2p-gossipsub'

import $ from 'jquery';

import PubsubCanvas, {TOPIC} from './pubsubcanvas';

const tagName = WS.prototype[Symbol.toStringTag];

const main = async()=>{

    const node = await Libp2p.create({
        addresses:{
            listen: ['/ip4/0.0.0.0/tcp/15555/ws/p2p-webrtc-star']
        },
        modules:{
            transport: [WS,WebRTCStar,WebSocketStar],
            streamMuxer: [MPLEX],
            connEncryption: [NOISE],
            peerDiscovery:[Bootstrap],
            dht: KadDHT,
            pubsub: Gossipsub
        },
        config:{
            peerDiscovery:{
                bootstrap:{
                    // NOTE: listの内容は状況に応じて書き換える
                    list:[
                        '/ip4/127.0.0.1/tcp/63586/ws/p2p/QmUBwCedZr52pm1mWEyqYDHr6NHdSaXqnKq1Z8W8T6ytpd'
                    ]
                }
            },
            transport:{
                [tagName]:{
                    // NOTE: 実運用の際は書き換える
                    //       現在のものは
                    filter: filters.all
                }
            }
        }
    })
    await node.start();

    const pubsubCanvas = new PubsubCanvas(node,TOPIC);

    /** @type HTMLCanvasElement  */
    const cnvs = document.getElementById('canvas');
    const ctx = cnvs.getContext('2d');

    const cnvWidth = 500;
    const cnvHeight = 500;
    let cnvColor = "#000";
    let cnvBold = 5;
    let clickFlag = 0;

    let oldX =0; 
    let oldY=0;

    $('#canvas').mousedown(async(e)=>{
        clickFlag = true;
        oldX = e.offsetX;
        oldY = e.offsetY;
    }).mouseup(async()=>{
        clickFlag = false;
    }).mousemove(async(e)=>{
        if(!clickFlag) return false;
        drawLine(oldX,oldY,e.offsetX,e.offsetY,cnvColor,cnvBold);
        pubsubCanvas.sendDrawCanvasOperate(oldX,oldY,e.offsetX,e.offsetY,cnvColor,cnvBold);
        oldX = e.offsetX;
        oldY = e.offsetY;
    });

    function drawLine(stPointX,stPointY, endPointX,endPointY,color="#000",bold=5){
        ctx.beginPath();
        ctx.moveTo(stPointX,stPointY);
        ctx.lineTo(endPointX,endPointY);
        ctx.strokeStyle = color;
        ctx.lineWidth = bold;
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.closePath();
    }

    $('#clear').click(()=>{
        ctx.clearRect(0,0,cnvWidth,cnvHeight);
    })

    pubsubCanvas.on('canvas:operate:draw',({oldX,oldY,nextX,nextY,color,bold})=>{
        if(!color) return;
        if(!bold) return;
        drawLine(oldX,oldY,nextX,nextY,color,bold);
    })

    $('#color').change(()=>{
        cnvColor = $('#color').val()
        return false;
    })

    $('#pen-bold').change(()=>{
        const newBold = Number($('#pen-bold').val());
        if(isNaN(newBold)) return false;
        cnvBold = newBold;
        return false;
    })

    document.addEventListener('close',async()=>{
        await node.stop()
    })
}

main();
