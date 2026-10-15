const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const multer = require('multer');
const config = require('./src/config');
const auth = require('./src/auth');
const jobs = require('./src/jobs');
const roblox = require('./src/roblox');

const app = express();
app.set('trust proxy', process.env.TRUST_PROXY === 'true');
app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'same-origin');
  next();
});

const PUBLIC = path.join(__dirname, 'public');
const page = (name) => path.join(PUBLIC, name);
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

app.get('/healthz', (req, res) => res.json({ ok: true }));

// ------------------------------------------------------------------ halaman
app.get('/', (req, res) => res.sendFile(page('index.html')));
app.get('/login', (req, res) => {
  const user = auth.userFromRequest(req);
  if (user) return res.redirect(user.role === 'admin' ? '/admin' : '/app');
  res.sendFile(page('login.html'));
});
app.get('/app', (req, res) => {
  if (!auth.userFromRequest(req)) return res.redirect('/login');
  res.sendFile(page('app.html'));
});
app.get('/admin', (req, res) => {
  const user = auth.userFromRequest(req);
  if (!user) return res.redirect('/login');
  if (user.role !== 'admin') return res.redirect('/app');
  res.sendFile(page('admin.html'));
});
app.use(express.static(PUBLIC, { index: false, extensions: [] }));

// ------------------------------------------------------------------ auth
app.post('/api/auth/login', (req, res) => {
  const role = auth.login(req, res, req.body?.id, req.body?.password);
  res.json({ ok: true, redirect: role === 'admin' ? '/admin' : '/app' });
});
app.post('/api/auth/logout', (req, res) => {
  auth.logout(res);
  res.json({ ok: true });
});
app.get('/api/me', auth.requireUser, (req, res) => res.json(req.user));

// ------------------------------------------------------------------ pengaturan Roblox
app.get('/api/settings', auth.requireUser, (req, res) => res.json(auth.getSettingsView(req.user)));
app.put('/api/settings', auth.requireUser, (req, res) => res.json(auth.updateSettings(req.user, req.body || {})));

app.post('/api/settings/test', auth.requireUser, wrap(async (req, res) => {
  const c = auth.resolveCredentials(req.user);
  const result = { assets: null, datastore: null };
  if (!c.apiKey) result.assets = { ok: false, message: 'API key belum diatur.' };
  else if (!c.creatorId) result.assets = { ok: false, message: 'ID creator (user/grup) belum diatur.' };
  else result.assets = { ok: true, message: `API key terisi, upload sebagai ${c.creatorType} ${c.creatorId}.` };
  try {
    const value = await roblox.getEntry({
      apiKey: c.datastoreApiKey,
      universeId: c.universeId,
      datastoreName: config.datastore.name,
      entryKey: config.datastore.mode === 'list' ? config.datastore.entryKey : '__drz_ping__',
      scope: config.datastore.scope,
    });
    const count = Array.isArray(value) ? ` (${value.length} lagu tersimpan)` : '';
    result.datastore = { ok: true, message: `Terhubung ke DataStore "${config.datastore.name}"${count}.` };
  } catch (err) {
    result.datastore = { ok: false, message: err.message };
  }
  res.json(result);
}));

