import { describe, expect, it } from 'vitest';
import {
  buildMaintenanceEmailHtml,
  buildMaintenanceEmailText,
} from '@/lib/maintenance/email-template';

describe('maintenance email template', () => {
  const startTime = new Date('2026-03-01T10:00:00.000Z');
  const endTime = new Date('2026-03-01T11:30:00.000Z');

  it('builds HTML with all required fields', () => {
    const html = buildMaintenanceEmailHtml({
      recipientName: 'Alex',
      startTime,
      endTime,
      estimatedMinutes: 90,
      message: 'Platform upgrade',
    });

    expect(html).toContain('Alex');
    expect(html).toContain('Platform upgrade');
    expect(html).toContain(startTime.toISOString());
    expect(html).toContain(endTime.toISOString());
    expect(html).toContain('90');
  });

  it('escapes HTML-sensitive content to prevent XSS', () => {
    const html = buildMaintenanceEmailHtml({
      recipientName: '<img src=x onerror=alert(1)>',
      startTime,
      endTime,
      estimatedMinutes: 30,
      message: '<script>alert("xss")</script>',
    });

    expect(html).not.toContain('<script>alert("xss")</script>');
    expect(html).toContain('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });

  it('builds plain text fallback with required values', () => {
    const text = buildMaintenanceEmailText({
      recipientName: 'Sam',
      startTime,
      endTime,
      estimatedMinutes: 60,
      message: 'Routine maintenance',
    });

    expect(text).toContain('Sam');
    expect(text).toContain('Routine maintenance');
    expect(text).toContain(startTime.toISOString());
    expect(text).toContain(endTime.toISOString());
    expect(text).toContain('60');
  });
});
