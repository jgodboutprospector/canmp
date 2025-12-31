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

const email = process.argv[2] || 'jon@newmainerproject.org';
const newPassword = 'CANMP@2017';

async function resetPassword() {
  console.log(`Resetting password for ${email}...`);

  // Find user
  const { data: users } = await supabaseAdmin.auth.admin.listUsers();
  const user = users?.users?.find(u => u.email === email);

  if (!user) {
    console.error(`User ${email} not found`);
    return;
  }

  console.log(`Found user: ${user.id}`);

  // Update password
  const { data, error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
    password: newPassword,
    email_confirm: true,
  });

  if (error) {
    console.error('Error resetting password:', error.message);
    return;
  }

  console.log(`✅ Password reset successfully for ${email}`);
  console.log(`New password: ${newPassword}`);
}

resetPassword();
