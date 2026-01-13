/**
 * Script to migrate donation photos from Airtable to S3
 *
 * This script fetches fresh photo URLs from Airtable API and uploads them to S3
 * for existing donation items.
 *
 * Usage:
 *   npx tsx scripts/migrate-donation-photos.ts
 *
 * Environment variables required:
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 *   - AWS_ACCESS_KEY_ID
 *   - AWS_SECRET_ACCESS_KEY
 *   - AWS_S3_BUCKET
 *   - AWS_REGION
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';
import {
  S3Client,
  PutObjectCommand,
} from '@aws-sdk/client-s3';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'canmp-donations';
const CDN_URL = process.env.AWS_CLOUDFRONT_URL;

// Airtable configuration - set AIRTABLE_API_TOKEN in .env.local
const AIRTABLE_API_TOKEN = process.env.AIRTABLE_API_TOKEN || '';
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID || 'appa2dFwudRxsNv1h';
const AIRTABLE_TABLE_NAME = process.env.AIRTABLE_TABLE_NAME || 'Donated Items';

interface AirtablePhoto {
  id: string;
  url: string;
  filename: string;
  type: string;
  width?: number;
  height?: number;
}

interface AirtableRecord {
  id: string;
  fields: {
    'Item Name': string;
    Description?: string;
    Category?: string;
    Condition?: string;
    Photos?: AirtablePhoto[];
  };
}

interface AirtableResponse {
  records: AirtableRecord[];
  offset?: string;
}

async function fetchAirtableRecords(): Promise<AirtableRecord[]> {
  const allRecords: AirtableRecord[] = [];
  let offset: string | undefined;

  console.log('Fetching records from Airtable...');

  do {
    const url = new URL(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_NAME)}`);
    if (offset) {
      url.searchParams.append('offset', offset);
    }

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${AIRTABLE_API_TOKEN}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Airtable API error: ${response.status} ${await response.text()}`);
    }

    const data: AirtableResponse = await response.json();
    allRecords.push(...data.records);
    offset = data.offset;

    console.log(`  Fetched ${allRecords.length} records...`);
  } while (offset);

  console.log(`Total records fetched: ${allRecords.length}\n`);
  return allRecords;
}

function getPublicUrl(key: string): string {
  if (CDN_URL) {
    return `${CDN_URL}/${key}`;
  }
  return `https://${BUCKET_NAME}.s3.amazonaws.com/${key}`;
}

async function uploadToS3(
  buffer: Buffer,
  key: string,
  contentType: string
): Promise<{ success: boolean; url?: string; key?: string; error?: string }> {
  try {
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
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

async function migrateImageToS3(
  sourceUrl: string,
  donationItemId: string,
  filename: string
): Promise<{ success: boolean; url?: string; key?: string; error?: string }> {
  try {
    const response = await fetch(sourceUrl);

    if (!response.ok) {
      return {
        success: false,
        error: `Failed to fetch image: ${response.status} ${response.statusText}`,
      };
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const buffer = Buffer.from(await response.arrayBuffer());

    const timestamp = Date.now();
    const sanitizedName = filename.replace(/[^a-zA-Z0-9.-]/g, '_').toLowerCase();
    const key = `donations/${donationItemId}/${timestamp}_${sanitizedName}`;

    return uploadToS3(buffer, key, contentType);
  } catch (error) {
    console.error('Image migration error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to migrate image',
    };
  }
}

async function migratePhotos() {
  console.log('Starting photo migration from Airtable to S3...\n');

  if (!AIRTABLE_API_TOKEN) {
    console.error('Error: AIRTABLE_API_TOKEN environment variable is required');
    console.error('Set it in .env.local or pass it as an environment variable');
    process.exit(1);
  }

  // Fetch fresh data from Airtable
  const airtableRecords = await fetchAirtableRecords();

  // Create a map of item name to photos
  const photosByItemName = new Map<string, AirtablePhoto[]>();
  for (const record of airtableRecords) {
    const itemName = record.fields['Item Name']?.trim();
    const photos = record.fields.Photos;
    if (itemName && photos && photos.length > 0) {
      photosByItemName.set(itemName, photos);
    }
  }

  console.log(`Found ${photosByItemName.size} items with photos in Airtable\n`);

  // Get all donation items from Supabase
  const { data: items, error } = await supabase
    .from('donation_items')
    .select('id, name, image_path')
    .eq('is_active', true);

  if (error) {
    console.error('Error fetching donation items:', error);
    process.exit(1);
  }

  console.log(`Found ${items.length} donation items in database\n`);

  let totalPhotos = 0;
  let successCount = 0;
  let failCount = 0;
  let skippedCount = 0;

  for (const item of items) {
    // Normalize item name for matching
    const normalizedName = item.name.trim();

    // Find matching photo URLs - try exact match first
    let photos = photosByItemName.get(normalizedName);

    if (!photos) {
      // Try partial matching (case-insensitive)
      for (const [key, value] of photosByItemName.entries()) {
        if (key.toLowerCase().includes(normalizedName.toLowerCase()) ||
            normalizedName.toLowerCase().includes(key.toLowerCase())) {
          photos = value;
          break;
        }
      }
    }

    if (!photos || photos.length === 0) {
      console.log(`  No photos found for: ${normalizedName}`);
      skippedCount++;
      continue;
    }

    console.log(`Processing: ${normalizedName} (${photos.length} photos)`);

    let isPrimary = true;
    let sortOrder = 0;

    for (const photo of photos) {
      totalPhotos++;

      try {
        const filename = photo.filename || `photo_${Date.now()}.jpg`;

        // Migrate to S3
        const uploadResult = await migrateImageToS3(photo.url, item.id, filename);

        if (uploadResult.success && uploadResult.url && uploadResult.key) {
          // Save to database
          const { error: insertError } = await supabase.from('donation_photos').insert({
            donation_item_id: item.id,
            s3_url: uploadResult.url,
            s3_key: uploadResult.key,
            original_filename: filename,
            sort_order: sortOrder,
            is_primary: isPrimary,
          });

          if (insertError) {
            console.error(`    Error saving photo to database: ${insertError.message}`);
            failCount++;
            continue;
          }

          // Update item's image_path with primary photo
          if (isPrimary) {
            await supabase
              .from('donation_items')
              .update({ image_path: uploadResult.url })
              .eq('id', item.id);
          }

          console.log(`    Uploaded: ${filename}`);
          successCount++;
          isPrimary = false;
          sortOrder++;
        } else {
          console.error(`    Failed to upload: ${uploadResult.error}`);
          failCount++;
        }
      } catch (photoError) {
        console.error(`    Error migrating photo:`, photoError);
        failCount++;
      }
    }
  }

  console.log('\n=== Migration Complete ===');
  console.log(`Total photos processed: ${totalPhotos}`);
  console.log(`Successfully migrated: ${successCount}`);
  console.log(`Failed: ${failCount}`);
  console.log(`Items skipped (no photos): ${skippedCount}`);
}

// Run the migration
migratePhotos().catch(console.error);
