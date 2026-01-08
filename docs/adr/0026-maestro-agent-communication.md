# ADR 0026: Maestro-Agent Communication for Demo Generation

## Status
Accepted

## Date
2026-01-08

## Context

The demo generation system had a communication gap between creative Maestros and the technical code generator. Maestros were expected to describe interactive demos without knowing what was technically possible, leading to:

1. **Vague descriptions**: "make something cool" without specific elements
2. **Unrealistic requests**: asking for features not implementable in HTML/CSS/JS
3. **Inconsistent quality**: some demos were basic, others impossible to generate
4. **No validation**: descriptions went directly to code generation

## Decision

### 1. Capability Palette

Provide Maestros with a clear "palette" of what's technically possible:

**Visual Elements:**
- Colored blocks/shapes (squares, circles, rectangles)
- Element grids (arrays, matrices)
- Timelines (horizontal navigable)
- Maps/canvas (drawable areas)
- Charts (bar, line, pie)
- Characters/icons (simple animated figures)
- Large animated text
- Particles (decorative background)

**Interactions:**
- Slider (drag to change value)
- Click (select, activate, reveal)
- Drag & drop
- Hover (show info)
- Numeric input
- Buttons
- Navigation (forward/back, zoom)

**Animations:**
- Sequential appearance
- Smooth movement
- Scale (grow/shrink)
- Rotation
- Pulse
- Color change
- Confetti/particle explosion
- State transitions

**Feedback:**
- Visual flash/shake
- Animated counter
- Progress bar
- Stars/points
- Success message

### 2. Structured Description Format

Maestros describe demos using 5 structured fields:

1. **TITLE**: Catchy name
2. **CONCEPT**: What it teaches
3. **VISUALIZATION**: Using palette elements
4. **INTERACTION**: Using palette interactions
5. **WOW FACTOR**: What makes it memorable

### 3. Style-Specific Examples

Each Maestro gets examples matching their teaching style:

- **Euclide**: Geometric constructions, grids, rectangles
- **Feynman**: Particles, explosions, colorful chaos
- **Erodoto**: Timelines, maps, journeys through history
- **Darwin**: Evolution trees, transformations
- **Curie**: Atoms, radioactivity, chemical reactions
- **Leonardo**: Machines, gears, perspective
- **Álex Pina**: Heist planning boards, karaoke lyrics, escape rooms
- **Shakespeare**: Theatrical stages, word trees

### 4. Validation Before Generation

Before generating code, the system validates:
- Visual element keywords present
- Interaction type specified
- Quantities/specifics provided

If validation fails, suggestions are logged for debugging.

## Implementation

### Files Modified

1. `src/app/api/chat/route.ts`
   - `getDemoContext()`: Returns capability palette for Maestro
   - `getStyleExamples()`: Returns style-specific examples

2. `src/lib/tools/handlers/demo-handler.ts`
   - `validateDescription()`: Validates Maestro's description
   - Enhanced code generation with subject-specific examples

### Language Handling

- **Code/prompts**: Always in English (per project rules)
- **Demo content language**: Based on user's language settings
- **Language Maestros**: Shakespeare (English), Cervantes (Spanish) use bilingual approach

## New Maestro: Álex Pina

Added Álex Pina (creator of La Casa de Papel) as Spanish language professor:
- Subject: `spanish`
- Style: Modern, dramatic, teaches through series and pop culture
- Bilingual: Italian explanations + Spanish practice
- Catchphrases: "¡Tengo un plan!", "Somos la resistencia", "¡Bella ciao!"
- Icon: 🇪🇸

## Consequences

### Positive
- Clear contract between creative and technical sides
- Better demo quality with specific elements
- Validation catches vague descriptions early
- Style-specific examples inspire creativity
- Spanish language now supported

### Negative
- More complex prompts (increased token usage)
- May constrain truly novel demo ideas
- Requires maintenance as new capabilities are added

## References
- ADR 0025: Demo Generation Architecture
- ADR 0027: Bilingual Voice Recognition for Language Teachers
- `src/data/maestri/alex-pina.ts`: Spanish professor (Álex Pina)
