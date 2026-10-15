--!strict
-- Script: ServerScriptService > MusicServer
-- Membaca daftar lagu dari DataStore "songiddeerizcorp" (diisi otomatis oleh web DeeRiZ Corp Studios),
-- mengecek ulang secara berkala, mengirim daftar ke semua pemain, dan menjalankan radio server.

local DataStoreService = game:GetService("DataStoreService")
local HttpService = game:GetService("HttpService")
local MarketplaceService = game:GetService("MarketplaceService")
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")
local SoundService = game:GetService("SoundService")

local MusicShared = require(ReplicatedStorage:WaitForChild("MusicShared"))
local Config = MusicShared.Config
type Song = MusicShared.Song
type RadioState = MusicShared.RadioState

-- ------------------------------------------------------------------ remotes
local remotes = Instance.new("Folder")
remotes.Name = MusicShared.REMOTES_FOLDER

local function remote(name: string): RemoteEvent
	local r = Instance.new("RemoteEvent")
	r.Name = name
	r.Parent = remotes
	return r
end

local SongsUpdated = remote("SongsUpdated") -- server -> client: (songs: {Song})
local RequestSongs = remote("RequestSongs") -- client -> server: ()
local RadioChanged = remote("RadioChanged") -- server -> client: (state: RadioState)
local RadioCommand = remote("RadioCommand") -- client -> server: (action: "play"|"skip"|"stop", soundId: number?)
remotes.Parent = ReplicatedStorage

-- ------------------------------------------------------------------ state
local store = DataStoreService:GetDataStore(Config.STORE_NAME, Config.STORE_SCOPE)
local songs: { Song } = {}
local songsById: { [number]: Song } = {}
local signature = ""
local isAudio: { [number]: boolean } = {} -- cache hasil cek MarketplaceService
local perIdCache: { [string]: Song | false } = {} -- cache mode "per-id"
local lastRequest: { [Player]: number } = {}
local radioState: RadioState = {}

local function retry(label: string, fn: () -> any): (boolean, any)
	local lastErr: any
	for attempt = 1, 4 do
		local ok, result = pcall(fn)
		if ok then
			return true, result
		end
		lastErr = result
		task.wait(2 ^ attempt)
	end
	warn(`[MusicServer] {label} gagal: {lastErr}`)
	return false, nil
end

-- ------------------------------------------------------------------ baca DataStore
local function readListMode(): (boolean, any)
	return retry(`GetAsync("{Config.ENTRY_KEY}")`, function()
		return store:GetAsync(Config.ENTRY_KEY)
	end)
end

local function readPerIdMode(): (boolean, any)
	local ok, pages = retry("ListKeysAsync", function()
		return store:ListKeysAsync()
	end)
	if not ok then
		return false, nil
	end
	local raw = {}
	while true do
		for _, key: DataStoreKey in (pages :: DataStoreKeyPages):GetCurrentPage() do
			local name = key.KeyName
			if perIdCache[name] == nil then
				local gotIt, value = retry(`GetAsync("{name}")`, function()
					return store:GetAsync(name)
				end)
				if gotIt then
					perIdCache[name] = MusicShared.sanitizeSong(if type(value) == "table" then value else name) or false
				end
			end
			local cached = perIdCache[name]
			if cached then
				table.insert(raw, cached)
			end
			if #raw >= Config.MAX_SONGS then
				return true, raw
			end
		end
		if (pages :: DataStoreKeyPages).IsFinished then
			break
		end
		local advanced = retry("AdvanceToNextPageAsync", function()
			(pages :: DataStoreKeyPages):AdvanceToNextPageAsync()
			return true
		end)
		if not advanced then
			break
		end
	end
	return true, raw
end

-- true = audio, false = bukan audio / tidak ada, nil = belum bisa dicek (dicoba lagi nanti)
local function checkAudio(id: number): boolean?
	if isAudio[id] ~= nil then
		return isAudio[id]
	end
	local ok, info = pcall(function()
		return MarketplaceService:GetProductInfo(id, Enum.InfoType.Asset)
	end)
	if ok and type(info) == "table" then
		local audio = info.AssetTypeId == Enum.AssetType.Audio.Value
		isAudio[id] = audio
		if not audio then
			warn(`[MusicServer] {id} bukan asset Audio, dilewati.`)
		end
		return audio
	end
	return nil
end

local function refresh()
	local ok, raw
	if Config.MODE == "per-id" then
		ok, raw = readPerIdMode()
	else
		ok, raw = readListMode()
	end
	if not ok then
		return -- pertahankan daftar lama bila DataStore sedang bermasalah
	end

	local list = MusicShared.sanitizeList(raw)
	if Config.VERIFY_ASSETS then
		local checked = 0
		local filtered = {}
		for _, song in list do
			local audio: boolean? = isAudio[song.soundId]
			if audio == nil and checked < 25 then -- batasi agar tidak kena limit MarketplaceService
				checked += 1
				audio = checkAudio(song.soundId)
			end
			if audio ~= false then
				table.insert(filtered, song)
			end
		end
		list = filtered
	end

	local sig = HttpService:JSONEncode(list)
	if sig == signature then
		return
	end
	local before = #songs
	signature = sig
	songs = list
	songsById = {}
	for _, song in list do
		songsById[song.soundId] = song
	end
	print(`[MusicServer] {#songs} lagu terdeteksi dari DataStore "{Config.STORE_NAME}" (sebelumnya {before}).`)
	SongsUpdated:FireAllClients(songs)
