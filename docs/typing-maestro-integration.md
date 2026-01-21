# Maestro Integration - Implementation Notes

## API Endpoints Needed

### POST /api/typing/maestro/lessons
Create custom lessons for a student based on Maestro analysis.

**Request:**
```json
{
  "studentId": "string",
  "maestroId": "string",
  "lessonTitle": "string",
  "targetWords": ["word1", "word2", ...],
  "difficulty": "beginner" | "intermediate" | "advanced",
  "focus": "speed" | "accuracy" | "specific-keys"
}
```

**Response:**
```json
{
  "success": true,
  "lessonId": "string"
}
```

### GET /api/typing/maestro/recommendations
Get personalized lesson recommendations for a student.

**Query params:** `studentId`, `stats` (JSON encoded)

**Response:**
```json
{
  "success": true,
  "recommendations": [
    {
      "lessonId": "string",
      "reason": "string",
      "priority": "high" | "medium" | "low"
    }
  ]
}
```

### GET /api/typing/maestro/progress
Get typing progress for Maestro context.

**Query params:** `studentId`

**Response:**
```json
{
  "success": true,
  "progress": {
    "stats": { ... },
    "completedLessons": [...],
    "weakAreas": ["key-x", "key-y"],
    "strongAreas": ["key-a", "key-b"]
  }
}
```

## Integration with Conversation Context

The typing progress should be included in the conversation context when a Maestro analyzes student performance.

**Context format:**
```json
{
  "typing": {
    "wpm": 25,
    "accuracy": 92,
    "streak": 5,
    "completedLessons": 10,
    "currentLevel": "intermediate"
  }
}
```

## Parent Dashboard Reports

Typing progress should be available in the parent dashboard with:
- Weekly WPM chart
- Weekly accuracy chart
- Streak visualization
- Areas needing improvement
- Recent lesson completions
