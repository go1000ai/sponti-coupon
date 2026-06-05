import { createServiceRoleClient } from '@/lib/supabase/server';

export interface CreateNotificationInput {
  userId: string;
  type: string;
  title: string;
  body?: string;
  link?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Insert one or more in-app notifications into the per-user feed.
 * Best-effort: failures are logged but never thrown, so notification
 * delivery can never break the surrounding action (claim, booking, etc.).
 */
export async function createNotifications(inputs: CreateNotificationInput[]): Promise<void> {
  const rows = inputs.filter((n) => n.userId && n.title);
  if (rows.length === 0) return;

  try {
    const supabase = await createServiceRoleClient();
    const { error } = await supabase.from('app_notifications').insert(
      rows.map((n) => ({
        user_id: n.userId,
        type: n.type,
        title: n.title,
        body: n.body ?? null,
        link: n.link ?? null,
        metadata: n.metadata ?? {},
      }))
    );
    if (error) console.error('[notifications] insert failed:', error.message);
  } catch (err) {
    console.error('[notifications] insert threw:', err);
  }
}

export async function createNotification(input: CreateNotificationInput): Promise<void> {
  return createNotifications([input]);
}
