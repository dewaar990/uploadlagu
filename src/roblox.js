const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const { mimeOf } = require('./audio');

class RobloxError extends Error {
  constructor(message, status, body) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function request(method, urlPath, { apiKey, query, headers = {}, body } = {}) {
  if (!apiKey) throw new RobloxError('API key Roblox belum diatur.', 0);
  const url = new URL(config.roblox.apiBase + urlPath);
  for (const [k, v] of Object.entries(query || {})) if (v !== undefined && v !== '') url.searchParams.set(k, v);

  for (let attempt = 0; ; attempt++) {
    let res;
    try {
      res = await fetch(url, { method, headers: { 'x-api-key': apiKey, ...headers }, body });
    } catch (err) {
      if (attempt < 3) { await sleep(1000 * 2 ** attempt); continue; }
      throw new RobloxError(`Tidak bisa menghubungi Roblox: ${err.message}`, 0);
    }
    const text = await res.text();
    let data = text;
    try { data = text ? JSON.parse(text) : null; } catch { /* bukan JSON */ }

    if ((res.status === 429 || res.status >= 500) && attempt < 4) {
      const retryAfter = Number(res.headers.get('retry-after')) * 1000;
      await sleep(retryAfter > 0 ? Math.min(retryAfter, 30000) : 1000 * 2 ** attempt);
      continue;
    }
    if (!res.ok) throw new RobloxError(errorMessage(res.status, data), res.status, data);
    return data;
  }
}

function errorMessage(status, data) {
  const detail = typeof data === 'string' ? data : data?.message || data?.error?.message || data?.error || data?.errors?.[0]?.message || JSON.stringify(data);
  const hints = {
    401: 'API key tidak valid / kedaluwarsa, atau IP server tidak diizinkan di API key.',
    403: 'API key tidak punya izin (scope) yang diperlukan untuk resource ini.',
  };
  return `Roblox API ${status}: ${String(detail).slice(0, 300)}${hints[status] ? ` — ${hints[status]}` : ''}`;
}

// ------------------------------------------------------------------ Assets API

function creator(type, id) {
  if (!id) throw new RobloxError(`ID ${type === 'group' ? 'grup' : 'user'} Roblox (creator) belum diatur.`, 0);
  return type === 'group' ? { groupId: String(id) } : { userId: String(id) };
}

/** Upload audio. Mengembalikan objek Operation. */
async function uploadAudio({ apiKey, filePath, displayName, description, creatorType, creatorId }) {
  const request_ = {
    assetType: 'Audio',
    displayName: String(displayName).slice(0, 50) || 'Audio',
    description: String(description || '').slice(0, 1000),
    creationContext: { creator: creator(creatorType, creatorId) },
  };
  const buf = await fs.promises.readFile(filePath);
  const form = new FormData();
  form.append('request', JSON.stringify(request_));
  form.append('fileContent', new Blob([buf], { type: mimeOf(filePath) }), path.basename(filePath));
  return request('POST', '/assets/v1/assets', { apiKey, body: form });
}

function operationIdOf(op) {
  return op?.operationId || String(op?.path || '').split('/').pop();
}

async function getOperation(apiKey, operationId) {
  return request('GET', `/assets/v1/operations/${encodeURIComponent(operationId)}`, { apiKey });
}

/** Tunggu sampai operation selesai, kembalikan asset (op.response). */
async function waitForOperation(apiKey, op, { intervalMs, timeoutMs } = {}) {
  intervalMs ??= config.poll.operationIntervalMs;
  timeoutMs ??= config.poll.operationTimeoutMs;
  const id = operationIdOf(op);
  if (!id) throw new RobloxError('Respons upload Roblox tidak berisi operation id.', 0, op);
  const deadline = Date.now() + timeoutMs;
  while (!op.done) {
    if (Date.now() > deadline) throw new RobloxError('Upload ke Roblox belum selesai setelah batas waktu.', 0, op);
    await sleep(intervalMs);
    op = await getOperation(apiKey, id);
  }
  if (op.error) throw new RobloxError(`Upload ditolak Roblox: ${op.error.message || JSON.stringify(op.error)}`, 0, op);
  const asset = op.response || {};
  if (!asset.assetId) throw new RobloxError('Operation selesai tanpa assetId.', 0, op);
  return asset;
}

async function getAsset(apiKey, assetId) {
  const p = `/assets/v1/assets/${encodeURIComponent(assetId)}`;
  try {
    return await request('GET', p, { apiKey, query: { readMask: 'moderationResult' } });
  } catch (err) {
    if (err.status === 400) return request('GET', p, { apiKey });
    throw err;
  }
}

/** "approved" | "rejected" | "reviewing" */
function normalizeModeration(asset) {
  const s = String(asset?.moderationResult?.moderationState || '').toLowerCase();
  if (s.includes('approv')) return 'approved';
  if (s.includes('reject')) return 'rejected';
  return 'reviewing';
}

// ------------------------------------------------------------- DataStore API

function entryPath(universeId) {
  if (!universeId) throw new RobloxError('Universe ID (game) belum diatur.', 0);
  return `/datastores/v1/universes/${encodeURIComponent(universeId)}/standard-datastores/datastore/entries/entry`;
}

async function getEntry({ apiKey, universeId, datastoreName, entryKey, scope }) {
  try {
    return await request('GET', entryPath(universeId), {
      apiKey,
      query: { datastoreName, entryKey, scope },
    });
  } catch (err) {
    if (err.status === 404) return null;
    throw err;
  }
}

async function setEntry({ apiKey, universeId, datastoreName, entryKey, scope, value }) {
  const body = JSON.stringify(value);
  return request('POST', entryPath(universeId), {
    apiKey,
    query: { datastoreName, entryKey, scope },
    headers: {
      'content-type': 'application/json',
      'content-md5': crypto.createHash('md5').update(body).digest('base64'),
    },
    body,
  });
}

// Penulisan berurutan per entry agar update list tidak saling menimpa.
const locks = new Map();
function withLock(key, fn) {
  const prev = locks.get(key) || Promise.resolve();
  const next = prev.catch(() => {}).then(fn);
  locks.set(key, next);
  next.finally(() => { if (locks.get(key) === next) locks.delete(key); }).catch(() => {});
  return next;
}

/**
 * Simpan SoundId ke DataStore.
 *  mode "list"   -> entry `entryKey` berisi array [{ soundId, name, uploadedBy, uploadedAt }]
 *  mode "per-id" -> entry dengan key = SoundId berisi { soundId, name, uploadedBy, uploadedAt }
 * Mengembalikan entryKey yang ditulis.
 */
async function saveSoundId({ apiKey, universeId, soundId, name, uploadedBy, datastore = config.datastore }) {
  const record = { soundId: Number(soundId), name, uploadedBy, uploadedAt: new Date().toISOString() };
  const base = { apiKey, universeId, datastoreName: datastore.name, scope: datastore.scope };

  if (datastore.mode === 'per-id') {
    await setEntry({ ...base, entryKey: String(soundId), value: record });
    return String(soundId);
  }

  const entryKey = datastore.entryKey;
  return withLock(`${universeId}/${datastore.name}/${datastore.scope}/${entryKey}`, async () => {
    const current = await getEntry({ ...base, entryKey });
    const list = Array.isArray(current) ? current.filter((x) => Number(x?.soundId ?? x) !== record.soundId) : [];
    list.push(record);
    await setEntry({ ...base, entryKey, value: list });
    return entryKey;
  });
}

module.exports = {
  RobloxError,
  uploadAudio,
  getOperation,
  waitForOperation,
  getAsset,
  normalizeModeration,
  getEntry,
  setEntry,
  saveSoundId,
};
