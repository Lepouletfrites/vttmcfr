// save.js — Sauvegarde : localStorage, export/import JSON, initialisation au chargement
// (scripts classiques chargés dans l'ordre par index.html : les variables et fonctions
//  de premier niveau sont partagées entre tous les fichiers)

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

        if (document.getElementById('hero-card-element')) heroTracker.classList.remove('hidden');

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
