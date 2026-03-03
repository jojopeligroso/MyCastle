/**
 * Lesson Planner Chat API
 * POST /api/lessons/chat
 * Streaming chat endpoint for lesson planning refinement
 */

import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth/utils';
import OpenAI from 'openai';
import { buildChatSystemPrompt } from '@/lib/lessons/system-prompts';
import type { ChatContext } from '@/lib/lessons/chat-types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getOpenAI() {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'test-key',
  });
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth(['teacher', 'admin', 'dos']);

    const body = await request.json();
    const { message, context } = body as {
      message: string;
      context: ChatContext;
    };

    if (!message?.trim()) {
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const openai = getOpenAI();

    // Build conversation history for OpenAI
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: buildChatSystemPrompt(context),
      },
    ];

    // Add previous messages from context
    if (context.messages) {
      for (const msg of context.messages) {
        if (msg.role === 'user' || msg.role === 'assistant') {
          messages.push({
            role: msg.role,
            content: msg.content,
          });
        }
      }
    }

    // Add the new user message
    messages.push({
      role: 'user',
      content: message,
    });

    // Create streaming response
    const stream = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.7,
      max_tokens: 1000,
      stream: true,
    });

    // Create a readable stream for the response
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              controller.enqueue(encoder.encode(content));
            }
          }
          controller.close();
        } catch (error) {
          console.error('Streaming error:', error);
          controller.error(error);
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);

    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Failed to process chat message' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
