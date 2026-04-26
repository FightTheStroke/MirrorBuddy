# Terms of Service Components

## TosAcceptanceModal

Modal che richiede l'accettazione dei Termini di Servizio al primo login.

### Caratteristiche

- **Non dismissibile**: L'utente DEVE accettare i ToS per procedere
- **Accessibilità WCAG 2.1 AA**:
  - Focus trap (la navigazione resta all'interno del modal)
  - ESC disabilitato (no chiusura accidentale)
  - Screen reader friendly
  - Navigazione da tastiera completa
- **Contenuto italiano** con TL;DR
- **Link ai Termini completi** (`/terms`)
- **Checkbox richiesto** per abilitare il pulsante "Accetto"

### Uso

```tsx
import { TosAcceptanceModal } from '@/components/tos';

function MyComponent() {
  const [showTos, setShowTos] = useState(true);

  const handleAccept = () => {
    // L'API call per salvare l'accettazione è gestita internamente
    setShowTos(false);
    // Procedi con il flusso dell'app
  };

  return (
    <TosAcceptanceModal
      open={showTos}
      onAccept={handleAccept}
    />
  );
}
```

### Props

| Prop | Type | Descrizione |
|------|------|-------------|
| `open` | `boolean` | Controlla la visibilità del modal |
| `onAccept` | `() => void` | Callback chiamato dopo l'accettazione |

### Note implementative

- Il componente chiama internamente l'API `/api/user/accept-tos` (da implementare in T3-04)
- Al momento usa un placeholder per l'API call
- Gestisce lo stato di loading durante il salvataggio
- Include gestione errori (da completare con toast notification)

### Accessibilità

- `aria-required="true"` sul checkbox
- `aria-describedby` per le descrizioni
- `role="status"` per gli annunci screen reader
- Focus visibile su tutti gli elementi interattivi
- Contrasti WCAG 2.1 AA compliant
