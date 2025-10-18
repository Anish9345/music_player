// Player logic with playlists, queue, loop, shuffle, progress, volume, thumbnails, localStorage

const audio = document.getElementById('audio');
const songListEl = document.getElementById('songList');
const playBtn = document.getElementById('playBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const shuffleBtn = document.getElementById('shuffleBtn');
const loopBtn = document.getElementById('loopBtn');
const progress = document.getElementById('progress');
const currentTimeEl = document.getElementById('currentTime');
const durationEl = document.getElementById('duration');
const volumeEl = document.getElementById('volume');
const thumb = document.getElementById('thumb');
const currentTitle = document.getElementById('currentTitle');
const selectAllBtn = document.getElementById('selectAllBtn');
const deselectAllBtn = document.getElementById('deselectAllBtn');
const createPlaylistBtn = document.getElementById('createPlaylistBtn');
const playlistNameInput = document.getElementById('playlistNameInput');
const savedPlaylistsDiv = document.getElementById('savedPlaylists');
const showQueueBtn = document.getElementById('showQueueBtn');
const clearQueueBtn = document.getElementById('clearQueueBtn');

let songs = [];             // array of {filename, name, file, thumbnail}
let currentIndex = -1;
let isPlaying = false;
let isLoop = false;
let isShuffle = false;
let queue = [];             // array of indices
let playlistQueue = null;   // when playing a saved playlist (array of filenames)
let playlists = {};         // saved playlists (name -> array of filenames)

// Helper - format seconds to mm:ss
function fmt(t){
  if (isNaN(t)) return '0:00';
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60).toString().padStart(2,'0');
  return `${m}:${s}`;
}

// Fetch songs from backend
async function loadSongs(){
  const res = await fetch('/songs');
  songs = await res.json();
  renderSongList();
  loadPlaylistsFromStorage();
}

// Render songs
function renderSongList(){
  songListEl.innerHTML = '';
  songs.forEach((s, i) => {
    const li = document.createElement('li');
    li.className = 'song-item';
    li.dataset.index = i;

    const img = document.createElement('img');
    img.src = s.thumbnail;
    img.alt = s.name;

    const meta = document.createElement('div');
    meta.className = 'song-meta';
    const title = document.createElement('div');
    title.className = 'song-name';
    title.textContent = s.name;
    const small = document.createElement('div');
    small.style.color = '#9aa7b3';
    small.style.fontSize = '0.85rem';
    small.textContent = s.filename;

    meta.appendChild(title);
    meta.appendChild(small);

    const controls = document.createElement('div');
    controls.className = 'song-actions';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'checkbox';
    checkbox.dataset.index = i;

    const playSingleBtn = document.createElement('button');
    playSingleBtn.textContent = 'Play';
    playSingleBtn.onclick = (e) => { e.stopPropagation(); playSong(i); };

    const addQueueBtn = document.createElement('button');
    addQueueBtn.textContent = 'Add Queue';
    addQueueBtn.onclick = (e) => { e.stopPropagation(); addToQueue(i); };

    controls.appendChild(checkbox);
    controls.appendChild(playSingleBtn);
    controls.appendChild(addQueueBtn);

    li.appendChild(img);
    li.appendChild(meta);
    li.appendChild(controls);

    // click entire item to play
    li.onclick = () => playSong(i);

    songListEl.appendChild(li);
  });
  highlightCurrent();
}

// Play a song by index
function playSong(index){
  if (index < 0 || index >= songs.length) return;
  currentIndex = index;
  playlistQueue = null; // stop playlist sequential if user directly chose
  audio.src = songs[index].file;
  audio.play().catch(()=>{}); // may return promise
  isPlaying = true;
  updateUIForSong();
}

// Update UI when a song is loaded/played
function updateUIForSong(){
  if (currentIndex >= 0 && songs[currentIndex]){
    currentTitle.textContent = songs[currentIndex].name;
    thumb.src = songs[currentIndex].thumbnail;
  } else {
    currentTitle.textContent = 'No song selected';
    thumb.src = '/static/default.jpg';
  }
  highlightCurrent();
  playBtn.textContent = isPlaying ? '⏸' : '▶';
}

