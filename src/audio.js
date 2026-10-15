const { spawn } = require('child_process');
const config = require('./config');

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

/** Ubah file menjadi MP3 dengan kecepatan baru. Mengembalikan durasi (detik). */
async function processAudio(input, output, opts) {
  const filter = buildFilter(opts);
  await run(config.audio.ffmpeg, [
    '-hide_banner', '-y', '-i', input,
    '-vn', '-map_metadata', '-1',
    '-af', filter,
    '-ac', '2', '-ar', '44100',
    '-c:a', 'libmp3lame', '-b:a', config.audio.bitrate,
    output,
  ]);
  const duration = await probeDuration(output);
  if (duration > config.audio.maxSeconds) {
    throw new Error(`Durasi setelah diproses ${Math.round(duration)} detik, melebihi batas ${config.audio.maxSeconds} detik.`);
  }
  return duration;
}

module.exports = { buildFilter, processAudio, probeDuration };