end

-- ------------------------------------------------------------------ radio
local radioSound = Instance.new("Sound")
radioSound.Name = "DeeRiZRadio"
radioSound.Volume = Config.DEFAULT_VOLUME
radioSound.PlaybackSpeed = Config.PLAYBACK_SPEED
radioSound.Parent = SoundService

local radioToken = 0
local playRadio: (song: Song?) -> ()

local function pickRandom(exceptId: number?): Song?
	if #songs == 0 then
		return nil
	end
	if #songs == 1 then
		return songs[1]
	end
	for _ = 1, 10 do
		local s = songs[math.random(1, #songs)]
		if s.soundId ~= exceptId then
			return s
		end
	end
	return songs[1]
end

local function onRadioFinished(token: number)
	if token ~= radioToken then
		return
	end
	if Config.RADIO_AUTOPLAY then
		playRadio(pickRandom(radioState.soundId))
	else
		playRadio(nil)
	end
end

playRadio = function(song: Song?)
	radioToken += 1
	local token = radioToken
	radioSound:Stop()
	if not song then
		radioState = {}
		RadioChanged:FireAllClients(radioState)
		return
	end
	radioSound.SoundId = `rbxassetid://{song.soundId}`
	radioSound.TimePosition = 0
	radioSound:Play()
	radioState = { soundId = song.soundId, name = song.name, startedAt = workspace:GetServerTimeNow() }
	RadioChanged:FireAllClients(radioState)

	-- Cadangan bila event Ended tidak terpanggil: lanjut setelah durasi lagu (atau 7 menit)
	task.spawn(function()
		local start = os.clock()
		while not radioSound.IsLoaded and os.clock() - start < Config.LOAD_TIMEOUT and token == radioToken do
			task.wait(0.5)
		end
		if token ~= radioToken then
			return
		end
		if not radioSound.IsLoaded then
			warn(`[MusicServer] Radio gagal memuat {song.soundId} ({song.name}). Cek izin audio untuk game ini.`)
			onRadioFinished(token)
			return
		end
		local length = radioSound.TimeLength / math.max(radioSound.PlaybackSpeed, 0.01)
		task.wait((if length > 0 then length else 420) + 1)
		onRadioFinished(token)
	end)
end

radioSound.Ended:Connect(function()
	onRadioFinished(radioToken)
end)

-- ------------------------------------------------------------------ permission & remotes
local function isDJ(player: Player): boolean
	if RunService:IsStudio() then
		return true
	end
	if game.CreatorType == Enum.CreatorType.User and player.UserId == game.CreatorId then
		return true
	end
	if table.find(Config.DJ_USER_IDS, player.UserId) then
		return true
	end
	local groupId = if Config.DJ_GROUP_ID > 0
		then Config.DJ_GROUP_ID
		elseif game.CreatorType == Enum.CreatorType.Group then game.CreatorId
		else 0
	if groupId > 0 then
		local ok, rank = pcall(function()
			return player:GetRankInGroupAsync(groupId)
		end)
		if ok and rank >= Config.DJ_MIN_RANK then
			return true
		end
	end
	return false
end

local function allowRequest(player: Player): boolean
	local now = os.clock()
	local last = lastRequest[player]
	if last and now - last < Config.REQUEST_COOLDOWN then
		return false
	end
	lastRequest[player] = now
	return true
end

RequestSongs.OnServerEvent:Connect(function(player: Player)
	if not allowRequest(player) then
		return
	end
	SongsUpdated:FireClient(player, songs)
	RadioChanged:FireClient(player, radioState)
end)

RadioCommand.OnServerEvent:Connect(function(player: Player, action: unknown, soundId: unknown)
	-- rate limit -> tipe -> izin -> nilai harus lagu yang ada di DataStore
	if not Config.RADIO_ENABLED or not allowRequest(player) then
		return
	end
	if type(action) ~= "string" then
		return
	end
	if player:GetAttribute("MusicDJ") ~= true then
		return
	end
	if action == "play" then
		if type(soundId) ~= "number" then
			return
		end
		local song = songsById[soundId]
		if song then
			playRadio(song)
		end
	elseif action == "skip" then
		playRadio(pickRandom(radioState.soundId))
	elseif action == "stop" then
		playRadio(nil)
	end
end)

local function onPlayerAdded(player: Player)
	task.spawn(function()
		player:SetAttribute("MusicDJ", isDJ(player))
	end)
end
Players.PlayerAdded:Connect(onPlayerAdded)
for _, p in Players:GetPlayers() do
	onPlayerAdded(p)
end
Players.PlayerRemoving:Connect(function(player)
	lastRequest[player] = nil
end)

-- ------------------------------------------------------------------ start
refresh()
if Config.RADIO_ENABLED and Config.RADIO_AUTOPLAY then
	playRadio(pickRandom(nil))
end

task.spawn(function()
	while true do
		task.wait(Config.REFRESH_SECONDS)
		refresh()
		if Config.RADIO_ENABLED and Config.RADIO_AUTOPLAY and radioState.soundId == nil then
			playRadio(pickRandom(nil))
		end
	end
end)
