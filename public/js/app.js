/* Dashboard upload lagu */
const $ = (s) => document.querySelector(s);
let selected = []; // { file, name }
let settings = null;
let jobsCache = [];
let pollTimer = null;
let isAdmin = false;

// ------------------------------------------------------------------ tabs
function showTab(name) {
  document.querySelectorAll('.tabs button').forEach((b) => b.classList.toggle('active', b.dataset.tab === name));
  document.querySelectorAll('[data-panel]').forEach((p) => { p.hidden = p.dataset.panel !== name; });
  try { localStorage.setItem('drz_tab', name); } catch { /* abaikan */ }
}
document.querySelectorAll('.tabs button').forEach((b) => b.addEventListener('click', () => showTab(b.dataset.tab)));

// ------------------------------------------------------------------ user
api('/api/me').then((me) => {
  $('#userName').textContent = me.name || me.id;
  isAdmin = me.role === 'admin';
  $('#adminLink').hidden = !isAdmin;
});

// ------------------------------------------------------------------ file picker
const dz = $('#dropzone');
const input = $('#fileInput');
input.addEventListener('change', () => { addFiles(input.files); input.value = ''; });
['dragenter', 'dragover'].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add('drag'); }));
['dragleave', 'drop'].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.remove('drag'); }));
dz.addEventListener('drop', (e) => addFiles(e.dataTransfer.files));

function addFiles(list) {
  for (const file of list) {
    if (selected.length >= 20) break;
    selected.push({ file, name: file.name.replace(/\.[^.]+$/, '').slice(0, 50) });
  }
  renderFiles();
}

function renderFiles() {
  const ul = $('#fileList');
  ul.innerHTML = selected.map((s, i) => `
    <li>
      <input class="input" data-i="${i}" maxlength="50" value="${esc(s.name)}" title="${esc(t('up.name'))}" style="flex:1;min-width:160px">
      <span class="meta">${esc(s.file.name)} · ${(s.file.size / 1048576).toFixed(1)} MB</span>
      <button type="button" class="icon-btn" data-remove="${i}" aria-label="remove">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
    </li>`).join('');
  ul.querySelectorAll('input').forEach((el) => el.addEventListener('input', () => { selected[el.dataset.i].name = el.value; }));
  ul.querySelectorAll('[data-remove]').forEach((el) => el.addEventListener('click', () => { selected.splice(+el.dataset.remove, 1); renderFiles(); }));
  $('#uploadBtn').disabled = !selected.length;
}

const factor = $('#factor');
const gain = $('#gainDb');
factor.addEventListener('input', () => { $('#factorVal').textContent = `${factor.value}x`; });
gain.addEventListener('input', () => { $('#gainVal').textContent = `${gain.value > 0 ? '+' : ''}${gain.value} dB`; });

// ------------------------------------------------------------------ upload
$('#uploadForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!selected.length) return;
  const btn = $('#uploadBtn');
  btn.disabled = true;
  const fd = new FormData();
  selected.forEach((s) => fd.append('files', s.file, s.file.name));
  fd.append('names', JSON.stringify(selected.map((s) => s.name)));
  fd.append('speedMode', document.querySelector('input[name=speedMode]:checked').value);
  fd.append('factor', factor.value);
  fd.append('gainDb', gain.value);
  try {
    await api('/api/upload', { method: 'POST', form: fd });
    selected = [];
    renderFiles();
    showTab('history');
    loadJobs();
  } catch (err) {
    toast(err.message, 'err');
    btn.disabled = false;
  }
});

// ------------------------------------------------------------------ jobs
const STATUS_CLASS = { done: 'ok', rejected: 'err', error: 'err', review_timeout: 'warn' };
const ACTIVE = new Set(['queued', 'processing', 'uploading', 'reviewing', 'saving']);

async function loadJobs() {
  try {
    const { jobs } = await api('/api/jobs');
    jobsCache = jobs;
    renderJobs();
  } catch { /* coba lagi di polling berikutnya */ }
  clearTimeout(pollTimer);
  const busy = jobsCache.some((j) => ACTIVE.has(j.status) || j.checking);
  pollTimer = setTimeout(loadJobs, busy ? 2500 : 15000);
}

