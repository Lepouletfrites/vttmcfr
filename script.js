// --- VERSION DU JEU (Change ce numéro pour forcer le nettoyage du cache/localStorage chez les utilisateurs) ---
const GAME_VERSION = "6.3"; // Fix: le zoom d'une carte paysage a maintenant la même taille visuelle qu'en portrait

// --- DÉTECTION D'ENVIRONNEMENT ---
const isWebBrowser = false;

// --- BASE DE DONNÉES LOCALE DES CARTES ---
let localDatabase = {}; 

if (typeof CARDS_DATA !== 'undefined') {
    CARDS_DATA.forEach(card => {
        // Ajout de la carte principale (Face A ou Standard)
        localDatabase[card.code] = card;
        
        // On déballe les faces B cachées pour qu'elles soient trouvées hors-ligne !
        if (card.linked_card) {
            localDatabase[card.linked_card.code] = card.linked_card;
        }
    });
    console.log("✅ Base de données locale chargée ! (" + Object.keys(localDatabase).length + " cartes prêtes)");
} else {
    console.warn("⚠️ Attention: CARDS_DATA n'est pas défini. Vérifiez que cards.js est bien lié dans index.html.");
}

// --- CONFIGURATION & DOM CONSTANTS ---
const boardWrapper = document.getElementById('board-wrapper');
const board = document.getElementById('game-board');
const boardJetonToken = document.getElementById('board-jeton-token');

// Boutons du menu modal
const btnOpenMenu = document.getElementById('btn-open-menu');
const btnUndo = document.getElementById('btn-undo'); 
const modalMenu = document.getElementById('modal-menu');
const modalMenuClose = document.getElementById('modal-menu-close');
const btnAddNemesis = document.getElementById('btn-add-nemesis');
const btnResetGame = document.getElementById('btn-reset-game');
const btnSaveGame = document.getElementById('btn-save-game'); 

// Nouveaux éléments du Menu Principal
const btnLoadCustomDeck = document.getElementById('btn-load-custom-deck');
const deckUrlInput = document.getElementById('deck-url-input');
const villainSearchInput = document.getElementById('villain-search');
const villainPicker = document.getElementById('villain-picker');
let selectedVillainId = null;
const difficultySelect = document.getElementById('difficulty-select');
const btnLoadVillain = document.getElementById('btn-load-villain');
const cardSearchInput = document.getElementById('card-search-input');
const cardSearchResults = document.getElementById('card-search-results');

// Piles et zones
const deckElement = document.getElementById('deck');
const deckCountText = document.getElementById('deck-count');
const handArea = document.getElementById('hand-area');
const discardCountText = document.getElementById('discard-count');
const encounterDeckElement = document.getElementById('encounter-deck');
const encounterDeckCountText = document.getElementById('encounter-deck-count');
const encounterDiscardCountText = document.getElementById('encounter-discard-count');

// Panneau d'inspection (Image uniquement)
const floatingZoom = document.getElementById('floating-zoom');
const zoomImg = document.getElementById('zoom-img');

// Menus contextuels
const contextMenu = document.getElementById('context-menu');
const pileContextMenu = document.getElementById('pile-context-menu');
const modalInspect = document.getElementById('modal-inspect');
const modalTitle = document.getElementById('modal-title');
const modalCardsContainer = document.getElementById('modal-cards-container');
const modalClose = document.getElementById('modal-close');

const menuNextScheme = document.getElementById('menu-next-scheme');
const menuNextVillain = document.getElementById('menu-next-villain');
const menuSetActiveScheme = document.getElementById('menu-set-active-scheme');
const menuProgressionSeparator = document.getElementById('menu-progression-separator');

// --- BOUTONS ADDITIONNELS ---
const menuPileShuffleIntoDeck = document.createElement('div');
menuPileShuffleIntoDeck.className = 'menu-item';
menuPileShuffleIntoDeck.id = 'menu-pile-shuffle-into-deck';
menuPileShuffleIntoDeck.innerText = 'Remélanger dans la pioche';
pileContextMenu.appendChild(menuPileShuffleIntoDeck);

const menuBanish = document.createElement('div');
menuBanish.className = 'menu-item menu-item-danger';
menuBanish.id = 'menu-banish';
menuBanish.innerText = 'Bannir la carte';
contextMenu.appendChild(menuBanish);

// Ajout des boutons pour l'Accélération
const menuAddAccel = document.getElementById('menu-add-accel');
const menuSubAccel = document.getElementById('menu-sub-accel');

menuAddAccel.addEventListener('click', () => {
    if (targetCard) {
        targetCard.dataset.acceleration = (parseInt(targetCard.dataset.acceleration) || 0) + 1;
        syncTokenVisuals(targetCard);
        saveGameState();
    }
    hideAllMenus();
});

menuSubAccel.addEventListener('click', () => {
    if (targetCard) {
        targetCard.dataset.acceleration = Math.max(0, (parseInt(targetCard.dataset.acceleration) || 0) - 1);
        syncTokenVisuals(targetCard);
        saveGameState();
    }
    hideAllMenus();
});

// --- HÉROS ET PHASES DE JEU ---
const heroTracker = document.getElementById('hero-tracker');
const heroHpInput = document.getElementById('hero-hp-input');
const heroHandSizeSpan = document.getElementById('hero-hand-size');

const phases = document.querySelectorAll('#phase-list li');
let currentPhaseIndex = 0;
let currentHeroId = null;
let resetInProgress = false; 

// Stockage dynamique de la némésis et obligation du héros en cours
window.currentHeroNemesis = { obligation: null, set: [] };

// --- GESTION DU SCÉNARIO ---
let currentVillainStages = [];
let currentVillainStageIndex = 0;
let currentVillainSchemes = [];
let currentSchemeIndex = 0;

// Scénarios "deck de méchants" (ex: Murlocks) : un seul méchant à la fois, tiré au hasard
// parmi villainDef.villain_deck ; "carte suivante" pioche le méchant suivant du deck mélangé
// au lieu d'avancer vers une "étape 2" classique. En expert, on affiche la face B du méchant
// courant (texte/stats plus difficiles) plutôt qu'une carte "étape 2" distincte.
let currentVillainIsDeck = false;
let currentVillainDeckExpert = false;

// --- GESTION DES JETONS ---
let activeTokenType = null;
let activeTokenAction = null; 

// --- GESTION DES DECKS SECONDAIRES & HORS-JEU ---
let heroSecDeck = [];
let heroSecDiscard = [];
let heroSecCodes = []; 

let villainSecDecks = [[], [], []];
let villainSecDiscards = [[], [], []];
let villainSecCodes = [[], [], []]; 
let vSecCount = 0;

let setAsideCards = []; // Cartes de côté (Némésis, Stades suivants...)
let banishedCards = []; // Cartes bannies

const CARD_BACKS = { player: 'assets/player_back.jpg', encounter: 'assets/encounter_back.jpg' };
const CARD_BACKS_FALLBACK = {
    player: 'https://placehold.co/300x420/2980b9/FFF?text=MARVEL+CHAMPIONS',
    encounter: 'https://placehold.co/300x420/c0392b/FFF?text=RENCONTRE'
};

// --- ÉTAT DU JEU ET HISTORIQUE (UNDO) ---
let topZIndex = 10;
let myDeck = [], discardPile = [];
let encounterDeck = [], encounterDiscardPile = [];
let targetCard = null, targetPileType = null;
let globalCardDragActive = false; // true pendant qu'une carte est activement déplacée (désactive l'aperçu au survol)
let hoveredCard = null; // dernière carte survolée (souris) — cible des raccourcis clavier E/F
const CENTER_X = 2000, CENTER_Y = 2000;
let scale = 1;
let boardX = -CENTER_X + window.innerWidth / 2;
let boardY = -CENTER_Y + window.innerHeight / 2;

let stateHistory = [];
let isUndoing = false;

updateCamera();

// --- GESTION DE L'HISTORIQUE ---
function updateUndoButton() {
    if (btnUndo) {
        const steps = stateHistory.length - 1;
        if (steps > 0) {
            btnUndo.innerText = `↩️ Annuler (${steps})`;
            btnUndo.classList.remove('hidden');
        } else {
            btnUndo.classList.add('hidden');
        }
    }
}

function undo() {
    if (stateHistory.length <= 1) return;
    isUndoing = true;

    // Capture les positions actuelles des cartes (par identifiant stable) pour pouvoir
    // les animer visuellement vers leur position d'avant, une fois l'état précédent rechargé.
    const prevRects = new Map();
    document.querySelectorAll('.card[data-instance-id]').forEach(card => {
        if (card.classList.contains('in-hand')) return; // la main est un flux, pas de position à animer
        prevRects.set(card.dataset.instanceId, card.getBoundingClientRect());
    });

    stateHistory.pop();
    const prevStateString = stateHistory[stateHistory.length - 1];

    localStorage.setItem('marvelVTT_save', prevStateString);
    loadGameState();

    // Remise à jour de l'état critique indépendante du rendu (voir ci-dessous) : si l'onglet
    // est en arrière-plan, requestAnimationFrame peut ne jamais se déclencher, et on ne veut
    // surtout pas que ça bloque isUndoing à `true` pour toujours.
    updateUndoButton();
    setTimeout(() => { isUndoing = false; }, 100);

    // Animation "snap-back" (purement cosmétique) : si l'onglet n'est pas visible/rendu,
    // elle ne jouera simplement pas, sans impact sur le fonctionnement de l'undo lui-même.
    requestAnimationFrame(() => {
        document.querySelectorAll('.card[data-instance-id]').forEach(card => {
            if (card.classList.contains('in-hand')) return;

            const oldRect = prevRects.get(card.dataset.instanceId);
            if (!oldRect) {
                // Carte réapparue (ex: une défausse annulée) : un flash rapide attire l'oeil dessus.
                card.classList.add('card-just-restored');
                setTimeout(() => card.classList.remove('card-just-restored'), 500);
                return;
            }

            const newRect = card.getBoundingClientRect();
            // Les rects sont en pixels écran (post-zoom) ; la translation qu'on applique est, elle,
            // dans le repère local de la carte (avant le scale du plateau) : il faut donc diviser par scale.
            const dx = (oldRect.left - newRect.left) / scale;
            const dy = (oldRect.top - newRect.top) / scale;
            if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;

            const isExhausted = card.classList.contains('exhausted');
            const restTransform = isExhausted ? 'rotate(90deg)' : '';

            card.style.transform = `translate(${dx}px, ${dy}px) ${restTransform}`;

            requestAnimationFrame(() => {
                card.style.transition = 'transform 0.4s cubic-bezier(.2,.8,.2,1)';
                card.style.transform = restTransform;
                card.addEventListener('transitionend', () => {
                    card.style.transition = '';
                    card.style.transform = '';
                }, { once: true });
            });
        });
    });
}

if (btnUndo) {
    btnUndo.addEventListener('click', undo);
}

btnOpenMenu.addEventListener('click', () => modalMenu.classList.remove('hidden'));
modalMenuClose.addEventListener('click', () => modalMenu.classList.add('hidden'));

// Fermer les modales en cliquant à l'extérieur
document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.add('hidden');
    });
    modal.addEventListener('touchstart', (e) => {
        if (e.target === modal) modal.classList.add('hidden');
    });
});

if (btnSaveGame) {
    btnSaveGame.addEventListener('click', () => {
        saveGameState();
        alert("💾 Partie sauvegardée avec succès !");
    });
}

btnResetGame.addEventListener('click', () => {
    if(confirm("Êtes-vous sûr de vouloir tout effacer et recommencer la partie ?")) {
        resetInProgress = true; 
        localStorage.removeItem('marvelVTT_save');
        location.reload();
    }
});

// ==========================================
// 1. INITIALISATION DES MENUS VIA LA BASE DE DONNÉES
// ==========================================
function initMenus() {
    if (typeof MARVEL_DB === 'undefined') return;

    renderVillainPicker();
    renderSavedDecks();

    const modularList = document.getElementById('modular-list');
    if (modularList) {
        let html = `<label class="modular-option modular-option-default">
            <input type="checkbox" id="mod-default-checkbox" checked>
            <b>Par défaut (défini par le Méchant)</b>
        </label>
        <div class="modular-separator"></div>`;

        MARVEL_DB.modulars.forEach(m => {
            if (m.card_set_code || (m.cards && m.cards.length > 0)) {
                html += `<label class="modular-option">
                    <input type="checkbox" class="mod-checkbox" value="${m.id}">
                    ${m.name}
                </label>`;
            }
        });
        modularList.innerHTML = html;
    }
}

// --- PICKER VISUEL DE MÉCHANTS ---
async function renderVillainPicker() {
    if (typeof MARVEL_DB === 'undefined' || !villainPicker) return;

    const list = MARVEL_DB.villains.filter(v =>
        v.card_set_code ||
        (v.stages && v.stages.length > 0) ||
        (v.villain_deck && v.villain_deck.length > 0) ||
        (v.multi_villains && v.multi_villains.length > 0)
    );
    if (list.length === 0) {
        villainPicker.innerHTML = '<div class="villain-picker-empty">Aucun méchant disponible.</div>';
        return;
    }

    const tilesData = await Promise.all(list.map(async v => {
        let thumbUrl = null;
        // Ordre de repli pour la vignette : étape classique, puis premier méchant d'un deck
        // aléatoire (villain_deck), puis premier méchant d'un scénario multi-méchants
        // (multi_villains) — comme ça on voit tout de suite de quel scénario il s'agit.
        const stageCode = (v.stages && v.stages[0])
            || (v.villain_deck && v.villain_deck[0])
            || (v.multi_villains && v.multi_villains[0] && v.multi_villains[0].stages && v.multi_villains[0].stages[0]);
        if (stageCode) {
            const cardData = await fetchAPI(stageCode.replace(/[ab]$/, '')) || await fetchAPI(stageCode);
            if (cardData) thumbUrl = getImageUrl(cardData);
        }
        return { v, thumbUrl };
    }));

    villainPicker.innerHTML = tilesData.map(({ v, thumbUrl }) => `
        <div class="villain-tile" data-villain-id="${v.id}" data-name="${v.name.toLowerCase()}">
            ${thumbUrl
                ? `<img class="villain-tile-thumb" src="${thumbUrl}" loading="lazy" alt="${v.name}" onerror="this.outerHTML='<div class=villain-tile-thumb>🦹</div>'">`
                : `<div class="villain-tile-thumb">🦹</div>`}
            <div class="villain-tile-name">${v.name}</div>
        </div>
    `).join('');

    villainPicker.querySelectorAll('.villain-tile').forEach(tile => {
        tile.addEventListener('click', () => {
            selectedVillainId = tile.dataset.villainId;
            villainPicker.querySelectorAll('.villain-tile').forEach(t => t.classList.remove('selected'));
            tile.classList.add('selected');
        });
        if (tile.dataset.villainId === selectedVillainId) tile.classList.add('selected');
    });

    filterVillainPicker();
}

function filterVillainPicker() {
    if (!villainPicker || !villainSearchInput) return;
    const q = villainSearchInput.value.trim().toLowerCase();
    villainPicker.querySelectorAll('.villain-tile').forEach(tile => {
        tile.classList.toggle('hidden', !tile.dataset.name.includes(q));
    });
}

if (villainSearchInput) {
    villainSearchInput.addEventListener('input', filterVillainPicker);
}

// --- RECHERCHE DE CARTE (AJOUT MANUEL EN JEU) ---
// N'affiche des résultats qu'à partir de 3 lettres pour éviter de générer des milliers
// de vignettes d'un coup (la base locale contient plusieurs milliers de cartes).
const CARD_SEARCH_MIN_LENGTH = 3;
const CARD_SEARCH_MAX_RESULTS = 60;
let cardSearchDebounce = null;

