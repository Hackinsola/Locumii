# Spec 10 — Notifications (SMS + In-App)

## Goal

Deliver transactional SMS messages to professionals and facilities at every key event via Termii, and maintain a real-time in-app notification feed showing the latest 20 events for the current user.

-----

## Design

### In-App Notification Feed

- Bell icon in top nav with unread count badge (red dot with number)
- Click bell: dropdown panel appears, max-height `400px`, scrollable
- Each notification: icon (emoji or SVG), title, body, relative timestamp (“2 hrs ago”)
- Unread notifications: white background. Read: `#FAFAFA` background.
- “Mark all as read” link at top of panel
- Empty state: “No notifications yet”
- Clicking a notification: marks it read, navigates to relevant page

### SMS Events

|Event              |Recipient   |Message                                                                                                                                                           |
|-------------------|------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------|
|Credential approved|Professional|“Your Locumii credentials have been verified. You can now browse and bid on shifts. locumii.com”                                                                   |
|Credential rejected|Professional|“Your [doc type] on Locumii was not approved: [reason]. Please re-upload. locumii.com”                                                                             |
|Bid accepted       |Professional|“Your bid was accepted! [Facility name] confirmed your shift on [date] at [time]. locumii.com”                                                                     |
|Bid declined (auto)|Professional|“Your bid for [role] on [date] was not selected. Keep browsing shifts at locumii.com”                                                                              |
|Shift reminder     |Both        |Professional: “Reminder: Your shift at [facility] starts in 2 hours. [date] [time].” Facility: “Reminder: [Professional name] arrives for their shift in 2 hours.”|
|Payment released   |Professional|“₦[amount] has been sent to your [bank name] account for your shift at [facility]. locumii.com”                                                                    |
|Facility verified  |Facility    |“Your facility [name] has been verified on Locumii. You can now post shifts. locumii.com”                                                                          |

-----

## Implementation

### 1. Database Migration — `010_create_notifications.sql`

```sql
create table public.notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  type text not null,
  title text not null,
  body text not null,
  link text,          -- optional route to navigate to on click
  is_read boolean default false,
  created_at timestamptz default now()
);

create index notifications_user_id_idx on public.notifications(user_id);
create index notifications_is_read_idx on public.notifications(user_id, is_read);

alter table public.notifications enable row level security;

create policy "notifications_read_own"
  on public.notifications for select
  using (auth.uid() = user_id);

create policy "notifications_update_own"
  on public.notifications for update
  using (auth.uid() = user_id);

-- Only Edge Functions insert notifications
```

### 2. Database Migration — `011_create_sms_log.sql`

```sql
create table public.sms_log (
  id uuid default gen_random_uuid() primary key,
  phone text not null,
  message text not null,
  status text not null default 'sent' check (status in ('sent', 'failed')),
  termii_message_id text,
  error_message text,
  created_at timestamptz default now()
);
-- No RLS needed — admin-only table, accessed by Edge Functions with service_role
```

### 3. Edge Function — `supabase/functions/send-sms/index.ts`

Called internally by all other Edge Functions. Never called from the frontend.

```typescript
interface SMSPayload {
  phone: string    // Nigerian format: +2348XXXXXXXXX
  message: string
  userId?: string  // optional, for notification insert
  notifType?: string
  notifTitle?: string
  notifLink?: string
}

// 1. Call Termii API
const response = await fetch('https://api.ng.termii.com/api/sms/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    to: phone,
    from: 'Locumii',       // Sender ID (register with Termii)
    sms: message,
    type: 'plain',
    channel: 'generic',
    api_key: Deno.env.get('TERMII_API_KEY')
  })
})

// 2. Log to sms_log table
await db.from('sms_log').insert({
  phone, message,
  status: response.ok ? 'sent' : 'failed',
  termii_message_id: data?.message_id,
  error_message: response.ok ? null : data?.message
})

// 3. If userId provided, insert notification row
if (userId && notifType && notifTitle) {
  await db.from('notifications').insert({
    user_id: userId, type: notifType,
    title: notifTitle, body: message,
    link: notifLink ?? null
  })
}
```

