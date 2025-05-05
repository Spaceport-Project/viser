export enum AudioFormat {
    OPUS = 'opus'
}

type AudioPacket = {
    audioData: Uint8Array;
    timeStamp: number;
    format: AudioFormat;
};

export class AudioWorkletPlayer {
    private readonly sampleRate: number;
    private audioContext?: AudioContext;
    private workletNode?: AudioWorkletNode;
    private gainNode?: GainNode;
    private isInitialized: boolean = false;
    private isPlaying: boolean = false;
    private currentFormat?: AudioFormat;
    
    // Performance optimization settings for Opus
    private readonly DECODE_BATCH_SIZE = 2880; // Typical Opus frame size (60ms at 48kHz)
    private readonly BUFFER_TARGET_LENGTH = 4800; // ~100ms at 48kHz
    private readonly MAX_BUFFER_LENGTH = 9600; // ~200ms at 48kHz

    constructor(sampleRate: number = 48000) { // Opus typically uses 48kHz
        this.sampleRate = sampleRate;
    }

    public async initialize(format: AudioFormat): Promise<void> {
        if (this.isInitialized) return;

        try {
            this.currentFormat = format;
            await this.setupAudioSystem();
            this.isInitialized = true;
        } catch (error) {
            console.error('Initialization failed:', error);
            throw error;
        }
    }

    private async setupAudioSystem(): Promise<void> {
        const isWindows = navigator.platform.indexOf('Win') > -1;  
        const bufferSize = isWindows ? 2880 : 1920; // Adjusted for Opus frame sizes
        
        this.audioContext = new (window.AudioContext)({
            latencyHint: isWindows ? 'playback' : 'interactive',
            sampleRate: this.sampleRate
        });

        this.gainNode = this.audioContext.createGain();
        this.gainNode.gain.value = 0.5;
        this.gainNode.connect(this.audioContext.destination);

        await this.audioContext.audioWorklet.addModule(
            URL.createObjectURL(new Blob([this.getWorkletCode()], 
            { type: 'application/javascript' }))
        );

        this.workletNode = new AudioWorkletNode(this.audioContext, 'high-performance-processor', {
            numberOfInputs: 1,
            numberOfOutputs: 1,
            outputChannelCount: [2], // Support stereo
            channelCount: 2,
            channelCountMode: 'explicit',
            channelInterpretation: 'speakers',
            processorOptions: {
                sampleRate: this.sampleRate,
                bufferSize: bufferSize,
                isWindows: isWindows,
                format: this.currentFormat
            }
        });

        this.gainNode.channelCount = 2;
        this.gainNode.channelCountMode = 'explicit';
        this.gainNode.channelInterpretation = 'speakers';

        this.workletNode.connect(this.gainNode);
    }