function runCardSearch() {
    if (!cardSearchResults) return;
    const q = cardSearchInput.value.trim().toLowerCase();

    if (q.length < CARD_SEARCH_MIN_LENGTH) {
        cardSearchResults.innerHTML = '';
        cardSearchResults.classList.add('hidden');
        return;
    }

    const matches = Object.values(localDatabase).filter(c =>
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.real_name && c.real_name.toLowerCase().includes(q))
    ).slice(0, CARD_SEARCH_MAX_RESULTS);

    cardSearchResults.classList.remove('hidden');

    if (matches.length === 0) {
        cardSearchResults.innerHTML = '<div class="villain-picker-empty">Aucune carte trouvée.</div>';
        return;
    }

    cardSearchResults.innerHTML = matches.map(c => `
        <div class="villain-tile" data-code="${c.code}" title="${c.name}">
            <img class="villain-tile-thumb" src="${getImageUrl(c)}" loading="lazy" alt="${c.name}" onerror="this.outerHTML='<div class=villain-tile-thumb>🃏</div>'">
            <div class="villain-tile-name">${c.name}</div>
        </div>
    `).join('');

    cardSearchResults.querySelectorAll('.villain-tile').forEach(tile => {
        tile.addEventListener('click', () => addCardToGameByCode(tile.dataset.code));
    });
}

async function addCardToGameByCode(code) {
    const data = await fetchAPI(code);
    if (!data) return;

    const dom = buildCardDOM(data);
    modalMenu.classList.add('hidden'); // ferme le menu pour voir la carte apparaître sur le plateau

    const rect = boardWrapper.getBoundingClientRect();
    const offsetX = (Math.random() * 60 - 30);
    const offsetY = (Math.random() * 60 - 30);
    const spawnX = (rect.width / 2 - boardX + offsetX) / scale;
    const spawnY = (rect.height / 2 - boardY + offsetY) / scale;

    putOnBoardAt(dom, spawnX, spawnY, false);
    saveGameState();
}

if (cardSearchInput) {
    cardSearchInput.addEventListener('input', () => {
        clearTimeout(cardSearchDebounce);
        cardSearchDebounce = setTimeout(runCardSearch, 150);
    });
}

// ==========================================
// 2. FONCTIONS DE TÉLÉCHARGEMENT DE CARTE (100% LOCAL)
// ==========================================
// Cache des résolutions de cartes : évite de refaire la recherche/recursion à chaque
// appel (l'inspection d'une pile ou l'ouverture du picker de méchants peut en déclencher des dizaines).
const fetchAPICache = new Map();

async function fetchAPI(cardCode) {
    if (!localDatabase) return null;
    if (fetchAPICache.has(cardCode)) return fetchAPICache.get(cardCode);

    // 1. Recherche exacte
    let cardData = localDatabase[cardCode];

    // 2. Recherche intelligente si la lettre diffère (ex: 16061 vs 16061a)
    if (!cardData) {
        if (cardCode.endsWith('a')) {
            cardData = localDatabase[cardCode.slice(0, -1)]; // on demande 1a, on trouve 1
        } else if (!cardCode.endsWith('b') && !cardCode.endsWith('c')) {
            cardData = localDatabase[cardCode + 'a']; // on demande 1, on trouve 1a
        }
    }

    // 3. Si la carte est totalement introuvable avec son code
    if (!cardData) {
        console.warn(`Carte introuvable en local : ${cardCode}`);
        fetchAPICache.set(cardCode, null);
        return null;
    }

    // 4. Gestion des réimpressions / alt-arts (duplicate_of_code) en local
    // On force systématiquement la résolution vers la carte d'origine : les réimpressions
    // partagent le même visuel/texte mais ne sont pas toujours illustrées dans notre base d'images.
    if (cardData.duplicate_of_code) {
        const resolved = await fetchAPI(cardData.duplicate_of_code);
        fetchAPICache.set(cardCode, resolved);
        return resolved;
    }

    // La carte est trouvée et valide, on la retourne directement !
    fetchAPICache.set(cardCode, cardData);
    return cardData;
}

// Cache des URLs d'image déjà calculées (évite de refaire la résolution de réimpression
// et la concaténation de chaîne à chaque re-rendu/synchronisation de carte).
const imageUrlCache = new Map();

function getImageUrl(cardData) {
    if (!cardData) return '';

    // Réimpressions / alt-arts : on force la résolution vers la carte d'origine, car les
    // réimpressions n'ont pas toujours leur propre visuel dans la base d'images.
    if (cardData.duplicate_of_code && typeof localDatabase !== 'undefined' && localDatabase[cardData.duplicate_of_code]) {
        cardData = localDatabase[cardData.duplicate_of_code];
    }

    if (imageUrlCache.has(cardData.code)) return imageUrlCache.get(cardData.code);

    let code = cardData.code;
    let imageCode = code;
    
    if (cardData.type_code === 'main_scheme' && !code.endsWith('a') && !code.endsWith('b')) {
        imageCode = code + 'a';
    }

    let packName = cardData.pack_code || cardData.pack_name || 'Sans Pack';
    let octgnId = cardData.octgn_id || imageCode; 
    
    let localFileName = octgnId;
    
    if (code.endsWith('b')) {
        localFileName += '.b'; 
    } else if (code.endsWith('c')) {
        localFileName += '.c';
    }

    // --- DÉTECTION AUTOMATIQUE : Local vs En ligne ---
    const isLocal = window.location.protocol === 'file:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    const url = isLocal
        // 1. Si tu lances le fichier index.html directement depuis ton PC
        ? `ImageFr/${packName}/${localFileName}.jpg`
        // 2. Si tu es sur GitHub Pages (En ligne)
        : `https://raw.githubusercontent.com/Lepouletfrites/vttmcfr-images/main/ImageFr/${packName}/${localFileName}.jpg`;

    imageUrlCache.set(cardData.code, url);
    return url;
}

// ==========================================
// 3. GÉNÉRATION DES PARTIES
// ==========================================

function buildDeckFromSetCode(setCode, excludeList = []) {
    let deck = [];
    Object.values(localDatabase).forEach(card => {
        if (card.card_set_code === setCode && !excludeList.includes(card.code)) {
            // On exclut les méchants et manigances principales par sécurité
            if (!['villain', 'main_scheme'].includes(card.type_code)) {
                // Cas particulier (ex: Android Efficiency 01144) : certaines cartes ont une
                // entrée "résumé" sans illustration propre (pas d'octgn_id), dont la quantité
                // est déjà entièrement couverte par ses variantes a/b/c (copies physiques
                // réelles, chacune avec sa propre illustration). Sans ce filtre, la carte se
                // retrouve comptée en double dans le deck (résumé + variantes).
                const baseCode = card.code.replace(/[a-z]$/, '');
                const isBaseCode = baseCode === card.code;
                if (isBaseCode && !card.octgn_id) {
                    const coveredByVariants = ['a', 'b', 'c'].some(suffix => {
                        const variant = localDatabase[baseCode + suffix];
                        return variant && variant.octgn_id;
                    });
                    if (coveredByVariants) return;
                }

                for (let i = 0; i < (card.quantity || 1); i++) {
                    deck.push(card.code);
                }
            }
        }
    });
    return deck;
}

async function getBaseCardCode(code) {
    if (localDatabase && localDatabase[code] && localDatabase[code].duplicate_of_code) {
        return await getBaseCardCode(localDatabase[code].duplicate_of_code);
    }
    return code;
}

// ⚡ LECTURE DIRECTE SANS PROXY POUR LES DECKS (MARVELCDB L'AUTORISE DE BASE)
async function loadCustomDeckById(deckId) {
    btnLoadCustomDeck.disabled = true;
    btnLoadCustomDeck.innerText = "Chargement...";

    try {
        let deckData = null;
        const endpoints = [
            `https://marvelcdb.com/api/public/decklist/${deckId}.json`,
            `https://marvelcdb.com/api/public/deck/${deckId}.json`
        ];

        for (let url of endpoints) {
            try {
                // RETOUR À LA VERSION SIMPLE : MARVELCDB BLOQUAIT LE PROXY POUR LES DECKS
                let res = await fetch(url);
                if (res.ok) { deckData = await res.json(); break; }
            } catch (e) {}
        }

        if (!deckData || !deckData.slots) throw new Error("Deck introuvable");

        myDeck = [];
        for (const [code, quantity] of Object.entries(deckData.slots)) {
            let baseCode = await getBaseCardCode(code);
            for (let i = 0; i < quantity; i++) myDeck.push(baseCode);
        }

        const rawHeroCode = deckData.hero_code || deckData.investigator_code;
        const heroCode = await getBaseCardCode(rawHeroCode);

        let dbHeroId = null;
        let dbSecondaryDeck = null;
        let heroDisplayName = deckData.investigator_name || null;
        if (typeof MARVEL_DB !== 'undefined') {
            const match = MARVEL_DB.heroes.find(h => h.hero_code.replace(/[ab]$/,'') === heroCode.replace(/[ab]$/,''));
            if (match) {
                dbHeroId = match.id;
                dbSecondaryDeck = match.secondary_set_code ? buildDeckFromSetCode(match.secondary_set_code, match.start_on_board || []) : match.secondary_deck;
                heroDisplayName = match.name;
            }
        }

        await setupHero(heroCode, dbHeroId, dbSecondaryDeck);

        rememberDeck(deckId, deckData.name || heroDisplayName || `Deck #${deckId}`);

        btnLoadCustomDeck.disabled = false;
        btnLoadCustomDeck.innerText = "Charger via URL";
        modalMenu.classList.add('hidden');
        saveGameState();

    } catch (error) {
        alert("Erreur lors du chargement.");
        btnLoadCustomDeck.disabled = false;
        btnLoadCustomDeck.innerText = "Charger via URL";
    }
}

btnLoadCustomDeck.addEventListener('click', () => {
    const inputVal = deckUrlInput.value.trim();
    const urlMatch = inputVal.match(/(?:decklist|deck)\/(?:view|edit)?\/?(\d+)/);
    const fallbackMatch = inputVal.match(/\d+/);
    const deckId = urlMatch ? urlMatch[1] : (fallbackMatch ? fallbackMatch[0] : null);

    if (!deckId) { alert("Veuillez entrer une URL ou un ID valide (ex: 63906)."); return; }

    loadCustomDeckById(deckId);
});

// --- DECKS SAUVEGARDÉS (REJOUER UN DECK URL DÉJÀ CHARGÉ) ---
const SAVED_DECKS_KEY = 'marvelVTT_savedDecks';

function getSavedDecks() {
    try { return JSON.parse(localStorage.getItem(SAVED_DECKS_KEY)) || []; } catch (e) { return []; }
}

function persistSavedDecks(list) {
    localStorage.setItem(SAVED_DECKS_KEY, JSON.stringify(list));
}

function rememberDeck(deckId, name) {
    let list = getSavedDecks().filter(d => d.id !== deckId);
    list.unshift({ id: deckId, name: name || `Deck #${deckId}`, ts: Date.now() });
    if (list.length > 20) list = list.slice(0, 20);
    persistSavedDecks(list);
    renderSavedDecks();
}

function forgetDeck(deckId) {
    persistSavedDecks(getSavedDecks().filter(d => d.id !== deckId));
    renderSavedDecks();
}

function renderSavedDecks() {
    const wrap = document.getElementById('saved-decks-wrap');
    const list = document.getElementById('saved-decks-list');
    if (!wrap || !list) return;

    const decks = getSavedDecks();
    if (decks.length === 0) {
        wrap.classList.add('hidden');
        list.innerHTML = '';
        return;
    }

    wrap.classList.remove('hidden');
    list.innerHTML = decks.map(d => `
        <div class="saved-deck-item">
            <div class="saved-deck-info">
                <span class="saved-deck-name">${d.name}</span>
                <span class="saved-deck-meta">ID ${d.id} · ${new Date(d.ts).toLocaleDateString()}</span>
            </div>
            <button class="saved-deck-load" data-deck-id="${d.id}">▶ Charger</button>
            <button class="saved-deck-delete" data-deck-id="${d.id}" title="Supprimer">🗑</button>
        </div>
    `).join('');

    list.querySelectorAll('.saved-deck-load').forEach(btn => {
        btn.addEventListener('click', () => loadCustomDeckById(btn.dataset.deckId));
    });
    list.querySelectorAll('.saved-deck-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            forgetDeck(btn.dataset.deckId);
        });
    });
}

async function setupHero(heroBaseCode, dbHeroId, secondaryDeckData = null) {
    let coreCode = heroBaseCode.replace(/[ab]$/, '');
    
    let frontData = await fetchAPI(coreCode + 'a') || await fetchAPI(coreCode);
    let backData = await fetchAPI(coreCode + 'b');
    
    let startFace = backData || frontData; 
    let altFace = frontData;               
    
    currentHeroId = dbHeroId; 
    setAsideCards = []; 
    banishedCards = [];

    window.currentHeroNemesis = { obligation: null, set: [] };
    if (frontData && frontData.card_set_code) {
        let heroSetCode = frontData.card_set_code;
        Object.values(localDatabase).forEach(card => {
            if (card.card_set_code === heroSetCode && card.type_code === 'obligation') {
                window.currentHeroNemesis.obligation = card.code;
                setAsideCards.push(card.code); 
            }
            if (card.card_set_code === heroSetCode + '_nemesis') {
                for (let i = 0; i < (card.quantity || 1); i++) {
                    window.currentHeroNemesis.set.push(card.code);
                    setAsideCards.push(card.code); 
                }
            }
        });
    }

    const indicesToRemove = [coreCode, coreCode + 'a', coreCode + 'b'];
    indicesToRemove.forEach(code => {
        let index;
        while ((index = myDeck.indexOf(code)) !== -1) {
            myDeck.splice(index, 1);
        }
    });
    
    let heroDOM = buildCardDOM(startFace, altFace ? getImageUrl(altFace) : null);
    
    heroDOM.dataset.cardDataA = JSON.stringify(startFace);
    if (altFace) heroDOM.dataset.cardDataB = JSON.stringify(altFace);
    
    heroDOM.id = 'hero-card-element';
    heroDOM.dataset.handSizeA = startFace.hand_size || 5;
    heroDOM.dataset.handSizeB = altFace ? (altFace.hand_size || 6) : 6;
    
    const spawnX = CENTER_X;
    const spawnY = CENTER_Y + 400; 
    
    putOnBoardAt(heroDOM, spawnX, spawnY, false);

    heroTracker.classList.remove('hidden');
    heroHandSizeSpan.innerText = heroDOM.dataset.handSizeA;
    
    if (currentHeroId) {
        const heroDef = MARVEL_DB.heroes.find(h => h.id === currentHeroId);
        if (heroDef && heroDef.start_on_board) {
            for (let code of heroDef.start_on_board) {
                // Si la carte est dans le deck du héros, on la retire de la pioche
                let idx = myDeck.indexOf(code);
                if (idx !== -1) {
                    myDeck.splice(idx, 1);
                }
                
                // On va chercher la carte dans cards.js et on la pose TOUJOURS sur le plateau
                let cardData = await fetchAPI(code);
                if (cardData) {
                    let cardDom = buildCardDOM(cardData);
                    putOnBoardAt(cardDom, spawnX + 160 + (Math.random() * 40), spawnY + (Math.random() * 40 - 20), false);
                }
            }
        }
    } // <--- C'était cette accolade fermante en trop qui coupait la fonction !

    if (secondaryDeckData) {
        heroSecDeck = [...secondaryDeckData];
        heroSecCodes = [...secondaryDeckData]; 
        shuffleArray(heroSecDeck);
        let hd = document.getElementById('board-hero-deck');
        let hdd = document.getElementById('board-hero-discard');
        hd.classList.remove('hidden');
        hdd.classList.remove('hidden');
        hd.style.left = (spawnX + 300) + "px"; 
        hd.style.top = (spawnY) + "px";
        hd.style.left = (spawnX + 440) + "px";
        hd.style.top = (spawnY) + "px";
    }

    if (btnAddNemesis && window.currentHeroNemesis.set.length > 0) {
        btnAddNemesis.classList.remove('hidden');
    }
    
    shuffleArray(myDeck);
    deckElement.classList.remove('hidden');
    updateDeckCounters();

    await drawToHandSize();
}

