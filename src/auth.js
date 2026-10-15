const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const { JsonStore } = require('./store');

const COOKIE = 'drz_session';
const ID_RE = /^[A-Za-z0-9_.-]{3,32}$/;

// ---------- secret untuk tanda tangan sesi & enkripsi API key ----------
function loadSecret() {
  if (config.sessionSecret) return config.sessionSecret;
  const file = path.join(config.dataDir, 'secret.key');
  try {
    return fs.readFileSync(file, 'utf8').trim();
  } catch {
    const s = crypto.randomBytes(48).toString('hex');
    fs.mkdirSync(config.dataDir, { recursive: true });
    fs.writeFileSync(file, s, { mode: 0o600 });
    return s;
  }
}
const SECRET = loadSecret();
const ENC_KEY = crypto.createHash('sha256').update(`enc:${SECRET}`).digest();

function encrypt(text) {
  if (!text) return '';
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', ENC_KEY, iv);
  const data = Buffer.concat([c.update(text, 'utf8'), c.final()]);
  return [iv, c.getAuthTag(), data].map((b) => b.toString('base64url')).join('.');
}

function decrypt(blob) {
  if (!blob) return '';
  try {
    const [iv, tag, data] = blob.split('.').map((s) => Buffer.from(s, 'base64url'));
    const d = crypto.createDecipheriv('aes-256-gcm', ENC_KEY, iv);
    d.setAuthTag(tag);
    return Buffer.concat([d.update(data), d.final()]).toString('utf8');
  } catch {
    return '';
  }
}

