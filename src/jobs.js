const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const { JsonStore } = require('./store');
const { processAudio } = require('./audio');
const roblox = require('./roblox');
const auth = require('./auth');

const MAX_JOBS = 1000;
const FINAL = new Set(['done', 'rejected', 'error', 'review_timeout']);

const store = new JsonStore(path.join(config.dataDir, 'jobs.json'), { jobs: [] });
const jobs = () => store.data.jobs;
const running = new Set(); // job id yang sedang dipantau moderasinya
const queue = [];
let working = false;

function now() {
  return new Date().toISOString();
}

function update(job, patch) {
  Object.assign(job, patch, { updatedAt: now() });
  store.save();
}

function log(job, msg) {
  job.log = [...(job.log || []), { at: now(), msg }].slice(-30);
  store.save();
}

function setStep(job, step, state) {
  job.steps = { ...job.steps, [step]: state };
  store.save();
}

function ownerOf(job) {
  return { id: job.owner, role: job.ownerRole };
}

function createJob({ user, inputFile, originalName, displayName, options }) {
  const id = crypto.randomUUID();
  const job = {
    id,
    owner: user.id,
    ownerRole: user.role,
    ownerName: user.name,
    originalName,
    displayName: (displayName || path.parse(originalName).name).trim().slice(0, 50) || 'Audio',
    options,
    status: 'queued',
    steps: { process: 'pending', upload: 'pending', moderation: 'pending', datastore: 'pending' },
    inputFile,
    processedFile: null,
    duration: null,
    assetId: null,
    moderation: null,
    datastoreKey: null,
    error: null,
    log: [],
    createdAt: now(),
    updatedAt: now(),
  };
  jobs().unshift(job);
  trim();
  store.save();
  enqueue(job);
  return job;
}

function trim() {
  while (jobs().length > MAX_JOBS) removeFiles(jobs().pop());
}

function enqueue(job) {
  if (!queue.includes(job)) queue.push(job);
  pump();
}

async function pump() {
  if (working) return;
  working = true;
  try {
    while (queue.length) {
      const job = queue.shift();
      try {
        await processAndUpload(job);
      } catch (err) {
        fail(job, err);
        continue;
      }
      watchModeration(job); // tidak ditunggu: antrian lanjut ke lagu berikutnya
    }
  } finally {
    working = false;
  }
}

function fail(job, err) {
  const step = Object.entries(job.steps).find(([, s]) => s === 'active')?.[0];
  if (step) setStep(job, step, 'error');
  update(job, { status: 'error', error: err.message });
  log(job, `Gagal: ${err.message}`);
  console.error(`[job ${job.id}]`, err.message);
}

async function processAndUpload(job) {
  update(job, { error: null });

  if (!job.processedFile || !fs.existsSync(job.processedFile)) {
    if (!job.inputFile || !fs.existsSync(job.inputFile)) throw new Error('File asli sudah tidak ada. Silakan upload ulang.');
    update(job, { status: 'processing' });
    setStep(job, 'process', 'active');
    const out = path.join(config.processedDir, `${job.id}.mp3`);
    const duration = await processAudio(job.inputFile, out, job.options);
    fs.rm(job.inputFile, { force: true }, () => {});
    update(job, { processedFile: out, inputFile: null, duration });
    setStep(job, 'process', 'done');
    log(job, `Audio diproses (${labelSpeed(job.options)}), durasi ${duration.toFixed(1)} detik.`);
  }

  if (!job.assetId) {
    const creds = auth.resolveCredentials(ownerOf(job));
    update(job, { status: 'uploading' });
    setStep(job, 'upload', 'active');
    const op = await roblox.uploadAudio({
      apiKey: creds.apiKey,
      filePath: job.processedFile,
      displayName: job.displayName,
      description: `Uploaded via DeeRiZ Corp Studios (${labelSpeed(job.options)})`,
      creatorType: creds.creatorType,
      creatorId: creds.creatorId,
    });
    log(job, 'File terkirim ke Roblox, menunggu proses upload selesai...');
    const asset = await roblox.waitForOperation(creds.apiKey, op);
    update(job, { assetId: String(asset.assetId), moderation: roblox.normalizeModeration(asset) });
    setStep(job, 'upload', 'done');
    log(job, `Asset dibuat: SoundId ${job.assetId}`);
  }
}

function labelSpeed(o) {
  return `${o.factor}x ${o.speedMode === 'tempo' ? 'tempo (nada tetap)' : 'speed (nada naik)'}${Number(o.gainDb) ? `, gain ${o.gainDb} dB` : ''}`;
}

/**
 * Pantau status moderasi sampai Approved/Rejected (atau batas waktu),
 * lalu simpan SoundId ke DataStore bila diizinkan.
 */
