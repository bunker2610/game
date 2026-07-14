import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";

dotenv.config();

let currentFilename: string;
if (typeof __filename !== "undefined") {
  currentFilename = __filename;
} else {
  currentFilename = fileURLToPath(import.meta.url);
}
const currentDirname = typeof __dirname !== "undefined" ? __dirname : path.dirname(currentFilename);

const app = express();
const PORT = parseInt(process.env.PORT || "3000", 10);

app.use(express.json({ limit: "10mb" }));

// Clean health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", game: "SUP Surfer STANDALONE", ws_connections: players.size });
});

// Multiplayer State
interface Player {
  id: string;
  name: string;
  skinEmoji: string;
  skinColor: string;
  meters: number;
  isDead: boolean;
  hasShield: boolean;
  isSpeedBoosted: boolean;
  xPos: number; // current x coordinate on the track (percentage or absolute)
}

const players = new Map<string, Player>();
let lobbyState: "lobby" | "countdown" | "playing" = "lobby";
let countdownVal = 5;
let countdownTimer: NodeJS.Timeout | null = null;

// Helper to broadcast to all connected WebSocket clients
function broadcast(data: any) {
  const message = JSON.stringify(data);
  players.forEach((_, id) => {
    const ws = clientSockets.get(id);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  });
}

// Map of socket ID to WebSocket connection instance
const clientSockets = new Map<string, WebSocket>();

// Initialize HTTP server and mount WS server
const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer });

wss.on("connection", (ws) => {
  const socketId = "player_" + Math.random().toString(36).substring(2, 9);
  
  ws.on("message", (rawMessage) => {
    try {
      const data = JSON.parse(rawMessage.toString());
      
      switch (data.type) {
        case "join": {
          // Add player to session
          const newPlayer: Player = {
            id: socketId,
            name: data.name || "Сёрфер",
            skinEmoji: data.skinEmoji || "🏄",
            skinColor: data.skinColor || "#915eff",
            meters: 0,
            isDead: false,
            hasShield: false,
            isSpeedBoosted: false,
            xPos: 240, // standard default center x
          };
          
          players.set(socketId, newPlayer);
          clientSockets.set(socketId, ws);
          
          // Send back welcome package with player's assigned ID and current state
          ws.send(JSON.stringify({
            type: "welcome",
            id: socketId,
            lobbyState,
            countdownVal
          }));
          
          // Broadcast updated player list
          broadcast({
            type: "lobby_update",
            players: Array.from(players.values()),
            lobbyState
          });
          break;
        }
        
        case "start_countdown": {
          // Only the Host (first player in the map keys) can start the countdown
          const playerIds = Array.from(players.keys());
          if (playerIds[0] === socketId && lobbyState === "lobby") {
            lobbyState = "countdown";
            countdownVal = 5;
            
            // Send countdown update
            broadcast({
              type: "countdown_start",
              value: countdownVal
            });
            
            if (countdownTimer) clearInterval(countdownTimer);
            countdownTimer = setInterval(() => {
              countdownVal--;
              if (countdownVal <= 0) {
                if (countdownTimer) clearInterval(countdownTimer);
                countdownTimer = null;
                lobbyState = "playing";
                
                // Reset everyone's playing stats before the start of the race
                players.forEach((p) => {
                  p.meters = 0;
                  p.isDead = false;
                  p.hasShield = false;
                  p.isSpeedBoosted = false;
                });
                
                broadcast({
                  type: "game_start",
                  players: Array.from(players.values())
                });
              } else {
                broadcast({
                  type: "countdown_tick",
                  value: countdownVal
                });
              }
            }, 1000);
          }
          break;
        }
        
        case "game_update": {
          // Update client's metrics in real-time during race
          const p = players.get(socketId);
          if (p) {
            p.meters = data.meters ?? p.meters;
            p.isDead = data.isDead ?? p.isDead;
            p.hasShield = data.hasShield ?? p.hasShield;
            p.isSpeedBoosted = data.isSpeedBoosted ?? p.isSpeedBoosted;
            p.xPos = data.xPos ?? p.xPos;
            
            // Broadcast the state update to all players
            broadcast({
              type: "player_updated",
              player: p
            });
          }
          break;
        }
        
        case "return_to_lobby": {
          // Host or any active player can reset the game back to the lobby
          if (lobbyState === "playing") {
            lobbyState = "lobby";
            if (countdownTimer) {
              clearInterval(countdownTimer);
              countdownTimer = null;
            }
            
            // Reset distances
            players.forEach((p) => {
              p.meters = 0;
              p.isDead = false;
              p.hasShield = false;
              p.isSpeedBoosted = false;
            });
            
            broadcast({
              type: "lobby_reset",
              players: Array.from(players.values())
            });
          }
          break;
        }
      }
    } catch (e) {
      console.error("Error processing WS message:", e);
    }
  });
  
  ws.on("close", () => {
    players.delete(socketId);
    clientSockets.delete(socketId);
    
    // Broadcast player left
    broadcast({
      type: "lobby_update",
      players: Array.from(players.values()),
      lobbyState
    });
    
    // If no players are left, reset the state completely
    if (players.size === 0) {
      lobbyState = "lobby";
      if (countdownTimer) {
        clearInterval(countdownTimer);
        countdownTimer = null;
      }
    }
  });
});

// Integrate Vite middleware or serve static bundle
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Use httpServer instead of app.listen to support both Express and WebSockets on port 3000
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
