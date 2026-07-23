import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";

const BUCKET = process.env.R2_BUCKET_NAME;

const client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

/**
 * Uploads a file buffer to the R2 bucket under the given key.
 *
 * @param {string} key
 * @param {Buffer} buffer
 * @param {string} mimeType
 */
export async function uploadObject(key, buffer, mimeType) {
  await client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    }),
  );
}

/**
 * Fetches an object from the R2 bucket for streaming back to a client.
 *
 * @param {string} key
 * @returns {Promise<{ stream: import('node:stream').Readable, contentType: string }>}
 */
export async function getObject(key) {
  const result = await client.send(
    new GetObjectCommand({ Bucket: BUCKET, Key: key }),
  );
  return {
    stream: result.Body,
    contentType: result.ContentType || "application/octet-stream",
  };
}

/**
 * Fetches an object from the R2 bucket fully buffered in memory, for
 * callers that need the whole file at once (e.g. sending it to the
 * Anthropic API) rather than streaming it to an HTTP response.
 *
 * @param {string} key
 * @returns {Promise<Buffer>}
 */
export async function getObjectBuffer(key) {
  const { stream } = await getObject(key);
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