if (btnAddNemesis) {
    btnAddNemesis.addEventListener('click', async () => {
        if (!window.currentHeroNemesis || window.currentHeroNemesis.set.length === 0) return;

        btnAddNemesis.innerText = "Recherche...";
        btnAddNemesis.disabled = true;

        try {
            const spawnX = CENTER_X;
            const spawnY = CENTER_Y;

            if (window.currentHeroNemesis.obligation) {
                encounterDeck.push(window.currentHeroNemesis.obligation);
                let oblIdx = setAsideCards.indexOf(window.currentHeroNemesis.obligation);
                if (oblIdx !== -1) setAsideCards.splice(oblIdx, 1);
            }

            let minionDeployed = false, schemeDeployed = false;

            for (let code of window.currentHeroNemesis.set) {
                let idx = setAsideCards.indexOf(code);
                if (idx !== -1) setAsideCards.splice(idx, 1);

                const cardData = await fetchAPI(code);
                if (!cardData) continue;

                if ((cardData.type_code === 'side_scheme' && !schemeDeployed) || (cardData.type_code === 'minion' && !minionDeployed)) {
                    if (cardData.type_code === 'side_scheme') schemeDeployed = true;
                    if (cardData.type_code === 'minion') minionDeployed = true;

                    const dom = buildCardDOM(cardData);
                    putOnBoardAt(dom, spawnX + (Math.random() * 100 - 50), spawnY + (Math.random() * 100 - 50), false);
                } else {
                    encounterDeck.push(cardData.code); 
                }
            }
            
            shuffleArray(encounterDeck);
            updateDeckCounters();
            encounterDeckElement.classList.remove('hidden'); 
            btnAddNemesis.classList.add('hidden'); 
            saveGameState();
        } catch (e) {
            alert("Erreur lors de l'ajout de la Némésis.");
        } finally {
            btnAddNemesis.innerText = "😈 Ajouter Némésis";
            btnAddNemesis.disabled = false;
        }
    });
}

// Retire toutes les cartes RENCONTRE / MÉCHANT actuellement en jeu et remet à zéro l'état
// du scénario. Nécessaire si on redéploie un scénario sans repasser par "Réinitialiser" :
// sans ça, les anciennes cartes restent sur le plateau (ex: deux #main-scheme-element en
// double), et la nouvelle manigance principale se retrouve invisible ou avec la mauvaise menace
// car document.getElementById() ne retrouve que la première occurrence (l'ancienne, périmée).
function clearScenarioBoard() {
    document.querySelectorAll('.card').forEach(card => {
        if (card.dataset.faction === 'encounter' || card.dataset.faction === 'villain') {
            card.remove();
        }
    });

    for (let i = 0; i < 3; i++) {
        const vd = document.getElementById('board-villain-deck-' + i);
        const vdd = document.getElementById('board-villain-discard-' + i);
        if (vd) vd.classList.add('hidden');
        if (vdd) vdd.classList.add('hidden');
    }

    boardJetonToken.classList.add('hidden');

    encounterDeck = [];
    encounterDiscardPile = [];
    villainSecDecks = [[], [], []];
    villainSecDiscards = [[], [], []];
    villainSecCodes = [[], [], []];
    vSecCount = 0;
    setAsideCards = [];
    banishedCards = [];
}

// Construit la carte DOM d'un méchant de "villain_deck". En expert, affiche directement la
// face B (stats plus difficiles) au lieu de la face imprimée, comme schemes_start_flipped
// le fait déjà pour les manigances principales à double face.
async function buildVillainDeckStageDOM(code) {
    const baseCode = code.replace(/[ab]$/, '');

    if (currentVillainDeckExpert) {
        const backData = await fetchAPI(baseCode + 'b');
        if (backData) {
            const frontData = await fetchAPI(baseCode + 'a') || await fetchAPI(baseCode);
            const vDom = buildCardDOM(frontData || backData, getImageUrl(backData));
            if (frontData) vDom.dataset.cardDataA = JSON.stringify(frontData);
            vDom.dataset.cardDataB = JSON.stringify(backData);
            if (backData.health !== undefined) vDom.dataset.damage = backData.health;
            return { dom: vDom, flipped: true };
        }
    }

    const vData = await fetchAPI(code) || await fetchAPI(baseCode);
    return { dom: vData ? buildCardDOM(vData) : null, flipped: false };
}

btnLoadVillain.addEventListener('click', async () => {
    const vId = selectedVillainId;

    const stdDiff = document.querySelector('input[name="diff-std"]:checked').value;
    const expDiff = document.querySelector('input[name="diff-exp"]:checked').value;
    const isExpert = (expDiff !== 'none');

    if (!vId) { alert("Veuillez sélectionner un méchant."); return; }
    modalMenu.classList.add('hidden');
    clearScenarioBoard();

    const villainDef = MARVEL_DB.villains.find(v => v.id === vId);

    // Scénarios multi-méchants (ex: Avengers Tower) : plusieurs méchants indépendants posés en
    // même temps sur le plateau, chacun avec ses propres étapes qu'on avance séparément. Leur
    // progression est stockée directement sur chaque carte (dataset.multiVillainStages/-StageIndex)
    // plutôt que dans les variables globales currentVillainStages, réservées à UN méchant à la fois.
    const isMultiVillain = !!(villainDef.multi_villains && villainDef.multi_villains.length > 0);

    currentVillainIsDeck = !isMultiVillain && !!(villainDef.villain_deck && villainDef.villain_deck.length > 0);
    currentVillainDeckExpert = currentVillainIsDeck && isExpert;

    if (isMultiVillain) {
        currentVillainStages = [];
        currentVillainStageIndex = 0;
    } else if (currentVillainIsDeck) {
        // Mélange le deck de méchants : chaque partie tire un méchant différent au hasard.
        // Toujours index 0 (pas de "stage 2" distincte) ; l'expert se joue via la face B.
        currentVillainStages = [...villainDef.villain_deck];
        shuffleArray(currentVillainStages);
        currentVillainStageIndex = 0;
    } else {
        currentVillainStages = villainDef.stages || [];
        currentVillainStageIndex = isExpert ? 1 : 0;
    }
    currentVillainSchemes = villainDef.schemes || [];
    currentSchemeIndex = 0;

    currentVillainStages.forEach(code => {
        if (code !== currentVillainStages[currentVillainStageIndex]) setAsideCards.push(code);
    });
    currentVillainSchemes.forEach(code => {
        if (code !== currentVillainSchemes[0]) {
            setAsideCards.push(code);
        }
    });

    const spawnX = CENTER_X;
    const spawnY = CENTER_Y - 400;

    // --- CHARGEMENT DU/DES MÉCHANT(S) ---
    if (isMultiVillain) {
        const spacing = 300;
        const startX = spawnX - (spacing * (villainDef.multi_villains.length - 1)) / 2;

        for (let i = 0; i < villainDef.multi_villains.length; i++) {
            const mv = villainDef.multi_villains[i];
            const stages = mv.stages || [];
            const stageIdx = isExpert ? Math.min(1, stages.length - 1) : 0;

            stages.forEach(code => {
                if (code !== stages[stageIdx]) setAsideCards.push(code);
            });

            if (stages.length > stageIdx) {
                const vCode = stages[stageIdx];
                const vData = await fetchAPI(vCode) || await fetchAPI(vCode.replace(/[ab]$/, ''));
                if (vData) {
                    const vDom = buildCardDOM(vData);
                    vDom.dataset.multiVillainStages = JSON.stringify(stages);
                    vDom.dataset.multiVillainStageIndex = stageIdx;
                    if (mv.name) vDom.dataset.multiVillainName = mv.name;
                    putOnBoardAt(vDom, startX + i * spacing, spawnY, false);
                }
            }
        }
    } else if (currentVillainStages.length > currentVillainStageIndex) {
        let vCode = currentVillainStages[currentVillainStageIndex];
        let { dom: vDom, flipped } = await buildVillainDeckStageDOM(vCode);
        if (vDom) putOnBoardAt(vDom, spawnX, spawnY, flipped);
    }

    // --- CHARGEMENT DE LA MANIGANCE PRINCIPALE ---
    if (currentVillainSchemes.length > 0) {
        let rawCode = currentVillainSchemes[0];
        let baseCode = rawCode.replace(/[ab]$/, '');
        
        let frontData = await fetchAPI(rawCode) || await fetchAPI(baseCode + 'a') || await fetchAPI(baseCode); 
        let backData = await fetchAPI(baseCode + 'b'); 
        
        if (frontData) {
            let sDom = buildCardDOM(frontData, backData ? getImageUrl(backData) : null);
            sDom.dataset.cardDataA = JSON.stringify(frontData);
            if (backData) sDom.dataset.cardDataB = JSON.stringify(backData);
            sDom.id = `main-scheme-element`;

            // Certains scénarios démarrent avec la manigance principale déjà révélée (face B) :
            // la face A n'est que le texte de mise en place (pas de menace), tout de suite
            // retournée pour la partie. putOnBoardAt(..., true) l'affiche face B et pose
            // dataset.flipped="true" ; on force ensuite la menace de départ sur celle de la face B.
            const startFlipped = !!(villainDef.schemes_start_flipped && backData);
            if (startFlipped) {
                sDom.dataset.threat = backData.base_threat !== undefined ? backData.base_threat : 0;
            }

            putOnBoardAt(sDom, spawnX - 250, spawnY, startFlipped);
        }
    }

    // --- JETON DE SCÉNARIO ---
    // Marqueur libre optionnel (ex: pour pointer quel méchant est actif dans un scénario
    // multi-méchants, ou toute autre indication propre au scénario) ; le joueur le déplace
    // lui-même à la souris/au doigt, rien n'est automatique une fois posé.
    if (villainDef.jeton === true) {
        boardJetonToken.style.left = (spawnX + 200) + 'px';
        boardJetonToken.style.top = (spawnY - 80) + 'px';
        boardJetonToken.style.zIndex = topZIndex++;
        boardJetonToken.classList.remove('hidden');
    }

    vSecCount = 0;
    villainSecDecks = [[], [], []];
    villainSecDiscards = [[], [], []];
    villainSecCodes = [[], [], []]; 
    
    function deployVillainSecDeck(deckArray, title) {
        if (vSecCount >= 3) return; 
        villainSecDecks[vSecCount] = [...deckArray];
        villainSecCodes[vSecCount] = [...deckArray]; 
        shuffleArray(villainSecDecks[vSecCount]);
        
        let vd = document.getElementById('board-villain-deck-' + vSecCount);
        let vdd = document.getElementById('board-villain-discard-' + vSecCount);
        vd.classList.remove('hidden');
        vdd.classList.remove('hidden');
        
        vd.style.left = (spawnX + 300 + (vSecCount * 150)) + "px";
        vd.style.top = (spawnY) + "px";
        vdd.style.left = (spawnX + 300 + (vSecCount * 150)) + "px";
        vdd.style.top = (spawnY + 180) + "px";
        
        if (title) vd.innerHTML = `${title}<br><span id="board-villain-deck-count-${vSecCount}">0</span>`;
        vSecCount++;
    }

    encounterDeck = [];
    let villainCardsToSpawn = [...(villainDef.start_on_board || [])];
    let cardsToSetAside = [...(villainDef.start_set_aside || [])];
    let excludedEncounterCodes = [];

    // 1. Deck Secondaire du Méchant Principal
    let vSecDeck = null;
    if (villainDef.secondary_set_code) vSecDeck = buildDeckFromSetCode(villainDef.secondary_set_code, villainCardsToSpawn);
    else if (villainDef.secondary_deck) vSecDeck = villainDef.secondary_deck;

    if (vSecDeck && vSecDeck.length > 0) {
        deployVillainSecDeck(vSecDeck, "DECK<br>SPÉCIAL");
        excludedEncounterCodes.push(...vSecDeck);
    }

    // 2. Préparation des Sets Modulaires
    const useDefaultMod = document.getElementById('mod-default-checkbox').checked;
    const selectedMods = Array.from(document.querySelectorAll('.mod-checkbox:checked')).map(cb => cb.value);
    
    let modularsToLoad = new Set(selectedMods);
    
    if (villainDef.mandatory_modulars) {
        villainDef.mandatory_modulars.forEach(modId => modularsToLoad.add(modId));
    }

    if (useDefaultMod && villainDef.default_modulars) {
        villainDef.default_modulars.forEach(modId => modularsToLoad.add(modId));
    }

    modularsToLoad.forEach(mId => {
        let mDef = MARVEL_DB.modulars.find(m => m.id === mId);
        if (mDef) {
            let mSecDeck = null;
            if (mDef.secondary_set_code) mSecDeck = buildDeckFromSetCode(mDef.secondary_set_code, mDef.start_on_board || []);
            else if (mDef.secondary_deck) mSecDeck = mDef.secondary_deck;
            
            if (mSecDeck && mSecDeck.length > 0) {
                excludedEncounterCodes.push(...mSecDeck);
                mDef.resolved_secondary_deck = mSecDeck; 
            }
        }
    });

    if (villainDef.card_set_code) {
        Object.values(localDatabase).forEach(card => {
            if (card.card_set_code === villainDef.card_set_code && !['villain', 'main_scheme'].includes(card.type_code)) {
                if (!excludedEncounterCodes.includes(card.code)) {
                    for (let i = 0; i < (card.quantity || 1); i++) {
                        encounterDeck.push(card.code);
                    }
                }
            }
        });
    }

    if (stdDiff !== 'none' && MARVEL_DB.difficulty[stdDiff]) {
        encounterDeck.push(...(MARVEL_DB.difficulty[stdDiff].cards || []));
        if (MARVEL_DB.difficulty[stdDiff].start_on_board) {
            villainCardsToSpawn.push(...MARVEL_DB.difficulty[stdDiff].start_on_board);
        }
    }
    if (isExpert && MARVEL_DB.difficulty[expDiff]) {
        encounterDeck.push(...(MARVEL_DB.difficulty[expDiff].cards || []));
        if (MARVEL_DB.difficulty[expDiff].start_on_board) {
            villainCardsToSpawn.push(...MARVEL_DB.difficulty[expDiff].start_on_board);
        }
    }

    modularsToLoad.forEach(mId => {
        let modDef = MARVEL_DB.modulars.find(m => m.id === mId);
        if (modDef) {
            if (modDef.card_set_code) {
                Object.values(localDatabase).forEach(card => {
                    if (card.card_set_code === modDef.card_set_code) {
                        if (!excludedEncounterCodes.includes(card.code)) {
                            for (let i = 0; i < (card.quantity || 1); i++) {
                                encounterDeck.push(card.code);
                            }
                        }
                    }
                });
            } else if (modDef.cards && modDef.cards.length > 0) {
                modDef.cards.forEach(code => {
                    if(!excludedEncounterCodes.includes(code)) encounterDeck.push(code);
                });
            }

            if (modDef.resolved_secondary_deck) {
                deployVillainSecDeck(modDef.resolved_secondary_deck, modDef.name.substring(0, 15).toUpperCase());
            } else if (modDef.secondary_deck) {
                deployVillainSecDeck(modDef.secondary_deck, modDef.name.substring(0, 15).toUpperCase());
            }

            if (modDef.start_on_board) {
                villainCardsToSpawn.push(...modDef.start_on_board);
            }
            if (modDef.start_set_aside) {
                cardsToSetAside.push(...modDef.start_set_aside);
            }
        }
    });

    // --- PLACER LES CARTES DE CÔTÉ ---
    for (let code of cardsToSetAside) {
        let idx = encounterDeck.indexOf(code);
        if (idx !== -1) {
            encounterDeck.splice(idx, 1);
        }
        if (!setAsideCards.includes(code)) {
            setAsideCards.push(code);
        }
    }

    for (let code of villainCardsToSpawn) {
        let idx = encounterDeck.indexOf(code);
        if (idx !== -1) {
            encounterDeck.splice(idx, 1);
        }
        
        let baseCode = code.replace(/[ab]$/, '');
        // On essaie d'abord avec le code exact fourni puis on ajoute les suffixes
        let frontData = await fetchAPI(code) || await fetchAPI(baseCode + 'a') || await fetchAPI(baseCode);
        let backData = await fetchAPI(baseCode + 'b');

        if (frontData) {
            let cardDom = buildCardDOM(frontData, backData ? getImageUrl(backData) : null);
            cardDom.dataset.cardDataA = JSON.stringify(frontData);
            if (backData) {
                cardDom.dataset.cardDataB = JSON.stringify(backData);
            }
            putOnBoardAt(cardDom, spawnX + 160 + (Math.random() * 40), spawnY + (Math.random() * 40 - 20), false);
        }
    }

    shuffleArray(encounterDeck);
    encounterDeckElement.classList.remove('hidden');
    updateDeckCounters();
    saveGameState();
});

