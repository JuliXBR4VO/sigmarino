
// Constants and Global Variables
const DOWNLOAD_API = "https://openmp3compiler.astudy.org";
const searchUrl = "https://jiosaavn-api-privatecvc2.vercel.app/search/songs?query=";
var results_container = document.querySelector("#saavn-results");
var results_objects = {};
var page_index = 1;
var lastSearch = '';  // Added lastSearch variable
var searchHistory = [];
var searchTimeout = null;
var isSearching = false;

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Brainrot Darkmode Toggle
    const darkBtn = document.getElementById('darkmode-toggle');
    if (darkBtn) {
        darkBtn.addEventListener('click', function() {
            document.body.classList.toggle('darkmode');
            if(document.body.classList.contains('darkmode')) {
                darkBtn.textContent = 'DARKMODE: ON';
                darkBtn.style.background = '#2c003e';
                darkBtn.style.color = '#fffb00';
                darkBtn.style.border = '3px solid #fffb00';
            } else {
                darkBtn.textContent = 'DARKMODE: OFF';
                darkBtn.style.background = '#fffb00';
                darkBtn.style.color = '#ff00ff';
                darkBtn.style.border = '3px solid #ff00ff';
            }
        });
    }

    // Setup fullscreen player
    setupFullscreenPlayer();
    
    // Setup search functionality
    setupSearchBar();
    
    // Handle hash-based navigation
    if(window.location.hash) {
        doSaavnSearch(window.location.hash.substring(1));
    } else {
        doSaavnSearch('english', 1);
    }
    
    // Listen for hash changes
    addEventListener('hashchange', () => {
        doSaavnSearch(window.location.hash.substring(1));
    });
    
    // Bitrate change
    $('#saavn-bitrate').on('change', () => {
        doSaavnSearch(lastSearch);
    });
    
    // Load more button
    document.getElementById("loadmore").addEventListener('click', () => {
        var query = document.querySelector("#saavn-search-box").value.trim();
        if (!query) query = lastSearch;
        query = encodeURIComponent(query);
        doSaavnSearch(query, 0, true);
    });
    
    // Modal popup for downloads
    var mpopup = document.getElementById('mpopupBox');
    var mpLink = document.getElementById("mpopupLink");
    var closeModal = document.getElementsByClassName("close")[0];
    
    mpLink.onclick = function() {
        mpopup.style.display = "block";
    };
    
    closeModal.onclick = function() {
        mpopup.style.display = "none";
    };
    
    window.onclick = function(event) {
        if (event.target == mpopup) {
            mpopup.style.display = "none";
        }
    };

    // Setup popular search terms
    setupPopularSearchTerms();
});

// Setup Search Bar Functionality
function setupSearchBar() {
    const searchBox = document.getElementById('saavn-search-box');
    const clearButton = document.getElementById('clear-search');
    const searchForm = document.querySelector('.search-form');
    const searchStatus = document.getElementById('search-status');
    
    // Load search history from localStorage
    loadSearchHistory();
    
    // Clear button functionality
    clearButton.addEventListener('click', function() {
        searchBox.value = '';
        clearButton.classList.remove('visible');
        searchBox.focus();
    });
    
    // Show/hide clear button based on input
    searchBox.addEventListener('input', function() {
        if (searchBox.value.trim() !== '') {
            clearButton.classList.add('visible');
            
            // Debounce search for better performance
            if (searchTimeout) {
                clearTimeout(searchTimeout);
            }
            
            searchTimeout = setTimeout(() => {
                if (searchBox.value.trim().length >= 2) {
                    SaavnSearch();
                }
            }, 500);
        } else {
            clearButton.classList.remove('visible');
        }
    });
    
    // Focus search box when / is pressed
    document.addEventListener('keydown', function(e) {
        if (e.key === '/' && document.activeElement !== searchBox) {
            e.preventDefault();
            searchBox.focus();
        }
        
        // Clear search and blur when Escape is pressed
        if (e.key === 'Escape' && document.activeElement === searchBox) {
            searchBox.value = '';
            clearButton.classList.remove('visible');
            searchBox.blur();
        }
    });
    
    // Form submission
    searchForm.addEventListener('submit', function(e) {
        e.preventDefault();
        SaavnSearch();
    });
    
    // Initial state of clear button
    if (searchBox.value.trim() !== '') {
        clearButton.classList.add('visible');
    }
}

