export interface DecoderConfig {
  codec: string;
  optimizeForLatency?: boolean;
}

export interface PlayerOptions {
  width: number;
  height: number;
  frameRate: number;
}