// gameplay.js — Système de jeu : jetons, phases, pioche, piles, cartes et leurs actions
// (scripts classiques chargés dans l'ordre par index.html : les variables et fonctions
//  de premier niveau sont partagées entre tous les fichiers)

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
