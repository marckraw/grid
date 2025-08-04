import { z } from 'zod';
import { createNamedTool } from '../types/tool.types.js';
import type { STMService, MTMService } from '../services/memory/memory.types.js';

/**
 * Creates memory tools that agents can use to query their own memory
 */
export const createMemoryTools = (deps: {
  stm: STMService;
  mtm?: MTMService;
}) => {
  const { stm, mtm } = deps;
  const searchRecentMemory = createNamedTool({
    name: 'search_recent_memory',
    description: 'Search through recent memory events from the last N hours. Useful for recalling recent conversations, events, or activities.',
    parameters: z.object({
      hours: z.number()
        .default(24)
        .describe('How many hours back to search (default: 24)'),
      query: z.string()
        .optional()
        .describe('Optional text to search for in memory events'),
      eventType: z.string()
        .optional()
        .describe('Optional event type filter (e.g., "conversation.user.message")')
    }),
    execute: async ({ hours, query, eventType }) => {
      const events = await stm.getRecent(hours);
      
      let filtered = events;
      
      // Filter by event type if specified
      if (eventType) {
        filtered = filtered.filter(e => e.type === eventType);
      }
      
      // Filter by query if specified
      if (query) {
        const queryLower = query.toLowerCase();
        filtered = filtered.filter(e => {
          const eventStr = JSON.stringify(e.data).toLowerCase();
          return eventStr.includes(queryLower);
        });
      }
      
      // Format results for the agent
      const summary = {
        totalEvents: events.length,
        filteredEvents: filtered.length,
        timeRange: `last ${hours} hours`,
        events: filtered.slice(-10).map(e => ({
          time: new Date(e.timestamp).toLocaleString(),
          type: e.type,
          preview: JSON.stringify(e.data).substring(0, 100) + '...',
          tags: e.metadata?.tags || []
        }))
      };
      
      return summary;
    }
  });

  const recallConversationHistory = createNamedTool({
    name: 'recall_conversation_history',
    description: 'Recall previous messages from this or recent conversations. Useful when user refers to "earlier", "before", "what we discussed".',
    parameters: z.object({
      limit: z.number()
        .default(10)
        .describe('Maximum number of messages to recall'),
      messageType: z.enum(['user', 'agent', 'both'])
        .default('both')
        .describe('Type of messages to recall')
    }),
    execute: async ({ limit, messageType }) => {
      const userMessages = messageType !== 'agent' 
        ? await stm.getByType('conversation.user.message', limit)
        : [];
      
      const agentMessages = messageType !== 'user'
        ? await stm.getByType('conversation.agent.response', limit)
        : [];
      
      // Combine and sort by timestamp
      const allMessages = [...userMessages, ...agentMessages]
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
        .slice(-limit);
      
      return {
        messageCount: allMessages.length,
        messages: allMessages.map(e => ({
          time: new Date(e.timestamp).toLocaleString(),
          role: e.type.includes('user') ? 'user' : 'agent',
          content: e.data.message || e.data.content || '[No content]'
        }))
      };
    }
  });

  const getMemoryStatistics = createNamedTool({
    name: 'get_memory_statistics',
    description: 'Get statistics about memory usage, event types, and patterns.',
    parameters: z.object({
      hours: z.number()
        .default(24)
        .describe('Time window for statistics')
    }),
    execute: async ({ hours }) => {
      const events = await stm.getRecent(hours);
      
      // Group by event type
      const eventsByType: Record<string, number> = {};
      const eventsBySource: Record<string, number> = {};
      const eventsByHour: Record<string, number> = {};
      
      events.forEach(e => {
        // Count by type
        eventsByType[e.type] = (eventsByType[e.type] || 0) + 1;
        
        // Count by source
        const source = e.metadata?.source || 'unknown';
        eventsBySource[source] = (eventsBySource[source] || 0) + 1;
        
        // Count by hour
        const hour = new Date(e.timestamp).getHours();
        const hourKey = `${hour}:00`;
        eventsByHour[hourKey] = (eventsByHour[hourKey] || 0) + 1;
      });
      
      return {
        totalEvents: events.length,
        timeWindow: `${hours} hours`,
        eventTypes: eventsByType,
        sources: eventsBySource,
        activityByHour: eventsByHour,
        mostActiveHour: Object.entries(eventsByHour)
          .sort(([,a], [,b]) => b - a)[0]?.[0] || 'none',
        mostCommonType: Object.entries(eventsByType)
          .sort(([,a], [,b]) => b - a)[0]?.[0] || 'none'
      };
    }
  });

  const searchMemoryByTags = createNamedTool({
    name: 'search_memory_by_tags',
    description: 'Search memory events by their tags. Useful for finding related events across different categories.',
    parameters: z.object({
      tags: z.array(z.string())
        .describe('Tags to search for (e.g., ["work", "meeting"])'),
      matchAll: z.boolean()
        .default(false)
        .describe('If true, event must have ALL tags. If false, ANY tag matches.')
    }),
    execute: async ({ tags, matchAll }) => {
      const events = await stm.getRecent(168); // Search last week
      
      const filtered = events.filter(e => {
        const eventTags = e.metadata?.tags || [];
        if (matchAll) {
          // Event must have all requested tags
          return tags.every(tag => eventTags.includes(tag));
        } else {
          // Event must have at least one requested tag
          return tags.some(tag => eventTags.includes(tag));
        }
      });
      
      return {
        searchTags: tags,
        matchMode: matchAll ? 'all' : 'any',
        foundEvents: filtered.length,
        events: filtered.slice(-10).map(e => ({
          time: new Date(e.timestamp).toLocaleString(),
          type: e.type,
          tags: e.metadata?.tags || [],
          data: e.data
        }))
      };
    }
  });

  const recallFacts = createNamedTool({
    name: 'recall_facts',
    description: 'Recall important facts like user name, preferences, and key information from memory summaries.',
    parameters: z.object({
      query: z.string()
        .describe('What fact to search for (e.g., "user name", "favorite color", "preferences")')
    }),
    execute: async ({ query }) => {
      if (!mtm) {
        return {
          error: 'Mid-term memory not available',
          suggestion: 'Try using search_recent_memory instead'
        };
      }
      
      // First check today's summary
      const today = await mtm.getSummary(new Date());
      
      // Then search historical summaries if needed
      const historicalResults = await mtm.searchFacts(query);
      
      // Compile facts
      const facts: any = {};
      
      // Priority: today's facts first
      if (today?.extractedFacts) {
        Object.assign(facts, today.extractedFacts);
      }
      
      // Then historical facts
      historicalResults.forEach(summary => {
        if (summary.extractedFacts.userName && !facts.userName) {
          facts.userName = summary.extractedFacts.userName;
        }
        if (summary.extractedFacts.userPreferences) {
          facts.userPreferences = [
            ...(facts.userPreferences || []),
            ...summary.extractedFacts.userPreferences
          ];
        }
      });
      
      // Deduplicate preferences
      if (facts.userPreferences) {
        facts.userPreferences = [...new Set(facts.userPreferences)];
      }
      
      return {
        query,
        foundFacts: facts,
        sourceDates: [
          today?.date,
          ...historicalResults.map(s => s.date)
        ].filter(Boolean)
      };
    }
  });

  return {
    searchRecentMemory,
    recallConversationHistory,
    getMemoryStatistics,
    searchMemoryByTags,
    recallFacts
  };
};

/**
 * All memory tools as an array for easy registration
 */
export const getMemoryToolsArray = (deps: { stm: STMService; mtm?: MTMService }) => {
  const tools = createMemoryTools(deps);
  return Object.values(tools);
};