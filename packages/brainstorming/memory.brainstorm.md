# HQ/Grid Memory & Signal System – Full Architecture

This document defines the **memory architecture and signal processing pipeline**  
for **HQ/Grid**, the multi-agent system (Jarvis) that manages Marcin’s life, projects, and home.

---

## 1️⃣ Core Concepts

HQ/Grid is a **multi-agent event-driven system** with:

- **Central Signal Bus (Grid)** → collects signals from the world and projects
- **Modular Agents** → each has tools (skills) to process signals and act
- **Layered Memory System** → ensures agents stay smart without being overwhelmed

**Goal:**

- Maintainable, scalable, and **human-like memory system**
- Agents act **reactively in real-time** and **reflectively over time**
- Memory is **layered** to balance speed, clarity, and storage efficiency

---

## 2️⃣ Memory Layers

HQ/Grid memory is **tiered like a human brain**:

### **A. STM – Short-Term Memory (Raw Signals)**

- **Purpose:**
  - Raw, timestamped history of all events
  - For **real-time triggers, debugging, and nightly summarization**
- **Lifetime:** Hours → Days (e.g., 7-30 days)
- **Storage:**
  - Append-only DB table or JSONL log
  - Stores **metadata + pointers to any files (audio, images)**
- **Example Signal:**

```json
{
  "timestamp": "2025-08-02T19:00Z",
  "type": "habit.missed",
  "user": "marcin",
  "habit": "Freeletics",
  "priority": 2,
  "tags": ["health", "daily"]
}
```

---

### **B. MTM – Mid-Term Memory (Daily / Weekly Summaries)**

- **Purpose:**
  - Condensed “story of your life”
  - Agents mostly reason on MTM instead of raw STM
- **Lifetime:** Weeks → Months
- **Storage:**
  - Markdown (human-readable) or JSON
  - Optionally vector embeddings for semantic search
- **Example MTM Summary:**

```
# Health Summary – 2025-08-02
- Missed Freeletics workout
- Completed 15km trail run
- Slept 6.2 hours

Insight: Active day but low sleep. Consider lighter workout tomorrow.
```

---

### **C. LTM – Long-Term Memory (Knowledge Base)**

- **Purpose:**
  - Curated knowledge and insights
  - Used for **reasoning, explanations, and RAG queries**
- **Lifetime:** Months → Years (permanent)
- **Storage:**
  - Markdown in Git (versioned, human-readable)
  - Vector DB (Qdrant) for semantic search
- **Example LTM Entry:**

```
## Health Pattern – August 2025
- Trail runs completed: 6
- Freeletics sessions missed: 4
- Sleep avg: 6.1h

Insight: Marcin is consistent in running but often skips Freeletics mid-week.
Recommendation: Schedule lighter Freeletics sessions on Wednesdays.
```

---

### **D. Optional Memory Layers**

1. **Episodic Memory**

   - Snapshots of **significant events** for storytelling
   - Example: “Vacation in Japan” summary with key photos

2. **Procedural / Skill Memory**

   - Stores **how to do things** → agent tools & workflows
   - Example: “If missed Freeletics 3x → suggest lighter plan”

3. **Social / Contextual Memory**

   - Tracks **identities, roles, and relationships**
   - Enables **personalized responses** (Marcin vs Gosia)

4. **Multi-Modal Memory**

   - Signals can include **text, images, audio, video, structured data**
   - Preprocessing (caption/OCR/transcription) → summary → embedding

5. **Anomaly / Priority Memory**
   - Detects **patterns and unusual deviations**
   - Triggers **priority alerts** to agents/users

---

## 3️⃣ Signal Lifecycle

1. **Signal Created**

   - Example: `habit.missed`, `meeting.ended`, `github.push`
   - Stored in **STM** with metadata and optional file pointers

2. **Grid Filters & Routes Signals**

   - Each agent **subscribes to relevant tags and priorities**
   - Example:
     - HealthAgent → `tags: ["health"]`
     - FamilyAgent → `tags: ["home", "family"]`
     - ProjectAgent → `tags: ["work", "project"]`

3. **Real-Time Agent Reactions (Optional)**

   - Critical or high-priority signals → immediate notification
   - Example: “Fridge door open 15 min” → FamilyAgent alert