// Highlight current playing in list
function highlightCurrent(){
  document.querySelectorAll('.song-item').forEach(li => li.classList.remove('playing'));
  if (currentIndex >= 0){
    const el = document.querySelector(`.song-item[data-index="${currentIndex}"]`);
    if (el) el.classList.add('playing');
  }
}

// Toggle play/pause
function togglePlay(){
  if (!audio.src) {
    // if nothing loaded, play first
    if (songs.length) playSong(0);
    return;
  }
  if (audio.paused){
    audio.play();
    isPlaying = true;
  } else {
    audio.pause();
    isPlaying = false;
  }
  playBtn.textContent = isPlaying ? '⏸' : '▶';
}

// Prev song
function prevSong(){
  if (queue.length > 0){
    const idx = queue.pop();
    playSong(idx);
    return;
  }
  if (isShuffle){
    playSong(Math.floor(Math.random() * songs.length));
    return;
  }
  let next = currentIndex - 1;
  if (next < 0) next = songs.length - 1;
  playSong(next);
}

// Next song (considers queue and playlist queue)
function nextSong(){
  // queue has priority (FIFO)
  if (queue.length > 0){
    const idx = queue.shift();
    playSong(idx);
    return;
  }

  if (playlistQueue && playlistQueue.length > 0){
    // playlistQueue stores filenames; find next filename index in songs
    const currentFile = currentIndex >=0 ? songs[currentIndex].filename : null;
    let pos = -1;
    if (currentFile) pos = playlistQueue.indexOf(currentFile);
    const nextPos = pos + 1;
    if (nextPos < playlistQueue.length){
      const nextFilename = playlistQueue[nextPos];
      const nextIdx = songs.findIndex(s => s.filename === nextFilename);
      if (nextIdx !== -1) { playSong(nextIdx); return; }
    } else {
      // If playlist ended
      if (isLoop) {
        // loop the playlist
        const nextFilename = playlistQueue[0];
        const nextIdx = songs.findIndex(s => s.filename === nextFilename);
        if (nextIdx !== -1) { playSong(nextIdx); return; }
      } else {
        // stop
        audio.pause();
        isPlaying = false;
        playBtn.textContent = '▶';
        return;
      }
    }
  }

  if (isShuffle){
    playSong(Math.floor(Math.random() * songs.length));
    return;
  }

  // normal linear next
  let next = (currentIndex + 1) % songs.length;
  // if not loop and we've returned to start, stop at end
  if (!isLoop && next === 0 && currentIndex === songs.length - 1) {
    audio.pause();
    isPlaying = false;
    playBtn.textContent = '▶';
    return;
  }
  playSong(next);
}

// Add index to queue
function addToQueue(index){
  queue.push(index);
  alert(`${songs[index].name} added to queue`);
}

// Shuffle toggle
function toggleShuffle(){
  isShuffle = !isShuffle;
  shuffleBtn.classList.toggle('active', isShuffle);
}

// Loop toggle (affects audio.loop too)
function toggleLoop(){
  isLoop = !isLoop;
  audio.loop = isLoop;
  loopBtn.classList.toggle('active', isLoop);
}

// Update progress UI
audio.addEventListener('timeupdate', () => {
  const cur = audio.currentTime;
  const dur = audio.duration || 0;
  const pct = dur ? (cur / dur) * 100 : 0;
  progress.value = pct;
  currentTimeEl.textContent = fmt(cur);
  durationEl.textContent = fmt(dur);
});

// Seek by changing progress input
progress.addEventListener('input', (e) => {
  const pct = e.target.value;
  const dur = audio.duration || 0;
  audio.currentTime = dur * (pct / 100);
});

// When metadata loaded (duration known)
audio.addEventListener('loadedmetadata', () => {
  durationEl.textContent = fmt(audio.duration);
});

