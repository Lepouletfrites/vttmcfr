// ==========================================
// SERVICE WORKER — MODE HORS-LIGNE (PWA)
// ==========================================
// - Fichiers de l'appli (html/js/css/cartes) : réseau d'abord, cache en secours
//   → on récupère toujours la dernière version quand on est connecté.
// - Images de cartes : cache d'abord → une image déjà vue s'affiche sans connexion.
// - API MarvelCDB : jamais mise en cache ici (les decks sont stockés par l'appli elle-même).
// Changer SW_VERSION force le renouvellement du cache des fichiers de l'appli.
const SW_VERSION = 'v2';
const SHELL_CACHE = `mcvtt-shell-${SW_VERSION}`;
const IMAGE_CACHE = 'mcvtt-images-v1';
const IMAGE_CACHE_MAX = 3000;

const SHELL_FILES = [
    './',
    'index.html',
    'style.css',
    'js/core.js',
    'js/menu.js',
    'js/card-data.js',
    'js/decks.js',
    'js/scenario.js',
    'js/gameplay.js',
    'js/board.js',
    'js/save.js',
    'js/deckbuilder.js',
    'gamedata.js',
    'cards.js',
    'manifest.webmanifest',
    'assets/player_back.jpg',
    'assets/encounter_back.jpg',
    'icons/icon-192.png',
    'icons/icon-512.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(SHELL_CACHE)
            .then(cache => cache.addAll(SHELL_FILES))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(keys
                .filter(k => k.startsWith('mcvtt-') && k !== SHELL_CACHE && k !== IMAGE_CACHE)
                .map(k => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

function isImage(url) {
    return /\.(jpe?g|png|webp|gif)$/i.test(url.pathname);
}

async function networkFirst(request) {
    const url = new URL(request.url);
    const key = url.origin + url.pathname; // ignore ?v=… pour retrouver le fichier hors-ligne
    const cache = await caches.open(SHELL_CACHE);
    try {
        const response = await fetch(request);
        if (response.ok) cache.put(key, response.clone());
        return response;
    } catch (e) {
        const cached = await cache.match(key) || await cache.match(request, { ignoreSearch: true });
        if (cached) return cached;
        if (request.mode === 'navigate') {
            const index = await cache.match(new URL('index.html', self.registration.scope).href);
            if (index) return index;
        }
        throw e;
    }
}

async function trimImageCache(cache) {
    const keys = await cache.keys();
    if (keys.length > IMAGE_CACHE_MAX) {
        await Promise.all(keys.slice(0, keys.length - IMAGE_CACHE_MAX).map(k => cache.delete(k)));
    }
}

async function cacheFirstImage(request) {
    const cache = await caches.open(IMAGE_CACHE);
    // caches.match cherche dans tous les caches (les dos de cartes sont dans celui de l'appli)
    const cached = await caches.match(request.url, { ignoreSearch: true });
    if (cached) return cached;
    try {
        // On redemande en CORS (raw.githubusercontent l'autorise) : une réponse "opaque"
        // compterait plusieurs Mo de quota par image dans le cache du navigateur.
        const sameOrigin = new URL(request.url).origin === self.location.origin;
        const response = await fetch(request.url, sameOrigin ? {} : { mode: 'cors' });
        if (response.ok) {
            cache.put(request.url, response.clone()).then(() => trimImageCache(cache));
        }
        return response;
    } catch (e) {
        return fetch(request);
    }
}

self.addEventListener('fetch', (event) => {
    const request = event.request;
    if (request.method !== 'GET') return;
    const url = new URL(request.url);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

    if (isImage(url)) {
        event.respondWith(cacheFirstImage(request));
        return;
    }
    if (url.origin === self.location.origin) {
        event.respondWith(networkFirst(request));
    }
    // Le reste (API MarvelCDB, polices…) passe directement par le réseau.
});
