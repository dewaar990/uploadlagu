const fs = require('fs');
const path = require('path');

/** Penyimpanan JSON sederhana berbasis file dengan penulisan atomik. */
class JsonStore {
  constructor(file, fallback) {
    this.file = file;
    this.fallback = fallback;
    this.data = this._load();
    this._timer = null;
  }

  _load() {
    try {
      return JSON.parse(fs.readFileSync(this.file, 'utf8'));
    } catch (err) {
      if (err.code !== 'ENOENT') console.error(`[store] gagal membaca ${this.file}:`, err.message);
      return structuredClone(this.fallback);
    }
  }

  saveNow() {
    clearTimeout(this._timer);
    this._timer = null;
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2), { mode: 0o600 });
    fs.renameSync(tmp, this.file);
  }

  save() {
    if (this._timer) return;
    this._timer = setTimeout(() => this.saveNow(), 200);
  }
}

module.exports = { JsonStore };
