'use client';

import { useState, useRef, useEffect } from 'react';
import ChatMessage, { ChatLoadingIndicator } from './ChatMessage';
import type {
  ChatMessage as ChatMessageType,
  ChatContext,
  SpeakoutContext,
  TeacherIntent,
} from '@/lib/lessons/chat-types';

interface LessonChatInterfaceProps {
  speakoutContext: SpeakoutContext | null;
  intent: TeacherIntent | null;
  onGeneratePlan: (context: ChatContext) => void;
  onContextUpdate?: (context: ChatContext) => void;
}

export default function LessonChatInterface({
  speakoutContext,
  intent,
  onGeneratePlan,
  onContextUpdate,
}: LessonChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Initial greeting message
  useEffect(() => {
    if (speakoutContext && intent && messages.length === 0) {
      const greeting: ChatMessageType = {
        id: 'greeting',
        role: 'assistant',
        content: buildGreetingMessage(speakoutContext, intent),
        timestamp: new Date(),
      };
      setMessages([greeting]);
    }
  }, [speakoutContext, intent, messages.length]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  // Build current context
  const buildContext = (): ChatContext => ({
    speakout: speakoutContext,
    intent,
    messages,
  });

  // Notify parent of context updates
  useEffect(() => {
    if (onContextUpdate && messages.length > 0) {
      onContextUpdate({
        speakout: speakoutContext,
        intent,
        messages,
      });
    }
  }, [messages, speakoutContext, intent, onContextUpdate]);

  // Send message
  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: ChatMessageType = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setStreamingContent('');

    try {
      const response = await fetch('/api/lessons/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          context: {
            speakout: speakoutContext,
            intent,
            messages: [...messages, userMessage],
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        let fullContent = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          fullContent += chunk;
          setStreamingContent(fullContent);
        }

        // Add the complete assistant message
        const assistantMessage: ChatMessageType = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: fullContent,
          timestamp: new Date(),
        };

        setMessages(prev => [...prev, assistantMessage]);
        setStreamingContent('');
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessageType = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content:
          "I'm sorry, I encountered an error. Please try again or click 'Generate Plan' if you're ready to proceed.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Generate plan
  const handleGeneratePlan = () => {
    onGeneratePlan(buildContext());
  };

  return (
    <div className="flex flex-col h-full">
      {/* Context sidebar - visible on larger screens */}
      <div className="flex flex-1 overflow-hidden">
        {/* Chat area */}
        <div className="flex-1 flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
            {messages.map(message => (
              <ChatMessage key={message.id} message={message} />
            ))}
            {isLoading && !streamingContent && <ChatLoadingIndicator />}
            {streamingContent && (
              <ChatMessage
                message={{
                  id: 'streaming',
                  role: 'assistant',
                  content: streamingContent,
                  timestamp: new Date(),
                }}
                isStreaming
              />
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="border-t border-gray-200 bg-white p-4">
            <div className="flex items-end space-x-3">
              <div className="flex-1">
                <textarea
                  ref={inputRef}
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Describe your class needs, ask questions, or discuss activities..."
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                  disabled={isLoading}
                />
              </div>
              <button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isLoading}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
              </button>
            </div>

            {/* Generate Plan button */}
            <div className="mt-3 flex justify-end">
              <button
                onClick={handleGeneratePlan}
                disabled={messages.length < 2}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
              >
                Generate Lesson Plan
              </button>
            </div>
          </div>
        </div>

        {/* Context sidebar */}
        <div className="hidden lg:block w-72 border-l border-gray-200 bg-white overflow-y-auto">
          <div className="p-4">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
              Lesson Context
            </h3>

            {speakoutContext && (
              <div className="mt-4 space-y-3">
                <div>
                  <span className="text-xs font-medium text-gray-500">
                    Book
                  </span>
                  <p className="text-sm text-gray-900">{speakoutContext.book}</p>
                </div>
                <div>
                  <span className="text-xs font-medium text-gray-500">
                    Unit
                  </span>
                  <p className="text-sm text-gray-900">{speakoutContext.unit}</p>
                </div>
                <div>
                  <span className="text-xs font-medium text-gray-500">
                    Lesson
                  </span>
                  <p className="text-sm text-gray-900">
                    {speakoutContext.lesson}
                  </p>
                </div>
                <div>
                  <span className="text-xs font-medium text-gray-500">
                    CEFR Level
                  </span>
                  <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {speakoutContext.level}
                  </span>
                </div>

                {/* Learning Objectives */}
                <div className="mt-4">
                  <span className="text-xs font-medium text-gray-500">
                    Learning Objectives
                  </span>
                  <ul className="mt-2 space-y-2">
                    {speakoutContext.descriptors.slice(0, 4).map((d, idx) => (
                      <li key={idx} className="text-xs text-gray-600">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 mr-1">
                          {d.skillFocus}
                        </span>
                        <span className="line-clamp-2">{d.descriptorText}</span>
                      </li>
                    ))}
                    {speakoutContext.descriptors.length > 4 && (
                      <li className="text-xs text-gray-400">
                        +{speakoutContext.descriptors.length - 4} more...
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            )}

            {intent && (
              <div className="mt-6">
                <span className="text-xs font-medium text-gray-500">
                  Your Approach
                </span>
                <p className="text-sm text-gray-900 capitalize mt-1">
                  {intent === 'follow' && 'Following Speakout'}
                  {intent === 'deviate' && 'Deviating from Speakout'}
                  {intent === 'supplement' && 'Supplementing Speakout'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function buildGreetingMessage(
  context: SpeakoutContext,
  intent: TeacherIntent
): string {
  const intentText = {
    follow: "follow the Speakout lesson as designed",
    deviate: "create a custom lesson based on the Speakout objectives",
    supplement: "enhance the Speakout lesson with additional activities",
  };

  return `Great! I'll help you ${intentText[intent]} for "${context.lesson}" (${context.level}).

This lesson covers ${context.descriptors.length} learning objective(s) focusing on ${[...new Set(context.descriptors.map(d => d.skillFocus))].join(', ')}.

Tell me about your class:
- How many students do you have?
- Are there any specific challenges or interests I should know about?
- How much time do you have for this lesson?
- Any materials or activities you'd like to include or avoid?

Once we've discussed your needs, click "Generate Lesson Plan" when you're ready.`;
}
