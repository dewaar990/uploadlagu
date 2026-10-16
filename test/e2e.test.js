// Tes end-to-end: login admin -> buat pelanggan -> pelanggan upload lagu ->
// speed 2x -> upload ke (mock) Roblox -> cek moderasi -> simpan ke (mock) DataStore.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'drz-test-'));
const API_KEY = 'test-key-123';

// ------------------------------------------------------------------ mock Roblox
const mock = { datastore: new Map(), uploads: [], assetChecks: new Map() };
const mockServer = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', () => {
    const body = Buffer.concat(chunks);
    const send = (code, obj) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(obj)); };
    if (req.headers['x-api-key'] !== API_KEY) return send(401, { message: 'Invalid API Key' });

    if (req.method === 'POST' && url.pathname === '/assets/v1/assets') {
      const text = body.toString('latin1');
      const reqJson = JSON.parse(text.match(/name="request"\r\n\r\n(.*?)\r\n--/s)[1]);
      const filePart = body.indexOf('name="fileContent"');
      const headerEnd = body.indexOf('\r\n\r\n', filePart) + 4;
      const fileEnd = body.indexOf('\r\n--', headerEnd);
      const contentType = (text.slice(filePart, headerEnd).match(/Content-Type: ([^\r\n]+)/i) || [])[1];
      const n = mock.uploads.push({ request: reqJson, size: body.length, contentType, file: body.subarray(headerEnd, fileEnd), hasFile: filePart > 0 && contentType === 'audio/mpeg' });
      return send(200, { path: `operations/op${n}`, operationId: `op${n}`, done: false });
    }
    let m;
    if ((m = url.pathname.match(/^\/assets\/v1\/operations\/op(\d+)$/))) {
      const up = mock.uploads[m[1] - 1];
      return send(200, { path: url.pathname, done: true, response: { assetId: String(1000 + Number(m[1])), displayName: up.request.displayName, moderationResult: { moderationState: 'MODERATION_STATE_REVIEWING' } } });
    }
    if ((m = url.pathname.match(/^\/assets\/v1\/assets\/(\d+)$/))) {
      const id = m[1];
      const n = (mock.assetChecks.get(id) || 0) + 1;
      mock.assetChecks.set(id, n);
      const up = mock.uploads[Number(id) - 1001];
      const final = up.request.displayName.includes('BAD') ? 'Rejected' : 'Approved';
      return send(200, { assetId: id, moderationResult: { moderationState: n < 2 ? 'Reviewing' : final } });
    }
    if (url.pathname === '/datastores/v1/universes/999/standard-datastores/datastore/entries/entry') {
      const key = `${url.searchParams.get('datastoreName')}/${url.searchParams.get('entryKey')}`;
      if (req.method === 'GET') {
        if (!mock.datastore.has(key)) return send(404, { error: 'NOT_FOUND', message: 'Entry not found.' });
        return send(200, JSON.parse(mock.datastore.get(key)));
      }
      if (req.method === 'POST') {
        const md5 = crypto.createHash('md5').update(body).digest('base64');
        if (req.headers['content-md5'] !== md5) return send(400, { message: 'bad md5' });
        mock.datastore.set(key, body.toString());
        return send(200, { version: '1' });
      }
    }
    send(404, { message: `mock: ${req.method} ${url.pathname}` });
  });
});

let app, server, base, jobsModule;

test.before(async () => {
  await new Promise((r) => mockServer.listen(0, r));
  Object.assign(process.env, {
    DATA_DIR: tmp,
    ROBLOX_API_BASE: `http://127.0.0.1:${mockServer.address().port}`,
    ADMIN_ID: 'admin',
    ADMIN_PASSWORD: 'admin-pass',
    SESSION_SECRET: 'test-secret',
    OPERATION_POLL_MS: '10',
    MODERATION_POLL_MS: '20',
    MODERATION_TIMEOUT_MS: '5000',
    BACKGROUND_RECHECK_MS: '600000',
    ROBLOX_API_KEY: '',
  });
  app = require('../server');
  jobsModule = require('../src/jobs');
  jobsModule.start();
  server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
});

test.after(() => {
  server?.close();
  mockServer.close();
  jobsModule?._store.saveNow();
  fs.rmSync(tmp, { recursive: true, force: true });
});