function renderJobs(force = false) {
  const active = jobsCache.filter((j) => ACTIVE.has(j.status)).length;
  $('#activeCount').hidden = !active;
  $('#activeCount').textContent = active;

  const box = $('#jobs');
  if (!jobsCache.length) { box.innerHTML = `<div class="empty">${esc(t('hist.empty'))}</div>`; return; }

  // jangan render ulang saat audio preview sedang diputar agar tidak terputus
  if (!force && [...box.querySelectorAll('audio')].some((a) => !a.paused)) return;
  const openLogs = new Set([...box.querySelectorAll('details[open]')].map((d) => d.dataset.id));

  box.innerHTML = jobsCache.map((j) => {
    const cls = STATUS_CLASS[j.status] || 'run';
    const steps = ['process', 'upload', 'moderation', 'datastore']
      .map((s) => `<div class="pipe ${j.steps[s]}">${esc(t(`step.${s}`))}</div>`).join('');
    const canRetry = ['error', 'review_timeout'].includes(j.status) && !j.checking;
    return `
      <article class="job">
        <div class="job-head">
          <div>
            <div class="job-title">${esc(j.displayName)}</div>
            <div class="job-sub">${esc(j.originalName)} · ${esc(j.options.factor)}x ${esc(j.options.speedMode)} · ${esc(fmtDate(j.createdAt))}${isAdmin ? ` · ${esc(j.owner)}` : ''}</div>
          </div>
          <span class="badge ${cls}">${esc(t(`st.${j.status}`))}</span>
        </div>
        <div class="pipeline">${steps}</div>
        ${j.assetId ? `<div class="row"><span class="sound-id">SoundId: <b>${esc(j.assetId)}</b></span>
          <button class="btn btn-ghost btn-sm" data-copy="${esc(j.assetId)}">${esc(t('job.copy'))}</button>
          <a class="btn btn-ghost btn-sm" href="https://create.roblox.com/store/asset/${encodeURIComponent(j.assetId)}" target="_blank" rel="noopener">Roblox ↗</a></div>` : ''}
        ${j.error ? `<p class="job-error">${esc(j.error)}</p>` : ''}
        <div class="job-actions">
          ${j.hasAudio ? `<audio controls preload="none" data-id="${j.id}" src="/api/jobs/${j.id}/audio"></audio>` : ''}
          ${canRetry ? `<button class="btn btn-primary btn-sm" data-retry="${j.id}">${esc(t(j.assetId ? 'job.recheck' : 'job.retry'))}</button>` : ''}
          ${!ACTIVE.has(j.status) ? `<button class="btn btn-danger btn-sm" data-del="${j.id}">${esc(t('job.delete'))}</button>` : ''}
        </div>
        <details data-id="${j.id}" ${openLogs.has(j.id) ? 'open' : ''}>
          <summary>${esc(t('job.log'))}</summary>
          <ol>${(j.log || []).map((l) => `<li>${esc(new Date(l.at).toLocaleTimeString())} — ${esc(l.msg)}</li>`).join('')}</ol>
        </details>
      </article>`;
  }).join('');
}

$('#jobs').addEventListener('click', async (e) => {
  const el = e.target.closest('button');
  if (!el) return;
  if (el.dataset.copy) return copyText(el.dataset.copy);
  try {
    if (el.dataset.retry) {
      el.disabled = true;
      await api(`/api/jobs/${el.dataset.retry}/retry`, { method: 'POST' });
    } else if (el.dataset.del) {
      if (!confirm(t('common.confirmDelete'))) return;
      await api(`/api/jobs/${el.dataset.del}`, { method: 'DELETE' });
    }
    loadJobs();
  } catch (err) {
    toast(err.message, 'err');
    el.disabled = false;
  }
});

// ------------------------------------------------------------------ settings
const sf = $('#settingsForm');

