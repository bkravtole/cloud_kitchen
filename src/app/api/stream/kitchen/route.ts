/**
 * Kitchen Dashboard SSE Stream
 * Allows kitchen staff to receive real-time order updates
 * 
 * Usage:
 * const eventSource = new EventSource('/api/stream/kitchen?restaurantId=rest_001');
 * eventSource.onmessage = (e) => console.log(JSON.parse(e.data));
 */

import { NextRequest } from 'next/server';
import { sseManager } from '@/lib/sse/connectionManager';
import { logStructured } from '@/lib/utils';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const restaurantId = searchParams.get('restaurantId');

  // Validate input
  if (!restaurantId) {
    logStructured('warn', 'Kitchen SSE Request Missing restaurantId', {});
    return new Response(
      JSON.stringify({ error: 'restaurantId query parameter required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  logStructured('info', 'Kitchen SSE Client Connected', {
    restaurantId,
    timestamp: new Date().toISOString(),
  });

  // Create ReadableStream for SSE
  const stream = new ReadableStream({
    start(controller) {
      // Subscribe this client to the restaurant's updates
      sseManager.subscribe(restaurantId, {
        restaurantId,
        controller,
      });

      // Send initial connection confirmation
      const connectionMessage = {
        event: 'connected',
        restaurantId,
        timestamp: new Date().toISOString(),
        message: `Connected to kitchen dashboard for restaurant ${restaurantId}`,
      };

      try {
        const message = `data: ${JSON.stringify(connectionMessage)}\n\n`;
        controller.enqueue(new TextEncoder().encode(message));
      } catch (error) {
        console.error('[SSE] Error sending connection message:', error);
      }

      // Handle client disconnect
      const cleanup = () => {
        logStructured('info', 'Kitchen SSE Client Disconnected', {
          restaurantId,
          timestamp: new Date().toISOString(),
        });
        sseManager.unsubscribe(restaurantId, controller);
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