// When track ends
audio.addEventListener('ended', () => {
  if (!audio.loop) nextSong();
});

// Volume control
volumeEl.addEventListener('input', (e) => {
  audio.volume = e.target.value;
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
  if (e.code === 'ArrowRight') nextSong();
  if (e.code === 'ArrowLeft') prevSong();
});

// Queue management UI
showQueueBtn.onclick = () => {
  if (queue.length === 0) { alert('Queue empty'); return; }
  const names = queue.map(i => songs[i].name).join('\n');
  alert('Upcoming in queue:\n' + names);
};
clearQueueBtn.onclick = () => {
  queue = [];
  alert('Queue cleared');
};

// Play/pause/prev/next buttons
playBtn.onclick = togglePlay;
prevBtn.onclick = prevSong;
nextBtn.onclick = nextSong;
shuffleBtn.onclick = toggleShuffle;
loopBtn.onclick = toggleLoop;

// Select/Deselect checkboxes
selectAllBtn.onclick = () => document.querySelectorAll('.checkbox').forEach(cb => cb.checked = true);
deselectAllBtn.onclick = () => document.querySelectorAll('.checkbox').forEach(cb => cb.checked = false);

// Playlists - save selected songs as new playlist (stored by filenames)
function loadPlaylistsFromStorage(){
  const raw = localStorage.getItem('mp_playlists');
  playlists = raw ? JSON.parse(raw) : {};
  renderSavedPlaylists();
}
function savePlaylistsToStorage(){
  localStorage.setItem('mp_playlists', JSON.stringify(playlists));
}
function renderSavedPlaylists(){
  savedPlaylistsDiv.innerHTML = '';
  const keys = Object.keys(playlists);
  if (keys.length === 0) {
    savedPlaylistsDiv.innerHTML = '<div style="color:#9aa7b3">No saved playlists</div>';
    return;
  }
  keys.forEach(name => {
    const pDiv = document.createElement('div');
    pDiv.style.display = 'flex';
    pDiv.style.gap = '8px';
    pDiv.style.marginTop = '6px';
    const lbl = document.createElement('div');
    lbl.textContent = name;
    const playBtn = document.createElement('button');
    playBtn.textContent = 'Play';
    playBtn.className = 'small';
    playBtn.onclick = () => playSavedPlaylist(name);

    const delBtn = document.createElement('button');
    delBtn.textContent = 'Delete';
    delBtn.className = 'small';
    delBtn.onclick = () => { if (confirm(`Delete playlist "${name}"?`)){ delete playlists[name]; savePlaylistsToStorage(); renderSavedPlaylists(); }};

    pDiv.appendChild(lbl);
    pDiv.appendChild(playBtn);
    pDiv.appendChild(delBtn);
    savedPlaylistsDiv.appendChild(pDiv);
  });
}

// Create playlist from selected checkboxes
createPlaylistBtn.onclick = () => {
  const name = playlistNameInput.value.trim();
  if (!name) return alert('Enter a playlist name');
  const checked = Array.from(document.querySelectorAll('.checkbox'))
    .filter(cb => cb.checked)
    .map(cb => songs[Number(cb.dataset.index)].filename);

  if (checked.length === 0) return alert('Select some songs first');

  playlists[name] = checked;
  savePlaylistsToStorage();
  renderSavedPlaylists();
  playlistNameInput.value = '';
  alert(`Playlist "${name}" created with ${checked.length} songs`);
};

// Play saved playlist by name
function playSavedPlaylist(name){
  const list = playlists[name];
  if (!list || list.length === 0) return alert('Playlist empty');
  // Set playlistQueue to the filenames array
  playlistQueue = list.slice();
  // Find first file in songs and play it
  const idx = songs.findIndex(s => s.filename === playlistQueue[0]);
  if (idx !== -1){
    playSong(idx);
  } else {
    alert('Some files from the playlist are missing in the songs folder.');
  }
}

// Auto-load
window.onload = loadSongs;

