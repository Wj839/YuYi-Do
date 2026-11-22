require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = Number(process.env.PORT || 3001);
const JWT_SECRET = process.env.JWT_SECRET || 'yuyi_do_secret_key_2026';
const MYSQL_CONFIG = {
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'yuyi_do',
};

const FALLBACK_DB_PATH = path.join(__dirname, 'local-fallback-db.json');

let pool = null;
let dbMode = 'local_fallback';

function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function getEmojiByGender(gender) {
  if (gender === 'male') return '👦';
  if (gender === 'female') return '👧';
  return '✨';
}

// ==========================================
// 本地 JSON 兜底存储（当本机未启动 MySQL 时自动接管）
// ==========================================
function loadFallbackDb() {
  if (fs.existsSync(FALLBACK_DB_PATH)) {
    try {
      return JSON.parse(fs.readFileSync(FALLBACK_DB_PATH, 'utf-8'));
    } catch {
      // ignore
    }
  }
  const initData = {
    nextUserId: 4,
    nextSpaceId: 4,
    users: [
      {
        id: 1,
        username: '1',
        password_hash: bcrypt.hashSync('123456', 8),
        gender: 'male',
        avatar_emoji: '👦',
      },
      {
        id: 2,
        username: '2',
        password_hash: bcrypt.hashSync('123456', 8),
        gender: 'male',
        avatar_emoji: '👦',
      },
      {
        id: 3,
        username: '3',
        password_hash: bcrypt.hashSync('123456', 8),
        gender: 'female',
        avatar_emoji: '👧',
      },
    ],
    spaces: [
      {
        id: 1,
        name: '1的个人空间',
        usage_mode: 'couple',
        invite_code: 'CODE01',
        owner_id: 1,
      },
      {
        id: 2,
        name: '2的个人空间',
        usage_mode: 'couple',
        invite_code: 'CODE02',
        owner_id: 2,
      },
      {
        id: 3,
        name: '3的个人空间',
        usage_mode: 'couple',
        invite_code: 'CODE03',
        owner_id: 3,
      },
    ],
    space_members: [
      { space_id: 1, user_id: 1, role: 'owner' },
      { space_id: 2, user_id: 2, role: 'owner' },
      { space_id: 3, user_id: 3, role: 'owner' },
    ],
    tasksBySpace: {},
  };
  fs.writeFileSync(FALLBACK_DB_PATH, JSON.stringify(initData, null, 2), 'utf-8');
  return initData;
}

