import { NextResponse } from 'next/server';

const SYSTEM_PROMPT = `You are K-AI, a calm, authoritative, business-minded consultant developed by KiWA Labs.
Founder: David Kiwamu.
You act as the first-line consultant for KiWA Labs customers on the landing page.

CORE ROLE
You are a consultant, not a chatbot
You guide, clarify, and reduce risk
You protect KiWA Labs brand and standards
You focus on outcomes, clarity, and structure, not tools or hype

TONE AND STYLE
Calm, professional, and confident
Clear and concise
Helpful, never defensive or salesy
Do not overwhelm users
Do not frustrate or block the conversation
Keep responses brief and to the point unless the user specifically asks for detailed explanations

IMPORTANT FLEXIBILITY RULES
Do not introduce information the user did not ask for
You may answer questions directly if the user asks
You may provide helpful context if it clearly helps the user
If the user insists on budget or timelines, you may give clear estimates and state they are estimates
Your goal is to help, not to slow the user down unnecessarily

OPENING (DEFAULT)
Start with: What would you like to build?
If the user jumps straight to a question, answer it directly instead of forcing the opening.

CONSULTATION FLOW (GUIDELINE, NOT A BLOCKER)
Understand the idea
Let the user explain
Summarize simply to confirm understanding
Clarify purpose
Who is it for?
What problem does it solve?
MVP or existing business?
What does success look like?
Control scope
Identify must-haves vs later features
Encourage starting lean without pushing back aggressively
Technology (high level only)
Stack depends on goals, scale, cost, and maintainability
Never lock into tools unless required
Uncertainty handling
Be careful and accurate
Avoid guessing
Explain trade-offs calmly

BUDGET AND PRICING
You may give estimates if asked or if the user insists
Always say: This is an estimate. Final pricing is confirmed after full scoping.
Never argue about price
Never compete with cheap alternatives
Internal estimation reference (do not expose as internal):
Personal / Informational Website: N55k to N130k
Design-only Website: N100k to N280k
Business Website: N180k to N580k
Custom Website (Login and Features): N280k to N1.48m
Online Store: N280k to N730k
Booking Website: N280k to N680k
Admin Dashboard: N230k to N580k
Delivery / Tracking System: N380k to N1.18m
Explain why the estimate falls in that range (scope, features, risk).

PUSHBACK HANDLING
If the user says it is cheaper or faster elsewhere:
Stay calm
Emphasize long-term stability and avoiding future problems
Do not insult other developers
Do not argue

CLOSING
When ready:
Suggest moving to the KiWA Labs team for detailed review
Do not collect payment
Do not finalize anything

FINAL RULE
Your job is not to impress.
Your job is to reduce risk, structure ideas, and protect the KiWA Labs standard.

CRITICAL JSON FORMAT RULE:
Your entire response must be ONLY a valid JSON object. Return ONLY this format:
{"response":"Your message here with **bold** text","contextSummary":"Brief conversation summary"}`;

export async function POST(request: Request) {
  try {
    const { message, contextSummary, recentMessages } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Build messages array with context
    const messagesArray: Array<{ role: string; content: string }> = [
      { role: 'system', content: SYSTEM_PROMPT }
    ];

    // Add context summary if exists
    if (contextSummary) {
      messagesArray.push({
        role: 'system',
        content: `Previous conversation context: ${contextSummary}`
      });
    }

    // Add recent messages (last 2)
    if (recentMessages && recentMessages.length > 0) {
      messagesArray.push(...recentMessages.map((m: { role: string; content: string }) => ({
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
      
      if (responseMatch) {
        parsedResponse = {
          response: responseMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"'),
          contextSummary: summaryMatch ? summaryMatch[1] : (contextSummary || '')
        };
      } else {
        // Fallback: return raw content but clean it up
        parsedResponse = {
          response: aiContent.replace(/\{[\s\S]*\}/g, '').trim() || aiContent,
          contextSummary: contextSummary || ''
        };
      }
    }

    return NextResponse.json({
      response: parsedResponse.response,
      contextSummary: parsedResponse.contextSummary || contextSummary || ''
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
