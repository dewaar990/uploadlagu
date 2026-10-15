--!strict
-- Contoh membaca daftar lagu dari DataStore "songiddeerizcorp" (mode "list").
-- Taruh di ServerScriptService. Aktifkan "Enable Studio Access to API Services"
-- bila ingin mencoba di Studio.

local DataStoreService = game:GetService("DataStoreService")
local SoundService = game:GetService("SoundService")

local STORE_NAME = "songiddeerizcorp"
local ENTRY_KEY = "SongList" -- sama dengan DATASTORE_ENTRY_KEY

type Song = { soundId: number, name: string?, uploadedBy: string?, uploadedAt: string? }

local store = DataStoreService:GetDataStore(STORE_NAME)

local function loadSongs(): { Song }
	for attempt = 1, 3 do
		local ok, result = pcall(function()
			return store:GetAsync(ENTRY_KEY)
		end)
		if ok then
			return if type(result) == "table" then result :: { Song } else {}
		end
		warn(("Gagal membaca DataStore (percobaan %d): %s"):format(attempt, tostring(result)))
		task.wait(2 ^ attempt)
	end
	return {}
end

local songs = loadSongs()
print(("Memuat %d lagu dari %s"):format(#songs, STORE_NAME))

local folder = Instance.new("Folder")
folder.Name = "Songs"
folder.Parent = SoundService

for _, song in songs do
	local sound = Instance.new("Sound")
	sound.Name = song.name or tostring(song.soundId)
	sound.SoundId = "rbxassetid://" .. tostring(song.soundId)
	sound.Parent = folder
end
