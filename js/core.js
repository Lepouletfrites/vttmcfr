// core.js — Cœur : version, service worker, base de cartes, éléments du DOM, état global, annuler
// (scripts classiques chargés dans l'ordre par index.html : les variables et fonctions
//  de premier niveau sont partagées entre tous les fichiers)

// --- VERSION DU JEU (Change ce numéro pour forcer le nettoyage du cache/localStorage chez les utilisateurs) ---
const GAME_VERSION = "6.6"; // Fix: la défausse du deck spécial héros (ex: Doctor Strange) n'avait jamais de position sur le plateau
// (6.7 côté fichiers ?v= : menu en onglets + taille de main modifiable — format de sauvegarde inchangé, donc pas de reset)

// --- PWA : SERVICE WORKER (HORS-LIGNE) ---
// Uniquement en http(s) : un index.html ouvert en file:// ne peut pas en avoir.
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(err => console.warn('Service worker non installé :', err));
    });
}

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

// Taille de main modifiable (ex: Iron Man, dont la main grandit avec ses améliorations Tech).
// La valeur est mémorisée sur la carte héros pour la face visible : retourner la carte
// restaure la taille propre à l'autre face (voir flipCard).
function setHandSize(n) {
    n = Math.max(0, Math.min(20, n));
    heroHandSizeSpan.innerText = n;
    const hero = document.getElementById('hero-card-element');
    if (hero) {
        if (hero.dataset.flipped === 'true') hero.dataset.handSizeB = n;
        else hero.dataset.handSizeA = n;
    }
    saveGameState();
}
document.getElementById('hand-size-minus').addEventListener('click', () => setHandSize((parseInt(heroHandSizeSpan.innerText) || 0) - 1));
document.getElementById('hand-size-plus').addEventListener('click', () => setHandSize((parseInt(heroHandSizeSpan.innerText) || 0) + 1));

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

// Caméra du plateau (définie ici car appelée dès le chargement)
function updateCamera() { board.style.transform = `translate(${boardX}px, ${boardY}px) scale(${scale})`; }

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
