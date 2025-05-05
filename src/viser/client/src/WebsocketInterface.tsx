import WebsocketServerWorker from "./WebsocketServerWorker?worker";
import React, { useContext } from "react";

import { ViewerContext } from "./App";
import { syncSearchParamServer } from "./SearchParamsUtils";
import { WsWorkerIncoming, WsWorkerOutgoing } from "./WebsocketServerWorker";

import { H264Decoder } from './h264/H264Decoder'
import { NALParser } from './h264/NalParser'
import {  Message, H264PacketMessage } from "./WebsocketMessages";


/** Component for handling websocket connections. */
export function WebsocketMessageProducer() {
  const messageQueueRef = useContext(ViewerContext)!.messageQueueRef;
  const viewer = useContext(ViewerContext)!;
  const server = viewer.useGui((state) => state.server);
  const resetGui = viewer.useGui((state) => state.resetGui);
  const resetScene = viewer.useSceneTree((state) => state.resetScene);

  syncSearchParamServer(server);

  React.useEffect(() => {

    let isSupported = false;
// Check for WebCodecs support
    try {
      isSupported = typeof window !== 'undefined' && 'VideoDecoder' in window;
    } catch (e) {
      console.error('WebCodecs API check failed:', e);
      //  return;
    }

    if (!isSupported) {
      console.error('WebCodecs API is not supported in this browser');
      //  return;
    }
   
    
    const options = {
      width: 1920,
      height: 1080,
      frameRate: 30,
      frameBuffer:messageQueueRef.current
    };

    
    const decoder = new H264Decoder(options);

    decoder.init();
   
    async function processH264Data(data: Message, decoder: H264Decoder) {

        const me = data as H264PacketMessage;
        if (me.data.length != 0) {
          const nalUnits = NALParser.parseNALUnits(me.data);
         
          for (const key in nalUnits) {
         
            if  ( key == String(5) ) {
              await decoder.feedData(nalUnits[key], me.time_stamp, true);

              return
              
            } else if (key == String(1) )
               {
              await decoder.feedData(nalUnits[key], me.time_stamp, false);
              return
            }
          }
       
          
        }

       

      
     
    }
    const worker = new WebsocketServerWorker();

    worker.onmessage = (event) => {
      const data: WsWorkerOutgoing = event.data;
      if (data.type === "connected") {
        resetGui();
        resetScene();
        viewer.useGui.setState({ websocketConnected: true });
        viewer.sendMessageRef.current = (message) => {
          postToWorker({ type: "send", message: message });
        };
      } else if (data.type === "closed") {
        resetGui();
        viewer.useGui.setState({ websocketConnected: false });
        viewer.sendMessageRef.current = (message) => {
          console.log(
            `Tried to send ${message.type} but websocket is not connected!`,
          );
        };
      } else if (data.type === "message_batch") {
        for (const message of data.messages) {

          if (message.type == 'H264PacketMessage' ) {

              processH264Data(message, decoder);
          }
          else if (message.type == 'AudioPacketMessage'){

                messageQueueRef.current.push(message);
          }
          
          else
            messageQueueRef.current.push(message);
        }
        // messageQueueRef.current.push(...data.messages);
      }
    };
    function postToWorker(data: WsWorkerIncoming) {
      worker.postMessage(data);
    }
    postToWorker({ type: "set_server", server: server });
    return () => {
      postToWorker({ type: "close" });
      viewer.sendMessageRef.current = (message) =>
        console.log(
          `Tried to send ${message.type} but websocket is not connected!`,
        );
      viewer.useGui.setState({ websocketConnected: false });
    };
  }, [server, resetGui, resetScene]);

  return <></>;
}
