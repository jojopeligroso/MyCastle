/**
 * Session Manager
 *
 * Manages AI chat sessions including creation, retrieval, and conversation history
 */

import { v4 as uuidv4 } from 'uuid';
import {
  Session,
  ConversationMessage,
  UserRole,
  MCPError,
  MCPErrorCode,
  Logger,
} from './types';

export interface SessionManagerConfig {
  maxHistoryLength?: number;
  inactivityTimeout?: number; // milliseconds
  logger?: Logger;
}

export class SessionManager {
  private sessions: Map<string, Session> = new Map();
  private userSessions: Map<string, Set<string>> = new Map();
  private config: Required<SessionManagerConfig>;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(config: SessionManagerConfig = {}) {
    this.config = {
      maxHistoryLength: config.maxHistoryLength ?? 100,
      inactivityTimeout: config.inactivityTimeout ?? 30 * 60 * 1000, // 30 minutes
      logger: config.logger ?? this.createDefaultLogger(),
    };

    // Start cleanup interval
    this.startCleanupInterval();
  }

  /**
   * Start a new AI chat session for a user
   */
  async startSession(userId: string, role: UserRole, metadata?: Record<string, any>): Promise<Session> {
    this.config.logger.info(`Starting new session for user ${userId} with role ${role}`);

    const session: Session = {
      id: uuidv4(),
      userId,
      role,
      createdAt: new Date(),
      lastActivity: new Date(),
      conversationHistory: [],
      metadata: metadata || {},
    };

    this.sessions.set(session.id, session);

    // Track user sessions
    if (!this.userSessions.has(userId)) {
      this.userSessions.set(userId, new Set());
    }
    this.userSessions.get(userId)!.add(session.id);

    this.config.logger.info(`Session created: ${session.id}`);
    return session;
  }

