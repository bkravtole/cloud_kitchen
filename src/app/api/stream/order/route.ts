/**
 * Customer Order Tracking SSE Stream
 * Allows customers to receive real-time order status updates
 * 
 * Usage:
 * const eventSource = new EventSource('/api/stream/order?userPhone=919876543210');
 * eventSource.onmessage = (e) => console.log(JSON.parse(e.data));
 */

import { NextRequest } from 'next/server';
import { sseManager } from '@/lib/sse/connectionManager';
import { logStructured, validatePhoneNumber } from '@/lib/utils';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userPhone = searchParams.get('userPhone');

  // Validate input
  if (!userPhone) {
    logStructured('warn', 'Customer Order SSE Request Missing userPhone', {});
    return new Response(
      JSON.stringify({ error: 'userPhone query parameter required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (!validatePhoneNumber(userPhone)) {
    logStructured('warn', 'Customer Order SSE Invalid Phone Format', {
      userPhone,
    });
    return new Response(
      JSON.stringify({ error: 'Invalid phone number format' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  logStructured('info', 'Customer Order SSE Client Connected', {
    userPhone: userPhone.slice(-4), // Log last 4 digits only for privacy
    timestamp: new Date().toISOString(),
  });

  // Create ReadableStream for SSE
  const stream = new ReadableStream({
    start(controller) {
      // Subscribe this client to the customer's order updates
      sseManager.subscribe(userPhone, {
        userPhone,
        controller,
      });

      // Send initial connection confirmation
      const connectionMessage = {
        event: 'connected',
        userPhone: userPhone.slice(-4), // Only show last 4 for privacy
        timestamp: new Date().toISOString(),
        message: `Connected to order tracking service`,
      };

      try {
        const message = `data: ${JSON.stringify(connectionMessage)}\n\n`;
        controller.enqueue(new TextEncoder().encode(message));
      } catch (error) {
        console.error('[SSE] Error sending connection message:', error);
      }

      // Handle client disconnect
      const cleanup = () => {
        logStructured('info', 'Customer Order SSE Client Disconnected', {
          userPhone: userPhone.slice(-4),
          timestamp: new Date().toISOString(),
        });
        sseManager.unsubscribe(userPhone, controller);
      };

      // Clean up when the request signal is aborted (client closes connection)
      request.signal.addEventListener('abort', cleanup);

      // Optional: Send a heartbeat every 30 seconds to keep connection alive
      const heartbeatInterval = setInterval(() => {
        try {
          const heartbeat = `data: ${JSON.stringify({
            event: 'heartbeat',
            timestamp: new Date().toISOString(),
          })}\n\n`;
          controller.enqueue(new TextEncoder().encode(heartbeat));
        } catch (error) {
          clearInterval(heartbeatInterval);
          cleanup();
        }
      }, 30000);

      // Clean up interval on abort
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeatInterval);
      });
    },
  });

  // SSE headers for browser
  const headers = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no', // For nginx proxy compatibility
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  };

  return new Response(stream, { status: 200, headers });
}

/**
 * OPTIONS handler for CORS preflight
 */
export async function OPTIONS(_request: NextRequest) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
