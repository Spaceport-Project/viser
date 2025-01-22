
export class NALParser {
   

  static parseNALUnits(data: Uint8Array):  { [key: number] : Uint8Array; }  {
    let keyFrame:number=0;
    const keyNalUnits: { [key: number] : Uint8Array; } = {};

    let i = 0
    while (i < data.length ) {
     
        const length_bytes = data.slice(i, i+4)
        let length =
        (length_bytes[3] << 0) |
        (length_bytes[2] << 8) |
        (length_bytes[1] << 16) |
        (length_bytes[0] << 24); // Note: This will yield a signed 32-bit integer
        length = length >>> 0;
        keyFrame = data[i+4] & 0x1f;
        keyNalUnits[keyFrame] = data.slice(i, i+4+length);
        i = i + 4 + length;



    }
  

    return keyNalUnits;
  }

    

  
    static isKeyFrame(nalUnit: Uint8Array): boolean {
      if (nalUnit.length < 1) return false;
      const nalType = nalUnit[0] & 0x1f;
      console.log("key type",nalUnit[0], nalType)
      return nalType === 5;
    }
  }