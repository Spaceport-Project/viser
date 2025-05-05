
export enum AudioFormat {
    OPUS = 'opus',
    AAC = 'aac'
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
    
    private readonly formatSettings = {
        [AudioFormat.OPUS]: {
            DECODE_BATCH_SIZE: 2880*2,
            BUFFER_TARGET_LENGTH: 4800 * 2,
            MAX_BUFFER_LENGTH: 9600 * 2,
            DEFAULT_SAMPLE_RATE: 48000
        },
        [AudioFormat.AAC]: {
            DECODE_BATCH_SIZE: 1024 *2,
            BUFFER_TARGET_LENGTH: 2048 *2,
            MAX_BUFFER_LENGTH: 4096*2,
            DEFAULT_SAMPLE_RATE: 44100
        }
    };

    constructor(format: AudioFormat, sampleRate?: number) {
        // Set sample rate based on format, with optional override
        if (sampleRate) {
            this.sampleRate = sampleRate;
        } else {
            // Use format-specific default sample rate
            this.sampleRate = this.formatSettings[format].DEFAULT_SAMPLE_RATE;
        }
        this.currentFormat = format;
    }
    // constructor(sampleRate?: number) {
    //     this.sampleRate = sampleRate || this.formatSettings[AudioFormat.OPUS].DEFAULT_SAMPLE_RATE;
    // }

    public async initialize(): Promise<void> {
        if (this.isInitialized) return;

        try {
            // this.currentFormat = format;
            await this.setupAudioSystem();
            this.isInitialized = true;
        } catch (error) {
            console.error('Initialization failed:', error);
            throw error;
        }
    }

