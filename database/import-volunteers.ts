/**
 * CANMP Volunteers Import Script
 *
 * This script imports volunteers from the CSV export.
 *
 * Prerequisites:
 * 1. Run beneficiaries-volunteers-enrichment.sql in Supabase first
 *
 * Usage:
 * npx tsx database/import-volunteers.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load .env.local
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match && !line.startsWith('#')) {
      const key = match[1].trim();
      let value = match[2].trim();
      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  });
}

// Parse CSV
function parseCSV(content: string): Record<string, string>[] {
  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];

  // Handle BOM
  let headerLine = lines[0];
  if (headerLine.charCodeAt(0) === 0xFEFF) {
    headerLine = headerLine.slice(1);
  }

  const headers = parseCSVLine(headerLine);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      row[header.trim()] = (values[idx] || '').trim();
    });
    rows.push(row);
  }

  return rows;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

// Parse date in various formats
function parseDate(dateStr: string): string | null {
  if (!dateStr || dateStr === '') return null;

  // Try MM/DD/YYYY format
  const mdyMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdyMatch) {
    const [, month, day, year] = mdyMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // Try YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }

  return null;
}

// Parse pipe-separated values into array
function parsePipeValues(value: string): string[] {
  if (!value) return [];
  return value.split('|').map(v => v.trim()).filter(v => v.length > 0);
}

// Parse name into first and last
function parseName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' };
  }
  const lastName = parts.pop() || '';
  const firstName = parts.join(' ');
  return { firstName, lastName };
}

// Parse currency value
function parseCurrency(value: string): number {
  if (!value || value === '.00') return 0;
  // Remove commas and parse
  const cleaned = value.replace(/[$,]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Read CSV
  const csvPath = path.join(__dirname, 'canmp volunteers.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const rows = parseCSV(csvContent);

  console.log(`Found ${rows.length} volunteers in CSV`);

  // Get or create sites
  const { data: sites } = await supabase.from('sites').select('id, location');
  const siteMap: Record<string, string> = {};
  sites?.forEach(s => { siteMap[s.location] = s.id; });

  // If no sites, create them
  if (!sites || sites.length === 0) {
    const { data: newSites } = await supabase.from('sites').insert([
      { name: 'Waterville', location: 'waterville', address: 'Waterville, ME' },
      { name: 'Augusta', location: 'augusta', address: 'Augusta, ME' }
    ]).select();
    newSites?.forEach(s => { siteMap[s.location] = s.id; });
  }

  // Track duplicates by email
  const emailsSeen = new Set<string>();
  let volunteersCreated = 0;
  let duplicatesSkipped = 0;
  let errors: string[] = [];

  for (const row of rows) {
    try {
      const email = row['Email 1']?.toLowerCase();
      const { firstName, lastName } = parseName(row['Full Name (F)'] || 'Unknown');

      // Skip if no email or duplicate
      if (email && emailsSeen.has(email)) {
        duplicatesSkipped++;
        continue;
      }
      if (email) {
        emailsSeen.add(email);
      }

      // Skip if name is just "?" or empty
      if (firstName === '?' || (!firstName && !lastName)) {
        continue;
      }

      // Determine site from Support Location
      const locations = parsePipeValues(row['Support Location (C)']);
      let siteId = siteMap['waterville']; // default
      if (locations.some(l => l.toLowerCase().includes('augusta'))) {
        siteId = siteMap['augusta'];
      }

      const volunteerData = {
        first_name: firstName || 'Unknown',
        last_name: lastName || '',
        email: email || null,
        phone: row['Phone'] || null,
        is_active: true,

        // Enhanced fields
        neon_account_id: row['Account ID'] || null,
        full_address: row['Full Street Address (F)'] || null,
        city: row['City'] || null,
        state: row['State/Province'] || null,
        company_name: row['Company Name'] || null,
        support_locations: locations,
        volunteer_interests: parsePipeValues(row['Volunteer Interests (C)']),
        time_commitment: row['Time Commitment Preference (C)'] || null,
        assigned_opportunities: parsePipeValues(row['Assigned Opportunities']),
        total_donations: parseCurrency(row['All Time Donation Total']),
        last_donation_amount: parseCurrency(row['Last Donation Amount']) || null,
        last_donation_date: parseDate(row['Last Donation Date']),
        first_donation_amount: parseCurrency(row['First Donation Amount']) || null,
        first_donation_date: parseDate(row['First Donation Date']),
      };

      // Check if volunteer already exists by neon_account_id
      if (row['Account ID']) {
        const { data: existing } = await supabase
          .from('volunteers')
          .select('id')
          .eq('neon_account_id', row['Account ID'])
          .maybeSingle();

        if (existing) {
          // Update existing
          const { error } = await supabase
            .from('volunteers')
            .update(volunteerData)
            .eq('id', existing.id);

          if (error) {
            errors.push(`Update ${firstName} ${lastName}: ${error.message}`);
          } else {
            volunteersCreated++;
          }
          continue;
        }
      }

      // Check by email if exists
      if (email) {
        const { data: existing } = await supabase
          .from('volunteers')
          .select('id')
          .eq('email', email)
          .maybeSingle();

        if (existing) {
          duplicatesSkipped++;
          continue;
        }
      }

      // Insert new volunteer
      const { error } = await supabase
        .from('volunteers')
        .insert(volunteerData);

      if (error) {
        errors.push(`Insert ${firstName} ${lastName}: ${error.message}`);
      } else {
        volunteersCreated++;
      }
    } catch (err) {
      errors.push(`Error processing row: ${err}`);
    }
  }

  console.log('\n=== Import Summary ===');
  console.log(`Volunteers created/updated: ${volunteersCreated}`);
  console.log(`Duplicates skipped: ${duplicatesSkipped}`);

  if (errors.length > 0) {
    console.log(`\nErrors (${errors.length}):`);
    errors.slice(0, 10).forEach(e => console.log(`  - ${e}`));
    if (errors.length > 10) {
      console.log(`  ... and ${errors.length - 10} more`);
    }
  }
}

main().catch(console.error);
