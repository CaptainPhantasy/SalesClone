# ConversationAgent - Example Conversations

**Created**: 2025-10-01T12:45:00Z
**Author**: LegacyAI Conversation Agent Builder

This document demonstrates real-world conversation flows handled by the ConversationAgent.

---

## Example 1: Customer Product Inquiry (Happy Path)

### Conversation Flow

```
User (confidence: 0.95): "I need help with my order"
  ↓
[ConversationAgent Processing]
  - Validates confidence >= 0.5 ✓
  - Retrieves conversation context from database
  - Builds message array with last 10 messages
  - Calls Claude API with system prompt
  ↓
Claude Response: "I can help you with your order. What seems to be the issue?"
  ↓
[Post-Processing]
  - Logs user message to database
  - Logs assistant response to database
  - Analyzes sentiment: { score: 0, label: 'neutral' }
  - Updates conversation sentiment in database
  - Generates TwiML response
  ↓
TwiML Output:
<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">I can help you with your order. What seems to be the issue?</Say>
  <Gather input="speech" timeout="3" speechTimeout="auto" action="/webhooks/process-speech" method="POST">
    <Say voice="alice">Is there anything else I can help you with?</Say>
  </Gather>
  <Say voice="alice">Thank you for calling. Goodbye!</Say>
  <Hangup/>
</Response>
```

### Database Entries Created

**messages table:**
```json
[
  {
    "conversation_id": "conv-uuid-123",
    "role": "user",
    "content": "I need help with my order",
    "metadata": {
      "confidence": 0.95,
      "phoneNumber": "+1234567890"
    },
    "timestamp": "2025-10-01T12:30:00Z"
  },
  {
    "conversation_id": "conv-uuid-123",
    "role": "assistant",
    "content": "I can help you with your order. What seems to be the issue?",
    "metadata": {
      "model": "claude-3-opus-20240229",
      "tokensUsed": 25,
      "latencyMs": 150
    },
    "timestamp": "2025-10-01T12:30:00.150Z"
  }
]
```

**conversations table update:**
```json
{
  "id": "conv-uuid-123",
  "sentiment_score": 0,
  "escalated": false,
  "last_activity": "2025-10-01T12:30:00.150Z"
}
```

---

## Example 2: Escalation Trigger (Frustrated Customer)

### Conversation Flow

```
User (confidence: 0.92): "This is terrible! I want to speak to a manager!"
  ↓
[ConversationAgent Processing]
  - Validates confidence >= 0.5 ✓
  - Retrieves conversation context (includes previous complaints)
  - Calls Claude API with context
  ↓
Claude Response: "I sincerely apologize for the frustration. Let me connect you with a supervisor who can better assist you."
  ↓
[Post-Processing]
  - Logs messages to database
  - Analyzes sentiment:
    {
      score: -0.66,
      label: 'negative',
      needsEscalation: true,
      confidence: 0.8,
      details: {
        positiveCount: 0,
        negativeCount: 2,
        escalationCount: 2
      }
    }
  - Updates conversation: escalated=true
  - Generates TwiML response
  ↓
TwiML Output:
<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">I sincerely apologize for the frustration. Let me connect you with a supervisor who can better assist you.</Say>
  <Gather input="speech" timeout="3" speechTimeout="auto" action="/webhooks/process-speech" method="POST">
    <Say voice="alice">Is there anything else I can help you with?</Say>
  </Gather>
  <Say voice="alice">Thank you for calling. Goodbye!</Say>
  <Hangup/>
</Response>
```

### Alert Triggered

```
🚨 ESCALATION ALERT
Conversation: conv-uuid-123
Sentiment: -0.66 (negative)
Triggers: ["speak", "manager"]
Action: Flag for human intervention
```

---

## Example 3: Low Confidence Speech (Error Handling)

### Conversation Flow

```
User (confidence: 0.35): "[unclear/garbled audio]"
  ↓
[ConversationAgent Processing]
  - Validates confidence >= 0.5 ✗
  - Confidence too low (0.35 < 0.5)
  - Skip AI processing
  - Return repeat request
  ↓
TwiML Output:
<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">I'm sorry, I didn't quite catch that. Could you please repeat?</Say>
  <Gather input="speech" timeout="3" speechTimeout="auto" action="/webhooks/process-speech" method="POST"/>
  <Say voice="alice">I didn't hear anything. Goodbye!</Say>
  <Hangup/>
</Response>
```

**Note**: No database logging or AI processing occurs for low-confidence speech to avoid polluting conversation history.