    private getWorkletCode(): string {
        return `
            class HighPerformanceProcessor extends AudioWorkletProcessor {
                constructor(options) {
                    super();
                    this.sampleRate = options.processorOptions.sampleRate;
                    
                    // Create separate queues for left and right channels
                    this.queueLeft = [];
                    this.queueRight = [];
                    
                    // Current buffer being processed
                    this.currentBufferLeft = new Float32Array(0);
                    this.currentBufferRight = new Float32Array(0);
                    
                    this.isPlaying = true;
                    const isWindows = options.processorOptions.isWindows || false;
    
                    // Buffer size calculations optimized for Opus
                    this.minimumBufferSize = Math.ceil(this.sampleRate * 0.10);  // 40ms minimum
                    this.targetBufferSize = Math.ceil(this.sampleRate * 0.30);   // 60ms target
                    this.maxBufferSize = Math.ceil(this.sampleRate * 2);      // 120ms maximum
                    this.maxQueueSize = 20; // Maximum number of packets in queue
                    this.smoothingFactor = isWindows ? 0.15 : 0.1;
    
                    this.port.onmessage = ({data}) => {
                        if (data.type === 'audio') {
                            this.handleAudioData(data.audioData, data.channels);
                        } else if (data.type === 'stop') {
                            this.isPlaying = false;
                        }
                    };
                }
    
                handleAudioData(newData, channels) {
                    if (!(newData instanceof Float32Array)) return;
    
                    // Drop oldest packet if queue is too long to prevent memory buildup
                    if (this.queueLeft.length >= this.maxQueueSize) {
                        this.queueLeft.shift();
                        this.queueRight.shift();
                        console.warn('Audio queue overflow - dropping oldest packet');
                    }
    
                    if (channels === 1) {
                        // Mono audio - duplicate to both channels
                        const smoothedData = this.smoothBuffer(newData);
                        this.queueLeft.push(smoothedData);
                        this.queueRight.push(smoothedData);
                    } else {
                        // Stereo audio - split channels
                        const leftChannel = newData.filter((_, i) => i % 2 === 0);
                        const rightChannel = newData.filter((_, i) => i % 2 === 1);
                        
                        const smoothedLeft = this.smoothBuffer(leftChannel);
                        const smoothedRight = this.smoothBuffer(rightChannel);
                        
                        this.queueLeft.push(smoothedLeft);
                        this.queueRight.push(smoothedRight);
                    }
                }
    
                smoothBuffer(data) {
                    const smoothed = new Float32Array(data.length);
                    smoothed[0] = data[0];
                    for (let i = 1; i < data.length; i++) {
                        smoothed[i] = this.smoothingFactor * data[i] + (1 - this.smoothingFactor) * smoothed[i-1];
                    }
                    return smoothed;
                }
    
                // Helper method to get more audio data from queue when needed
                getNextBuffer() {
                    if (this.queueLeft.length === 0) return false;
    
                    // Get next packet from queue
                    const nextLeft = this.queueLeft.shift();
                    const nextRight = this.queueRight.shift();
    
                    // Append to current buffer
                    const newBufferLeft = new Float32Array(this.currentBufferLeft.length + nextLeft.length);
                    const newBufferRight = new Float32Array(this.currentBufferRight.length + nextRight.length);
    
                    newBufferLeft.set(this.currentBufferLeft);
                    newBufferRight.set(this.currentBufferRight);
                    newBufferLeft.set(nextLeft, this.currentBufferLeft.length);
                    newBufferRight.set(nextRight, this.currentBufferRight.length);
    
                    this.currentBufferLeft = newBufferLeft;
                    this.currentBufferRight = newBufferRight;
    
                    return true;
                }
    
                process(inputs, outputs) {
                    const output = outputs[0];
                    const leftChannel = output[0];
                    const rightChannel = output[1];
                    const requiredSamples = leftChannel.length;
    
                    // If current buffer is too small, try to get more data from queue
                    while (this.currentBufferLeft.length < this.minimumBufferSize && this.getNextBuffer()) {
                        // Keep adding from queue until we have enough data or queue is empty
                    }
    
                    if (this.currentBufferLeft.length < requiredSamples) {
                        // Not enough data - fill with silence
                        if (this.currentBufferLeft.length > 0) {
                            // Use whatever data we have
                            leftChannel.set(this.currentBufferLeft);
                            rightChannel.set(this.currentBufferRight);
                            // Fill the rest with silence
                            leftChannel.fill(0, this.currentBufferLeft.length);
                            rightChannel.fill(0, this.currentBufferRight.length);
                            // Clear current buffers
                            this.currentBufferLeft = new Float32Array(0);
                            this.currentBufferRight = new Float32Array(0);
                        } else {
                            // No data at all - complete silence
                            leftChannel.fill(0);
                            rightChannel.fill(0);
                        }
                    } else {
                        // We have enough data
                        leftChannel.set(this.currentBufferLeft.subarray(0, requiredSamples));
                        rightChannel.set(this.currentBufferRight.subarray(0, requiredSamples));
                        
                        // Keep the remainder
                        this.currentBufferLeft = this.currentBufferLeft.subarray(requiredSamples);
                        this.currentBufferRight = this.currentBufferRight.subarray(requiredSamples);
    
                        // If current buffer is getting too large, trim it
                        if (this.currentBufferLeft.length > this.maxBufferSize) {
                            this.currentBufferLeft = this.currentBufferLeft.slice(-this.maxBufferSize);
                            this.currentBufferRight = this.currentBufferRight.slice(-this.maxBufferSize);
                        }
                    }
    
                    // Debug info about buffer states
                    if (this.currentBufferLeft.length === 0 && this.queueLeft.length === 0) {
                        console.debug('Buffer underrun - no data available');
                    }
    
                    return this.isPlaying;
                }
    
                // Helper method to get current buffer state
                getBufferState() {
                    return {
                        currentBufferSize: this.currentBufferLeft.length,
                        queueLength: this.queueLeft.length,
                        totalBuffered: this.currentBufferLeft.length + 
                            this.queueLeft.reduce((acc, buf) => acc + buf.length, 0)
                    };
                }
            }
    
            registerProcessor('high-performance-processor', HighPerformanceProcessor);
        `;
    }
    // private getWorkletCode(): string {
    //     return `
    //         class HighPerformanceProcessor extends AudioWorkletProcessor {
    //             constructor(options) {
    //                 super();
    //                 this.sampleRate = options.processorOptions.sampleRate;
    //                 this.bufferLeft = new Float32Array(0);
    //                 this.bufferRight = new Float32Array(0);
    //                 this.isPlaying = true;
    //                 const isWindows = options.processorOptions.isWindows || false;

