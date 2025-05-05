export enum AudioFormat {
    MP3 = 'mp3',
    IPOD = 'ipod',
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
    // private decoder?: any;
    private isInitialized: boolean = false;
    private isPlaying: boolean = false;
    private currentFormat?: AudioFormat;
    
    // Performance optimization settings
    private readonly DECODE_BATCH_SIZE = 2048; // Adjust based on your needs
    private readonly BUFFER_TARGET_LENGTH = 4096; // ~93ms at 44.1kHz
    private readonly MAX_BUFFER_LENGTH = 8192; // Maximum buffer size

    constructor(sampleRate: number = 44100) {
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
        const bufferSize = isWindows ? 2048 : 1024;  
        this.audioContext = new (window.AudioContext)({
            latencyHint: isWindows ? 'playback' : 'interactive',  

            sampleRate: this.sampleRate
        });
        

        this.gainNode = this.audioContext.createGain();
        this.gainNode.gain.value = 1.0;
        this.gainNode.connect(this.audioContext.destination);

        await this.audioContext.audioWorklet.addModule(
            URL.createObjectURL(new Blob([this.getWorkletCode()], 
            { type: 'application/javascript' }))
        );

        this.workletNode = new AudioWorkletNode(this.audioContext, 'high-performance-processor', {
            numberOfInputs: 1,
            numberOfOutputs: 1,
            outputChannelCount: [1],
            channelCount: 1,          // Force mono
            channelCountMode: 'explicit',  // Don't allow channel count to change
            channelInterpretation: 'speakers',
            processorOptions: {
                sampleRate: this.sampleRate,
                bufferSize: bufferSize,  
                isWindows: isWindows ,
                format: this.currentFormat  
            }
           
        });
        this.gainNode.channelCount = 1;
        this.gainNode.channelCountMode = 'explicit';
        this.gainNode.channelInterpretation = 'speakers';

        this.workletNode.connect(this.gainNode);
    }

    // private async initializeDecoder(format: AudioFormat): Promise<void> {
    //     // Using emscripten-based decoders for better performance
    //     switch (format) {
    //         case AudioFormat.MP3:
    //             // Assuming using a lightweight MP3 decoder like minimp3
    //             this.decoder = await this.initMP3Decoder();
    //             break;
    //         case AudioFormat.AAC:
    //             // Assuming using a lightweight AAC decoder like faad
    //             this.decoder = await this.initAACDecoder();
    //             break;
    //     }
    // }
    // private async initMP3Decoder(): Promise<any> {
    //     try {
    //         // Using lamejs for MP3 decoding (more lightweight than mpg.js)
    //         const response = await fetch('https://cdn.jsdelivr.net/npm/lamejs@1.2.1/lame.min.js');
    //         const decoderScript = await response.text();
    //         eval(decoderScript);

    //         return new Mp3Decoder({
    //             sampleRate: this.sampleRate,
    //             channels: 1,
    //             bitRate: 128
    //         });
    //     } catch (error) {
    //         console.error('Failed to initialize MP3 decoder:', error);
    //         throw error;
    //     }
    // }

    // private async initAACDecoder(): Promise<any> {
    //     try {
    //         // Using aac.js for AAC decoding
    //         const response = await fetch('https://cdn.jsdelivr.net/npm/aac.js@0.1.3/aac.min.js');
    //         const decoderScript = await response.text();
    //         eval(decoderScript);

    //         return new AACDecoder({
    //             sampleRate: this.sampleRate,
    //             channels: 1
    //         });
    //     } catch (error) {
    //         console.error('Failed to initialize AAC decoder:', error);
    //         throw error;
    //     }
    // }

    private toArrayBuffer(data: Uint8Array): ArrayBuffer {
        // Create a new ArrayBuffer and copy the data
        const arrayBuffer = new ArrayBuffer(data.length);
        const view = new Uint8Array(arrayBuffer);
        view.set(data);
        return arrayBuffer;
    }
    // Modified decodeAudioData method to work with both decoders
    // private async decodeAudioData(compressedData: Uint8Array): Promise<AudioBuffer | null> {
        
    //     if (!this.audioContext) return null;
    //     console.log("after audio context")
    //     try {
    //         // const arrayBuffer = compressedData.buffer.slice(0);
    //         const arrayBuffer = this.toArrayBuffer(compressedData);  

    //         return await this.audioContext.decodeAudioData(arrayBuffer);
    //     } catch (error) {
    //         console.error('Decode error:', error);
    //         return null;
    //     }
        
    //     // if (!this.decoder) return null;

    //     // try {
    //     //     let decodedData: Int16Array;

    //     //     if (this.currentFormat === AudioFormat.MP3) {
    //     //         decodedData = await this.decodeMP3(compressedData);
    //     //     } else {
    //     //         decodedData = await this.decodeAAC(compressedData);
    //     //     }

    //     //     if (!decodedData || decodedData.length === 0) return null;

    //     //     // Convert to float32 efficiently
    //     //     const float32Data = new Float32Array(decodedData.length);
    //     //     for (let i = 0; i < decodedData.length; i++) {
    //     //         float32Data[i] = decodedData[i] / 32768.0;
    //     //     }
            
    //     //     return float32Data;
    //     // } catch (error) {
    //     //     console.error('Decode error:', error);
    //     //     return null;
    //     // }
    // }

    // private async decodeMP3(data: Uint8Array): Promise<Int16Array> {
    //     return new Promise((resolve, reject) => {
    //         try {
    //             const decoded = this.decoder.decode(data);
    //             resolve(new Int16Array(decoded.buffer));
    //         } catch (error) {
    //             reject(error);
    //         }
    //     });
    // }

    // private async decodeAAC(data: Uint8Array): Promise<Int16Array> {
    //     return new Promise((resolve, reject) => {
    //         try {
    //             const decoded = this.decoder.decode(data);
    //             resolve(new Int16Array(decoded.buffer));
    //         } catch (error) {
    //             reject(error);
    //         }
    //     });
    // }

    private getWorkletCode(): string {
        return `
            class HighPerformanceProcessor extends AudioWorkletProcessor {
                constructor(options) {
                    super();
                    this.sampleRate = options.processorOptions.sampleRate;
                    this.buffer = new Float32Array(0);
                    this.isPlaying = true;
                    this.channelCount = 1;  // Force mono  
                    const isWindows = options.processorOptions.isWindows || false;  

                    // Buffer size calculations (in samples)
                    // this.minimumBufferSize = Math.ceil(this.sampleRate * 0.200);  // 100ms minimum
                    // this.targetBufferSize = Math.ceil(this.sampleRate * 0.300);   // 200ms target
                    // this.maxBufferSize = Math.ceil(this.sampleRate * 0.500);      // 500ms maximum
                    
                    this.minBufferSize = Math.ceil(this.sampleRate * (isWindows ? 0.100 : 0.050));
                    this.targetBufferSize = Math.ceil(this.sampleRate * (isWindows ? 0.150 : 0.100));
                    this.maxBufferSize = Math.ceil(this.sampleRate * (isWindows ? 0.300 : 0.200));
                    // this.jitterBufferSize = Math.ceil(this.sampleRate * (isWindows ? 0.030 : 0.020));  

                    this.smoothingFactor = isWindows ? 0.2 : 0.1;  

                    this.port.onmessage = ({data}) => {
                        if (data.type === 'audio') {
                            this.handleAudioData(data.audioData);
                        } else if (data.type === 'stop') {
                            this.isPlaying = false;
                        }
                    };
                }

                handleAudioData(newData) {
                    if (!(newData instanceof Float32Array)) return;

                    // Apply slight smoothing to reduce artifacts
                    const smoothedData = this.smoothBuffer(newData);
                    
                    // Append new data to buffer
                    const newBuffer = new Float32Array(this.buffer.length + smoothedData.length);
                    newBuffer.set(this.buffer);
                    newBuffer.set(smoothedData, this.buffer.length);
                    this.buffer = newBuffer;

                    // Trim buffer if it exceeds maximum size
                    if (this.buffer.length > this.maxBufferSize) {
                        this.buffer = this.buffer.slice(-this.maxBufferSize);
                    }
                    console.log(this.buffer)
                }

                smoothBuffer(data) {
                    const smoothed = new Float32Array(data.length);
                    // const smoothingFactor = 0.1;
                    
                    smoothed[0] = data[0];
                    for (let i = 1; i < data.length; i++) {
                        smoothed[i] = this.smoothingFactor * data[i] + (1 - this.smoothingFactor) * smoothed[i-1];
                    }
                    return smoothed;
                }

                // smoothBuffer(data) {
                //     const smoothed = new Float32Array(data.length);
                //     let prevSample = this.previousSample;
                    
                //     for (let i = 0; i < data.length; i++) {
                //         smoothed[i] = this.smoothingFactor * data[i] + 
                //                     (1 - this.smoothingFactor) * prevSample;
                //         prevSample = smoothed[i];
                //     }
                    
                //     this.previousSample = prevSample;
                //     return smoothed;
                // }

                process(inputs, outputs) {
                    const output = outputs[0];
                    // Ensure we're only working with the mono channel
                    const monoChannel = output[0];
                    const requiredSamples = monoChannel.length;

                    if (this.buffer.length < this.minimumBufferSize) {
                        monoChannel.fill(0);
                        return this.isPlaying;
                    }


                   
                    if (this.buffer.length >= requiredSamples) {
                        monoChannel.set(this.buffer.subarray(0, requiredSamples));
                        this.buffer = this.buffer.subarray(requiredSamples);
                    } else {
                        monoChannel.set(this.buffer);
                        monoChannel.fill(0, this.buffer.length);
                        this.buffer = new Float32Array(0);
                    }

                    return this.isPlaying;
                }
            }

            registerProcessor('high-performance-processor', HighPerformanceProcessor);
        `;
    }

    public async sendPacket(packet: AudioPacket): Promise<void> {
        console.log(this.isPlaying, this.workletNode , this.audioContext)
        if (!this.isPlaying || !this.workletNode || !this.audioContext) return;

        try {
            const arrayBuffer = this.toArrayBuffer(packet.audioData);
            let audioBuffer ;
            try {  
                audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);  
            } catch (error) {  
                console.error('Failed to decode M4A/AAC audio data:', error);  
                return;  
            }      
            // Verify mono
            if (audioBuffer.numberOfChannels !== 1) {
                console.warn('Received non-mono audio, converting to mono');
            }

            // Get mono channel data
            // const decodedData = new Float32Array(audioBuffer.length);
            // audioBuffer.copyFromChannel(decodedData, 0);
            const decodedData = new Float32Array(audioBuffer.length);  

            if (audioBuffer.numberOfChannels > 1) {
                // Mix down to mono
                const left = audioBuffer.getChannelData(0);
                const right = audioBuffer.getChannelData(1);
                for (let i = 0; i < decodedData.length; i++) {
                    decodedData[i] = (left[i] + right[i]) * 0.5;
                }
            }
            else 
                decodedData.set(audioBuffer.getChannelData(0)); 
                const maxAmplitude = Math.max(...decodedData.map(Math.abs));
                if (maxAmplitude > 0) {  // Avoid division by zero
                    const normalizedData = new Float32Array(decodedData.length);
                    for (let i = 0; i < decodedData.length; i++) {
                        normalizedData[i] = decodedData[i] / maxAmplitude;
                    }
                    
                    this.workletNode.port.postMessage({
                        type: 'audio',
                        audioData: normalizedData,
                    }, [normalizedData.buffer]);
                } else{
                    console.error('max amplite is zero');
                }

           
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

    public getContextState(): AudioContextState | undefined {
        return this.audioContext?.state;
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