  /**
   * End a session and clean up resources
   */
  async endSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new MCPError(
        `Session not found: ${sessionId}`,
        MCPErrorCode.SessionNotFound
      );
    }

    this.config.logger.info(`Ending session: ${sessionId}`);

    // Remove from user sessions
    const userSessionSet = this.userSessions.get(session.userId);
    if (userSessionSet) {
      userSessionSet.delete(sessionId);
      if (userSessionSet.size === 0) {
        this.userSessions.delete(session.userId);
      }
    }

    // Remove session
    this.sessions.delete(sessionId);

    this.config.logger.info(`Session ended: ${sessionId}`);
  }

  /**
   * Get a session by ID
   */
  getSession(sessionId: string): Session | null {
    const session = this.sessions.get(sessionId);
    if (session) {
      // Update last activity
      session.lastActivity = new Date();
    }
    return session || null;
  }

  /**
   * Get all sessions for a user
   */
  getUserSessions(userId: string): Session[] {
    const sessionIds = this.userSessions.get(userId);
    if (!sessionIds) {
      return [];
    }

    return Array.from(sessionIds)
      .map((id) => this.sessions.get(id))
      .filter((session): session is Session => session !== undefined);
  }

  /**
   * Add a message to the conversation history
   */
  addMessage(sessionId: string, message: Omit<ConversationMessage, 'id' | 'timestamp'>): ConversationMessage {
    const session = this.getSession(sessionId);
    if (!session) {
      throw new MCPError(
        `Session not found: ${sessionId}`,
        MCPErrorCode.SessionNotFound
      );
    }

    const conversationMessage: ConversationMessage = {
      id: uuidv4(),
      timestamp: new Date(),
      ...message,
    };

    session.conversationHistory.push(conversationMessage);

    // Trim history if it exceeds max length
    if (session.conversationHistory.length > this.config.maxHistoryLength) {
      const excess = session.conversationHistory.length - this.config.maxHistoryLength;
      session.conversationHistory.splice(0, excess);
      this.config.logger.debug(`Trimmed ${excess} messages from session ${sessionId} history`);
    }

    return conversationMessage;
  }

  /**
   * Get conversation history for a session
   */
  getConversationHistory(sessionId: string, limit?: number): ConversationMessage[] {
    const session = this.getSession(sessionId);
    if (!session) {
      throw new MCPError(
        `Session not found: ${sessionId}`,
        MCPErrorCode.SessionNotFound
      );
    }

    const history = session.conversationHistory;
    if (limit && limit > 0) {
      return history.slice(-limit);
    }

    return [...history];
  }

  /**
   * Clear conversation history for a session
   */
  clearHistory(sessionId: string): void {
    const session = this.getSession(sessionId);
    if (!session) {
      throw new MCPError(
        `Session not found: ${sessionId}`,
        MCPErrorCode.SessionNotFound
      );
    }

    session.conversationHistory = [];
    this.config.logger.info(`Cleared conversation history for session ${sessionId}`);
  }

  /**
   * Update session metadata
   */
  updateMetadata(sessionId: string, metadata: Record<string, any>): void {
    const session = this.getSession(sessionId);
    if (!session) {
      throw new MCPError(
        `Session not found: ${sessionId}`,
        MCPErrorCode.SessionNotFound
      );
    }

    session.metadata = { ...session.metadata, ...metadata };
  }

  /**
   * Get all active sessions
   */
  getAllSessions(): Session[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Get session statistics
   */
  getStats() {
    return {
      totalSessions: this.sessions.size,
      totalUsers: this.userSessions.size,
      sessionsByRole: this.getSessionsByRole(),
    };
  }

  /**
   * Clean up inactive sessions
   */
  private cleanupInactiveSessions(): void {
    const now = Date.now();
    const sessionsToRemove: string[] = [];

    for (const [sessionId, session] of this.sessions.entries()) {
      const inactiveTime = now - session.lastActivity.getTime();
      if (inactiveTime > this.config.inactivityTimeout) {
        sessionsToRemove.push(sessionId);
      }
    }

    for (const sessionId of sessionsToRemove) {
      this.config.logger.info(`Cleaning up inactive session: ${sessionId}`);
      this.endSession(sessionId).catch((error) => {
        this.config.logger.error(`Error cleaning up session ${sessionId}:`, error);
      });
    }

    if (sessionsToRemove.length > 0) {
      this.config.logger.info(`Cleaned up ${sessionsToRemove.length} inactive sessions`);
    }
  }

  /**
   * Start the cleanup interval
   */
  private startCleanupInterval(): void {
    // Run cleanup every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupInactiveSessions();
    }, 5 * 60 * 1000);
  }

  /**
   * Stop the cleanup interval and clean up resources
   */
  async shutdown(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.config.logger.info('SessionManager shutting down...');

    // End all active sessions
    const sessionIds = Array.from(this.sessions.keys());
    for (const sessionId of sessionIds) {
      await this.endSession(sessionId).catch((error) => {
        this.config.logger.error(`Error ending session ${sessionId} during shutdown:`, error);
      });
    }

    this.sessions.clear();
    this.userSessions.clear();

    this.config.logger.info('SessionManager shutdown complete');
  }

  /**
   * Get sessions grouped by role
   */
  private getSessionsByRole(): Record<UserRole, number> {
    const result: Record<UserRole, number> = {
      student: 0,
      teacher: 0,
      admin: 0,
    };

    for (const session of this.sessions.values()) {
      result[session.role]++;
    }

    return result;
  }

  /**
   * Create a default console logger
   */
  private createDefaultLogger(): Logger {
    return {
      debug: (message: string, meta?: any) => {
        console.debug(`[SessionManager] ${message}`, meta || '');
      },
      info: (message: string, meta?: any) => {
        console.info(`[SessionManager] ${message}`, meta || '');
      },
      warn: (message: string, meta?: any) => {
        console.warn(`[SessionManager] ${message}`, meta || '');
      },
      error: (message: string, meta?: any) => {
        console.error(`[SessionManager] ${message}`, meta || '');
      },
    };
  }
}
