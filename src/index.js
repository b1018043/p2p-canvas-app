import Libp2p from 'libp2p';
import WS from 'libp2p-websockets';
import WebRTCStar from 'libp2p-webrtc-star';
import WebSocketStar from 'libp2p-websocket-star';

import Bootstrap from 'libp2p-bootstrap';
import KadDHT from 'libp2p-kad-dht';
import MPLEX from 'libp2p-mplex';
import {NOISE} from 'libp2p-noise';
import filters from 'libp2p-websockets/src/filters';
import {Multiaddr} from 'multiaddr';
import Gossipsub from 'libp2p-gossipsub'

import $ from 'jquery';

import PubsubCanvas, {TOPIC} from './pubsubcanvas';

const tagName = WS.prototype[Symbol.toStringTag];

const main = async()=>{

    const node = await Libp2p.create({
        addresses:{
            listen: ['/ip4/127.0.0.1/tcp/15555/ws/p2p-webrtc-star']
        },
        modules:{
            transport: [WS,WebRTCStar,WebSocketStar],
            streamMuxer: [MPLEX],
            connEncryption: [NOISE],
            peerDiscovery:[/*WebRTCStar.discover,WebSocketStar.discover,*/Bootstrap], // discoverの代替案を考える
            dht: KadDHT,
            pubsub: Gossipsub
        },
        config:{
            peerDiscovery:{
                bootstrap:{
                    list:['/ip4/127.0.0.1/tcp/63586/ws/p2p/QmUBwCedZr52pm1mWEyqYDHr6NHdSaXqnKq1Z8W8T6ytpd']
                }
            },
            transport:{
                [tagName]:{
                    filter: filters.all
                }
            }
        }
    })
    await node.start();

    const pubsubCanvas = new PubsubCanvas(node,TOPIC);

    const targetAddr = new Multiaddr('/ip4/127.0.0.1/tcp/63586/ws/p2p/QmUBwCedZr52pm1mWEyqYDHr6NHdSaXqnKq1Z8W8T6ytpd')

    const latency = await node.ping(targetAddr)
    console.log(`latency is ${latency}`);

    /** @type HTMLCanvasElement  */
    const cnvs = document.getElementById('canvas');
    const ctx = cnvs.getContext('2d');

    const cnvWidth = 500;
    const cnvHeight = 500;
    let cnvColor = "0, 0, 0, 1";
    let cnvBold = 5;
    let clickFlag = 0;

    let oldX =0; 
    let oldY=0;

    $('#canvas').mousedown(async(e)=>{
        clickFlag = 1;
        oldX = e.offsetX;
        oldY = e.offsetY;
        pubsubCanvas.sendStartCanvasOperateRequest(oldX,oldY);
    }).mouseup(async()=>{
        clickFlag = 0;
        pubsubCanvas.sendEndCanvasOperateRequest();
    }).mousemove(async(e)=>{
        if(!clickFlag) return false;
        drawLine(oldX,oldY,e.offsetX,e.offsetY);
        // NOTE: もっと簡潔に処理かけそう startとendの消去
        pubsubCanvas.sendDoingCanvasOperate(e.offsetX,e.offsetY);
        oldX = e.offsetX;
        oldY = e.offsetY;
    });

    function drawLine(stPointX,stPointY, endPointX,endPointY){
        ctx.beginPath();
        ctx.moveTo(stPointX,stPointY);
        ctx.lineTo(endPointX,endPointY);
        ctx.strokeStyle = `rgba(${cnvColor})`;
        ctx.lineWidth = cnvBold;
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.closePath();
    }

    $('#clear').click(()=>{
        ctx.clearRect(0,0,cnvWidth,cnvHeight);
    })
    let imageData =undefined;
    $('#save').click(()=>{
        imageData=JSON.stringify(ctx.getImageData(0,0,cnvWidth,cnvHeight))
        console.log(imageData);
    })

    $('#load').click(()=>{
        ctx.putImageData(JSON.parse(imageData),0,0);
    })

    pubsubCanvas.on('canvas:operate:doing',({oldX,oldY,nextX,nextY})=>{
        console.log(oldY)
        drawLine(oldX,oldY,nextX,nextY);
    })


    document.addEventListener('click',()=>{
        node.peerStore.peers.forEach(async(data)=>{
            console.log(data.id.toB58String());
        })
    })

    document.addEventListener('close',async()=>{
        await node.stop()
    })
}

main();
