const { contextBridge, ipcRenderer } = require('electron');

// Безопасно предоставляем API для renderer процесса
contextBridge.exposeInMainWorld('electronAPI', {
    // === YOUTUBE ===
    // Поиск на YouTube
    searchYouTube: (query) => ipcRenderer.invoke('search-youtube', query),

    // Получение информации о видео
    getVideoInfo: (videoId) => ipcRenderer.invoke('get-video-info', videoId),

    // === SOUNDCLOUD ===
    // Поиск в SoundCloud
    searchSoundCloud: (query) => ipcRenderer.invoke('search-soundcloud', query),

    // Получение информации о треке SoundCloud
    getSoundCloudTrack: (trackId) => ipcRenderer.invoke('get-soundcloud-track', trackId),

    // Получение трека по URL
    getSoundCloudFromUrl: (url) => ipcRenderer.invoke('get-soundcloud-from-url', url),

    // === ITUNES ===
    searchITunes: (query) => ipcRenderer.invoke('search-itunes', query)
});

console.log('Preload script loaded successfully');
