/**
 * @file email-factory.ts
 * @brief Generates mock email arrays for Resend quota tests
 */

interface MockEmail {
  id: string;
  created_at: string;
}

/**
 * Generate mock emails evenly spread within a time range.
 *
 * @param count - Number of emails to generate
 * @param rangeStart - Start of the time range (e.g. start of day/month)
 * @param rangeEnd - End of the time range (e.g. now)
 */
export function generateEmailsInRange(
  count: number,
  rangeStart: Date,
  rangeEnd: Date,
): MockEmail[] {
  const timeRange = rangeEnd.getTime() - rangeStart.getTime();
  const interval = Math.max(1000, timeRange / (count + 1));

  return Array(count)
    .fill(null)
    .map((_, i) => ({
      id: `email-${i}`,
      created_at: new Date(rangeStart.getTime() + (i + 1) * interval).toISOString(),
    }));
}