---

## Example 4: Multi-Turn Conversation with Context

### Conversation Flow

```
Turn 1:
User: "What are your business hours?"
Claude: "We're open Monday through Friday, 9 AM to 6 PM EST. Is there anything specific you need help with during those hours?"

Turn 2:
User: "Can I schedule a callback for tomorrow?"
[Context includes Turn 1 messages]
Claude: "Of course! I can schedule a callback for you tomorrow during our business hours. What time works best for you between 9 AM and 6 PM?"

Turn 3:
User: "How about 2 PM?"
[Context includes Turn 1 & 2 messages]
Claude: "Perfect! I've noted your callback request for tomorrow at 2 PM EST. You'll receive a call from our team. Is there anything else?"
```

### Context Management

**Active Session Cache:**
```javascript
{
  conversationId: "conv-uuid-456",
  callSid: "CA789012",
  phoneNumber: "+1234567890",
  messages: [
    { role: 'user', content: 'What are your business hours?' },
    { role: 'assistant', content: "We're open Monday through Friday..." },
    { role: 'user', content: 'Can I schedule a callback for tomorrow?' },
    { role: 'assistant', content: "Of course! I can schedule..." },
    { role: 'user', content: 'How about 2 PM?' },
    { role: 'assistant', content: "Perfect! I've noted..." }
  ],
  metadata: { source: 'inbound' },
  startedAt: '2025-10-01T14:00:00Z'
}
```

**Maximum Context**: Only last 10 messages included to optimize token usage and response time.

---

## Example 5: Positive Customer Feedback

### Conversation Flow

```
User (confidence: 0.98): "This service is excellent! I love how helpful you are!"
  ↓
[ConversationAgent Processing]
  - Validates confidence >= 0.5 ✓
  - Retrieves context
  - Calls Claude API
  ↓
Claude Response: "Thank you so much for the kind words! We're delighted to help. Is there anything else you need today?"
  ↓
[Post-Processing]
  - Logs messages
  - Analyzes sentiment:
    {
      score: 0.75,
      label: 'positive',
      needsEscalation: false,
      confidence: 1.0,
      details: {
        positiveCount: 3,
        negativeCount: 0,
        escalationCount: 0
      }
    }
  - Updates conversation sentiment
```

---

## Example 6: API Error Graceful Degradation

### Conversation Flow

```
User (confidence: 0.90): "What's my account balance?"
  ↓
[ConversationAgent Processing]
  - Validates confidence ✓
  - Retrieves context ✓
  - Calls Claude API → ERROR (API timeout)
  ↓
[Error Handling]
  - Catches API error
  - Returns fallback response
  ↓
Fallback Response: "I apologize, but I'm having trouble processing that right now. Could you please try again?"
  ↓
TwiML Output:
<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">I apologize, but I'm having trouble processing that right now. Could you please try again?</Say>
  <Gather input="speech" timeout="3" speechTimeout="auto" action="/webhooks/process-speech" method="POST">
    <Say voice="alice">Is there anything else I can help you with?</Say>
  </Gather>
  <Say voice="alice">Thank you for calling. Goodbye!</Say>
  <Hangup/>
</Response>
```

**Error Logged:**
```
[2025-10-01T15:30:45.123Z] [ERROR] [ConversationAgent] [req-uuid-789] Failed to generate AI response Error: API timeout
```

---

## Performance Metrics

### Typical Response Times

| Operation | Average Latency | Notes |
|-----------|----------------|-------|
| Speech validation | < 1ms | In-memory check |
| Context retrieval (cached) | < 1ms | Map lookup |
| Context retrieval (database) | 50-100ms | Supabase query |
| Claude API call | 150-300ms | Depends on response length |
| Message logging | 20-50ms | Async database insert |
| Sentiment analysis | < 5ms | Keyword matching |
| TwiML generation | < 1ms | String template |
| **Total (cached context)** | **~200-400ms** | - |
| **Total (database context)** | **~250-500ms** | - |

### Token Usage

| Operation | Typical Tokens | Max Tokens |
|-----------|---------------|------------|
| System prompt | ~40 | 40 |
| Context (10 messages) | ~200-400 | ~500 |
| User input | ~10-50 | ~100 |
| AI response | ~30-100 | 150 |
| **Total per interaction** | **~280-590** | **~790** |

### Cost Estimation (Claude Opus)

- Input: $15 per 1M tokens
- Output: $75 per 1M tokens
- Average cost per interaction: **~$0.01 - $0.02**

