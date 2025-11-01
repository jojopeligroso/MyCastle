'use client';

import { useState } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface Workflow {
  id: string;
  title: string;
  description: string;
  icon: string;
  prompts: string[];
}

const workflows: Workflow[] = [
  {
    id: 'manage-users',
    title: 'Manage Users',
    description: 'Create, update, or manage user accounts',
    icon: '👥',
    prompts: [
      'Create a new student account',
      'Update teacher information',
      'Deactivate a user account',
      'Bulk import users from spreadsheet',
    ],
  },
  {
    id: 'class-operations',
    title: 'Class Operations',
    description: 'Manage classes and enrollments',
    icon: '📚',
    prompts: [
      'Create a new class',
      'Assign teacher to class',
      'Enroll students in a class',
      'View class roster',
    ],
  },
  {
    id: 'attendance',
    title: 'Attendance',
    description: 'Record and manage attendance',
    icon: '✓',
    prompts: [
      'Record today\'s attendance',
      'View attendance report',
      'Mark student as excused',
      'Correct attendance record',
    ],
  },
  {
    id: 'reports',
    title: 'Reports',
    description: 'Generate and export reports',
    icon: '📈',
    prompts: [
      'Generate weekly attendance report',
      'Export class roster to Excel',
      'Create compliance report',
      'Generate student progress report',
    ],
  },
  {
    id: 'scheduling',
    title: 'Scheduling',
    description: 'Manage schedules and sessions',
    icon: '📅',
    prompts: [
      'Create class schedule',
      'View weekly timetable',
      'Reschedule a class',
      'Plan roster for next term',
    ],
  },
  {
    id: 'something-else',
    title: 'Something Else',
    description: 'Custom task or query',
    icon: '💬',
    prompts: [
      'I need help with...',
    ],
  },
];

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [isTyping, setIsTyping] = useState(false);

  const handleWorkflowSelect = (workflow: Workflow) => {
    setSelectedWorkflow(workflow);
    if (workflow.id === 'something-else') {
      // Don't auto-fill for "something else"
      return;
    }
    // Auto-populate the input with workflow context
    setInputValue(`I need help with ${workflow.title.toLowerCase()}: `);
  };

  const handlePromptSelect = (prompt: string) => {
    setInputValue(prompt);
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages([...messages, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Simulate AI response (replace with actual AI integration)
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I understand you'd like help with: "${userMessage.content}". I'm ready to assist you with this task. What specific information do you need?`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsTyping(false);
    }, 1500);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-8 border-b border-zinc-200 dark:border-zinc-800">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">Assistant</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Get help with administrative tasks and workflows
        </p>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 p-8 overflow-hidden">
        {/* Chat Interface - Left Side (2/3 width) */}
        <div className="lg:col-span-2 flex flex-col bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-center">
                <div>
                  <div className="text-6xl mb-4">🤖</div>
                  <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                    How can I help you today?
                  </h3>
                  <p className="text-zinc-600 dark:text-zinc-400">
                    Select a workflow on the right or ask me anything
                  </p>
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-3 ${
                      message.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    <p
                      className={`text-xs mt-1 ${
                        message.role === 'user'
                          ? 'text-blue-100'
                          : 'text-zinc-500 dark:text-zinc-400'
                      }`}
                    >
                      {message.timestamp.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              ))
            )}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-zinc-100 dark:bg-zinc-800 rounded-lg px-4 py-3">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="border-t border-zinc-200 dark:border-zinc-800 p-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Tell me what you'd like to do..."
                className="flex-1 px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500"
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputValue.trim()}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                Send
              </button>
            </div>
          </div>
        </div>

        {/* Workflow Selector - Right Side (1/3 width) */}
        <div className="lg:col-span-1 space-y-4 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
              Common Workflows
            </h2>
            <div className="space-y-3">
              {workflows.map((workflow) => (
                <div key={workflow.id} className="space-y-2">
                  <button
                    onClick={() => handleWorkflowSelect(workflow)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      selectedWorkflow?.id === workflow.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                        : 'border-zinc-200 dark:border-zinc-700 hover:border-blue-300 dark:hover:border-blue-700'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{workflow.icon}</span>
                      <div className="flex-1">
                        <h3 className="font-medium text-zinc-900 dark:text-zinc-100">
                          {workflow.title}
                        </h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                          {workflow.description}
                        </p>
                      </div>
                    </div>
                  </button>

                  {selectedWorkflow?.id === workflow.id && workflow.id !== 'something-else' && (
                    <div className="ml-11 space-y-1">
                      {workflow.prompts.map((prompt, idx) => (
                        <button
                          key={idx}
                          onClick={() => handlePromptSelect(prompt)}
                          className="w-full text-left px-3 py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded transition-colors"
                        >
                          • {prompt}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