async function watchModeration(job, { timeoutMs = config.poll.moderationTimeoutMs } = {}) {
  if (running.has(job.id) || !job.assetId) return;
  running.add(job.id);
  try {
    update(job, { status: 'reviewing', error: null });
    setStep(job, 'moderation', 'active');
    const creds = auth.resolveCredentials(ownerOf(job));
    const deadline = Date.now() + timeoutMs;
    let state = job.moderation;

    while (state !== 'approved' && state !== 'rejected') {
      try {
        state = roblox.normalizeModeration(await roblox.getAsset(creds.apiKey, job.assetId));
      } catch (err) {
        log(job, `Cek moderasi gagal: ${err.message}`);
        if (err.status === 401 || err.status === 403 || err.status === 404) throw err;
      }
      update(job, { moderation: state });
      if (state === 'approved' || state === 'rejected') break;
      if (Date.now() >= deadline) {
        setStep(job, 'moderation', 'pending');
        update(job, { status: 'review_timeout' });
        log(job, 'Masih ditinjau Roblox. Akan dicek ulang otomatis secara berkala.');
        return;
      }
      await new Promise((r) => setTimeout(r, config.poll.moderationIntervalMs));
    }

    if (state === 'rejected') {
      setStep(job, 'moderation', 'error');
      setStep(job, 'datastore', 'skipped');
      update(job, { status: 'rejected' });
      log(job, 'Lagu DITOLAK oleh moderasi Roblox. SoundId tidak disimpan ke DataStore.');
      return;
    }

    setStep(job, 'moderation', 'done');
    log(job, 'Lagu DISETUJUI (Approved) oleh Roblox.');
    await saveToDatastore(job, creds);
  } catch (err) {
    fail(job, err);
  } finally {
    running.delete(job.id);
  }
}

async function saveToDatastore(job, creds) {
  if (job.steps.datastore === 'done') return update(job, { status: 'done' });
  update(job, { status: 'saving' });
  setStep(job, 'datastore', 'active');
  const key = await roblox.saveSoundId({
    apiKey: creds.datastoreApiKey,
    universeId: creds.universeId,
    soundId: job.assetId,
    name: job.displayName,
    uploadedBy: job.owner,
  });
  setStep(job, 'datastore', 'done');
  update(job, { status: 'done', datastoreKey: key });
  log(job, `SoundId ${job.assetId} disimpan ke DataStore "${config.datastore.name}" (key: ${key}).`);
}

/** Coba lagi / cek ulang job yang belum selesai. */
function retry(job) {
  if (!FINAL.has(job.status)) return;
  if (job.status === 'rejected') throw auth.httpError(400, 'Lagu ditolak Roblox, tidak bisa dicoba ulang. Upload lagu lain.');
  if (job.assetId) return void watchModeration(job);
  for (const s of ['process', 'upload']) if (job.steps[s] === 'error') setStep(job, s, 'pending');
  update(job, { status: 'queued', error: null });
  enqueue(job);
}

function removeFiles(job) {
  for (const f of [job.inputFile, job.processedFile]) if (f) fs.rm(f, { force: true }, () => {});
}

function remove(job) {
  const i = jobs().indexOf(job);
  if (i >= 0) jobs().splice(i, 1);
  const q = queue.indexOf(job);
  if (q >= 0) queue.splice(q, 1);
  removeFiles(job);
  store.save();
}

function visibleTo(user) {
  return user.role === 'admin' ? jobs() : jobs().filter((j) => j.owner === user.id && j.ownerRole === user.role);
}

function find(user, id) {
  const job = visibleTo(user).find((j) => j.id === id);
  if (!job) throw auth.httpError(404, 'Job tidak ditemukan.');
  return job;
}

function publicJob(j) {
  const { inputFile, processedFile, ...rest } = j;
  return { ...rest, hasAudio: !!processedFile && fs.existsSync(processedFile), checking: running.has(j.id) };
}

/** Lanjutkan job yang terputus karena server restart + cek ulang berkala. */
function start() {
  fs.mkdirSync(config.uploadDir, { recursive: true });
  fs.mkdirSync(config.processedDir, { recursive: true });
  for (const job of jobs()) {
    if (FINAL.has(job.status)) continue;
    for (const [s, v] of Object.entries(job.steps)) if (v === 'active') job.steps[s] = 'pending';
    if (job.assetId) job.status = 'review_timeout';
    else if ((job.inputFile && fs.existsSync(job.inputFile)) || (job.processedFile && fs.existsSync(job.processedFile))) enqueue(job);
    else Object.assign(job, { status: 'error', error: 'Server restart saat memproses. Silakan upload ulang.' });
  }
  store.save();

  const timer = setInterval(() => {
    const cutoff = Date.now() - 48 * 3600 * 1000;
    for (const job of jobs()) {
      if (job.status === 'review_timeout' && Date.parse(job.createdAt) > cutoff) {
        watchModeration(job, { timeoutMs: 0 });
      }
    }
  }, config.poll.backgroundRecheckMs);
  timer.unref();
}

module.exports = { start, createJob, retry, remove, find, visibleTo, publicJob, _store: store };
