import sharp from "sharp";

const THUMBNAIL_WIDTH = 400;

export async function generateThumbnail(imageBuffer: Buffer): Promise<Buffer> {
  return sharp(imageBuffer)
    .rotate()
    .resize({
      width: THUMBNAIL_WIDTH,
      withoutEnlargement: true,
    })
    .jpeg({ quality: 80, mozjpeg: true })
    .toBuffer();
}

export async function validateImageBuffer(buffer: Buffer): Promise<{
  width: number;
  height: number;
  format: string;
}> {
  const metadata = await sharp(buffer).metadata();

  if (!metadata.width || !metadata.height || !metadata.format) {
    throw new Error("Invalid image file");
  }

  return {
    width: metadata.width,
    height: metadata.height,
    format: metadata.format,
  };
}
