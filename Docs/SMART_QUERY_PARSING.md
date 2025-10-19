# Smart Material Query Parsing

**Task 115**: AI-Powered Context Understanding for Material Queries

## Overview

The Smart Material Query Parsing system provides natural language understanding for material searches in MirrorBuddy. Users can search for materials using conversational queries in both English and Italian, and the system intelligently detects intent, extracts filters, and returns relevant results.

## Architecture

### Components

1. **SmartQueryParser** (`SmartQueryParser.swift`)
   - AI-powered natural language query parser
   - Intent detection engine
   - Filter extraction system
   - Context analyzer
   - Confidence scoring

2. **MaterialQueryParser** (`MaterialQueryParser.swift`)
   - Enhanced with natural language capabilities
   - Integration point with SmartQueryParser
   - Backwards compatible with existing UUID/title queries
   - Material filtering and sorting logic

## Supported Query Patterns

### 1. Difficulty-Based Queries

Find materials based on perceived or actual difficulty:

**English Examples:**
- "materials I struggled with"
- "difficult math materials"
- "hard physics chapters"
- "easy materials"
- "challenging content"

**Italian Examples:**
- "materiali con cui ho fatica"
- "materiali difficili di matematica"
- "capitoli difficili di fisica"
- "materiali facili"
- "contenuti difficili"

**Intent**: `.difficult(threshold: 0.6 or 0.7)`

### 2. Time-Based Queries

Find materials within specific time frames:

**English Examples:**
- "recent materials"
- "latest math homework"
- "materials from today"
- "materials from this week"
- "last month's content"

**Italian Examples:**
- "materiali recenti"
- "ultimi compiti di matematica"
- "materiali di oggi"
- "materiali di questa settimana"
- "contenuti del mese scorso"

**Intent**: `.recent(timeframe: .today/.lastWeek/.lastMonth)`

### 3. Subject-Based Queries

Filter materials by subject:

**Supported Subjects:**
- Mathematics: "math", "matematica"
- Physics: "physics", "fisica"
- Italian: "italian", "italiano"
- English: "english", "inglese"
- History: "history", "storia"
- Geography: "geography", "geografia"
- Science: "science", "scienze", "scienze naturali"
- Civic Education: "civic", "educazione civica"
- Religion: "religion", "religione"
- PE: "pe", "scienze motorie"
- Support: "support", "sostegno"

**Examples:**
- "math materials"
- "materiali di fisica"
- "Italian homework"
- "compiti di matematica"

**Filter**: `.subject(subjectName)`

### 4. Topic-Based Search

Search for specific topics or concepts:

**English Examples:**
- "materials about World War 2"
- "chapters on calculus"
- "lessons about verbs"
- "content on photosynthesis"

**Italian Examples:**
- "materiali su Seconda Guerra Mondiale"
- "capitoli sul calcolo"
- "lezioni sui verbi"
- "contenuti sulla fotosintesi"

**Intent**: `.topicSearch(topic: "World War 2")`

### 5. Review Status Queries

Find materials based on review status:

**English Examples:**
- "materials I haven't reviewed"
- "not studied materials"
- "materials to review"
- "reviewed materials"

**Italian Examples:**
- "materiali non rivisti"
- "materiali non studiati"
- "materiali da ripassare"
- "materiali studiati"

**Filter**: `.reviewed(false/true)`

### 6. Recommendation Queries

Get AI-powered recommendations:

**English Examples:**
- "recommend materials for exam"
- "suggest what to study next"
- "what should I review?"
- "materials for test preparation"

**Italian Examples:**
- "raccomanda materiali per l'esame"
- "consiglia cosa studiare"
- "cosa dovrei ripassare?"
- "materiali per preparazione verifica"

**Intent**: `.recommend(based: .performance/.upcoming/.weak/.interests)`

### 7. Bloom's Taxonomy Level Queries

Filter by cognitive complexity:

**Remember Level:**
- "materials to memorize"
- "content to remember"
- "materiali da memorizzare"
- "contenuti da ricordare"

**Understand Level:**
- "materials to understand"
- "concepts to explain"
- "materiali da capire"
- "concetti da spiegare"

**Apply Level:**
- "problems to solve"
- "materials to apply"
- "problemi da risolvere"
- "materiali da applicare"

**Analyze Level:**
- "materials to analyze"
- "materiali da analizzare"

**Evaluate Level:**
- "materials to evaluate"
- "materiali da valutare"

**Create Level:**
- "materials to create"
- "materiali da creare"

**Filter**: `.bloomLevel(.remember/.understand/.apply/.analyze/.evaluate/.create)`