// ==========================================
// 4. SYSTÈME DE JEU ET JETONS
// ==========================================

document.querySelectorAll('.token-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.stopPropagation(); 
        let type = btn.dataset.type;
        
        if (activeTokenType === type) {
            if (activeTokenAction === 'add') {
                activeTokenAction = 'sub';
            } else {
                activeTokenType = null;
                activeTokenAction = null;
            }
        } else {
            activeTokenType = type;
            activeTokenAction = 'add';
        }
        updateTokenBarUI();
    });
});

function updateTokenBarUI() {
    document.querySelectorAll('.token-btn').forEach(b => {
        let type = b.dataset.type;
        if (!type) return;
        let baseText = b.dataset.basetext || b.innerText.split(' ')[0];
        
        if (activeTokenType === type) {
            b.classList.add('active');
            b.innerText = activeTokenAction === 'add' ? `${baseText} (+)` : `${baseText} (-)`;
        } else {
            b.classList.remove('active');
            b.innerText = baseText;
        }
    });
}

function applyTokenModeToCard(card, type, action) {
    if (card.classList.contains('in-hand')) return; 
    
    let val = parseInt(card.dataset[type]);
    if (isNaN(val)) val = card.dataset[type] === "true" ? 1 : 0; 
    
    if (action === 'add') val++;
    else val--;
    
    val = Math.max(0, val);
    card.dataset[type] = val;
    syncTokenVisuals(card);
}

document.getElementById('btn-next-phase').addEventListener('click', async () => {
    phases[currentPhaseIndex].classList.remove('active');
    currentPhaseIndex = (currentPhaseIndex + 1) % phases.length;
    phases[currentPhaseIndex].classList.add('active');

    if (currentPhaseIndex === 1) { 
        document.querySelectorAll('.card.exhausted').forEach(card => {
            if (card.dataset.faction !== 'encounter' && card.dataset.faction !== 'villain') {
                card.classList.remove('exhausted');
            }
        });
        await drawToHandSize();
    }
    if (currentPhaseIndex === 2) {
        // Bonus d'accélération (mot-clé "Accélération" imprimé sur des cartes en jeu) : un bonus
        // partagé pour le tour, pas par manigance — calculé une seule fois.
        let sharedAccelBonus = 0;
        document.querySelectorAll('.card').forEach(c => {
            if (c.dataset.cardData && c.dataset.flipped !== 'true') {
                let d = JSON.parse(c.dataset.cardData);
                if (d.scheme_acceleration) {
                    sharedAccelBonus += d.scheme_acceleration;
                }
                else if (d.text && (d.text.toLowerCase().includes('[acceleration]') || d.text.toLowerCase().includes('icon-acceleration') || d.text.toLowerCase().includes('accélération'))) {
                    sharedAccelBonus++;
                }
            }
        });

        // Certains scénarios (ex: Venom-Bouffon avec ses 3 manigances Manhattan) ont PLUSIEURS
        // manigances principales en jeu SIMULTANÉMENT, qui augmentent toutes chaque phase — pas
        // seulement une carte unique #main-scheme-element. On applique donc la menace d'escalade
        // à CHAQUE carte manigance principale actuellement posée sur le plateau, en lisant la
        // face réellement affichée (comme pour l'orientation paysage/portrait).
        document.querySelectorAll('#game-board .card').forEach(mainScheme => {
            if (!mainScheme.dataset.cardData) return;
            const isFlipped = mainScheme.dataset.flipped === 'true';
            let msData = isFlipped
                ? (mainScheme.dataset.cardDataB ? JSON.parse(mainScheme.dataset.cardDataB) : null)
                : JSON.parse(mainScheme.dataset.cardData);
            if (!msData || msData.type_code !== 'main_scheme') return;

            let threatToAdd = msData.escalation_threat !== undefined ? msData.escalation_threat : 1;
            let ownAcceleration = parseInt(mainScheme.dataset.acceleration) || 0;

            let val = (parseInt(mainScheme.dataset.threat) || 0) + threatToAdd + ownAcceleration + sharedAccelBonus;
            mainScheme.dataset.threat = val;
            syncTokenVisuals(mainScheme);
        });
    }
    if (currentPhaseIndex === 3) { 
        await drawCard('encounter');
    }
    if (currentPhaseIndex === 4) { 
        let encounterCardsToDraw = 1;
        document.querySelectorAll('.card').forEach(c => {
            if (c.dataset.cardData && c.dataset.flipped !== 'true') {
                let d = JSON.parse(c.dataset.cardData);
                if (d.scheme_hazard) {
                    encounterCardsToDraw += d.scheme_hazard;
                } 
                else if (d.text && (d.text.toLowerCase().includes('[hazard]') || d.text.toLowerCase().includes('icon-hazard') || d.text.toLowerCase().includes('aléa'))) {
                    encounterCardsToDraw++;
                }
            }
        });
        for (let i = 0; i < encounterCardsToDraw; i++) {
            await drawCard('encounter');
        }
    }
    if (currentPhaseIndex === 5) { 
        document.querySelectorAll('.card.exhausted').forEach(card => {
            if (card.dataset.faction === 'encounter' || card.dataset.faction === 'villain') {
                card.classList.remove('exhausted');
            }
        });
    }
    saveGameState();
});

async function drawToHandSize() {
    if (!currentHeroId && myDeck.length === 0 && discardPile.length === 0) return;
    const currentHandSize = parseInt(heroHandSizeSpan.innerText) || 5;
    const cardsInHand = handArea.querySelectorAll('.card').length;
    const cardsToDraw = currentHandSize - cardsInHand;
    
    for (let i = 0; i < cardsToDraw; i++) {
        if (myDeck.length === 0 && discardPile.length === 0) break;
        await drawCard('player');
    }
    saveGameState();
}

function reshufflePile(type, pile, discard) {
    pile.push(...discard);
    discard.length = 0; 
    shuffleArray(pile);
    updateDeckCounters();
    
    if (type === 'encounter') {
        let mainScheme = document.getElementById('main-scheme-element');
        if (mainScheme) {
            let acc = parseInt(mainScheme.dataset.acceleration || 0) + 1;
            mainScheme.dataset.acceleration = acc;
            syncTokenVisuals(mainScheme);
            alert("⚠️ Le deck Rencontre est vide et a été mélangé : un jeton d'Accélération a été automatiquement ajouté à la Manigance Principale !");
        }
    } else if (type === 'player') {
        alert("⚠️ Pioche vide ! La défausse a été mélangée pour reformer la pioche. N'oublie pas de te donner une carte rencontre face cachée.");
    }
}

// Fonction de piochage classique (clic simple)
async function drawCard(type) {
    let pile, discard;
    let vIndex = -1;
    
    if (type === 'player') { pile = myDeck; discard = discardPile; }
    else if (type === 'encounter') { pile = encounterDeck; discard = encounterDiscardPile; }
    else if (type === 'hero-sec') { pile = heroSecDeck; discard = heroSecDiscard; }
    else if (type.startsWith('villain-sec-')) {
        vIndex = parseInt(type.split('-')[2]);
        pile = villainSecDecks[vIndex];
        discard = villainSecDiscards[vIndex];
    }
    
    if (!pile) return;

    if (pile.length === 0) {
        if (discard && discard.length > 0) {
            reshufflePile(type, pile, discard);
        } else {
            return; 
        }
    }

    const code = pile.pop();
    updateDeckCounters();

    if (pile.length === 0 && discard && discard.length > 0) {
        reshufflePile(type, pile, discard);
    }

    const data = await fetchAPI(code);
    if (!data) return;

    const cardDOM = buildCardDOM(data);
    
    if (type === 'player') {
        putInHand(cardDOM);
    } else if (type === 'hero-sec') {
        let deckDom = document.getElementById('board-hero-deck');
        let x = parseFloat(deckDom.style.left) || CENTER_X;
        let y = parseFloat(deckDom.style.top) || CENTER_Y;
        putOnBoardAt(cardDOM, x, y + 180, false); 
    } else if (type.startsWith('villain-sec-')) {
        let deckDom = document.getElementById('board-villain-deck-' + vIndex);
        let x = parseFloat(deckDom.style.left) || CENTER_X;
        let y = parseFloat(deckDom.style.top) || CENTER_Y;
        putOnBoardAt(cardDOM, x, y + 180, false); 
    } else {
        const rect = boardWrapper.getBoundingClientRect();
        const offsetX = (Math.random() * 60 - 30);
        const offsetY = (Math.random() * 60 - 30);
        const spawnX = (rect.width / 2 - boardX + offsetX) / scale;
        const spawnY = (rect.height / 2 - boardY + offsetY) / scale;
        putOnBoardAt(cardDOM, spawnX, spawnY, true); 
    }
}

async function spawnAndDragCard(type, cx, cy) {
    let pile, discard;
    if (type === 'player') { pile = myDeck; discard = discardPile; }
    else if (type === 'encounter') { pile = encounterDeck; discard = encounterDiscardPile; }
    else if (type === 'hero-sec') { pile = heroSecDeck; discard = heroSecDiscard; }
    else if (type.startsWith('villain-sec-')) {
        let vIndex = parseInt(type.split('-')[2]);
        pile = villainSecDecks[vIndex];
        discard = villainSecDiscards[vIndex];
    }

    if (!pile) return;
    if (pile.length === 0) {
        if (discard && discard.length > 0) reshufflePile(type, pile, discard);
        else return;
    }

    const code = pile.pop();
    updateDeckCounters();
    if (pile.length === 0 && discard && discard.length > 0) reshufflePile(type, pile, discard);

    const data = await fetchAPI(code);
    if (!data) return;

    const cardDOM = buildCardDOM(data);
    
    const rect = boardWrapper.getBoundingClientRect();
    const trueX = (cx - rect.left - boardX) / scale - 60;
    const trueY = (cy - rect.top - boardY) / scale - 84;
    
    putOnBoardAt(cardDOM, trueX, trueY, type !== 'player'); 

    const fakeEvent = new MouseEvent('mousedown', { clientX: cx, clientY: cy, bubbles: true });
    cardDOM.dispatchEvent(fakeEvent);
}

// --- RÉCUPÉRATION RAPIDE DEPUIS UNE DÉFAUSSE (clic = remettre en jeu, glisser = suivre le curseur) ---
function getDiscardArrayForType(type) {
    if (type === 'player') return discardPile;
    if (type === 'encounter') return encounterDiscardPile;
    if (type === 'hero-sec') return heroSecDiscard;
    if (type.startsWith('villain-sec-')) {
        const vIndex = parseInt(type.split('-')[2]);
        return villainSecDiscards[vIndex];
    }
    return null;
}

async function drawFromDiscard(type) {
    const discard = getDiscardArrayForType(type);
    if (!discard || discard.length === 0) return;

    const code = discard.pop();
    updateDeckCounters();

    const data = await fetchAPI(code);
    if (!data) { discard.push(code); updateDeckCounters(); return; }

    const cardDOM = buildCardDOM(data);

    // Toujours sur le plateau (jamais dans la main) : c'est une carte déjà résolue qu'on
    // remet en jeu, pas une nouvelle pioche. L'utilisateur peut ensuite la glisser en main si besoin.
    const rect = boardWrapper.getBoundingClientRect();
    const offsetX = (Math.random() * 60 - 30);
    const offsetY = (Math.random() * 60 - 30);
    const spawnX = (rect.width / 2 - boardX + offsetX) / scale;
    const spawnY = (rect.height / 2 - boardY + offsetY) / scale;
    putOnBoardAt(cardDOM, spawnX, spawnY, false); // face visible : elle a déjà été révélée avant sa défausse
}

async function spawnAndDragFromDiscard(type, cx, cy) {
    const discard = getDiscardArrayForType(type);
    if (!discard || discard.length === 0) return;

    const code = discard.pop();
    updateDeckCounters();

    const data = await fetchAPI(code);
    if (!data) { discard.push(code); updateDeckCounters(); return; }

    const cardDOM = buildCardDOM(data);

    const rect = boardWrapper.getBoundingClientRect();
    const trueX = (cx - rect.left - boardX) / scale - 60;
    const trueY = (cy - rect.top - boardY) / scale - 84;

    putOnBoardAt(cardDOM, trueX, trueY, false);

    const fakeEvent = new MouseEvent('mousedown', { clientX: cx, clientY: cy, bubbles: true });
    cardDOM.dispatchEvent(fakeEvent);
}

// --- GESTION DU DRAG DEPUIS LES PIOCHES ---
function setupDeckInteractions(deckId, pileType) {
    const deckDom = document.getElementById(deckId);
    if (!deckDom) return;
    
    let startX, startY, isDown = false, dragged = false;
    let lastTouchTime = 0; 
    let pressStartTime = 0; 

    function handleDown(e) {
        pressStartTime = Date.now(); 
        
        if (e.type.startsWith('touch')) lastTouchTime = Date.now();
        if (e.type.startsWith('mouse') && Date.now() - lastTouchTime < 500) return; 
        if (e.button === 2) return; 
        
        isDown = true; dragged = false;
        startX = e.clientX || (e.touches && e.touches[0].clientX);
        startY = e.clientY || (e.touches && e.touches[0].clientY);
    }
    
    function handleMove(e) {
        if (!isDown) return;
        let cx = e.clientX || (e.touches && e.touches[0].clientX);
        let cy = e.clientY || (e.touches && e.touches[0].clientY);
        if (!dragged && (Math.abs(cx - startX) > 10 || Math.abs(cy - startY) > 10)) {
            dragged = true;
            isDown = false; 
            spawnAndDragCard(pileType, cx, cy);
        }
    }
    
    function handleUp(e) {
        if (e.type.startsWith('mouse') && Date.now() - lastTouchTime < 500) return; 
        
        let pressDuration = Date.now() - pressStartTime;
        
        if (pressDuration > 400) {
            isDown = false;
            return;
        }

        if (isDown && !dragged) {
            drawCard(pileType); 
            saveGameState();
        }
        isDown = false;
    }

    deckDom.addEventListener('mousedown', handleDown);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    
    deckDom.addEventListener('touchstart', handleDown, {passive: true});
    window.addEventListener('touchmove', handleMove, {passive: true});
    window.addEventListener('touchend', handleUp, {passive: true});
}

