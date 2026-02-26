/**
 * Strip HTML tags and dangerous content from user input.
 * Lightweight server-side sanitizer — no external dependencies needed.
 */
export function sanitizeText(input: string | null | undefined): string | null {
  if (!input) return null;

  return input
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Remove javascript: and data: URIs
    .replace(/javascript\s*:/gi, '')
    .replace(/data\s*:/gi, '')
    // Remove event handlers
    .replace(/on\w+\s*=/gi, '')
    // Trim whitespace
    .trim() || null;
}
