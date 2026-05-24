import sharp from "sharp";

export interface DecodedImage {
  png: Buffer;
  width: number;
  height: number;
}

const PNG_OPTIONS = {
  compressionLevel: 9,
  adaptiveFiltering: false,
  effort: 10,
} as const;

// Decode an uncompressed BI_RGB BMP (24-bit BGR or 32-bit BGRX) to RGBA
// pixels. The archive contains only this variety; we deliberately don't
// support palette, bitfields, or RLE. Card art has no transparency, so the
// alpha byte is always emitted as 0xff.
function decodeBmpRgba(buf: Buffer): { width: number; height: number; pixels: Buffer } {
  if (buf.length < 14 || buf[0] !== 0x42 || buf[1] !== 0x4d) {
    throw new Error("BMP: missing 'BM' magic");
  }
  const dataOffset = buf.readUInt32LE(10);
  const headerSize = buf.readUInt32LE(14);
  if (headerSize < 12) throw new Error(`BMP: bad header size ${headerSize}`);
  const width = buf.readInt32LE(18);
  const heightRaw = buf.readInt32LE(22);
  const bitCount = buf.readUInt16LE(28);
  const compression = buf.readUInt32LE(30);
  if (compression !== 0) {
    throw new Error(`BMP: unsupported compression ${compression}`);
  }
  if (bitCount !== 24 && bitCount !== 32) {
    throw new Error(`BMP: unsupported bit depth ${bitCount}`);
  }
  const height = Math.abs(heightRaw);
  const bottomUp = heightRaw > 0;
  const bytesPerPixel = bitCount / 8;
  const rowStride = Math.floor((bitCount * width + 31) / 32) * 4;
  const pixels = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    const srcRow = bottomUp ? height - 1 - y : y;
    const srcRowStart = dataOffset + srcRow * rowStride;
    for (let x = 0; x < width; x++) {
      const src = srcRowStart + x * bytesPerPixel;
      const dst = (y * width + x) * 4;
      pixels[dst] = buf[src + 2]!; // R
      pixels[dst + 1] = buf[src + 1]!; // G
      pixels[dst + 2] = buf[src]!; // B
      pixels[dst + 3] = 0xff; // A — card art is fully opaque
    }
  }
  return { width, height, pixels };
}

function isBmp(buf: Buffer): boolean {
  return buf.length >= 2 && buf[0] === 0x42 && buf[1] === 0x4d; // "BM"
}

function pipelineFor(input: Buffer): sharp.Sharp {
  if (isBmp(input)) {
    const { width, height, pixels } = decodeBmpRgba(input);
    return sharp(pixels, { raw: { width, height, channels: 4 } });
  }
  return sharp(input, { failOn: "none" });
}

export async function decodeImageToPng(input: Buffer): Promise<Buffer> {
  return pipelineFor(input).png(PNG_OPTIONS).toBuffer();
}

export async function decodeImage(input: Buffer): Promise<DecodedImage> {
  const pipeline = pipelineFor(input);
  const meta = await pipeline.metadata();
  const png = await pipeline.png(PNG_OPTIONS).toBuffer();
  return { png, width: meta.width ?? 0, height: meta.height ?? 0 };
}
