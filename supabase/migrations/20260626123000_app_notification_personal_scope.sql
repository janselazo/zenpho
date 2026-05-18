-- App notifications are personal. Do not expose every org member's alerts to
-- team admins through regular client-side selects, otherwise the top-bar bell
-- count includes peers' unread reminders.

drop policy if exists "app_notification_select_admin" on public.app_notification;
