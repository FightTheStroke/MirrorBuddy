# CodeQL Security Patterns

Patterns per evitare alert CodeQL comuni in progetti TypeScript/JavaScript.

## js/incomplete-multi-character-sanitization

**Problema**: Usare `replace()` sequenziali per pattern multi-carattere (es. `<!--` e `-->`) può essere bypassato con input malevoli come `<!---->`.

**Soluzione**: Loop + regex combinata con alternation (`|`).

```typescript
// ❌ SBAGLIATO - CodeQL alert
function badSanitize(text: string): string {
  return text
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<!--/g, '')
    .replace(/-->/g, '');
}

// ✅ CORRETTO - Nessun alert
function sanitizeHtmlComments(text: string): string {
  let result = text;
  let previousResult: string;

  // Loop fino a stabilità (gestisce pattern nested come <!---->)
  do {
    previousResult = result;
    // Combina TUTTI i patterns in singola regex con alternation
    result = result.replace(/<!--[\s\S]*?(?:--|--!)>|<!--|(?:--|--!)>/g, '');
  } while (result !== previousResult);

  return result;
}
```

**Riferimenti**:
- [CodeQL docs](https://codeql.github.com/codeql-query-help/javascript/js-incomplete-multi-character-sanitization/)

---

## js/bad-tag-filter

**Problema**: Regex per filtrare tag HTML potrebbe non coprire tutte le varianti browser.

**Soluzione**:
1. Gestire `--!>` oltre a `-->` (browser quirk)
2. Usare librerie sanitization per input utente non fidato (DOMPurify)

```typescript
// Per input FIDATO (es. config interne):
// Usa il pattern sopra con (?:--|--!)>

// Per input UTENTE (non fidato):
import DOMPurify from 'dompurify';
const clean = DOMPurify.sanitize(userInput);
```

---

## actions/missing-workflow-permissions

**Problema**: GitHub Actions workflow senza permessi espliciti.

**Soluzione**: Aggiungere `permissions` block al workflow.

```yaml
# .github/workflows/ci.yml
permissions:
  contents: read
  # Aggiungere altri permessi se necessari
```

---

## Quando gli Alert si Chiudono

Gli alert CodeQL sono associati al branch di default (`main`).
- Fix in feature branch → alert rimane aperto su `main`
- Dopo merge del PR → alert si chiude automaticamente
- GitHub riesegue CodeQL analysis su `main` dopo merge
