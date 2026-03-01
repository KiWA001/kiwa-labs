import { NextResponse } from 'next/server';

const SYSTEM_PROMPT = `You are K-AI, a calm, authoritative, business-minded sales representative developed by KiWA Labs.
Founder: David Kiwamu.
You act as the first-line sales contact for KiWA Labs customers on the landing page.

CORE ROLE
You are a sharp, concise sales representative, not a long-winded consultant.
You guide, clarify, and qualify leads while protecting KiWA Labs brand and standards.
You focus on outcomes, clarity, and structure, not tools or hype.

TONE AND STYLE
Calm, professional, and confident, but direct and punchy.
Very concise. Keep your messages short. Do not send long essays.
Helpful and sales-oriented, but never desperate.
Do not overwhelm users.
NEVER ask more than ONE question per message.
Do not frustrate or block the conversation.
Keep responses brief and to the point.
Use proper formatting with line breaks for readability.
Do NOT use numbered lists or bullet points that extend beyond the container width.

IMPORTANT FLEXIBILITY RULES
Do not introduce information the user did not ask for.
You may answer questions directly if the user asks.
Your goal is to qualify the lead and help, not to slow the user down unnecessarily.

AUTOMATIC HANDOFF TRIGGER - CRITICAL
If the user says ANYTHING similar to these phrases, immediately set readyForHandoff to true:
- "talk to a human"
- "chat with admin" 
- "connect me with support"
- "speak to someone"
- "customer support"
- "technical support"
- "talk to a person"
- "human agent"
- "real person"
- "support team"
- "help desk"
- "contact support"
- "need help from team"
- "escalate this"
- "manager"
- "expert"
- "specialist"
- Any variation of wanting human assistance

When triggered, respond with:
"Tap the button below to connect to our team. They'll be able to assist you better with this."

OPENING (DEFAULT)
Start with: Hello, welcome to KiWA Labs. You can reach us directly at info@kiwalabs.dev, or tell me a bit about what you'd like to build and I can guide you.
If the user jumps straight to a question, answer it directly instead of forcing the opening.

CONSULTATION FLOW (GUIDELINE, NOT A BLOCKER)

Phase 1: Discovery (Exactly 3 exchanges)
- Your goal is to use exactly 3 exchanges to ask the 3 most important qualifying questions.
- Ask ONLY ONE key qualifying question per response.
- By the end of the 3 exchanges, you must understand:
  1. What they are building.
  2. Who the target audience is.
  3. What are the main features they need.

Phase 2: Human Handoff Trigger (Trigger exactly after the 3rd exchange)
Once you have gathered the 3 critical points above across 3 exchanges, DO NOT drag the conversation out. Say something like:
"Perfect! I've gathered the key details about your project. Based on what you've shared, this looks like an exciting opportunity for KiWA Labs. 

Our senior developers and project leads will analyze your requirements in detail and provide a comprehensive proposal.

Would you like me to connect you with the KiWA Labs team now?"

BUDGET AND PRICING - CRITICAL RULE
You may give estimates if asked or if the user insists.
Whenever you mention ANY price, you MUST explicitly state that it is ONLY an estimate, and that final pricing is confirmed after full scoping.
Never argue about price.
Never compete with cheap alternatives.
Internal estimation reference (do not expose as internal):
Personal / Informational Website: N55k to N130k
Design-only Website: N100k to N280k
Business Website: N180k to N580k
Custom Website (Login and Features): N280k to N1.48m
Online Store: N280k to N730k
Booking Website: N280k to N680k
Admin Dashboard: N230k to N580k
Delivery / Tracking System: N380k to N1.18m

PUSHBACK HANDLING
If the user says it is cheaper or faster elsewhere:
Stay calm. Emphasize long-term stability and avoiding future problems.
Do not insult other developers. Do not argue.

REMEMBER
Keep messages short and punchy like a text message from a professional salesperson.
Don't rush to handoff, but be efficient.
Be conversational, not robotic.

CRITICAL JSON FORMAT RULE:
Your entire response must be ONLY a valid JSON object. Return ONLY this format:
{"response":"Your message here with **bold** text","contextSummary":"Brief conversation summary","readyForHandoff":false}

The readyForHandoff field should be true ONLY when you have gathered sufficient information OR when the user explicitly requests human assistance.`;

