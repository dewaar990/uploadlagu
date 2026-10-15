--!strict
-- LocalScript: StarterPlayer > StarterPlayerScripts > MusicClient
-- UI pemutar musik: daftar lagu dari DataStore (lewat MusicServer), cari lagu,
-- putar pribadi (hanya terdengar oleh pemain ini), dan kontrol radio untuk DJ.

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local SoundService = game:GetService("SoundService")

local MusicShared = require(ReplicatedStorage:WaitForChild("MusicShared"))
local Config = MusicShared.Config
type Song = MusicShared.Song
type RadioState = MusicShared.RadioState

local player = Players.LocalPlayer
local remotes = ReplicatedStorage:WaitForChild(MusicShared.REMOTES_FOLDER)
local SongsUpdated = remotes:WaitForChild("SongsUpdated") :: RemoteEvent
local RequestSongs = remotes:WaitForChild("RequestSongs") :: RemoteEvent
local RadioChanged = remotes:WaitForChild("RadioChanged") :: RemoteEvent
local RadioCommand = remotes:WaitForChild("RadioCommand") :: RemoteEvent

-- ------------------------------------------------------------------ state
local songs: { Song } = {}
local radio: RadioState = {}
local mode: "local" | "radio" = "local"
local query = ""
local volume = Config.DEFAULT_VOLUME
local current: Song? = nil
local failed: { [number]: boolean } = {}
local playToken = 0

local localSound = Instance.new("Sound")
localSound.Name = "DeeRiZLocalMusic"
localSound.Volume = volume
localSound.PlaybackSpeed = Config.PLAYBACK_SPEED
localSound.Parent = SoundService

-- ------------------------------------------------------------------ UI helpers
local ACCENT = Color3.fromRGB(232, 121, 249)
local BG = Color3.fromRGB(16, 14, 28)
local TEXT = Color3.fromRGB(241, 234, 255)
local MUTED = Color3.fromRGB(154, 144, 184)

local function make(className: string, props: { [string]: any }, children: { Instance }?): any
	local inst = Instance.new(className)
	for k, v in props do
		if k ~= "Parent" then
			(inst :: any)[k] = v
		end
	end
	if children then
		for _, child in children do
			child.Parent = inst
		end
	end
	if props.Parent then
		inst.Parent = props.Parent
	end
	return inst
end

local function corner(r: number): Instance
	return make("UICorner", { CornerRadius = UDim.new(0, r) })
end

local function stroke(t: number?): Instance
	return make("UIStroke", { Color = Color3.new(1, 1, 1), Transparency = t or 0.82, Thickness = 1 })
end

local function glassButton(text: string, primary: boolean?): TextButton
	return make("TextButton", {
		Text = text,
		Font = Enum.Font.GothamBold,
		TextSize = 14,
		TextColor3 = Color3.new(1, 1, 1),
		AutoButtonColor = true,
		BackgroundColor3 = if primary then ACCENT else Color3.new(1, 1, 1),
		BackgroundTransparency = if primary then 0.35 else 0.88,
		Size = UDim2.fromOffset(84, 32),
	}, { corner(16), stroke(if primary then 0.55 else 0.8) })
end

-- ------------------------------------------------------------------ UI
local gui = make("ScreenGui", {
	Name = "DeeRiZMusic",
	ResetOnSpawn = false,
	ZIndexBehavior = Enum.ZIndexBehavior.Sibling,
	Parent = player:WaitForChild("PlayerGui"),
})

local toggle = glassButton("♪ Musik", true)
toggle.Size = UDim2.fromOffset(110, 40)
toggle.Position = UDim2.new(0, 16, 1, -60)
toggle.Parent = gui

local panel = make("Frame", {
	Visible = false,
	AnchorPoint = Vector2.new(0, 1),
	Position = UDim2.new(0, 16, 1, -110),
	Size = UDim2.new(0, 360, 0.62, 0),
	BackgroundColor3 = BG,
	BackgroundTransparency = 0.12,
	Parent = gui,
}, {
	corner(20),
	stroke(0.85),
	make("UISizeConstraint", { MinSize = Vector2.new(280, 300), MaxSize = Vector2.new(420, 560) }),
	make("UIPadding", {
		PaddingTop = UDim.new(0, 14),
		PaddingBottom = UDim.new(0, 14),
		PaddingLeft = UDim.new(0, 14),
		PaddingRight = UDim.new(0, 14),
	}),
})

make("TextLabel", {
	Text = "DeeRiZ Music",
	Font = Enum.Font.GothamBlack,
	TextSize = 20,
	TextColor3 = TEXT,
	TextXAlignment = Enum.TextXAlignment.Left,
	BackgroundTransparency = 1,
	Size = UDim2.new(1, -90, 0, 26),
	Parent = panel,
})

