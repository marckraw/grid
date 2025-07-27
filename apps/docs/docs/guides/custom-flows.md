---
sidebar_position: 1
---

# Building Custom Flows

Learn how to build custom conversation flows using Grid's primitives at different levels of abstraction.

## Overview

Grid's architecture allows you to build conversation flows in multiple ways:
- Using atomic primitives directly
- Creating custom managers
- Building custom loops
- Mixing and matching approaches

This guide shows practical examples of each approach.

## Using Atomic Primitives Directly

The most flexible approach is using the atomic primitives directly without any higher-level abstractions.

### Basic Message Tracking

```typescript
import { createConversationHistory, createConversationContext } from "@mrck-labs/grid-core";

// Create independent primitives
const history = createConversationHistory("You are a helpful assistant");
const context = createConversationContext();

// Custom message handling
async function handleUserMessage(message: string) {
  // Add to history
  await history.addMessage({ 
    role: "user", 
    content: message 
  });
  
  // Update context
  await context.incrementMessageCount();
  await context.updateMetadata('lastMessageTime', Date.now());
  
  // Your custom logic here
  const response = await processWithYourLogic(message);
  
  // Add response
  await history.addMessage({ 
    role: "assistant", 
    content: response 
  });
  
  return response;
}
```

### Custom State Management

```typescript
class CustomConversationFlow {
  private history = createConversationHistory();
  private context = createConversationContext();
  private customState = new Map<string, any>();
  
  async initialize(userId: string) {
    // Set up initial state
    await this.context.updateState('user.id', userId);
    await this.context.updateState('session.startTime', Date.now());
    
    // Load user preferences
    const prefs = await this.loadUserPreferences(userId);
    await this.context.updateStates({
      'user.preferences.language': prefs.language,
      'user.preferences.style': prefs.style
    });
  }
  
  async processMessage(content: string) {
    // Pre-processing based on state
    const language = this.context.getStateValue('user.preferences.language');
    const translated = await this.translateIfNeeded(content, language);
    
    // Add to history with metadata
    await this.history.addMessage({
      role: "user",
      content: translated,
      metadata: { original: content, language }
    });
    
    // Custom processing
    const response = await this.generateResponse(translated);
    
    // Post-processing
    await this.updateAnalytics(content, response);
    
    return response;
  }
  
  private async updateAnalytics(input: string, output: string) {
    const metrics = this.context.getMetrics();
    this.customState.set('totalTokens', 
      (this.customState.get('totalTokens') || 0) + 
      this.estimateTokens(input + output)
    );
  }
}
```

## Building a Custom Manager

Create your own manager that combines primitives in a unique way.

### Domain-Specific Manager

```typescript
interface CustomerSupportManager {
  history: ReturnType<typeof createConversationHistory>;
  context: ReturnType<typeof createConversationContext>;
  ticketSystem: TicketAPI;
}

function createCustomerSupportManager(
  ticketSystem: TicketAPI
): CustomerSupportManager {
  const history = createConversationHistory(
    "You are a customer support specialist. Be helpful and empathetic."
  );
  const context = createConversationContext();
  
  // Enhanced with domain logic
  return {
    history,
    context,
    ticketSystem,
    
    // Custom method for support workflows
    async startSupportSession(customerId: string, issue: string) {
      // Create ticket
      const ticket = await ticketSystem.create({
        customerId,
        issue,
        priority: this.assessPriority(issue)
      });
      
      // Initialize context
      await context.updateStates({
        'session.ticketId': ticket.id,
        'session.customerId': customerId,
        'session.issue': issue,
        'session.priority': ticket.priority
      });
      
      // Add initial message
      await history.addMessage({
        role: "system",
        content: `New support ticket #${ticket.id}: ${issue}`
      });
      
      return ticket;
    },
    
    // Handle escalation
    async escalateToHuman(reason: string) {
      const ticketId = context.getStateValue('session.ticketId');
      await ticketSystem.escalate(ticketId, reason);
      
      await history.addMessage({
        role: "system",
        content: `Escalated to human support: ${reason}`
      });
      
      await context.updateState('session.escalated', true);
      await context.updateState('session.escalationReason', reason);
    },
    
    // Assess priority based on keywords
    assessPriority(issue: string): 'low' | 'medium' | 'high' | 'urgent' {
      const urgentKeywords = ['urgent', 'emergency', 'critical', 'down'];
      const highKeywords = ['broken', 'error', 'failed', 'cannot'];
      
      const lowerIssue = issue.toLowerCase();
      
      if (urgentKeywords.some(keyword => lowerIssue.includes(keyword))) {
        return 'urgent';
      }
      if (highKeywords.some(keyword => lowerIssue.includes(keyword))) {
        return 'high';
      }
      
      return 'medium';
    }
  };
}