// Load search history from localStorage
function loadSearchHistory() {
    const savedHistory = localStorage.getItem('searchHistory');
    if (savedHistory) {
        searchHistory = JSON.parse(savedHistory);
        updateSearchHistoryUI();
    }
}

// Save search term to history
function saveToSearchHistory(term) {
    // Don't save empty or very short terms
    if (!term || term.length < 2) return;
    
    // Remove if already exists (to move it to the top)
    searchHistory = searchHistory.filter(item => item.toLowerCase() !== term.toLowerCase());
    
    // Add to the beginning
    searchHistory.unshift(term);
    
    // Keep only the last 10 searches
    if (searchHistory.length > 10) {
        searchHistory = searchHistory.slice(0, 10);
    }
    
    // Save to localStorage
    localStorage.setItem('searchHistory', JSON.stringify(searchHistory));
    
    // Update UI
    updateSearchHistoryUI();
}

// Update search history UI
function updateSearchHistoryUI() {
    const historyContainer = document.getElementById('search-history');
    
    if (searchHistory.length === 0) {
        historyContainer.classList.remove('visible');
        return;
    }
    
    historyContainer.classList.add('visible');
    
    let html = `
        <div class="search-history-title">
            <i class="fas fa-history"></i> Letzte Suchen
        </div>
        <ul class="search-history-list">
    `;
    
    searchHistory.forEach(term => {
        html += `
            <li class="search-history-item" onclick="searchFromHistory('${term}')">
                <i class="fas fa-search"></i> ${term}
            </li>
        `;
    });
    
    html += `</ul>`;
    historyContainer.innerHTML = html;
}

// Search from history item
function searchFromHistory(term) {
    document.getElementById('saavn-search-box').value = term;
    document.getElementById('clear-search').classList.add('visible');
    SaavnSearch();
}

// Setup popular search terms
function setupPopularSearchTerms() {
    const popularTerms = [
        { icon: 'fa-fire', text: 'Top Hits' },
        { icon: 'fa-guitar', text: 'Rock' },
        { icon: 'fa-compact-disc', text: 'Pop' },
        { icon: 'fa-drum', text: 'Hip Hop' },
        { icon: 'fa-music', text: 'Jazz' },
        { icon: 'fa-heart', text: 'Balladen' },
        { icon: 'fa-globe', text: 'Weltmusik' },
        { icon: 'fa-microphone', text: 'Deutsch' }
    ];
    
    const container = document.querySelector('.search-toggle-container');
    let html = '';
    
    popularTerms.forEach(term => {
        html += `
            <button class="search-toggle" onclick="searchFromHistory('${term.text}')">
                <i class="fas ${term.icon}"></i> ${term.text}
            </button>
        `;
    });
    
    container.innerHTML = html;
}

// Audio Player Functions
function PlayAudio(audio_url, song_id) {
    var audio = document.getElementById('player');
    var source = document.getElementById('audioSource');
    source.src = audio_url;
    var name = document.getElementById(song_id+"-n").textContent;
    var album = document.getElementById(song_id+"-a").textContent;
    var artist = document.getElementById(song_id+"-ar").textContent;
    var image = document.getElementById(song_id+"-i").getAttribute("data-src") || document.getElementById(song_id+"-i").getAttribute("src");
    
    document.title = name+" - "+album;
    var bitrate = document.getElementById('saavn-bitrate');
    var bitrate_i = bitrate.options[bitrate.selectedIndex].value;
    var quality = bitrate_i == 4 ? 320 : 160;

    // Update mini player
    document.getElementById("player-name").innerHTML = name;
    document.getElementById("player-album").innerHTML = album + " - " + artist;
    
    // Handle player image with lazy loading
    var playerImage = document.getElementById("player-image");
    playerImage.setAttribute("data-src", image);
    playerImage.src = image;
    playerImage.classList.add("loaded");
    var placeholder = playerImage.parentNode.querySelector('.image-placeholder');
    if (placeholder) {
        placeholder.style.opacity = '0';
    }

    // Update fullscreen player
    var fullscreenCover = document.querySelector(".fullscreen-cover");
    var fullscreenTitle = document.querySelector(".fullscreen-title");
    var fullscreenArtist = document.querySelector(".fullscreen-artist");
    var fullscreenAlbum = document.querySelector(".fullscreen-album");
    var fullscreenBg = document.querySelector(".fullscreen-bg");
    
    if (fullscreenCover) {
        fullscreenCover.src = image;
        fullscreenTitle.textContent = name;
        fullscreenArtist.textContent = artist;
        fullscreenAlbum.textContent = album;
        fullscreenBg.style.backgroundImage = "url('" + image + "')";
    }

    var promise = audio.load();
    if (promise) {
        promise.catch(function(error) { console.error(error); });
    }
    audio.play();
}

