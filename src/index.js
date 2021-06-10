import Libp2p from 'libp2p';
import WS from 'libp2p-websockets';
import WebRTCStar from 'libp2p-webrtc-star';
import WebSocketStar from 'libp2p-websocket-star';

//import Bootstrap from 'libp2p-bootstrap';
import KadDHT from 'libp2p-kad-dht';
import MPLEX from 'libp2p-mplex';
import {NOISE} from 'libp2p-noise';
import filters from 'libp2p-websockets/src/filters';
import {Multiaddr} from 'multiaddr';

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
            //peerDiscovery:[/*WebRTCStar.discover,WebSocketStar.discover,*/Bootstrap], // discoverの代替案を考える
            dht: KadDHT,
        },
        config:{
            // peerDiscovery:{
            //     bootstrap:{
            //         list:['/ip4/127.0.0.1/tcp/63786/ws/p2p/QmWjz6xb8v9K4KnYEwP5Yk75k5mMBCehzWFLCvvQpYxF3d']
            //     }
            // },
            transport:{
                [tagName]:{
                    filter: filters.all
                }
            }
        }
    })
    await node.start();

    const targetAddr = new Multiaddr('/ip4/127.0.0.1/tcp/63786/ws/ipfs/QmWjz6xb8v9K4KnYEwP5Yk75k5mMBCehzWFLCvvQpYxF3d')

    const latency = await node.ping(targetAddr)
    console.log(`latency is ${latency}`);

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
