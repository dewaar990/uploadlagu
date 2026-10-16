const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const config = require('./config');

// Format yang diterima Roblox apa adanya (tanpa konversi)
const ROBLOX_FORMATS = { '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.flac': 'audio/flac' };

function mimeOf(file) {
  return ROBLOX_FORMATS[path.extname(file).toLowerCase()] || 'application/octet-stream';
}

/**
 * Membuat filter ffmpeg untuk mempercepat audio.
 *  - "speed": kecepatan x factor DAN nada ikut naik (seperti "Change Speed"/nightcore).
 *  - "tempo": kecepatan x factor, nada tetap (seperti "Change Tempo").
 */
function buildFilter({ speedMode = 'speed', factor = 2, gainDb = 0 }) {
  const f = Number(factor);
  if (!Number.isFinite(f) || f < 0.5 || f > 4) throw new Error('Faktor kecepatan harus antara 0.5 dan 4.');
  const filters = [];
  if (speedMode === 'tempo') {
    // atempo paling aman dipakai berantai dengan nilai 0.5..2.0
    let rest = f;
    while (rest > 2) { filters.push('atempo=2'); rest /= 2; }
    while (rest < 0.5) { filters.push('atempo=0.5'); rest /= 0.5; }
    if (Math.abs(rest - 1) > 1e-9) filters.push(`atempo=${+rest.toFixed(6)}`);
  } else {
    const sr = 44100;
    filters.push(`aresample=${sr}`, `asetrate=${Math.round(sr * f)}`, `aresample=${sr}`);
  }
  const g = Number(gainDb) || 0;
  if (g !== 0) {
    if (g < -20 || g > 20) throw new Error('Gain harus antara -20 dan 20 dB.');
    filters.push(`volume=${g}dB`, 'alimiter=limit=0.98');
  }
  return filters.join(',');
}

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    p.stdout.on('data', (d) => (out += d));
    p.stderr.on('data', (d) => { err += d; if (err.length > 20000) err = err.slice(-20000); });
    p.on('error', (e) => reject(e.code === 'ENOENT' ? new Error(`${cmd} tidak ditemukan. Install ffmpeg atau set FFMPEG_PATH/FFPROBE_PATH.`) : e));
    p.on('close', (code) => (code === 0 ? resolve(out) : reject(new Error(`${cmd} gagal (kode ${code}): ${err.trim().split('\n').slice(-3).join(' | ')}`))));
  });
}

async function probeDuration(file) {
  const out = await run(config.audio.ffprobe, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', file]);
  const d = parseFloat(out);
  if (!Number.isFinite(d)) throw new Error('File bukan audio yang valid.');
  return d;
}

function checkDuration(duration) {
  if (duration > config.audio.maxSeconds) {
    throw new Error(`Durasi ${Math.round(duration)} detik, melebihi batas ${config.audio.maxSeconds} detik.`);
  }
}

/**
 * Mode "original" (1x): lagu tidak diubah sama sekali. File MP3/OGG/WAV/FLAC dikirim apa adanya;
 * format lain (M4A, AAC, dll.) atau file > batas ukuran Roblox hanya dikonversi ke MP3 kualitas tertinggi,
 * tanpa mengubah kecepatan, nada, maupun volume.
 */
async function keepOriginal(input, outBase) {
  const duration = await probeDuration(input);
  checkDuration(duration);
  const ext = path.extname(input).toLowerCase();
  const { size } = await fs.promises.stat(input);
  if (ROBLOX_FORMATS[ext] && size <= config.audio.robloxMaxMb * 1024 * 1024) {
    const file = outBase + ext;
    await fs.promises.copyFile(input, file);
    return { file, duration, converted: false };
  }
  const file = `${outBase}.mp3`;
  await run(config.audio.ffmpeg, ['-hide_banner', '-y', '-i', input, '-vn', '-c:a', 'libmp3lame', '-q:a', '0', file]);
  return { file, duration, converted: true };
}

/** Proses audio sesuai mode. Mengembalikan { file, duration, converted }. */
async function processAudio(input, outBase, opts) {
  if (opts.speedMode === 'original') return keepOriginal(input, outBase);
  const filter = buildFilter(opts);
  const output = `${outBase}.mp3`;
  await run(config.audio.ffmpeg, [
    '-hide_banner', '-y', '-i', input,
    '-vn', '-map_metadata', '-1',
    '-af', filter,
    '-ac', '2', '-ar', '44100',
    '-c:a', 'libmp3lame', '-b:a', config.audio.bitrate,
    output,
  ]);
  const duration = await probeDuration(output);
  checkDuration(duration);
  return { file: output, duration, converted: true };
}

module.exports = { buildFilter, processAudio, probeDuration, mimeOf };