// ------------------------------------------------------------------ upload & job
const AUDIO_EXT = new Set(['.mp3', '.wav', '.ogg', '.flac', '.m4a', '.aac', '.opus', '.webm', '.mp4', '.wma', '.aiff', '.aif']);
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, config.uploadDir),
    filename: (req, file, cb) => cb(null, `${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: config.audio.maxUploadMb * 1024 * 1024, files: 20 },
  fileFilter: (req, file, cb) => {
    const ok = AUDIO_EXT.has(path.extname(file.originalname).toLowerCase());
    cb(ok ? null : auth.httpError(400, `Format file tidak didukung: ${file.originalname}`), ok);
  },
});

app.post('/api/upload', auth.requireUser, upload.array('files', 20), (req, res) => {
  const files = req.files || [];
  const cleanup = () => files.forEach((f) => fs.rm(f.path, { force: true }, () => {}));
  if (!files.length) throw auth.httpError(400, 'Pilih minimal satu file audio.');

  const options = {
    speedMode: req.body.speedMode === 'tempo' ? 'tempo' : 'speed',
    factor: Number(req.body.factor || 2),
    gainDb: Number(req.body.gainDb || 0),
  };
  if (!(options.factor >= 0.5 && options.factor <= 4)) { cleanup(); throw auth.httpError(400, 'Faktor kecepatan harus 0.5 - 4.'); }
  if (!(options.gainDb >= -20 && options.gainDb <= 20)) { cleanup(); throw auth.httpError(400, 'Gain harus -20 s/d 20 dB.'); }

  const creds = auth.resolveCredentials(req.user);
  const missing = [];
  if (!creds.apiKey) missing.push('API key');
  if (!creds.creatorId) missing.push('ID creator');
  if (!creds.universeId) missing.push('Universe ID');
  if (missing.length) { cleanup(); throw auth.httpError(400, `Lengkapi pengaturan Roblox dulu: ${missing.join(', ')}.`); }

  let names = [];
  try { names = JSON.parse(req.body.names || '[]'); } catch { /* abaikan */ }
  const created = files.map((f, i) => jobs.createJob({
    user: req.user,
    inputFile: f.path,
    originalName: Buffer.from(f.originalname, 'latin1').toString('utf8'),
    displayName: typeof names[i] === 'string' ? names[i] : '',
    options,
  }));
  res.json({ jobs: created.map(jobs.publicJob) });
});

app.get('/api/jobs', auth.requireUser, (req, res) => {
  res.json({ jobs: jobs.visibleTo(req.user).slice(0, 200).map(jobs.publicJob) });
});
app.post('/api/jobs/:id/retry', auth.requireUser, (req, res) => {
  const job = jobs.find(req.user, req.params.id);
  jobs.retry(job);
  res.json({ job: jobs.publicJob(job) });
});
app.delete('/api/jobs/:id', auth.requireUser, (req, res) => {
  jobs.remove(jobs.find(req.user, req.params.id));
  res.json({ ok: true });
});
app.get('/api/jobs/:id/audio', auth.requireUser, (req, res) => {
  const job = jobs.find(req.user, req.params.id);
  if (!job.processedFile || !fs.existsSync(job.processedFile)) throw auth.httpError(404, 'File audio tidak tersedia.');
  res.type('audio/mpeg').sendFile(job.processedFile);
});

// ------------------------------------------------------------------ admin: pelanggan
app.get('/api/admin/customers', auth.requireAdmin, (req, res) => res.json({ customers: auth.listCustomers() }));
app.post('/api/admin/customers', auth.requireAdmin, (req, res) => res.json(auth.createCustomer(req.body || {})));
app.patch('/api/admin/customers/:id', auth.requireAdmin, (req, res) => res.json(auth.updateCustomer(req.params.id, req.body || {})));
app.delete('/api/admin/customers/:id', auth.requireAdmin, (req, res) => {
  auth.deleteCustomer(req.params.id);
  res.json({ ok: true });
});

// ------------------------------------------------------------------ error
app.use('/api', (req, res) => res.status(404).json({ error: 'Endpoint tidak ditemukan.' }));
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  const status = err.status || (err instanceof multer.MulterError ? 400 : 500);
  const message = err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE'
    ? `File terlalu besar (maks ${config.audio.maxUploadMb} MB).`
    : err.message || 'Terjadi kesalahan.';
  if (status >= 500) console.error(err);
  res.status(status).json({ error: message });
});

if (require.main === module) {
  jobs.start();
  if (!config.admin.password) console.warn('[!] ADMIN_PASSWORD belum diatur di .env — login admin dinonaktifkan.');
  app.listen(config.port, () => console.log(`DeeRiZ Corp Studios berjalan di http://localhost:${config.port}`));
}

module.exports = app;
