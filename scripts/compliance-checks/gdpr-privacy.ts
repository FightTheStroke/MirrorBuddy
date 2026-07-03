import { CheckResult, fileExists, fileContains, dirExists } from './types';

const CAT = 'GDPR & Privacy';

export async function runGdprPrivacyChecks(): Promise<CheckResult[]> {
  const results: CheckResult[] = [];

  function add(name: string, status: CheckResult['status'], message: string): void {
    results.push({ name, status, message, category: CAT });
  }

  // --- Data deletion endpoint ---
  const deletePath = 'src/app/api/privacy/delete-my-data/route.ts';
  if (!fileExists(deletePath)) {
    add('Data deletion API', 'FAIL', `Missing: ${deletePath}`);
  } else {
    const hasAuth = fileContains(deletePath, 'withCSRF') && fileContains(deletePath, 'withAuth');
    if (!hasAuth) {
      add('Data deletion auth', 'WARN', 'Data deletion endpoint may lack CSRF/auth middleware');
    } else {
      add('Data deletion auth', 'PASS', 'Data deletion endpoint has CSRF + auth');
    }
  }

  // --- Data export endpoint ---
  const exportPath = 'src/app/api/privacy/export-data/route.ts';
  if (!fileExists(exportPath)) {
    add('Data export API', 'FAIL', `Missing: ${exportPath}`);
  } else {
    add('Data export API', 'PASS', 'Data export endpoint exists');
  }

  // --- Cookie consent component (UnifiedConsentWall replaced CookieConsentWall — TJ.3) ---
  if (!dirExists('src/components/consent')) {
    add('Cookie consent', 'FAIL', 'Missing: src/components/consent/');
  } else if (!fileExists('src/components/consent/unified-consent-wall.tsx')) {
    add('Cookie consent wall', 'FAIL', 'No consent wall component found');
  } else {
    add('Cookie consent wall', 'PASS', 'Unified consent wall component exists');
  }

  // --- ToS gate (UnifiedConsentWall + unified-consent-storage replaced TosGateProvider — TJ.3) ---
  const tosApiPath = 'src/app/api/tos/route.ts';
  const unifiedStoragePath = 'src/lib/consent/unified-consent-storage.ts';
  if (!fileExists(tosApiPath)) {
    add('ToS gate', 'FAIL', `Missing: ${tosApiPath}`);
  } else if (
    !fileExists(unifiedStoragePath) ||
    !fileContains(unifiedStoragePath, 'TOS_VERSION')
  ) {
    add('ToS gate', 'FAIL', 'Unified consent storage missing ToS version enforcement');
  } else {
    add('ToS gate', 'PASS', 'ToS acceptance enforced via unified consent + /api/tos');
  }

  // --- Anonymization service ---
  const anonPath = 'src/lib/privacy/anonymization-service.ts';
  if (!fileExists(anonPath)) {
    add('Anonymization service', 'FAIL', `Missing: ${anonPath}`);
  } else {
    add('Anonymization service', 'PASS', 'PII anonymization service exists');
  }

  // --- Data retention service ---
  const retPath = 'src/lib/privacy/data-retention-service.ts';
  if (!fileExists(retPath)) {
    add('Data retention', 'FAIL', `Missing: ${retPath}`);
  } else {
    add('Data retention', 'PASS', 'Data retention service exists');
  }

  // --- COPPA service ---
  const coppaPath = 'src/lib/compliance/coppa-service.ts';
  if (!fileExists(coppaPath)) {
    add('COPPA service', 'FAIL', `Missing: ${coppaPath}`);
  } else {
    add('COPPA service', 'PASS', 'COPPA compliance service exists');
  }

  // --- Cookie consent config ---
  const ccPath = 'src/lib/compliance/cookie-consent-config.ts';
  if (!fileExists(ccPath)) {
    add('Cookie config', 'WARN', `Missing: ${ccPath}`);
  } else {
    add('Cookie config', 'PASS', 'Cookie consent configuration exists');
  }

  return results;
}
