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
    'hero.how': 'Cara Pembelian',
    'svc.title': 'Layanan',
    'svc.sub': 'Semua kebutuhan development game Roblox kamu dalam satu tempat.',
    'trust.badge': 'Scripter Profesional',
    'trust.title': 'Scripter dengan alur logika rapi & UI/UX yang rapi',
    'trust.desc': 'Setiap sistem dibangun dengan alur logika yang terstruktur dan tampilan yang bersih, sehingga game kamu stabil, mudah dikembangkan, dan nyaman dimainkan.',
    'trust.1': 'Alur logika script terstruktur, mudah dibaca & dikembangkan',
    'trust.2': 'UI/UX rapi, konsisten, dan responsif di HP maupun PC',
    'trust.3': 'Harga jelas di awal, disesuaikan dengan kerumitan sistem',
    'trust.4': 'Komunikasi langsung lewat Discord selama pengerjaan',
    'price.label': 'Pembenahan sistem mulai dari', 'price.note': '— tergantung kerumitan sistem', 'price.cta': 'Tanya Harga',
    'svc.1.t': 'Upload Lagu Roblox', 'svc.1.d': 'Akses web ini: lagu dipercepat 2x, diupload ke Roblox, dicek moderasinya, dan SoundId otomatis masuk DataStore.',
    'svc.2.t': 'Jasa Scripting Roblox', 'svc.2.d': 'Semua jenis script Luau: gameplay, UI, shop, inventory, combat, quest, admin panel, sistem DataStore, dan lainnya.',
    'svc.3.t': 'Optimasi Sistem Roblox', 'svc.3.d': 'Mengatasi lag, memory leak, script berat, network berlebih, dan DataStore yang lambat agar game lancar.',
    'svc.4.t': 'Perbaikan Bug & Anti-Exploit', 'svc.4.d': 'Audit dan perbaikan script, validasi RemoteEvent di server, serta proteksi dari exploiter.',
    'sec.title': 'Keamanan Data & Aset',
    'sec.sub': 'Untuk kamu yang menyewa saya mengembangkan sistem game: data, aset, dan pemainmu tetap aman.',
    'sec.1.t': 'Kode & Aset Milik Kamu', 'sec.1.d': 'Seluruh script dan aset yang dibuat diserahkan penuh ke kamu, tidak dijual ulang atau dipakai di proyek lain.',
    'sec.2.t': 'Kerahasiaan Proyek', 'sec.2.d': 'Detail game, ide, aset, dan data proyek tidak dibagikan ke pihak lain mana pun.',
    'sec.3.t': 'Akses Seperlunya', 'sec.3.d': 'Saya hanya memakai izin Team Create yang dibutuhkan. Kamu bisa mencabut akses kapan saja setelah proyek selesai.',
    'sec.4.t': 'Data Pemain Aman', 'sec.4.d': 'Sistem DataStore dengan retry, session locking, dan backup agar data pemain tidak hilang atau rusak.',
    'sec.5.t': 'Proteksi dari Exploit', 'sec.5.d': 'Semua aksi penting divalidasi di server sehingga item, uang, dan aset pemain tidak bisa dicurangi.',
    'sec.6.t': 'API Key Terenkripsi', 'sec.6.d': 'API key Roblox yang kamu simpan di web ini dienkripsi (AES-256) dan tidak pernah ditampilkan lagi.',
    'buy.title': 'Cara Pembelian',
    'buy.sub': 'Semua pembelian dan konsultasi dilakukan langsung lewat Discord.',
    'buy.1.t': 'Hubungi via Discord', 'buy.1.d': 'Kirim pesan ke @deerizinhere di Discord.',
    'buy.2.t': 'Diskusikan Kebutuhan', 'buy.2.d': 'Ceritakan layanan yang kamu mau: akses upload lagu, scripting, atau optimasi sistem.',
    'buy.3.t': 'Sepakati Harga & Bayar', 'buy.3.d': 'Pembenahan sistem mulai Rp50.000, tergantung kerumitan. Harga & estimasi waktu disepakati sebelum pembayaran.',
    'buy.4.t': 'Terima Akses / Hasil', 'buy.4.d': 'Kamu mendapat ID pelanggan & password untuk web ini, atau hasil pekerjaan script/sistem kamu.',
    'buy.contact': 'Hubungi di Discord', 'buy.open': 'Buka Discord', 'buy.copy': 'Salin username',
    'login.title': 'Masuk',
    'login.sub': 'Gunakan ID pelanggan & password yang diberikan admin.',
    'login.id': 'ID Pelanggan',
    'login.password': 'Password',
    'login.submit': 'Masuk',
    'login.note': 'Belum punya akun? Akun hanya dibuat oleh admin DeeRiZ Corp Studios — beli akses lewat Discord @deerizinhere.',
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
    'hero.how': 'How to Buy',
    'svc.title': 'Services',
    'svc.sub': 'Everything your Roblox game development needs, in one place.',
    'trust.badge': 'Professional Scripter',
    'trust.title': 'A scripter with clean logic flow & polished UI/UX',
    'trust.desc': 'Every system is built with a structured logic flow and a clean interface, so your game stays stable, easy to extend, and pleasant to play.',
    'trust.1': 'Structured script logic that is easy to read & extend',
    'trust.2': 'Clean, consistent UI/UX that works on mobile and PC',
    'trust.3': 'Clear pricing up front, based on system complexity',
    'trust.4': 'Direct communication on Discord throughout the work',
    'price.label': 'System fixes starting from', 'price.note': '— depending on system complexity', 'price.cta': 'Ask for a Quote',
    'svc.1.t': 'Roblox Song Upload', 'svc.1.d': 'Access to this web app: songs sped up 2x, uploaded to Roblox, moderation-checked, SoundId saved to your DataStore.',
    'svc.2.t': 'Roblox Scripting', 'svc.2.d': 'Any Luau script: gameplay, UI, shops, inventory, combat, quests, admin panels, DataStore systems, and more.',
    'svc.3.t': 'Roblox System Optimization', 'svc.3.d': 'Fix lag, memory leaks, heavy scripts, excess network traffic and slow DataStores so your game runs smoothly.',
    'svc.4.t': 'Bug Fixing & Anti-Exploit', 'svc.4.d': 'Script audits and fixes, server-side RemoteEvent validation, and protection against exploiters.',
    'sec.title': 'Data & Asset Security',
    'sec.sub': 'For clients who hire me to build their game systems: your data, assets, and players stay safe.',
    'sec.1.t': 'Your Code & Assets', 'sec.1.d': 'All scripts and assets built for you are handed over in full, never resold or reused in other projects.',
    'sec.2.t': 'Project Confidentiality', 'sec.2.d': 'Game details, ideas, assets and project data are never shared with anyone else.',
    'sec.3.t': 'Least-Privilege Access', 'sec.3.d': 'I only use the Team Create permissions needed. You can revoke access at any time once the project is done.',
    'sec.4.t': 'Safe Player Data', 'sec.4.d': 'DataStore systems with retries, session locking and backups so player data is never lost or corrupted.',
    'sec.5.t': 'Exploit Protection', 'sec.5.d': 'Every important action is validated on the server, so items, currency and player assets cannot be cheated.',
    'sec.6.t': 'Encrypted API Keys', 'sec.6.d': 'Roblox API keys you save in this web app are encrypted (AES-256) and never shown again.',
    'buy.title': 'How to Buy',
    'buy.sub': 'All purchases and consultations happen directly on Discord.',
    'buy.1.t': 'Contact on Discord', 'buy.1.d': 'Send a message to @deerizinhere on Discord.',
    'buy.2.t': 'Discuss Your Needs', 'buy.2.d': 'Tell me which service you want: song-upload access, scripting, or system optimization.',
    'buy.3.t': 'Agree on Price & Pay', 'buy.3.d': 'System fixes start at Rp50.000 depending on complexity. Price & timeline are agreed before payment.',
    'buy.4.t': 'Receive Access / Delivery', 'buy.4.d': 'You get a customer ID & password for this web app, or the finished scripts/systems for your game.',
    'buy.contact': 'Contact on Discord', 'buy.open': 'Open Discord', 'buy.copy': 'Copy username',
    'login.title': 'Sign in',
    'login.sub': 'Use the customer ID & password given by the admin.',
    'login.id': 'Customer ID',
    'login.password': 'Password',
    'login.submit': 'Sign in',
    'login.note': "Don't have an account? Accounts are created by the DeeRiZ Corp Studios admin only — buy access on Discord @deerizinhere.",
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

// Liquid glass: pantulan cahaya pada tombol mengikuti posisi kursor/jari
document.addEventListener('pointermove', (e) => {
  const btn = e.target.closest?.('.btn');
  if (!btn) return;
  const r = btn.getBoundingClientRect();
  btn.style.setProperty('--mx', `${e.clientX - r.left}px`);
  btn.style.setProperty('--my', `${e.clientY - r.top}px`);
}, { passive: true });

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.lang button').forEach((b) => b.addEventListener('click', () => setLang(b.dataset.lang)));
  document.querySelectorAll('[data-action=logout]').forEach((b) => b.addEventListener('click', logout));
  applyI18n();
});
