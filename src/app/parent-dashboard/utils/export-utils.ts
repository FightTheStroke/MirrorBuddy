/**
 * @file export-utils.ts
 * @brief Utility functions for exporting profile data
 */

const DEMO_USER_ID = 'demo-student-1';

export async function exportProfile(format: 'json' | 'pdf'): Promise<void> {
  const response = await fetch(
    `/api/profile/export?userId=${DEMO_USER_ID}&format=${format}`
  );

  if (!response.ok) {
    throw new Error('Export failed');
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `profilo-${format === 'json' ? 'dati.json' : 'report.html'}`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