function renderSettings() {
  const s = settings;
  if (!s) return;
  $('#apiKey').value = '';
  $('#datastoreApiKey').value = '';
  $('#apiKey').placeholder = s.hasApiKey ? `${s.apiKeyHint} (tersimpan)` : s.server.hasApiKey ? '(memakai API key server)' : 'Tempel API key…';
  $('#datastoreApiKey').placeholder = s.hasDatastoreApiKey ? `${s.datastoreApiKeyHint} (tersimpan)` : '(sama dengan API key di atas)';
  $('#clearApiKey').hidden = !s.hasApiKey;
  $('#clearDsKey').hidden = !s.hasDatastoreApiKey;
  $('#creatorType').value = s.creatorType;
  $('#creatorTypeDefault').textContent = s.server.creatorType ? `Default server (${s.server.creatorType})` : 'User (default)';
  $('#creatorId').value = s.creatorId;
  $('#creatorId').placeholder = s.server.creatorId ? `Default server: ${s.server.creatorId}` : 'contoh: 123456789';
  $('#universeId').value = s.universeId;
  $('#universeId').placeholder = s.server.universeId ? `Default server: ${s.server.universeId}` : 'contoh: 5678901234';

  const note = $('#serverNote');
  note.hidden = !s.server.hasApiKey;
  note.textContent = LANG === 'id'
    ? 'Admin sudah menyiapkan API key server. Kosongkan kolom jika ingin memakai pengaturan server, atau isi untuk memakai akun Roblox kamu sendiri.'
    : 'The admin has configured a server API key. Leave fields empty to use the server settings, or fill them to use your own Roblox account.';

  const d = s.datastore;
  $('#dsInfo').innerHTML = `
    <dt>Nama</dt><dd>${esc(d.name)}</dd>
    <dt>Mode</dt><dd>${esc(d.mode === 'list' ? `list → key "${d.entryKey}" (array)` : 'per-id → key = SoundId')}</dd>
    <dt>Scope</dt><dd>${esc(d.scope)}</dd>`;

  const own = !!s.hasApiKey;
  const ready = (own || s.server.hasApiKey) && (s.creatorId || (!own && s.server.creatorId)) && (s.universeId || (!own && s.server.universeId));
  $('#needSettings').hidden = !!ready;
}

async function loadSettings() {
  settings = await api('/api/settings');
  renderSettings();
}

sf.addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    settings = await api('/api/settings', {
      method: 'PUT',
      body: {
        apiKey: $('#apiKey').value,
        datastoreApiKey: $('#datastoreApiKey').value,
        creatorType: $('#creatorType').value,
        creatorId: $('#creatorId').value,
        universeId: $('#universeId').value,
      },
    });
    renderSettings();
    toast(t('common.saved'), 'ok');
  } catch (err) { toast(err.message, 'err'); }
});

async function clearKey(field) {
  settings = await api('/api/settings', { method: 'PUT', body: { [field]: true } });
  renderSettings();
}
$('#clearApiKey').addEventListener('click', () => clearKey('clearApiKey').catch((e) => toast(e.message, 'err')));
$('#clearDsKey').addEventListener('click', () => clearKey('clearDatastoreApiKey').catch((e) => toast(e.message, 'err')));

$('#testBtn').addEventListener('click', async (e) => {
  const btn = e.currentTarget;
  btn.disabled = true;
  const box = $('#testResult');
  try {
    const r = await api('/api/settings/test', { method: 'POST' });
    box.innerHTML = [['Assets', r.assets], ['DataStore', r.datastore]]
      .map(([n, x]) => `<div class="notice ${x.ok ? 'ok' : 'err'}">${x.ok ? '✅' : '❌'} <b>${n}:</b> ${esc(x.message)}</div>`).join('');
  } catch (err) { toast(err.message, 'err'); }
  btn.disabled = false;
});

// ------------------------------------------------------------------ init
onLangChange(() => { renderFiles(); renderJobs(true); renderSettings(); });
let startTab = 'upload';
try { startTab = localStorage.getItem('drz_tab') || 'upload'; } catch { /* abaikan */ }
showTab(['upload', 'history', 'settings'].includes(startTab) ? startTab : 'upload');
loadSettings().catch((e) => toast(e.message, 'err'));
loadJobs();