### 4. Edge Function — `supabase/functions/send-shift-reminder/index.ts`

Cron trigger: every 15 minutes

```typescript
// Find shifts starting between now+105min and now+120min with status = 'filled'
const shifts = await db.from('shifts')
  .select('*, facility_profiles(*), bids(professional_id, professionals:professional_profiles(*))')
  .gte('start_time', addMinutes(now, 105).toISOString())
  .lte('start_time', addMinutes(now, 120).toISOString())
  .eq('status', 'filled')

for (const shift of shifts) {
  const professional = shift.bids[0].professionals
  const facility = shift.facility_profiles

  // SMS to professional
  await sendSMS({
    phone: professional.phone,
    message: `Reminder: Your shift at ${facility.facility_name} starts in 2 hours (${formatTime(shift.start_time)}). Good luck!`,
    userId: shift.bids[0].professional_id,
    notifType: 'shift_reminder',
    notifTitle: 'Shift Reminder'
  })

  // SMS to facility contact
  await sendSMS({
    phone: facility.contact_phone,
    message: `Reminder: ${professional.full_name} (${professional.specialty}) arrives in 2 hours for their shift.`
  })
}
```

### 5. `src/store/notifStore.js`

```js
{
  notifications: [],     // latest 20, sorted newest first
  unreadCount: 0,
  setNotifications: (notifs) => ...,
  markAllRead: () => ...,
  markOneRead: (id) => ...
}
```

### 6. `src/hooks/useNotifications.js`

Exports:

- `fetchNotifications()` — fetches latest 20 `notifications` for current user, ordered by `created_at desc`
- `markAsRead(notificationId)` — updates `is_read = true`
- `markAllAsRead()` — updates all `is_read = false` rows for current user
- Real-time subscription: `supabase.channel('notifications').on('postgres_changes', ...)` — listens for new inserts on `notifications` where `user_id = currentUser`. On new row, update `notifStore`.
- `loading`, `error`

### 7. `src/components/ui/NotificationBell.jsx`

- Reads from `notifStore`
- Bell SVG icon with badge showing `unreadCount` (hidden if 0)
- Click: toggles dropdown panel
- Panel renders list of `NotificationItem` components
- “Mark all as read” calls `markAllAsRead()` from hook

**`src/components/ui/NotificationItem.jsx`**
Props: `notification`

- Icon based on `type`:
  - `credential_approved` → ✅
  - `bid_accepted` → 🤝
  - `payment_released` → 💳
  - `shift_reminder` → ⏰
  - `bid_declined` → 📋
- Title (bold), body (grey), relative time
- Background: white if unread, `#FAFAFA` if read
- onClick: `markAsRead(id)`, navigate to `notification.link` if set

### 8. `.env` Variables (Edge Functions only)

```
TERMII_API_KEY=
TERMII_SENDER_ID=Locumii
```

-----

## Dependencies

No new npm dependencies. Termii and real-time handled by existing Supabase client.

-----

## Verification Checklist

- [ ] `send-sms` Edge Function inserts a row into `sms_log` for every SMS attempt (success or failure)
- [ ] SMS delivers to MTN, Airtel, and Glo test numbers — verify each carrier
- [ ] SMS sender ID shows as “Locumii” not a random number
- [ ] Credential approval SMS fires when admin approves all 3 credentials
- [ ] Bid accepted SMS fires when facility accepts a bid
- [ ] Bid declined SMS fires for each auto-cancelled bidder
- [ ] Shift reminder SMS fires 2 hours before shift — test by setting a shift start_time to now+110min
- [ ] Payment released SMS fires after `release-payment` Edge Function completes
- [ ] Notification bell shows unread count badge
- [ ] New notification appears in bell dropdown without page refresh (real-time subscription works)
- [ ] Clicking notification marks it read and navigates to correct route
- [ ] “Mark all as read” sets all notifications to `is_read = true` and clears badge
- [ ] Notification feed shows max 20 items — oldest beyond 20 not shown
- [ ] `send-sms` is never called from any file in `src/` — only from Edge Functions
- [ ] `TERMII_API_KEY` does not appear in any file under `src/`