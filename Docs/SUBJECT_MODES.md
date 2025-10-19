# Subject Modes - Specialized Learning Features

## Overview

MirrorBuddy's Subject Modes provide specialized, in-depth learning features for specific subjects. Currently implemented modes are:

1. **Math Mode** - Advanced mathematics learning and problem-solving
2. **Italian Mode** - Comprehensive Italian language and literature study

## Math Mode

### Purpose
Provides specialized tools and AI assistance for mathematics study across all levels and topics.

### Components

#### 1. MathModeService
**File**: `MirrorBuddy/Features/SubjectModes/Math/MathModeService.swift`

Main orchestrator coordinating all math-specific functionality.

**Features**:
- Session management with topic tracking
- Difficulty adaptation based on performance
- Session statistics and progress tracking
- Integration with all math sub-services

**Usage**:
```swift
let mathMode = MathModeService.shared
mathMode.startSession(topic: .algebra, difficulty: .intermediate)
let formulas = mathMode.getCurrentTopicFormulas()
let problems = try await mathMode.generatePracticeProblems(count: 5)
```

#### 2. MathProblemSolver
**File**: `MirrorBuddy/Features/SubjectModes/Math/MathProblemSolver.swift`

Step-by-step problem solver with rule-based and AI-assisted solving.

**Features**:
- Solves linear equations, quadratic equations, arithmetic
- Provides step-by-step explanations
- Validates student answers
- Generates feedback

**Supported Problem Types**:
- Linear Equations
- Quadratic Equations
- Simplification
- Arithmetic
- Word Problems
- Graphing
- Geometry
- Trigonometry
- Calculus
- Statistics

**Usage**:
```swift
let solver = MathProblemSolver()
let problem = MathProblem(question: "2x + 5 = 13", type: .linearEquation, ...)
let solution = try await solver.solveProblem(problem)
let validation = solver.validateAnswer("4", for: problem)
```

#### 3. MathGraphRenderer
**File**: `MirrorBuddy/Features/SubjectModes/Math/MathGraphRenderer.swift`

Advanced graph rendering using Swift Charts framework.

**Features**:
- Function plotting (linear, quadratic, trigonometric, etc.)
- Multiple function overlay
- Critical points identification
- Numerical derivatives and integrals
- Interactive chart views

**Supported Functions**:
- Linear, Quadratic, Cubic, Polynomial
- Exponential, Logarithmic
- Trigonometric (sine, cosine, tangent)
- Absolute value, Square root
- Rational functions

**Usage**:
```swift
let renderer = MathGraphRenderer()
let function = MathFunction.quadratic(a: 1, b: -2, c: 1)
let data = renderer.generateFunctionData(function: function, xRange: -10...10)
let chartView = renderer.createFunctionChart(function: function)
```

#### 4. FormulaLibrary
**File**: `MirrorBuddy/Features/SubjectModes/Math/FormulaLibrary.swift`

Comprehensive collection of mathematical formulas organized by topic.

**Topics Covered**:
- Algebra (40+ formulas)
- Geometry (30+ formulas)
- Trigonometry (35+ formulas)
- Calculus (25+ formulas)
- Statistics (20+ formulas)
- Probability (15+ formulas)
- Linear Algebra (15+ formulas)
- Discrete Math (10+ formulas)

**Each Formula Includes**:
- LaTeX representation
- Plain language explanation
- Practical examples
- When to use guidance
- Common mistakes
- Relevant tags

**Usage**:
```swift
let library = FormulaLibrary()
let formulas = library.getFormulas(for: .algebra)
let results = library.searchFormulas(query: "quadratic")
let formula = library.getFormula(id: "alg_quadratic")
```

#### 5. MathPracticeGenerator
**File**: `MirrorBuddy/Features/SubjectModes/Math/MathPracticeGenerator.swift`

AI-powered practice problem generation with difficulty adaptation.

**Features**:
- Topic-specific problem generation
- Difficulty-appropriate problems
- Varied problem types
- Hints for each problem
- Optional AI enhancement

**Usage**:
```swift
let generator = MathPracticeGenerator()
let problems = try await generator.generateProblems(
    topic: .algebra,
    difficulty: .intermediate,
    count: 5
)
```

#### 6. MathCalculatorView
**File**: `MirrorBuddy/Features/SubjectModes/Math/MathCalculatorView.swift`

Advanced calculator with multiple modes.

**Modes**:
- Basic: Standard operations
- Scientific: Trigonometry, logarithms, exponentials
- Graphing: Function plotting integration
- Statistics: Statistical calculations

**Features**:
- History tracking
- Multiple operations
- Scientific functions
- Clean SwiftUI interface

#### 7. MathPrompts
**File**: `MirrorBuddy/Features/SubjectModes/Math/MathPrompts.swift`

Specialized AI prompts for math tutoring.

**Prompt Types**:
- Topic-specific teaching
- Problem-solving guidance
- Concept explanations
- Error analysis
- Study strategies
- Test preparation
- Motivational support

