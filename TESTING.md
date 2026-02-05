# CANMP Testing Guide

## Quick Start Testing

### Test Accounts

After deployment, use these test accounts to verify functionality:

| Role | Email | Password | Permissions |
|------|-------|----------|-------------|
| Admin | test-admin@newmainerproject.org | TestAdmin123! | Full access |
| Coordinator | test-coordinator@newmainerproject.org | TestCoord123! | Manage beneficiaries, housing, volunteers |
| Teacher | test-teacher@newmainerproject.org | TestTeacher123! | Language program access |
| Volunteer | test-volunteer@newmainerproject.org | TestVolunteer123! | View-only, limited access |

### Setting Up Test Accounts

1. **Create Supabase Auth Users**
   - Go to Supabase Dashboard > Authentication > Users
   - Click "Add User" for each test account
   - Use the emails and passwords from the table above
   - Note the `auth.uid()` for each user

2. **Run the seed script**
   ```bash
   npx supabase db push
   # Or manually run: supabase/seeds/test_accounts.sql
   ```

3. **Link Auth Users to App Users**
   - After creating auth users, update the `users` table with the `auth_user_id`
   - See `supabase/seeds/test_accounts.sql` for the SQL

---

## Testing Checklist

### 1. Authentication Flow

- [ ] **Login Page Loads**
  - Navigate to `/login`
  - Page should display without errors

- [ ] **Successful Login**
  - Enter valid credentials
  - Should redirect to `/dashboard`
  - User name should appear in sidebar

- [ ] **Failed Login**
  - Enter invalid credentials
  - Should show error message
  - Should stay on login page

- [ ] **Logout**
  - Click "Log Out" in sidebar
  - Should redirect to `/login`
  - Should not be able to access protected pages

- [ ] **Session Persistence**
  - Login, close browser, reopen
  - Should still be logged in

- [ ] **Forgot Password**
  - Click "Forgot password?" link
  - Enter email, submit
  - Should show success message

### 2. Dashboard

- [ ] **Dashboard Loads**
  - Shows welcome message with user name
  - Displays stats cards
  - Shows recent activity

### 3. Beneficiaries Module

- [ ] **List View**
  - Navigate to `/beneficiaries`
  - Shows list of households
  - Search works
  - Filters work

- [ ] **Add Household**
  - Click "Add Household"
  - Fill form, submit
  - New household appears in list

- [ ] **View/Edit Household**
  - Click on a household
  - Details modal opens
  - Can edit and save

### 4. Housing Module

- [ ] **Properties List**
  - Navigate to `/housing`
  - Shows properties with units

- [ ] **Leases**
  - Navigate to `/housing/leases`
  - Shows active leases

- [ ] **Work Orders**
  - Navigate to `/housing/work-orders`
  - Can create and manage work orders

### 5. Language Program

- [ ] **Classes**
  - Navigate to `/language`
  - Shows class list

- [ ] **Attendance**
  - Navigate to `/language/attendance`
  - Can mark attendance

- [ ] **Enrollments**
  - Navigate to `/language/enrollments`
  - Can enroll students

### 6. Volunteers Module

- [ ] **Volunteer List**
  - Navigate to `/volunteers`
  - Shows volunteer directory

- [ ] **Log Hours**
  - Navigate to `/volunteers/hours`
  - Can log volunteer hours

### 7. Mentor Teams

- [ ] **Teams List**
  - Navigate to `/mentors`
  - Shows mentor teams

- [ ] **Add/Edit Team**
  - Can create new team
  - Can edit existing team
  - Can delete team

### 8. Mutual Aid (NEW)

- [ ] **Transportation List**
  - Navigate to `/mutual-aid`
  - Shows transportation requests
  - Stats cards display correctly

- [ ] **Create Request**
  - Click "New Request"
  - Fill form with:
    - Title
    - Household selection
    - Pickup/Dropoff addresses
    - Date/Time
    - Special requirements
  - Submit creates request

- [ ] **View Request Details**
  - Click on a request
  - Modal shows all details
  - Can assign volunteer
  - Can update status

- [ ] **Status Workflow**
  - Pending → Scheduled (when volunteer assigned)
  - Scheduled → In Progress (start trip)
  - In Progress → Completed (complete trip)

### 9. Donations

- [ ] **Donations List**
  - Navigate to `/donations`
  - Shows donation items
  - Search and filter work

### 10. Events

- [ ] **Events List**
  - Navigate to `/events`
  - Shows upcoming events

### 11. Role-Based Access

- [ ] **Admin sees all nav items**
- [ ] **Coordinator sees management items**
- [ ] **Teacher sees language program**
- [ ] **Volunteer sees limited items**

---

## Browser Testing

Test in these browsers:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

Mobile responsive:
- [ ] iPhone (Safari)
- [ ] Android (Chrome)

---

## API Testing

Use curl or Postman to test API endpoints:

```bash
# Health check
curl https://admin.newmainerproject.org/api/health

# Login and get token
curl -X POST https://[SUPABASE_URL]/auth/v1/token?grant_type=password \
  -H "apikey: [ANON_KEY]" \
  -H "Content-Type: application/json" \
  -d '{"email":"test-admin@newmainerproject.org","password":"TestAdmin123!"}'

# Get profile (with token)
curl https://admin.newmainerproject.org/api/auth/profile \
  -H "Authorization: Bearer [ACCESS_TOKEN]"

# Get transportation requests
curl https://admin.newmainerproject.org/api/mutual-aid \
  -H "Authorization: Bearer [ACCESS_TOKEN]"
```

---

## Troubleshooting

### Login Issues

1. **"Auth loading timeout"**
   - Clear browser cookies
   - Try incognito mode
   - Check browser console for errors
   - Verify Supabase is accessible

2. **"Profile not found"**
   - User exists in Supabase Auth but not in `users` table
   - Run: `SELECT * FROM users WHERE email = 'user@example.com'`
   - Link auth_user_id if missing

3. **401 Unauthorized on API calls**
   - Token may be expired
   - Log out and log in again
   - Check that Bearer token is being sent

### Database Issues

1. **Check Supabase connection**
   ```bash
   npx supabase db push --dry-run
   ```

2. **View migration status**
   ```bash
   npx supabase migration list
   ```

---

## Performance Benchmarks

Expected load times:
- Login: < 2 seconds
- Dashboard: < 3 seconds
- List pages: < 2 seconds
- Modals: < 1 second

---

## Reporting Issues

When reporting bugs, include:
1. Browser and version
2. Steps to reproduce
3. Expected vs actual behavior
4. Console errors (F12 > Console)
5. Network errors (F12 > Network)