    //                 // Buffer size calculations optimized for Opus
    //                 this.minimumBufferSize = Math.ceil(this.sampleRate * 0.20);  // 40ms minimum
    //                 this.targetBufferSize = Math.ceil(this.sampleRate * 0.40);   // 60ms target
    //                 this.maxBufferSize = Math.ceil(this.sampleRate * 0.80);      // 120ms maximum
    //                 this.smoothingFactor = isWindows ? 0.15 : 0.1;  // Adjusted for Opus

    //                 this.port.onmessage = ({data}) => {
    //                     if (data.type === 'audio') {
    //                         this.handleAudioData(data.audioData, data.channels);
    //                     } else if (data.type === 'stop') {
    //                         this.isPlaying = false;
    //                     }
    //                 };
    //             }

    //             handleAudioData(newData, channels) {
    //                 if (!(newData instanceof Float32Array)) return;

    //                 if (channels === 1) {
    //                     // Mono audio - duplicate to both channels
    //                     const smoothedData = this.smoothBuffer(newData);
                        
    //                     const newBufferLeft = new Float32Array(this.bufferLeft.length + smoothedData.length);
    //                     const newBufferRight = new Float32Array(this.bufferRight.length + smoothedData.length);
                        
    //                     newBufferLeft.set(this.bufferLeft);
    //                     newBufferRight.set(this.bufferRight);
    //                     newBufferLeft.set(smoothedData, this.bufferLeft.length);
    //                     newBufferRight.set(smoothedData, this.bufferRight.length);
                        
    //                     this.bufferLeft = newBufferLeft;
    //                     this.bufferRight = newBufferRight;
    //                 } else {
    //                     // Stereo audio - split channels
    //                     const smoothedLeft = this.smoothBuffer(newData.filter((_, i) => i % 2 === 0));
    //                     const smoothedRight = this.smoothBuffer(newData.filter((_, i) => i % 2 === 1));
                        
    //                     const newBufferLeft = new Float32Array(this.bufferLeft.length + smoothedLeft.length);
    //                     const newBufferRight = new Float32Array(this.bufferRight.length + smoothedRight.length);
                        
    //                     newBufferLeft.set(this.bufferLeft);
    //                     newBufferRight.set(this.bufferRight);
    //                     newBufferLeft.set(smoothedLeft, this.bufferLeft.length);
    //                     newBufferRight.set(smoothedRight, this.bufferRight.length);
                        
    //                     this.bufferLeft = newBufferLeft;
    //                     this.bufferRight = newBufferRight;
    //                 }

    //                 // Trim buffers if they exceed maximum size
    //                 if (this.bufferLeft.length > this.maxBufferSize) {
    //                     this.bufferLeft = this.bufferLeft.slice(-this.maxBufferSize);
    //                     this.bufferRight = this.bufferRight.slice(-this.maxBufferSize);
    //                 }
    //             }

    //             smoothBuffer(data) {
    //                 const smoothed = new Float32Array(data.length);
    //                 smoothed[0] = data[0];
    //                 for (let i = 1; i < data.length; i++) {
    //                     smoothed[i] = this.smoothingFactor * data[i] + (1 - this.smoothingFactor) * smoothed[i-1];
    //                 }
    //                 return smoothed;
    //             }

    //             process(inputs, outputs) {
    //                 const output = outputs[0];
    //                 const leftChannel = output[0];
    //                 const rightChannel = output[1];
    //                 const requiredSamples = leftChannel.length;

    //                 if (this.bufferLeft.length < this.minimumBufferSize) {
    //                     leftChannel.fill(0);
    //                     rightChannel.fill(0);
    //                     return this.isPlaying;
    //                 }

