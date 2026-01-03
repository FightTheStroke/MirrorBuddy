# Phase 3: Supporti UI Harmonization

**Parent**: [Main Tracker](./StudyKitSupportiIntegration-Main.md)
**Focus**: Align Supporti components with main app navigation/styling

---

## CURRENT ISSUES

1. **Custom input/select**: Not using shadcn/ui Input, Select
2. **Sidebar styling**: Different from main nav
3. **Breadcrumb styling**: Custom implementation
4. **Loading spinner**: Custom, not consistent with app

---

## EXECUTION TRACKER

| Status | ID | Task | Assignee | Files |
|:------:|-----|------|----------|-------|
| ⬜ | T-14 | Replace custom input with shadcn Input | CLAUDE 3 | `src/app/supporti/components/supporti-view.tsx` |
| ⬜ | T-15 | Replace custom select with shadcn Select | CLAUDE 3 | `src/app/supporti/components/supporti-view.tsx` |
| ⬜ | T-16 | Align sidebar with main nav styling | CLAUDE 3 | `src/app/supporti/components/sidebar.tsx` |
| ⬜ | T-17 | Use app-wide loading component | CLAUDE 3 | `src/app/supporti/components/supporti-view.tsx` |
| ⬜ | T-18 | Align breadcrumb with app patterns | CLAUDE 3 | `src/app/supporti/components/supporti-view.tsx` |

---

## DETAILED SPECIFICATIONS

### T-14: Replace Input

Current (line 228-235):
```tsx
<input
  type="text"
  placeholder="Cerca..."
  className="pl-9 w-full sm:w-48 h-10 rounded-md border border-slate-200..."
/>
```

Replace with:
```tsx
import { Input } from '@/components/ui/input';

<div className="relative">
  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
  <Input
    type="text"
    placeholder="Cerca..."
    value={searchQuery}
    onChange={handleSearchChange}
    className="pl-9 w-full sm:w-48"
  />
</div>
```

### T-15: Replace Select

Current (line 243-250):
```tsx
<select
  className="appearance-none pl-8 pr-8 h-9 rounded-md border..."
>
```

Replace with shadcn Select:
```tsx
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

<Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
  <SelectTrigger className="w-[140px]">
    <SelectValue placeholder="Ordina per" />
  </SelectTrigger>
  <SelectContent>
    {SORT_OPTIONS.map(opt => (
      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
    ))}
  </SelectContent>
</Select>
```

### T-16: Sidebar Styling

Read current sidebar.tsx and align with:
- Main navigation hover states
- Active item highlighting
- Icon sizing and spacing
- Section dividers

### T-17: Loading Component

Replace custom spinner:
```tsx
<div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
```

With app loading pattern (check if there's a shared Loading component).

---

## CHECKPOINT LOG

| Timestamp | Agent | Task | Status | Notes |
|-----------|-------|------|--------|-------|
| - | - | - | - | Awaiting Phase 2 completion |

---

## VERIFICATION

After Phase 3:
1. Open /supporti
2. Verify input, select match other app forms
3. Check sidebar hover/active states
4. Compare with main navigation styling

**Command**: `npm run lint && npm run typecheck && npm run build`
