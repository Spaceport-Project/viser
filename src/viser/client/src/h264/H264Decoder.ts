import {  PlayerOptions } from './types';
import { Message } from '../WebsocketMessages'




interface DecoderProps extends PlayerOptions {
  frameBuffer: Message[]
}
export class H264Decoder {
  private decoder: VideoDecoder | null;
  private options: DecoderProps;
  private frameCounter: number;


  constructor( options: DecoderProps) {
    if (!('VideoDecoder' in window)) {
      console.log('WebCodecs API is not supported in this browser');
    }

    
    this.options = options;
    this.decoder = null;
    this.frameCounter = 0;

  }

  async init(): Promise<void> {
  

  const codecDataHex = '0142c028ffe100196742c02895900780227e5c05a808080a000007d00001d4c10801000468cb8f20' // 1920x1080
 
  // const codecDataHex = '0142c032ffe100196742c032959002d00cdf9f016a020202800001f4000075304201000468cb8f20';

  // const bytePairs = codecDataHex.match(/.{1,2}/g); // Split into pairs of two characters
  //console.log(bytePairs)

  // if (!bytePairs) {
  //   throw new Error('Invalid hex string');
  // }
  // const description = new Uint8Array(bytePairs.map(byte => parseInt(byte, 16)));

 

  

    // Extract profile and level from the codec data
  const bytePairs = codecDataHex.match(/.{1,2}/g);
  if (!bytePairs) {
    throw new Error('Invalid hex string');
  }
  const bytes = bytePairs.map(byte => parseInt(byte, 16));

  // Profile is the second byte (index 1)
  const profile = bytes[1].toString(16).padStart(2, '0');
  // Constraints is the third byte (index 2)
  const constraints = bytes[2].toString(16).padStart(2, '0');
  // Level is the fourth byte (index 3)
  const level = bytes[3].toString(16).padStart(2, '0');

  // Construct the codec string
  const codecString = `avc1.${profile}${constraints}${level}`;
  console.log(`Codec string: ${codecString}`);

  const config : VideoDecoderConfig= {
    codec: codecString,
    description: new Uint8Array(bytes),
    codedWidth: 1920,
    codedHeight: 1080,
  };

// const config: VideoDecoderConfig  = {
//       codec: 'avc1.640028', //'avc1.42C03C', // H.264 codec with profile and level
//       description: description,  // 'H.264, Profile: Constrained Baseline, Level: 6, Resolution: 4096x3000, Framerate: 9fps, Chroma Format: 4:2:0, Colorimetry: BT.709',
//       codedWidth: 2880,
//       codedHeight: 1620,
      
//   };

    this.decoder = new VideoDecoder({
      output: (frame: VideoFrame) => this.handleFrame(frame),
      error: (e: Error) => console.error('Decoder error:', e),
    });

    console.log("config",config)
    await this.decoder.configure(config);
    console.log("configuration done")
  }

  private  handleFrame(frame: VideoFrame): void {

    
    this.options.frameBuffer.push(
      {type:"VideoFrameMesssage",
      frame:frame,
      }
    );
    // const format = frame.format; // e.g., 'I420', 'NV12', etc.
    // const { codedWidth, codedHeight } = frame;
   
    this.frameCounter++;
  }

  async feedData(chunk: BufferSource, timestamp: number, isKeyFrame: boolean): Promise<void> {
    if (!this.decoder || this.decoder.state === 'closed') {
      return;
    }

    const encodedChunk = new EncodedVideoChunk({
      type: isKeyFrame ? 'key' : 'delta',
      timestamp: timestamp,  //(this.frameCounter * 1000) / (this.options.frameRate || 30),
      duration:33,
      data: chunk,
      
    });
    this.decoder.decode(encodedChunk);
  }

  async stop(): Promise<void> {
    if (this.decoder) {
      await this.decoder.flush();
      this.decoder.close();
    }
  }
}