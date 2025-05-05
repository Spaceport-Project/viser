// audio-worklet-player.ts
//import { AudioPacketMessage } from './audio-types';

type data_type = {  
    audioData: Float32Array;
    time_stamp: number

};
export class AudioWorkletPlayer {
    private readonly sampleRate: number;
    private readonly samplesPerPacket: number;
    private audioContext?: AudioContext;
    private workletNode?: AudioWorkletNode;
    private gainNode?: GainNode;
    private isInitialized: boolean;
    private isPlaying: boolean;
    private packetInterval?: number;
  
    constructor(sampleRate: number = 44100) {
        this.sampleRate = sampleRate;
        this.samplesPerPacket = Math.ceil(sampleRate * 0.022);
        this.isInitialized = false;
        this.isPlaying = false;
    }
  
    public async initialize(): Promise<void> {
        if (this.isInitialized) return;
  
        try {
            console.log('Creating AudioContext...');
            this.audioContext = new (window.AudioContext)();
  
            this.gainNode = this.audioContext.createGain();
            this.gainNode.gain.value = 1;
            this.gainNode.connect(this.audioContext.destination);
  
            console.log('AudioContext state:', this.audioContext.state);
  
            const blob = new Blob([this.getWorkletCode()], { 
                type: 'application/javascript' 
            });
            const workletUrl = URL.createObjectURL(blob);
  
            try {
                await this.audioContext.audioWorklet.addModule(workletUrl);
                console.log('AudioWorklet module added');
  
                this.workletNode = new AudioWorkletNode(this.audioContext, 'audio-packet-processor', {
                    numberOfInputs: 1,
                    numberOfOutputs: 1,
                    outputChannelCount: [1]
                });
  
                this.workletNode.connect(this.gainNode);
                console.log('WorkletNode connected to GainNode');
  
                this.isInitialized = true;
            } catch (error) {
                console.error('Failed to initialize audio worklet:', error);
                throw error;
            } finally {
                URL.revokeObjectURL(workletUrl);
            }
        } catch (error) {
            console.error('Failed to initialize AudioContext:', error);
            throw error;
        }
    }
  

    public async resumeContext(): Promise<void> {
        console.log('Attempting to resume context...');
  
        if (!this.audioContext) {
            console.warn('No AudioContext available');
            return;
        }
  
        console.log('Current context state:', this.audioContext.state);
  
        // Only try to resume if it's suspended
        if (this.audioContext.state === 'suspended') {
            try {
                console.log('Resuming suspended context...');
                await this.audioContext.resume();
                console.log('Context resumed successfully');
            } catch (error) {
                console.error('Failed to resume context:', error);
                // Don't throw, just log the error
            }
        } else {
            console.log('Context is already in state:', this.audioContext.state);
        }
    }    
    public async start(): Promise<void> {
        if (!this.isInitialized || this.isPlaying) return;
  
        try {
         
  
            this.isPlaying = true;
            console.log('Starting playback');
  
            // this.packetInterval = window.setInterval(() => {
            //     const packet = new Float32Array(this.samplesPerPacket);
            //     const frequency = 440;
            //     for (let i = 0; i < packet.length; i++) {
            //         packet[i] = Math.sin(2 * Math.PI * frequency * i / this.sampleRate) * 0.5;
            //     }
            //     this.sendPacket(packet);
            // }, 22);
  
        } catch (error) {
            console.error('Failed to start playback:', error);
            this.isPlaying = false;
            throw error;
        }
    }
  
    public stop(): void {
        if (!this.isPlaying) return;
  
        // if (this.packetInterval) {
        //     clearInterval(this.packetInterval);
        //     this.packetInterval = undefined;
        // }
  
        if (this.workletNode) {
            this.workletNode.port.postMessage({ type: 'stop' });
        }
  
        this.isPlaying = false;
        console.log('Playback stopped');
    }
  
    public setVolume(value: number): void {
        if (this.gainNode) {
            const normalizedValue = Math.max(0, Math.min(1, value));
            this.gainNode.gain.value = normalizedValue;
            console.log('Volume set to:', normalizedValue);
        }
    }
  
    public getVolume(): number {
        return this.gainNode?.gain.value ?? 0;
    }
  
    public isAudioPlaying(): boolean {
        return this.isPlaying;
    }
  
    public getAudioContextState(): AudioContextState | undefined {
        return this.audioContext?.state;
    }
  
    public sendPacket(data:data_type): void {
        if (!this.isPlaying || !this.workletNode) {
            return;
        }
  
        const message = {
            type: 'packet',
            time_stamp: data.time_stamp,
            audioData: Array.from(data.audioData)
        };
  
        this.workletNode.port.postMessage(message);
    }
  
    private getWorkletCode(): string {
        return `
            class AudioPacketProcessor extends AudioWorkletProcessor {
                constructor() {
                    super();
                    this.buffer = [];
                    this.isPlaying = true;
  
                    this.port.onmessage = (event) => {
                        if (event.data.type === 'packet') {
                            this.buffer.push(...event.data.audioData);
                            // console.log("timestamp", event.data.time_stamp)
                            if (this.buffer.length % 4410 === 0) {
                                // console.log('Buffer size:', this.buffer.length);
                            }
                        } else if (event.data.type === 'stop') {
                            this.isPlaying = false;
                        }
                    };
                }
  
                process(inputs, outputs, parameters) {
                    const output = outputs[0];
                    const channel = output[0];
  
                    for (let i = 0; i < channel.length; i++) {
                        if (this.buffer.length > 0) {
                            channel[i] = this.buffer.shift();
                        } else {
                            channel[i] = 0;
                        }
                    }
  
                    return this.isPlaying;
                }
            }
  
            registerProcessor('audio-packet-processor', AudioPacketProcessor);
        `;
    }
  
    public async cleanup(): Promise<void> {
        this.stop();
  
        if (this.workletNode) {
            this.workletNode.disconnect();
            this.workletNode = undefined;
        }
  
        if (this.gainNode) {
            this.gainNode.disconnect();
            this.gainNode = undefined;
        }
  
        if (this.audioContext) {
            await this.audioContext.close();
            this.audioContext = undefined;
        }
  
        this.isInitialized = false;
        console.log('Audio resources cleaned up');
    }
  
    public async reset(): Promise<void> {
        await this.cleanup();
        await this.initialize();
    }
  
    public getBufferStatus(): void {
        if (this.workletNode) {
            this.workletNode.port.postMessage({ type: 'getBufferStatus' });
        }
    }
  }