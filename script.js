// ============================================================
// 1. LOAD TRACKS FROM tracks.json
// ============================================================
let tracks = [];
let currentIndex = 0;
let audio = null;
let isPlaying = false;
let isDragging = false;
let filteredTracks = [];
let videoFile = null;
let videoURL = null;
let cart = [];
const PRICE_PER_TRACK = 0.99;

// DOM
const trackListEl = document.getElementById('trackList');
const searchInput = document.getElementById('searchInput');
const trackCounter = document.getElementById('trackCounter');
const collectionBadge = document.getElementById('collectionBadge');
const artwork = document.getElementById('artwork');
const trackTitle = document.getElementById('trackTitle');
const trackSubtitle = document.getElementById('trackSubtitle');
const specGrid = document.getElementById('specGrid');
const spectrogramContainer = document.getElementById('spectrogramContainer');
const playBtn = document.getElementById('playBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const downloadBtn = document.getElementById('downloadBtn');
const timeDisplay = document.getElementById('timeDisplay');
const progressFill = document.getElementById('progressFill');
const progressWrap = document.getElementById('progressWrap');
const mobileToggle = document.getElementById('mobileToggle');
const sidebar = document.getElementById('sidebar');

// Video elements
const dropArea = document.getElementById('dropArea');
const fileInput = document.getElementById('fileInput');
const videoWrapper = document.getElementById('videoWrapper');
const videoPlayer = document.getElementById('videoPlayer');
const removeVideoBtn = document.getElementById('removeVideoBtn');
const videoStatus = document.getElementById('videoStatus');

// Cart elements
const cartBtn = document.getElementById('cartBtn');
const cartCount = document.getElementById('cartCount');
const cartView = document.getElementById('cartView');
const visor = document.getElementById('visor');
const cartItemsList = document.getElementById('cartItemsList');
const cartTotalPrice = document.getElementById('cartTotalPrice');
const cartTotalSection = document.getElementById('cartTotalSection');
const cartBuyerEmail = document.getElementById('cartBuyerEmail');
const cartCheckoutBtn = document.getElementById('cartCheckoutBtn');
const backFromCartBtn = document.getElementById('backFromCartBtn');

// ============================================================
// 2. FORMAT HELPERS
// ============================================================
function formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

// ============================================================
// 3. LOAD TRACKS
// ============================================================
async function loadTracks() {
    const splash = document.getElementById('splash');
    try {
        const res = await fetch('tracks.json');
        if (!res.ok) throw new Error('Could not load tracks.json');
        tracks = await res.json();
        filteredTracks = [...tracks];
        renderSidebar(filteredTracks);
        trackCounter.textContent = `${filteredTracks.length} tracks`;
        collectionBadge.textContent = `ALL · ${filteredTracks.length} TRACKS`;
        if (tracks.length > 0) loadTrack(0);
    } catch (e) {
        console.error('Error loading tracks:', e);
        trackListEl.innerHTML = '<div style="padding:20px;color:#4a4a5a;font-size:0.8rem;">⚠️ Could not load tracks.json. Make sure the file is in the same folder.</div>';
    } finally {
        setTimeout(() => { splash.classList.add('hidden'); }, 800);
    }
}

// ============================================================
// 4. RENDER SIDEBAR
// ============================================================
function renderSidebar(list) {
    trackListEl.innerHTML = '';
    list.forEach((track, idx) => {
        const div = document.createElement('div');
        const isActive = idx === currentIndex && tracks.indexOf(track) === currentIndex;
        div.className = 'track-item' + (isActive ? ' active' : '');
        const num = tracks.indexOf(track) + 1;
        const isInCart = cart.some(t => t.index === tracks.indexOf(track));
        div.innerHTML = `
            <span class="tnum">${num}</span>
            <div class="tinfo">
                <div class="tname">${track.name}</div>
                <div class="tmeta">${track.genre} · ${track.collection}</div>
            </div>
            <span class="tbadge">${track.duration || '--'}</span>
            <button class="cart-add ${isInCart ? 'in-cart' : ''}" data-index="${tracks.indexOf(track)}">${isInCart ? '✓' : '🛒'}</button>
            <span class="tplay-indicator">${isActive && isPlaying ? '▶' : ''}</span>
        `;
        div.addEventListener('click', (e) => {
            if (e.target.closest('.cart-add')) return;
            const realIdx = tracks.indexOf(track);
            if (realIdx > -1) loadTrack(realIdx);
            if (window.innerWidth <= 480) sidebar.classList.remove('open');
        });
        const btn = div.querySelector('.cart-add');
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const idx = parseInt(e.target.dataset.index);
            if (cart.some(t => t.index === idx)) {
                removeFromCart(idx);
            } else {
                addToCart(idx);
            }
        });
        trackListEl.appendChild(div);
    });
    trackCounter.textContent = `${list.length} tracks`;
}

// ============================================================
// 5. LOAD TRACK
// ============================================================
function loadTrack(index) {
    if (index < 0 || index >= tracks.length) return;
    currentIndex = index;
    const track = tracks[index];

    if (audio) {
        audio.pause();
        audio = null;
    }

    audio = new Audio(track.url);
    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('ended', () => { nextTrack(); });
    audio.addEventListener('loadedmetadata', () => {
        const dur = formatTime(audio.duration);
        timeDisplay.textContent = `0:00 / ${dur}`;
    });

    if (videoPlayer.src) {
        videoPlayer.currentTime = 0;
        if (isPlaying) videoPlayer.play();
    }

    trackTitle.textContent = track.name;
    trackSubtitle.textContent = `${track.genre} · ${track.mood} · ${track.collection}`;

    const collectionImages = {
        'FREE_background_music_dhalius': 'https://archive.org/download/FREE_background_music_dhalius/__ia_thumb.jpg',
        'GoogleMusic': 'https://archive.org/download/GoogleMusic/__ia_thumb.jpg',
        'soundtrack_music_for_films_background': 'https://archive.org/download/soundtrack_music_for_films_background/__ia_thumb.jpg',
        '100_free_royalty': 'https://archive.org/download/100_free_royalty_background_music_tracks/__ia_thumb.jpg',
        'music-made-by-artificial-intelligence': 'https://archive.org/download/music-made-by-artificial-intelligence/__ia_thumb.jpg',
        'jamendo-130684': 'https://archive.org/download/jamendo-130684/__ia_thumb.jpg',
        'jamendo-151784': 'https://archive.org/download/jamendo-151784/__ia_thumb.jpg'
    };
    const imgUrl = collectionImages[track.collection] || collectionImages['FREE_background_music_dhalius'];
    artwork.innerHTML = `<img src="${imgUrl}" alt="${track.name}" onerror="this.style.display='none';this.parentElement.innerHTML='<span class=\\'fallback\\'>♫</span>'" />`;

    specGrid.innerHTML = `
        <div class="spec-item"><span class="label">Duration</span><span class="value">${track.duration || '—'}</span></div>
        <div class="
