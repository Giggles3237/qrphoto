import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { r2Client, R2_BUCKET } from "./client";

export async function headObject(
  objectKey: string
): Promise<{ contentLength: number; contentType: string } | null> {
  try {
    const result = await r2Client.send(
      new HeadObjectCommand({ Bucket: R2_BUCKET, Key: objectKey })
    );
    return {
      contentLength: result.ContentLength ?? 0,
      contentType: result.ContentType ?? "application/octet-stream",
    };
  } catch {
    return null;
  }
}

export async function getObjectBuffer(objectKey: string): Promise<Buffer> {
  const result = await r2Client.send(
    new GetObjectCommand({ Bucket: R2_BUCKET, Key: objectKey })
  );
  const bytes = await result.Body!.transformToByteArray();
  return Buffer.from(bytes);
}

export async function putBuffer(
  objectKey: string,
  buffer: Buffer,
  contentType: string
): Promise<void> {
  await r2Client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: objectKey,
      Body: buffer,
      ContentType: contentType,
    })
  );
}

export async function deleteObject(objectKey: string): Promise<void> {
  await r2Client.send(
    new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: objectKey })
  );
}

export async function deletePrefix(prefix: string): Promise<void> {
  let continuationToken: string | undefined;

  do {
    const listResult = await r2Client.send(
      new ListObjectsV2Command({
        Bucket: R2_BUCKET,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      })
    );

    const objects = listResult.Contents;
    if (!objects || objects.length === 0) break;

    await r2Client.send(
      new DeleteObjectsCommand({
        Bucket: R2_BUCKET,
        Delete: {
          Objects: objects.map((obj) => ({ Key: obj.Key })),
        },
      })
    );

    continuationToken = listResult.NextContinuationToken;
  } while (continuationToken);
}

export async function listObjects(
  prefix: string
): Promise<{ key: string; size: number }[]> {
  const results: { key: string; size: number }[] = [];
  let continuationToken: string | undefined;

  do {
    const listResult = await r2Client.send(
      new ListObjectsV2Command({
        Bucket: R2_BUCKET,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      })
    );

    if (listResult.Contents) {
      for (const obj of listResult.Contents) {
        if (obj.Key) {
          results.push({ key: obj.Key, size: obj.Size ?? 0 });
        }
      }
    }

    continuationToken = listResult.NextContinuationToken;
  } while (continuationToken);

  return results;
}
