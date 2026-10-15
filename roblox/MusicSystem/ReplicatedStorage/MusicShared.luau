--!strict
-- ModuleScript: ReplicatedStorage > MusicShared
-- Konfigurasi + tipe yang dipakai bersama oleh server (MusicServer) dan client (MusicClient).

export type Song = {
	soundId: number,
	name: string,
	uploadedBy: string?,
	uploadedAt: string?,
}

export type RadioState = {
	soundId: number?,
	name: string?,
	startedAt: number?, -- workspace:GetServerTimeNow() saat mulai
}

local Config = {
	-- Harus sama dengan pengaturan web (DATASTORE_NAME / DATASTORE_SCOPE / DATASTORE_MODE / DATASTORE_ENTRY_KEY)
	STORE_NAME = "songiddeerizcorp",
	STORE_SCOPE = "global",
	MODE = "list", -- "list" = satu key berisi array lagu | "per-id" = setiap SoundId jadi key sendiri
	ENTRY_KEY = "SongList",
	MAX_SONGS = 500,

	-- Cek DataStore berkala supaya lagu baru dari web langsung muncul tanpa restart server
	REFRESH_SECONDS = 60,
	-- Cek lewat MarketplaceService bahwa ID benar-benar asset Audio
	VERIFY_ASSETS = true,

	DEFAULT_VOLUME = 0.5,
	PLAYBACK_SPEED = 1,
	LOAD_TIMEOUT = 10, -- detik; lebih dari ini dianggap audio gagal dimuat

	-- Radio: satu lagu diputar untuk semua pemain di server
	RADIO_ENABLED = true,
	RADIO_AUTOPLAY = true, -- otomatis memutar lagu acak berikutnya
	-- Siapa yang boleh mengatur radio (DJ). Pemilik game & Studio otomatis DJ.
	DJ_USER_IDS = {} :: { number },
	DJ_GROUP_ID = 0, -- 0 = tidak memakai grup
	DJ_MIN_RANK = 255,

	REQUEST_COOLDOWN = 1, -- detik antar permintaan dari satu pemain
}

local MusicShared = {
	Config = Config,
	REMOTES_FOLDER = "MusicRemotes",
}

local MAX_ID = 2 ^ 53

local function toId(v: any): number?
	local n = if type(v) == "number" then v elseif type(v) == "string" then tonumber(v) else nil
	if n == nil or n ~= n or n <= 0 or n >= MAX_ID then
		return nil
	end
	return math.floor(n)
end

-- Ubah satu entry mentah dari DataStore menjadi Song yang valid (atau nil).
-- Menerima format web { soundId, name, ... }, angka langsung, atau string angka.
function MusicShared.sanitizeSong(raw: any): Song?
	if type(raw) ~= "table" then
		local id = toId(raw)
		return if id then { soundId = id, name = `Sound {id}` } else nil
	end
	local id = toId(raw.soundId or raw.SoundId or raw.id)
	if not id then
		return nil
	end
	local name = if type(raw.name) == "string" then raw.name else ""
	name = string.sub(string.gsub(name, "^%s+", ""), 1, 80)
	return {
		soundId = id,
		name = if name ~= "" then name else `Sound {id}`,
		uploadedBy = if type(raw.uploadedBy) == "string" then string.sub(raw.uploadedBy, 1, 40) else nil,
		uploadedAt = if type(raw.uploadedAt) == "string" then string.sub(raw.uploadedAt, 1, 40) else nil,
	}
end

-- Bersihkan seluruh daftar: buang data rusak & duplikat, urutkan terbaru di atas.
function MusicShared.sanitizeList(raw: any): { Song }
	local out: { Song } = {}
	local seen: { [number]: boolean } = {}
	if type(raw) ~= "table" then
		return out
	end
	for _, item in raw do
		local song = MusicShared.sanitizeSong(item)
		if song and not seen[song.soundId] then
			seen[song.soundId] = true
			table.insert(out, song)
		end
		if #out >= Config.MAX_SONGS then
			break
		end
	end
	-- urutan stabil: terbaru di atas, sisanya mengikuti urutan asli di DataStore
	local order: { [Song]: number } = {}
	for i, song in out do
		order[song] = i
	end
	table.sort(out, function(a, b)
		local ta, tb = a.uploadedAt or "", b.uploadedAt or ""
		if ta ~= tb then
			return ta > tb
		end
		return order[a] < order[b]
	end)
	return out
end

return MusicShared
