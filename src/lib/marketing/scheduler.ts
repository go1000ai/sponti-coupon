import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Determines optimal posting time for a marketing content item.
 * Avoids posting within 2 hours of another scheduled/posted item.
 * Puerto Rico AST = UTC-4.
 */
export async function getOptimalPostTime(
  supabase: SupabaseClient,
  runType: string,
  platform: string
): Promise<{ scheduledFor: Date; reason: string }> {
  const now = new Date();

  // Base times in AST (UTC-4)
  const baseHours: Record<string, number> = {
    morning: 9,    // 9 AM AST = 13:00 UTC
    afternoon: 13,  // 1 PM AST = 17:00 UTC
    evening: 18,    // 6 PM AST = 22:00 UTC
    manual: now.getUTCHours(),
  };

  // Platform-specific adjustments
  const platformAdjust: Record<string, number> = {
    facebook: 0,   // Facebook: 9-11 AM, 1-3 PM
    instagram: 1,  // Instagram: slightly later, 10 AM-12 PM, 7-9 PM
  };

  const baseHour = (baseHours[runType] || 12) + (platformAdjust[platform] || 0);

  // Start with base time today (in UTC, offset by AST)
  const candidate = new Date(now);
  candidate.setUTCHours(baseHour + 4, 0, 0, 0); // +4 to convert AST to UTC

  // If the candidate is in the past, push to 15 min from now
  if (candidate <= now) {
    candidate.setTime(now.getTime() + 15 * 60 * 1000);
  }

  // Check for conflicts (other posts within 2 hours)
  const twoHoursBefore = new Date(candidate.getTime() - 2 * 60 * 60 * 1000).toISOString();
  const twoHoursAfter = new Date(candidate.getTime() + 2 * 60 * 60 * 1000).toISOString();

  const { data: conflicts } = await supabase
    .from('marketing_content_queue')
    .select('scheduled_for')
    .in('status', ['scheduled', 'posting', 'posted'])
    .gte('scheduled_for', twoHoursBefore)
    .lte('scheduled_for', twoHoursAfter)
    .limit(5);

  // If there's a conflict, shift by 30 minutes until clear
  if (conflicts?.length) {
    let shifted = new Date(candidate);
    for (let i = 0; i < 6; i++) {
      shifted = new Date(shifted.getTime() + 30 * 60 * 1000);
      const hasConflict = conflicts.some(c => {
        const cTime = new Date(c.scheduled_for).getTime();
        return Math.abs(cTime - shifted.getTime()) < 2 * 60 * 60 * 1000;
      });
      if (!hasConflict) break;
    }
    return {
      scheduledFor: shifted,
      reason: `Shifted from ${runType} slot to avoid overlap with existing posts`,
    };
  }

  const reasons: Record<string, string> = {
    morning: `${platform === 'instagram' ? '10' : '9'} AM AST — peak morning engagement`,
    afternoon: `${platform === 'instagram' ? '2' : '1'} PM AST — lunch break browsing peak`,
    evening: `${platform === 'instagram' ? '7' : '6'} PM AST — post-work browsing peak`,
    manual: 'Manually triggered — posting in 15 minutes',
  };

  return {
    scheduledFor: candidate,
    reason: reasons[runType] || 'Optimal engagement window',
  };
}
