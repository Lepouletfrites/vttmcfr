// scenario.js — Scénario : nettoyage du plateau et déploiement du méchant / des modulaires
// (scripts classiques chargés dans l'ordre par index.html : les variables et fonctions
//  de premier niveau sont partagées entre tous les fichiers)

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
