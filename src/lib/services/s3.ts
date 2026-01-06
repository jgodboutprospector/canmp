import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// S3 Configuration
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'canmp-donations';
const CDN_URL = process.env.AWS_CLOUDFRONT_URL; // Optional CloudFront CDN

export interface S3UploadResult {
  success: boolean;
  url?: string;
  key?: string;
  error?: string;
}

export interface S3FileInfo {
  key: string;
  url: string;
  size?: number;
  contentType?: string;
}

/**
 * Generate a unique S3 key for donation photos
 */
export function generateDonationPhotoKey(
  donationItemId: string,
  filename: string
): string {
  const timestamp = Date.now();
  const sanitizedName = filename.replace(/[^a-zA-Z0-9.-]/g, '_').toLowerCase();
  return `donations/${donationItemId}/${timestamp}_${sanitizedName}`;
}

/**
 * Get the public URL for an S3 object
 */
export function getPublicUrl(key: string): string {
  if (CDN_URL) {
    return `${CDN_URL}/${key}`;
  }
  return `https://${BUCKET_NAME}.s3.amazonaws.com/${key}`;
}

/**
 * Upload a file to S3
 */
export async function uploadToS3(
  file: Buffer,
  key: string,
  contentType: string,
  metadata?: Record<string, string>
): Promise<S3UploadResult> {
  try {
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: file,
      ContentType: contentType,
      Metadata: metadata,
      // Make publicly readable
      ACL: 'public-read',
    });

    await s3Client.send(command);

    return {
      success: true,
      url: getPublicUrl(key),
      key,
    };
  } catch (error) {
    console.error('S3 upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to upload to S3',
    };
  }
}

/**
 * Upload a donation photo to S3
 */
export async function uploadDonationPhoto(
  file: Buffer,
  donationItemId: string,
  filename: string,
  contentType: string
): Promise<S3UploadResult> {
  const key = generateDonationPhotoKey(donationItemId, filename);
  return uploadToS3(file, key, contentType, {
    donationItemId,
    originalFilename: filename,
  });
}

/**
 * Delete a file from S3
 */
export async function deleteFromS3(key: string): Promise<boolean> {
  try {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    await s3Client.send(command);
    return true;
  } catch (error) {
    console.error('S3 delete error:', error);
    return false;
  }
}

/**
 * Get a signed URL for temporary access (useful for private buckets)
 */
export async function getSignedDownloadUrl(
  key: string,
  expiresIn: number = 3600
): Promise<string | null> {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn });
    return signedUrl;
  } catch (error) {
    console.error('Error getting signed URL:', error);
    return null;
  }
}

/**
 * Check if a file exists in S3
 */
export async function fileExistsInS3(key: string): Promise<boolean> {
  try {
    const command = new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    await s3Client.send(command);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get file info from S3
 */
export async function getFileInfo(key: string): Promise<S3FileInfo | null> {
  try {
    const command = new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const response = await s3Client.send(command);

    return {
      key,
      url: getPublicUrl(key),
      size: response.ContentLength,
      contentType: response.ContentType,
    };
  } catch {
    return null;
  }
}

/**
 * Download file from URL and upload to S3 (for migrating Airtable images)
 */
export async function migrateImageToS3(
  sourceUrl: string,
  donationItemId: string,
  filename: string
): Promise<S3UploadResult> {
  try {
    // Fetch the image from the source URL
    const response = await fetch(sourceUrl);

    if (!response.ok) {
      return {
        success: false,
        error: `Failed to fetch image: ${response.status} ${response.statusText}`,
      };
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const buffer = Buffer.from(await response.arrayBuffer());

    // Upload to S3
    return uploadDonationPhoto(buffer, donationItemId, filename, contentType);
  } catch (error) {
    console.error('Image migration error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to migrate image',
    };
  }
}

/**
 * Validate image file type
 */
export function isValidImageType(contentType: string): boolean {
  const validTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
  ];
  return validTypes.includes(contentType.toLowerCase());
}

/**
 * Get max file size in bytes (10MB default)
 */
export function getMaxFileSize(): number {
  return 10 * 1024 * 1024; // 10MB
}
