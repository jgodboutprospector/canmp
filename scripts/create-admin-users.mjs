import { createClient } from '@supabase/supabase-js';

// Supabase Admin Client
const supabaseAdmin = createClient(
  'https://jehanphxddmigpswxtxn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImplaGFucGh4ZGRtaWdwc3d4dHhuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjkyODUxNSwiZXhwIjoyMDgyNTA0NTE1fQ.oGg834vCs2z0BO9kDGxSUYHBjgBrdrV9SQOA9urNkDo',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

const adminUsers = [
  { email: 'jon@newmainerproject.org', firstName: 'Jon', lastName: 'Godbout' },
  { email: 'katya@newmainerproject.org', firstName: 'Katya', lastName: 'User' },
  { email: 'nalnaseri@newmainerproject.org', firstName: 'N', lastName: 'Alnaseri' },
  { email: 'nour.iskandafi@newmainerproject.org', firstName: 'Nour', lastName: 'Iskandafi' },
];

const password = 'CANMP@2017';

async function createAdminUsers() {
  console.log('Creating admin users...\n');

  for (const user of adminUsers) {
    try {
      // Check if user already exists
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find(u => u.email === user.email);

      if (existingUser) {
        console.log(`⚠️  ${user.email} - Already exists, updating profile...`);

        // Update profile to admin
        const { error: profileError } = await supabaseAdmin
          .from('user_profiles')
          .upsert({
            id: existingUser.id,
            email: user.email,
            first_name: user.firstName,
            last_name: user.lastName,
            role: 'admin',
            is_active: true,
          });

        if (profileError) {
          console.error(`   Profile error: ${profileError.message}`);
        } else {
          console.log(`✅ ${user.email} - Updated to admin`);
        }
        continue;
      }

      // Create user in Supabase Auth (without trigger - we'll create profile manually)
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: user.email,
        password: password,
        email_confirm: true,
      });

      if (error) {
        console.error(`❌ ${user.email} - Auth Error: ${error.message}`);
        continue;
      }

      console.log(`   Created auth user: ${data.user.id}`);

      // Manually create user profile
      if (data.user) {
        const { error: profileError } = await supabaseAdmin
          .from('user_profiles')
          .insert({
            id: data.user.id,
            email: user.email,
            first_name: user.firstName,
            last_name: user.lastName,
            role: 'admin',
            is_active: true,
          });

        if (profileError) {
          console.error(`   Profile error: ${profileError.message}`);
          // Try upsert instead
          const { error: upsertError } = await supabaseAdmin
            .from('user_profiles')
            .upsert({
              id: data.user.id,
              email: user.email,
              first_name: user.firstName,
              last_name: user.lastName,
              role: 'admin',
              is_active: true,
            });

          if (upsertError) {
            console.error(`   Upsert error: ${upsertError.message}`);
          } else {
            console.log(`✅ ${user.email} - Created successfully (via upsert)`);
          }
        } else {
          console.log(`✅ ${user.email} - Created successfully`);
        }
      }
    } catch (err) {
      console.error(`❌ ${user.email} - Error: ${err.message}`);
    }
  }

  console.log('\n========================================');
  console.log('Admin accounts created/updated!');
  console.log('Password: CANMP@2017');
  console.log('========================================');
  console.log('\nPlease remind users to change their password after first login.');
}

createAdminUsers();
