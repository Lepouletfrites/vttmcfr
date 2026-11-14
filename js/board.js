// board.js — Plateau : glisser-déposer, menus contextuels, raccourcis, inspection, caméra, zoom
// (scripts classiques chargés dans l'ordre par index.html : les variables et fonctions
//  de premier niveau sont partagées entre tous les fichiers)

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
            showZoom(isFlipped ? element.dataset.backUrl : element.dataset.frontUrl, element);
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
    if (!modalMenu.classList.contains('hidden')) return; // pas de raccourcis de jeu quand le menu est ouvert

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
    // Une carte d'un deck à part (Sens de Daredevil, Invocations de Strange, decks spéciaux
    // de méchant…) retourne dans SON deck, pas dans la pioche principale — même règle que la défausse.
    let pile = isEncounter ? encounterDeck : myDeck;
    if (heroSecCodes.includes(code)) pile = heroSecDeck;
    else {
        for (let i = 0; i < 3; i++) {
            if (villainSecCodes[i] && villainSecCodes[i].includes(code)) { pile = villainSecDecks[i]; break; }
        }
    }
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


// anchorEl (optionnel) : la carte cliquée. L'aperçu s'affiche du côté opposé de l'écran pour
// ne jamais la recouvrir (une carte tout à gauche ouvrait l'aperçu… par-dessus elle-même).
function showZoom(imageUrl, anchorEl = null) {
    if (imageUrl) {
        zoomImg.src = imageUrl;
        let right = false;
        if (anchorEl && anchorEl.getBoundingClientRect) {
            const r = anchorEl.getBoundingClientRect();
            right = r.left + r.width / 2 < window.innerWidth / 2;
        }
        floatingZoom.classList.toggle('zoom-right', right);
        floatingZoom.style.top = '';
        floatingZoom.style.right = '';
        zoomImg.style.maxHeight = '';
        if (right) {
            // À droite : on se met À CÔTÉ du panneau des phases (même taille que l'aperçu de gauche),
            // plutôt qu'en dessous où il restait trop peu de hauteur et la carte était minuscule.
            const phasePanel = document.getElementById('phase-panel');
            const pr = phasePanel && !phasePanel.classList.contains('hidden') ? phasePanel.getBoundingClientRect() : null;
            if (pr && pr.width > 0) {
                // Sous l'écran étroit, pas la place à côté : on reste collé au bord droit, sous le panneau.
                if (pr.left > window.innerWidth * 0.6) {
                    floatingZoom.style.right = (window.innerWidth - pr.left + 10) + 'px';
                } else {
                    const hud = document.getElementById('bottom-hud');
                    const top = pr.bottom + 10;
                    const bottom = hud ? hud.getBoundingClientRect().top - 10 : window.innerHeight - 10;
                    if (bottom - top >= 220) {
                        floatingZoom.style.top = top + 'px';
                        zoomImg.style.maxHeight = (bottom - top) + 'px';
                    }
                }
            }
        }
        floatingZoom.classList.remove('hidden');
    }
}

// Une carte paysage occupe déjà toute la largeur disponible en restant lisible, donc son zoom
// n'a pas besoin d'être aussi grand qu'un zoom portrait : on détecte l'orientation réelle de
// l'image chargée (pas la carte source) pour rester correct même pour les images externes.
zoomImg.addEventListener('load', () => {
    floatingZoom.classList.toggle('zoom-landscape', zoomImg.naturalWidth > zoomImg.naturalHeight);
});

function hideZoom() {
    floatingZoom.classList.add('hidden');
}

floatingZoom.addEventListener('click', hideZoom);

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [array[i], array[j]] = [array[j], array[i]]; }
}