// Usage
const supportManager = createCustomerSupportManager(ticketAPI);
await supportManager.startSupportSession('cust_123', 'Cannot login to account');
```

### Multi-Modal Manager

```typescript
interface MultiModalManager {
  textHistory: ReturnType<typeof createConversationHistory>;
  voiceHistory: ReturnType<typeof createConversationHistory>;
  sharedContext: ReturnType<typeof createConversationContext>;
}

function createMultiModalManager(): MultiModalManager {
  // Separate histories for different modalities
  const textHistory = createConversationHistory();
  const voiceHistory = createConversationHistory();
  const sharedContext = createConversationContext();
  
  return {
    textHistory,
    voiceHistory,
    sharedContext,
    
    // Handle text input
    async processTextInput(text: string) {
      await textHistory.addMessage({ role: "user", content: text });
      await sharedContext.updateState('lastInput.type', 'text');
      await sharedContext.updateState('lastInput.content', text);
      await sharedContext.incrementMessageCount();
    },
    
    // Handle voice input
    async processVoiceInput(audioUrl: string, transcript: string) {
      await voiceHistory.addMessage({ 
        role: "user", 
        content: transcript,
        metadata: { audioUrl }
      });
      await sharedContext.updateState('lastInput.type', 'voice');
      await sharedContext.updateState('lastInput.content', transcript);
      await sharedContext.incrementMessageCount();
    },
    
    // Get unified history
    getAllMessages() {
      const textMessages = textHistory.getMessages().map(m => ({
        ...m,
        channel: 'text' as const
      }));
      
      const voiceMessages = voiceHistory.getMessages().map(m => ({
        ...m,
        channel: 'voice' as const
      }));
      
      // Merge and sort by timestamp
      return [...textMessages, ...voiceMessages].sort(
        (a, b) => (a.timestamp || 0) - (b.timestamp || 0)
      );
    },
    
    // Generate response considering both channels
    async generateUnifiedResponse() {
      const lastInputType = sharedContext.getStateValue('lastInput.type');
      const allContext = this.getAllMessages();
      
      // Different handling based on input type
      if (lastInputType === 'voice') {
        return { 
          type: 'voice', 
          content: await generateVoiceResponse(allContext) 
        };
      }
      
      return { 
        type: 'text', 
        content: await generateTextResponse(allContext) 
      };
    }
  };
}
```

## Building a Custom Loop

Create your own conversation loop with custom behavior.

### Workflow-Based Loop

```typescript
interface WorkflowStep {
  id: string;
  name: string;
  validator?: (input: string) => boolean;
  processor: (input: string, context: any) => Promise<string>;
  next?: string; // Next step ID
}

class WorkflowConversationLoop {
  private history = createConversationHistory();
  private context = createConversationContext();
  private steps = new Map<string, WorkflowStep>();
  private currentStep: string = 'start';
  
  addStep(step: WorkflowStep) {
    this.steps.set(step.id, step);
  }
  
  async processMessage(input: string): Promise<string> {
    const step = this.steps.get(this.currentStep);
    if (!step) {
      throw new Error(`Unknown step: ${this.currentStep}`);
    }
    
    // Validate input if validator exists
    if (step.validator && !step.validator(input)) {
      return "Invalid input. Please try again.";
    }
    
    // Add user message
    await this.history.addMessage({ role: "user", content: input });
    
    // Process with step logic
    const response = await step.processor(
      input, 
      this.context.getState()
    );
    
    // Add assistant response
    await this.history.addMessage({ role: "assistant", content: response });
    
    // Move to next step
    if (step.next) {
      this.currentStep = step.next;
      await this.context.updateState('workflow.currentStep', step.next);
    }
    
    return response;
  }
}

// Usage: Onboarding workflow
const onboardingLoop = new WorkflowConversationLoop();

onboardingLoop.addStep({
  id: 'start',
  name: 'Welcome',
  processor: async (input) => {
    return "Welcome! What's your name?";
  },
  next: 'getName'
});

onboardingLoop.addStep({
  id: 'getName',
  name: 'Get Name',
  validator: (input) => input.length > 0,
  processor: async (input, context) => {
    await context.updateState('user.name', input);
    return `Nice to meet you, ${input}! What's your email?`;
  },
  next: 'getEmail'
});

onboardingLoop.addStep({
  id: 'getEmail',
  name: 'Get Email',
  validator: (input) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input),
  processor: async (input, context) => {
    await context.updateState('user.email', input);
    const name = context.getStateValue('user.name');
    return `Perfect! ${name}, you're all set up with ${input}.`;
  },
  next: 'complete'
});
```

### Reactive Loop with Subscriptions

```typescript
class ReactiveConversationLoop {
  private history = createConversationHistory();
  private context = createConversationContext();
  private subscribers = new Map<string, Set<(data: any) => void>>();
  
  // Subscribe to events
  on(event: string, callback: (data: any) => void) {
    if (!this.subscribers.has(event)) {
      this.subscribers.set(event, new Set());
    }
    this.subscribers.get(event)!.add(callback);
    
    return () => {
      this.subscribers.get(event)?.delete(callback);
    };
  }
  