**Usage**:
```swift
let prompts = MathPrompts()
let prompt = prompts.getTopicPrompt(for: .calculus, difficulty: .advanced)
let problemPrompt = prompts.getProblemSolvingPrompt(problem: "...", topic: .algebra)
```

#### 8. MathMindMapTemplate
**File**: `MirrorBuddy/Features/SubjectModes/Math/MathMindMapTemplate.swift`

Pre-built mind map templates for organizing math concepts.

**Features**:
- Topic-specific templates
- Hierarchical concept organization
- Visual relationships
- Study notes integration

**Templates Available**:
- Algebra
- Geometry
- Trigonometry
- Calculus
- Statistics
- Probability
- Linear Algebra
- Discrete Math

---

## Italian Mode

### Purpose
Provides comprehensive tools for Italian language learning and literature study.

### Components

#### 1. ItalianModeService
**File**: `MirrorBuddy/Features/SubjectModes/Italian/ItalianModeService.swift`

Main orchestrator for all Italian learning features.

**Features**:
- Session management
- Vocabulary progress tracking
- Grammar level adaptation
- Integration with all Italian sub-services

**Usage**:
```swift
let italianMode = ItalianModeService.shared
italianMode.startSession(topic: .grammar, level: .intermediate)
let vocab = italianMode.getCurrentTopicVocabulary()
let rules = italianMode.getCurrentLevelGrammar()
```

#### 2. ItalianGrammarHelper
**File**: `MirrorBuddy/Features/SubjectModes/Italian/ItalianGrammarHelper.swift`

Comprehensive Italian grammar explanation system.

**Features**:
- 50+ grammar rules across all levels
- Detailed explanations with examples
- Sentence analysis and error detection
- Common mistakes identification
- Practice exercises

**Grammar Categories**:
- Articles (definite, indefinite, articulated prepositions)
- Pronouns (subject, object, reflexive, possessive)
- Verb Tenses (all Italian tenses and moods)
- Adjectives (agreement, position, special forms)
- Prepositions (simple and articulated)
- Sentence Structure (word order, negation)
- Conditionals (all three types)
- Subjunctive (when and how to use)

**Usage**:
```swift
let helper = ItalianGrammarHelper()
let rules = helper.getRules(for: .intermediate)
let analysis = helper.analyzeSentence("Il libro è interessante.")
let explanation = helper.getExplanation(for: .subjunctive)
```

#### 3. ItalianConjugationTables
**File**: `MirrorBuddy/Features/SubjectModes/Italian/ItalianConjugationTables.swift`

Complete verb conjugation system covering all Italian tenses.

**Tenses Supported**:
1. Presente Indicativo
2. Imperfetto Indicativo
3. Passato Remoto
4. Futuro Semplice
5. Condizionale Presente
6. Presente Congiuntivo
7. Imperfetto Congiuntivo
8. Imperativo

**Verb Types**:
- Regular -ARE verbs
- Regular -ERE verbs
- Regular -IRE verbs
- 13+ common irregular verbs (essere, avere, fare, andare, venire, etc.)

**Additional Forms**:
- Participio Passato
- Gerundio

**Usage**:
```swift
let tables = ItalianConjugationTables()
let conjugation = tables.getConjugation(verb: "parlare")
let futuro = tables.getConjugationForTense(verb: "essere", tense: .futuroSemplice)
```

#### 4. ItalianLiteratureSummarizer
**File**: `MirrorBuddy/Features/SubjectModes/Italian/ItalianLiteratureSummarizer.swift`

AI-powered Italian literature analysis and summarization.

**Features**:
- Work summaries (brief, medium, detailed)
- Theme analysis
- Character analysis
- Historical context
- Literary significance

**Periods Covered**:
- Medieval, Renaissance, Baroque
- Enlightenment, Romanticism
- Realism, Verismo
- Modernism, Contemporary

**Usage**:
```swift
let summarizer = ItalianLiteratureSummarizer()
let summary = try await summarizer.summarize(work: literaryWork, depth: .medium, aiClient: gemini)
let themes = try await summarizer.analyzeThemes(work, aiClient: gemini)
let context = summarizer.getHistoricalContext(work)
```

#### 5. ItalianVocabularyBuilder
**File**: `MirrorBuddy/Features/SubjectModes/Italian/ItalianVocabularyBuilder.swift`

Vocabulary building with spaced repetition support.

**Features**:
- 100+ essential Italian words
- Organized by level (beginner, intermediate, advanced)
- Categorized by type (nouns, verbs, adjectives, etc.)
- Example sentences for each word
- Grammar notes
- Search functionality

**Categories**:
- Nouns, Verbs, Adjectives, Adverbs
- Pronouns, Prepositions, Conjunctions
- Grammar Terms, Literary Terms, Idioms

**Usage**:
```swift
let builder = ItalianVocabularyBuilder()
let words = builder.getWords(for: .vocabulary)
let beginnerWords = builder.getWordsByLevel(.beginner)
let verbs = builder.getWordsByCategory(.verbs)
```

#### 6. ItalianReadingAssistant
**File**: `MirrorBuddy/Features/SubjectModes/Italian/ItalianReadingAssistant.swift`

