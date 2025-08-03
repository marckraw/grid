---
sidebar_position: 2
---

# createMTMService 🚧

:::warning Beta Feature
The MTM service is currently in beta. APIs may change in future releases.
:::

Creates a Mid-Term Memory service for daily summarization and fact extraction.

## Overview

`createMTMService` processes STM events to create daily summaries with extracted facts, statistics, and highlights. It provides both structured JSON storage for queries and human-readable Markdown for context.

## Import

```typescript
import { createMTMService } from "@mrck-labs/grid-core";
```

## Function Signature

```typescript
function createMTMService(deps: {
  stm: STMService;
  llmService?: LLMService;
  config?: MTMConfig;
}): MTMService
```

## Parameters

### deps
- **Type**: `Object`
- **Properties**:
  - `stm` (required)
    - **Type**: `STMService`
    - **Description**: STM service instance for reading events
  - `llmService` (optional)
    - **Type**: `LLMService`
    - **Description**: LLM service for enhanced fact extraction
  - `config` (optional)
    - **Type**: `MTMConfig`
    - **Properties**:
      - `storagePath`: Directory for summaries (default: './memory/mtm')

## Return Type: MTMService

### Methods

#### summarizeDay
```typescript
summarizeDay(date?: Date): Promise<MTMSummary>
```
Creates a summary for the specified day, extracting facts and generating both JSON and Markdown files.

**Parameters:**
- `date`: Date to summarize (default: today)

**Returns:** MTMSummary object

**Example:**
```typescript
const summary = await mtm.summarizeDay(); // Today
const yesterday = await mtm.summarizeDay(
  new Date(Date.now() - 24 * 60 * 60 * 1000)
);
```

#### getSummary
```typescript
getSummary(date: Date): Promise<MTMSummary | null>
```
Retrieves the JSON summary for a specific date.

**Parameters:**
- `date`: Date to retrieve

**Returns:** Summary object or null if not found

**Example:**
```typescript
const summary = await mtm.getSummary(new Date('2025-01-15'));
```

#### getSummaryMarkdown
```typescript
getSummaryMarkdown(date: Date): Promise<string | null>
```
Retrieves the Markdown summary for a specific date.

**Parameters:**
- `date`: Date to retrieve

**Returns:** Markdown content or null if not found

**Example:**
```typescript
const markdown = await mtm.getSummaryMarkdown(new Date());
console.log(markdown); // Human-readable summary
```

#### listSummaries
```typescript
listSummaries(): Promise<string[]>
```
Lists all available summary dates.

**Returns:** Array of date strings (YYYY-MM-DD)

**Example:**
```typescript
const dates = await mtm.listSummaries();
// ['2025-01-13', '2025-01-14', '2025-01-15']
```

#### searchFacts
```typescript
searchFacts(query: string): Promise<MTMSummary[]>
```
Searches for facts across all summaries.

**Parameters:**
- `query`: Search query

**Returns:** Array of summaries containing matching facts

**Example:**
```typescript
const results = await mtm.searchFacts('user preferences');
```

#### getStoragePath
```typescript
getStoragePath(): string
```
Returns the storage directory path.

## Data Structures

### MTMSummary
```typescript
interface MTMSummary {
  date: string;                    // YYYY-MM-DD
  extractedFacts: {
    userName?: string;
    userPreferences?: string[];
    keyTopics?: string[];
    importantEvents?: string[];
    relationships?: Record<string, string>;
    [key: string]: any;           // Extensible
  };
  conversations: {
    count: number;
    totalMessages: number;
    avgLength: number;
    topics: string[];
  };
  eventStatistics: Record<string, number>;
  highlights: string[];
  createdAt: string;
}
```

## Fact Extraction

MTM uses two methods for fact extraction:

### 1. Pattern-Based Extraction
Uses regex patterns for common facts:
```typescript
// Extracts: "My name is John"
const namePatterns = [
  /my name is (\w+)/i,
  /i'?m (\w+)/i,
  /call me (\w+)/i
];
```

### 2. LLM-Based Extraction
When LLM service is provided, uses AI for deeper understanding:
```typescript
const mtm = createMTMService({
  stm,
  llmService: baseLLMService(),
  config: { storagePath: './memory/mtm' }
});
```

## Storage Format

### JSON Summary
```json
{
  "date": "2025-01-15",
  "extractedFacts": {
    "userName": "Marcin",
    "userPreferences": ["likes running in mountains"],
    "keyTopics": ["memory system", "Grid framework"]
  },
  "conversations": {
    "count": 3,
    "totalMessages": 45,
    "avgLength": 120,
    "topics": ["memory system", "Grid framework"]
  },
  "eventStatistics": {
    "conversation.started": 3,
    "conversation.user.message": 22,
    "conversation.agent.response": 23
  },
  "highlights": [
    "Learned user's name: Marcin",
    "Had 3 conversations",
    "Discussed: memory system, Grid framework"
  ],
  "createdAt": "2025-01-15T23:59:59.000Z"
}
```

### Markdown Summary
```markdown
# Daily Memory Summary - 2025-01-15

*Generated at: 1/15/2025, 11:59:59 PM*

## User Profile

- **Name**: Marcin

### Preferences
- likes running in mountains

## Conversation Overview

- **Total Conversations**: 3
- **Messages Exchanged**: 45
- **Average Message Length**: 120 characters

### Topics Discussed
- memory system
- Grid framework

## Key Highlights

- Learned user's name: Marcin
- Had 3 conversations
- Discussed: memory system, Grid framework

## Conversation Samples

### Session at 10:30:15 AM

**User**: Hey, my name is Marcin

**Assistant**: Nice to meet you, Marcin! How can I help you today?

[... more conversation samples ...]

## Event Statistics

| Event Type | Count |
|------------|-------|
| conversation.user.message | 22 |
| conversation.agent.response | 23 |
| conversation.started | 3 |
```

## Usage Examples

### Basic Usage
```typescript
const mtm = createMTMService({
  stm: mySTMService
});

// Create today's summary
const summary = await mtm.summarizeDay();

// View available summaries
const dates = await mtm.listSummaries();
```

### With LLM Enhancement
```typescript
const mtm = createMTMService({
  stm,
  llmService: baseLLMService({
    model: 'gpt-4'
  }),
  config: {
    storagePath: './data/memory/mtm'
  }
});

// LLM will extract more nuanced facts
const summary = await mtm.summarizeDay();
```

### Terminal Agent Integration
```typescript
// In conversation command
if (message === '/memory summarize') {
  const summary = await mtm.summarizeDay();
  console.log(`Summary created for ${summary.date}`);
  console.log(`Found facts:`, summary.extractedFacts);
}
```

## Best Practices

1. **Daily Summaries**: Run summarization at end of day
2. **LLM Service**: Use LLM for better fact extraction
3. **Search Optimization**: Use specific keywords for searchFacts
4. **Storage Management**: Archive old summaries periodically
5. **Fact Validation**: Review extracted facts for accuracy

## Performance Notes

- Summarization processes all events for the day
- LLM calls add latency but improve quality
- File I/O for each summary operation
- Linear search across all summaries

## Future Enhancements

- Configurable fact extraction patterns
- Weekly/monthly rollups
- Fact confidence scoring
- Incremental summarization
- Database storage adapters

## Related

- [STM Service](/docs/sdk-reference/services/memory/stm-service) - Event logging
- [Memory Types](/docs/sdk-reference/services/memory/memory-types) - Type definitions
- [Memory Integration Guide](/docs/guides/memory-integration) - Implementation guide