function client() {
  let cookie = '';
  return async (method, url, body, isForm) => {
    const headers = cookie ? { cookie } : {};
    if (body && !isForm) headers['content-type'] = 'application/json';
    const res = await fetch(base + url, { method, headers, body: isForm ? body : body ? JSON.stringify(body) : undefined, redirect: 'manual' });
    const sc = res.headers.get('set-cookie');
    if (sc) cookie = sc.split(';')[0];
    const data = res.headers.get('content-type')?.includes('json') ? await res.json() : null;
    return { status: res.status, data, headers: res.headers };
  };
}

function makeTone(file, seconds) {
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', `sine=frequency=440:duration=${seconds}`, file]);
}

async function waitFor(fn, ms = 15000) {
  const end = Date.now() + ms;
  for (;;) {
    const v = await fn();
    if (v) return v;
    if (Date.now() > end) throw new Error('timeout menunggu kondisi');
    await new Promise((r) => setTimeout(r, 50));
  }
}

test('alur lengkap admin & pelanggan', async () => {
  const admin = client();
  const cust = client();

  // halaman dilindungi
  assert.equal((await cust('GET', '/app')).status, 302);
  assert.equal((await cust('GET', '/api/jobs')).status, 401);

  // login admin & buat pelanggan
  assert.equal((await admin('POST', '/api/auth/login', { id: 'admin', password: 'salah' })).status, 401);
  const lg = await admin('POST', '/api/auth/login', { id: 'admin', password: 'admin-pass' });
  assert.equal(lg.data.redirect, '/admin');
  const created = await admin('POST', '/api/admin/customers', { id: 'budi01', name: 'Budi', useServerKey: false });
  assert.equal(created.status, 200);
  assert.ok(created.data.password.length >= 10);
  assert.equal((await admin('POST', '/api/admin/customers', { id: 'BUDI01' })).status, 409);

  // pelanggan login, tidak bisa akses admin
  const cl = await cust('POST', '/api/auth/login', { id: 'budi01', password: created.data.password });
  assert.equal(cl.data.redirect, '/app');
  assert.equal((await cust('GET', '/api/admin/customers')).status, 403);
  assert.equal((await cust('GET', '/admin')).status, 302);

  // upload ditolak sebelum pengaturan lengkap
  const tone = path.join(tmp, 'lagu.wav');
  makeTone(tone, 4);
  const mkForm = (name) => {
    const fd = new FormData();
    fd.append('files', new Blob([fs.readFileSync(tone)]), 'lagu.wav');
    fd.append('names', JSON.stringify([name]));
    fd.append('speedMode', 'speed');
    fd.append('factor', '2');
    return fd;
  };
  const early = await cust('POST', '/api/upload', mkForm('Lagu Satu'), true);
  assert.equal(early.status, 400);
  assert.match(early.data.error, /API key/);

  // simpan pengaturan
  const st = await cust('PUT', '/api/settings', { apiKey: API_KEY, creatorType: 'user', creatorId: '42', universeId: '999' });
  assert.equal(st.data.hasApiKey, true);
  assert.equal(st.data.apiKeyHint, '••••-123');
  assert.ok(!JSON.stringify(st.data).includes(API_KEY), 'API key tidak boleh dikirim balik');
  const raw = fs.readFileSync(path.join(tmp, 'customers.json'), 'utf8');
  assert.ok(!raw.includes(API_KEY), 'API key harus terenkripsi di disk');

  const tst = await cust('POST', '/api/settings/test');
  assert.equal(tst.data.datastore.ok, true, tst.data.datastore.message);

  // upload lagu yang akan disetujui + yang ditolak
  const up1 = await cust('POST', '/api/upload', mkForm('Lagu Satu'), true);
  assert.equal(up1.status, 200, JSON.stringify(up1.data));
  const up2 = await cust('POST', '/api/upload', mkForm('Lagu BAD'), true);
  const id1 = up1.data.jobs[0].id;
  const id2 = up2.data.jobs[0].id;

  const final = await waitFor(async () => {
    const { data } = await cust('GET', '/api/jobs');
    const a = data.jobs.find((j) => j.id === id1);
    const b = data.jobs.find((j) => j.id === id2);
    return a.status === 'done' && b.status === 'rejected' ? { a, b } : null;
  });

  // speed 2x: 4 detik -> ~2 detik
  assert.ok(Math.abs(final.a.duration - 2) < 0.15, `durasi ${final.a.duration}`);
  assert.deepEqual(final.a.steps, { process: 'done', upload: 'done', moderation: 'done', datastore: 'done' });
  assert.equal(final.a.assetId, '1001');
  assert.equal(final.b.steps.datastore, 'skipped');

  // request upload ke Roblox benar
  assert.equal(mock.uploads[0].request.assetType, 'Audio');
  assert.deepEqual(mock.uploads[0].request.creationContext, { creator: { userId: '42' } });
  assert.ok(mock.uploads[0].hasFile);

  // DataStore "songiddeerizcorp" berisi SoundId yang disetujui saja
  const stored = JSON.parse(mock.datastore.get('songiddeerizcorp/SongList'));
  assert.equal(stored.length, 1);
  assert.equal(stored[0].soundId, 1001);
  assert.equal(stored[0].name, 'Lagu Satu');
  assert.equal(stored[0].uploadedBy, 'budi01');

  // preview audio hasil proses
  const audio = await fetch(`${base}/api/jobs/${id1}/audio`, { headers: { cookie: '' } });
  assert.equal(audio.status, 401);

  // admin melihat semua job; nonaktifkan pelanggan -> sesi langsung tidak berlaku
  const all = await admin('GET', '/api/jobs');
  assert.equal(all.data.jobs.length, 2);
  await admin('PATCH', '/api/admin/customers/budi01', { active: false });
  assert.equal((await cust('GET', '/api/me')).status, 401);
  const relog = await cust('POST', '/api/auth/login', { id: 'budi01', password: created.data.password });
  assert.equal(relog.status, 403);
});

