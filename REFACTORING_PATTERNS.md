# Component Refactoring Patterns & Templates

Use these patterns to complete the remaining 11 oversized components.

---

## Pattern 1: Extract Form Sections

**Use for**: `info-step.tsx`, `parent-professor-chat.tsx`

### Before
```tsx
// 450+ lines - all in one file
function InfoStep() {
  return (
    <form>
      <section>
        <input /> {/* 30 lines */}
        <input /> {/* 30 lines */}
        {/* ... */}
      </section>
      <section>
        {/* Another 100 lines */}
      </section>
    </form>
  );
}
```

### After
```
info-step.tsx (250 lines)
├── form-header.tsx (60 lines)
├── form-fields.tsx (80 lines)
├── form-actions.tsx (40 lines)
└── form-utils.ts (30 lines - validation, helpers)
```

### Implementation
1. Identify each `<section>` or major form field group
2. Extract to separate component file
3. Move validation/utilities to `.ts` file
4. Keep main file for layout & state management

---

## Pattern 2: Extract Dashboard Sections

**Use for**: `parent-dashboard.tsx`, `archive-view.tsx`

### Before
```tsx
// 440 lines - multiple sections inline
function Dashboard() {
  return (
    <div>
      {/* Stats section - 60 lines */}
      <div className="grid">...</div>

      {/* Activity section - 80 lines */}
      <Card>...</Card>

      {/* Chart section - 100 lines */}
      <Chart>...</Chart>
    </div>
  );
}
```

### After
```
parent-dashboard.tsx (200 lines)
├── dashboard-stats.tsx (80 lines)
├── dashboard-activity.tsx (100 lines)
├── dashboard-chart.tsx (120 lines)
└── dashboard-utils.ts (40 lines)
```

### Implementation
1. Identify distinct visual sections
2. Each section → separate component file
3. Extract shared utilities/helpers
4. Import sections in main dashboard
5. Main file becomes layout + data fetching

---

## Pattern 3: Extract Search/Filter Logic

**Use for**: `knowledge-hub.tsx`, `topic-detail.tsx`

### Before
```tsx
// 450+ lines
function KnowledgeHub() {
  const [filters, setFilters] = useState({...}); // 40 lines
  const [searchTerm, setSearchTerm] = useState('');

  const handleFilterChange = () => {...}; // 50 lines
  const filterResults = () => {...}; // 60 lines

  return (
    <div>
      {/* Filter UI - 100 lines */}
      {/* Results grid - 150 lines */}
    </div>
  );
}
```

### After
```
knowledge-hub.tsx (200 lines)
├── hooks/useKnowledgeFilters.ts (80 lines)
├── filter-panel.tsx (100 lines)
├── knowledge-grid.tsx (120 lines)
└── filter-utils.ts (40 lines)
```

### Implementation
1. Extract filter state logic → custom hook
2. Extract filter UI → separate component
3. Extract result rendering → separate component
4. Move utilities to `.ts` file
5. Main file: compose hook + components

---

## Pattern 4: Extract Component Trees

**Use for**: `voice-onboarding-panel.tsx`, `study-workspace.tsx`

### Before
```tsx
// 380 lines - nested components, lots of conditionals
function VoiceOnboardingPanel() {
  return (
    <>
      {state === 'connecting' ? (
        <div>...</div> // 60 lines
      ) : state === 'connected' ? (
        <div>
          {/* Transcript - 40 lines */}
          {/* Controls - 50 lines */}
          {/* Checklist - 80 lines */}
        </div>
      ) : (
        <button>Start</button> // 30 lines
      )}
    </>
  );
}
```

### After
```
voice-onboarding-panel.tsx (200 lines)
├── voice-connecting-state.tsx (80 lines)
├── voice-connected-state.tsx (120 lines)
├── voice-idle-state.tsx (40 lines)
├── voice-transcript.tsx (50 lines)
├── voice-controls.tsx (60 lines)
└── voice-checklist.tsx (70 lines)
```

### Implementation
1. Extract each conditional branch → separate component
2. Extract sub-components within branches
3. Keep main file as state container + router
4. Main file dispatches props to sub-components

---

## Pattern 5: Extract Hooks from Complex State

**Use for**: `use-webcam-capture.ts` (374 lines)

### Before
```ts
// 374 lines - one huge hook
export function useWebcamCapture() {
  const [stream, setStream] = useState(null);
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [error, setError] = useState(null);
  // ... 20 more state variables

  const startCamera = () => {...}; // 60 lines
  const switchCamera = () => {...}; // 40 lines
  const doCapture = () => {...}; // 30 lines
  const toggleFrontBack = () => {...}; // 25 lines

  return { /* 30+ properties */ };
}
```

### After
```
use-webcam-capture.ts (150 lines) - Main hook
├── hooks/useCameraDevices.ts (80 lines)
│   └── Camera enumeration & device management
├── hooks/useCameraStream.ts (100 lines)
│   └── Stream start/stop logic
├── hooks/useCameraCapture.ts (70 lines)
│   └── Capture & image handling
├── utils/camera-utils.ts (40 lines)
│   └── Camera helper functions
└── utils/error-handling.ts (30 lines)
    └── Error classification
```

