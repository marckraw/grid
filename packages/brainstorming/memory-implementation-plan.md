# Grid Memory System Implementation Plan

## Overview
Implement a human-like memory system for Grid agents with three layers:
- **STM (Short-Term Memory)**: Raw event logging (hours-days)
- **MTM (Mid-Term Memory)**: Daily/weekly summaries (weeks-months)  
- **LTM (Long-Term Memory)**: Patterns and knowledge (permanent)

**Testing Ground**: All phases will be tested through the `terminal-agent` CLI app with a new command: `conversation-with-memory`

## Implementation Phases

### Phase 0: Basic STM (Start Here!)

#### Phase 0.1: Simple File Logging ✅
- [x] Create `createSimpleSTMService` with just `log()` method in core package
- [x] Log events to `./memory/stm.jsonl` file
- [x] Add `conversation-with-memory` command to terminal-agent
- [x] Test by having a conversation and checking the log file

#### Phase 0.2: Hook into Existing System ✅
- [x] Add STM logging to ConversationHistory handlers
- [x] Log all messages and tool calls automatically
- [x] Update `conversation-with-memory` command to use handlers
- [x] Verify events are being written during conversations

#### Phase 0.3: Basic Retrieval ✅
- [x] Add `getRecent(hours)` method to STM service
- [x] Add `getByType(type, limit)` method for filtering
- [x] Filter events by timestamp
- [x] Add `clear()` method for testing
- [x] Update command to show memory stats with `/memory` command
- [x] Add `/memory recent` to show recent messages
- [x] Add `/memory responses` to show agent responses
- [x] Add `/memory clear` to clear all memory

#### Phase 0.4: Memory Tool ✅
- [x] Create memory tools using Vercel AI SDK format
  - [x] `search_recent_memory` - Search through recent events
  - [x] `recall_conversation_history` - Recall previous messages
  - [x] `get_memory_statistics` - Get memory usage stats
  - [x] `search_memory_by_tags` - Search by tags
- [x] Add tools to `conversation-with-memory` agent
- [x] Test by asking agent "what did we talk about earlier?"
- [x] Agent can now query its own memory!

### Phase 1: MTM Summarization

#### Phase 1.1: Daily Summaries ✅
- [x] Create `createMTMService` with `summarizeDay()` method
- [x] Extract facts from conversations (name, preferences, topics)
- [x] Count events by type and create summaries
- [x] Save summaries to `./memory/mtm/YYYY-MM-DD.json`
- [x] Add `/memory summarize` command to trigger summarization
- [x] Add `/memory summaries` to view available summaries
- [x] Create `recall_facts` tool for agents to search extracted facts
- [x] Support both pattern-based and LLM-based fact extraction
- [x] **Hybrid Storage**: JSON for structured queries + Markdown for LLM context
- [x] Add `getSummaryMarkdown()` method for retrieving human-readable summaries
- [x] Add `/memory view [date]` command to display markdown summaries
- [x] Implement `generateMarkdownSummary()` with conversation samples

#### Phase 1.2: Memory-Aware Handlers
- [ ] Create `createMemoryHandlers` with beforeAct/afterResponse
- [ ] Detect temporal keywords (yesterday, last week, etc.)
- [ ] Update `conversation-with-memory` to use memory handlers
- [ ] Test: "What did we discuss yesterday?" should work

### Phase 2: Memory Primitive

#### Phase 2.1: Compose STM + MTM
- [ ] Create `createMemoryPrimitive` combining both services
- [ ] Add cross-layer `search()` method
- [ ] Update terminal-agent command to use memory primitive
- [ ] Add `--search <query>` flag to search memories

#### Phase 2.2: Cascading Memory Retrieval
- [ ] Implement hierarchical search strategy:
  - Start with LTM (when available) for patterns/knowledge
  - Fall back to MTM for recent facts and summaries
  - Extend to STM for detailed context when needed
- [ ] Create `searchWithFallback()` method that:
  - Returns quick results from efficient layers
  - Optionally enriches with deeper context
  - Tracks which layers were searched
- [ ] Add confidence scoring for memory results
- [ ] Implement progressive enrichment:
  - Quick answer first (e.g., "User's name is Marcin")
  - Then add context (e.g., "They introduced themselves 3 days ago")
  - Optional deep dive (e.g., exact conversation transcript)
- [ ] Test: Memory tools should use cascading search automatically

#### Phase 2.3: ConversationLoop Integration
- [ ] Create `createMemoryAwareConversationLoop`
- [ ] Load memories on conversation start
- [ ] Show "Loading X memories..." message
- [ ] Auto-consolidate on conversation end

### Phase 3: LTM Patterns

#### Phase 3.1: Pattern Detection
- [ ] Create `createLTMService` with pattern detection
- [ ] Detect frequently occurring conversation topics
- [ ] Add `--show-patterns` flag to display learned patterns
- [ ] Test: After multiple conversations, patterns should emerge

### Phase 4: Advanced Features (Future)
- [ ] Add `--memory-stats` flag to show memory usage
- [ ] Add `--clear-memory` flag for testing
- [ ] Add `--export-memory` flag to export memories
- [ ] Cross-conversation context ("continue our last chat")