    //                 if (this.bufferLeft.length >= requiredSamples) {
    //                     leftChannel.set(this.bufferLeft.subarray(0, requiredSamples));
    //                     rightChannel.set(this.bufferRight.subarray(0, requiredSamples));
    //                     this.bufferLeft = this.bufferLeft.subarray(requiredSamples);
    //                     this.bufferRight = this.bufferRight.subarray(requiredSamples);
    //                 } else {
    //                     leftChannel.set(this.bufferLeft);
    //                     rightChannel.set(this.bufferRight);
    //                     leftChannel.fill(0, this.bufferLeft.length);
    //                     rightChannel.fill(0, this.bufferRight.length);
    //                     this.bufferLeft = new Float32Array(0);
    //                     this.bufferRight = new Float32Array(0);
    //                 }

    //                 return this.isPlaying;
    //             }
    //         }

    //         registerProcessor('high-performance-processor', HighPerformanceProcessor);
    //     `;
    // }

    private toArrayBuffer(data: Uint8Array): ArrayBuffer {
        const arrayBuffer = new ArrayBuffer(data.length);
        const view = new Uint8Array(arrayBuffer);
        view.set(data);
        return arrayBuffer;
    }

    public async sendPacket(packet: AudioPacket): Promise<void> {
        if (!this.isPlaying || !this.workletNode || !this.audioContext) return;

        try {
            // For Opus, we need to decode the data first
            const arrayBuffer = this.toArrayBuffer(packet.audioData);
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

            const channels = audioBuffer.numberOfChannels;
            let decodedData: Float32Array;

            if (channels === 1) {
                // Mono audio
                decodedData = new Float32Array(audioBuffer.length);
                decodedData.set(audioBuffer.getChannelData(0));
            } else {
                // Stereo audio - interleave channels
                decodedData = new Float32Array(audioBuffer.length * 2);
                const leftChannel = audioBuffer.getChannelData(0);
                const rightChannel = audioBuffer.getChannelData(1);
                
                for (let i = 0; i < audioBuffer.length; i++) {
                    decodedData[i * 2] = leftChannel[i];
                    decodedData[i * 2 + 1] = rightChannel[i];
                }
            }

            // Normalize audio if needed
            const maxAmplitude = Math.max(...decodedData.map(Math.abs));
            if (maxAmplitude > 1) {
                for (let i = 0; i < decodedData.length; i++) {
                    decodedData[i] /= maxAmplitude;
                }
            }

            this.workletNode.port.postMessage({
                type: 'audio',
                audioData: decodedData,
                channels: channels
            }, [decodedData.buffer]);

        } catch (error) {
            console.error('Packet processing error:', error);
        }
    }

    public async start(): Promise<void> {
        if (!this.audioContext || this.isPlaying) return;
        
        await this.audioContext.resume();
        this.isPlaying = true;
    }

    public async resumeContext(): Promise<void> {
        console.log('Attempting to resume context...');

        if (!this.audioContext) {
            console.warn('No AudioContext available');
            return;
        }

        console.log('Current context state:', this.audioContext.state);

        if (this.audioContext.state === 'suspended') {
            try {
                console.log('Resuming suspended context...');
                await this.audioContext.resume();
                console.log('Context resumed successfully');
            } catch (error) {
                console.error('Failed to resume context:', error);
                throw new Error('Failed to resume audio context');
            }
        } else {
            console.log('Context is already in state:', this.audioContext.state);
        }
    }

    public async suspendContext(): Promise<void> {
        if (!this.audioContext) {
            console.warn('No AudioContext available');
            return;
        }

        if (this.audioContext.state === 'running') {
            try {
                await this.audioContext.suspend();
                console.log('Context suspended successfully');
            } catch (error) {
                console.error('Failed to suspend context:', error);
                throw new Error('Failed to suspend audio context');
            }
        }
    }

    

    public async stop(): Promise<void> {
        if (!this.isPlaying) return;

        try {
            if (this.workletNode) {
                this.workletNode.port.postMessage({ type: 'stop' });
            }

            await this.suspendContext();
            this.isPlaying = false;
            console.log('Audio streaming stopped');
        } catch (error) {
            console.error('Error stopping audio:', error);
            throw error;
        }
    }

    public setVolume(value: number): void {
        if (this.gainNode) {
            this.gainNode.gain.value = Math.max(0, Math.min(1, value));
        }
    }

    public async cleanup(): Promise<void> {
        this.stop();
        
        this.workletNode?.disconnect();
        this.gainNode?.disconnect();
        await this.audioContext?.close();
        
        this.workletNode = undefined;
        this.gainNode = undefined;
        this.audioContext = undefined;
        this.isInitialized = false;
    }

}