Reading comprehension assistance for Italian texts.

**Features**:
- Text difficulty analysis
- Key vocabulary extraction
- Comprehension question generation
- Reading strategy suggestions
- Estimated reading time

**Difficulty Factors**:
- Word count and sentence structure
- Vocabulary complexity
- Subordinate clauses
- Average word length

**Usage**:
```swift
let assistant = ItalianReadingAssistant()
let difficulty = assistant.analyzeTextDifficulty(text)
let vocabulary = assistant.extractKeyVocabulary(text)
let questions = assistant.generateComprehensionQuestions(text, count: 5)
let strategies = assistant.suggestReadingStrategies(for: difficulty)
```

#### 7. ItalianAudioReader
**File**: `MirrorBuddy/Features/SubjectModes/Italian/ItalianAudioReader.swift`

Text-to-speech audio reading using AVSpeechSynthesizer.

**Features**:
- Italian text-to-speech
- Playback control (play, pause, resume, stop)
- Adjustable reading speed
- Voice selection (default, male, female)
- Sentence-by-sentence reading
- Progress tracking

**Usage**:
```swift
let reader = ItalianAudioReader()
reader.read("Ciao, come stai?", rate: 0.5, voice: .default)
reader.pause()
reader.resume()
reader.readSentenceBySentence(text, pauseDuration: 0.5)
```

#### 8. ItalianPrompts
**File**: `MirrorBuddy/Features/SubjectModes/Italian/ItalianPrompts.swift`

AI prompts specialized for Italian language learning.

**Prompt Categories**:
- Grammar explanations
- Vocabulary teaching
- Conversation starters
- Writing feedback
- Literature analysis
- Conjugation practice

**All prompts are in Italian** to provide immersive learning experience.

**Usage**:
```swift
let prompts = ItalianPrompts()
let prompt = prompts.getTopicPrompt(for: .grammar, level: .intermediate)
let grammarPrompt = prompts.getGrammarExplanationPrompt(concept: "congiuntivo", level: .advanced)
let conversationPrompt = prompts.getConversationPrompt(topic: "cibo")
```

#### 9. ItalianMindMapTemplate
**File**: `MirrorBuddy/Features/SubjectModes/Italian/ItalianMindMapTemplate.swift`

Mind map templates for organizing Italian learning.

**Templates Available**:
- Grammar (verbs, articles, pronouns, prepositions)
- Vocabulary (daily life, actions, descriptions)
- Literature (periods, genres, themes)
- Conversation (greetings, expressions)
- Writing, Reading Comprehension

**Usage**:
```swift
let templateGenerator = ItalianMindMapTemplate()
let template = templateGenerator.generateTemplate(for: .grammar)
```

---

## Integration with Existing Systems

### AI Integration
Both modes integrate seamlessly with:
- **GeminiClient**: For AI-powered explanations and analysis
- **OpenAIClient**: Alternative AI provider
- **StudyCoachPersonality**: Personality-driven tutoring

### UI Integration
Components provide:
- SwiftUI views (Calculator, Charts)
- Data models for UI display
- Progress tracking for dashboards

### Testing
Comprehensive test suites ensure:
- Correctness of algorithms (math solving, conjugations)
- Data integrity
- AI prompt effectiveness
- User experience quality

---

## Future Enhancements

### Math Mode
- Symbolic math solver
- 3D graph rendering
- Interactive geometry tools
- More problem types (differential equations, etc.)

### Italian Mode
- Speech recognition for pronunciation practice
- Interactive conversation simulator
- More irregular verb conjugations
- Expanded literature database
- Regional dialect support

### Additional Modes
- English Mode
- Science Mode (Physics, Chemistry, Biology)
- History Mode
- Programming Mode

---

## Technical Architecture

### Design Patterns
- **Singleton** for service managers
- **Actor** for thread-safe operations
- **Protocol-Oriented** for extensibility
- **Dependency Injection** for testing

### Performance Considerations
- Async/await for non-blocking operations
- Efficient data structures
- Lazy loading where appropriate
- Caching for frequently accessed data

### Code Quality
- Comprehensive documentation
- Unit test coverage > 80%
- SwiftLint compliance
- Actor isolation for concurrency safety

---

## Developer Guide

### Adding a New Subject Mode

1. **Create directory structure**:
   ```
   MirrorBuddy/Features/SubjectModes/[Subject]/
   ```

2. **Implement core service**:
   ```swift
   @MainActor
   final class [Subject]ModeService {
       static let shared = [Subject]ModeService()
       // ... implementation
   }
   ```

3. **Add specialized components** as needed

4. **Create test suite**:
   ```
   MirrorBuddyTests/SubjectModes/[Subject]ModeTests.swift
   ```

5. **Update documentation**

### Best Practices
- Use `@MainActor` for UI-related classes
- Use `actor` for data processing
- Provide comprehensive examples
- Include error handling
- Write descriptive documentation
- Follow existing patterns

---

## License
Part of MirrorBuddy iOS Application