4. **Nightly Summarization (STM → MTM)**

   - **SummarizerAgent** reads STM
   - Groups by **agent/domain/project**
   - Outputs **daily/weekly MTM summaries**

5. **Weekly Reflection (MTM → LTM)**

   - **ReflectionAgent** aggregates MTM
   - Extracts **patterns and knowledge** for LTM
   - Example: “Missed Freeletics 3x → add insight to LTM”

6. **STM Expiration / Archival**
   - STM cleared after retention period
   - MTM & LTM become the **official memory**

---

## 4️⃣ Multi-Modal Signal Example

**Meeting with transcript, audio, and whiteboard photo:**

```json
{
  "type": "meeting.ended",
  "project": "FigmaToStoryblok",
  "participants": ["Marcin", "Gosia", "Filip"],
  "payload": {
    "transcript_text": "We discussed component mapping...",
    "audio_file": "/stm/audio/2025-08-02-meeting.mp3",
    "screenshot_image": "/stm/images/2025-08-02-whiteboard.jpg"
  },
  "priority": 3,
  "timestamp": "2025-08-02T14:00Z"
}
```

- **STM:** Raw metadata + files
- **MTM:** Text summary + embedded captions
- **LTM:** Extracted decisions → project knowledge base

---

## 5️⃣ Anomaly Detection

**Purpose:**

- Agents should **contact the user proactively** on important deviations

**Examples:**

- Health: 3 missed Freeletics sessions in 7 days
- Family: Light on at 3am + no movement detected
- Project: No commits for 7 days in active repo

**Implementation:**

- **Rule-based + heuristic + optional AI embedding outlier detection**
- Generates **alert signals (priority 5)**:

```json
{
  "type": "alert.anomaly",
  "source": "health",
  "reason": "Missed Freeletics 3x in 7 days",
  "priority": 5,
  "timestamp": "2025-08-08T08:00Z"
}
```

---

## 6️⃣ Memory API & Access Patterns

All agents should **use a standardized Memory API** to interact with memory layers:

**Read Operations:**

```ts
getRecentSignals(agentId, hours);
getSummaries(agentId, period); // MTM
queryKnowledge(agentId, query); // LTM (vector + markdown)
```

**Write Operations:**

```ts
logSignal(signal); // STM
addSummary(agentId, summaryDoc); // MTM
addKnowledge(agentId, knowledgeDoc); // LTM
```

**Behavior:**

- Agents **rarely read raw STM** → only for real-time or debugging
- Agents **primarily use MTM + LTM** for reasoning
- **MemoryManager/Reflection agents** handle summarization and promotion

---

## 7️⃣ Reflection & Knowledge Promotion

**Summarizer Agent (Nightly):**

1. Reads last 24h of STM
2. Groups signals per domain/agent/project
3. Outputs daily **MTM summaries** in Markdown

**Reflection Agent (Weekly/Monthly):**

1. Reads MTM summaries
2. Extracts **patterns, trends, insights**
3. Updates **LTM knowledge base** with curated facts

**STM → MTM → LTM Flow:**

```
Raw Signals → [Summarizer] → Daily Summaries → [Reflection] → Curated Knowledge
```

---

## 8️⃣ Cross-Agent Memory Sharing

- **Domain agents** see only **relevant signals and summaries**
- **ReflectionAgent** and **MemoryManager** see **all signals** for:
  - Pattern detection
  - Trend analysis
  - Cross-domain insights

**Example:**

- HealthAgent sees habits & workouts
- ProjectAgent sees meetings & commits
- ReflectionAgent can correlate:
  > “Late-night coding → missed Freeletics next morning”

---

## 9️⃣ Key Benefits

- **Maintainable** → Clear separation of signal, summary, and knowledge
- **Scalable** → Agents reason on summaries, not raw logs
- **Multi-modal ready** → Text, audio, image, video supported
- **Human-like** → Social/contextual memory + episodic reflection
- **Rebuildable** → STM can regenerate MTM/LTM if logic changes
- **Proactive** → Anomaly detection triggers helpful alerts

---

This document is the **foundation for implementing HQ/Grid memory & signal architecture**,  
turning it into a **scalable, human-like Jarvis system**.
