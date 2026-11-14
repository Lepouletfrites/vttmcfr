// menu.js — Menu principal : onglets, résumé du scénario, sélecteur de méchants, recherche de carte
// (scripts classiques chargés dans l'ordre par index.html : les variables et fonctions
//  de premier niveau sont partagées entre tous les fichiers)


btnOpenMenu.addEventListener('click', () => modalMenu.classList.remove('hidden'));
modalMenuClose.addEventListener('click', () => modalMenu.classList.add('hidden'));

// --- ONGLETS DU MENU PRINCIPAL ---
const MENU_TAB_KEY = 'marvelVTT_menuTab';
function showMenuTab(name) {
    modalMenu.querySelector('.menu-modal').classList.toggle('menu-wide', name === 'builder');
    if (name === 'builder') { dbInit(); dbRenderAll(); }
    modalMenu.querySelectorAll('.menu-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
    modalMenu.querySelectorAll('.menu-panel').forEach(p => p.classList.toggle('active', p.dataset.panel === name));
    try { localStorage.setItem(MENU_TAB_KEY, name); } catch (e) {}
    if (name === 'card' && cardSearchInput) setTimeout(() => cardSearchInput.focus(), 0);
}
modalMenu.querySelectorAll('.menu-tab').forEach(t => t.addEventListener('click', () => showMenuTab(t.dataset.tab)));
// Après l'exécution complète du script (le créateur de deck est défini plus bas)
document.addEventListener('DOMContentLoaded', () => {
    try {
        const savedTab = localStorage.getItem(MENU_TAB_KEY);
        if (savedTab && modalMenu.querySelector(`.menu-tab[data-tab="${savedTab}"]`)) showMenuTab(savedTab);
    } catch (e) {}
});

// Entrée dans le champ de deck = Charger
document.getElementById('deck-url-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('btn-load-custom-deck').click();
});

// Résumé du scénario en bas de l'onglet (méchant · difficulté · modulaires)
function updateScenarioSummary() {
    const el = document.getElementById('scenario-summary');
    if (!el || typeof MARVEL_DB === 'undefined') return;
    const v = selectedVillainId && MARVEL_DB.villains.find(x => x.id === selectedVillainId);
    const std = document.querySelector('input[name="diff-std"]:checked');
    const exp = document.querySelector('input[name="diff-exp"]:checked');
    const roman = { standard_1: 'I', standard_2: 'II', standard_3: 'III', expert_1: 'I', expert_2: 'II' };
    const diff = [];
    if (std && std.value !== 'none') diff.push('Standard ' + roman[std.value]);
    if (exp && exp.value !== 'none') diff.push('Expert ' + roman[exp.value]);

    const def = document.getElementById('mod-default-checkbox');
    const picked = document.querySelectorAll('.mod-checkbox:checked').length;
    const mods = [];
    if (def && def.checked) mods.push('modulaires par défaut');
    if (picked) mods.push(`+${picked} modulaire${picked > 1 ? 's' : ''}`);
    const badge = document.getElementById('modular-count');
    if (badge) badge.textContent = picked ? picked : '';

    el.innerHTML = v
        ? `<b>${v.name}</b><small>${[diff.join(' + ') || 'Sans difficulté', mods.join(' ') || 'aucun modulaire'].join(' · ')}</small>`
        : 'Choisissez un méchant';
}
modalMenu.addEventListener('change', updateScenarioSummary);

// Filtre des modulaires
const modularSearch = document.getElementById('modular-search');
if (modularSearch) {
    modularSearch.addEventListener('input', () => {
        const q = modularSearch.value.trim().toLowerCase();
        document.querySelectorAll('#modular-list .modular-option:not(.modular-option-default)').forEach(opt => {
            opt.classList.toggle('hidden', !opt.textContent.toLowerCase().includes(q));
        });
    });
}

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
    updateScenarioSummary();
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
            updateScenarioSummary();
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
