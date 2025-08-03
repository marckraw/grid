/**
 * Examples of different signal types that can be stored in memory.
 * The memory system is signal-agnostic - any event from any source can be stored.
 */

import type { MemoryEvent } from './memory.types.js';

// Example signals from different sources:

// 1. GitHub Signal
const githubPRMerged: Omit<MemoryEvent, 'timestamp'> = {
  type: 'github.pr.merged',
  data: {
    repository: 'mrck-labs/grid',
    prNumber: 123,
    title: 'Add memory system',
    author: 'marckraw',
    mergedBy: 'marckraw',
    filesChanged: 15,
    additions: 500,
    deletions: 100
  },
  metadata: {
    source: 'github',
    tags: ['work', 'grid-project', 'feature'],
    priority: 3
  }
};

// 2. Meeting Signal
const meetingTranscript: Omit<MemoryEvent, 'timestamp'> = {
  type: 'meeting.transcript',
  data: {
    title: 'Grid Architecture Discussion',
    participants: ['Marcin', 'Filip', 'Gosia'],
    duration: 3600, // seconds
    transcript: 'We discussed the memory architecture...',
    keyDecisions: [
      'Use signal-based approach',
      'Implement three-layer memory system'
    ],
    actionItems: [
      { assignee: 'Marcin', task: 'Implement STM service' },
      { assignee: 'Filip', task: 'Review architecture' }
    ]
  },
  metadata: {
    source: 'calendar',
    tags: ['meeting', 'architecture', 'grid-project'],
    priority: 4
  }
};

// 3. Habit/Health Signal
const habitCompleted: Omit<MemoryEvent, 'timestamp'> = {
  type: 'habit.completed',
  data: {
    habit: 'Freeletics',
    duration: 2700, // 45 minutes
    exercises: ['pushups', 'squats', 'burpees'],
    intensity: 'high',
    calories: 450
  },
  metadata: {
    source: 'health-tracker',
    userId: 'marcin',
    tags: ['health', 'exercise', 'daily-habit'],
    priority: 2
  }
};

// 4. Smart Home Signal
const motionDetected: Omit<MemoryEvent, 'timestamp'> = {
  type: 'home.motion.detected',
  data: {
    location: 'living-room',
    duration: 5,
    intensity: 0.8
  },
  metadata: {
    source: 'iot-sensor',
    tags: ['home', 'security'],
    priority: 1
  }
};

// 5. Project Signal
const deploymentCompleted: Omit<MemoryEvent, 'timestamp'> = {
  type: 'project.deployment.completed',
  data: {
    project: 'figma-to-storyblok',
    environment: 'production',
    version: '2.1.0',
    status: 'success',
    deployTime: 180 // seconds
  },
  metadata: {
    source: 'ci-cd',
    tags: ['deployment', 'figma-to-storyblok', 'production'],
    priority: 4
  }
};

// 6. Conversation Signal (just one of many signal types)
const conversationMessage: Omit<MemoryEvent, 'timestamp'> = {
  type: 'conversation.message',
  data: {
    message: 'How do I implement memory in Grid?',
    role: 'user'
  },
  metadata: {
    source: 'conversation',
    conversationId: 'conv-123',
    agentId: 'memory-agent',
    userId: 'marcin',
    tags: ['question', 'grid', 'memory'],
    priority: 2
  }
};

// Signal patterns for anomaly detection
const anomalySignal: Omit<MemoryEvent, 'timestamp'> = {
  type: 'anomaly.detected',
  data: {
    pattern: 'missed-habit',
    description: 'Freeletics missed 3 times this week',
    severity: 'medium',
    recommendation: 'Consider lighter workout schedule'
  },
  metadata: {
    source: 'pattern-detector',
    tags: ['anomaly', 'health', 'habit'],
    priority: 5 // High priority for anomalies
  }
};

/**
 * Example of how different agents would use the memory service
 */
export const signalExamples = {
  // Health Agent signals
  health: [
    'habit.completed',
    'habit.missed', 
    'sleep.tracked',
    'nutrition.logged',
    'workout.completed'
  ],
  
  // Project Agent signals
  project: [
    'github.pr.opened',
    'github.pr.merged',
    'github.issue.created',
    'deployment.started',
    'deployment.completed',
    'test.failed',
    'meeting.scheduled'
  ],
  
  // Home Agent signals
  home: [
    'home.motion.detected',
    'home.door.opened',
    'home.temperature.changed',
    'home.appliance.activated',
    'home.security.alert'
  ],
  
  // Calendar Agent signals
  calendar: [
    'meeting.scheduled',
    'meeting.started',
    'meeting.ended',
    'meeting.transcript',
    'reminder.triggered'
  ]
};

/**
 * Priority levels for signals
 */
export const SIGNAL_PRIORITY = {
  LOW: 1,      // Routine events
  MEDIUM: 2,   // Normal operations
  NORMAL: 3,   // Important but not urgent
  HIGH: 4,     // Important and timely
  CRITICAL: 5  // Requires immediate attention
} as const;