// --- GESTION DU DRAG DEPUIS LES DÉFAUSSES (récupère la dernière carte défaussée) ---
function setupDiscardInteractions(pileId, pileType) {
    const pileDom = document.getElementById(pileId);
    if (!pileDom) return;

    let startX, startY, isDown = false, dragged = false;
    let lastTouchTime = 0;
    let pressStartTime = 0;

    function handleDown(e) {
        pressStartTime = Date.now();

        if (e.type.startsWith('touch')) lastTouchTime = Date.now();
        if (e.type.startsWith('mouse') && Date.now() - lastTouchTime < 500) return;
        if (e.button === 2) return;

        isDown = true; dragged = false;
        startX = e.clientX || (e.touches && e.touches[0].clientX);
        startY = e.clientY || (e.touches && e.touches[0].clientY);
    }

    function handleMove(e) {
        if (!isDown) return;
        let cx = e.clientX || (e.touches && e.touches[0].clientX);
        let cy = e.clientY || (e.touches && e.touches[0].clientY);
        if (!dragged && (Math.abs(cx - startX) > 10 || Math.abs(cy - startY) > 10)) {
            dragged = true;
            isDown = false;
            spawnAndDragFromDiscard(pileType, cx, cy);
        }
    }

    function handleUp(e) {
        if (e.type.startsWith('mouse') && Date.now() - lastTouchTime < 500) return;

        let pressDuration = Date.now() - pressStartTime;

        if (pressDuration > 400) {
            isDown = false;
            return;
        }

        if (isDown && !dragged) {
            drawFromDiscard(pileType);
            saveGameState();
        }
        isDown = false;
    }

    pileDom.addEventListener('mousedown', handleDown);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);

    pileDom.addEventListener('touchstart', handleDown, {passive: true});
    window.addEventListener('touchmove', handleMove, {passive: true});
    window.addEventListener('touchend', handleUp, {passive: true});
}

async function updateDiscardImages() {
    async function setPileImage(pileArray, elementId) {
        let el = document.getElementById(elementId);
        if (!el) return;
        if (pileArray.length > 0) {
            let topCode = pileArray[pileArray.length - 1];
            let data = await fetchAPI(topCode);
            if (data) {
                el.style.backgroundImage = `url('${getImageUrl(data)}')`;
                el.style.backgroundSize = 'cover';
                el.style.backgroundPosition = 'center';
                el.style.textShadow = '1px 1px 3px black, -1px -1px 3px black, 1px -1px 3px black, -1px 1px 3px black';
                el.style.color = 'white';
                el.style.border = '2px solid #fff'; 
            }
        } else {
            el.style.backgroundImage = 'none';
            el.style.textShadow = 'none';
            el.style.color = ''; 
            el.style.border = ''; 
        }
    }
    
    await setPileImage(discardPile, 'discard-pile');
    await setPileImage(encounterDiscardPile, 'encounter-discard-pile');
    await setPileImage(heroSecDiscard, 'board-hero-discard');
    for (let i = 0; i < 3; i++) {
        await setPileImage(villainSecDiscards[i], 'board-villain-discard-' + i);
    }
}

function updateDeckCounters() {
    deckCountText.innerText = myDeck.length;
    deckElement.classList.toggle('hidden', myDeck.length === 0);
    discardCountText.innerText = discardPile.length;
    encounterDeckCountText.innerText = encounterDeck.length;
    encounterDeckElement.classList.toggle('hidden', encounterDeck.length === 0);
    encounterDiscardCountText.innerText = encounterDiscardPile.length;
    
    document.getElementById('board-hero-deck-count').innerText = heroSecDeck.length;
    document.getElementById('board-hero-discard-count').innerText = heroSecDiscard.length;
    
    for (let i = 0; i < 3; i++) {
        let d = document.getElementById('board-villain-deck-count-' + i);
        let dd = document.getElementById('board-villain-discard-count-' + i);
        if (d && villainSecDecks[i]) d.innerText = villainSecDecks[i].length;
        if (dd && villainSecDiscards[i]) dd.innerText = villainSecDiscards[i].length;
    }

    let banCount = document.getElementById('banished-count');
    if (banCount) banCount.innerText = banishedCards.length;
    
    updateDiscardImages();
}

function updateCardOrientation(card) {
    if (!card.dataset || !card.dataset.cardData) return;
    let isFlipped = card.dataset.flipped === 'true';

    // L'orientation doit suivre la face RÉELLEMENT affichée, pas toujours la face A : une carte
    // peut démarrer en manigance/side scheme (paysage) et devenir, une fois retournée, un allié
    // ou un personnage portrait classique (ou l'inverse). Si la face retournée n'a pas de données
    // propres (juste le dos générique de la carte), on ne force pas le paysage.
    let data = null;
    if (isFlipped) {
        if (card.dataset.cardDataB) data = JSON.parse(card.dataset.cardDataB);
    } else {
        data = JSON.parse(card.dataset.cardData);
    }

    if (data && (data.type_code === 'main_scheme' || data.type_code === 'side_scheme' || data.type_code === 'player_side_scheme')) {
        card.classList.add('landscape');
    } else {
        card.classList.remove('landscape');
    }
}

function buildCardDOM(cardData, explicitBackUrl = null) {
    const card = document.createElement('div');
    card.classList.add('card');
    // Identifiant stable qui survit à la sauvegarde/rechargement (utilisé pour l'animation
    // "snap-back" de l'undo : il permet de retrouver la même carte avant/après un rechargement complet).
    card.dataset.instanceId = 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

    const isEncounter = cardData.faction_code === 'encounter' || cardData.type_code === 'minion' || cardData.type_code === 'side_scheme' || cardData.type_code === 'obligation' || cardData.type_code === 'villain';
    let defaultBack = isEncounter ? CARD_BACKS.encounter : CARD_BACKS.player;
    
    let frontUrl = getImageUrl(cardData);
    let backUrl = explicitBackUrl || defaultBack;

    let initThreat = 0;
    if (cardData.type_code === 'side_scheme' || cardData.type_code === 'main_scheme' || cardData.type_code === 'player_side_scheme') {
        if (cardData.base_threat !== undefined) initThreat = cardData.base_threat;
        else if (cardData.base_threat_fixed !== undefined) initThreat = cardData.base_threat_fixed;
    }

    let initHP = 0;
    if (['hero', 'alter_ego', 'villain', 'minion', 'ally'].includes(cardData.type_code)) {
        if (cardData.health !== undefined) initHP = cardData.health;
    }

    card.dataset.damage = initHP; 
    card.dataset.threat = initThreat;
    card.dataset.generic = 0;
    card.dataset.acceleration = 0;
    card.dataset.tough = 0;
    card.dataset.stunned = 0;
    card.dataset.confused = 0;
    
    card.dataset.code = cardData.code;
    card.dataset.faction = cardData.faction_code;
    card.dataset.flipped = "false";
    
    card.dataset.cardData = JSON.stringify(cardData);
    card.dataset.cardDataA = JSON.stringify(cardData);
    
    card.dataset.frontUrl = frontUrl;
    card.dataset.backUrl = backUrl;

    card.innerHTML = `
        <img src="${frontUrl}" class="card-front" alt="${cardData.name || 'Carte'}" loading="lazy"/>
        <div class="token damage-token hidden" style="top: 45%; left: 15%; transform: translate(-50%, -50%);">0</div>
        <div class="token threat-token hidden" style="top: 45%; left: 50%; transform: translate(-50%, -50%);">0</div>
        <div class="token generic-token hidden" style="top: 45%; left: 85%; transform: translate(-50%, -50%);">0</div>
        <div class="token acceleration-token hidden" style="top: 50%; right: -8px; transform: translateY(-50%);">0</div>
        <div class="status-container tough-container"></div>
        <div class="status-container stunned-container"></div>
        <div class="status-container confused-container"></div>
    `;

    // Gestion du fallback pour les cartes avec variantes (ex: 01144 → 01144a → 01144b → 01144c)
    const imgElement = card.querySelector('.card-front');
    card.dataset.variantAttempts = '0';

    imgElement.addEventListener('error', function handleImageError() {
        const attempts = parseInt(card.dataset.variantAttempts) || 0;
        card.dataset.variantAttempts = attempts + 1;

        const baseCode = cardData.code.replace(/[a-z]$/, '');
        const hasVariant = baseCode !== cardData.code; // true si le code finit par a/b/c
        const variants = ['a', 'b', 'c'];

        // Essayer les variantes (soit du code actuel si c'est une base, soit des autres variantes)
        if (attempts < 3) {
            const variant = variants[attempts];
            const variantCode = baseCode + variant;
            const variantCardData = localDatabase && localDatabase[variantCode];

            if (variantCardData && variantCode !== cardData.code) {
                const variantUrl = getImageUrl(variantCardData);
                imgElement.src = variantUrl;
                return;
            }
        }

        // Fallback final : image de dos
        imgElement.removeEventListener('error', handleImageError);
        imgElement.src = CARD_BACKS_FALLBACK[isEncounter ? 'encounter' : 'player'];
    });

    updateCardOrientation(card);
    setupCardInteractions(card);
    makeDraggable(card);
    return card;
}

function syncTokenVisuals(card) {
    const isFlipped = card.dataset.flipped === 'true';
    const isFaceDown = isFlipped && !card.dataset.cardDataB;
    
    const dmg = parseInt(card.dataset.damage) || 0;
    const thrt = parseInt(card.dataset.threat) || 0;
    const gen = parseInt(card.dataset.generic) || 0;
    const acc = parseInt(card.dataset.acceleration) || 0;
    
    const dmgTok = card.querySelector('.damage-token');
    const thrtTok = card.querySelector('.threat-token');
    const genTok = card.querySelector('.generic-token');
    const accTok = card.querySelector('.acceleration-token');
    
    if(dmgTok) { dmgTok.innerText = dmg; dmgTok.classList.toggle('hidden', dmg <= 0 || isFaceDown); }
    if(thrtTok) { thrtTok.innerText = thrt; thrtTok.classList.toggle('hidden', thrt <= 0 || isFaceDown); }
    if(genTok) { genTok.innerText = gen; genTok.classList.toggle('hidden', gen <= 0 || isFaceDown); }
    if(accTok) { accTok.innerText = acc; accTok.classList.toggle('hidden', acc <= 0 || isFaceDown); }
    
    let toughCount = parseInt(card.dataset.tough);
    if(isNaN(toughCount)) toughCount = card.dataset.tough === "true" ? 1 : 0;
    
    let stunnedCount = parseInt(card.dataset.stunned);
    if(isNaN(stunnedCount)) stunnedCount = card.dataset.stunned === "true" ? 1 : 0;
    
    let confusedCount = parseInt(card.dataset.confused);
    if(isNaN(confusedCount)) confusedCount = card.dataset.confused === "true" ? 1 : 0;
    
    const toughCont = card.querySelector('.tough-container');
    if(toughCont) {
        toughCont.innerHTML = '';
        if (!isFaceDown) {
            for(let i=0; i<toughCount; i++) toughCont.innerHTML += `<div class="status-token status-token-tough">TENACE</div>`;
        }
    }
    
    const stunnedCont = card.querySelector('.stunned-container');
    if(stunnedCont) {
        stunnedCont.innerHTML = '';
        if (!isFaceDown) {
            for(let i=0; i<stunnedCount; i++) stunnedCont.innerHTML += `<div class="status-token status-token-stunned">SONNÉ</div>`;
        }
    }
    
    const confusedCont = card.querySelector('.confused-container');
    if(confusedCont) {
        confusedCont.innerHTML = '';
        if (!isFaceDown) {
            for(let i=0; i<confusedCount; i++) confusedCont.innerHTML += `<div class="status-token status-token-confused">DÉSORIENTÉ</div>`;
        }
    }
}

function putOnBoardAt(cardElement, x, y, faceDown = false) {
    cardElement.classList.remove('in-hand'); 
    cardElement.style.zIndex = topZIndex++;
    cardElement.style.left = x + "px"; 
    cardElement.style.top = y + "px";
    
    cardElement.dataset.flipped = faceDown ? "true" : "false";
    cardElement.querySelector('.card-front').src = faceDown ? cardElement.dataset.backUrl : cardElement.dataset.frontUrl;
    
    updateCardOrientation(cardElement);
    syncTokenVisuals(cardElement); 
    board.appendChild(cardElement);
}

function putInHand(cardElement) {
    cardElement.classList.add('in-hand'); cardElement.style.left = ""; cardElement.style.top = "";
    cardElement.classList.remove('exhausted');
    
    let data = JSON.parse(cardElement.dataset.cardData);
    let initHP = 0;
    if (['hero', 'alter_ego', 'villain', 'minion', 'ally'].includes(data.type_code)) {
        initHP = data.health || 0;
    }
    
    cardElement.dataset.damage = initHP; 
    cardElement.dataset.threat = 0;
    cardElement.dataset.generic = 0;
    cardElement.dataset.acceleration = 0;
    cardElement.dataset.tough = 0;
    cardElement.dataset.stunned = 0;
    cardElement.dataset.confused = 0;
    syncTokenVisuals(cardElement);
    
    if (cardElement.dataset.flipped === 'true') {
        cardElement.dataset.flipped = "false"; 
        cardElement.querySelector('.card-front').src = cardElement.dataset.frontUrl;
    }
    
    updateCardOrientation(cardElement);
    handArea.appendChild(cardElement);
}

// Certains héros ont des effets qui demandent de jouer une carte au hasard de la main
// (ex: "piochez et jouez une carte au hasard"). Sélectionne une carte en main au hasard
// et la place sur le plateau, près du centre visible.
function playRandomCardFromHand() {
    const handCards = Array.from(handArea.querySelectorAll('.card.in-hand'));
    if (handCards.length === 0) return;

    const card = handCards[Math.floor(Math.random() * handCards.length)];

    const rect = boardWrapper.getBoundingClientRect();
    const offsetX = (Math.random() * 60 - 30);
    const offsetY = (Math.random() * 60 - 30);
    const spawnX = (rect.width / 2 - boardX + offsetX) / scale;
    const spawnY = (rect.height / 2 - boardY + offsetY) / scale;

    putOnBoardAt(card, spawnX, spawnY, false);
}

function discardCard(cardElement, forcedPile = null) {
    const code = cardElement.dataset.code; 
    const faction = cardElement.dataset.faction;
    cardElement.remove();
    
    let target = forcedPile;
    
    if (!target) {
        if (heroSecCodes.includes(code)) target = 'hero-sec';
        else if (villainSecCodes[0] && villainSecCodes[0].includes(code)) target = 'villain-sec-discard-0';
        else if (villainSecCodes[1] && villainSecCodes[1].includes(code)) target = 'villain-sec-discard-1';
        else if (villainSecCodes[2] && villainSecCodes[2].includes(code)) target = 'villain-sec-discard-2';
        else if (faction === 'encounter' || faction === 'villain') target = 'encounter';
        else target = 'player';
    }
    
    if (target === 'hero-sec') heroSecDiscard.push(code);
    else if (target && target.startsWith('villain-sec-discard-')) {
        let idx = parseInt(target.split('-')[3]);
        if (!isNaN(idx)) villainSecDiscards[idx].push(code);
    }
    else if (target === 'encounter') encounterDiscardPile.push(code);
    else discardPile.push(code);

    updateDeckCounters();
}