test('filter speed/tempo', () => {
  const { buildFilter } = require('../src/audio');
  assert.equal(buildFilter({ speedMode: 'speed', factor: 2 }), 'aresample=44100,asetrate=88200,aresample=44100');
  assert.equal(buildFilter({ speedMode: 'tempo', factor: 2 }), 'atempo=2');
  assert.equal(buildFilter({ speedMode: 'tempo', factor: 3 }), 'atempo=2,atempo=1.5');
  assert.throws(() => buildFilter({ factor: 10 }));
});

test('mode asli (1x): file dikirim ke Roblox tanpa diubah sedikit pun', async () => {
  const admin = client();
  await admin('POST', '/api/auth/login', { id: 'admin', password: 'admin-pass' });
  await admin('PUT', '/api/settings', { apiKey: API_KEY, creatorType: 'group', creatorId: '77', universeId: '999' });

  const tone = path.join(tmp, 'asli.wav');
  makeTone(tone, 3);
  const original = fs.readFileSync(tone);
  const fd = new FormData();
  fd.append('files', new Blob([original]), 'asli.wav');
  fd.append('names', JSON.stringify(['Lagu Asli']));
  fd.append('speedMode', 'original');
  fd.append('factor', '2'); // harus diabaikan pada mode asli
  fd.append('gainDb', '6'); // harus diabaikan pada mode asli
  const up = await admin('POST', '/api/upload', fd, true);
  assert.equal(up.status, 200, JSON.stringify(up.data));
  assert.deepEqual(up.data.jobs[0].options, { speedMode: 'original', factor: 1, gainDb: 0 });
  const id = up.data.jobs[0].id;

  const job = await waitFor(async () => {
    const { data } = await admin('GET', '/api/jobs');
    const j = data.jobs.find((x) => x.id === id);
    return j.status === 'done' ? j : null;
  });
  assert.ok(Math.abs(job.duration - 3) < 0.05, `durasi tetap ${job.duration}`);

  const sent = mock.uploads.find((u) => u.request.displayName === 'Lagu Asli');
  assert.equal(sent.contentType, 'audio/wav');
  assert.deepEqual(sent.request.creationContext, { creator: { groupId: '77' } });
  assert.ok(Buffer.compare(sent.file, original) === 0, 'isi file yang diupload identik dengan file asli');
});

test('mode asli: format yang tidak diterima Roblox (m4a) hanya dikonversi ke MP3, durasi sama', async () => {
  const { processAudio, mimeOf } = require('../src/audio');
  const src = path.join(tmp, 'lagu.m4a');
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=3', '-c:a', 'aac', src]);
  const out = await processAudio(src, path.join(tmp, 'm4a-out'), { speedMode: 'original' });
  assert.equal(out.converted, true);
  assert.equal(mimeOf(out.file), 'audio/mpeg');
  assert.ok(Math.abs(out.duration - 3) < 0.1, `durasi ${out.duration}`);
});
