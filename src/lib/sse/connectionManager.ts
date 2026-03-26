/**
 * SSE Connection Manager (Server-Sent Events)
 * Manages real-time subscriptions and broadcasts for kitchen + customer tracking
 * 
 * Why SSE over WebSocket?
 * - Simpler protocol (HTTP-based)
 * - Perfect for one-way server→client updates
 * - Built into browsers (no Socket.io needed)
 * - Automatic reconnection
 */

interface Subscriber {
  restaurantId?: string;  // for kitchen dashboard
  userPhone?: string;     // for customer order tracking
  controller: ReadableStreamDefaultController<Uint8Array>;
}

class SSEConnectionManager {
  private subscribers: Map<string, Subscriber[]> = new Map();
  private messageLog: { timestamp: Date; channel: string; context: string; eventCount: number }[] = [];

  /**
   * Subscribe a client to updates
   * @param subscriberId - restaurantId or userPhone (unique identifier)
   * @param subscriber - SSE controller + metadata
   */
  subscribe(subscriberId: string, subscriber: Subscriber) {
    if (!this.subscribers.has(subscriberId)) {
      this.subscribers.set(subscriberId, []);
    }
    this.subscribers.get(subscriberId)!.push(subscriber);
    
    const connCount = this.getActiveConnections();
    console.log(
      `[SSE] ✅ Client subscribed: ${subscriberId} | Total connections: ${connCount}`
    );
  }

  /**
   * Unsubscribe a client from updates
   */
  unsubscribe(
    subscriberId: string,
    controller: ReadableStreamDefaultController<Uint8Array>
  ) {
    if (!this.subscribers.has(subscriberId)) return;

    const index = this.subscribers
      .get(subscriberId)!
      .findIndex((s) => s.controller === controller);

    if (index > -1) {
      this.subscribers.get(subscriberId)!.splice(index, 1);
      console.log(`[SSE] ❌ Client unsubscribed: ${subscriberId}`);

      // Clean up empty arrays
      if (this.subscribers.get(subscriberId)!.length === 0) {
        this.subscribers.delete(subscriberId);
      }
    }
  }

  /**
   * Broadcast an event to all subscribed clients
   * @param channel - 'kitchen' or 'customer'
   * @param data - Event data to broadcast
   * @param context - restaurantId or userPhone
   */
  broadcast(
    channel: 'kitchen' | 'customer',
    data: any,
    context: string
  ) {
    const subscribers = this.subscribers.get(context) || [];

    if (subscribers.length === 0) {
      console.log(
        `[SSE] ℹ️  No subscribers for ${channel}:${context}, skipping broadcast`
      );
      return;
    }

    console.log(
      `[SSE] 📢 Broadcasting to ${subscribers.length} clients on ${channel}:${context}`
    );

    let successCount = 0;
    let failureCount = 0;

    subscribers.forEach((subscriber) => {
      try {
        const sseMessage = `data: ${JSON.stringify(data)}\n\n`;
        subscriber.controller.enqueue(
          new TextEncoder().encode(sseMessage)
        );
        successCount++;
      } catch (error) {
        console.error(
          `[SSE] ⚠️  Error broadcasting to subscriber:`,
          error
        );
        failureCount++;
        this.unsubscribe(context, subscriber.controller);
      }
    });

    // Log broadcast stats
    this.messageLog.push({
      timestamp: new Date(),
      channel,
      context,
      eventCount: successCount,
    });

    console.log(
      `[SSE] ✓ Broadcast complete: ${successCount} success, ${failureCount} failed`
    );
  }

  /**
   * Get total number of active connections
   */
  getActiveConnections(): number {
    return Array.from(this.subscribers.values()).reduce(
      (total, subs) => total + subs.length,
      0
    );
  }

  /**
   * Get connections by context (for monitoring)
   */
  getConnectionsByContext(context: string): number {
    return this.subscribers.get(context)?.length || 0;
  }

  /**
   * Get all active contexts (for debugging)
   */
  getActiveContexts(): string[] {
    return Array.from(this.subscribers.keys());
  }

  /**
   * Get broadcast statistics (for monitoring)
   */
  getStats() {
    const messageCount = this.messageLog.length;
    const lastMinute = this.messageLog.filter(
      (m) => Date.now() - m.timestamp.getTime() < 60000
    );

    return {
      totalConnections: this.getActiveConnections(),
      activeContexts: this.getActiveContexts(),
      messagesPerMinute: lastMinute.length,
      totalMessagesLogged: messageCount,
    };
  }

  /**
   * Clear old message logs (optional cleanup)
   */
  clearOldLogs(ageMs: number = 3600000) {
    const cutoff = Date.now() - ageMs;
    this.messageLog = this.messageLog.filter(
      (m) => m.timestamp.getTime() > cutoff
    );
  }
}

/**
 * Global singleton instance
 * Used across all SSE endpoints
 */
export const sseManager = new SSEConnectionManager();