// ---------- password ----------
function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64);
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`;
}

function verifyPassword(password, stored) {
  const [algo, salt, hash] = String(stored || '').split('$');
  if (algo !== 'scrypt' || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'base64');
  const actual = crypto.scryptSync(String(password), Buffer.from(salt, 'base64'), expected.length);
  return crypto.timingSafeEqual(expected, actual);
}

function safeEqualStr(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

function generatePassword(len = 12) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let out = '';
  for (let i = 0; i < len; i++) out += chars[crypto.randomInt(chars.length)];
  return out;
}

// ---------- data pelanggan ----------
const users = new JsonStore(path.join(config.dataDir, 'customers.json'), { customers: {} });

function customers() {
  return users.data.customers;
}

function generateCustomerId() {
  let id;
  do id = `DRZ-${crypto.randomInt(100000, 999999)}`;
  while (customers()[id.toLowerCase()]);
  return id;
}

function publicCustomer(c) {
  return {
    id: c.id,
    name: c.name,
    active: c.active,
    expiresAt: c.expiresAt || null,
    useServerKey: !!c.useServerKey,
    createdAt: c.createdAt,
    lastLoginAt: c.lastLoginAt || null,
    hasOwnApiKey: !!c.settings?.apiKey,
  };
}

function isExpired(c) {
  return c.expiresAt && Date.parse(c.expiresAt) < Date.now();
}

function createCustomer({ id, name, password, expiresAt, useServerKey }) {
  id = String(id || '').trim() || generateCustomerId();
  if (!ID_RE.test(id)) throw httpError(400, 'ID pelanggan hanya boleh huruf, angka, titik, minus, underscore (3-32 karakter).');
  const key = id.toLowerCase();
  if (key === config.admin.id.toLowerCase() || customers()[key]) throw httpError(409, 'ID pelanggan sudah dipakai.');
  const plain = password ? String(password) : generatePassword();
  if (plain.length < 6) throw httpError(400, 'Password minimal 6 karakter.');
  const c = {
    id,
    name: String(name || id).slice(0, 80),
    passwordHash: hashPassword(plain),
    active: true,
    expiresAt: normDate(expiresAt),
    useServerKey: useServerKey !== false,
    tokenVersion: 1,
    createdAt: new Date().toISOString(),
    settings: {},
  };
  customers()[key] = c;
  users.saveNow();
  return { customer: publicCustomer(c), password: plain };
}

function updateCustomer(id, patch) {
  const c = customers()[String(id).toLowerCase()];
  if (!c) throw httpError(404, 'Pelanggan tidak ditemukan.');
  let password;
  if (patch.name !== undefined) c.name = String(patch.name).slice(0, 80);
  if (patch.active !== undefined) {
    c.active = !!patch.active;
    if (!c.active) c.tokenVersion++;
  }
  if (patch.expiresAt !== undefined) c.expiresAt = normDate(patch.expiresAt);
  if (patch.useServerKey !== undefined) c.useServerKey = !!patch.useServerKey;
  if (patch.resetPassword) {
    password = patch.password ? String(patch.password) : generatePassword();
    if (password.length < 6) throw httpError(400, 'Password minimal 6 karakter.');
    c.passwordHash = hashPassword(password);
    c.tokenVersion++;
  }
  users.saveNow();
  return { customer: publicCustomer(c), password };
}

function deleteCustomer(id) {
  const key = String(id).toLowerCase();
  if (!customers()[key]) throw httpError(404, 'Pelanggan tidak ditemukan.');
  delete customers()[key];
  users.saveNow();
}

function normDate(v) {
  if (!v) return null;
  const t = Date.parse(v);
  if (!Number.isFinite(t)) throw httpError(400, 'Tanggal tidak valid.');
  // tanggal tanpa jam -> berlaku sampai akhir hari tsb
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(t + 86399999).toISOString() : new Date(t).toISOString();
}

// ---------- pengaturan Roblox per pengguna ----------

function settingsRecord(user) {
  if (user.role === 'admin') {
    users.data.adminSettings ??= {};
    return users.data.adminSettings;
  }
  const c = customers()[user.id.toLowerCase()];
  if (!c) throw httpError(404, 'Pelanggan tidak ditemukan.');
  c.settings ??= {};
  return c.settings;
}

function getSettingsView(user) {
  const s = settingsRecord(user);
  const d = config.roblox;
  const serverAllowed = canUseServerKey(user);
  return {
    hasApiKey: !!s.apiKey,
    apiKeyHint: hint(decrypt(s.apiKey)),
    hasDatastoreApiKey: !!s.datastoreApiKey,
    datastoreApiKeyHint: hint(decrypt(s.datastoreApiKey)),
    creatorType: s.creatorType || '',
    creatorId: s.creatorId || '',
    universeId: s.universeId || '',
    server: {
      allowed: serverAllowed,
      hasApiKey: serverAllowed && !!d.apiKey,
      hasDatastoreApiKey: serverAllowed && !!(d.datastoreApiKey || d.apiKey),
      creatorType: serverAllowed ? d.creatorType : '',
      creatorId: serverAllowed ? d.creatorId : '',
      universeId: serverAllowed ? d.universeId : '',
    },
    datastore: { ...config.datastore },
  };
}

function updateSettings(user, body) {
  const s = settingsRecord(user);
  if (typeof body.apiKey === 'string' && body.apiKey.trim()) s.apiKey = encrypt(body.apiKey.trim());
  if (body.clearApiKey) s.apiKey = '';
  if (typeof body.datastoreApiKey === 'string' && body.datastoreApiKey.trim()) s.datastoreApiKey = encrypt(body.datastoreApiKey.trim());
  if (body.clearDatastoreApiKey) s.datastoreApiKey = '';
  if (body.creatorType !== undefined) s.creatorType = body.creatorType === 'group' ? 'group' : body.creatorType === 'user' ? 'user' : '';
  for (const k of ['creatorId', 'universeId']) {
    if (body[k] === undefined) continue;
    const v = String(body[k]).trim();
    if (v && !/^\d+$/.test(v)) throw httpError(400, `${k} harus berupa angka.`);
    s[k] = v;
  }
  users.saveNow();
  return getSettingsView(user);
}

function canUseServerKey(user) {
  if (user.role === 'admin') return true;
  return !!customers()[user.id.toLowerCase()]?.useServerKey;
}

/** Kredensial efektif (milik pengguna, atau default server bila diizinkan). */
function resolveCredentials(user) {
  const s = settingsRecord(user);
  const d = canUseServerKey(user) ? config.roblox : {};
  const own = decrypt(s.apiKey);
  const apiKey = own || d.apiKey || '';
  const creatorType = s.creatorType || (own ? '' : d.creatorType) || 'user';
  return {
    apiKey,
    datastoreApiKey: decrypt(s.datastoreApiKey) || (own ? '' : d.datastoreApiKey) || apiKey,
    creatorType,
    creatorId: s.creatorId || (own ? '' : d.creatorId) || '',
    universeId: s.universeId || (own ? '' : d.universeId) || '',
  };
}

function hint(key) {
  return key ? `••••${key.slice(-4)}` : '';
}

// ---------- sesi ----------
function sign(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const mac = crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
  return `${body}.${mac}`;
}

function unsign(token) {
  const [body, mac] = String(token || '').split('.');
  if (!body || !mac) return null;
  const expected = crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
  if (!safeEqualStr(mac, expected)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString());
    return p.exp > Date.now() ? p : null;
  } catch {
    return null;
  }
}

function parseCookies(header) {
  const out = {};
  for (const part of String(header || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

function userFromRequest(req) {
  const p = unsign(parseCookies(req.headers.cookie)[COOKIE]);
  if (!p) return null;
  if (p.role === 'admin') {
    if (!config.admin.password || p.uid.toLowerCase() !== config.admin.id.toLowerCase()) return null;
    return { id: config.admin.id, name: 'Admin', role: 'admin' };
  }
  const c = customers()[String(p.uid).toLowerCase()];
  if (!c || !c.active || isExpired(c) || c.tokenVersion !== p.tv) return null;
  return { id: c.id, name: c.name, role: 'customer', expiresAt: c.expiresAt || null };
}

// pembatas percobaan login sederhana per IP
const attempts = new Map();
function tooManyAttempts(ip) {
  const now = Date.now();
  const a = attempts.get(ip);
  if (!a || now - a.start > 15 * 60 * 1000) return false;
  return a.count >= 10;
}
function recordFailure(ip) {
  const now = Date.now();
  const a = attempts.get(ip);
  if (!a || now - a.start > 15 * 60 * 1000) attempts.set(ip, { start: now, count: 1 });
  else a.count++;
}

function login(req, res, id, password) {
  const ip = req.ip;
  if (tooManyAttempts(ip)) throw httpError(429, 'Terlalu banyak percobaan login. Coba lagi dalam 15 menit.');
  id = String(id || '').trim();
  password = String(password || '');
  const exp = Date.now() + config.sessionDays * 86400000;
  let payload;

  if (config.admin.password && id.toLowerCase() === config.admin.id.toLowerCase() && safeEqualStr(password, config.admin.password)) {
    payload = { uid: config.admin.id, role: 'admin', exp };
  } else {
    const c = customers()[id.toLowerCase()];
    if (!c || !verifyPassword(password, c.passwordHash)) {
      recordFailure(ip);
      throw httpError(401, 'ID pelanggan atau password salah.');
    }
    if (!c.active) throw httpError(403, 'Akun dinonaktifkan. Hubungi admin.');
    if (isExpired(c)) throw httpError(403, 'Masa aktif akun sudah habis. Hubungi admin.');
    c.lastLoginAt = new Date().toISOString();
    users.save();
    payload = { uid: c.id, role: 'customer', tv: c.tokenVersion, exp };
  }
  attempts.delete(ip);
  res.setHeader('Set-Cookie', cookie(sign(payload), config.sessionDays * 86400));
  return payload.role;
}

function logout(res) {
  res.setHeader('Set-Cookie', cookie('', 0));
}

function cookie(value, maxAge) {
  return `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${config.cookieSecure ? '; Secure' : ''}`;
}

// ---------- middleware ----------
function requireUser(req, res, next) {
  req.user = userFromRequest(req);
  if (!req.user) return res.status(401).json({ error: 'Silakan login terlebih dahulu.' });
  next();
}

function requireAdmin(req, res, next) {
  req.user = userFromRequest(req);
  if (!req.user) return res.status(401).json({ error: 'Silakan login terlebih dahulu.' });
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Khusus admin.' });
  next();
}

function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}

module.exports = {
  login,
  logout,
  userFromRequest,
  requireUser,
  requireAdmin,
  listCustomers: () => Object.values(customers()).map(publicCustomer),
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getSettingsView,
  updateSettings,
  resolveCredentials,
  httpError,
  // untuk tes
  _internal: { hashPassword, verifyPassword, encrypt, decrypt, sign, unsign },
};