function flipCard(card) {
    const willBeFlipped = card.dataset.flipped !== 'true';
    card.dataset.flipped = willBeFlipped;
    const newSrc = willBeFlipped ? card.dataset.backUrl : card.dataset.frontUrl;
    card.querySelector('.card-front').src = newSrc;

    showZoom(newSrc);

    if (card.id === 'hero-card-element') heroHandSizeSpan.innerText = willBeFlipped ? card.dataset.handSizeB : card.dataset.handSizeA;

    updateCardOrientation(card);
    syncTokenVisuals(card);
}

function toggleExhaustCard(card) {
    if (!card || card.classList.contains('in-hand')) return;
    card.classList.toggle('exhausted');
}

function setupCardInteractions(card) {
    // --- NOUVEAU : Logique centralisée pour le double-clic / double-tap ---
    const handleDoubleClick = () => {
        if (activeTokenType) return;
        if (card.classList.contains('in-hand')) return;

        // On récupère les données de la carte pour connaître son type
        let data = JSON.parse(card.dataset.cardData);
        const isEncounter = data.faction_code === 'encounter' ||
                            data.type_code === 'minion' ||
                            data.type_code === 'side_scheme' ||
                            data.type_code === 'obligation' ||
                            data.type_code === 'villain';

        // Si c'est une carte RENCONTRE face cachée, le double-clic la retourne
        if (isEncounter && card.dataset.flipped === 'true') {
            flipCard(card);
            saveGameState();
        }
        // Traîtrise / Obligation face visible : à usage unique, le double-clic défausse directement
        else if ((data.type_code === 'treachery' || data.type_code === 'obligation') && card.dataset.flipped !== 'true') {
            discardCard(card);
            saveGameState();
        }
        // Sinon (carte JOUEUR, Minion, Manigance, Méchant...) : on incline/redresse
        else {
            toggleExhaustCard(card);
            saveGameState();
        }
    };

    // --- SUIVI DE LA CARTE SURVOLÉE (SOURIS) : sert de cible aux raccourcis clavier E/F ---
    // (pas d'aperçu zoom automatique au survol : le joueur ne le souhaite pas)
    card.addEventListener('mouseenter', () => {
        if (globalCardDragActive || activeTokenType) return;
        hoveredCard = card;
    });
    card.addEventListener('mouseleave', () => {
        if (hoveredCard === card) hoveredCard = null;
    });

    // Application au double-clic (Souris PC)
    card.addEventListener('dblclick', () => {
        handleDoubleClick();
    });

    // Application au double-tap (Tactile Mobile)
    let lastTap = 0;
    card.addEventListener('touchend', (e) => {
        const currentTime = new Date().getTime();
        const tapLength = currentTime - lastTap;
        if (tapLength < 300 && tapLength > 0) {
            handleDoubleClick();
            e.preventDefault();
        }
        lastTap = currentTime;
    });

    // --- LE RESTE DU MENU CONTEXTUEL NE CHANGE PAS ---
    card.addEventListener('contextmenu', (e) => {
        e.preventDefault(); e.stopPropagation();
        hideAllMenus();
        targetCard = card;
        contextMenu.classList.remove('hidden');
        
        let data = JSON.parse(card.dataset.cardData);
        let showSeparator = false;

        menuNextScheme.classList.add('hidden');
        menuNextVillain.classList.add('hidden');
        menuSetActiveScheme.classList.add('hidden');
        menuProgressionSeparator.classList.add('hidden');

        document.getElementById('menu-add-accel').classList.add('hidden');
        document.getElementById('menu-sub-accel').classList.add('hidden');

        // Une carte en main n'a ni face cachée à retourner ni orientation à incliner ;
        // à la place, certains héros ont besoin de jouer une carte au hasard de leur main.
        const isInHand = card.classList.contains('in-hand');
        document.getElementById('menu-flip').classList.toggle('hidden', isInHand);
        document.getElementById('menu-exhaust').classList.toggle('hidden', isInHand);
        document.getElementById('menu-play-random').classList.toggle('hidden', !isInHand);
        document.getElementById('menu-hand-separator').classList.toggle('hidden', !isInHand);

        if (data.type_code === 'main_scheme') {
            document.getElementById('menu-add-accel').classList.remove('hidden');
            document.getElementById('menu-sub-accel').classList.remove('hidden');
            showSeparator = true;

            if (currentSchemeIndex + 1 < currentVillainSchemes.length) {
                menuNextScheme.classList.remove('hidden');
            }

            // Plusieurs manigances peuvent être en jeu à la fois (cf. rappel depuis "Cartes de
            // Côté") : celle-ci n'est proposée comme "active" que si elle ne l'est pas déjà —
            // c'est elle qui sera suivie pour l'ajout automatique de menace en phase méchant.
            if (card.id !== 'main-scheme-element') {
                menuSetActiveScheme.classList.remove('hidden');
                showSeparator = true;
            }
        }
        
        if (data.type_code === 'villain') {
            const stages = card.dataset.multiVillainStages ? JSON.parse(card.dataset.multiVillainStages) : currentVillainStages;
            const idx = card.dataset.multiVillainStages ? (parseInt(card.dataset.multiVillainStageIndex) || 0) : currentVillainStageIndex;
            if (idx + 1 < stages.length) {
                menuNextVillain.classList.remove('hidden');
                showSeparator = true;
            }
        }

        if (showSeparator) menuProgressionSeparator.classList.remove('hidden');

        let clientX = e.clientX || (e.touches && e.touches.length > 0 ? e.touches[0].clientX : 0);
        let clientY = e.clientY || (e.touches && e.touches.length > 0 ? e.touches[0].clientY : 0);

        if (clientX + contextMenu.offsetWidth > window.innerWidth) clientX = window.innerWidth - contextMenu.offsetWidth - 5;
        if (clientY + contextMenu.offsetHeight > window.innerHeight) clientY = window.innerHeight - contextMenu.offsetHeight - 5;
        
        contextMenu.style.left = clientX + 'px'; 
        contextMenu.style.top = clientY + 'px';
    });
}
menuBanish.addEventListener('click', () => {
    if (targetCard) {
        banishedCards.push(targetCard.dataset.code);
        targetCard.remove();
        updateDeckCounters();
        saveGameState();
    }
    hideAllMenus();
});

menuNextScheme.addEventListener('click', async () => {
    if (targetCard) {
        let x = parseFloat(targetCard.style.left);
        let y = parseFloat(targetCard.style.top);
        
        let carryOverAcceleration = parseInt(targetCard.dataset.acceleration) || 0;
        
        let oldRawCode = currentVillainSchemes[currentSchemeIndex];
        let oldBaseCode = oldRawCode.replace(/[ab]$/, '');
        
        let codeIdx = setAsideCards.indexOf(oldRawCode) !== -1 ? setAsideCards.indexOf(oldRawCode) : setAsideCards.indexOf(oldBaseCode);
        if(codeIdx !== -1) setAsideCards.splice(codeIdx, 1);

        targetCard.remove();
        // Une carte retirée du plateau ne disparaît jamais du jeu : elle repart dans les
        // "Cartes de Côté", d'où on peut la remettre en jeu manuellement (ex: un effet qui
        // exige plusieurs manigances/étapes en jeu à la fois).
        if (!setAsideCards.includes(oldRawCode)) setAsideCards.push(oldRawCode);
        currentSchemeIndex++;
        
        let nextRawCode = currentVillainSchemes[currentSchemeIndex];
        let nextBaseCode = nextRawCode.replace(/[ab]$/, '');
        
        let newIdx = setAsideCards.indexOf(nextRawCode) !== -1 ? setAsideCards.indexOf(nextRawCode) : setAsideCards.indexOf(nextBaseCode);
        if (newIdx !== -1) setAsideCards.splice(newIdx, 1);
        
        let frontData = await fetchAPI(nextRawCode); 
        let backData = await fetchAPI(nextBaseCode + 'b'); 
        
        if (frontData) {
            let sDom = buildCardDOM(frontData, backData ? getImageUrl(backData) : null);
            sDom.dataset.cardDataA = JSON.stringify(frontData);
            if (backData) sDom.dataset.cardDataB = JSON.stringify(backData);
            sDom.id = `main-scheme-element`;
            
            sDom.dataset.acceleration = carryOverAcceleration;
            putOnBoardAt(sDom, x, y, false);
        }
        saveGameState();
    }
    hideAllMenus();
});

// Choisit quelle manigance (parmi plusieurs en jeu, cf. le rappel depuis "Cartes de Côté")
// est la manigance "officielle" : celle avec l'id main-scheme-element, seule suivie par le
// calcul automatique de menace en phase méchant. Les autres restent en jeu, gérées à la main.
menuSetActiveScheme.addEventListener('click', () => {
    if (targetCard) {
        const previousActive = document.getElementById('main-scheme-element');
        if (previousActive && previousActive !== targetCard) previousActive.id = '';
        targetCard.id = 'main-scheme-element';
        saveGameState();
    }
    hideAllMenus();
});

menuNextVillain.addEventListener('click', async () => {
    if (targetCard) {
        let x = parseFloat(targetCard.style.left);
        let y = parseFloat(targetCard.style.top);

        // Méchant d'un scénario multi-méchants (ex: Avengers Tower) : sa progression d'étapes
        // vit sur la carte elle-même (dataset.multiVillainStages/-StageIndex), indépendante des
        // autres méchants du plateau, plutôt que dans les variables globales currentVillainStages.
        if (targetCard.dataset.multiVillainStages) {
            const stages = JSON.parse(targetCard.dataset.multiVillainStages);
            let idx = parseInt(targetCard.dataset.multiVillainStageIndex) || 0;
            const villainName = targetCard.dataset.multiVillainName || '';

            let oldCode = stages[idx];
            let codeIdx = setAsideCards.indexOf(oldCode);
            if (codeIdx !== -1) setAsideCards.splice(codeIdx, 1);

            targetCard.remove();
            // Repart dans les "Cartes de Côté" plutôt que de disparaître : récupérable au besoin.
            if (!setAsideCards.includes(oldCode)) setAsideCards.push(oldCode);
            idx++;
            let nextCode = stages[idx];

            let newIdx = setAsideCards.indexOf(nextCode);
            if (newIdx !== -1) setAsideCards.splice(newIdx, 1);

            let vData = await fetchAPI(nextCode) || await fetchAPI(nextCode.replace(/[ab]$/, ''));
            if (vData) {
                let vDom = buildCardDOM(vData);
                vDom.dataset.multiVillainStages = JSON.stringify(stages);
                vDom.dataset.multiVillainStageIndex = idx;
                if (villainName) vDom.dataset.multiVillainName = villainName;
                putOnBoardAt(vDom, x, y, false);
            }
        } else {
            let oldCode = currentVillainStages[currentVillainStageIndex];
            let codeIdx = setAsideCards.indexOf(oldCode);
            if(codeIdx !== -1) setAsideCards.splice(codeIdx, 1);

            targetCard.remove();
            // Repart dans les "Cartes de Côté" plutôt que de disparaître : récupérable au besoin.
            if (!setAsideCards.includes(oldCode)) setAsideCards.push(oldCode);
            currentVillainStageIndex++;
            let nextCode = currentVillainStages[currentVillainStageIndex];

            let newIdx = setAsideCards.indexOf(nextCode);
            if (newIdx !== -1) setAsideCards.splice(newIdx, 1);

            let { dom: vDom, flipped } = await buildVillainDeckStageDOM(nextCode);
            if (vDom) putOnBoardAt(vDom, x, y, flipped);
        }
        saveGameState();
    }
    hideAllMenus();
});

function makeDraggable(element) {
    let isDragging = false, startX, startY;
    let lastTouchEnd = 0;
    let isTouchInteraction = false;

    element.onmousedown = (e) => {
        if (Date.now() - lastTouchEnd < 500) return;
        if (e.target.closest('#phase-panel') || e.target.closest('#ui-panel')) return;
        if (e.button === 2) return;
        e.preventDefault(); e.stopPropagation();
        isDragging = false; isTouchInteraction = false; startX = e.clientX; startY = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
    };

    element.addEventListener('touchstart', (e) => {
        if (e.target.closest('#phase-panel') || e.target.closest('#ui-panel')) return;
        isDragging = false;
        isTouchInteraction = true;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;

        document.addEventListener('touchmove', elementTouchDrag, {passive: false});
        document.addEventListener('touchend', closeTouchDragElement);
    }, {passive: false});

    function elementDrag(e) { handleMove(e.clientX, e.clientY, e); }
    function elementTouchDrag(e) { handleMove(e.touches[0].clientX, e.touches[0].clientY, e); }

    function handleMove(clientX, clientY, e) {
        if (!isDragging) {
            const dx = clientX - startX, dy = clientY - startY;
            let shouldArmDrag = Math.abs(dx) > 5 || Math.abs(dy) > 5;

            // Sur tactile, une carte EN MAIN doit pouvoir être défilée horizontalement
            // (scroll natif de la main) sans être accidentellement soulevée du jeu :
            // on n'engage le glissement que sur un mouvement clairement vertical.
            if (isTouchInteraction && element.classList.contains('in-hand')) {
                if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) {
                    shouldArmDrag = true;
                } else {
                    return; // laisse le scroll natif de la main faire son travail (ou mouvement pas encore assez net)
                }
            }

            if (!shouldArmDrag) return;

            isDragging = true;
            globalCardDragActive = true;
            element.classList.remove('in-hand');
            element.style.zIndex = topZIndex++;
        }

        if (isDragging) {
            if(e.preventDefault) e.preventDefault(); 
            const isOverHUD = clientY > window.innerHeight - 165; 
            const isLandscape = element.classList.contains('landscape');
            
            if (isOverHUD) {
                if (element.parentNode !== document.body) {
                    document.body.appendChild(element);
                    element.classList.add('is-dragging-hud'); element.classList.remove('is-dragging-board');
                }
                const offsetW = isLandscape ? 60 : 42; const offsetH = isLandscape ? 42 : 60;
                element.style.left = (clientX - offsetW) + "px"; element.style.top = (clientY - offsetH) + "px";
            } else {
                if (element.parentNode !== board) {
                    board.appendChild(element);
                    element.classList.add('is-dragging-board'); element.classList.remove('is-dragging-hud');
                }
                const rect = boardWrapper.getBoundingClientRect();
                const offsetW = isLandscape ? 84 : 60; const offsetH = isLandscape ? 60 : 84;
                const trueX = (clientX - rect.left - boardX) / scale - offsetW;
                const trueY = (clientY - rect.top - boardY) / scale - offsetH;
                element.style.left = trueX + "px"; element.style.top = trueY + "px";
            }
        }
    }

    function closeDragElement(e) {
        document.onmouseup = null; document.onmousemove = null;
        handleEnd(e.clientX, e.clientY);
    }

    function closeTouchDragElement(e) {
        lastTouchEnd = Date.now();
        document.removeEventListener('touchmove', elementTouchDrag);
        document.removeEventListener('touchend', closeTouchDragElement);
        if (e.changedTouches.length > 0) {
            let clientX = e.changedTouches[0].clientX;
            let clientY = e.changedTouches[0].clientY;
            handleEnd(clientX, clientY);
        }
    }

    function handleEnd(clientX, clientY) {
        if (isDragging) {
            element.style.visibility = 'hidden';
            const dropTarget = document.elementFromPoint(clientX, clientY);
            element.style.visibility = '';
            element.classList.remove('is-dragging-hud', 'is-dragging-board');
            globalCardDragActive = false;

            if (dropTarget && dropTarget.closest('#board-hero-discard')) discardCard(element, 'hero-sec');
            else if (dropTarget && dropTarget.closest('.board-pile[data-pile^="villain-sec-discard-"]')) {
                discardCard(element, dropTarget.closest('.board-pile').dataset.pile);
            }
            else if (dropTarget && dropTarget.closest('#discard-pile')) discardCard(element, 'player');
            else if (dropTarget && dropTarget.closest('#encounter-discard-pile')) discardCard(element, 'encounter');
            else if (dropTarget && dropTarget.closest('#hand-area')) putInHand(element);
            else if (element.parentNode !== board) putOnBoardAt(element, (clientX - boardX) / scale, (clientY - boardY) / scale, element.dataset.flipped === 'true');
            saveGameState();
        } else if (activeTokenType) {
            applyTokenModeToCard(element, activeTokenType, activeTokenAction);
            saveGameState();
        } else {
            // Un simple clic/tap sans glisser = sélection de la carte : affiche l'aperçu zoom.
            const isFlipped = element.dataset.flipped === 'true';
            showZoom(isFlipped ? element.dataset.backUrl : element.dataset.frontUrl);
        }
    }
}

