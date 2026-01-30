import { DurableObject } from "cloudflare:workers";

// Durable Object for WebSocket-based real-time chat
// Used for streaming AI responses back to the client
export class ChatRoom extends DurableObject {
  private sessions: Map<WebSocket, { userId: string }> = new Map();

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/websocket") {
      if (request.headers.get("Upgrade") !== "websocket") {
        return new Response("Expected WebSocket", { status: 426 });
      }

      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);

      const userId = url.searchParams.get("userId") || "anonymous";

      this.ctx.acceptWebSocket(server);
      this.sessions.set(server, { userId });

      return new Response(null, { status: 101, webSocket: client });
    }

    return new Response("Not found", { status: 404 });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    // Handle incoming WebSocket messages if needed
    const data = typeof message === "string" ? message : new TextDecoder().decode(message);
    try {
      const parsed = JSON.parse(data);
      // Broadcast or handle message types
      if (parsed.type === "ping") {
        ws.send(JSON.stringify({ type: "pong" }));
      }
    } catch {
      // Ignore malformed messages
    }
  }

  async webSocketClose(ws: WebSocket) {
    this.sessions.delete(ws);
  }

  // Broadcast a message to all connected clients
  broadcast(message: string) {
    for (const [ws] of this.sessions) {
      try {
        ws.send(message);
      } catch {
        this.sessions.delete(ws);
      }
    }
  }
}
