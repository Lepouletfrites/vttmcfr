// decks.js — Decks du joueur : MarvelCDB, « Mes decks » hors-ligne, mise en place du héros
// (scripts classiques chargés dans l'ordre par index.html : les variables et fonctions
//  de premier niveau sont partagées entre tous les fichiers)

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
async function fetchDeckFromCDB(deckId) {
    const endpoints = [
        `https://marvelcdb.com/api/public/decklist/${deckId}.json`,
        `https://marvelcdb.com/api/public/deck/${deckId}.json`
    ];
    for (let url of endpoints) {
        try {
            let res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                if (data && data.slots) return data;
            }
        } catch (e) {}
    }
    return null;
}

// On ne garde que ce qui sert à jouer : suffisant pour relancer le deck sans connexion.
function compactDeckData(d) {
    return {
        name: d.name || null,
        hero_code: d.hero_code || d.investigator_code,
        investigator_name: d.investigator_name || d.hero_name || null,
        slots: d.slots
    };
}

function parseDeckIdInput(inputVal) {
    const urlMatch = inputVal.match(/(?:decklist|deck)\/(?:view|edit)?\/?(\d+)/);
    const fallbackMatch = inputVal.match(/\d+/);
    return urlMatch ? urlMatch[1] : (fallbackMatch ? fallbackMatch[0] : null);
}

// Charge un deck : d'abord la copie hors-ligne si elle existe (instantané, marche sans réseau),
// sinon MarvelCDB. forceOnline = true pour récupérer la dernière version publiée.
async function loadCustomDeckById(deckId, forceOnline = false) {
    btnLoadCustomDeck.disabled = true;
    btnLoadCustomDeck.innerText = "Chargement...";

    try {
        const saved = getSavedDecks().find(d => d.id === deckId);
        let deckData = (!forceOnline && saved && saved.data) ? saved.data : null;
        if (!deckData) deckData = await fetchDeckFromCDB(deckId);
        if (!deckData && saved && saved.data) deckData = saved.data; // hors-ligne : repli sur la copie
        if (!deckData || !deckData.slots) throw new Error("Deck introuvable");

        await startDeck(deckData, deckId, saved && saved.source);
    } catch (error) {
        alert(navigator.onLine === false
            ? "Pas de connexion et ce deck n'est pas enregistré hors-ligne."
            : "Erreur lors du chargement du deck.");
    }
    btnLoadCustomDeck.disabled = false;
    btnLoadCustomDeck.innerText = "Charger";
}

// Met en jeu un deck (format MarvelCDB : hero_code + slots) et l'enregistre dans "Mes decks".
async function startDeck(deckData, deckId, source = 'cdb') {
    // Un héros est déjà en jeu : on retire tout le côté joueur (le scénario reste en place),
    // sinon l'ancien héros et ses cartes restent sur le plateau à côté du nouveau.
    if (document.getElementById('hero-card-element')) {
        if (!confirm("Un héros est déjà en jeu. Le remplacer par ce deck ?\n(Le scénario en cours est conservé.)")) return;
        document.querySelectorAll('.card').forEach(card => {
            if (card.dataset.faction !== 'encounter' && card.dataset.faction !== 'villain') card.remove();
        });
        handArea.innerHTML = '';
        discardPile = [];
        heroSecDeck = []; heroSecDiscard = []; heroSecCodes = [];
        ['board-hero-deck', 'board-hero-discard'].forEach(id => document.getElementById(id).classList.add('hidden'));
        if (btnAddNemesis) btnAddNemesis.classList.add('hidden');
    }
    {
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

        rememberDeck(deckId, deckData.name || heroDisplayName || `Deck #${deckId}`, deckData, source);

        modalMenu.classList.add('hidden');
        saveGameState();
    }
}

btnLoadCustomDeck.addEventListener('click', () => {
    const deckId = parseDeckIdInput(deckUrlInput.value.trim());
    if (!deckId) { alert("Veuillez entrer une URL ou un ID valide (ex: 63906)."); return; }
    loadCustomDeckById(deckId);
});

// Enregistrer un deck MarvelCDB sans le lancer (pour l'avoir hors-ligne plus tard)
const btnSaveCdbDeck = document.getElementById('btn-save-cdb-deck');
if (btnSaveCdbDeck) {
    btnSaveCdbDeck.addEventListener('click', async () => {
        const deckId = parseDeckIdInput(deckUrlInput.value.trim());
        if (!deckId) { alert("Veuillez entrer une URL ou un ID valide (ex: 63906)."); return; }
        btnSaveCdbDeck.disabled = true;
        btnSaveCdbDeck.innerText = "…";
        const data = await fetchDeckFromCDB(deckId);
        btnSaveCdbDeck.disabled = false;
        btnSaveCdbDeck.innerText = "💾 Enregistrer";
        if (!data) { alert("Deck introuvable sur MarvelCDB (il doit être public)."); return; }
        const hero = localDatabase[data.hero_code];
        rememberDeck(deckId, data.name || (hero && hero.name) || `Deck #${deckId}`, data, 'cdb');
        deckUrlInput.value = '';
    });
}