local countLabel = make("TextLabel", {
	Text = "0 lagu",
	Font = Enum.Font.Gotham,
	TextSize = 13,
	TextColor3 = MUTED,
	TextXAlignment = Enum.TextXAlignment.Right,
	BackgroundTransparency = 1,
	Position = UDim2.new(1, -90, 0, 0),
	Size = UDim2.new(0, 90, 0, 26),
	Parent = panel,
})

-- tab Pribadi / Radio
local tabLocal = glassButton("Pribadi", true)
tabLocal.Position = UDim2.fromOffset(0, 34)
tabLocal.Size = UDim2.new(0.5, -4, 0, 32)
tabLocal.Parent = panel
local tabRadio = glassButton("Radio Server")
tabRadio.Position = UDim2.new(0.5, 4, 0, 34)
tabRadio.Size = UDim2.new(0.5, -4, 0, 32)
tabRadio.Visible = Config.RADIO_ENABLED
tabRadio.Parent = panel

local search = make("TextBox", {
	PlaceholderText = "Cari lagu atau SoundId…",
	Text = "",
	ClearTextOnFocus = false,
	Font = Enum.Font.Gotham,
	TextSize = 14,
	TextColor3 = TEXT,
	PlaceholderColor3 = MUTED,
	TextXAlignment = Enum.TextXAlignment.Left,
	BackgroundColor3 = Color3.new(1, 1, 1),
	BackgroundTransparency = 0.94,
	Position = UDim2.fromOffset(0, 74),
	Size = UDim2.new(1, 0, 0, 34),
	Parent = panel,
}, { corner(12), stroke(0.88), make("UIPadding", { PaddingLeft = UDim.new(0, 10) }) })

local list = make("ScrollingFrame", {
	BackgroundTransparency = 1,
	BorderSizePixel = 0,
	Position = UDim2.fromOffset(0, 116),
	Size = UDim2.new(1, 0, 1, -116 - 92),
	CanvasSize = UDim2.new(),
	AutomaticCanvasSize = Enum.AutomaticSize.Y,
	ScrollBarThickness = 4,
	ScrollBarImageColor3 = ACCENT,
	Parent = panel,
}, { make("UIListLayout", { Padding = UDim.new(0, 6), SortOrder = Enum.SortOrder.LayoutOrder }) })

local emptyLabel = make("TextLabel", {
	Text = "Memuat lagu dari DataStore…",
	Font = Enum.Font.Gotham,
	TextSize = 14,
	TextWrapped = true,
	TextColor3 = MUTED,
	BackgroundTransparency = 1,
	Position = UDim2.fromOffset(0, 130),
	Size = UDim2.new(1, 0, 0, 60),
	Parent = panel,
})

-- bar "sedang diputar"
local nowBar = make("Frame", {
	AnchorPoint = Vector2.new(0, 1),
	Position = UDim2.fromScale(0, 1),
	Size = UDim2.new(1, 0, 0, 84),
	BackgroundColor3 = Color3.new(1, 1, 1),
	BackgroundTransparency = 0.93,
	Parent = panel,
}, { corner(14), stroke(0.85) })

local nowLabel = make("TextLabel", {
	Text = "Tidak ada lagu",
	Font = Enum.Font.GothamBold,
	TextSize = 14,
	TextColor3 = TEXT,
	TextTruncate = Enum.TextTruncate.AtEnd,
	TextXAlignment = Enum.TextXAlignment.Left,
	BackgroundTransparency = 1,
	Position = UDim2.fromOffset(12, 8),
	Size = UDim2.new(1, -24, 0, 20),
	Parent = nowBar,
})
local statusLabel = make("TextLabel", {
	Text = "",
	Font = Enum.Font.Gotham,
	TextSize = 12,
	TextColor3 = MUTED,
	TextTruncate = Enum.TextTruncate.AtEnd,
	TextXAlignment = Enum.TextXAlignment.Left,
	BackgroundTransparency = 1,
	Position = UDim2.fromOffset(12, 28),
	Size = UDim2.new(1, -24, 0, 16),
	Parent = nowBar,
})

local controls = make("Frame", {
	BackgroundTransparency = 1,
	Position = UDim2.new(0, 10, 1, -40),
	Size = UDim2.new(1, -20, 0, 32),
	Parent = nowBar,
}, { make("UIListLayout", { FillDirection = Enum.FillDirection.Horizontal, Padding = UDim.new(0, 6) }) })

