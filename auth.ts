import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import db from './database.ts';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'confesio_super_secret_key_2026';

// Middleware to verify JWT
export const verifyToken = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    req.user = payload;
    next();
  } catch (e) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// POST /auth/register
router.post('/register', async (req, res) => {
  const { password } = req.body;
  if (!password || password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  try {
    const anonymousId = crypto.randomUUID();
    const passwordHash = await bcrypt.hash(password, 10);
    const now = Date.now();

    const stmt = db.prepare(`
      INSERT INTO users (anonymousId, passwordHash, createdAt, lastSeen)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(anonymousId, passwordHash, now, now);

    const token = jwt.sign({ anonymousId }, JWT_SECRET, { expiresIn: '7d' });
    
    res.json({ 
      anonymousId, 
      token,
      message: 'anonymousId هو اسمك الوحيد — احفظه لأنه لا يمكن استرجاعه إذا نسيته'
    });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /auth/login
router.post('/login', async (req, res) => {
  const { anonymousId, password } = req.body;
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();

  // Rate limiting check for failed attempts (10 fails = 1 hour ban)
  const recentFails = db.prepare(`
    SELECT COUNT(*) as count FROM login_attempts 
    WHERE ip = ? AND success = 0 AND timestamp > ?
  `).get(ip, now - 60 * 60 * 1000) as { count: number };

  if (recentFails.count >= 10) {
    return res.status(429).json({ error: 'Too many failed attempts. Try again in an hour.' });
  }

  try {
    const user = db.prepare('SELECT * FROM users WHERE anonymousId = ?').get(anonymousId) as any;
    
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      db.prepare('INSERT INTO login_attempts (ip, timestamp, success) VALUES (?, ?, 0)').run(ip, now);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    db.prepare('INSERT INTO login_attempts (ip, timestamp, success) VALUES (?, ?, 1)').run(ip, now);
    db.prepare('UPDATE users SET lastSeen = ? WHERE anonymousId = ?').run(now, anonymousId);

    const token = jwt.sign({ anonymousId }, JWT_SECRET, { expiresIn: '7d' });
    
    // Fetch badges
    const badges = db.prepare('SELECT badgeId FROM badges WHERE anonymousId = ?').all(anonymousId).map((b: any) => b.badgeId);

    const user_stats = {
      createdAt: user.createdAt,
      credits: user.credits,
      role_stats: {
        confessions: user.confessions,
        guardian_sessions: user.guardian_sessions,
        avg_rating: user.avg_rating,
        completed_sessions: user.completed_sessions
      },
      preferences: {
        lang: user.pref_lang,
        session_duration: user.pref_session_duration,
        silent_mode: Boolean(user.pref_silent_mode),
        weight_preference: user.pref_weight_preference
      },
      badges
    };

    res.json({ token, user_stats });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /auth/logout
router.post('/logout', verifyToken, (req: any, res) => {
  const { anonymousId } = req.user;
  db.prepare('UPDATE users SET lastSeen = ? WHERE anonymousId = ?').run(Date.now(), anonymousId);
  res.json({ success: true });
});

// POST /auth/delete-account
router.post('/delete-account', verifyToken, async (req: any, res) => {
  const { anonymousId } = req.user;
  const { password } = req.body;

  try {
    const user = db.prepare('SELECT passwordHash FROM users WHERE anonymousId = ?').get(anonymousId) as any;
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    const hashedId = crypto.createHash('sha256').update(anonymousId).digest('hex');

    db.transaction(() => {
      db.prepare('DELETE FROM users WHERE anonymousId = ?').run(anonymousId);
      db.prepare('DELETE FROM badges WHERE anonymousId = ?').run(anonymousId);
      db.prepare('DELETE FROM sessions_log WHERE confessorHash = ? OR guardianHash = ?').run(hashedId, hashedId);
      db.prepare('DELETE FROM pending_messages WHERE recipientHash = ?').run(hashedId);
    })();

    res.json({ success: true, message: 'Account permanently deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Deletion failed' });
  }
});

// GET /auth/recover-hint
router.get('/recover-hint', (req, res) => {
  res.json({ message: 'anonymousId هو هويتك الوحيدة. لا يوجد بريد إلكتروني أو رقم هاتف لاسترجاعه. إذا فقدته، فقدت حسابك للأبد حفاظاً على سريتك.' });
});

// GET /auth/me
router.get('/me', verifyToken, (req: any, res) => {
  const { anonymousId } = req.user;
  const user = db.prepare('SELECT * FROM users WHERE anonymousId = ?').get(anonymousId) as any;
  if (!user) return res.status(404).json({ error: 'User not found' });
  
  const badges = db.prepare('SELECT badgeId FROM badges WHERE anonymousId = ?').all(anonymousId).map((b: any) => b.badgeId);

  res.json({
    anonymousId,
    createdAt: user.createdAt,
    credits: user.credits,
    role_stats: {
      confessions: user.confessions,
      guardian_sessions: user.guardian_sessions,
      avg_rating: user.avg_rating,
      completed_sessions: user.completed_sessions
    },
    preferences: {
      lang: user.pref_lang,
      session_duration: user.pref_session_duration,
      silent_mode: Boolean(user.pref_silent_mode),
      weight_preference: user.pref_weight_preference
    },
    badges
  });
});

export default router;