// --- MES DECKS (MARVELCDB ET CRÉÉS ICI), STOCKÉS AVEC LEUR CONTENU POUR LE HORS-LIGNE ---
const SAVED_DECKS_KEY = 'marvelVTT_savedDecks';

function getSavedDecks() {
    try { return JSON.parse(localStorage.getItem(SAVED_DECKS_KEY)) || []; } catch (e) { return []; }
}

function persistSavedDecks(list) {
    localStorage.setItem(SAVED_DECKS_KEY, JSON.stringify(list));
}

function rememberDeck(deckId, name, deckData = null, source = 'cdb') {
    const previous = getSavedDecks().find(d => d.id === deckId);
    let list = getSavedDecks().filter(d => d.id !== deckId);
    list.unshift({
        id: deckId,
        name: name || `Deck #${deckId}`,
        ts: Date.now(),
        source: source || (previous && previous.source) || 'cdb',
        data: deckData ? compactDeckData(deckData) : (previous ? previous.data : null)
    });
    if (list.length > 50) list = list.slice(0, 50);
    persistSavedDecks(list);
    renderSavedDecks();
    if (deckData) precacheDeckImages(deckData);
}

// Télécharge en arrière-plan les images des cartes du deck : le service worker les garde
// en cache, donc le deck s'affiche correctement même sans connexion.
function precacheDeckImages(deckData) {
    if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) return;
    const codes = new Set(Object.keys(deckData.slots || {}));
    const heroBase = (deckData.hero_code || '').replace(/[ab]$/, '');
    if (heroBase) { codes.add(heroBase + 'a'); codes.add(heroBase + 'b'); }
    codes.forEach(code => {
        const card = localDatabase[code];
        if (!card) return;
        const url = getImageUrl(card);
        if (url) fetch(url, { mode: 'cors' }).catch(() => {});
    });
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
    list.innerHTML = decks.map(d => {
        const heroCard = d.data && localDatabase[d.data.hero_code];
        const count = d.data ? Object.values(d.data.slots).reduce((a, b) => a + b, 0) : null;
        const thumb = heroCard ? getImageUrl(heroCard) : null;
        const isCustom = d.source === 'custom';
        const meta = [
            isCustom ? 'Créé ici' : `MarvelCDB #${d.id}`,
            count !== null ? `${count} cartes` : null,
            d.data ? '<span class="offline-ok" title="Jouable sans connexion">✓ hors-ligne</span>' : '<span class="offline-no" title="Lancez-le une fois connecté pour l\'avoir hors-ligne">en ligne seulement</span>'
        ].filter(Boolean).join(' · ');
        return `
        <div class="saved-deck-item">
            ${thumb ? `<img class="saved-deck-thumb" src="${thumb}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">` : '<div class="saved-deck-thumb">🦸</div>'}
            <div class="saved-deck-info">
                <span class="saved-deck-name">${escapeHtml(d.name)}</span>
                <span class="saved-deck-meta">${meta}</span>
            </div>
            <button class="saved-deck-load" data-deck-id="${d.id}">▶ Jouer</button>
            ${d.data ? `<button class="saved-deck-icon" data-action="edit" data-deck-id="${d.id}" title="Modifier dans le créateur de deck">✏️</button>` : ''}
            ${!isCustom ? `<button class="saved-deck-icon" data-action="refresh" data-deck-id="${d.id}" title="Mettre à jour depuis MarvelCDB">↻</button>` : ''}
            <button class="saved-deck-icon saved-deck-delete" data-action="delete" data-deck-id="${d.id}" title="Supprimer">🗑</button>
        </div>`;
    }).join('');

    list.querySelectorAll('.saved-deck-load').forEach(btn => {
        btn.addEventListener('click', () => loadCustomDeckById(btn.dataset.deckId));
    });
    list.querySelectorAll('.saved-deck-icon').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const id = btn.dataset.deckId;
            if (btn.dataset.action === 'delete') {
                const d = getSavedDecks().find(x => x.id === id);
                if (confirm(`Supprimer « ${d ? d.name : id} » de vos decks ?`)) forgetDeck(id);
            } else if (btn.dataset.action === 'refresh') {
                btn.disabled = true;
                const data = await fetchDeckFromCDB(id);
                btn.disabled = false;
                if (!data) { alert("Impossible de joindre MarvelCDB (hors-ligne ou deck privé)."); return; }
                const hero = localDatabase[data.hero_code];
                rememberDeck(id, data.name || (hero && hero.name), data, 'cdb');
            } else if (btn.dataset.action === 'edit') {
                openDeckBuilderWith(id);
            }
        });
    });
}

function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
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
        // La défausse n'avait jamais de position assignée (seul le deck en recevait une, et deux
        // fois de suite) : elle restait invisible/mal placée sur le plateau. Empilée sous le deck,
        // comme pour les decks spéciaux de méchant (deployVillainSecDeck).
        hd.style.left = (spawnX + 440) + "px";
        hd.style.top = (spawnY) + "px";
        hdd.style.left = (spawnX + 440) + "px";
        hdd.style.top = (spawnY + 180) + "px";
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
