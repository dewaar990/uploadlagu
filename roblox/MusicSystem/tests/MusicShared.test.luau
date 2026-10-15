local M = require("../ReplicatedStorage/MusicShared")
local function eq(a, b, msg) if a ~= b then error(`{msg}: expected {b}, got {a}`) end end
-- format persis dari web (mode list)
local raw = {
  { soundId = 123456789012, name = "Lagu Satu", uploadedBy = "DRZ-1", uploadedAt = "2026-10-15T02:00:00.000Z" },
  { soundId = 222, name = "  Lagu Dua", uploadedBy = "budi", uploadedAt = "2026-10-16T02:00:00.000Z" },
  { soundId = 222, name = "duplikat" },
  { soundId = -5, name = "rusak" },
  { name = "tanpa id" },
  "333", 444, "abc", { SoundId = "555" },
}
local list = M.sanitizeList(raw)
eq(#list, 5, "jumlah lagu valid")
eq(list[1].soundId, 222, "terbaru di atas")
eq(list[1].name, "Lagu Dua", "nama di-trim")
eq(list[2].soundId, 123456789012, "id besar tetap utuh")
eq(list[3].name, "Sound 333", "string angka")
eq(#M.sanitizeList(nil), 0, "nil aman")
eq(#M.sanitizeList("x"), 0, "bukan tabel aman")
eq(M.sanitizeSong({ soundId = 7.9 }).soundId, 7, "dibulatkan")
eq(M.sanitizeSong({ soundId = 0/0 }), nil, "NaN ditolak")
eq(#string.rep("a", 200) > 80 and #M.sanitizeSong({ soundId = 1, name = string.rep("a", 200) }).name, 80, "nama dipotong 80")
print("semua tes sanitize lulus")