### Implementation
1. Group related state variables → separate hook
2. Extract sub-functions to utilities
3. Reduce returned object to essentials
4. Compose micro-hooks in main hook

---

## Extraction Checklist

For **EACH** component being split:

- [ ] Identify sections (visual, logical, or state-based)
- [ ] Create new files following naming convention
- [ ] Move code to appropriate file
- [ ] Update imports in main file
- [ ] Test TypeScript compilation: `npm run typecheck`
- [ ] Test linting: `npm run lint -- <filename>`
- [ ] Verify exports are correct
- [ ] Check for circular dependencies
- [ ] Update any internal documentation
- [ ] Test component in browser (if UI component)

---

## File Naming Conventions

```
📁 Component Libraries
├── component.tsx              # Main component
├── component-sub.tsx          # Sub-component
├── component-utils.ts         # Utilities
├── component-types.ts         # Type definitions (if complex)
└── hooks/
    ├── use-component.ts       # Main hook
    └── use-component-sub.ts   # Sub-hook

📁 Feature Components
├── feature.tsx                # Main feature
├── components/
│   ├── feature-section1.tsx   # Section 1
│   ├── feature-section2.tsx   # Section 2
│   └── feature-card.tsx       # Reusable card
├── hooks/
│   └── use-feature.ts         # Feature hook
└── utils/
    └── feature-utils.ts       # Utilities
```

---

## Anti-Patterns to Avoid

❌ **DON'T**: Create files that are just renaming the original
✅ **DO**: Create focused files with clear responsibility

❌ **DON'T**: Leave huge hooks in component files
✅ **DO**: Extract hooks to separate `hooks/` directory

❌ **DON'T**: Mix types, components, and utils in same file
✅ **DO**: Separate concerns into different files

❌ **DON'T**: Create circular dependencies
✅ **DO**: Verify imports flow in one direction

---

## Refactoring Workflow

```bash
# 1. Create new file(s) with extracted code
touch src/components/path/new-component.tsx

# 2. Update imports in original file
# Change from: const { X } = someState;
# To: import { X } from './new-component';

# 3. Run type checking
npm run typecheck

# 4. Run linting
npm run lint -- src/components/path/

# 5. Test in development (if UI component)
npm run dev
# Visit page, verify it still works

# 6. Verify file is under 250 lines
wc -l src/components/path/component.tsx
```

---

## Tips & Tricks

### Tip 1: Find extraction candidates
```bash
# Show files with line count
find src/components -name "*.tsx" -o -name "*.ts" \
  | xargs wc -l | sort -n | tail -20
```

### Tip 2: Check import paths
```bash
# Verify no circular deps after refactoring
npx depcheck --unused

# Check if all imports are correct
npm run typecheck
```

### Tip 3: Preserve comments
When extracting code, keep comments that explain context. Move them with the code.

### Tip 4: Test incrementally
Refactor one component at a time, verify it works before moving to next.

---

## Common Issues & Solutions

### Issue: Type errors after extraction

**Symptom**: `Property 'X' does not exist on type 'Y'`

**Solution**:
1. Check if type is exported from new file
2. Verify import statement includes type
3. Run `npm run typecheck` to see full error

### Issue: Circular dependencies

**Symptom**: Module not found or webpack warning

**Solution**:
1. Move shared types to separate `types.ts`
2. Move utilities to `utils.ts` (bottom of dependency tree)
3. Check import directions: components import from hooks, hooks import from utils

### Issue: Component doesn't render

**Symptom**: Blank page or error in browser

**Solution**:
1. Check all imports are correct in main file
2. Verify props are passed correctly to sub-components
3. Test in dev browser: `npm run dev`
4. Check browser console for errors

---

## Estimated Time Breakdown

**Per component** (medium-sized ~400 lines):
- Analysis & planning: 10 min
- File creation & extraction: 15 min
- Import updates: 10 min
- Testing & verification: 10 min
- **Total**: ~45 minutes per component

**11 remaining components**: ~8 hours total

---

## Next Component to Tackle

### Recommended Order
1. **info-step.tsx** - Pure form, easy extraction
2. **parent-professor-chat.tsx** - Similar pattern
3. **parent-dashboard.tsx** - Clear sections
4. **archive-view.tsx** - Item rendering pattern
5. **knowledge-hub.tsx** - Filter logic extraction
6. **topic-detail.tsx** - Section extraction
7. **weekly-schedule.tsx** - Form + list pattern
8. **voice-onboarding-panel.tsx** - State branches
9. **pdf-preview.tsx** - Modal sections
10. **study-workspace.tsx** - Toolbar extraction
11. **use-webcam-capture.ts** - Hook decomposition

Each follows proven pattern above. Start with #1 (info-step) as template for others.
