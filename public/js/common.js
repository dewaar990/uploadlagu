/* Utilitas bersama: bahasa (ID/EN), panggilan API, toast. */
const I18N = {
  id: {
    'nav.login': 'Masuk',
    'nav.dashboard': 'Dashboard',
    'nav.logout': 'Keluar',
    'nav.admin': 'Admin',
    'hero.title': 'Konversi & Upload Audio ke Roblox',
    'hero.lead': 'Percepat lagu 2x secara otomatis, upload langsung ke Roblox dengan API key, cek moderasi, dan SoundId otomatis masuk ke DataStore game kamu.',
    'hero.start': 'Mulai Sekarang',
    'hero.how': 'Cara Kerja',
    'how.title': 'Cara Kerja',
    'how.sub': 'Semua langkah berjalan otomatis setelah kamu memilih file lagu.',
    'how.1.t': 'Upload Lagu', 'how.1.d': 'Pilih satu atau beberapa file MP3, WAV, OGG, FLAC, M4A sekaligus.',
    'how.2.t': 'Speed 2x', 'how.2.d': 'Lagu dipercepat 2x (bisa pilih nada ikut naik atau tetap) dan diubah ke MP3.',
    'how.3.t': 'Upload ke Roblox', 'how.3.d': 'Dikirim ke Creator Hub lewat Open Cloud API key milikmu.',
    'how.4.t': 'Cek Moderasi', 'how.4.d': 'Status dicek sampai Roblox menyatakan lagu Approved atau Rejected.',
    'how.5.t': 'Masuk DataStore', 'how.5.d': 'SoundId yang lolos otomatis disimpan ke DataStore "songiddeerizcorp".',
    'cta.title': 'Butuh akses?',
    'cta.sub': 'Akun pelanggan hanya dibuat oleh admin DeeRiZ Corp Studios. Hubungi admin untuk mendapatkan ID pelanggan & password.',
    'login.title': 'Masuk',
    'login.sub': 'Gunakan ID pelanggan & password yang diberikan admin.',
    'login.id': 'ID Pelanggan',
    'login.password': 'Password',
    'login.submit': 'Masuk',
    'login.note': 'Belum punya akun? Akun hanya dibuat oleh admin DeeRiZ Corp Studios — hubungi admin untuk mendapatkan ID pelanggan & password.',
    'app.title': 'Upload Lagu',
    'app.sub': 'Lagu dipercepat, diupload ke Roblox, dicek moderasinya, lalu SoundId otomatis masuk DataStore.',
    'tab.upload': 'Upload', 'tab.history': 'Riwayat', 'tab.settings': 'Pengaturan Roblox',
    'up.drop': 'Tarik & lepas lagu di sini', 'up.or': 'atau klik untuk memilih file (bisa banyak sekaligus)',
    'up.mode': 'Mode kecepatan',
    'up.mode.speed': 'Speed (nada naik)', 'up.mode.speed.d': 'Seperti "Change Speed" — lebih cepat & nada lebih tinggi',
    'up.mode.tempo': 'Tempo (nada tetap)', 'up.mode.tempo.d': 'Seperti "Change Tempo" — lebih cepat, nada asli',
    'up.factor': 'Kecepatan', 'up.gain': 'Volume (gain)',
    'up.submit': 'Proses & Upload ke Roblox',
    'up.name': 'Nama di Roblox',
    'up.needSettings': 'Lengkapi Pengaturan Roblox (API key, ID creator, Universe ID) sebelum upload.',
    'hist.title': 'Riwayat Upload', 'hist.empty': 'Belum ada lagu yang diupload.',
    'st.queued': 'Antri', 'st.processing': 'Memproses audio', 'st.uploading': 'Upload ke Roblox', 'st.reviewing': 'Cek moderasi',
    'st.saving': 'Simpan DataStore', 'st.done': 'Selesai', 'st.rejected': 'Ditolak Roblox', 'st.review_timeout': 'Masih ditinjau', 'st.error': 'Gagal',
    'step.process': 'Speed', 'step.upload': 'Upload', 'step.moderation': 'Moderasi', 'step.datastore': 'DataStore',
    'job.retry': 'Coba lagi', 'job.recheck': 'Cek ulang moderasi', 'job.delete': 'Hapus', 'job.log': 'Log proses', 'job.copy': 'Salin',
    'set.title': 'Pengaturan Roblox Open Cloud',
    'set.hint': 'Buat API key di create.roblox.com → Open Cloud → API Keys.',
    'set.apiKey': 'API Key (Assets + DataStore)',
    'set.dsKey': 'API Key khusus DataStore (opsional)',
    'set.creatorType': 'Upload sebagai', 'set.user': 'User', 'set.group': 'Grup',
    'set.creatorId': 'User ID / Group ID', 'set.universeId': 'Universe ID (game)',
    'set.save': 'Simpan', 'set.test': 'Tes Koneksi', 'set.clear': 'Hapus key',
    'set.ds': 'DataStore tujuan',
    'admin.title': 'Kelola Pelanggan', 'admin.sub': 'Hanya admin yang bisa membuat ID pelanggan & password.',
    'admin.new': 'Buat Pelanggan Baru', 'admin.id': 'ID Pelanggan (kosong = otomatis)', 'admin.name': 'Nama pelanggan',
    'admin.password': 'Password (kosong = otomatis)', 'admin.expires': 'Berlaku sampai (opsional)',
    'admin.useServerKey': 'Boleh memakai API key server (.env) bila pelanggan belum isi sendiri',
    'admin.create': 'Buat Akun', 'admin.list': 'Daftar Pelanggan', 'admin.empty': 'Belum ada pelanggan.',
    'admin.created': 'Akun berhasil dibuat', 'admin.copyNote': 'Simpan & kirim ke pelanggan. Password tidak bisa dilihat lagi.',
    'admin.copy': 'Salin', 'admin.close': 'Tutup',
    'admin.reset': 'Reset password', 'admin.disable': 'Nonaktifkan', 'admin.enable': 'Aktifkan', 'admin.delete': 'Hapus',
    'admin.active': 'Aktif', 'admin.inactive': 'Nonaktif', 'admin.expired': 'Kedaluwarsa', 'admin.never': 'Selamanya',
    'admin.openApp': 'Buka Dashboard Upload',
    'col.id': 'ID', 'col.name': 'Nama', 'col.status': 'Status', 'col.expires': 'Berlaku', 'col.last': 'Login terakhir', 'col.actions': 'Aksi',
    'common.copied': 'Disalin!', 'common.saved': 'Tersimpan', 'common.confirmDelete': 'Yakin hapus?',
  },
  en: {
    'nav.login': 'Sign in',
    'nav.dashboard': 'Dashboard',
    'nav.logout': 'Sign out',
    'nav.admin': 'Admin',
    'hero.title': 'Convert & Upload Audio to Roblox',
    'hero.lead': 'Speed up songs 2x automatically, upload straight to Roblox with your API key, check moderation, and save the SoundId to your game DataStore.',
    'hero.start': 'Get Started',
    'hero.how': 'How It Works',
    'how.title': 'How It Works',
    'how.sub': 'Every step runs automatically once you pick your audio files.',
    'how.1.t': 'Upload Songs', 'how.1.d': 'Pick one or many MP3, WAV, OGG, FLAC, M4A files at once.',
    'how.2.t': 'Speed 2x', 'how.2.d': 'Songs are sped up 2x (pitch up or pitch kept) and converted to MP3.',
    'how.3.t': 'Upload to Roblox', 'how.3.d': 'Sent to Creator Hub through your Open Cloud API key.',
    'how.4.t': 'Moderation Check', 'how.4.d': 'Status is polled until Roblox marks the song Approved or Rejected.',
    'how.5.t': 'Saved to DataStore', 'how.5.d': 'Approved SoundIds are saved to the "songiddeerizcorp" DataStore.',
    'cta.title': 'Need access?',
    'cta.sub': 'Customer accounts are created by the DeeRiZ Corp Studios admin only. Contact the admin to get your customer ID & password.',
    'login.title': 'Sign in',
    'login.sub': 'Use the customer ID & password given by the admin.',
    'login.id': 'Customer ID',
    'login.password': 'Password',
    'login.submit': 'Sign in',
    'login.note': "Don't have an account? Accounts are created by the DeeRiZ Corp Studios admin only — contact the admin to get a customer ID & password.",
    'app.title': 'Upload Songs',
    'app.sub': 'Songs are sped up, uploaded to Roblox, moderation-checked, then the SoundId is saved to the DataStore.',
    'tab.upload': 'Upload', 'tab.history': 'History', 'tab.settings': 'Roblox Settings',
    'up.drop': 'Drag & drop songs here', 'up.or': 'or click to pick files (multiple allowed)',
    'up.mode': 'Speed mode',
    'up.mode.speed': 'Speed (pitch up)', 'up.mode.speed.d': 'Like "Change Speed" — faster & higher pitch',
    'up.mode.tempo': 'Tempo (keep pitch)', 'up.mode.tempo.d': 'Like "Change Tempo" — faster, original pitch',
    'up.factor': 'Speed', 'up.gain': 'Volume (gain)',
    'up.submit': 'Process & Upload to Roblox',
    'up.name': 'Name on Roblox',
    'up.needSettings': 'Complete Roblox Settings (API key, creator ID, Universe ID) before uploading.',
    'hist.title': 'Upload History', 'hist.empty': 'No songs uploaded yet.',
    'st.queued': 'Queued', 'st.processing': 'Processing audio', 'st.uploading': 'Uploading to Roblox', 'st.reviewing': 'Checking moderation',
    'st.saving': 'Saving DataStore', 'st.done': 'Done', 'st.rejected': 'Rejected by Roblox', 'st.review_timeout': 'Still in review', 'st.error': 'Failed',
    'step.process': 'Speed', 'step.upload': 'Upload', 'step.moderation': 'Moderation', 'step.datastore': 'DataStore',
    'job.retry': 'Retry', 'job.recheck': 'Re-check moderation', 'job.delete': 'Delete', 'job.log': 'Process log', 'job.copy': 'Copy',
    'set.title': 'Roblox Open Cloud Settings',
    'set.hint': 'Create an API key at create.roblox.com → Open Cloud → API Keys.',
    'set.apiKey': 'API Key (Assets + DataStore)',
    'set.dsKey': 'DataStore-only API Key (optional)',
    'set.creatorType': 'Upload as', 'set.user': 'User', 'set.group': 'Group',
    'set.creatorId': 'User ID / Group ID', 'set.universeId': 'Universe ID (game)',
    'set.save': 'Save', 'set.test': 'Test Connection', 'set.clear': 'Remove key',
    'set.ds': 'Target DataStore',
    'admin.title': 'Manage Customers', 'admin.sub': 'Only the admin can create customer IDs & passwords.',
    'admin.new': 'New Customer', 'admin.id': 'Customer ID (blank = auto)', 'admin.name': 'Customer name',
    'admin.password': 'Password (blank = auto)', 'admin.expires': 'Valid until (optional)',
    'admin.useServerKey': "May use the server's API key (.env) if the customer has none",
    'admin.create': 'Create Account', 'admin.list': 'Customers', 'admin.empty': 'No customers yet.',
    'admin.created': 'Account created', 'admin.copyNote': 'Save & send to the customer. The password cannot be shown again.',
    'admin.copy': 'Copy', 'admin.close': 'Close',
    'admin.reset': 'Reset password', 'admin.disable': 'Disable', 'admin.enable': 'Enable', 'admin.delete': 'Delete',
    'admin.active': 'Active', 'admin.inactive': 'Disabled', 'admin.expired': 'Expired', 'admin.never': 'Forever',
    'admin.openApp': 'Open Upload Dashboard',
    'col.id': 'ID', 'col.name': 'Name', 'col.status': 'Status', 'col.expires': 'Valid until', 'col.last': 'Last login', 'col.actions': 'Actions',
    'common.copied': 'Copied!', 'common.saved': 'Saved', 'common.confirmDelete': 'Delete this?',
  },
};