### 8. Combined Queries

Mix multiple criteria for precise results:

**Examples:**
- "recent difficult math materials"
- "easy Italian homework from last week"
- "materials I haven't reviewed about physics"
- "recommend recent materials about calculus"
- "difficult physics materials from today"

**Italian Examples:**
- "materiali difficili di matematica recenti"
- "compiti facili di italiano della settimana scorsa"
- "materiali non studiati di fisica"
- "raccomanda materiali recenti sul calcolo"
- "materiali difficili di fisica di oggi"

### 9. Mastery Status Queries

Find materials based on mastery level:

**Examples:**
- "materials I've mastered"
- "content I know well"
- "materials needing practice"
- "materiali padroneggiati"
- "contenuti che so bene"
- "materiali da esercitare"

**Filter**: `.mastered(true/false)`

### 10. Processing Status Queries

Filter by processing state:

**Examples:**
- "pending materials"
- "completed materials"
- "failed materials"
- "materiali in attesa"
- "materiali completati"
- "materiali falliti"

**Filter**: `.processingStatus(.pending/.processing/.completed/.failed)`

## Query Intent Types

### 1. Search Intent
Keyword-based search across material content.

**Example**: "calculus materials"
**Result**: Materials containing "calculus" in title, summary, or content

### 2. Filter Intent
Narrow results by specific criteria.

**Example**: "math materials from today"
**Result**: Materials with subject=math AND created today

### 3. Recommend Intent
AI-powered suggestions based on context.

**Example**: "what should I study for the exam?"
**Result**: Materials ranked by relevance to upcoming assessments

### 4. Recent Intent
Time-based filtering.

**Example**: "recent materials"
**Result**: Materials from last week, sorted newest first

### 5. Difficult Intent
Find challenging content.

**Example**: "materials I struggled with"
**Result**: Materials with low performance scores (when available)

### 6. Needs Review Intent
Find materials requiring attention.

**Example**: "materials to review"
**Result**: Unreviewed or not-recently-accessed materials

### 7. Topic Search Intent
Concept-specific search.

**Example**: "materials about World War 2"
**Result**: Materials with "World War 2" in content, ranked by relevance

## Sort Orders

Results can be sorted by:

1. **Date Descending**: Newest first (default for recent queries)
2. **Date Ascending**: Oldest first (default for review queries)
3. **Relevance Descending**: Most relevant first (default for search/recommendations)
4. **Title Ascending**: Alphabetical order
5. **Difficulty Descending**: Hardest first (when data available)
6. **Difficulty Ascending**: Easiest first (when data available)

## Relevance Scoring

Materials are scored for relevance based on:

- **Title Match**: +10 points per keyword
- **Summary Match**: +5 points per keyword
- **Content Match**: +2 points per keyword
- **Recency Bonus**: +3 points if created within last 7 days

## Context Extraction

The parser extracts additional context:

- **Language Detection**: English vs Italian
- **Numeric Limits**: "last 5 materials" → limit: 5
- **Urgency**: "urgent", "now" → urgent: true
- **Homework Context**: "homework", "compiti" → isHomework: true

## Confidence Scoring

Each parsed query receives a confidence score (0.0-1.0):

- **High Confidence (0.8-1.0)**: Clear intent with filters
- **Medium Confidence (0.5-0.8)**: Ambiguous but parseable
- **Low Confidence (0.0-0.5)**: Very short or unclear query

Factors affecting confidence:
- Query length (< 2 words: -0.2)
- Empty keywords: -0.3
- Presence of filters: +0.1

## Usage Examples

### Swift Code Integration

```swift
// Basic natural language query
let materials = await MaterialQueryParser.findMaterialsWithNaturalLanguage(
    query: "recent difficult math materials",
    in: allMaterials,
    subjects: allSubjects
)

// Direct SmartQueryParser usage
let parsedQuery = try await SmartQueryParser.shared.parse("materials about calculus")
print("Intent: \(parsedQuery.intent)")
print("Filters: \(parsedQuery.filters)")
print("Sort: \(parsedQuery.sortOrder)")
print("Confidence: \(parsedQuery.confidence)")
```

### Voice Command Integration

The system integrates with UnifiedVoiceManager for voice-based queries:

```swift
// User says: "Show me recent physics materials"
// UnifiedVoiceManager detects command intent
// MaterialQueryParser processes natural language query
// Results displayed in UI
```

## Multi-Language Support

### Supported Languages

1. **English**: Full support
2. **Italian**: Full support with synonym detection

### Language Detection

