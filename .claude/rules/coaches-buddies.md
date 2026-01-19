# Coaches & Buddies Rules - MirrorBuddy

## Support Triangle

| Role      | Purpose                   | Relationship | Data Location                |
| --------- | ------------------------- | ------------ | ---------------------------- |
| **Coach** | Learning method, autonomy | Vertical     | `src/data/support-teachers/` |
| **Buddy** | Emotional support, peer   | Horizontal   | `src/data/buddy-profiles/`   |

## Current Characters

### Coaches (6)

| Coach   | Style                        | Age | Color   |
| ------- | ---------------------------- | --- | ------- |
| Melissa | Enthusiastic, positive       | 26  | Pink    |
| Roberto | Calm, reassuring             | 28  | Blue    |
| Chiara  | Organized, fresh graduate    | 24  | Violet  |
| Andrea  | Sporty, energetic            | 27  | Orange  |
| Favij   | Gamer, creative              | 30  | Red     |
| Laura   | Reflective, calm, empathetic | 31  | Emerald |

### Buddies (6)

| Buddy | Style                     | Color   |
| ----- | ------------------------- | ------- |
| Mario | Friendly, ironic          | Emerald |
| Noemi | Empathetic, sunny         | Purple  |
| Enea  | Cheerful, positive        | Amber   |
| Bruno | Reflective, good listener | Indigo  |
| Sofia | Creative, dreamy          | Pink    |
| Marta | Sporty, determined        | Sky     |

## Adding New Coach

**IMPORTANT**: Update ALL locations or the character won't appear in UI.

### Files to Update (5 locations)

1. **Create data file**: `src/data/support-teachers/{name}.ts`
2. **Export from index**: `src/data/support-teachers/support-teachers.ts`
   - Add import
   - Add to `CoachId` type
   - Add to `SUPPORT_TEACHERS` map
   - Add to `getAllSupportTeachers()` array
   - Add to exports
3. **Add to settings UI**: `src/components/settings/sections/character-settings-data.ts`
   - Add entry to `COACHES` array
4. **Add to settings types**: `src/components/settings/sections/character-settings.tsx`
   - Add to `preferredCoach` type union
5. **Add to home constants**: `src/app/home-constants.ts`
   - Add to `COACH_INFO` object
6. **Update types**: `src/lib/stores/settings-types.ts`
   - Add to `preferredCoach` type in `ExtendedStudentProfile`
7. **Update chat view**: `src/components/conversation/character-chat-view.tsx`
   - Add to `characterId` type union

### Avatar

Add avatar image: `public/avatars/{name}.webp`

### Verification

```bash
npm run test:unit -- src/data/__tests__/character-consistency.test.ts
npm run typecheck
npm run build
```

## Adding New Buddy

Same process as coach, but in buddy locations:

1. **Create data file**: `src/data/buddy-profiles/{name}.ts`
2. **Export from index**: `src/data/buddy-profiles/buddy-profiles.ts`
3. **Add to settings UI**: `character-settings-data.ts` → `BUDDIES` array
4. **Add to settings types**: `character-settings.tsx` → `preferredBuddy` type
5. **Add to home constants**: `home-constants.ts` → `BUDDY_INFO`
6. **Update types**: `settings-types.ts` → `preferredBuddy` type
7. **Update chat view**: `character-chat-view.tsx` → `characterId` type

## Data Structures

### Coach (SupportTeacher)

```typescript
export const COACH_NAME: SupportTeacher = {
  id: "name",
  name: "Name",
  gender: "female" | "male",
  age: 28,
  personality: "Description of personality",
  role: "learning_coach",
  tools: ["pdf", "webcam", "homework", "formula", "chart"],
  voice: "sage" | "alloy" | "echo" | "shimmer",
  voiceInstructions: "Voice character description...",
  systemPrompt: injectSafetyGuardrails(corePrompt, { role: "coach" }),
  greeting: "Ciao! Sono...",
  avatar: "/avatars/name.webp",
  color: "#hexcolor",
};
```

### Buddy (BuddyProfile)

```typescript
export const BUDDY_NAME: BuddyProfile = {
  id: "name",
  name: "Name",
  gender: "female" | "male",
  ageOffset: 1, // Always 1 year older than student
  personality: "Description",
  role: "peer_buddy",
  voice: "sage",
  tools: ["pdf", "webcam", "homework", "formula", "chart"],
  voiceInstructions: "Voice character...",
  getSystemPrompt: (student) => generatePrompt(student),
  getGreeting: (student) => `Ciao! Ho ${student.age + 1} anni...`,
  avatar: "/avatars/name.webp",
  color: "#hexcolor",
};
```

## UI Card Structure

```typescript
// In character-settings-data.ts
{
  id: 'name' as const,
  name: 'Display Name',
  avatar: '/avatars/name.webp',
  description: 'Short personality description',
  tagline: 'Catchy 3-4 word tagline',
  color: 'from-{color}-500 to-{color2}-500',
  bgColor: 'bg-{color}-50 dark:bg-{color}-900/20',
  borderColor: 'border-{color}-200 dark:border-{color}-800',
  activeBorder: 'border-{color}-500 ring-2 ring-{color}-500/50',
}
```

## Automated Test

The test `src/data/__tests__/character-consistency.test.ts` verifies:

- All data coaches appear in UI
- All data buddies appear in UI
- No orphan UI entries
- Avatar paths are set

Run after adding characters:

```bash
npm run test:unit -- character-consistency
```

## Common Mistakes

1. **Forgot settings-types.ts** → TypeScript error on profile update
2. **Forgot home-constants.ts** → Runtime error on home page
3. **Forgot character-chat-view.tsx** → TypeScript error on chat
4. **Wrong avatar path** → Broken image in UI