// Glisser le jeton de scénario (rond mauve libre, cf. villainDef.jeton). Volontairement séparé de
// makeDraggable() : un jeton n'est pas une carte, il n'a ni défausse, ni main, ni face cachée —
// on ne veut aucune de ces règles quand on le pose sur une pile ou la zone de main.
function makeMarkerDraggable(element) {
    let isDragging = false, startX, startY;

    function boardCoordsFor(clientX, clientY) {
        const rect = boardWrapper.getBoundingClientRect();
        return {
            x: (clientX - rect.left - boardX) / scale - element.offsetWidth / 2,
            y: (clientY - rect.top - boardY) / scale - element.offsetHeight / 2
        };
    }

    function startDrag(clientX, clientY) {
        isDragging = true;
        startX = clientX; startY = clientY;
        element.style.zIndex = topZIndex++;
    }

    function moveDrag(clientX, clientY) {
        if (!isDragging) return;
        const { x, y } = boardCoordsFor(clientX, clientY);
        element.style.left = x + 'px';
        element.style.top = y + 'px';
    }

    function endDrag() {
        if (!isDragging) return;
        isDragging = false;
        saveGameState();
    }

    element.addEventListener('mousedown', (e) => {
        if (e.button === 2) return;
        e.preventDefault(); e.stopPropagation();
        startDrag(e.clientX, e.clientY);
        const onMove = (ev) => moveDrag(ev.clientX, ev.clientY);
        const onUp = () => { endDrag(); document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    });

    element.addEventListener('touchstart', (e) => {
        e.preventDefault(); e.stopPropagation();
        const t = e.touches[0];
        startDrag(t.clientX, t.clientY);
        const onMove = (ev) => { ev.preventDefault(); moveDrag(ev.touches[0].clientX, ev.touches[0].clientY); };
        const onEnd = () => { endDrag(); document.removeEventListener('touchmove', onMove); document.removeEventListener('touchend', onEnd); };
        document.addEventListener('touchmove', onMove, { passive: false });
        document.addEventListener('touchend', onEnd);
    }, { passive: false });
}
makeMarkerDraggable(boardJetonToken);

// --- MENUS CONTEXTUELS ET ACTIONS ---
document.addEventListener('click', (e) => {
    if (!e.target.closest('#context-menu') && !e.target.closest('#pile-context-menu')) hideAllMenus();

    if (!e.target.closest('#token-bar') && !e.target.closest('.card') && !e.target.closest('.token-btn')) {
        if (activeTokenType) { activeTokenType = null; activeTokenAction = null; updateTokenBarUI(); }
    }

    // Clic en dehors d'une carte (et pas sur l'aperçu lui-même, ni sur une carte de la modale
    // d'inspection de pile qui a sa propre logique de zoom) : referme l'aperçu zoom en cours.
    if (!e.target.closest('.card') && !e.target.closest('#floating-zoom') && !e.target.closest('.inspect-card-item')) hideZoom();
});

document.addEventListener('touchstart', (e) => {
    if (!e.target.closest('#context-menu') && !e.target.closest('#pile-context-menu') && !e.target.closest('.card') && !e.target.closest('.pile-element')) hideAllMenus();
    
    if (!e.target.closest('#token-bar') && !e.target.closest('.card') && !e.target.closest('.token-btn')) {
        if (activeTokenType) { activeTokenType = null; activeTokenAction = null; updateTokenBarUI(); }
    }
});

function hideAllMenus() { contextMenu.classList.add('hidden'); pileContextMenu.classList.add('hidden'); }

// Clic droit sur la zone de main (en dehors d'une carte précise) : affiche uniquement
// l'option "jouer une carte au hasard", utile pour certains effets de héros.
handArea.addEventListener('contextmenu', (e) => {
    if (e.target.closest('.card')) return; // laissé au menu contextuel de la carte elle-même
    e.preventDefault(); e.stopPropagation();
    hideAllMenus();
    targetCard = null;

    document.querySelectorAll('#context-menu .menu-item, #context-menu .menu-separator').forEach(el => el.classList.add('hidden'));
    document.getElementById('menu-play-random').classList.remove('hidden');

    contextMenu.classList.remove('hidden');

    let clientX = e.clientX, clientY = e.clientY;
    if (clientX + contextMenu.offsetWidth > window.innerWidth) clientX = window.innerWidth - contextMenu.offsetWidth - 5;
    if (clientY + contextMenu.offsetHeight > window.innerHeight) clientY = window.innerHeight - contextMenu.offsetHeight - 5;
    contextMenu.style.left = clientX + 'px';
    contextMenu.style.top = clientY + 'px';
});

// --- RACCOURCIS CLAVIER ---
// D : piocher une carte | Espace : phase suivante | E : incliner/redresser la carte survolée | F : retourner la carte survolée
document.addEventListener('keydown', (e) => {
    const activeTag = document.activeElement && document.activeElement.tagName;
    if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT') return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    switch (e.key) {
        case 'd': case 'D':
            if (myDeck.length > 0 || discardPile.length > 0) {
                drawCard('player');
                saveGameState();
            }
            break;
        case ' ':
            e.preventDefault();
            document.getElementById('btn-next-phase').click();
            break;
        case 'e': case 'E':
            if (hoveredCard) { toggleExhaustCard(hoveredCard); saveGameState(); }
            break;
        case 'f': case 'F':
            if (hoveredCard) { flipCard(hoveredCard); saveGameState(); }
            break;
    }
});

document.getElementById('menu-exhaust').addEventListener('click', () => {
    toggleExhaustCard(targetCard);
    hideAllMenus(); saveGameState();
});

document.getElementById('menu-play-random').addEventListener('click', () => {
    playRandomCardFromHand();
    hideAllMenus(); saveGameState();
});

document.getElementById('menu-flip').addEventListener('click', () => {
    if (targetCard) flipCard(targetCard);
    hideAllMenus(); saveGameState();
});

document.getElementById('menu-clear-tokens').addEventListener('click', () => { 
    if (targetCard) { 
        let data = JSON.parse(targetCard.dataset.cardData);
        let initHP = 0;
        if (['hero', 'alter_ego', 'villain', 'minion', 'ally'].includes(data.type_code)) initHP = data.health || 0;
        let initThreat = 0;
        if (['side_scheme', 'main_scheme', 'player_side_scheme'].includes(data.type_code)) initThreat = data.base_threat !== undefined ? data.base_threat : (data.base_threat_fixed || 0);

        targetCard.dataset.damage = initHP; 
        targetCard.dataset.threat = initThreat;
        
        targetCard.dataset.generic = 0;
        targetCard.dataset.acceleration = 0;
        targetCard.dataset.tough = 0;
        targetCard.dataset.stunned = 0;
        targetCard.dataset.confused = 0;
        
        syncTokenVisuals(targetCard);
        saveGameState(); 
    } 
    hideAllMenus(); 
});

document.getElementById('menu-discard').addEventListener('click', () => { if (targetCard) discardCard(targetCard); hideAllMenus(); saveGameState(); });
document.getElementById('menu-return-top').addEventListener('click', () => returnCardToDeck('top'));
document.getElementById('menu-return-bottom').addEventListener('click', () => returnCardToDeck('bottom'));
document.getElementById('menu-return-shuffle').addEventListener('click', () => returnCardToDeck('shuffle'));

function returnCardToDeck(position) {
    if (!targetCard) return;
    const code = targetCard.dataset.code;
    const isEncounter = targetCard.dataset.faction === 'encounter' || targetCard.dataset.faction === 'villain';
    const pile = isEncounter ? encounterDeck : myDeck;
    targetCard.remove();
    if (position === 'top') pile.push(code);
    else if (position === 'bottom') pile.unshift(code);
    else if (position === 'shuffle') { pile.push(code); shuffleArray(pile); }
    updateDeckCounters(); hideAllMenus(); saveGameState();
}

document.querySelectorAll('.pile-element').forEach(pile => {
    pile.addEventListener('contextmenu', (e) => {
        e.preventDefault(); e.stopPropagation(); hideAllMenus();
        targetPileType = pile.dataset.pile;
        
        const isDiscard = targetPileType.includes('discard');
        menuPileShuffleIntoDeck.style.display = isDiscard ? 'block' : 'none';
        
        pileContextMenu.classList.remove('hidden');
        
        let clientX = e.clientX || (e.touches && e.touches.length > 0 ? e.touches[0].clientX : 0);
        let clientY = e.clientY || (e.touches && e.touches.length > 0 ? e.touches[0].clientY : 0);
        
        if (clientX + pileContextMenu.offsetWidth > window.innerWidth) clientX = window.innerWidth - pileContextMenu.offsetWidth - 5;
        if (clientY + pileContextMenu.offsetHeight > window.innerHeight) clientY = window.innerHeight - pileContextMenu.offsetHeight - 5;
        
        pileContextMenu.style.left = clientX + 'px'; 
        pileContextMenu.style.top = clientY + 'px';
    });
});

menuPileShuffleIntoDeck.addEventListener('click', () => {
    hideAllMenus();
    if (targetPileType === 'player-discard') { myDeck = myDeck.concat(discardPile); discardPile = []; shuffleArray(myDeck); }
    else if (targetPileType === 'encounter-discard') { encounterDeck = encounterDeck.concat(encounterDiscardPile); encounterDiscardPile = []; shuffleArray(encounterDeck); }
    else if (targetPileType === 'hero-sec-discard') { heroSecDeck = heroSecDeck.concat(heroSecDiscard); heroSecDiscard = []; shuffleArray(heroSecDeck); }
    else if (targetPileType.startsWith('villain-sec-discard-')) { 
        let idx = parseInt(targetPileType.split('-')[3]);
        if(!isNaN(idx)) {
            villainSecDecks[idx] = villainSecDecks[idx].concat(villainSecDiscards[idx]); 
            villainSecDiscards[idx] = []; 
            shuffleArray(villainSecDecks[idx]); 
        }
    }
    updateDeckCounters(); saveGameState();
});

document.getElementById('menu-pile-inspect').addEventListener('click', () => { hideAllMenus(); openInspectModal(targetPileType); });
document.getElementById('menu-pile-shuffle').addEventListener('click', () => { hideAllMenus(); let pile = getPileArray(targetPileType); if (pile) shuffleArray(pile); saveGameState(); });

function getPileArray(pileType) {
    switch(pileType) { 
        case 'player-deck': return myDeck; 
        case 'player-discard': return discardPile; 
        case 'encounter-deck': return encounterDeck; 
        case 'encounter-discard': return encounterDiscardPile; 
        case 'hero-sec-deck': return heroSecDeck;
        case 'hero-sec-discard': return heroSecDiscard;
        case 'out-of-play': return setAsideCards; 
        case 'banished': return banishedCards; 
        default: 
            if (pileType.startsWith('villain-sec-deck-')) return villainSecDecks[parseInt(pileType.split('-')[3])];
            if (pileType.startsWith('villain-sec-discard-')) return villainSecDiscards[parseInt(pileType.split('-')[3])];
            return null; 
    }
}

async function openInspectModal(pileType) {
    const pile = getPileArray(pileType); if (!pile) return;
    modalCardsContainer.innerHTML = 'Chargement en cours...'; modalInspect.classList.remove('hidden');
    
    let pileName = "Pile";
    if(pileType === 'player-deck') pileName = "Pioche Joueur";
    else if(pileType === 'player-discard') pileName = "Défausse Joueur";
    else if(pileType === 'encounter-deck') pileName = "Pioche Rencontre";
    else if(pileType === 'encounter-discard') pileName = "Défausse Rencontre";
    else if(pileType === 'hero-sec-deck') pileName = "Deck Spécial (Héros)";
    else if(pileType === 'hero-sec-discard') pileName = "Défausse Spéciale (Héros)";
    else if(pileType.startsWith('villain-sec')) pileName = "Deck Spécial (Méchant)";
    else if(pileType === 'out-of-play') pileName = "Cartes de Côté (Hors Jeu)";
    else if(pileType === 'banished') pileName = "Cartes Bannies";

    modalTitle.innerText = `${pileName} (${pile.length} cartes)`;
    modalCardsContainer.innerHTML = '';
    if (pile.length === 0) { modalCardsContainer.innerHTML = '<p>Cette pile est vide.</p>'; return; }
    
    for (let i = pile.length - 1; i >= 0; i--) {
        const code = pile[i]; const cardData = await fetchAPI(code); if (!cardData) continue;
        const item = document.createElement('div'); item.classList.add('inspect-card-item');
        
        item.innerHTML = `<img src="${getImageUrl(cardData)}" alt="${cardData.name}" loading="lazy" title="Cliquer pour afficher dans le panneau de zoom"/><button>Mettre en jeu</button>`;
        
        item.querySelector('img').addEventListener('click', () => {
            showZoom(getImageUrl(cardData));
        });

        item.querySelector('button').addEventListener('click', () => {
            pile.splice(i, 1); updateDeckCounters();

            // Remettre une carte "mise de côté" en jeu ne retire plus la manigance/étape
            // actuellement active : le joueur peut volontairement avoir plusieurs stades/méchants
            // en jeu en même temps si une situation l'exige. C'est à lui de gérer/retirer
            // manuellement s'il ne veut pas les deux à la fois.
            const cardDOM = buildCardDOM(cardData);
            
            if (pileType.includes('player')) putInHand(cardDOM); 
            else if (pileType === 'hero-sec-deck' || pileType === 'hero-sec-discard') putOnBoardAt(cardDOM, CENTER_X, CENTER_Y, false);
            else if (pileType === 'villain-sec-deck' || pileType === 'villain-sec-discard') putOnBoardAt(cardDOM, CENTER_X, CENTER_Y, false);
            else putOnBoardAt(cardDOM, CENTER_X, CENTER_Y, false); 
            
            modalInspect.classList.add('hidden'); saveGameState();
        });
        modalCardsContainer.appendChild(item);
    }
}

modalClose.addEventListener('click', () => modalInspect.classList.add('hidden'));

// --- CAMÉRA (ORDINATEUR : MOLETTE ET SOURIS) ---
boardWrapper.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomIntensity = 0.08; const wheel = e.deltaY < 0 ? 1 : -1;
    const rect = boardWrapper.getBoundingClientRect();
    const mouseX = e.clientX - rect.left; const mouseY = e.clientY - rect.top;
    const targetX = (mouseX - boardX) / scale; const targetY = (mouseY - boardY) / scale;
    scale += wheel * zoomIntensity; scale = Math.max(0.3, Math.min(scale, 2.5));
    boardX = mouseX - (targetX * scale); boardY = mouseY - (targetY * scale);
    updateCamera();
});

