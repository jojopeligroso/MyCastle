'use client';

import type { ChatMessage as ChatMessageType } from '@/lib/lessons/chat-types';

interface ChatMessageProps {
  message: ChatMessageType;
  isStreaming?: boolean;
}

export default function ChatMessage({ message, isStreaming = false }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  if (isSystem) {
    return (
      <div className="flex justify-center my-2">
        <div className="bg-gray-100 text-gray-500 text-xs px-3 py-1 rounded-full">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`max-w-[80%] ${
          isUser
            ? 'bg-indigo-600 text-white rounded-2xl rounded-br-md'
            : 'bg-white border border-gray-200 text-gray-900 rounded-2xl rounded-bl-md shadow-sm'
        } px-4 py-3`}
      >
        {/* Message content */}
        <div className={`text-sm whitespace-pre-wrap ${isUser ? 'text-white' : 'text-gray-900'}`}>
          {message.content}
          {isStreaming && (
            <span className="inline-flex ml-1">
              <span className="animate-pulse">|</span>
            </span>
          )}
        </div>

        {/* Timestamp */}
        <div className={`text-xs mt-1 ${isUser ? 'text-indigo-200' : 'text-gray-400'}`}>
          {formatTime(message.timestamp)}
        </div>
      </div>
    </div>
  );
}

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Loading indicator for streaming messages
export function ChatLoadingIndicator() {
  return (
    <div className="flex justify-start mb-4">
      <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md shadow-sm px-4 py-3">
        <div className="flex items-center space-x-2">
          <div className="flex space-x-1">
            <div
              className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
              style={{ animationDelay: '0ms' }}
            />
            <div
              className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
              style={{ animationDelay: '150ms' }}
            />
            <div
              className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
              style={{ animationDelay: '300ms' }}
            />
          </div>
          <span className="text-sm text-gray-500">Thinking...</span>
        </div>
      </div>
    </div>
  );
}