    private async setupAudioSystem(): Promise<void> {
        const isWindows = navigator.platform.indexOf('Win') > -1;
        const formatConfig = this.formatSettings[this.currentFormat!];
        const bufferSize = isWindows ? formatConfig.DECODE_BATCH_SIZE : Math.floor(formatConfig.DECODE_BATCH_SIZE / 1.5);
        
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
            outputChannelCount: [2],
            channelCount: 2,
            channelCountMode: 'explicit',
            channelInterpretation: 'speakers',
            processorOptions: {
                sampleRate: this.sampleRate,
                bufferSize: bufferSize,
                isWindows: isWindows,
                format: this.currentFormat,
                formatSettings: this.formatSettings[this.currentFormat!]
            }
        });

        this.workletNode.connect(this.gainNode);
    }

    // private getWorkletCode(): string {
    //     return `
    //     class AudioWorkletProcessor extends AudioWorkletProcessor {
    //         constructor(options) {
    //             super();
    //             this.sampleRate = options.processorOptions.sampleRate;
    //             this.format = options.processorOptions.format;
    //             this.formatSettings = options.processorOptions.formatSettings;
                
    //             this.queueLeft = [];
    //             this.queueRight = [];
    //             this.currentBufferLeft = new Float32Array(0);
    //             this.currentBufferRight = new Float32Array(0);
                
    //             this.isPlaying = true;
    //             const isWindows = options.processorOptions.isWindows;
                
    //             this.minimumBufferSize = Math.ceil(this.sampleRate * 0.10);
    //             this.targetBufferSize = this.formatSettings.BUFFER_TARGET_LENGTH;
    //             this.maxBufferSize = this.formatSettings.MAX_BUFFER_LENGTH;
    //             this.maxQueueSize = this.format === 'aac' ? 15 : 20;
    //             this.smoothingFactor = isWindows ? 0.15 : 0.1;
                
    //             if (this.format === 'aac') {
    //                 this.processFrameSize = 1024;
    //                 this.overlapSize = 128;
    //             } else {
    //                 this.processFrameSize = 2880;
    //                 this.overlapSize = 0;
    //             }

    //             this.port.onmessage = (event) => {
    //                 if (event.data.type === 'audio') {
    //                     this.handleAudioData(event.data.audioData, event.data.channels);
    //                 } else if (event.data.type === 'stop') {
    //                     this.isPlaying = false;
    //                 }
    //             };
    //         }

    //         handleAudioData(audioData, channels) {
    //             if (channels === 1) {
    //                 const monoData = new Float32Array(audioData);
    //                 this.queueLeft.push(monoData);
    //                 this.queueRight.push(monoData);
    //             } else {
    //                 const leftChannel = new Float32Array(audioData.length / 2);
    //                 const rightChannel = new Float32Array(audioData.length / 2);
                    
    //                 for (let i = 0; i < audioData.length; i += 2) {
    //                     leftChannel[i / 2] = audioData[i];
    //                     rightChannel[i / 2] = audioData[i + 1];
    //                 }
                    
    //                 this.queueLeft.push(leftChannel);
    //                 this.queueRight.push(rightChannel);
    //             }

    //             while (this.queueLeft.length > this.maxQueueSize) {
    //                 this.queueLeft.shift();
    //                 this.queueRight.shift();
    //             }
    //         }

    //         process(inputs, outputs) {
    //             const output = outputs[0];
    //             const leftChannel = output[0];
    //             const rightChannel = output[1];
                
    //             if (!this.isPlaying) return false;

    //             for (let i = 0; i < leftChannel.length; i++) {
    //                 if (this.currentBufferLeft.length === 0) {
    //                     if (this.queueLeft.length === 0) {
    //                         leftChannel[i] = 0;
    //                         rightChannel[i] = 0;
    //                         continue;
    //                     }
    //                     this.currentBufferLeft = this.queueLeft.shift()!;
    //                     this.currentBufferRight = this.queueRight.shift()!;
    //                 }

    //                 leftChannel[i] = this.currentBufferLeft[0];
    //                 rightChannel[i] = this.currentBufferRight[0];
                    
    //                 this.currentBufferLeft = this.currentBufferLeft.subarray(1);
    //                 this.currentBufferRight = this.currentBufferRight.subarray(1);
    //             }

    //             return true;
    //         }
    //     }

    //     registerProcessor('high-performance-processor', AudioWorkletProcessor);
    //     `;
    // }
    // private getWorkletCode(): string {
    //     return `
    //     class HighPerformanceProcessor extends AudioWorkletProcessor {
    //         constructor(options) {
    //             super();
    //             this.sampleRate = options.processorOptions.sampleRate;
    //             this.format = options.processorOptions.format;
    //             this.formatSettings = options.processorOptions.formatSettings;
                
    //             // Audio buffers for left and right channels
    //             this.queueLeft = [];
    //             this.queueRight = [];
    //             this.currentBufferLeft = new Float32Array(0);
    //             this.currentBufferRight = new Float32Array(0);
                
    //             this.isPlaying = true;
    //             const isWindows = options.processorOptions.isWindows;
                
    //             // Format-specific buffer settings
    //             this.minimumBufferSize = Math.ceil(this.sampleRate * 0.10);
    //             this.targetBufferSize = this.formatSettings.BUFFER_TARGET_LENGTH;
    //             this.maxBufferSize = this.formatSettings.MAX_BUFFER_LENGTH;
    //             this.maxQueueSize = this.format === 'aac' ? 15 : 20; // Different queue sizes for AAC vs OPUS
                
    //             // Format-specific processing parameters
    //             if (this.format === 'aac') {
    //                 this.processFrameSize = 1024; // Standard AAC frame size
    //                 this.overlapSize = 128;       // AAC overlap size for smooth transitions
    //                 this.smoothingFactor = 0.1;   // Less smoothing for AAC
    //             } else {
    //                 this.processFrameSize = 2880; // OPUS frame size
    //                 this.overlapSize = 0;         // No overlap needed for OPUS
    //                 this.smoothingFactor = isWindows ? 0.15 : 0.1; // Platform-specific smoothing
    //             }
    
    //             this.port.onmessage = (event) => {
    //                 if (event.data.type === 'audio') {
    //                     this.handleAudioData(
    //                         event.data.audioData, 
    //                         event.data.channels,
    //                         event.data.frameSize,
    //                         event.data.format
    //                     );
    //                 } else if (event.data.type === 'stop') {
    //                     this.isPlaying = false;
    //                 }
    //             };
    //         }
    
    //         handleAudioData(audioData, channels, frameSize, format) {
    //             // Handle incoming audio data based on format
    //             if (channels === 1) {
    //                 // Mono to stereo conversion
    //                 const monoData = new Float32Array(audioData);
    //                 this.queueLeft.push(monoData);
    //                 this.queueRight.push(monoData);
    //             } else {
    //                 // Direct stereo handling
    //                 const leftChannel = new Float32Array(audioData.length / 2);
    //                 const rightChannel = new Float32Array(audioData.length / 2);
                    
    //                 for (let i = 0; i < audioData.length; i += 2) {
    //                     leftChannel[i / 2] = audioData[i];
    //                     rightChannel[i / 2] = audioData[i + 1];
    //                 }
                    
    //                 this.queueLeft.push(leftChannel);
    //                 this.queueRight.push(rightChannel);
    //             }
    
    //             // Maintain buffer size based on format
    //             while (this.queueLeft.length > this.maxQueueSize) {
    //                 this.queueLeft.shift();
    //                 this.queueRight.shift();
    //             }
    //         }
    
    //         process(inputs, outputs) {
    //             const output = outputs[0];
    //             const leftChannel = output[0];
    //             const rightChannel = output[1];
                
    //             if (!this.isPlaying) return false;
    
    //             // Process audio frames
    //             for (let i = 0; i < leftChannel.length; i++) {
    //                 if (this.currentBufferLeft.length === 0) {
    //                     if (this.queueLeft.length === 0) {
    //                         // Handle buffer underrun
    //                         leftChannel[i] = 0;
    //                         rightChannel[i] = 0;
    //                         continue;
    //                     }
    //                     // Get next buffer
    //                     this.currentBufferLeft = this.queueLeft.shift();
    //                     this.currentBufferRight = this.queueRight.shift();
    
    //                     // Apply format-specific processing
    //                     // if (this.format === 'aac') {
    //                     //     // Apply overlap-add for AAC
    //                     //     if (this.previousLeft && this.overlapSize > 0) {
    //                     //         for (let j = 0; j < this.overlapSize; j++) {
    //                     //             const weight = j / this.overlapSize;
    //                     //             this.currentBufferLeft[j] = 
    //                     //                 this.currentBufferLeft[j] * weight + 
    //                     //                 this.previousLeft[j] * (1 - weight);
    //                     //             this.currentBufferRight[j] = 
    //                     //                 this.currentBufferRight[j] * weight + 
    //                     //                 this.previousRight[j] * (1 - weight);
    //                     //         }
    //                     //     }
    //                     //     // Save last portion for next overlap
    //                     //     this.previousLeft = this.currentBufferLeft.slice(-this.overlapSize);
    //                     //     this.previousRight = this.currentBufferRight.slice(-this.overlapSize);
    //                     // }
    //                 }
    
    //                 // Output processed audio
    //                 leftChannel[i] = this.currentBufferLeft[0];
    //                 rightChannel[i] = this.currentBufferRight[0];
                    
    //                 // Advance buffer position
    //                 this.currentBufferLeft = this.currentBufferLeft.subarray(1);
    //                 this.currentBufferRight = this.currentBufferRight.subarray(1);
    //             }
    
    //             return true;
    //         }
    //     }
    
    //     registerProcessor('high-performance-processor', HighPerformanceProcessor);
    //     `;
    // }
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
                        else if (data.type === 'clear_buffers') {
                            this.clearBuffers();
                        } 
                    };
                }
                clearBuffers() {
                // Immediately clear all buffers
                    this.queueLeft = [];
                    this.queueRight = [];
                    this.currentBufferLeft = new Float32Array(0);
                    this.currentBufferRight = new Float32Array(0);
                    console.log("clearing buffers done")

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

    public async start(): Promise<void> {
        if (!this.audioContext) return;
        
        await this.audioContext.resume();
        this.isPlaying = true;
    }

    public stop(): void {
        this.isPlaying = false;
        if (this.workletNode) {
            this.workletNode.port.postMessage({ type: 'stop' });
        }
    }

    public setVolume(volume: number): void {
        if (this.gainNode) {
            this.gainNode.gain.value = Math.max(0, Math.min(1, volume));
        }
    }

    private toArrayBuffer(data: Uint8Array): ArrayBuffer {
        const arrayBuffer = new ArrayBuffer(data.length);
        const view = new Uint8Array(arrayBuffer);
        view.set(data);
        return arrayBuffer;
    }
   
    

    public async resumeContext(): Promise<void> {

        if (!this.audioContext) {
            console.warn('No AudioContext available');
            return;
        }

        console.log('Current context state:', this.audioContext.state);

        if (this.audioContext.state === 'suspended') {
            try {
                // console.log('Resuming suspended context...');
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
                if ( this.workletNode) {
                    this.workletNode.port.postMessage({ 
                        type: 'clear_buffers' 
                    });
                    
                    // Small delay to ensure buffers are cleared
                    await new Promise(resolve => setTimeout(resolve, 10));
                }
                await this.audioContext.suspend();
                console.log('Context suspended successfully');
            } catch (error) {
                console.error('Failed to suspend context:', error);
                throw new Error('Failed to suspend audio context');
            }
        }
    }


public async sendPacket(packet: AudioPacket): Promise<void> {
    if (!this.isPlaying || !this.workletNode || !this.audioContext) return;

    try {
        const arrayBuffer = this.toArrayBuffer(packet.audioData);
        const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

        const channels = audioBuffer.numberOfChannels;
        let decodedData: Float32Array;

        // Format-specific sample rate handling
        if (audioBuffer.sampleRate !== this.sampleRate) {
            // Resample if needed based on format
            const resamplingRatio = this.sampleRate / audioBuffer.sampleRate;
            const resampledLength = Math.floor(audioBuffer.length * resamplingRatio);
            
            if (channels === 1) {
                decodedData = new Float32Array(resampledLength);
                const originalData = audioBuffer.getChannelData(0);
                for (let i = 0; i < resampledLength; i++) {
                    const originalIndex = Math.floor(i / resamplingRatio);
                    decodedData[i] = originalData[originalIndex];
                }
            } else {
                decodedData = new Float32Array(resampledLength * 2);
                const leftChannel = audioBuffer.getChannelData(0);
                const rightChannel = audioBuffer.getChannelData(1);
                
                for (let i = 0; i < resampledLength; i++) {
                    const originalIndex = Math.floor(i / resamplingRatio);
                    decodedData[i * 2] = leftChannel[originalIndex];
                    decodedData[i * 2 + 1] = rightChannel[originalIndex];
                }
            }
        } else {
            // No resampling needed
            if (channels === 1) {
                decodedData = new Float32Array(audioBuffer.length);
                decodedData.set(audioBuffer.getChannelData(0));
            } else {
                decodedData = new Float32Array(audioBuffer.length * 2);
                const leftChannel = audioBuffer.getChannelData(0);
                const rightChannel = audioBuffer.getChannelData(1);
                
                for (let i = 0; i < audioBuffer.length; i++) {
                    decodedData[i * 2] = leftChannel[i];
                    decodedData[i * 2 + 1] = rightChannel[i];
                }
            }
        }

        // Format-specific processing
        // const formatConfig = this.formatSettings[packet.format];
        // const frameSize = formatConfig.DECODE_BATCH_SIZE;

        // Process audio in frames
        // for (let i = 0; i < decodedData.length; i += frameSize * 2) {
        //     const frameEnd = Math.min(i + frameSize * 2, decodedData.length);
        //     const frame = decodedData.subarray(i, frameEnd);

        //     if (packet.format === AudioFormat.AAC) {
        //         // AAC-specific processing
        //         const gain = 0.95; // Slight gain reduction for AAC
        //         for (let j = 0; j < frame.length; j++) {
        //             frame[j] *= gain;
        //         }
        //     } else {
        //         // OPUS-specific processing
        //         // OPUS typically needs less processing as it's already optimized
        //         const gain = 1.0;
        //         for (let j = 0; j < frame.length; j++) {
        //             frame[j] *= gain;
        //         }
        //     }
        // }

        // Normalize audio to prevent clipping
        const maxAmplitude = Math.max(...decodedData.map(Math.abs));
        if (maxAmplitude > 1) {
            const scale = 1 / maxAmplitude;
            for (let i = 0; i < decodedData.length; i++) {
                decodedData[i] *= scale;
            }
        }

        // Send to audio worklet with format-specific metadata
        this.workletNode.port.postMessage({
            type: 'audio',
            audioData: decodedData,
            channels: channels,
            // format: packet.format,
            // frameSize: frameSize,
            // timeStamp: packet.timeStamp
        }, [decodedData.buffer]);

    } catch (error) {
        console.error(`Error processing ${packet.format} audio packet:`, error);
    }
}
    // public async sendPacket(packet: AudioPacket): Promise<void> {
    //     if (!this.isPlaying || !this.workletNode || !this.audioContext) return;

    //     try {
    //         const arrayBuffer = this.toArrayBuffer(packet.audioData);
    //         const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

    //         const channels = audioBuffer.numberOfChannels;
    //         let decodedData: Float32Array;

    //         if (channels === 1) {
    //             decodedData = new Float32Array(audioBuffer.length);
    //             decodedData.set(audioBuffer.getChannelData(0));
    //         } else {
    //             decodedData = new Float32Array(audioBuffer.length * 2);
    //             const leftChannel = audioBuffer.getChannelData(0);
    //             const rightChannel = audioBuffer.getChannelData(1);
                
    //             for (let i = 0; i < audioBuffer.length; i++) {
    //                 decodedData[i * 2] = leftChannel[i];
    //                 decodedData[i * 2 + 1] = rightChannel[i];
    //             }
    //         }

    //         if (packet.format === AudioFormat.AAC) {
    //             decodedData = this.processAACData(decodedData);
    //         }

    //         const maxAmplitude = Math.max(...decodedData.map(Math.abs));
    //         if (maxAmplitude > 1) {
    //             for (let i = 0; i < decodedData.length; i++) {
    //                 decodedData[i] /= maxAmplitude;
    //             }
    //         }

    //         this.workletNode.port.postMessage({
    //             type: 'audio',
    //             audioData: decodedData,
    //             channels: channels
    //         }, [decodedData.buffer]);

    //     } catch (error) {
    //         console.error('Error processing audio packet:', error);
    //     }
    // }

    private processAACData(data: Float32Array): Float32Array {
        return data;
    }
}