let isPanning = false, startPanX = 0, startPanY = 0, hasPanned = false;
boardWrapper.addEventListener('mousedown', (e) => {
    if (e.target.closest('#phase-panel') || e.target.closest('#ui-panel')) return;
    if (e.target === boardWrapper || e.target === board) { isPanning = true; hasPanned = false; startPanX = e.clientX - boardX; startPanY = e.clientY - boardY; }
});
window.addEventListener('mousemove', (e) => {
    if (!isPanning) return; hasPanned = true; boardX = e.clientX - startPanX; boardY = e.clientY - startPanY; updateCamera();
});
window.addEventListener('mouseup', () => { if (isPanning && !hasPanned) hideZoom(); isPanning = false; });

// --- CAMÉRA (MOBILE : GLISSEMENT ET PINCEMENT) ---
let initialPinchDistance = null;
let initialScale = scale;

boardWrapper.addEventListener('touchstart', (e) => {
    if (e.target.closest('#phase-panel') || e.target.closest('#ui-panel') || e.target.closest('.card') || e.target.closest('.pile-element')) return;
    
    if (e.touches.length === 1) {
        isPanning = true; hasPanned = false; 
        startPanX = e.touches[0].clientX - boardX; 
        startPanY = e.touches[0].clientY - boardY;
    } else if (e.touches.length === 2) {
        isPanning = false; 
        initialPinchDistance = getPinchDistance(e.touches);
        initialScale = scale;
    }
}, {passive: false});

boardWrapper.addEventListener('touchmove', (e) => {
    if (e.target.closest('#phase-panel') || e.target.closest('#ui-panel') || e.target.closest('.card') || e.target.closest('.pile-element')) return;
    
    if (e.touches.length === 1 && isPanning) {
        e.preventDefault(); 
        hasPanned = true; 
        boardX = e.touches[0].clientX - startPanX; 
        boardY = e.touches[0].clientY - startPanY; 
        updateCamera();
    } else if (e.touches.length === 2 && initialPinchDistance) {
        e.preventDefault();
        const currentDistance = getPinchDistance(e.touches);
        const zoomFactor = currentDistance / initialPinchDistance;
        
        let newScale = initialScale * zoomFactor;
        newScale = Math.max(0.3, Math.min(newScale, 2.5));

        const rect = boardWrapper.getBoundingClientRect();
        const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
        const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;

        const targetX = (centerX - boardX) / scale;
        const targetY = (centerY - boardY) / scale;

        scale = newScale;
        boardX = centerX - (targetX * scale);
        boardY = centerY - (targetY * scale);

        updateCamera();
        
        initialPinchDistance = currentDistance; 
        initialScale = scale;
    }
}, {passive: false});

boardWrapper.addEventListener('touchend', (e) => {
    if (e.touches.length < 2) { initialPinchDistance = null; }
    if (e.touches.length === 0) { 
        if (isPanning && !hasPanned) hideZoom(); 
        isPanning = false; 
    }
});

function getPinchDistance(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
}

function updateCamera() { board.style.transform = `translate(${boardX}px, ${boardY}px) scale(${scale})`; }

function showZoom(imageUrl) {
    if (imageUrl) {
        zoomImg.src = imageUrl;
        floatingZoom.classList.remove('hidden');
    }
}

function hideZoom() {
    floatingZoom.classList.add('hidden');
}

floatingZoom.addEventListener('click', hideZoom);

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [array[i], array[j]] = [array[j], array[i]]; }
}

// ==========================================
// 5. SAUVEGARDE ET CHARGEMENT (LOCALSTORAGE)
// ==========================================
function saveGameState(isAutoSave = false) {
    if (resetInProgress) return; 
    
    try {
        const state = {
            version: GAME_VERSION, 
            myDeck, discardPile, encounterDeck, encounterDiscardPile,
            heroSecDeck, heroSecDiscard, heroSecCodes,
            villainSecDecks, villainSecDiscards, villainSecCodes,
            setAsideCards, banishedCards,
            currentHeroId, boardX, boardY, scale,
            heroHandSize: heroHandSizeSpan.innerText,
            heroNemesis: window.currentHeroNemesis,
            
            currentVillainStages, currentVillainStageIndex,
            currentVillainSchemes, currentSchemeIndex,
            currentVillainIsDeck, currentVillainDeckExpert,
            currentPhaseIndex: currentPhaseIndex,
            
            boardPiles: {
                heroDeck: { hidden: document.getElementById('board-hero-deck').classList.contains('hidden'), left: document.getElementById('board-hero-deck').style.left, top: document.getElementById('board-hero-deck').style.top },
                heroDiscard: { hidden: document.getElementById('board-hero-discard').classList.contains('hidden'), left: document.getElementById('board-hero-discard').style.left, top: document.getElementById('board-hero-discard').style.top },
                villainDecks: villainSecDecks.map((_, i) => ({
                    hidden: document.getElementById('board-villain-deck-'+i).classList.contains('hidden'),
                    left: document.getElementById('board-villain-deck-'+i).style.left,
                    top: document.getElementById('board-villain-deck-'+i).style.top,
                    name: document.getElementById('board-villain-deck-'+i).innerHTML
                })),
                villainDiscards: villainSecDiscards.map((_, i) => ({
                    hidden: document.getElementById('board-villain-discard-'+i).classList.contains('hidden'),
                    left: document.getElementById('board-villain-discard-'+i).style.left,
                    top: document.getElementById('board-villain-discard-'+i).style.top
                })),
                jetonToken: { hidden: boardJetonToken.classList.contains('hidden'), left: boardJetonToken.style.left, top: boardJetonToken.style.top, zIndex: boardJetonToken.style.zIndex }
            },
            
            cards: []
        };
        
        document.querySelectorAll('.card').forEach(card => {
            state.cards.push({
                id: card.id,
                dataset: { ...card.dataset }, 
                inHand: card.classList.contains('in-hand'),
                exhausted: card.classList.contains('exhausted'),
                x: card.style.left,
                y: card.style.top,
                zIndex: card.style.zIndex
            });
        });
        
        const stateString = JSON.stringify(state);
        localStorage.setItem('marvelVTT_save', stateString);

        if (!isUndoing && !resetInProgress && !isAutoSave) {
            if (stateHistory.length === 0 || stateHistory[stateHistory.length - 1] !== stateString) {
                stateHistory.push(stateString);
                if (stateHistory.length > 16) { 
                    stateHistory.shift(); 
                }
                updateUndoButton();
            }
        }
        
    } catch (e) {
        console.error("Erreur lors de la sauvegarde :", e);
    }
}

setInterval(() => saveGameState(true), 3000); 

window.addEventListener('beforeunload', () => saveGameState(true));
document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === 'hidden') saveGameState(true);
});

// --- EXPORT / IMPORT DE LA PARTIE (FICHIER JSON) ---
const btnExportSave = document.getElementById('btn-export-save');
const btnImportSave = document.getElementById('btn-import-save');
const importSaveInput = document.getElementById('import-save-input');

if (btnExportSave) {
    btnExportSave.addEventListener('click', () => {
        saveGameState();
        const data = localStorage.getItem('marvelVTT_save');
        if (!data) { alert("Aucune partie en cours à exporter."); return; }

        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const dateStr = new Date().toISOString().slice(0, 10);
        a.href = url;
        a.download = `marvel-champions-partie-${dateStr}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    });
}

if (btnImportSave && importSaveInput) {
    btnImportSave.addEventListener('click', () => importSaveInput.click());

    importSaveInput.addEventListener('change', () => {
        const file = importSaveInput.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
            try {
                const parsed = JSON.parse(reader.result);
                if (!parsed || !Array.isArray(parsed.cards)) throw new Error("Format invalide");

                if (!confirm("Importer cette partie remplacera la partie en cours. Continuer ?")) return;

                localStorage.setItem('marvelVTT_save', reader.result);
                location.reload();
            } catch (e) {
                alert("Fichier de sauvegarde invalide ou corrompu.");
            } finally {
                importSaveInput.value = '';
            }
        };
        reader.readAsText(file);
    });
}

function loadGameState() {
    const saved = localStorage.getItem('marvelVTT_save');
    if (!saved) {
        initMenus();
        return;
    }

    try {
        const state = JSON.parse(saved);
        
        if (!state.version || state.version !== GAME_VERSION) {
            console.log("Nouvelle version du site détectée ! Réinitialisation des données...");
            localStorage.removeItem('marvelVTT_save');
            initMenus();
            return;
        }

        myDeck = state.myDeck || [];
        discardPile = state.discardPile || [];
        encounterDeck = state.encounterDeck || [];
        encounterDiscardPile = state.encounterDiscardPile || [];
        
        heroSecDeck = state.heroSecDeck || [];
        heroSecDiscard = state.heroSecDiscard || [];
        heroSecCodes = state.heroSecCodes || [];
        villainSecDecks = state.villainSecDecks || [[], [], []];
        villainSecDiscards = state.villainSecDiscards || [[], [], []];
        villainSecCodes = state.villainSecCodes || [[], [], []];
        
        setAsideCards = state.setAsideCards || [];
        banishedCards = state.banishedCards || [];

        currentHeroId = state.currentHeroId || null;
        window.currentHeroNemesis = state.heroNemesis || { obligation: null, set: [] };
        currentVillainStages = state.currentVillainStages || [];
        currentVillainStageIndex = state.currentVillainStageIndex || 0;
        currentVillainSchemes = state.currentVillainSchemes || [];
        currentSchemeIndex = state.currentSchemeIndex || 0;
        currentVillainIsDeck = state.currentVillainIsDeck || false;
        currentVillainDeckExpert = state.currentVillainDeckExpert || false;

        boardX = state.boardX || (-CENTER_X + window.innerWidth / 2);
        boardY = state.boardY || (-CENTER_Y + window.innerHeight / 2);
        scale = state.scale || 1;
        updateCamera();

        if (state.heroHandSize) {
            heroHandSizeSpan.innerText = state.heroHandSize;
        }

        if (state.currentPhaseIndex !== undefined) {
            phases[currentPhaseIndex].classList.remove('active');
            currentPhaseIndex = state.currentPhaseIndex;
            if (phases[currentPhaseIndex]) phases[currentPhaseIndex].classList.add('active');
        }

        if (state.boardPiles) {
            let hd = document.getElementById('board-hero-deck');
            let hdd = document.getElementById('board-hero-discard');
            if(state.boardPiles.heroDeck && hd) { hd.classList.toggle('hidden', state.boardPiles.heroDeck.hidden); hd.style.left = state.boardPiles.heroDeck.left; hd.style.top = state.boardPiles.heroDeck.top; }
            if(state.boardPiles.heroDiscard && hdd) { hdd.classList.toggle('hidden', state.boardPiles.heroDiscard.hidden); hdd.style.left = state.boardPiles.heroDiscard.left; hdd.style.top = state.boardPiles.heroDiscard.top; }
            
            if (state.boardPiles.villainDecks) {
                state.boardPiles.villainDecks.forEach((vd, i) => {
                    let dom = document.getElementById('board-villain-deck-'+i);
                    if (dom && vd) {
                        dom.classList.toggle('hidden', vd.hidden);
                        dom.style.left = vd.left;
                        dom.style.top = vd.top;
                        if (vd.name) dom.innerHTML = vd.name;
                    }
                });
            }
            if (state.boardPiles.villainDiscards) {
                state.boardPiles.villainDiscards.forEach((vdd, i) => {
                    let dom = document.getElementById('board-villain-discard-'+i);
                    if (dom && vdd) {
                        dom.classList.toggle('hidden', vdd.hidden);
                        dom.style.left = vdd.left;
                        dom.style.top = vdd.top;
                    }
                });
            }
            if (state.boardPiles.jetonToken) {
                const jt = state.boardPiles.jetonToken;
                boardJetonToken.classList.toggle('hidden', jt.hidden);
                if (jt.left) boardJetonToken.style.left = jt.left;
                if (jt.top) boardJetonToken.style.top = jt.top;
                if (jt.zIndex) boardJetonToken.style.zIndex = jt.zIndex;
            }
        }

        if (btnAddNemesis && window.currentHeroNemesis && window.currentHeroNemesis.set.length > 0) {
            btnAddNemesis.classList.remove('hidden');
        }

        updateDeckCounters();
        board.querySelectorAll('.card').forEach(c => c.remove());
        handArea.innerHTML = '';
        
        state.cards.forEach(cardState => {
            try {
                if (!cardState.dataset || !cardState.dataset.cardData) return;
                
                const cardData = JSON.parse(cardState.dataset.cardData);
                const dom = buildCardDOM(cardData, cardState.dataset.backUrl);
                
                for(let key in cardState.dataset) {
                    dom.dataset[key] = cardState.dataset[key];
                }
                dom.id = cardState.id || "";
                syncTokenVisuals(dom);
                
                if (cardState.dataset.flipped === "true") {
                    dom.querySelector('.card-front').src = dom.dataset.backUrl;
                }

                if (cardState.exhausted) dom.classList.add('exhausted');
                
                updateCardOrientation(dom);

                if (cardState.inHand) {
                    putInHand(dom);
                } else {
                    dom.style.left = cardState.x;
                    dom.style.top = cardState.y;
                    dom.style.zIndex = cardState.zIndex;
                    board.appendChild(dom);
                }
                
                if (parseInt(cardState.zIndex) >= topZIndex) topZIndex = parseInt(cardState.zIndex) + 1;
            } catch (err) {
                console.error("Impossible de charger une carte :", err);
            }
        });

        if (stateHistory.length === 0) {
            stateHistory.push(saved);
            updateUndoButton();
        }
        
    } catch (e) {
        console.error("Erreur de chargement :", e);
    }
    
    initMenus();
}

document.addEventListener("DOMContentLoaded", async () => {
    const dmgBtn = document.querySelector('.token-btn[data-type="damage"]');
    if (dmgBtn) {
        dmgBtn.dataset.basetext = "PV";
        dmgBtn.innerText = "PV";
    }

    const heroHpInput = document.getElementById('hero-hp-input');
    if (heroHpInput) heroHpInput.style.display = 'none'; 

    const tokenBar = document.getElementById('token-bar');
    if (tokenBar) {
        tokenBar.insertAdjacentHTML('beforeend', `
            <div class="token-divider"></div>
            <button id="btn-side-cards" class="token-btn token-stunned">De Côté</button>
            <button id="btn-banished-cards" class="token-btn token-damage">Bannies (<span id="banished-count">0</span>)</button>
        `);
        
        document.getElementById('btn-side-cards').addEventListener('click', (e) => {
            e.stopPropagation();
            openInspectModal('out-of-play');
        });
        document.getElementById('btn-banished-cards').addEventListener('click', (e) => {
            e.stopPropagation();
            openInspectModal('banished');
        });
    }
    
    setupDeckInteractions('deck', 'player');
    setupDeckInteractions('encounter-deck', 'encounter');
    setupDeckInteractions('board-hero-deck', 'hero-sec');
    for(let i = 0; i < 3; i++) {
        setupDeckInteractions('board-villain-deck-' + i, 'villain-sec-' + i);
    }

    setupDiscardInteractions('discard-pile', 'player');
    setupDiscardInteractions('encounter-discard-pile', 'encounter');
    setupDiscardInteractions('board-hero-discard', 'hero-sec');
    for(let i = 0; i < 3; i++) {
        setupDiscardInteractions('board-villain-discard-' + i, 'villain-sec-' + i);
    }

    loadGameState();
});
