# Admin Dashboard Setup Guide

## Overview
The admin dashboard provides real-time monitoring of webhook events and V.A.I. status updates received from Vairify and other business partners.

## Accessing the Dashboard
**URL:** `https://chainpass.id/admin`

## Granting Admin Access

Admin access is managed through the `user_roles` table in the database. To grant admin privileges to a user:

### Creating Your First Admin User

**IMPORTANT**: Before you can access the admin dashboard, you need to:

1. **Sign up for an account** at `https://chainpass.id/auth`
2. **Get your user ID** from the auth logs or database
3. **Grant yourself admin privileges** using one of the methods below

### Method 1: Direct SQL (Recommended for First Admin)

1. Sign up for an account at `/auth`
2. Open your Lovable Cloud backend (Users → Table → auth.users) to find your user UUID
3. Run this SQL query in the database (via SQL Editor in backend):

```sql
INSERT INTO public.user_roles (user_id, role)
VALUES ('YOUR_USER_UUID_HERE', 'admin');
```

**Note**: You can get your user UUID from the `auth.users` table in the backend or from the auth logs after signup.

### Method 2: Via Admin Dashboard (Once You Have at Least One Admin)

Future admins can grant access to other users through the admin dashboard once it's expanded with user management features.

## Features

### Real-Time Monitoring
- **Live Updates**: Dashboard automatically updates when new webhook events arrive
- **Instant Notifications**: Toast notifications for new webhook events
- **Auto-Refresh**: Real-time subscriptions to database changes

### Webhook Events Tab
View all incoming webhook events from Vairify with:
- Event type (user.status_changed, user.vai_revoked, etc.)
- V.A.I. number
- User ID
- Processing status (Processed/Pending)
- Signature verification status
- Full payload data
- Timestamp information

### Status Updates Tab
Track all V.A.I. status changes with:
- Status type
- V.A.I. number
- Detailed status data
- Creation timestamp
- Link to originating webhook event

### Filtering & Search
- **Search**: Filter by V.A.I. number or User ID
- **Event Type Filter**: View specific event types or all events
- **Real-time Results**: Filters apply instantly

## Security

### Authentication Required
- Users must be authenticated to access the dashboard
- Admin role verification happens server-side using RLS policies
- Cannot be bypassed through client-side manipulation

### Row-Level Security
- `vairify_webhook_events` table: Only admins can read
- `vai_status_updates` table: Only admins can read
- `user_roles` table: Users can view their own roles, admins can view all

### Security Definer Function
The `has_role()` function prevents recursive RLS issues:
```sql
SELECT public.has_role(auth.uid(), 'admin')
```

## Database Tables

### user_roles
Stores user role assignments:
```sql
- id: UUID (primary key)
- user_id: UUID (references auth.users)
- role: app_role enum ('admin' | 'user')
- created_at: timestamp
```

### vairify_webhook_events
Stores incoming webhook events:
```sql
- id: UUID
- event_type: text
- user_id: text
- vai_number: text
- payload: jsonb
- processed: boolean
- processed_at: timestamp
- signature: text
- created_at: timestamp
```

### vai_status_updates
Stores processed status updates:
```sql
- id: UUID
- vai_number: text
- status_type: text
- status_data: jsonb
- webhook_event_id: UUID (nullable)
- created_at: timestamp
```

## Usage Tips

1. **Monitor Webhook Health**: Check the "Processed" badge on webhook events to ensure they're being handled correctly

2. **Investigate Issues**: Click "View Payload" to see full webhook data for debugging

3. **Track User Activity**: Search by V.A.I. number to see all events for a specific user

4. **Event Type Analysis**: Use the event type filter to focus on specific types of status changes

5. **Real-Time Alerts**: Keep the dashboard open to receive instant notifications of new events

## Troubleshooting

### "Access Denied" Error
- Verify the user has an 'admin' role in the `user_roles` table
- Check that the user is properly authenticated
- Ensure RLS policies are correctly configured

### No Events Showing
- Verify webhook events are being sent to the correct endpoint
- Check edge function logs for webhook processing errors
- Ensure realtime subscriptions are active (check browser console)

### Real-Time Updates Not Working
- Check browser console for subscription errors
- Verify tables are added to `supabase_realtime` publication
- Ensure RLS policies allow admin users to SELECT from tables

## Next Steps

Consider extending the dashboard with:
- User management interface for granting/revoking admin access
- Webhook retry functionality for failed events
- Analytics and reporting features
- Automated alerting for critical events
- Export functionality for audit logs