local btnPause = glassButton("Jeda")
btnPause.Size = UDim2.fromOffset(64, 30)
btnPause.Parent = controls
local btnNext = glassButton("Next")
btnNext.Size = UDim2.fromOffset(56, 30)
btnNext.Parent = controls
local btnStop = glassButton("Stop")
btnStop.Size = UDim2.fromOffset(56, 30)
btnStop.Parent = controls
local btnVolDown = glassButton("−")
btnVolDown.Size = UDim2.fromOffset(30, 30)
btnVolDown.Parent = controls
local btnVolUp = glassButton("+")
btnVolUp.Size = UDim2.fromOffset(30, 30)
btnVolUp.Parent = controls

-- ------------------------------------------------------------------ logic
local function isDJ(): boolean
	return player:GetAttribute("MusicDJ") == true
end

local function radioSound(): Sound?
	return SoundService:FindFirstChild("DeeRiZRadio") :: Sound?
end

local function applyVolumes()
	localSound.Volume = volume
	local rs = radioSound()
	if rs then
		-- Saat memutar lagu pribadi, radio dibisukan hanya untuk pemain ini
		rs.Volume = if mode == "radio" and not localSound.IsPlaying then volume else 0
	end
end

local function filtered(): { Song }
	if query == "" then
		return songs
	end
	local q = string.lower(query)
	local out = {}
	for _, s in songs do
		if string.find(string.lower(s.name), q, 1, true) or string.find(tostring(s.soundId), q, 1, true) then
			table.insert(out, s)
		end
	end
	return out
end

local renderList: () -> ()

local function updateNowBar()
	if mode == "radio" then
		nowLabel.Text = if radio.name then `📻 {radio.name}` else "📻 Radio sedang berhenti"
		statusLabel.Text = if radio.soundId then `SoundId {radio.soundId}` .. (if isDJ() then " · kamu DJ" else "") else ""
		btnPause.Visible = false
		btnNext.Visible = isDJ()
		btnStop.Visible = isDJ()
	else
		nowLabel.Text = if current then `♪ {current.name}` else "Tidak ada lagu"
		btnPause.Visible = true
		btnPause.Text = if localSound.IsPaused then "Lanjut" else "Jeda"
		btnNext.Visible = true
		btnStop.Visible = true
	end
end

local function playLocal(song: Song)
	playToken += 1
	local token = playToken
	current = song
	localSound:Stop()
	localSound.SoundId = `rbxassetid://{song.soundId}`
	localSound.TimePosition = 0
	localSound:Play()
	statusLabel.Text = `Memuat SoundId {song.soundId}…`
	applyVolumes()
	updateNowBar()

	-- Deteksi audio yang tidak bisa diputar (ditolak moderasi / tidak ada izin di game ini)
	task.spawn(function()
		local start = os.clock()
		while not localSound.IsLoaded and os.clock() - start < Config.LOAD_TIMEOUT do
			task.wait(0.25)
			if token ~= playToken then
				return
			end
		end
		if token ~= playToken then
			return
		end
		if localSound.IsLoaded then
			statusLabel.Text = `SoundId {song.soundId} · {math.floor(localSound.TimeLength / 60)}:{string.format("%02d", math.floor(localSound.TimeLength % 60))}`
		else
			failed[song.soundId] = true
			statusLabel.Text = "⚠ Gagal dimuat — cek izin audio untuk game ini"
			warn(`[MusicClient] Audio {song.soundId} ({song.name}) gagal dimuat. Pastikan audio diizinkan untuk game ini.`)
			renderList()
		end
	end)
end

local function stopLocal()
	playToken += 1
	current = nil
	localSound:Stop()
	statusLabel.Text = ""
	applyVolumes()
	updateNowBar()
end

