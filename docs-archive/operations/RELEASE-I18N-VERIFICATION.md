# Release i18n Verification - MirrorBuddy

Detailed manual verification steps for i18n and language-specific maestri during release.

---

## 1.1 Run Automated i18n Check

```bash
npx tsx scripts/i18n-check.ts
```

**Expected output**:

```
Reference locale: it (NNN keys)
✓ it.json: NNN/NNN keys
✓ en.json: NNN/NNN keys
✓ fr.json: NNN/NNN keys
✓ de.json: NNN/NNN keys
✓ es.json: NNN/NNN keys

Result: PASS
```

If FAIL: missing keys detected

- [ ] Review failed locale file: `messages/{locale}.json`
- [ ] Compare with reference: `diff messages/it.json messages/{locale}.json`
- [ ] Add missing keys from Italian reference
- [ ] Rerun until PASS

---

## 1.2 Verify All Locales Load Correctly

```bash
npm run dev
# Browser: http://localhost:3000
```

**Verification checklist**:

### Locale Dropdown

- [ ] Footer or settings shows locale selector
- [ ] All 5 options visible: Italiano, English, Français, Deutsch, Español
- [ ] Can switch between locales without errors

### Locale Persistence

- [ ] Switch to Français
- [ ] Refresh page (F5)
- [ ] UI still in Français (locale persisted)
- [ ] Repeat for each locale

### UI Translation

- [ ] Italiano: verify Italian text (e.g., "Carica")
- [ ] English: verify English text (e.g., "Load")
- [ ] Français: verify French text (e.g., "Charger")
- [ ] Deutsch: verify German text (e.g., "Laden")
- [ ] Español: verify Spanish text (e.g., "Cargar")

### Browser Console

- [ ] Open DevTools console
- [ ] Switch locales 5 times
- [ ] Zero console errors or warnings

---

## 1.3 Test Language-Specific Maestri

### Molière (French)

**Setup**: Set locale to Français

1. Navigate to maestri selection screen
   - [ ] "Molière" appears in list
   - [ ] Subject shows "Français" or "French"
   - [ ] Avatar displays correctly
   - [ ] Color is vibrant purple (#D946EF)

2. Start conversation with Molière
   - [ ] Click "Start learning"
   - [ ] Greeting uses "tu" (informal): e.g., "Bienvenue à..."
   - [ ] Voice is "echo" with French accent
   - [ ] No English fallback in response

3. Test character interaction
   - [ ] Send message in French or English
   - [ ] Response is in French
   - [ ] Maintains theatrical, engaging tone
   - [ ] References French culture/literature

### Goethe (German)

**Setup**: Set locale to Deutsch

1. Navigate to maestri selection screen
   - [ ] "Goethe" appears in list
   - [ ] Subject shows "Deutsch" or "German"
   - [ ] Avatar displays correctly
   - [ ] Color is emerald green (#059669)

2. Start conversation with Goethe
   - [ ] Click "Start learning"
   - [ ] Greeting uses "Sie" (formal): e.g., "Guten Tag, Ich bin..."
   - [ ] Voice is "onyx" with German accent
   - [ ] No English fallback in response

3. Test character interaction
   - [ ] Send message in German or English
   - [ ] Response is in German
   - [ ] Maintains philosophical, measured tone
   - [ ] References German literature/culture

### Cervantes (Spanish)

**Setup**: Set locale to Español

1. Navigate to maestri selection screen
   - [ ] "Cervantes" appears in list
   - [ ] Subject shows "Español" or "Spanish"
   - [ ] Avatar displays correctly
   - [ ] Color is tan/gold (#C19A6B)

2. Start conversation with Cervantes
   - [ ] Click "Start learning"
   - [ ] Greeting uses informal: e.g., "¡Bienvenidos, nobles..."
   - [ ] Voice is "nova" with Spanish accent
   - [ ] No English fallback in response

3. Test character interaction
   - [ ] Send message in Spanish or English
   - [ ] Response is in Spanish
   - [ ] Maintains adventurous, quest-oriented tone
   - [ ] References Spanish culture/Don Quijote

---

## 1.4 Maestri Character Consistency Test

```bash
npm run test:unit -- src/data/__tests__/character-consistency.test.ts
```

**Expected result**: All tests pass

**If fails**:

- [ ] Review test output for specific failures
- [ ] Check maestri exports in `src/data/maestri/index.ts`
- [ ] Verify avatar paths in `public/maestri/{name}.png`
- [ ] Rerun test until all pass

---

## Summary Checklist

- [ ] i18n completeness check passes (PASS)
- [ ] All 5 locales load in UI
- [ ] Locale switching persists
- [ ] Molière (French) works with "tu" address
- [ ] Goethe (German) works with "Sie" address
- [ ] Cervantes (Spanish) works with informal address
- [ ] Character consistency test passes
- [ ] No console errors during testing

---

**Version**: 1.0.0 (2026-01-25)