---

## Integration Points

### Database Integration
```javascript
// Message logging
await dbService.createMessage(conversationId, 'user', content, metadata);

// Conversation updates
await dbService.updateConversation(conversationId, {
  sentiment_score: sentiment.score,
  escalated: sentiment.needsEscalation
});

// Context retrieval
const messages = await dbService.getConversationMessages(conversationId, {
  limit: 10,
  order: 'asc'
});
```

### Twilio Integration
```javascript
// Incoming webhook: /webhooks/process-speech
POST /webhooks/process-speech
Body: {
  CallSid: "CA123456",
  SpeechResult: "I need help",
  Confidence: 0.95,
  From: "+1234567890"
}

Response: TwiML XML
Content-Type: application/xml
```

### AI Service Integration
```javascript
// Claude API call
const response = await anthropicService.generateResponse(
  messages,
  VOICE_ASSISTANT_SYSTEM_PROMPT,
  { maxTokens: 150, temperature: 0.7 }
);

// Usage tracking
const stats = anthropicService.getUsageStats();
// { totalRequests: 100, totalTokens: 25000, errorRate: 0.02 }
```

---

## Testing Examples

### Unit Test Example
```javascript
test('should process speech successfully with valid input', async () => {
  const speechData = {
    CallSid: 'CA123456',
    SpeechResult: 'I need help with my order',
    Confidence: 0.95,
    From: '+1234567890',
  };

  const result = await agent.processSpeech(speechData);

  expect(result.success).toBe(true);
  expect(result.data.aiResponse).toBeDefined();
  expect(result.data.twiml).toContain('<Say voice="alice">');
  expect(result.data.sentiment).toBeDefined();
});
```

### Integration Test Example
```javascript
test('end-to-end conversation flow', async () => {
  // 1. Initialize agent
  await agent.initialize();

  // 2. Process first message
  const turn1 = await agent.processSpeech({
    CallSid: 'CA123',
    SpeechResult: 'Hello',
    Confidence: 0.95
  });
  expect(turn1.success).toBe(true);

  // 3. Process second message with context
  const turn2 = await agent.processSpeech({
    CallSid: 'CA123',
    SpeechResult: 'I need information',
    Confidence: 0.92
  });
  expect(turn2.success).toBe(true);

  // Context should include previous messages
  expect(agent.activeSessions.has('CA123')).toBe(true);
});
```

---

## Best Practices

### 1. Always Validate Speech Confidence
```javascript
if (Confidence < MIN_SPEECH_CONFIDENCE) {
  return generateRepeatRequestTwiML();
}
```

### 2. Use Session Caching for Performance
```javascript
// First call: fetches from database
const context1 = await getConversationContext(callSid);

// Subsequent calls: uses cached version
const context2 = await getConversationContext(callSid);
```

### 3. Keep Voice Responses Concise
```javascript
const MAX_VOICE_RESPONSE_TOKENS = 150; // ~2-3 sentences
```

### 4. Monitor Sentiment for Escalation
```javascript
if (sentiment.needsEscalation) {
  await flagForHumanIntervention(conversationId);
}
```

### 5. Graceful Error Handling
```javascript
try {
  const response = await generateResponse(input, context);
} catch (error) {
  return fallbackResponse(); // Never fail silently
}
```

---

## Monitoring & Observability

### Logged Events

1. **Speech Processing**: CallSid, confidence, sentiment
2. **AI Calls**: Model, tokens, latency, request ID
3. **Database Operations**: Operation type, latency, success/failure
4. **Errors**: Full context, stack trace, request ID
5. **Escalations**: Sentiment scores, trigger words

### Example Log Output
```
[2025-10-01T12:30:00.000Z] [INFO] [ConversationAgent] Processing speech - CallSid: CA123456, Confidence: 0.95
[2025-10-01T12:30:00.050Z] [INFO] [ConversationAgent] Getting conversation context for call: CA123456
[2025-10-01T12:30:00.120Z] [INFO] [AnthropicService] [req-abc123] Generating response - Messages: 3
[2025-10-01T12:30:00.280Z] [INFO] [AnthropicService] [req-abc123] Response generated in 160ms - Input tokens: 250, Output tokens: 45
[2025-10-01T12:30:00.300Z] [INFO] [ConversationAgent] Logging user message to conversation: conv-uuid-123
[2025-10-01T12:30:00.350Z] [INFO] [ConversationAgent] Speech processed successfully in 350ms - Sentiment: 0.00
```

---

**End of Examples Document**