The system automatically detects language based on:
- Italian-specific characters (à, è, é, ì, ò, ù)
- Subject name keywords ("matematica", "fisica", etc.)
- Common Italian words ("materiali", "compiti", "recenti")

### Synonym Support

The parser understands synonyms across languages:

| English | Italian | Synonyms |
|---------|---------|----------|
| difficult | difficile | hard, challenging, complesso |
| easy | facile | simple, basic, semplice |
| recent | recente | latest, new, ultimo, nuovo |
| review | ripassare | study, studied, studiato |
| recommend | raccomandare | suggest, consiglia |

## Fuzzy Matching

The system supports fuzzy matching for:

- **Subject Names**: "matematica" matches "math"
- **Abbreviations**: "WW2" matches "World War 2"
- **Partial Words**: "calc" matches "calculus"
- **Case Insensitivity**: "MATH" matches "math"

## Future Enhancements

### Planned Features

1. **Performance Integration**: Use actual quiz/flashcard scores for difficulty detection
2. **Mastery Tracking**: Filter by measured mastery levels
3. **Semantic Search**: Vector embeddings for conceptual similarity
4. **Query History**: Learn from user's search patterns
5. **Contextual Suggestions**: Auto-suggest related searches
6. **Advanced Bloom's Taxonomy**: Detect cognitive levels from content analysis
7. **Conversational Queries**: Multi-turn query refinement
   - "Show me more like this"
   - "What about easier ones?"
   - "Any from last month?"

### Extensibility Points

- Custom subject mappings
- Additional language support
- Domain-specific query patterns
- Integration with external knowledge bases

## Error Handling

The parser gracefully handles edge cases:

- **Empty Query**: Falls back to simple search
- **Unknown Subject**: Searches across all subjects
- **Contradictory Filters**: Uses most specific filter
- **Invalid Dates**: Defaults to reasonable time range
- **No Results**: Returns empty array (no errors thrown)

## Performance Considerations

- **Actor Isolation**: SmartQueryParser is an actor for thread safety
- **Async Processing**: All parsing is non-blocking
- **Efficient Filtering**: Multiple passes avoided when possible
- **Lazy Evaluation**: Filters applied progressively
- **Score Caching**: Relevance scores cached during sorting

## Testing

### Test Query Patterns

```swift
// Difficulty queries
"materials I struggled with in math"
"difficult physics chapters"
"easy Italian materials"

// Time queries
"recent math homework"
"materials from today"
"last week's physics content"

// Combined queries
"recent difficult math materials"
"easy Italian homework from last week"
"materials I haven't reviewed about physics"

// Recommendations
"recommend materials for exam prep"
"what should I study next?"
"suggest physics content"

// Multi-language
"mostra materiali di matematica difficili"
"trova compiti recenti di italiano"
"materiali non studiati di fisica"
```

### Edge Cases

```swift
// Empty query
""

// Single word
"math"

// Unknown subject
"materials about quantum mechanics"

// Contradictory filters
"easy difficult materials"

// Very long query
"show me all the materials that I created last week about mathematics that I haven't reviewed yet and are difficult"
```

## Integration Points

### 1. MaterialProcessingPipeline
Smart queries can trigger processing for unprocessed materials.

### 2. UnifiedVoiceManager
Voice commands seamlessly converted to material queries.

### 3. Dashboard Views
Natural language search bar for quick material access.

### 4. Homework Help
Context-aware material suggestions during Q&A.

## API Reference

### SmartQueryParser

```swift
actor SmartQueryParser {
    static let shared: SmartQueryParser

    func parse(_ query: String) async throws -> ParsedQuery
}
```

### MaterialQueryParser

```swift
struct MaterialQueryParser {
    static func findMaterial(
        query: String,
        in materials: [Material],
        subjects: [SubjectEntity]
    ) -> UUID?

    static func findMaterialsWithNaturalLanguage(
        query: String,
        in materials: [Material],
        subjects: [SubjectEntity]
    ) async -> [Material]
}
```

### ParsedQuery

```swift
struct ParsedQuery {
    var intent: QueryIntent
    var filters: [QueryFilter]
    var sortOrder: SortOrder
    var context: [String: Any]
    var confidence: Double
}
```

## Conclusion

The Smart Material Query Parsing system transforms MirrorBuddy's material search from simple keyword matching to intelligent, context-aware natural language understanding. Users can express their needs conversationally in English or Italian, and the system intelligently interprets intent, applies appropriate filters, and returns relevant results sorted by the most useful criteria.

---

**Implementation Date**: January 2025
**Task**: #115
**Version**: 1.0
**Status**: Complete