// Keywords that trigger automatic handoff
const HANDOFF_KEYWORDS = [
  'human', 'admin', 'support', 'person', 'agent', 'manager', 
  'expert', 'specialist', 'team', 'help desk', 'escalate',
  'talk to', 'speak to', 'chat with', 'connect with', 'contact',
  'real person', 'human agent', 'customer service', 'technical support',
  'not a bot', 'live agent', 'representative'
];

function checkForHandoffIntent(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  return HANDOFF_KEYWORDS.some(keyword => lowerMessage.includes(keyword.toLowerCase()));
}

// Function to summarize older messages if over 50
function summarizeConversation(messages: Array<{role: string, content: string}>): Array<{role: string, content: string}> {
  const MAX_MESSAGES = 50;
  
  if (messages.length <= MAX_MESSAGES) {
    return messages;
  }
  
  // Keep first 5 messages and last 45 messages
  const firstMessages = messages.slice(0, 5);
  const lastMessages = messages.slice(-45);
  
  // Create summary of middle messages
  const middleMessages = messages.slice(5, -45);
  const summaryContent = `[Previous ${middleMessages.length} messages summarized: ${middleMessages.map(m => m.content.substring(0, 50)).join(' | ')}...]`;
  
  return [
    ...firstMessages,
    { role: 'system', content: summaryContent },
    ...lastMessages
  ];
}

export async function POST(request: Request) {
  try {
    const { message, fullConversation, sessionId } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Check for automatic handoff trigger
    const autoHandoff = checkForHandoffIntent(message);

    // Process conversation history (limit to 50 messages with summarization)
    let processedConversation = fullConversation || [];
    if (processedConversation.length > 50) {
      processedConversation = summarizeConversation(processedConversation);
    }

    // Build messages array with full conversation history
    const messagesArray: Array<{ role: string; content: string }> = [
      { role: 'system', content: SYSTEM_PROMPT }
    ];

    // Add processed conversation history
    if (processedConversation && processedConversation.length > 0) {
      messagesArray.push(...processedConversation.map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content
      })));
    }

    // Add current user message
    messagesArray.push({
      role: 'user',
      content: message
    });

    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer lzWRBwuWxwTGkihMcR4jCicHNpFGiKmA',
      },
      body: JSON.stringify({
        model: 'mistral-tiny',
        messages: messagesArray,
        max_tokens: 1500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Mistral API error:', errorData);
      return NextResponse.json(
        { error: 'Failed to get response from AI' },
        { status: 500 }
      );
    }

    const data = await response.json();
    const aiContent = data.choices[0]?.message?.content || '';

    // Parse JSON response
    let parsedResponse;
    try {
      // Try to find JSON in the response (in case there's extra text)
      const jsonMatch = aiContent.match(/\{[\s\S]*?\}/);
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[0]);
      } else {
        parsedResponse = JSON.parse(aiContent);
      }
      
      // Ensure we have the required fields
      if (!parsedResponse.response) {
        throw new Error('No response field in JSON');
      }
    } catch (e) {
      // If JSON parsing fails, extract text between quotes or use raw content
      const responseMatch = aiContent.match(/"response"\s*:\s*"([^"]+)"/);
      const summaryMatch = aiContent.match(/"contextSummary"\s*:\s*"([^"]+)"/);
      const handoffMatch = aiContent.match(/"readyForHandoff"\s*:\s*(true|false)/);
      
      if (responseMatch) {
        parsedResponse = {
          response: responseMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"'),
          contextSummary: summaryMatch ? summaryMatch[1] : '',
          readyForHandoff: handoffMatch ? handoffMatch[1] === 'true' : false
        };
      } else {
        // Fallback: return raw content but clean it up
        parsedResponse = {
          response: aiContent.replace(/\{[\s\S]*\}/g, '').trim() || aiContent,
          contextSummary: '',
          readyForHandoff: autoHandoff // Use auto-detection if parsing fails
        };
      }
    }

    // Override with auto-detection if keywords found
    if (autoHandoff) {
      parsedResponse.readyForHandoff = true;
      if (!parsedResponse.response.includes('connect you with our team')) {
        parsedResponse.response = "I'll connect you with our team right away. They'll be able to assist you better with this.";
      }
    }

    return NextResponse.json({
      response: parsedResponse.response,
      contextSummary: parsedResponse.contextSummary || '',
      readyForHandoff: parsedResponse.readyForHandoff || false,
      sessionId: sessionId || null,
      messageCount: processedConversation.length
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
