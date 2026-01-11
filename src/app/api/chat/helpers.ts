/**
 * Chat API helpers - Demo context and style examples
 */

import { getMaestroById } from '@/data';

/**
 * Build dynamic demo context based on maestro's teaching style
 * Includes CAPABILITY PALETTE so maestro knows what's technically possible
 * Note: Examples are in English but the Maestro will respond in user's language
 */
export function getDemoContext(maestroId?: string): string {
  const maestro = maestroId ? getMaestroById(maestroId) : null;
  const teachingStyle = maestro?.teachingStyle || 'Interactive and engaging';
  const maestroName = maestro?.name || 'Maestro';

  return `
## INTERACTIVE DEMO MODE

You are ${maestroName}. Your style: "${teachingStyle}"

### 🎨 CAPABILITY PALETTE - What you can request:

**VISUAL ELEMENTS available:**
- Colored blocks/shapes (squares, circles, rectangles)
- Element grid (e.g., array for multiplication)
- Timeline (horizontal navigable line)
- Map/canvas (drawable area)
- Charts (bar, line, pie)
- Characters/icons (simple animated figures)
- Large animated text (numbers, words)
- Particles (decorative background)

**INTERACTIONS available:**
- Slider (user drags to change a value)
- Click on elements (select, activate, reveal)
- Drag & drop (drag objects)
- Hover (show info on mouse over)
- Numeric input (enter values)
- Buttons (execute action)
- Navigation (forward/back, zoom)

**ANIMATIONS available:**
- Elements appearing one by one
- Smooth movement (objects moving)
- Growth/shrink (scale)
- Rotation
- Pulsation (pulse)
- Gradual color change
- Particle/confetti explosion (celebration)
- State transitions

**FEEDBACK available:**
- Visual sound (flash, shake on correct/wrong)
- Animated counter (scrolling numbers)
- Progress bar
- Stars/points appearing
- Success message

### 🎯 HOW TO DESCRIBE YOUR DEMO:

1. **TITLE**: Catchy name
2. **CONCEPT**: What it teaches (e.g., "multiplication", "water cycle")
3. **VISUALIZATION**: Describe HOW you want it to look using palette elements
   - "I want a GRID of colored BLOCKS, 3 rows by 4 columns"
   - "I want a TIMELINE with 5 clickable POINTS"
   - "I want PARTICLES that move and group together"
4. **INTERACTION**: What the student can do using palette interactions
   - "The student uses a SLIDER to change the number of rows"
   - "The student CLICKS on blocks to color them"
   - "The student DRAGS characters onto the map"
5. **WOW FACTOR**: What makes it memorable
   - "When they find the answer, colored CONFETTI!"
   - "Numbers GROW with counter animation"

### 💡 EXAMPLES FOR YOUR STYLE (${maestroName}):

${getStyleExamples(maestroName)}

### ⚠️ IMPORTANT:
- Use terms from the PALETTE above so I understand what you want
- Be specific: "5 blocks in a row" is better than "some blocks"
- Indicate colors if important: "BLUE and RED blocks"
- Describe animation: "appear ONE BY ONE" vs "appear ALL TOGETHER"

If the student hasn't specified a topic, ask: "What would you like to explore together?"`;
}

/**
 * Get style-specific examples based on maestro
 */
export function getStyleExamples(maestroName: string | undefined): string {
  switch (maestroName) {
    case 'Euclide':
      return `- "GRID of blocks forming a RECTANGLE. SLIDER for rows and columns. AREA appears as animated LARGE NUMBER. When values change, blocks APPEAR ONE BY ONE."
- "CIRCLE dividing into SLICES (fractions). CLICK on each slice to COLOR it. Number of colored slices / total appears above."`;

    case 'Feynman':
      return `- "Colored PARTICLES BOUNCING in a container. SLIDER for TEMPERATURE. Hotter = FASTER and more CHAOTIC movement. Colors change from BLUE (cold) to RED (hot)!"
- "BALLOONS that MULTIPLY! Click the button and each balloon DUPLICATES with an animated POP. Count the balloons = multiplication!"`;

    case 'Erodoto':
      return `- "Horizontal TIMELINE with 5 POINTS. HOVER on each point to see the event. CLICK to expand the full story. Animated CHARACTER walking along the timeline."
- "Ancient MAP with changing BORDERS. SLIDER for year (500 BC → 2000 AD). Territories gradually change COLOR. CLICK on a region for info."`;

    case 'Darwin':
      return `- "Tree of life that GROWS. Each BRANCH is a species. CLICK on a branch to see characteristics. Species APPEAR one after another following evolution."
- "Environment with CREATURES that change. SLIDER for time (millions of years). Creatures gradually TRANSFORM. The fittest GLOW."`;

    case 'Curie':
      return `- "ATOMS that VIBRATE. Some are STABLE (green), others RADIOACTIVE (glowing). CLICK on a radioactive atom to see animated DECAY. Geiger COUNTER making TIC-TIC."
- "MOLECULES that COMBINE. DRAG molecules together. If reaction works = light FLASH and visible ENERGY released!"`;

    case 'Leonardo':
      return `- "MACHINE with GEARS. CLICK to start it. Gears ROTATE connected. Change the SPEED of one and see effects on others."
- "DRAWING sheet with PERSPECTIVE. DRAG the vanishing point. Guide lines UPDATE. POSITION objects and see how sizes change."`;

    case 'Álex Pina':
      return `- "HEIST PLANNING BOARD with PHASES. CLICK on each phase for Spanish vocabulary. Characters from 'la banda' appear. WORDS appear dramatically one by one."
- "MUSIC VIDEO with LYRICS. Song plays with KARAOKE style Spanish text. CLICK on words to see meaning. PRONUNCIATION button for each line!"
- "ESCAPE ROOM style game. SOLVE Spanish puzzles to unlock doors. TIMER adds suspense. Victory = CONFETTI and '¡Bella ciao!'"`;

    case 'Shakespeare':
      return `- "STAGE with CHARACTERS. DRAG words to complete the dialogue. Characters SPEAK when complete. Star RATING for pronunciation."
- "Word TREE that grows. Each BRANCH is a phrasal verb. CLICK to see meaning and example. QUIZ to match meanings!"`;

    default:
      return `- "GRID of colored elements. SLIDER to change quantity. Elements APPEAR with animation. CLICK to interact."
- "Interactive DIAGRAM. HOVER for info. CLICK to expand. SMOOTH transitions between states."
- "Navigable TIMELINE. DRAG to scroll. Clickable POINTS with informative POPUPS."`;
  }
}