let LANG = (() => { try { return localStorage.getItem('drz_lang') || 'id'; } catch { return 'id'; } })();
if (!I18N[LANG]) LANG = 'id';
const langListeners = [];

function t(key) {
  return I18N[LANG][key] ?? I18N.id[key] ?? key;
}

function applyI18n(root = document) {
  document.documentElement.lang = LANG;
  root.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  root.querySelectorAll('[data-i18n-placeholder]').forEach((el) => { el.placeholder = t(el.dataset.i18nPlaceholder); });
  document.querySelectorAll('.lang button').forEach((b) => b.classList.toggle('active', b.dataset.lang === LANG));
}

function setLang(lang) {
  LANG = lang;
  try { localStorage.setItem('drz_lang', lang); } catch { /* abaikan */ }
  applyI18n();
  langListeners.forEach((fn) => fn());
}

function onLangChange(fn) { langListeners.push(fn); }

async function api(url, { method = 'GET', body, form } = {}) {
  const opts = { method, headers: {} };
  if (form) opts.body = form;
  else if (body !== undefined) { opts.body = JSON.stringify(body); opts.headers['content-type'] = 'application/json'; }
  const res = await fetch(url, opts);
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && !url.includes('/api/auth/')) { location.href = '/login'; throw new Error(data.error || 'Unauthorized'); }
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

let toastTimer;
function toast(msg, type = '') {
  let el = document.querySelector('.toast');
  if (!el) { el = document.createElement('div'); document.body.appendChild(el); }
  el.className = `toast ${type}`;
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 3500);
}

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); }
  catch {
    const ta = Object.assign(document.createElement('textarea'), { value: text });
    document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
  }
  toast(t('common.copied'), 'ok');
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(LANG === 'id' ? 'id-ID' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' });
}

async function logout() {
  await api('/api/auth/logout', { method: 'POST' }).catch(() => {});
  location.href = '/login';
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.lang button').forEach((b) => b.addEventListener('click', () => setLang(b.dataset.lang)));
  document.querySelectorAll('[data-action=logout]').forEach((b) => b.addEventListener('click', logout));
  applyI18n();
});