// Search Functions
function SaavnSearch() {
    event.preventDefault();
    var query = document.querySelector("#saavn-search-box").value.trim();
    
    if (!query) return;
    
    query = encodeURIComponent(query);
    
    // Save to search history
    saveToSearchHistory(decodeURIComponent(query));
    
    // Update search status
    updateSearchStatus('Suche läuft...');
    
    // Show loader
    showSearchingState(true);
    
    doSaavnSearch(query);
}

function searchSong(search_term) {
    document.getElementById('saavn-search-box').value = search_term;
    document.getElementById("saavn-search-trigger").click();
}

async function doSaavnSearch(query, NotScroll, page) {
    window.location.hash = query;
    document.querySelector("#saavn-search-box").value = decodeURIComponent(query);
    if(!query) return 0;

    // Set searching state
    isSearching = true;
    showSearchingState(true);
    
    results_container.innerHTML = '<div class="loader">Suche läuft...</div>';
    query = query + "&limit=40";
    
    if(page) {
        page_index = page_index + 1;
        query = query + "&page=" + page_index;
    } else {
        query = query + "&page=1";
        page_index = 1;
    }
    
    try {
        var response = await fetch(searchUrl + query);
        var json = await response.json();
        
        if (response.status !== 200) {
            results_container.innerHTML = `<div class="no-results">
                <i class="fas fa-exclamation-circle"></i>
                <h4>Fehler bei der Suche</h4>
                <p>${json.message || 'Ein unbekannter Fehler ist aufgetreten.'}</p>
            </div>`;
            console.log(response);
            updateSearchStatus('Fehler bei der Suche');
            showSearchingState(false);
            return 0;
        }

        var json = json.data.results;
        if(!json || json.length === 0) {
            results_container.innerHTML = `<div class="no-results">
                <i class="fas fa-search"></i>
                <h4>Keine Ergebnisse gefunden</h4>
                <p>Versuche es mit anderen Suchbegriffen oder wähle eine der Vorschläge unten.</p>
                <div class="suggestions">
                    <button class="suggestion-btn" onclick="searchFromHistory('Top Hits')">Top Hits</button>
                    <button class="suggestion-btn" onclick="searchFromHistory('Pop')">Pop</button>
                    <button class="suggestion-btn" onclick="searchFromHistory('Rock')">Rock</button>
                    <button class="suggestion-btn" onclick="searchFromHistory('Hip Hop')">Hip Hop</button>
                </div>
            </div>`;
            updateSearchStatus('Keine Ergebnisse gefunden');
            showSearchingState(false);
            return;
        }

        lastSearch = decodeURI(window.location.hash.substring(1));
        var results = [];

        for(let track of json) {
            song_name = TextAbstract(track.name, 25);
            album_name = TextAbstract(track.album.name, 20);
            if (track.album.name == track.name) album_name = "";
            
            var measuredTime = new Date(null);
            measuredTime.setSeconds(track.duration);
            var play_time = measuredTime.toISOString().substr(11, 8);
            if (play_time.startsWith("00:0")) play_time = play_time.slice(4);
            if (play_time.startsWith("00:")) play_time = play_time.slice(3);
            
            var song_id = track.id;
            var year = track.year;
            var song_image = track.image[1].link;
            var song_artist = TextAbstract(track.primaryArtists, 30);
            var bitrate = document.getElementById('saavn-bitrate');
            var bitrate_i = bitrate.options[bitrate.selectedIndex].value;
            
            if(track.downloadUrl) {
                var download_url = track.downloadUrl[bitrate_i]['link'];
                results_objects[song_id] = { track: track };
                
                results.push(generateSongCard(song_id, song_name, song_artist, album_name, year, play_time, song_image, download_url));
            }
        }
        
        results_container.innerHTML = results.join(' ');
        
        // Force load all images after adding them to DOM
        const allImages = document.querySelectorAll('.lazy-image');
        allImages.forEach(img => {
            const src = img.getAttribute('data-src');
            if (src) {
                img.src = src;
                img.onload = function() {
                    img.classList.add('loaded');
                    const placeholder = img.parentNode.querySelector('.image-placeholder');
                    if (placeholder) {
                        placeholder.style.opacity = '0';
                    }
                };
            }
        });
        
        if(!NotScroll) {
            document.getElementById("saavn-results").scrollIntoView({ behavior: 'smooth' });
        }
        
        // Update search status with count
        updateSearchStatus(`${json.length} Ergebnisse gefunden`);
        
    } catch(error) {
        results_container.innerHTML = `<div class="no-results">
            <i class="fas fa-exclamation-triangle"></i>
            <h4>Fehler bei der Suche</h4>
            <p>${error} <br> Bitte überprüfe deine Internetverbindung oder versuche es später erneut.</p>
        </div>`;
        updateSearchStatus('Fehler bei der Suche');
    } finally {
        // Reset searching state
        isSearching = false;
        showSearchingState(false);
    }
}

