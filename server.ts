import express from 'express';
import { createServer as createViteServer } from 'vite';
import { Server } from 'socket.io';
import http from 'http';
import path from 'path';
import crypto from 'crypto';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import authRouter from './auth.js';
import db from './database.js';

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  
  // Trust proxy for rate limiting behind reverse proxies
  app.set('trust proxy', 1);
  
  // Security Headers
  app.use(helmet({
    contentSecurityPolicy: false, // Disabled for Vite dev server compatibility
  }));
  app.use(express.json());

  // Rate Limiting
  const generalLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100,
    validate: { trustProxy: false, xForwardedForHeader: false, forwardedHeader: false }
  });
  const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3,
    validate: { trustProxy: false, xForwardedForHeader: false, forwardedHeader: false }
  });
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    validate: { trustProxy: false, xForwardedForHeader: false, forwardedHeader: false }
  });

  app.use('/auth/register', registerLimiter);
  app.use('/auth/login', loginLimiter);
  app.use('/api', generalLimiter);

  app.use('/auth', authRouter);

  // Cleanup old login attempts periodically
  setInterval(() => {
    db.prepare('DELETE FROM login_attempts WHERE timestamp < ?').run(Date.now() - 24 * 60 * 60 * 1000);
  }, 60 * 60 * 1000);
  
  // تأمين CORS: قبول النطاقات المسموحة فقط
  const allowedOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',') 
    : ['http://localhost:3000', 'http://localhost:5173'];
    
  const io = new Server(server, {
    cors: { 
      origin: process.env.NODE_ENV === 'production' ? allowedOrigins : '*',
      methods: ['GET', 'POST']
    }
  });

  const JWT_SECRET = process.env.JWT_SECRET || 'confesio_super_secret_key_2026';
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('unauthorized'));
    try {
      const payload = jwt.verify(token, JWT_SECRET) as any;
      socket.data.anonymousId = payload.anonymousId;
      next();
    } catch (e) {
      next(new Error('unauthorized'));
    }
  });

  const PORT = 3000;

  // --- إضافة ٤: إحصاءات مجهولة للسيرفر ---
  let completedSessions = 0;
  let totalSessionDuration = 0;
  const sessionsPerLang: Record<string, number> = { en: 0, fr: 0, ar: 0, es: 0, de: 0 };

  app.get('/stats', (req, res) => {
    res.json({
      completedSessions,
      avgSessionDuration: completedSessions > 0 ? Math.round(totalSessionDuration / completedSessions) : 0,
      sessionsPerLang
    });
  });

  const queues: Record<string, { confessors: string[], guardians: string[] }> = {
    en: { confessors: [], guardians: [] },
    fr: { confessors: [], guardians: [] },
    ar: { confessors: [], guardians: [] },
    es: { confessors: [], guardians: [] },
    de: { confessors: [], guardians: [] }
  };

  // خرائط لتتبع حالة الـ Sockets
  const socketRoles = new Map<string, string>();
  const socketRooms = new Map<string, string>();
  const queueTimeouts = new Map<string, NodeJS.Timeout>();

  // --- إضافة ٤: تتبع الغرف النشطة لحساب مدة الجلسة ---
  const activeRooms = new Map<string, { confessor: string, guardian: string, confessorAnonId: string, guardianAnonId: string, lang: string, startTime: number }>();

  // --- إضافة ٢: نظام التقييم بالنجوم ---
  const sessionRatings = new Map<string, { confessor?: number, guardian?: number, guardianId: string, guardianAnonId: string, confessorAnonId: string }>();
  const guardianStats = new Map<string, { totalScore: number, count: number }>();

  // --- إضافة ١: نظام الكلمات المفتاحية للأزمات النفسية ---
  const crisisKeywords = [
    'انتحار', 'أقتل نفسي', 'لا أريد العيش', 'أذية نفسي',
    'suicide', 'me tuer', 'mourir', 'me faire du mal',
    'kill myself', 'end my life', 'hurt myself'
  ];

  // إعدادات TURN Server للمكالمات الصوتية
  const turnConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      {
        urls: 'turn:openrelay.metered.ca:80',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      }
    ]
  };

  // دالة مساعدة لإنهاء الجلسة وحساب الإحصاءات
  const handleSessionEnd = (roomId: string) => {
    const room = activeRooms.get(roomId);
    if (room) {
      const duration = (Date.now() - room.startTime) / 1000;
      completedSessions++;
      totalSessionDuration += duration;
      sessionsPerLang[room.lang] = (sessionsPerLang[room.lang] || 0) + 1;
      
      // Update DB stats
      db.transaction(() => {
        db.prepare('UPDATE users SET completed_sessions = completed_sessions + 1, confessions = confessions + 1 WHERE anonymousId = ?').run(room.confessorAnonId);
        db.prepare('UPDATE users SET completed_sessions = completed_sessions + 1, guardian_sessions = guardian_sessions + 1 WHERE anonymousId = ?').run(room.guardianAnonId);
        
        // Check badges
        const confessor = db.prepare('SELECT confessions FROM users WHERE anonymousId = ?').get(room.confessorAnonId) as any;
        if (confessor && confessor.confessions === 1) {
          db.prepare('INSERT OR IGNORE INTO badges (anonymousId, badgeId, earnedAt) VALUES (?, ?, ?)').run(room.confessorAnonId, 'first_confession', Date.now());
        }
      })();

      activeRooms.delete(roomId);
    }
  };

  io.on('connection', (socket) => {
    const anonymousId = socket.data.anonymousId;
    console.log('User connected:', socket.id, 'AnonymousId:', anonymousId);

    // Update lastSeen
    db.prepare('UPDATE users SET lastSeen = ? WHERE anonymousId = ?').run(Date.now(), anonymousId);

    socket.on('join_queue', ({ role, lang }) => {
      if (!queues[lang]) queues[lang] = { confessors: [], guardians: [] };
      const queue = queues[lang];

      // مهلة الطابور (5 دقائق)
      const timeout = setTimeout(() => {
        queues[lang].confessors = queues[lang].confessors.filter(id => id !== socket.id);
        queues[lang].guardians = queues[lang].guardians.filter(id => id !== socket.id);
        socket.emit('queue_timeout', { message: 'Queue timeout reached. Please try again.' });
        queueTimeouts.delete(socket.id);
      }, 5 * 60 * 1000);
      queueTimeouts.set(socket.id, timeout);

      // التحقق من أن الشريك لا يزال متصلاً
      const findConnectedPartner = (partnerList: string[]) => {
        while (partnerList.length > 0) {
          const partnerId = partnerList.shift()!;
          if (io.sockets.sockets.has(partnerId)) {
            return partnerId;
          }
        }
        return null;
      };

      const setupMatch = (confessorId: string, guardianId: string, matchLang: string) => {
        clearTimeout(queueTimeouts.get(confessorId));
        clearTimeout(queueTimeouts.get(guardianId));
        queueTimeouts.delete(confessorId);
        queueTimeouts.delete(guardianId);

        // استخدام UUID عشوائي للغرفة
        const roomId = crypto.randomUUID();

        const confessorSocket = io.sockets.sockets.get(confessorId);
        const guardianSocket = io.sockets.sockets.get(guardianId);

        if (confessorSocket && guardianSocket) {
          const confessorAnonId = confessorSocket.data.anonymousId;
          const guardianAnonId = guardianSocket.data.anonymousId;

          confessorSocket.join(roomId);
          guardianSocket.join(roomId);

          socketRoles.set(confessorId, 'confessor');
          socketRoles.set(guardianId, 'guardian');
          socketRooms.set(confessorId, roomId);
          socketRooms.set(guardianId, roomId);

          // حفظ بيانات الغرفة للإحصاءات والأزمات
          activeRooms.set(roomId, { confessor: confessorId, guardian: guardianId, confessorAnonId, guardianAnonId, lang: matchLang, startTime: Date.now() });

          // تهيئة التقييم للغرفة
          sessionRatings.set(roomId, { guardianId, guardianAnonId, confessorAnonId });

          confessorSocket.emit('matched', { roomId, role: 'confessor', turnConfig });
          guardianSocket.emit('matched', { roomId, role: 'guardian', turnConfig });
        }
      };

      if (role === 'confessor') {
        const partnerId = findConnectedPartner(queue.guardians);
        if (partnerId) {
          setupMatch(socket.id, partnerId, lang);
        } else {
          queue.confessors.push(socket.id);
        }
      } else if (role === 'guardian') {
        const partnerId = findConnectedPartner(queue.confessors);
        if (partnerId) {
          setupMatch(partnerId, socket.id, lang);
        } else {
          queue.guardians.push(socket.id);
        }
      }
    });

    socket.on('leave_queue', ({ role, lang }) => {
      if (queues[lang]) {
        if (role === 'confessor') {
          queues[lang].confessors = queues[lang].confessors.filter(id => id !== socket.id);
        } else if (role === 'guardian') {
          queues[lang].guardians = queues[lang].guardians.filter(id => id !== socket.id);
        }
      }
      clearTimeout(queueTimeouts.get(socket.id));
      queueTimeouts.delete(socket.id);
    });

    socket.on('send_message', ({ roomId, text }) => {
      // --- إضافة ١: فحص الكلمات المفتاحية للأزمات ---
      const textLower = text.toLowerCase();
      const hasCrisis = crisisKeywords.some(kw => textLower.includes(kw));

      if (hasCrisis) {
        const room = activeRooms.get(roomId);
        if (room) {
          // إرسال تحذير صامت للحارس
          io.to(room.guardian).emit('crisis_alert', { 
            message: '⚠️ يبدو أن شريكك يمر بأزمة — كن حاضراً بشكل كامل' 
          });
          // إرسال موارد دعم للمُعترف
          io.to(room.confessor).emit('support_resources', { 
            message: 'خطوط الدعم: الجزائر 3548، دولي befrienders.org' 
          });
        }
      }

      // إرسال الدور (role) بدلاً من socket.id للسرية
      const userRole = socketRoles.get(socket.id) || 'unknown';
      socket.to(roomId).emit('receive_message', { text, role: userRole });
    });

    // --- إضافة ٢: استقبال التقييمات وحساب المتوسط ---
    socket.on('submit_rating', ({ roomId, rating, reviewerRole }) => {
      const session = sessionRatings.get(roomId);
      if (!session) return;

      if (reviewerRole === 'confessor') session.confessor = rating;
      else if (reviewerRole === 'guardian') session.guardian = rating;

      // إذا قام الطرفان بالتقييم
      if (session.confessor !== undefined && session.guardian !== undefined) {
        const avg = (session.confessor + session.guardian) / 2;
        
        // Update DB
        const guardian = db.prepare('SELECT avg_rating, guardian_sessions FROM users WHERE anonymousId = ?').get(session.guardianAnonId) as any;
        if (guardian) {
          const newAvg = ((guardian.avg_rating * guardian.guardian_sessions) + avg) / (guardian.guardian_sessions + 1);
          db.prepare('UPDATE users SET avg_rating = ? WHERE anonymousId = ?').run(newAvg, session.guardianAnonId);
          
          // Check trusted guardian badge
          if (guardian.guardian_sessions + 1 >= 5 && newAvg >= 4.0) {
            db.prepare('INSERT OR IGNORE INTO badges (anonymousId, badgeId, earnedAt) VALUES (?, ?, ?)').run(session.guardianAnonId, 'trusted_guardian', Date.now());
          }

          // إرسال التقييم التراكمي للحارس فقط
          io.to(session.guardianId).emit('guardian_rating_update', { averageRating: newAvg });
        }
        
        // Log session
        const sessionId = crypto.randomUUID();
        const confessorHash = crypto.createHash('sha256').update(session.confessorAnonId).digest('hex');
        const guardianHash = crypto.createHash('sha256').update(session.guardianAnonId).digest('hex');
        db.prepare('INSERT INTO sessions_log (id, confessorHash, guardianHash, duration, rating, timestamp) VALUES (?, ?, ?, ?, ?, ?)').run(
          sessionId, confessorHash, guardianHash, 0, avg, Date.now()
        );

        sessionRatings.delete(roomId);
      }
    });

    socket.on('leave_session', ({ roomId }) => {
      socket.to(roomId).emit('partner_left');
      socket.leave(roomId);
      socketRooms.delete(socket.id);
      socketRoles.delete(socket.id);
      handleSessionEnd(roomId);
    });

    // --- إضافة ٣: حماية الخصوصية في الصوت (MITM Protection) ---
    socket.on('webrtc_offer', ({ roomId, offer }) => {
      if (socketRooms.get(socket.id) !== roomId) return;
      socket.to(roomId).emit('webrtc_offer', { offer });
    });

    socket.on('webrtc_answer', ({ roomId, answer }) => {
      if (socketRooms.get(socket.id) !== roomId) return;
      socket.to(roomId).emit('webrtc_answer', { answer });
    });

    socket.on('webrtc_ice_candidate', ({ roomId, candidate }) => {
      if (socketRooms.get(socket.id) !== roomId) return;
      socket.to(roomId).emit('webrtc_ice_candidate', { candidate });
    });

    socket.on('end_call', ({ roomId }) => {
      if (socketRooms.get(socket.id) !== roomId) return;
      socket.to(roomId).emit('call_ended');
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
      
      clearTimeout(queueTimeouts.get(socket.id));
      queueTimeouts.delete(socket.id);

      for (const lang in queues) {
        queues[lang].confessors = queues[lang].confessors.filter(id => id !== socket.id);
        queues[lang].guardians = queues[lang].guardians.filter(id => id !== socket.id);
      }

      const roomId = socketRooms.get(socket.id);
      if (roomId) {
        socket.to(roomId).emit('partner_disconnected', { message: 'Partner has disconnected.' });
        socketRooms.delete(socket.id);
        socketRoles.delete(socket.id);
        handleSessionEnd(roomId);
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
