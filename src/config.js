const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

function num(name, def) {
  const v = Number(process.env[name]);
  return Number.isFinite(v) && process.env[name] !== '' ? v : def;
}

const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(__dirname, '..', 'data'));

module.exports = {
  port: num('PORT', 3000),
  dataDir: DATA_DIR,
  uploadDir: path.join(DATA_DIR, 'uploads'),
  processedDir: path.join(DATA_DIR, 'processed'),
  cookieSecure: process.env.COOKIE_SECURE === 'true',
  sessionSecret: process.env.SESSION_SECRET || '',
  sessionDays: num('SESSION_DAYS', 7),

  contact: {
    discordUsername: (process.env.DISCORD_USERNAME || 'deerizinhere').replace(/^@/, ''),
    // Opsional: link undangan server / profil, mis. https://discord.gg/xxxx atau https://discord.com/users/<id>
    discordUrl: process.env.DISCORD_URL || '',
  },

  admin: {
    id: process.env.ADMIN_ID || 'admin',
    password: process.env.ADMIN_PASSWORD || '',
  },

  // Default Roblox credentials (opsional). Dipakai bila pelanggan belum mengisi
  // API key sendiri dan admin mengizinkan pelanggan memakai key server.
  roblox: {
    apiBase: (process.env.ROBLOX_API_BASE || 'https://apis.roblox.com').replace(/\/+$/, ''),
    apiKey: process.env.ROBLOX_API_KEY || '',
    datastoreApiKey: process.env.ROBLOX_DATASTORE_API_KEY || '',
    creatorType: process.env.ROBLOX_CREATOR_TYPE === 'group' ? 'group' : 'user',
    creatorId: process.env.ROBLOX_CREATOR_ID || '',
    universeId: process.env.ROBLOX_UNIVERSE_ID || '',
  },

  datastore: {
    name: process.env.DATASTORE_NAME || 'songiddeerizcorp',
    scope: process.env.DATASTORE_SCOPE || 'global',
    // "list"   -> semua SoundId disimpan sebagai array di satu entry (DATASTORE_ENTRY_KEY)
    // "per-id" -> setiap SoundId jadi entry sendiri (key = SoundId)
    mode: process.env.DATASTORE_MODE === 'per-id' ? 'per-id' : 'list',
    entryKey: process.env.DATASTORE_ENTRY_KEY || 'SongList',
  },

  audio: {
    ffmpeg: process.env.FFMPEG_PATH || 'ffmpeg',
    ffprobe: process.env.FFPROBE_PATH || 'ffprobe',
    bitrate: process.env.AUDIO_BITRATE || '192k',
    maxSeconds: num('MAX_AUDIO_SECONDS', 420),
    maxUploadMb: num('MAX_UPLOAD_MB', 100),
  },

  poll: {
    operationIntervalMs: num('OPERATION_POLL_MS', 2000),
    operationTimeoutMs: num('OPERATION_TIMEOUT_MS', 120000),
    moderationIntervalMs: num('MODERATION_POLL_MS', 5000),
    moderationTimeoutMs: num('MODERATION_TIMEOUT_MS', 600000),
    backgroundRecheckMs: num('BACKGROUND_RECHECK_MS', 300000),
  },
};