## File Structure
```
packages/core/src/
├── services/
│   ├── memory/
│   │   ├── stm.service.ts         # Short-term memory ✅
│   │   ├── mtm.service.ts         # Mid-term memory ✅
│   │   ├── ltm.service.ts         # Long-term memory (future)
│   │   ├── memory.primitive.ts    # Composed memory service (future)
│   │   └── memory.types.ts        # Shared types ✅
│   └── memory-handlers.ts         # Memory-aware handlers (future)
└── tools/
    └── memory.tools.ts            # Memory tools for agents ✅

apps/terminal-agent/
├── src/
│   ├── commands/
│   │   └── conversation-with-memory.ts  # Our test command ✅
│   └── memory/                          # Memory storage (git-ignored)
│       ├── stm.jsonl                    # Raw event stream
│       ├── mtm/
│       │   ├── 2025-01-15.json         # Daily summary (JSON)
│       │   └── 2025-01-15.md           # Daily summary (Markdown)
│       └── ltm/
│           └── patterns.json           # Learned patterns (future)
```

## Terminal Agent Command Evolution

### Phase 0: Basic Memory
```bash
pnpm terminal-agent conversation-with-memory
# Just logs to file, no visible changes
```

### Phase 1: Memory Tools
```bash
pnpm terminal-agent conversation-with-memory
> What did we talk about earlier?
< Based on my memory, we discussed...
```

### Phase 2: Memory Context
```bash
pnpm terminal-agent conversation-with-memory
Loading 42 memories from the past week...
> What did we work on yesterday?
< Yesterday we discussed implementing the memory system...
```

### Phase 3: Pattern Recognition
```bash
pnpm terminal-agent conversation-with-memory --show-patterns
Learned patterns:
- You often ask about TypeScript patterns (8 times)
- Memory discussions happen on Thursdays (3 times)
> Let's continue our TypeScript discussion
< I see we've talked about TypeScript 8 times before...
```

## Testing Strategy
- Each phase adds new capabilities to the same command
- Easy to test: just run the command and chat
- File-based storage allows manual inspection
- Progress is visible through enhanced agent responses

## Key Design Principles
1. **Progressive Enhancement**: Same command gets smarter each phase
2. **User-Visible Progress**: Each phase adds observable features
3. **No Classes**: Use closure pattern for all services
4. **File Storage First**: Easy to debug and inspect
5. **Real-World Testing**: Actual conversations, not unit tests

## Important Implementation Details

### History Mode Feature ✅
- Added `HistoryMode` type: `'full' | 'none' | 'last-n'`
- Implemented `setHistoryMode()` and `getHistoryMode()` in ConversationLoop
- `/memory history-disable` - Agent has amnesia, must use memory tools
- `/memory history-enable` - Normal mode with full context
- Critical for testing memory retrieval without conversation context

### Fact Extraction Approaches
1. **Pattern-based** (current): Hardcoded regex patterns for common facts
2. **LLM-based** (current): Uses LLM to extract structured facts from transcript
3. **Future Enhancement**: Event-driven semantic memory with:
   - Dynamic fact schemas
   - Confidence scoring
   - Progressive enrichment
   - Domain-specific extractors

### Documentation Created ✅
1. `docs/core-concepts/memory.md` - Architecture overview (with Beta warnings)
2. `docs/guides/memory-integration.md` - Step-by-step implementation guide
3. `docs/sdk-reference/services/memory/` - API references for STM, MTM, types
4. `docs/sdk-reference/tools/memory-tools.md` - Memory tools documentation
5. Updated existing docs to reference memory features

## Current State Summary
- **Completed**: Phases 0.1-0.4, Phase 1.1 (with hybrid storage enhancement)
- **Next Up**: Phase 1.2 (Memory-aware handlers)
- **Key Innovation**: Hybrid JSON+Markdown storage for optimal AI/human use
- **Testing**: All via terminal-agent `conversation-with-memory` command

## Testing Implementation ✅

We have implemented comprehensive testing for the memory system! See [Testing Implementation Plan](../../docs/testing-implementation-plan.md) for the full testing strategy.

### Testing Achievements
- ✅ **75 tests** implemented across 4 test files
- ✅ **Phase 0**: Testing infrastructure (CI/CD fixes, test utilities)
- ✅ **Phase 1**: Unit tests for STM (18), MTM (22), Memory Tools (16)
- ✅ **Test Utilities**: Mock services, sample generators, test helpers
- ✅ **100% passing rate** with bug fixes implemented

### Testing TODO
- ⏳ **Phase 2**: Integration testing (STM→MTM flow, Agent+Memory)
- ⏳ **Phase 3**: End-to-end testing (CLI, Performance, Stress)
- ⏳ **Phase 4**: Advanced testing (LTM, Cross-platform, Security)

## Next Development Steps
1. Implement Phase 1.2: Memory-aware handlers for temporal detection
2. Build Phase 2.1: Unified memory primitive combining STM+MTM
3. Implement Phase 2.2: Cascading retrieval system (very important!)
4. Integrate Phase 2.3: Memory-aware ConversationLoop
5. Start Phase 3: LTM pattern detection
6. Continue with integration and E2E testing in parallel

Ready to continue! 🚀