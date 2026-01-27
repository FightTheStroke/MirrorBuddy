# Vercel Production Errors - Diagnosis Guide

## Quick Diagnosis

Run the diagnostic script:

```bash
./scripts/diagnose-vercel-errors.sh
```

Or manually check:

```bash
# 1. Check deployment status
vercel ls --prod

# 2. Get recent logs
vercel logs --prod --follow

# 3. Test health endpoint
curl https://mirrorbuddy.vercel.app/api/health
```

## Common Issues Fixed (2026-01-27)

### 1. Commento Obsoleto in next.config.ts ✅ FIXED

**Problema**: Commento riferiva ancora a `src/middleware.ts` invece di `src/proxy.ts`

**Fix**: Aggiornato commento in `next.config.ts` linea 152

### 2. Proxy.ts Compatibility

**Status**: Verificato che:

- ✅ Solo un file `proxy.ts` esiste (`src/proxy.ts`)
- ✅ Nessun file `middleware.ts` nella root
- ✅ Build locale passa correttamente
- ✅ Proxy è riconosciuto nel build output

**Potenziale problema**: Next.js 16.1.1 potrebbe avere problemi con `proxy.ts` su Vercel in produzione. Se gli errori persistono, considerare di tornare temporaneamente a `middleware.ts`.

### 3. Cookie Consent Wall Hydration

**Potenziale problema**: `useSyncExternalStore` con `getServerConsentSnapshot` che restituisce sempre `false` potrebbe causare hydration mismatch.

**Monitoraggio**: Controllare errori di hydration nei log del browser.

## Errori Comuni da Cercare nei Log

### MODULE_NOT_FOUND

```
Error: Cannot find module 'package-name'
```

**Soluzione**: Rimuovere package da `serverExternalPackages` in `next.config.ts`

### ERR_REQUIRE_ESM

```
Error: ERR_REQUIRE_ESM: require() of ES Module
```

**Soluzione**: Usare lazy initialization con dynamic imports

### 403 CSRF Errors

```
Invalid CSRF token
```

**Soluzione**: Usare `csrfFetch()` invece di `fetch()`

### CSP Violations

```
Content Security Policy violation
```

**Soluzione**: Verificare CSP headers in `src/proxy.ts`

### Database SSL Errors

```
Unable to verify first certificate
```

**Soluzione**: Verificare che `SUPABASE_CA_CERT` sia configurato in Vercel

### Proxy Not Executing

Se il proxy non viene eseguito, potrebbe essere necessario:

1. Verificare che il file si chiami esattamente `proxy.ts` (non `middleware.ts`)
2. Verificare che sia in `src/proxy.ts` (non nella root)
3. Verificare che esporti `export default function proxy()`

## Next Steps

1. **Eseguire lo script di diagnostica**:

   ```bash
   ./scripts/diagnose-vercel-errors.sh
   ```

2. **Controllare i log di Vercel** per errori specifici:

   ```bash
   vercel logs --prod --follow
   ```

3. **Verificare le variabili d'ambiente** in Vercel Dashboard:
   - `DATABASE_URL`
   - `SUPABASE_CA_CERT`
   - `AZURE_OPENAI_*`
   - `TOKEN_ENCRYPTION_KEY`

4. **Testare l'endpoint di health**:
   ```bash
   curl https://mirrorbuddy.vercel.app/api/health
   ```

## Reference

- [Vercel Troubleshooting Guide](./VERCEL-TROUBLESHOOTING.md)
- [ADR 0066: i18n Architecture](../adr/0066-i18n-multi-language-architecture.md) - Sezione 9: Single Proxy File
- [ADR 0078: Vercel Runtime Constraints](../adr/0078-vercel-runtime-constraints.md)