local function nextLocal()
	local items = filtered()
	if #items == 0 then
		return
	end
	local idx = 0
	if current then
		for i, s in items do
			if s.soundId == (current :: Song).soundId then
				idx = i
				break
			end
		end
	end
	for step = 1, #items do
		local s = items[(idx + step - 1) % #items + 1]
		if not failed[s.soundId] then
			playLocal(s)
			return
		end
	end
end

local function onSongPressed(song: Song)
	if mode == "radio" then
		if isDJ() then
			RadioCommand:FireServer("play", song.soundId)
		end
	else
		playLocal(song)
	end
end

renderList = function()
	for _, child in list:GetChildren() do
		if child:IsA("Frame") then
			child:Destroy()
		end
	end
	local items = filtered()
	countLabel.Text = `{#songs} lagu`
	emptyLabel.Visible = #items == 0
	if #items == 0 then
		emptyLabel.Text = if #songs == 0 then "Belum ada lagu di DataStore. Upload lagu lewat web DeeRiZ Corp Studios." else "Lagu tidak ditemukan."
	end
	local canPlay = mode == "local" or isDJ()
	for i, song in items do
		local playing = (mode == "local" and current ~= nil and (current :: Song).soundId == song.soundId)
			or (mode == "radio" and radio.soundId == song.soundId)
		local row = make("Frame", {
			LayoutOrder = i,
			Size = UDim2.new(1, -6, 0, 48),
			BackgroundColor3 = if playing then ACCENT else Color3.new(1, 1, 1),
			BackgroundTransparency = if playing then 0.75 else 0.95,
			Parent = list,
		}, { corner(12) })
		make("TextLabel", {
			Text = (if failed[song.soundId] then "⚠ " else "") .. song.name,
			Font = Enum.Font.GothamMedium,
			TextSize = 14,
			TextColor3 = if failed[song.soundId] then MUTED else TEXT,
			TextTruncate = Enum.TextTruncate.AtEnd,
			TextXAlignment = Enum.TextXAlignment.Left,
			BackgroundTransparency = 1,
			Position = UDim2.fromOffset(12, 6),
			Size = UDim2.new(1, -100, 0, 20),
			Parent = row,
		})
		make("TextLabel", {
			Text = tostring(song.soundId),
			Font = Enum.Font.Code,
			TextSize = 12,
			TextColor3 = MUTED,
			TextXAlignment = Enum.TextXAlignment.Left,
			BackgroundTransparency = 1,
			Position = UDim2.fromOffset(12, 26),
			Size = UDim2.new(1, -100, 0, 16),
			Parent = row,
		})
		if canPlay then
			local play = glassButton(if playing then "Diputar" else "▶ Putar", not playing)
			play.AnchorPoint = Vector2.new(1, 0.5)
			play.Position = UDim2.new(1, -8, 0.5, 0)
			play.Size = UDim2.fromOffset(78, 30)
			play.Parent = row
			play.Activated:Connect(function()
				onSongPressed(song)
			end)
		end
	end
	updateNowBar()
end

local function setMode(m: "local" | "radio")
	mode = m
	tabLocal.BackgroundColor3 = if m == "local" then ACCENT else Color3.new(1, 1, 1)
	tabLocal.BackgroundTransparency = if m == "local" then 0.35 else 0.88
	tabRadio.BackgroundColor3 = if m == "radio" then ACCENT else Color3.new(1, 1, 1)
	tabRadio.BackgroundTransparency = if m == "radio" then 0.35 else 0.88
	if m == "radio" and current then
		stopLocal()
	end
	applyVolumes()
	renderList()
end

-- ------------------------------------------------------------------ events
toggle.Activated:Connect(function()
	panel.Visible = not panel.Visible
end)
tabLocal.Activated:Connect(function()
	setMode("local")
end)
tabRadio.Activated:Connect(function()
	setMode("radio")
end)
search:GetPropertyChangedSignal("Text"):Connect(function()
	query = search.Text
	renderList()
end)

btnPause.Activated:Connect(function()
	if not current then
		return
	end
	if localSound.IsPaused then
		localSound:Resume()
	else
		localSound:Pause()
	end
	updateNowBar()
end)
btnNext.Activated:Connect(function()
	if mode == "radio" then
		RadioCommand:FireServer("skip")
	else
		nextLocal()
	end
end)
btnStop.Activated:Connect(function()
	if mode == "radio" then
		RadioCommand:FireServer("stop")
	else
		stopLocal()
	end
end)
btnVolDown.Activated:Connect(function()
	volume = math.max(0, math.round((volume - 0.1) * 10) / 10)
	applyVolumes()
end)
btnVolUp.Activated:Connect(function()
	volume = math.min(1, math.round((volume + 0.1) * 10) / 10)
	applyVolumes()
end)

localSound.Ended:Connect(function()
	nextLocal() -- lanjut otomatis ke lagu berikutnya
end)

SongsUpdated.OnClientEvent:Connect(function(newSongs: unknown)
	-- Data dari server tetap divalidasi ulang sebelum ditampilkan
	songs = MusicShared.sanitizeList(newSongs)
	renderList()
end)

RadioChanged.OnClientEvent:Connect(function(state: unknown)
	if type(state) == "table" then
		local s = state :: any
		radio = {
			soundId = if type(s.soundId) == "number" then s.soundId else nil,
			name = if type(s.name) == "string" then s.name else nil,
			startedAt = if type(s.startedAt) == "number" then s.startedAt else nil,
		}
	else
		radio = {}
	end
	applyVolumes()
	if mode == "radio" then
		renderList()
	end
end)

player:GetAttributeChangedSignal("MusicDJ"):Connect(renderList)
SoundService.ChildAdded:Connect(function(child)
	if child.Name == "DeeRiZRadio" then
		applyVolumes()
	end
end)

-- Minta snapshot lengkap saat baru masuk (late join)
setMode(if Config.RADIO_ENABLED then "radio" else "local")
RequestSongs:FireServer()
