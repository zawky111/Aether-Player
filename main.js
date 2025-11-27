const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const axios = require('axios');

let mainWindow;

// Список Invidious инстансов для поиска и получения информации
const INVIDIOUS_INSTANCES = [
    'https://invidious.fdn.fr',
    'https://yewtu.be',
    'https://inv.riverside.rocks',
    'https://invidious.osi.kr',
    'https://vid.puffyan.us',
    'https://invidious.namazso.eu',
    'https://inv.bp.projectsegfau.lt',
    'https://y.com.sb',
    'https://invidious.privacyredirect.com',
    'https://invidious.snopyta.org',
    'https://yt.artemislena.eu',
    'https://invidious.slipfox.xyz',
    'https://inv.us.projectsegfau.lt'
];

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        backgroundColor: '#050505',
        title: 'Aether Player 7.1',
        autoHideMenuBar: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
            webSecurity: true
        },
        frame: true,
        titleBarStyle: 'default',
        icon: path.join(__dirname, 'icon.png')
    });

    mainWindow.loadFile('index.html');

    // Открыть DevTools (для разработки)
    // mainWindow.webContents.openDevTools();

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// IPC Handlers для YouTube поиска

// Поиск видео на YouTube через Invidious
ipcMain.handle('search-youtube', async (event, query) => {
    console.log('Searching YouTube for:', query);

    // Пробуем каждый инстанс по очереди
    for (const instance of INVIDIOUS_INSTANCES) {
        try {
            console.log(`Trying instance: ${instance}`);
            const response = await axios.get(`${instance}/api/v1/search`, {
                params: {
                    q: query,
                    type: 'video'
                },
                timeout: 10000
            });

            if (response.data && response.data.length > 0) {
                console.log(`Success! Found ${response.data.length} results from ${instance}`);
                return {
                    success: true,
                    data: response.data,
                    instance: instance
                };
            }
        } catch (error) {
            console.log(`Failed with ${instance}:`, error.message);
            continue; // Пробуем следующий инстанс
        }
    }

    // Если все инстансы не сработали
    return {
        success: false,
        error: 'Все серверы YouTube недоступны. Попробуйте позже.'
    };
});

// Получение информации о видео
ipcMain.handle('get-video-info', async (event, videoId) => {
    console.log('Getting video info for:', videoId);

    // Пробуем каждый инстанс по очереди
    for (const instance of INVIDIOUS_INSTANCES) {
        try {
            console.log(`Trying instance: ${instance}`);
            const response = await axios.get(`${instance}/api/v1/videos/${videoId}`, {
                timeout: 15000
            });

            if (response.data) {
                console.log(`Success! Got video info from ${instance}`);
                return {
                    success: true,
                    data: response.data,
                    instance: instance
                };
            }
        } catch (error) {
            console.log(`Failed with ${instance}:`, error.message);
            continue;
        }
    }

    return {
        success: false,
        error: 'Не удалось получить информацию о видео'
    };
});

// ======== SOUNDCLOUD API ========

// Client ID для SoundCloud API (публичный)
const SOUNDCLOUD_CLIENT_IDS = [
    'YUKXoArFcqrlQn9tfNHvvyfnDISj04zk',
    'iZIs9mchVcX5lhVRyQGGAYlNPVldzAoX',
    'fDoItMDbsbZz8dY16ZzARCZmzgHBPotA',
    'a3e059563d7fd3372b49b37f00a00bcf',
    'ghKDhOLRourkeyzWu92cHFyJxNIuWyaP',
    'px0SDWermclW4QKDyhQZGhPRdp0zXkkJ'
];

let currentSCClientId = SOUNDCLOUD_CLIENT_IDS[0];

// Поиск треков в SoundCloud
ipcMain.handle('search-soundcloud', async (event, query) => {
    console.log('Searching SoundCloud for:', query);

    for (const clientId of SOUNDCLOUD_CLIENT_IDS) {
        try {
            const response = await axios.get('https://api-v2.soundcloud.com/search/tracks', {
                params: {
                    q: query,
                    client_id: clientId,
                    limit: 15
                },
                timeout: 10000
            });

            if (response.data && response.data.collection) {
                console.log(`Success! Found ${response.data.collection.length} results`);
                return {
                    success: true,
                    data: response.data.collection
                };
            }
        } catch (error) {
            console.log(`Failed with client ID ${clientId}:`, error.message);
            continue;
        }
    }

    return {
        success: false,
        error: 'Не удалось выполнить поиск в SoundCloud'
    };
});

// Получение информации о треке SoundCloud
ipcMain.handle('get-soundcloud-track', async (event, trackId) => {
    console.log('Getting SoundCloud track info for:', trackId);

    for (const clientId of SOUNDCLOUD_CLIENT_IDS) {
        try {
            const response = await axios.get(`https://api-v2.soundcloud.com/tracks/${trackId}`, {
                params: {
                    client_id: clientId
                },
                timeout: 15000
            });

            if (response.data) {
                console.log('Got track info:', response.data.title);

                // Получаем stream URL
                let streamUrl = null;

                if (response.data.media && response.data.media.transcodings) {
                    const mp3Trans = response.data.media.transcodings.find(t =>
                        t.format && t.format.protocol === 'progressive'
                    );

                    if (mp3Trans) {
                        const streamResponse = await axios.get(mp3Trans.url, {
                            params: {
                                client_id: clientId
                            },
                            timeout: 10000
                        });

                        if (streamResponse.data && streamResponse.data.url) {
                            streamUrl = streamResponse.data.url;
                        }
                    }
                }

                return {
                    success: true,
                    data: {
                        ...response.data,
                        stream_url: streamUrl
                    }
                };
            }
        } catch (error) {
            console.log(`Failed with client ID ${clientId}:`, error.message);
            continue;
        }
    }

    return {
        success: false,
        error: 'Не удалось получить информацию о треке'
    };
});

// Получение трека по URL
ipcMain.handle('get-soundcloud-from-url', async (event, url) => {
    console.log('Getting SoundCloud track from URL:', url);

    for (const clientId of SOUNDCLOUD_CLIENT_IDS) {
        try {
            const resolveResponse = await axios.get('https://api-v2.soundcloud.com/resolve', {
                params: {
                    url: url,
                    client_id: clientId
                },
                timeout: 15000
            });

            if (resolveResponse.data && resolveResponse.data.id) {
                const trackId = resolveResponse.data.id;
                console.log('Resolved to track ID:', trackId);

                // Получаем полную информацию о треке через API
                const trackResponse = await axios.get(`https://api-v2.soundcloud.com/tracks/${trackId}`, {
                    params: {
                        client_id: clientId
                    },
                    timeout: 15000
                });

                if (trackResponse.data) {
                    // Получаем stream URL
                    let streamUrl = null;

                    if (trackResponse.data.media && trackResponse.data.media.transcodings) {
                        const mp3Trans = trackResponse.data.media.transcodings.find(t =>
                            t.format && t.format.protocol === 'progressive'
                        );

                        if (mp3Trans) {
                            const streamResponse = await axios.get(mp3Trans.url, {
                                params: {
                                    client_id: clientId
                                },
                                timeout: 10000
                            });

                            if (streamResponse.data && streamResponse.data.url) {
                                streamUrl = streamResponse.data.url;
                            }
                        }
                    }

                    return {
                        success: true,
                        data: {
                            ...trackResponse.data,
                            stream_url: streamUrl
                        }
                    };
                }
            }
        } catch (error) {
            console.log(`Failed with client ID ${clientId}:`, error.message);
            continue;
        }
    }

    return {
        success: false,
        error: 'Не удалось получить трек по ссылке'
    };
});