// Update search status
function updateSearchStatus(message) {
    const statusElement = document.getElementById('search-status');
    if (statusElement) {
        statusElement.textContent = message;
        
        // Setze die Farbe basierend auf der Nachricht
        if (message.includes('Ergebnisse gefunden')) {
            statusElement.style.color = 'var(--primary-color)';
        } else if (message.includes('Fehler')) {
            statusElement.style.color = '#ff5555';
        } else if (message.includes('Suche läuft')) {
            statusElement.style.color = 'var(--text-secondary)';
        } else if (message.includes('Keine Ergebnisse')) {
            statusElement.style.color = '#ff9955';
        }
    }
}

// Show searching state
function showSearchingState(isSearching) {
    const searchIcon = document.querySelector('.search-icon i');
    const searchButton = document.getElementById('saavn-search-trigger');
    
    if (isSearching) {
        searchIcon.classList.add('searching');
        searchButton.disabled = true;
    } else {
        searchIcon.classList.remove('searching');
        searchButton.disabled = false;
    }
}

// Download Functions
function AddDownload(id) {
    var bitrate = document.getElementById('saavn-bitrate');
    var bitrate_i = bitrate.options[bitrate.selectedIndex].value;
    var MP3DL = DOWNLOAD_API+"/add?id="+id;
    
    fetch(MP3DL)
        .then(response => response.json())
        .then(data => {
            if (data.status == "success") {
                addToDownloadList(id, data);
                updateDownloadStatus(id);
            }
        });
}

// Helper Functions
function TextAbstract(text, length) {
    if (!text) return "";
    if (text.length <= length) return text;
    
    text = text.substring(0, length);
    return text.substring(0, text.lastIndexOf(" ")) + "...";
}

