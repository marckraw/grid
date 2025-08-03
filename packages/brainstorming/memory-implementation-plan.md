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

#### Phase 0.2: Hook into Existing System
- [ ] Add STM logging to ConversationHistory handlers
- [ ] Log all messages and tool calls automatically
- [ ] Update `conversation-with-memory` command to use handlers
- [ ] Verify events are being written during conversations

#### Phase 0.3: Basic Retrieval
- [ ] Add `getRecent(hours)` method to STM service
- [ ] Filter events by timestamp
- [ ] Add `clear()` method for testing
- [ ] Update command to show memory stats at conversation end

#### Phase 0.4: Memory Tool
- [ ] Create `remember_recent` tool using Vercel AI SDK format
- [ ] Add tool to `conversation-with-memory` agent
- [ ] Test by asking agent "what did we talk about earlier?"
- [ ] Agent should be able to query its own memory

### Phase 1: MTM Summarization

#### Phase 1.1: Daily Summaries
- [ ] Create `createMTMService` with `summarizeDay()` method
- [ ] Count events by type and create summaries
- [ ] Save summaries to `./memory/mtm/YYYY-MM-DD.json`
- [ ] Add `--summarize` flag to command to trigger summarization

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

#### Phase 2.2: ConversationLoop Integration
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
│   │   ├── stm.service.ts         # Short-term memory
│   │   ├── mtm.service.ts         # Mid-term memory  
│   │   ├── ltm.service.ts         # Long-term memory
│   │   ├── memory.primitive.ts    # Composed memory service
│   │   └── memory.types.ts        # Shared types
│   └── memory-handlers.ts         # Memory-aware handlers
└── tools/
    └── memory.tools.ts            # Memory tools for agents

apps/terminal-agent/
├── src/
│   ├── commands/
│   │   └── conversation-with-memory.ts  # Our test command
│   └── memory/                          # Memory storage (git-ignored)
│       ├── stm.jsonl                    # Raw event stream
│       ├── mtm/
│       │   └── 2025-01-15.json         # Daily summaries
│       └── ltm/
│           └── patterns.json           # Learned patterns
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

## Next Steps
1. Create memory services in core package
2. Add `conversation-with-memory` command to terminal-agent
3. Implement Phase 0.1 (simple STM logging)
4. Have a test conversation and verify logging works
5. Iterate through phases, enhancing the command each time

Ready to start building! 🚀