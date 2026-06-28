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
const cartModal = document.getElementById('cartModal');
const closeCartBtn = document.getElementById('closeCartBtn');
const cartItems = document.getElementById('cartItems');
const cartTotal = document.getElementById('cartTotal');
const checkoutBtn = document.getElementById('checkoutBtn');
const buyerEmailInput = document.getElementById('buyerEmailInput');
const buyerEmailSection = document.getElementById('buyerEmailSection');

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
        <div class="spec-item"><span class="label">Size</span><span class="value">${track.size || '—'}</span></div>
        <div class="spec-item"><span class="label">Genre</span><span class="value">${track.genre}</span></div>
        <div class="spec-item"><span class="label">Mood</span><span class="value">${track.mood}</span></div>
        <div class="spec-item"><span class="label">Collection</span><span class="value">${track.collection}</span></div>
        <div class="spec-item"><span class="label">Format</span><span class="value">MP3</span></div>
    `;

    if (track.spec) {
        spectrogramContainer.innerHTML = `
            <img class="spectrogram-image" src="${track.spec}" alt="Spectrogram" onerror="this.parentElement.innerHTML='<div class=\\'no-spec\\'>spectrogram not available</div>'" />
        `;
    } else {
        spectrogramContainer.innerHTML = `<div class="no-spec">spectrogram not available</div>`;
    }

    progressFill.style.width = '0%';
    timeDisplay.textContent = `0:00 / ${track.duration || '0:00'}`;
    isPlaying = false;
    playBtn.textContent = '▶';

    document.querySelectorAll('.track-item').forEach((el, idx) => {
        const isActive = idx === currentIndex;
        el.classList.toggle('active', isActive);
        const indicator = el.querySelector('.tplay-indicator');
        if (indicator) indicator.textContent = isActive && isPlaying ? '▶' : '';
    });

    const activeEl = document.querySelector('.track-item.active');
    if (activeEl) activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

// ============================================================
// 6. PLAYER CONTROLS
// ============================================================
function togglePlay() {
    if (!audio) {
        loadTrack(currentIndex);
        setTimeout(() => togglePlay(), 200);
        return;
    }
    if (isPlaying) {
        audio.pause();
        isPlaying = false;
        playBtn.textContent = '▶';
        if (videoPlayer.src && !videoPlayer.paused) videoPlayer.pause();
    } else {
        audio.play().catch(() => {});
        isPlaying = true;
        playBtn.textContent = '⏸';
        if (videoPlayer.src && videoPlayer.paused) {
            if (videoPlayer.currentTime === 0 || videoPlayer.currentTime === videoPlayer.duration) {
                videoPlayer.currentTime = 0;
            }
            videoPlayer.play().catch(() => {});
            videoStatus.textContent = 'synced';
        }
    }
    updatePlayIndicator();
}

function prevTrack() {
    const idx = (currentIndex - 1 + tracks.length) % tracks.length;
    loadTrack(idx);
    if (isPlaying) audio?.play().catch(() => {});
}

function nextTrack() {
    const idx = (currentIndex + 1) % tracks.length;
    loadTrack(idx);
    if (isPlaying) audio?.play().catch(() => {});
}

function updateProgress() {
    if (!audio || isDragging) return;
    const pct = (audio.currentTime / audio.duration) * 100 || 0;
    progressFill.style.width = `${Math.min(pct, 100)}%`;
    timeDisplay.textContent = `${formatTime(audio.currentTime)} / ${formatTime(audio.duration || 0)}`;
    if (videoPlayer.src && isPlaying) {
        const diff = Math.abs(videoPlayer.currentTime - audio.currentTime);
        if (diff > 0.3) {
            videoPlayer.currentTime = audio.currentTime;
        }
    }
}

function updatePlayIndicator() {
    document.querySelectorAll('.track-item').forEach((el, idx) => {
        const indicator = el.querySelector('.tplay-indicator');
        if (indicator) indicator.textContent = idx === currentIndex && isPlaying ? '▶' : '';
    });
}

// ============================================================
// 7. SEARCH
// ============================================================
searchInput.addEventListener('input', () => {
    const q = searchInput.value.toLowerCase().trim();
    filteredTracks = tracks.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.genre.toLowerCase().includes(q) ||
        t.mood.toLowerCase().includes(q) ||
        t.collection.toLowerCase().includes(q)
    );
    renderSidebar(filteredTracks);
    if (filteredTracks.length > 0 && !filteredTracks.includes(tracks[currentIndex])) {
        const newIdx = tracks.indexOf(filteredTracks[0]);
        if (newIdx > -1) loadTrack(newIdx);
    }
});
// ============================================================
// CART VIEW (reemplaza el visor principal)
// ============================================================
const cartView = document.getElementById('cartView');
const visor = document.getElementById('visor');
const cartItemsList = document.getElementById('cartItemsList');
const cartTotalPrice = document.getElementById('cartTotalPrice');
const cartTotalSection = document.getElementById('cartTotalSection');
const cartBuyerEmail = document.getElementById('cartBuyerEmail');
const cartCheckoutBtn = document.getElementById('cartCheckoutBtn');
const backFromCartBtn = document.getElementById('backFromCartBtn');

// Mostrar la vista del carrito
function showCartView() {
    // Ocultar el visor principal (player, spectrogram, etc.)
    visor.style.display = 'none';
    // Mostrar la vista del carrito
    cartView.classList.add('active');
    // Renderizar el carrito
    renderCartView();
}

// Ocultar la vista del carrito y mostrar el visor principal
function hideCartView() {
    cartView.classList.remove('active');
    visor.style.display = 'flex';
}

// Renderizar el contenido del carrito en la vista
function renderCartView() {
    const total = cart.length * PRICE_PER_TRACK;

    if (cart.length === 0) {
        cartItemsList.innerHTML = '<div class="empty-cart-msg">Your cart is empty. Add some tracks! 🎵</div>';
        cartTotalSection.style.display = 'none';
        return;
    }

    let html = '';
    cart.forEach((track, i) => {
        html += `
            <div class="cart-item-row">
                <span>${track.name}</span>
                <span>
                    $${PRICE_PER_TRACK.toFixed(2)}
                    <button class="remove-item-btn" data-index="${i}">✕</button>
                </span>
            </div>
        `;
    });
    cartItemsList.innerHTML = html;

    cartTotalPrice.textContent = `Total: $${total.toFixed(2)} USD`;
    cartTotalSection.style.display = 'block';

    // Event listeners para eliminar items
    document.querySelectorAll('.remove-item-btn').forEach((btn) => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt(e.target.dataset.index);
            const trackToRemove = cart[idx];
            if (trackToRemove) {
                cart = cart.filter(t => t.index !== trackToRemove.index);
                updateCartUI();
                renderCartView(); // Re-renderizar la vista
            }
        });
    });
}

// Evento para abrir el carrito desde el botón superior
cartBtn.addEventListener('click', () => {
    showCartView();
});

// Evento para volver al reproductor
backFromCartBtn.addEventListener('click', () => {
    hideCartView();
});

// Evento para el checkout desde la vista del carrito
cartCheckoutBtn.addEventListener('click', () => {
    if (cart.length === 0) return;

    const buyerEmail = cartBuyerEmail.value;
    if (!buyerEmail || !buyerEmail.includes('@')) {
        alert('Please enter a valid email address.');
        return;
    }

    const total = cart.length * PRICE_PER_TRACK;
    const itemList = cart.map(t => t.name).join('\n');

    const form = document.createElement('form');
    form.method = 'POST';
    form.action = 'https://www.paypal.com/cgi-bin/webscr';

    const fields = {
        cmd: '_xclick',
        business: 'TU_EMAIL@PAYPAL.COM', // CAMBIA ESTO
        currency_code: 'USD',
        amount: total.toFixed(2),
        item_name: `Dhalius Tracks (${cart.length} tracks)`,
        item_number: 'Dhalius_CR_' + Date.now(),
        quantity: '1',
        return: 'https://tu-sitio.com/gracias',
        cancel_return: 'https://tu-sitio.com/cancelado',
        custom: buyerEmail,
        on0: 'Tracks',
        os0: itemList
    };

    for (const [key, value] of Object.entries(fields)) {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = value;
        form.appendChild(input);
    }

    document.body.appendChild(form);
    form.submit();
});
// ============================================================
// 8. VIDEO DROP ZONE
// ============================================================
dropArea.addEventListener('click', () => fileInput.click());

dropArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropArea.classList.add('dragover');
});

dropArea.addEventListener('dragleave', () => {
    dropArea.classList.remove('dragover');
});

dropArea.addEventListener('drop', (e) => {
    e.preventDefault();
    dropArea.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) handleVideoFile(files[0]);
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) handleVideoFile(e.target.files[0]);
});

function handleVideoFile(file) {
    if (file.size > 5 * 1024 * 1024) {
        alert('Video file is too large. Max size is 5 MB.');
        return;
    }
    if (!file.type.startsWith('video/')) {
        alert('Please select a video file (MP4, WebM, MOV).');
        return;
    }

    if (videoURL) URL.revokeObjectURL(videoURL);
    videoURL = URL.createObjectURL(file);
    videoPlayer.src = videoURL;
    videoPlayer.load();
    videoWrapper.style.display = 'block';
    dropArea.style.display = 'none';
    videoStatus.textContent = 'synced';

    if (isPlaying && audio) {
        videoPlayer.currentTime = audio.currentTime;
        videoPlayer.play().catch(() => {});
    }
}

removeVideoBtn.addEventListener('click', () => {
    if (videoURL) {
        URL.revokeObjectURL(videoURL);
        videoURL = null;
    }
    videoPlayer.src = '';
    videoPlayer.load();
    videoWrapper.style.display = 'none';
    dropArea.style.display = 'flex';
});

videoPlayer.addEventListener('seeked', () => {
    if (audio && isPlaying) {
        audio.currentTime = videoPlayer.currentTime;
    }
});

// ============================================================
// 9. SHOPPING CART
// ============================================================
function addToCart(index) {
    const track = tracks[index];
    if (!track) return;
    if (cart.find(t => t.index === index)) return;
    cart.push({ ...track, index });
    updateCartUI();
}

function removeFromCart(index) {
    cart = cart.filter(t => t.index !== index);
    updateCartUI();
}

function updateCartUI() {
    // Actualizar contador
    const cartCount = document.getElementById('cartCount');
    if (cartCount) cartCount.textContent = cart.length;

    // Actualizar botones en la lista de tracks
    document.querySelectorAll('.track-item').forEach((el) => {
        const btn = el.querySelector('.cart-add');
        if (btn) {
            const idx = parseInt(btn.dataset.index);
            const isInCart = cart.some(t => t.index === idx);
            btn.textContent = isInCart ? '✓' : '🛒';
            btn.classList.toggle('in-cart', isInCart);
        }
    });

    // Si la vista del carrito está abierta, re-renderizarla
    if (cartView.classList.contains('active')) {
        renderCartView();
    }
}

function renderCartModal() {
    const total = cart.length * PRICE_PER_TRACK;

    if (cart.length === 0) {
        cartItems.innerHTML = '<div style="color:#4a4a5a;font-size:0.8rem;">Your cart is empty.</div>';
        cartTotal.textContent = 'Total: $0.00 USD';
        checkoutBtn.style.display = 'none';
        buyerEmailSection.style.display = 'none';
        return;
    }

    let html = '';
    cart.forEach((track, i) => {
        html += `
            <div class="cart-item">
                <span>${track.name}</span>
                <span>
                    $${PRICE_PER_TRACK.toFixed(2)}
                    <button class="remove-item" data-index="${i}">✕</button>
                </span>
            </div>
        `;
    });
    cartItems.innerHTML = html;

    cartTotal.textContent = `Total: $${total.toFixed(2)} USD`;
    checkoutBtn.style.display = 'block';
    buyerEmailSection.style.display = 'block';

    document.querySelectorAll('.remove-item').forEach((btn) => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt(e.target.dataset.index);
            const trackToRemove = cart[idx];
            if (trackToRemove) {
                cart = cart.filter(t => t.index !== trackToRemove.index);
                updateCartUI();
            }
        });
    });
}

// Cart events
cartBtn.addEventListener('click', () => {
    cartModal.classList.toggle('show');
    renderCartModal();
});

closeCartBtn.addEventListener('click', () => {
    cartModal.classList.remove('show');
});

cartModal.addEventListener('click', (e) => {
    if (e.target === cartModal) cartModal.classList.remove('show');
});

checkoutBtn.addEventListener('click', () => {
    if (cart.length === 0) return;

    const buyerEmail = buyerEmailInput.value;
    if (!buyerEmail || !buyerEmail.includes('@')) {
        alert('Please enter a valid email address.');
        return;
    }

    const total = cart.length * PRICE_PER_TRACK;
    const itemList = cart.map(t => t.name).join('\n');

    const form = document.createElement('form');
    form.method = 'POST';
    form.action = 'https://www.paypal.com/cgi-bin/webscr';

    const fields = {
        cmd: '_xclick',
        business: 'TU_EMAIL@PAYPAL.COM',
        currency_code: 'USD',
        amount: total.toFixed(2),
        item_name: `Dhalius Tracks (${cart.length} tracks)`,
        item_number: 'Dhalius_CR_' + Date.now(),
        quantity: '1',
        return: 'https://tu-sitio.com/gracias',
        cancel_return: 'https://tu-sitio.com/cancelado',
        custom: buyerEmail,
        on0: 'Tracks',
        os0: itemList
    };

    for (const [key, value] of Object.entries(fields)) {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = value;
        form.appendChild(input);
    }

    document.body.appendChild(form);
    form.submit();
});

// ============================================================
// 10. EVENTS
// ============================================================
playBtn.addEventListener('click', togglePlay);
prevBtn.addEventListener('click', prevTrack);
nextBtn.addEventListener('click', nextTrack);
downloadBtn.addEventListener('click', () => {
    if (tracks[currentIndex]) window.open(tracks[currentIndex].url, '_blank');
});

document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;
    if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
    if (e.code === 'ArrowRight') nextTrack();
    if (e.code === 'ArrowLeft') prevTrack();
});

progressWrap.addEventListener('mousedown', (e) => {
    if (!audio) return;
    isDragging = true;
    const rect = progressWrap.getBoundingClientRect();
    const pct = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
    const time = pct * audio.duration;
    audio.currentTime = time;
    progressFill.style.width = `${pct * 100}%`;
    timeDisplay.textContent = `${formatTime(time)} / ${formatTime(audio.duration || 0)}`;
    if (videoPlayer.src) videoPlayer.currentTime = time;
});

window.addEventListener('mousemove', (e) => {
    if (!isDragging || !audio) return;
    const rect = progressWrap.getBoundingClientRect();
    const pct = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
    const time = pct * audio.duration;
    audio.currentTime = time;
    progressFill.style.width = `${pct * 100}%`;
    timeDisplay.textContent = `${formatTime(time)} / ${formatTime(audio.duration || 0)}`;
    if (videoPlayer.src) videoPlayer.currentTime = time;
});

window.addEventListener('mouseup', () => { isDragging = false; });

mobileToggle.addEventListener('click', () => {
    sidebar.classList.toggle('open');
});

document.addEventListener('click', (e) => {
    if (window.innerWidth <= 480) {
        if (!sidebar.contains(e.target) && e.target !== mobileToggle) {
            sidebar.classList.remove('open');
        }
    }
});

// ============================================================
// 11. INIT
// ============================================================
loadTracks();
console.log('🎛️ Dhalius Control Room v2.0 loaded — video sync + cart ready.');
