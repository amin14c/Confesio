import express from 'express';
import { createServer as createViteServer } from 'vite';
import { Server } from 'socket.io';
import http from 'http';
import path from 'path';

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: { origin: '*' }
  });
  const PORT = 3000;

  // Matching queues: grouped by language
  // { 'en': { confessors: [socketId], guardians: [socketId] } }
  const queues: Record<string, { confessors: string[], guardians: string[] }> = {
    en: { confessors: [], guardians: [] },
    fr: { confessors: [], guardians: [] },
    ar: { confessors: [], guardians: [] },
    es: { confessors: [], guardians: [] },
    de: { confessors: [], guardians: [] }
  };

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join_queue', ({ role, lang }) => {
      if (!queues[lang]) queues[lang] = { confessors: [], guardians: [] };
      const queue = queues[lang];
      
      if (role === 'confessor') {
        if (queue.guardians.length > 0) {
          const partnerId = queue.guardians.shift()!;
          const roomId = `room_${socket.id}_${partnerId}`;
          socket.join(roomId);
          io.sockets.sockets.get(partnerId)?.join(roomId);
          io.to(roomId).emit('matched', { roomId, role: 'confessor' });
        } else {
          queue.confessors.push(socket.id);
        }
      } else if (role === 'guardian') {
        if (queue.confessors.length > 0) {
          const partnerId = queue.confessors.shift()!;
          const roomId = `room_${partnerId}_${socket.id}`;
          socket.join(roomId);
          io.sockets.sockets.get(partnerId)?.join(roomId);
          io.to(roomId).emit('matched', { roomId, role: 'guardian' });
        } else {
          queue.guardians.push(socket.id);
        }
      }
    });

    socket.on('send_message', ({ roomId, text }) => {
      socket.to(roomId).emit('receive_message', { text, senderId: socket.id });
    });

    socket.on('leave_session', ({ roomId }) => {
      socket.to(roomId).emit('partner_left');
      socket.leave(roomId);
    });

    // WebRTC Signaling
    socket.on('webrtc_offer', ({ roomId, offer }) => {
      socket.to(roomId).emit('webrtc_offer', { offer });
    });
    socket.on('webrtc_answer', ({ roomId, answer }) => {
      socket.to(roomId).emit('webrtc_answer', { answer });
    });
    socket.on('webrtc_ice_candidate', ({ roomId, candidate }) => {
      socket.to(roomId).emit('webrtc_ice_candidate', { candidate });
    });
    socket.on('end_call', ({ roomId }) => {
      socket.to(roomId).emit('call_ended');
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
      // Remove from queues
      for (const lang in queues) {
        queues[lang].confessors = queues[lang].confessors.filter(id => id !== socket.id);
        queues[lang].guardians = queues[lang].guardians.filter(id => id !== socket.id);
      }
    });
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
