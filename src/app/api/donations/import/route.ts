import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { migrateImageToS3 } from '@/lib/services/s3';
import { secureCompare } from '@/lib/auth-server';
import { importDonationsSchema } from '@/lib/validation/schemas';
import { handleApiError } from '@/lib/api-error';
import { parseJsonBody, IMPORT_MAX_BODY_BYTES } from '@/lib/api-server-utils';

// Map Airtable categories to our enum values
const CATEGORY_MAP: Record<string, string> = {
  furniture: 'furniture',
  kitchenware: 'kitchenware',
  kitchen: 'kitchen',
  'baby items': 'baby',
  baby: 'baby',
  linens: 'linens',
  bedding: 'bedding',
  rugs: 'rugs',
  clothing: 'clothing',
  accessories: 'accessories',
  other: 'other',
  electronics: 'electronics',
  toys: 'toys',
  bathroom: 'bathroom',
  household: 'household',
};

// Map Airtable conditions to our enum values
const CONDITION_MAP: Record<string, string> = {
  new: 'new',
  'like new': 'like_new',
  'gently used': 'gently_used',
  used: 'used',
  'needs repair': 'needs_repair',
};

// Map Airtable status to our enum values
const STATUS_MAP: Record<string, string> = {
  available: 'available',
  reserved: 'reserved',
  claimed: 'claimed',
  'pending pickup': 'pending_pickup',
  approved: 'claimed',
};

interface AirtableRecord {
  itemName: string;
  description?: string;
  category?: string;
  condition?: string;
  photos?: string[]; // Array of URLs
  dateDonated?: string;
  donor?: string;
  donorEmail?: string;
  donorName?: string;
  claimedStatus?: string;
  claimedBy?: string;
  numberOfClaims?: number;
  mostRecentClaimDate?: string;
  claimStatuses?: string;
  summaryForShopDisplay?: string;
  suggestedNextAction?: string;
  airtableId?: string;
}

// POST /api/donations/import - Import donations from Airtable data
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();

    // Verify API key for security using timing-safe comparison
    const apiKey = request.headers.get('x-api-key');
    if (!secureCompare(apiKey, process.env.SYNC_API_KEY)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await parseJsonBody(request, IMPORT_MAX_BODY_BYTES);

    // Validate input
    const { records, migratePhotos = false } = importDonationsSchema.parse(body);


    const results = {
      total: records.length,
      imported: 0,
      failed: 0,
      photosImported: 0,
      errors: [] as string[],
    };

    for (const record of records) {
      try {
        // Map category
        const categoryKey = record.category?.toLowerCase().trim() || 'other';
        const category = CATEGORY_MAP[categoryKey] || 'other';

        // Map condition
        const conditionKey = record.condition?.toLowerCase().trim() || 'used';
        const condition = CONDITION_MAP[conditionKey] || 'used';

        // Map status
        const statusKey = record.claimedStatus?.toLowerCase().trim() || 'available';
        const status = STATUS_MAP[statusKey] || 'available';

        // Parse date
        let donatedDate = null;
        if (record.dateDonated) {
          const parsed = new Date(record.dateDonated);
          if (!isNaN(parsed.getTime())) {
            donatedDate = parsed.toISOString().split('T')[0];
          }
        }

        // Parse most recent claim date
        let mostRecentClaimDate = null;
        if (record.mostRecentClaimDate) {
          const parsed = new Date(record.mostRecentClaimDate);
          if (!isNaN(parsed.getTime())) {
            mostRecentClaimDate = parsed.toISOString().split('T')[0];
          }
        }

        // Check if already imported (by airtable_id)
        if (record.airtableId) {
          const { data: existing } = await (supabase as any)
            .from('donation_items')
            .select('id')
            .eq('airtable_id', record.airtableId)
            .single();

          if (existing) {
            // Skip already imported
            continue;
          }
        }

        // Insert donation item
        const { data: item, error: insertError } = await (supabase as any)
          .from('donation_items')
          .insert({
            name: record.itemName || 'Unnamed Item',
            description: record.description || null,
            category,
            condition,
            status,
            quantity: 1,
            donor_name: record.donorName || record.donor || null,
            donor_email: record.donorEmail || null,
            donated_date: donatedDate,
            claim_count: record.numberOfClaims || 0,
            most_recent_claim_date: mostRecentClaimDate,
            shop_display_summary: record.summaryForShopDisplay || null,
            suggested_next_action: record.suggestedNextAction || null,
            airtable_id: record.airtableId || null,
            is_active: true,
          })
          .select()
          .single();

        if (insertError) {
          results.failed++;
          results.errors.push(`Failed to import "${record.itemName}": ${insertError.message}`);
          continue;
        }

        results.imported++;

        // Migrate photos if requested
        if (migratePhotos && record.photos && record.photos.length > 0 && item) {
          let isPrimary = true;
          let sortOrder = 0;

          for (const photoUrl of record.photos) {
            try {
              // Extract filename from URL
              const urlParts = photoUrl.split('/');
              const filename = urlParts[urlParts.length - 1].split('?')[0] || `photo_${Date.now()}.jpg`;

              // Migrate to S3
              const uploadResult = await migrateImageToS3(photoUrl, item.id, filename);

              if (uploadResult.success && uploadResult.url && uploadResult.key) {
                // Save to database
                await (supabase as any).from('donation_photos').insert({
                  donation_item_id: item.id,
                  s3_url: uploadResult.url,
                  s3_key: uploadResult.key,
                  original_filename: filename,
                  sort_order: sortOrder,
                  is_primary: isPrimary,
                });

                // Update item's image_path with primary photo
                if (isPrimary) {
                  await (supabase as any)
                    .from('donation_items')
                    .update({ image_path: uploadResult.url })
                    .eq('id', item.id);
                }

                results.photosImported++;
                isPrimary = false;
                sortOrder++;
              }
            } catch (photoError) {
              console.error('Error migrating photo:', photoError);
            }
          }
        }
      } catch (recordError) {
        results.failed++;
        results.errors.push(
          `Error processing "${record.itemName}": ${recordError instanceof Error ? recordError.message : 'Unknown error'}`
        );
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    return handleApiError(error);
  }
}