function saveFallbackDb(data) {
  fs.writeFileSync(FALLBACK_DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

// ==========================================
// MySQL 初始化与自动建表
// ==========================================
async function initDatabase() {
  try {
    const conn = await mysql.createConnection({
      host: MYSQL_CONFIG.host,
      port: MYSQL_CONFIG.port,
      user: MYSQL_CONFIG.user,
      password: MYSQL_CONFIG.password,
    });
    await conn.query(
      `CREATE DATABASE IF NOT EXISTS \`${MYSQL_CONFIG.database}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
    );
    await conn.end();

    pool = mysql.createPool({
      ...MYSQL_CONFIG,
      waitForConnections: true,
      connectionLimit: 10,
    });

    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(64) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        gender ENUM('male', 'female', 'other') NOT NULL DEFAULT 'other',
        avatar_emoji VARCHAR(16) NOT NULL DEFAULT '✨',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS spaces (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        usage_mode ENUM('solo', 'couple', 'group') NOT NULL DEFAULT 'couple',
        invite_code VARCHAR(12) NOT NULL UNIQUE,
        owner_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS space_members (
        id INT AUTO_INCREMENT PRIMARY KEY,
        space_id INT NOT NULL,
        user_id INT NOT NULL,
        role ENUM('owner', 'member') NOT NULL DEFAULT 'member',
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_space_user (space_id, user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id VARCHAR(64) PRIMARY KEY,
        space_id INT NOT NULL,
        creator_id INT NOT NULL,
        payload_json JSON NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS nudges (
        id INT AUTO_INCREMENT PRIMARY KEY,
        from_user_id INT NOT NULL,
        from_username VARCHAR(64) NOT NULL,
        to_user_id INT NOT NULL,
        to_username VARCHAR(64) NOT NULL,
        emoji VARCHAR(16) NOT NULL DEFAULT '👋',
        message VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    dbMode = 'mysql';
    console.log('✅ 已成功连接 MySQL 数据库并完成表结构检查:', MYSQL_CONFIG.database);
  } catch (err) {
    dbMode = 'local_fallback';
    loadFallbackDb();
    console.warn(
      '⚠️ 未检测到可用的 MySQL 服务，已自动启用本地 JSON 兜底数据库（配置 server/.env 中的 MySQL 后重启即可切回 MySQL）。原因:',
      err.code || err.message
    );
  }
}

// 鉴权中间件
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) {
    return res.status(401).json({ error: '请先登录账号' });
  }
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: '登录已过期，请重新登录' });
  }
}

async function getUserContextPayload(userId) {
  if (dbMode === 'mysql') {
    const [uRows] = await pool.query(
      'SELECT id, username, gender, avatar_emoji FROM users WHERE id = ?',
      [userId]
    );
    if (!uRows.length) return null;
    const user = uRows[0];

    const [smRows] = await pool.query(
      'SELECT space_id FROM space_members WHERE user_id = ? ORDER BY id DESC LIMIT 1',
      [userId]
    );
    let space = null;
    let members = [];
    if (smRows.length) {
      const spaceId = smRows[0].space_id;
      const [sRows] = await pool.query('SELECT * FROM spaces WHERE id = ?', [spaceId]);
      if (sRows.length) {
        space = sRows[0];
        const [mRows] = await pool.query(
          `SELECT u.id, u.username, u.gender, u.avatar_emoji, sm.role
           FROM space_members sm
           JOIN users u ON u.id = sm.user_id
           WHERE sm.space_id = ?`,
          [spaceId]
        );
        members = mRows;
      }
    }
    return { user, space, members, dbMode };
  }

  const db = loadFallbackDb();
  const user = db.users.find((u) => u.id === userId);
  if (!user) return null;
  const memberships = db.space_members.filter((m) => m.user_id === userId);
  const latest = memberships[memberships.length - 1];
  const space = latest ? db.spaces.find((s) => s.id === latest.space_id) : null;
  const members = space
    ? db.space_members
        .filter((m) => m.space_id === space.id)
        .map((m) => {
          const u = db.users.find((x) => x.id === m.user_id);
          return u
            ? {
                id: u.id,
                username: u.username,
                gender: u.gender,
                avatar_emoji: u.avatar_emoji,
                role: m.role,
              }
            : null;
        })
        .filter(Boolean)
    : [];

  return {
    user: {
      id: user.id,
      username: user.username,
      gender: user.gender,
      avatar_emoji: user.avatar_emoji,
    },
    space,
    members,
    dbMode,
  };
}

// ==========================================
// REST API 路由
// ==========================================
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, dbMode });
});

// 1. 注册账号（含性别选择）
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password, gender } = req.body || {};
    const cleanName = String(username || '').trim();
    const cleanPwd = String(password || '');

    if (!['male', 'female'].includes(gender)) {
      return res.status(400).json({ error: '请必须选择性别（男生或女生）' });
    }
    const cleanGender = gender;

    if (cleanName.length < 2) {
      return res.status(400).json({ error: '账号昵称至少需要 2 个字符' });
    }
    if (cleanPwd.length < 4) {
      return res.status(400).json({ error: '密码至少需要 4 位' });
    }

    const avatarEmoji = getEmojiByGender(cleanGender);
    const passwordHash = await bcrypt.hash(cleanPwd, 8);
    const inviteCode = generateInviteCode();

    let newUserId;
    if (dbMode === 'mysql') {
      const [exists] = await pool.query('SELECT id FROM users WHERE username = ?', [cleanName]);
      if (exists.length) {
        return res.status(409).json({ error: '该账号名已被注册，请直接登录或更换昵称' });
      }
      const [uRes] = await pool.query(
        'INSERT INTO users (username, password_hash, gender, avatar_emoji) VALUES (?, ?, ?, ?)',
        [cleanName, passwordHash, cleanGender, avatarEmoji]
      );
      newUserId = uRes.insertId;

      const [sRes] = await pool.query(
        'INSERT INTO spaces (name, usage_mode, invite_code, owner_id) VALUES (?, ?, ?, ?)',
        [`${cleanName}的个人空间`, 'solo', inviteCode, newUserId]
      );
      await pool.query(
        'INSERT INTO space_members (space_id, user_id, role) VALUES (?, ?, ?)',
        [sRes.insertId, newUserId, 'owner']
      );
    } else {
      const db = loadFallbackDb();
      if (db.users.some((u) => u.username === cleanName)) {
        return res.status(409).json({ error: '该账号名已被注册，请直接登录或更换昵称' });
      }
      newUserId = db.nextUserId++;
      db.users.push({
        id: newUserId,
        username: cleanName,
        password_hash: passwordHash,
        gender: cleanGender,
        avatar_emoji: avatarEmoji,
      });
      const newSpaceId = db.nextSpaceId++;
      db.spaces.push({
        id: newSpaceId,
        name: `${cleanName}的个人空间`,
        usage_mode: 'solo',
        invite_code: inviteCode,
        owner_id: newUserId,
      });
      db.space_members.push({
        space_id: newSpaceId,
        user_id: newUserId,
        role: 'owner',
      });
      saveFallbackDb(db);
    }

    const token = jwt.sign({ id: newUserId, username: cleanName }, JWT_SECRET, {
      expiresIn: '30d',
    });
    const ctx = await getUserContextPayload(newUserId);
    res.json({ token, ...ctx });
  } catch (err) {
    res.status(500).json({ error: err.message || '注册失败' });
  }
});

// 2. 登录账号
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    const cleanName = String(username || '').trim();
    const cleanPwd = String(password || '');

    let userRow = null;
    if (dbMode === 'mysql') {
      const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [cleanName]);
      userRow = rows[0] || null;
    } else {
      const db = loadFallbackDb();
      userRow = db.users.find((u) => u.username === cleanName) || null;
    }

    if (!userRow) {
      return res.status(401).json({ error: '账号不存在，请先注册' });
    }
    const valid = await bcrypt.compare(cleanPwd, userRow.password_hash);
    if (!valid) {
      return res.status(401).json({ error: '密码不正确' });
    }

    const token = jwt.sign({ id: userRow.id, username: userRow.username }, JWT_SECRET, {
      expiresIn: '30d',
    });
    const ctx = await getUserContextPayload(userRow.id);
    res.json({ token, ...ctx });
  } catch (err) {
    res.status(500).json({ error: err.message || '登录失败' });
  }
});

// 3. 获取当前用户与空间信息
app.get('/api/auth/me', authMiddleware, async (req, res) => {
  const ctx = await getUserContextPayload(req.user.id);
  if (!ctx) return res.status(404).json({ error: '用户不存在' });
  res.json(ctx);
});

// 4. 在设置中切换使用模式：一个人用(solo) / 两个人用(couple) / 多人使用(group)
app.put('/api/space/mode', authMiddleware, async (req, res) => {
  try {
    const { usageMode } = req.body || {};
    if (!['solo', 'couple', 'group'].includes(usageMode)) {
      return res.status(400).json({ error: '无效的使用模式' });
    }
    const ctx = await getUserContextPayload(req.user.id);
    if (!ctx?.space) return res.status(404).json({ error: '未找到所属空间' });

    if (dbMode === 'mysql') {
      await pool.query('UPDATE spaces SET usage_mode = ? WHERE id = ?', [
        usageMode,
        ctx.space.id,
      ]);
    } else {
      const db = loadFallbackDb();
      const s = db.spaces.find((x) => x.id === ctx.space.id);
      if (s) s.usage_mode = usageMode;
      saveFallbackDb(db);
    }

    const updated = await getUserContextPayload(req.user.id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message || '切换模式失败' });
  }
});

// 5. 填写邀请码加入空间
app.post('/api/space/join', authMiddleware, async (req, res) => {
  try {
    const code = String(req.body?.inviteCode || '')
      .trim()
      .toUpperCase();
    if (!code) {
      return res.status(400).json({ error: '请输入邀请码' });
    }

    if (dbMode === 'mysql') {
      const [sRows] = await pool.query('SELECT * FROM spaces WHERE invite_code = ?', [code]);
      if (!sRows.length) {
        return res.status(404).json({ error: '邀请码无效或已过期，请核对后重试' });
      }
      const targetSpace = sRows[0];
      const [mRows] = await pool.query(
        'SELECT user_id FROM space_members WHERE space_id = ?',
        [targetSpace.id]
      );
      if (targetSpace.usage_mode === 'solo') {
        return res.status(403).json({ error: '对方当前设置为「一个人用」，暂不开放邀请加入' });
      }
      if (
        targetSpace.usage_mode === 'couple' &&
        mRows.length >= 2 &&
        !mRows.some((m) => m.user_id === req.user.id)
      ) {
        return res.status(403).json({
          error: '该空间为「两个人用」模式且已满 2 人，请让房主切换为「多人使用」',
        });
      }

      await pool.query(
        'INSERT IGNORE INTO space_members (space_id, user_id, role) VALUES (?, ?, ?)',
        [targetSpace.id, req.user.id, 'member']
      );
    } else {
      const db = loadFallbackDb();
      const targetSpace = db.spaces.find((s) => s.invite_code === code);
      if (!targetSpace) {
        return res.status(404).json({ error: '邀请码无效或已过期，请核对后重试' });
      }
      const existingMembers = db.space_members.filter((m) => m.space_id === targetSpace.id);
      if (targetSpace.usage_mode === 'solo') {
        return res.status(403).json({ error: '对方当前设置为「一个人用」，暂不开放邀请加入' });
      }
      if (
        targetSpace.usage_mode === 'couple' &&
        existingMembers.length >= 2 &&
        !existingMembers.some((m) => m.user_id === req.user.id)
      ) {
        return res.status(403).json({
          error: '该空间为「两个人用」模式且已满 2 人，请让房主切换为「多人使用」',
        });
      }
      if (!existingMembers.some((m) => m.user_id === req.user.id)) {
        // 移除旧的绑定以便切换到新加入的空间
        db.space_members = db.space_members.filter((m) => m.user_id !== req.user.id);
        db.space_members.push({
          space_id: targetSpace.id,
          user_id: req.user.id,
          role: 'member',
        });
        saveFallbackDb(db);
      }
    }

    const updated = await getUserContextPayload(req.user.id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message || '加入空间失败' });
  }
});

// 6. 跨空间「拍一拍提醒」（不读取、不干涉对方空间的待办事项，仅发送提醒）
app.post('/api/nudges/send', authMiddleware, async (req, res) => {
  try {
    const targetUsername = String(req.body?.targetUsername || '').trim();
    const emoji = String(req.body?.emoji || '👋').slice(0, 8);
    const customText = String(req.body?.message || '').trim();

    if (!targetUsername) {
      return res.status(400).json({ error: '请输入要拍一拍的好友昵称' });
    }

    const fromCtx = await getUserContextPayload(req.user.id);
    const fromName = fromCtx?.user?.username || req.user.username;

    let targetUser = null;
    if (dbMode === 'mysql') {
      const [rows] = await pool.query(
        'SELECT id, username, avatar_emoji FROM users WHERE username = ?',
        [targetUsername]
      );
      targetUser = rows[0] || null;
    } else {
      const db = loadFallbackDb();
      targetUser = db.users.find((u) => u.username === targetUsername) || null;
    }

    if (!targetUser) {
      return res.status(404).json({ error: `未找到用户「${targetUsername}」，请确认对方已注册` });
    }

    const finalMsg =
      customText ||
      `${fromName} 跨空间拍了拍 ${targetUser.username}：提醒你记得看一眼自己的待办清单并按时打勾哦！`;

    if (dbMode === 'mysql') {
      await pool.query(
        'INSERT INTO nudges (from_user_id, from_username, to_user_id, to_username, emoji, message) VALUES (?, ?, ?, ?, ?, ?)',
        [req.user.id, fromName, targetUser.id, targetUser.username, emoji, finalMsg]
      );
    } else {
      const db = loadFallbackDb();
      if (!Array.isArray(db.nudges)) db.nudges = [];
      db.nudges.unshift({
        id: `nudge_${Date.now()}`,
        from_user_id: req.user.id,
        from_username: fromName,
        to_user_id: targetUser.id,
        to_username: targetUser.username,
        emoji,
        message: finalMsg,
        created_at: new Date().toISOString(),
      });
      saveFallbackDb(db);
    }

    res.json({
      ok: true,
      nudge: {
        fromUsername: fromName,
        toUsername: targetUser.username,
        emoji,
        message: finalMsg,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message || '发送拍一拍失败' });
  }
});

// 7. 获取与我相关的拍一拍提醒记录
app.get('/api/nudges', authMiddleware, async (req, res) => {
  try {
    if (dbMode === 'mysql') {
      const [rows] = await pool.query(
        'SELECT * FROM nudges WHERE to_user_id = ? OR from_user_id = ? ORDER BY id DESC LIMIT 30',
        [req.user.id, req.user.id]
      );
      return res.json({ nudges: rows });
    }
    const db = loadFallbackDb();
    const list = (db.nudges || []).filter(
      (n) => n.to_user_id === req.user.id || n.from_user_id === req.user.id
    );
    res.json({ nudges: list.slice(0, 30) });
  } catch (err) {
    res.status(500).json({ error: err.message || '获取拍一拍记录失败' });
  }
});

// 8. 获取当前空间的任务列表（支持 iOS / Android 跨端云端互通）
app.get('/api/space/tasks', authMiddleware, async (req, res) => {
  try {
    const ctx = await getUserContextPayload(req.user.id);
    if (!ctx?.space) return res.json({ tasks: [] });
    const spaceId = ctx.space.id;

    if (dbMode === 'mysql') {
      const [rows] = await pool.query(
        'SELECT payload_json FROM tasks WHERE space_id = ? ORDER BY updated_at DESC',
        [spaceId]
      );
      const tasks = rows.map((r) =>
        typeof r.payload_json === 'string' ? JSON.parse(r.payload_json) : r.payload_json
      );
      return res.json({ tasks });
    }

    const db = loadFallbackDb();
    const tasks = (db.tasksBySpace && db.tasksBySpace[`space_${spaceId}`]) || [];
    res.json({ tasks });
  } catch (err) {
    res.status(500).json({ error: err.message || '获取空间任务失败' });
  }
});

// 9. 保存当前空间的任务列表（iOS / Android 跨端同步）
app.put('/api/space/tasks', authMiddleware, async (req, res) => {
  try {
    const ctx = await getUserContextPayload(req.user.id);
    if (!ctx?.space) return res.status(404).json({ error: '未找到所属空间' });
    const spaceId = ctx.space.id;
    const tasks = Array.isArray(req.body?.tasks) ? req.body.tasks : [];

    if (dbMode === 'mysql') {
      await pool.query('DELETE FROM tasks WHERE space_id = ?', [spaceId]);
      for (const task of tasks) {
        await pool.query(
          'INSERT INTO tasks (id, space_id, creator_id, payload_json) VALUES (?, ?, ?, ?)',
          [String(task.id), spaceId, req.user.id, JSON.stringify(task)]
        );
      }
      return res.json({ ok: true, count: tasks.length });
    }

    const db = loadFallbackDb();
    if (!db.tasksBySpace) db.tasksBySpace = {};
    db.tasksBySpace[`space_${spaceId}`] = tasks;
    saveFallbackDb(db);
    res.json({ ok: true, count: tasks.length });
  } catch (err) {
    res.status(500).json({ error: err.message || '同步空间任务失败' });
  }
});

initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 雨仪待办后端服务已启动: http://localhost:${PORT} (模式: ${dbMode})`);
  });
});
