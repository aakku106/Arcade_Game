/* Manifest version: vxjjTF52 */
// Caution! Be sure you understand the caveats before publishing an application with
// offline support. See https://aka.ms/blazor-offline-considerations

self.importScripts('./service-worker-assets.js');
self.addEventListener('install', event => event.waitUntil(onInstall(event)));
self.addEventListener('activate', event => event.waitUntil(onActivate(event)));
self.addEventListener('fetch', event => event.respondWith(onFetch(event)));

const cacheNamePrefix = 'offline-cache-';
const cacheName = `${cacheNamePrefix}${self.assetsManifest.version}`;
const offlineAssetsInclude = [ /\.dll$/, /\.pdb$/, /\.wasm/, /\.html/, /\.js$/, /\.json$/, /\.css$/, /\.woff$/, /\.png$/, /\.jpe?g$/, /\.gif$/, /\.ico$/, /\.blat$/, /\.dat$/, /\.wav$/, /\.mp3$/ ];
const offlineAssetsExclude = [ /^service-worker\.js$/ ];

// Use the correct base path for GitHub Pages
const base = '/Arcade_Game/';

async function onInstall(event) {
    console.info('Service worker: Install');

    // Fetch and cache all matching items from the assets manifest
    const assetsRequests = self.assetsManifest.assets
        .filter(asset => offlineAssetsInclude.some(pattern => pattern.test(asset.url)))
        .filter(asset => !offlineAssetsExclude.some(pattern => pattern.test(asset.url)))
        .map(asset => new Request(new URL(asset.url, self.location.origin).href, { cache: 'no-cache' })); // Remove integrity
    
    // Also cache sound files that might not be in the asset manifest
    const soundFiles = [
        'sounds/clickSound.wav',
        'sounds/arraarra.mp3',
        'sounds/long1.mp3',
        'sounds/long2.mp3',
        'sounds/LvlRestartSound.mp3'
    ];
    
    const soundRequests = soundFiles.map(sound => 
        new Request(new URL(`${base}${sound}`, self.location.origin).href));
    
    // Combine all requests
    const allRequests = [...assetsRequests, ...soundRequests];
    
    // Use try-catch to handle any fetch errors
    try {
        const cache = await caches.open(cacheName);
        // Cache each item individually to avoid one failure breaking everything
        for (const request of allRequests) {
            try {
                await cache.add(request);
            } catch (e) {
                console.warn(`Failed to cache: ${request.url}`, e);
            }
        }
    } catch (e) {
        console.error('Service worker installation failed:', e);
    }
}

async function onActivate(event) {
    console.info('Service worker: Activate');

    // Delete unused caches
    const cacheKeys = await caches.keys();
    await Promise.all(cacheKeys
        .filter(key => key.startsWith(cacheNamePrefix) && key !== cacheName)
        .map(key => caches.delete(key)));
}

async function onFetch(event) {
    let cachedResponse = null;
    if (event.request.method === 'GET') {
        // For all navigation requests, try to serve index.html from cache
        const shouldServeIndexHtml = event.request.mode === 'navigate';

        const request = shouldServeIndexHtml ? new Request(`${base}index.html`) : event.request;
        const cache = await caches.open(cacheName);
        cachedResponse = await cache.match(request);
    }

    return cachedResponse || fetch(event.request);
}