function generateSongCard(id, name, artist, album, year, duration, image, downloadUrl) {
    return `
        <div class="song-card" data-song-id="${id}">
            <div class="song-image-container">
                <div class="image-placeholder">
                    <i class="fas fa-music"></i>
                </div>
                <img class="lazy-image song-cover" id="${id}-i" 
                     data-src="${image}" 
                     src="${image}"
                     alt="${name}">
                <div class="song-overlay">
                    <button class="play-btn" onclick='PlayAudio("${downloadUrl}","${id}")' aria-label="Abspielen">
                        <i class="fas fa-play"></i>
                    </button>
                    <button class="download-btn" onclick='AddDownload("${id}")' aria-label="Herunterladen">
                        <i class="fas fa-download"></i>
                    </button>
                </div>
            </div>
            <div class="song-info">
                <h3 class="song-name" id="${id}-n">${name}</h3>
                <p class="song-artist" id="${id}-ar">${artist}</p>
                <p class="song-album" id="${id}-a">${album}</p>
                <div class="song-meta">
                    <span class="song-year">${year}</span>
                    <span class="song-duration">${duration}</span>
                </div>
            </div>
        </div>
    `;
}

function addToDownloadList(id, data) {
    var download_list = document.getElementById("download-list");
    var download_item = document.createElement("li");
    
    download_item.innerHTML = `
        <div class="col">
            <img class="track-img" src="${data.image}" width="50px">
            <div style="display: inline;">
                <span class="track-name">${results_objects[id].track.name}</span> - 
                <span class="track-album">${results_objects[id].track.album.name}</span>
                <br>
                <span class="track-size">Size: Null</span>
                <span class="track-status" style="color:green">${data.status}</span>
            </div>
        </div>
        <hr>
    `;
    
    download_item.setAttribute("track_tag", id);
    download_item.className = "no-bullets";
    download_list.appendChild(download_item);
    
    // Visual feedback on download button
    var float_tap = document.getElementById('mpopupLink');
    float_tap.style.backgroundColor = "green";
    float_tap.style.borderColor = "green";
    setTimeout(() => {
        float_tap.style.backgroundColor = "#007bff";
        float_tap.style.borderColor = "#007bff";
    }, 1000);
    
    // Show download popup
    document.getElementById('mpopupBox').style.display = "block";
}

function updateDownloadStatus(id) {
    var STATUS_URL = DOWNLOAD_API+"/status?id="+id;
    var download_status_span = document.querySelector(`[track_tag="${id}"] .track-status`);
    var download_size = document.querySelector(`[track_tag="${id}"] .track-size`);
    
    var interval = setInterval(() => {
        fetch(STATUS_URL)
            .then(response => response.json())
            .then(data => {
                if (data.status) {
                    download_status_span.textContent = data.status;
                    if(data.size) {
                        download_size.textContent = "Size: "+data.size;
                    }
                    if (data.status == "Done") {
                        download_status_span.innerHTML = `<a href="${DOWNLOAD_API}${data.url}" target="_blank">Download MP3</a>`;
                        clearInterval(interval);
                    }
                }
            });
    }, 3000);
}

// Enhanced Fullscreen Player Functions
function setupFullscreenPlayer() {
    const audio = document.getElementById('player');
    const fullscreenPlayer = document.querySelector('.fullscreen-player');
    const playerImage = document.getElementById('player-image');
    const imageContainer = playerImage.parentNode;
    const closeFullscreen = document.querySelector('.close-fullscreen');
    const playPauseBtn = document.getElementById('play-pause-btn');
    const progressBar = document.querySelector('.progress-bar');
    const progress = document.querySelector('.progress');
    
    // Ensure player image click works properly
    imageContainer.addEventListener('click', function() {
        openFullscreenPlayer();
    });
    
    // Close fullscreen player
    closeFullscreen.addEventListener('click', function() {
        fullscreenPlayer.classList.remove('active');
        setTimeout(() => {
            fullscreenPlayer.style.display = 'none';
        }, 400); // Match the animation duration
    });
    
    // Play/Pause button
    playPauseBtn.addEventListener('click', function() {
        togglePlay();
    });
    
    // Progress bar click
    progressBar.addEventListener('click', function(e) {
        const width = this.clientWidth;
        const clickX = e.offsetX;
        const duration = audio.duration;
        audio.currentTime = (clickX / width) * duration;
    });
    
    // Update progress
    audio.addEventListener('timeupdate', function() {
        updateProgress();
    });
    
    // Update play/pause icon when audio state changes
    audio.addEventListener('play', function() {
        fullscreenPlayer.classList.add('playing');
        playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
    });
    
    audio.addEventListener('pause', function() {
        fullscreenPlayer.classList.remove('playing');
        playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
    });
    
    // Forward and Backward Controls
    document.getElementById('prev-btn').addEventListener('click', function() {
        audio.currentTime = Math.max(audio.currentTime - 10, 0);
    });
    
    document.getElementById('next-btn').addEventListener('click', function() {
        if (audio.duration) {
            audio.currentTime = Math.min(audio.currentTime + 10, audio.duration);
        }
    });
    
    // Keyboard controls for fullscreen player
    document.addEventListener('keydown', function(e) {
        if (fullscreenPlayer.classList.contains('active')) {
            if (e.key === ' ' || e.key === 'k') {
                e.preventDefault();
                togglePlay();
            } else if (e.key === 'ArrowLeft' || e.key === 'j') {
                audio.currentTime = Math.max(audio.currentTime - 10, 0);
            } else if (e.key === 'ArrowRight' || e.key === 'l') {
                if (audio.duration) {
                    audio.currentTime = Math.min(audio.currentTime + 10, audio.duration);
                }
            } else if (e.key === 'Escape') {
                closeFullscreen.click();
            }
        }
    });
}

