import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

function getS3Config() {
  const endpoint = process.env.S3_ENDPOINT;
  const region = process.env.S3_REGION ?? "us-east-1";
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  const forcePathStyle = process.env.S3_FORCE_PATH_STYLE === "true";

  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error("S3 configuration is incomplete");
  }

  return {
    client: new S3Client({
      endpoint,
      region,
      credentials: { accessKeyId, secretAccessKey },
      forcePathStyle,
    }),
    bucket: process.env.S3_BUCKET ?? "event-photos",
    publicEndpoint: process.env.S3_PUBLIC_ENDPOINT ?? endpoint,
  };
}

let s3Config: ReturnType<typeof getS3Config> | null = null;

function config() {
  if (!s3Config) {
    s3Config = getS3Config();
  }
  return s3Config;
}

export function getPublicUrl(key: string): string {
  const { publicEndpoint, bucket } = config();
  const base = publicEndpoint.replace(/\/$/, "");
  return `${base}/${bucket}/${key}`;
}

export async function uploadToStorage(
  key: string,
  body: Buffer,
  contentType: string
): Promise<string> {
  const { client, bucket } = config();

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );

  return getPublicUrl(key);
}

export async function deleteFromStorage(key: string): Promise<void> {
  const { client, bucket } = config();

  await client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  );
}

export function extractKeyFromUrl(url: string): string | null {
  const { publicEndpoint, bucket } = config();
  const prefix = `${publicEndpoint.replace(/\/$/, "")}/${bucket}/`;
  if (!url.startsWith(prefix)) {
    return null;
  }
  return url.slice(prefix.length);
}

export function buildStorageKey(
  eventSlug: string,
  type: "original" | "thumbnail" | "qr",
  filename: string
): string {
  return `events/${eventSlug}/${type}/${filename}`;
}
