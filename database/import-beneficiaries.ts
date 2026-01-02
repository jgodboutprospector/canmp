/**
 * CANMP Beneficiaries Import Script
 *
 * This script imports beneficiaries from the CSV export and creates:
 * - Households (grouped by address)
 * - Beneficiaries (individual people)
 * - Case worker associations
 *
 * Prerequisites:
 * 1. Run beneficiaries-volunteers-enrichment.sql in Supabase first
 *
 * Usage:
 * npx tsx database/import-beneficiaries.ts
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

// Normalize address for household grouping
function normalizeAddress(address: string, city: string): string {
  return `${address.toLowerCase().replace(/[^a-z0-9]/g, '')}|${city.toLowerCase()}`;
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
  const csvPath = path.join(__dirname, 'canmp beneficiaries.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const rows = parseCSV(csvContent);

  console.log(`Found ${rows.length} beneficiaries in CSV`);

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

  // Group by address to create households
  const householdMap = new Map<string, { address: string; city: string; members: typeof rows }>();

  for (const row of rows) {
    const address = row['Full Street Address (F)'] || '';
    const city = row['City'] || 'Waterville';

    if (!address) {
      // Create individual household for people without address
      const key = `individual_${row['Account ID']}`;
      householdMap.set(key, { address: '', city, members: [row] });
    } else {
      const key = normalizeAddress(address, city);
      if (!householdMap.has(key)) {
        householdMap.set(key, { address, city, members: [] });
      }
      householdMap.get(key)!.members.push(row);
    }
  }

  console.log(`Found ${householdMap.size} unique households`);

  let householdsCreated = 0;
  let beneficiariesCreated = 0;
  let caseWorkersCreated = 0;
  let errors: string[] = [];

  for (const [key, household] of householdMap) {
    try {
      // Determine site from city
      const city = household.city.toLowerCase();
      let siteId = siteMap['waterville']; // default
      if (city.includes('augusta') || city.includes('hallowell') || city.includes('gardiner')) {
        siteId = siteMap['augusta'];
      }

      // Get household name from first member's last name or full name
      const firstMember = household.members[0];
      const { lastName } = parseName(firstMember['Full Name (F)'] || 'Unknown');
      const householdName = lastName ? `${lastName} Family` : firstMember['Full Name (F)'] || 'Unknown Household';

      // Get country of origin and languages from first member
      const countryOfOrigin = firstMember['Country of Origin (C)'] || null;
      const primaryLanguage = parsePipeValues(firstMember['Spoken Language (Beneficiary) (C)'] || firstMember['Spoken Language (C)'])[0] || null;
      const dateArrivedUs = parseDate(firstMember['Date of Arrival in US (C)']);
      const dateArrivedMaine = parseDate(firstMember['Date of Arrival in Maine (C)']);

      // Create household
      const { data: newHousehold, error: hError } = await supabase.from('households').insert({
        name: householdName,
        site_id: siteId,
        primary_language: primaryLanguage,
        country_of_origin: countryOfOrigin,
        date_arrived_us: dateArrivedUs,
        date_arrived_maine: dateArrivedMaine,
        full_address: household.address,
        city: household.city,
        state: firstMember['State/Province'] || 'ME',
        is_active: true,
      }).select().single();

      if (hError) {
        errors.push(`Household ${householdName}: ${hError.message}`);
        continue;
      }

      householdsCreated++;

      // Create beneficiaries for this household
      for (let i = 0; i < household.members.length; i++) {
        const member = household.members[i];
        const { firstName, lastName } = parseName(member['Full Name (F)'] || 'Unknown');

        const beneficiaryData = {
          household_id: newHousehold.id,
          first_name: firstName || 'Unknown',
          last_name: lastName || '',
          email: member['Email 1'] || null,
          relationship_type: i === 0 ? 'head_of_household' : 'other_relative',
          is_active: true,

          // Enhanced fields
          neon_account_id: member['Account ID'] || null,
          full_address: household.address,
          city: household.city,
          state: member['State/Province'] || 'ME',
          programs_of_interest: parsePipeValues(member['Beneficiary Programs of Interest (C)']),
          programs_other_details: member['Beneficiary Programs of Interest - Other Details (C)'] || null,
          referral_source: member['CANMP Referral Details (C)'] || null,
          referral_notes: member['Referral Notes (C)'] || null,
          country_of_origin: member['Country of Origin (C)'] || null,
          date_arrived_us: parseDate(member['Date of Arrival in US (C)']),
          date_arrived_maine: parseDate(member['Date of Arrival in Maine (C)']),
          education_level: member['Education Level (C)'] || null,
          current_occupation: member['Current Occupation (C)'] || null,
          previous_occupation: member['Previous Occupation (C)'] || null,
          occupation_desires: member['Occupation or Career Desires (C)'] || null,
          esl_experience: member['ESL Experience (C)'] || null,
          esl_class_assignments: parsePipeValues(member['ESL Class (C)']),
          language_instruction_levels: parsePipeValues(member['Language Instruction Levels (C)']),
          esl_documentation_needs: member['ESL Attendance Documentation Needs (C)']?.toUpperCase() === 'YES',
          esl_documentation_details: member['ESL Attendance Documentation Needs - Details (C)'] || null,
          enrollment_reason: member['Reason for ESL Enrollment (C)'] || null,
          literacy_cert_date: parseDate(member['Literacy Learner Certification Date (C)']),
          support_services: parsePipeValues(member['Support Services Receiving (Non-CANMP) (C)']),
          support_services_other: member['Support Services Receiving (Non-CANMP) - OTHER (C)'] || null,
          spoken_languages: parsePipeValues(member['Spoken Language (Beneficiary) (C)'] || member['Spoken Language (C)']),
        };

        const { data: newBeneficiary, error: bError } = await supabase
          .from('beneficiaries')
          .insert(beneficiaryData)
          .select()
          .single();

        if (bError) {
          errors.push(`Beneficiary ${firstName} ${lastName}: ${bError.message}`);
          continue;
        }

        beneficiariesCreated++;

        // Create case worker if present
        const caseWorkerName = member['Case Worker - Name (C)'];
        if (caseWorkerName) {
          const { error: cwError } = await supabase.from('case_workers').insert({
            beneficiary_id: newBeneficiary.id,
            name: caseWorkerName,
            agency: member['Case Worker - Agency (C)'] || null,
            email: member['Case Worker - email (C)'] || null,
            phone: member['Case Worker - Phone Number (C)'] || null,
            translator_name: member['Case Worker - Translator (C)'] || null,
          });

          if (!cwError) {
            caseWorkersCreated++;
          }
        }
      }
    } catch (err) {
      errors.push(`Error processing household: ${err}`);
    }
  }

  console.log('\n=== Import Summary ===');
  console.log(`Households created: ${householdsCreated}`);
  console.log(`Beneficiaries created: ${beneficiariesCreated}`);
  console.log(`Case workers created: ${caseWorkersCreated}`);

  if (errors.length > 0) {
    console.log(`\nErrors (${errors.length}):`);
    errors.slice(0, 10).forEach(e => console.log(`  - ${e}`));
    if (errors.length > 10) {
      console.log(`  ... and ${errors.length - 10} more`);
    }
  }
}

main().catch(console.error);