function openFullscreenPlayer() {
    const audio = document.getElementById('player');
    const fullscreenPlayer = document.querySelector('.fullscreen-player');
    const playerImage = document.getElementById('player-image');
    const fullscreenCover = document.querySelector('.fullscreen-cover');
    const fullscreenTitle = document.querySelector('.fullscreen-title');
    const fullscreenArtist = document.querySelector('.fullscreen-artist');
    const fullscreenAlbum = document.querySelector('.fullscreen-album');
    const fullscreenBg = document.querySelector('.fullscreen-bg');
    
    // Get the actual image source
    let actualImageSrc = playerImage.getAttribute('data-src') || playerImage.src;
    
    // Update fullscreen player elements
    fullscreenCover.src = actualImageSrc;
    fullscreenTitle.textContent = document.getElementById('player-name').textContent;
    
    // Parse album and artist
    let albumArtist = document.getElementById('player-album').textContent;
    let parts = albumArtist.split(' - ');
    if(parts.length >= 2) {
        fullscreenAlbum.textContent = parts[0];
        fullscreenArtist.textContent = parts[1];
    } else {
        fullscreenAlbum.textContent = albumArtist;
        fullscreenArtist.textContent = "";
    }
    
    // Set background
    fullscreenBg.style.backgroundImage = `url('${actualImageSrc}')`;
    
    // Show fullscreen player with animation
    fullscreenPlayer.style.display = 'flex';
    setTimeout(() => {
        fullscreenPlayer.classList.add('active');
    }, 10);
    
    // Update play/pause state
    updatePlayPauseIcon();
    
    // Update progress
    updateProgress();
}

function togglePlay() {
    const audio = document.getElementById('player');
    const fullscreenPlayer = document.querySelector('.fullscreen-player');
    const playPauseBtn = document.getElementById('play-pause-btn');
    
    if (audio.paused) {
        audio.play();
        fullscreenPlayer.classList.add('playing');
        playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
    } else {
        audio.pause();
        fullscreenPlayer.classList.remove('playing');
        playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
    }
}

function updatePlayPauseIcon() {
    const audio = document.getElementById('player');
    const playPauseBtn = document.getElementById('play-pause-btn');
    
    playPauseBtn.innerHTML = audio.paused ? 
        '<i class="fas fa-play"></i>' : 
        '<i class="fas fa-pause"></i>';
}

function updateProgress() {
    const audio = document.getElementById('player');
    const progress = document.querySelector('.progress');
    const currentTimeSpan = document.querySelector('.current-time');
    const totalTimeSpan = document.querySelector('.total-time');
    
    if (audio.duration) {
        const percent = (audio.currentTime / audio.duration) * 100;
        progress.style.width = percent + '%';
        currentTimeSpan.textContent = formatTime(audio.currentTime);
        totalTimeSpan.textContent = formatTime(audio.duration);
    }
}

function formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    const minutes = Math.floor(seconds / 60);
    seconds = Math.floor(seconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
