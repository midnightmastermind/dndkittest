// socket.js — optimized client with user auth
import { io } from "socket.io-client";

const URL = "http://localhost:5000";

export function connectSocket() {
  const token = localStorage.getItem("daytrack-token") || null;

  return io(URL, {
    transports: ["websocket"],
    auth: { token },               // 🔥 send token when connecting
    reconnection: true,
    reconnectionDelay: 500,
    reconnectionDelayMax: 3000,
    reconnectionAttempts: Infinity,
    autoConnect: true
  });
}

export const socket = connectSocket();

// BUFFER (unchanged)
let buffer = [];

socket.on("connect", () => {
  console.log("[socket] connected:", socket.id);

  buffer.forEach(({ event, payload }) => socket.emit(event, payload));
  buffer = [];
});

export function emit(event, payload) {
  if (!socket.connected) buffer.push({ event, payload });
  else socket.emit(event, payload);
}
