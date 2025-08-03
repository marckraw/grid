import { promises as fs } from 'fs';
import * as path from 'path';
import { MTMService, MTMConfig, MTMSummary, STMService, MemoryEvent } from './memory.types.js';
import type { LLMService } from '../../types/llm.types.js';

/**
 * Creates a Mid-Term Memory service that summarizes daily events
 */
export const createMTMService = (deps: {
  stm: STMService;
  llmService?: LLMService;
  config?: MTMConfig;
}): MTMService => {
  const { stm, llmService, config } = deps;
  const storagePath = config?.storagePath || './memory/mtm';
  
  const ensureDirectory = async () => {
    await fs.mkdir(storagePath, { recursive: true });
  };
  
  /**
   * Extract facts from conversation messages using simple patterns
   */
  const extractFactsFromEvents = (events: MemoryEvent[]): MTMSummary['extractedFacts'] => {
    const facts: MTMSummary['extractedFacts'] = {
      userPreferences: [],
      keyTopics: [],
      importantEvents: [],
      relationships: {}
    };
    
    // Extract user name - prioritize explicit name introductions
    let nameFound = false;
    events.forEach(event => {
      if (event.type.includes('message') && event.data.message && !nameFound) {
        const message = event.data.message.toLowerCase();
        
        // First check for explicit name introductions
        const explicitNamePatterns = [
          /my name is (\w+)/i,
          /call me (\w+)/i
        ];
        
        for (const pattern of explicitNamePatterns) {
          const match = event.data.message.match(pattern);
          if (match && match[1]) {
            facts.userName = match[1].charAt(0).toUpperCase() + match[1].slice(1);
            nameFound = true;
            return;
          }
        }
      }
    });
    
    // If no explicit name found, check for implicit patterns
    if (!nameFound) {
      events.forEach(event => {
        if (event.type.includes('message') && event.data.message && !nameFound) {
          const implicitPatterns = [
            /i'?m (\w+)/i,
            /i am (\w+)/i
          ];
          
          for (const pattern of implicitPatterns) {
            const match = event.data.message.match(pattern);
            if (match && match[1]) {
              // Skip common verbs that might follow "I am"
              const commonVerbs = ['working', 'doing', 'going', 'making', 'trying', 'looking'];
              if (!commonVerbs.includes(match[1].toLowerCase())) {
                facts.userName = match[1].charAt(0).toUpperCase() + match[1].slice(1);
                nameFound = true;
                return;
              }
            }
          }
        }
      });
    }
    
    // Extract preferences and topics  
    events.forEach(event => {
      if (event.type.includes('message') && event.data.message) {
        const message = event.data.message.toLowerCase();
        
        // Extract preferences (my favorite X is Y)
        const prefPattern = /my favorite (\w+) is ([^.!?]+)/gi;
        let prefMatch;
        while ((prefMatch = prefPattern.exec(event.data.message)) !== null) {
          facts.userPreferences?.push(`favorite ${prefMatch[1]}: ${prefMatch[2].trim()}`);
        }
        
        // Extract topics (simple keyword extraction)
        const topicKeywords = ['discussing', 'talking about', 'working on', 'interested in'];
        topicKeywords.forEach(keyword => {
          if (message.includes(keyword)) {
            const afterKeyword = message.split(keyword)[1];
            if (afterKeyword) {
              const topic = afterKeyword.split(/[.,!?]/)[0].trim();
              if (topic.length > 3 && topic.length < 50) {
                facts.keyTopics?.push(topic);
              }
            }
          }
        });
      }
    });
    
    // Deduplicate arrays
    facts.userPreferences = [...new Set(facts.userPreferences)];
    facts.keyTopics = [...new Set(facts.keyTopics)];
    
    return facts;
  };
  
  /**
   * Use LLM to extract facts if available
   */
  const extractFactsWithLLM = async (events: MemoryEvent[]): Promise<MTMSummary['extractedFacts']> => {
    if (!llmService) {
      return extractFactsFromEvents(events);
    }
    
    // Prepare conversation transcript
    const transcript = events
      .filter(e => e.type.includes('message'))
      .map(e => {
        const role = e.type.includes('user') ? 'User' : 'Assistant';
        const content = e.data.message || e.data.content || '';
        return `${role}: ${content}`;
      })
      .join('\n');
    
    const prompt = `Extract key facts from this conversation transcript. Return JSON with these fields:
- userName: The user's name if mentioned
- userPreferences: Array of user preferences mentioned (e.g., "favorite color: blue")
- keyTopics: Main topics discussed
- importantEvents: Any important events or decisions mentioned
- relationships: Key relationships mentioned (e.g., job role, project involvement)

Transcript:
${transcript}

Return only valid JSON, no explanations.`;
    
    try {
      const response = await llmService.runLLM({
        messages: [
          { role: 'system', content: 'You are a fact extraction assistant. Extract facts from conversations and return JSON.' },
          { role: 'user', content: prompt }
        ]
      });
      
      if (response.content) {
        // Try to parse LLM response as JSON
        const cleanJson = response.content.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        return JSON.parse(cleanJson);
      }
    } catch (error) {
      console.warn('LLM fact extraction failed, falling back to patterns:', error);
    }
    
    // Fallback to pattern-based extraction
    return extractFactsFromEvents(events);
  };
  
  /**
   * Generate markdown representation of the summary
   */
  const generateMarkdownSummary = (summary: MTMSummary, dayEvents: MemoryEvent[]): string => {
    let markdown = `# Daily Memory Summary - ${summary.date}\n\n`;
    markdown += `*Generated at: ${new Date(summary.createdAt).toLocaleString()}*\n\n`;
    
    // User Profile Section
    if (summary.extractedFacts.userName || summary.extractedFacts.userPreferences?.length) {
      markdown += `## User Profile\n\n`;
      if (summary.extractedFacts.userName) {
        markdown += `- **Name**: ${summary.extractedFacts.userName}\n`;
      }
      if (summary.extractedFacts.userPreferences?.length) {
        markdown += `\n### Preferences\n`;
        summary.extractedFacts.userPreferences.forEach(pref => {
          markdown += `- ${pref}\n`;
        });
      }
      markdown += '\n';
    }
    
    // Conversation Overview
    markdown += `## Conversation Overview\n\n`;
    markdown += `- **Total Conversations**: ${summary.conversations.count}\n`;
    markdown += `- **Messages Exchanged**: ${summary.conversations.totalMessages}\n`;
    markdown += `- **Average Message Length**: ${summary.conversations.avgLength} characters\n\n`;
    
    // Key Topics
    if (summary.conversations.topics.length > 0) {
      markdown += `### Topics Discussed\n`;
      summary.conversations.topics.forEach(topic => {
        markdown += `- ${topic}\n`;
      });
      markdown += '\n';
    }
    
    // Highlights
    if (summary.highlights.length > 0) {
      markdown += `## Key Highlights\n\n`;
      summary.highlights.forEach(highlight => {
        markdown += `- ${highlight}\n`;
      });
      markdown += '\n';
    }
    
    // Conversation Transcript Samples
    const conversations = dayEvents.filter(e => 
      e.type.includes('message') || e.type.includes('response')
    );
    if (conversations.length > 0) {
      markdown += `## Conversation Samples\n\n`;
      
      // Group by conversation session
      const sessions: Record<string, MemoryEvent[]> = {};
      conversations.forEach(event => {
        const sessionId = event.metadata?.conversationId || 'unknown';
        if (!sessions[sessionId]) sessions[sessionId] = [];
        sessions[sessionId].push(event);
      });
      
      // Show first few exchanges from each session
      Object.entries(sessions).slice(0, 3).forEach(([sessionId, events]) => {
        const sessionStart = new Date(events[0].timestamp).toLocaleTimeString();
        markdown += `### Session at ${sessionStart}\n\n`;
        
        events.slice(0, 6).forEach(event => {
          const role = event.type.includes('user') ? '**User**' : '**Assistant**';
          const content = event.data.message || event.data.content || '';
          markdown += `${role}: ${content}\n\n`;
        });
        
        if (events.length > 6) {
          markdown += `*... ${events.length - 6} more messages in this session*\n\n`;
        }
      });
    }
    
    // Event Statistics
    markdown += `## Event Statistics\n\n`;
    markdown += `| Event Type | Count |\n`;
    markdown += `|------------|-------|\n`;
    Object.entries(summary.eventStatistics)
      .sort(([,a], [,b]) => b - a)
      .forEach(([type, count]) => {
        markdown += `| ${type} | ${count} |\n`;
      });
    
    return markdown;
  };

  /**
   * Summarize a day's events into MTM
   */
  const summarizeDay = async (date = new Date()): Promise<MTMSummary> => {
    const dateStr = date.toISOString().split('T')[0];
    
    // Get all events for the day
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    const allEvents = await stm.getRecent(24 * 7); // Get a week to filter
    const dayEvents = allEvents.filter(e => {
      const eventTime = new Date(e.timestamp);
      return eventTime >= startOfDay && eventTime <= endOfDay;
    });
    
    // Count events by type
    const eventStatistics: Record<string, number> = {};
    dayEvents.forEach(event => {
      eventStatistics[event.type] = (eventStatistics[event.type] || 0) + 1;
    });
    
    // Extract conversation stats
    const conversationStarts = dayEvents.filter(e => e.type === 'conversation.started').length;
    const userMessages = dayEvents.filter(e => e.type === 'conversation.user.message');
    const avgMessageLength = userMessages.length > 0
      ? userMessages.reduce((sum, e) => sum + (e.data.message?.length || 0), 0) / userMessages.length
      : 0;
    
    // Extract facts
    const extractedFacts = await extractFactsWithLLM(dayEvents);
    
    // Generate highlights
    const highlights: string[] = [];
    if (extractedFacts.userName) {
      highlights.push(`Learned user's name: ${extractedFacts.userName}`);
    }
    if (conversationStarts > 0) {
      highlights.push(`Had ${conversationStarts} conversation${conversationStarts > 1 ? 's' : ''}`);
    }
    if (extractedFacts.keyTopics && extractedFacts.keyTopics.length > 0) {
      highlights.push(`Discussed: ${extractedFacts.keyTopics.slice(0, 3).join(', ')}`);
    }
    
    const summary: MTMSummary = {
      date: dateStr,
      extractedFacts,
      conversations: {
        count: conversationStarts,
        totalMessages: userMessages.length,
        avgLength: Math.round(avgMessageLength),
        topics: extractedFacts.keyTopics || []
      },
      eventStatistics,
      highlights,
      createdAt: new Date().toISOString()
    };
    
    // Save both JSON and Markdown versions
    await ensureDirectory();
    
    // Save JSON summary
    const summaryPath = path.join(storagePath, `${dateStr}.json`);
    await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2));
    
    // Generate and save Markdown summary
    const markdown = generateMarkdownSummary(summary, dayEvents);
    const markdownPath = path.join(storagePath, `${dateStr}.md`);
    await fs.writeFile(markdownPath, markdown);
    
    return summary;
  };
  
  /**
   * Get a summary for a specific date
   */
  const getSummary = async (date: Date): Promise<MTMSummary | null> => {
    const dateStr = date.toISOString().split('T')[0];
    const summaryPath = path.join(storagePath, `${dateStr}.json`);
    
    try {
      const content = await fs.readFile(summaryPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  };
  
  /**
   * List all available summaries
   */
  const listSummaries = async (): Promise<string[]> => {
    try {
      await ensureDirectory();
      const files = await fs.readdir(storagePath);
      return files
        .filter(f => f.endsWith('.json'))
        .map(f => f.replace('.json', ''))
        .sort();
    } catch {
      return [];
    }
  };
  
  /**
   * Get markdown summary for a specific date
   */
  const getSummaryMarkdown = async (date: Date): Promise<string | null> => {
    const dateStr = date.toISOString().split('T')[0];
    const markdownPath = path.join(storagePath, `${dateStr}.md`);
    
    try {
      return await fs.readFile(markdownPath, 'utf-8');
    } catch {
      return null;
    }
  };

  /**
   * Search facts across all summaries
   */
  const searchFacts = async (query: string): Promise<MTMSummary[]> => {
    const summaryDates = await listSummaries();
    const results: MTMSummary[] = [];
    const queryLower = query.toLowerCase();
    
    for (const dateStr of summaryDates) {
      const summary = await getSummary(new Date(dateStr));
      if (summary) {
        // Search in extracted facts
        const factsStr = JSON.stringify(summary.extractedFacts).toLowerCase();
        const highlightsStr = summary.highlights.join(' ').toLowerCase();
        
        if (factsStr.includes(queryLower) || highlightsStr.includes(queryLower)) {
          results.push(summary);
        }
      }
    }
    
    return results;
  };
  
  return {
    summarizeDay,
    getSummary,
    getSummaryMarkdown,
    listSummaries,
    searchFacts,
    getStoragePath: () => storagePath
  };
};