  // Emit events
  private emit(event: string, data: any) {
    this.subscribers.get(event)?.forEach(cb => cb(data));
  }
  
  async processMessage(input: string) {
    this.emit('message:received', { input });
    
    try {
      // Add to history
      await this.history.addMessage({ role: "user", content: input });
      this.emit('history:updated', { 
        messages: this.history.getMessages() 
      });
      
      // Analyze intent
      const intent = await this.analyzeIntent(input);
      this.emit('intent:detected', { intent });
      
      // Update context based on intent
      await this.context.updateState('conversation.intent', intent);
      this.emit('context:updated', { 
        state: this.context.getState() 
      });
      
      // Generate response
      const response = await this.generateResponse(input, intent);
      await this.history.addMessage({ 
        role: "assistant", 
        content: response 
      });
      
      this.emit('response:generated', { response });
      
      return response;
    } catch (error) {
      this.emit('error', { error });
      throw error;
    }
  }
  
  // Usage with subscriptions
  static example() {
    const loop = new ReactiveConversationLoop();
    
    // Subscribe to events
    loop.on('intent:detected', ({ intent }) => {
      console.log(`Intent: ${intent}`);
      analytics.track('intent', { type: intent });
    });
    
    loop.on('context:updated', ({ state }) => {
      // Persist state changes
      database.saveState(state);
    });
    
    loop.on('error', ({ error }) => {
      errorReporter.log(error);
    });
    
    return loop;
  }
}
```

## Mixing Approaches

You can mix different levels of abstraction as needed.

### Hybrid Implementation

```typescript
import { 
  createConversationManager,
  createConversationHistory,
  createConversationContext 
} from "@mrck-labs/grid-core";

class HybridConversationSystem {
  // Use manager for main conversation
  private mainConversation = createConversationManager();
  
  // Use separate history for audit log
  private auditLog = createConversationHistory();
  
  // Use separate context for analytics
  private analyticsContext = createConversationContext();
  
  async processUserInput(input: string, userId: string) {
    // Main conversation flow
    await this.mainConversation.addUserMessage(input);
    
    // Separate audit logging
    await this.auditLog.addMessage({
      role: "system",
      content: `User ${userId} sent: ${input}`,
      metadata: { 
        timestamp: Date.now(),
        userId,
        ip: getClientIP()
      }
    });
    
    // Analytics tracking
    await this.analyticsContext.incrementMessageCount();
    const wordCount = input.split(' ').length;
    const totalWords = this.analyticsContext.getStateValue('totalWords') || 0;
    await this.analyticsContext.updateState('totalWords', totalWords + wordCount);
    
    // Process and respond
    const response = await this.generateResponse(input);
    await this.mainConversation.processAgentResponse(response);
    
    // Audit the response
    await this.auditLog.addMessage({
      role: "system",
      content: `System responded: ${response.content}`,
      metadata: { 
        timestamp: Date.now(),
        tokenCount: response.metadata?.tokens
      }
    });
    
    return response;
  }
  
  // Get different views of the conversation
  getMainConversation() {
    return this.mainConversation.getConversationState();
  }
  
  getAuditTrail() {
    return this.auditLog.getMessages();
  }
  
  getAnalytics() {
    return {
      ...this.analyticsContext.getMetrics(),
      averageWordCount: 
        this.analyticsContext.getStateValue('totalWords') / 
        this.analyticsContext.getMetrics().messageCount
    };
  }
}
```

## Best Practices

### 1. Start Simple
Begin with the primitives you need, add complexity as required:

```typescript
// Start with just history
const history = createConversationHistory();

// Add context when you need state
const context = createConversationContext();

// Upgrade to manager when you want convenience
const manager = createConversationManager();
```

### 2. Separate Concerns
Use different primitives for different purposes:

```typescript
// Main conversation
const conversation = createConversationManager();

// Separate debug log
const debugLog = createConversationHistory();

// Separate metrics tracking
const metrics = createConversationContext();
```

### 3. Event-Driven Architecture
Use event handlers for loose coupling:

```typescript
const history = createConversationHistory({
  onMessageAdded: async (message) => {
    // Trigger any external systems
    await messageQueue.publish('conversation.message', message);
  }
});
```

### 4. Type Safety
Define your custom types:

```typescript
interface MyCustomState {
  user: {
    id: string;
    preferences: UserPreferences;
  };
  session: {
    startTime: number;
    topic?: string;
  };
}

// Type-safe state access
const context = createConversationContext();
const state = context.getState() as MyCustomState;
```

## Next Steps

- [Architecture Overview](/docs/core-concepts/architecture-diagram) - Understand the layered design
- [Choosing Primitives](/docs/guides/choosing-primitives) - Decide which approach to use
- [SDK Reference](/docs/sdk-reference/overview) - Detailed API documentation