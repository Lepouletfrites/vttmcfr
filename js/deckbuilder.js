// ==========================================
// CRÉATEUR DE DECK (façon MarvelCDB)
// ==========================================
// Utilise la base locale (cards.js) : fonctionne hors-ligne. Un deck créé ici est stocké
// dans "Mes decks" au même format que MarvelCDB (hero_code + slots), donc il se joue
// exactement comme un deck importé.

const DB_ASPECTS = [
    { code: 'aggression', name: 'Agressivité', color: '#e5484d' },
    { code: 'justice', name: 'Justice', color: '#f2c94c' },
    { code: 'leadership', name: 'Commandement', color: '#4da3ff' },
    { code: 'protection', name: 'Protection', color: '#2fbf78' },
    { code: 'pool', name: "'Pool", color: '#e86ab0' }
];
const DB_FACTION_INFO = Object.fromEntries([
    ...DB_ASPECTS.map(a => [a.code, a]),
    ['basic', { code: 'basic', name: 'Basique', color: '#9fb0c6' }],
    ['hero', { code: 'hero', name: 'Héros', color: '#f2b705' }]
]);
const DB_PLAYER_TYPES = ['ally', 'event', 'upgrade', 'support', 'resource', 'player_side_scheme'];
const DB_TYPE_NAMES = {
    ally: 'Alliés', event: 'Événements', upgrade: 'Améliorations', support: 'Soutiens',
    resource: 'Ressources', player_side_scheme: 'Manigances annexes'
};
const DB_PAGE = 60;
const DB_MIN_CARDS = 40, DB_MAX_CARDS = 50;

var dbState = {
    heroCode: '',
    name: '',
    aspects: new Set(),
    counts: {},          // code -> quantité (hors cartes du héros)
    editingId: null,     // id d'un deck "créé ici" en cours de modification
    limit: DB_PAGE
};
var dbPool = null, dbHeroes = null;

function dbEl(id) { return document.getElementById(id); }

function dbStrip(html) { return String(html || '').replace(/<[^>]+>/g, ' ').replace(/\[\[|\]\]/g, ''); }

function dbInit() {
    if (dbPool || typeof CARDS_DATA === 'undefined') return;

    dbHeroes = CARDS_DATA
        .filter(c => c.type_code === 'hero' && !c.duplicate_of_code)
        .sort((a, b) => a.name.localeCompare(b.name, 'fr'));

    dbPool = CARDS_DATA.filter(c =>
        DB_PLAYER_TYPES.includes(c.type_code) &&
        (DB_FACTION_INFO[c.faction_code] && c.faction_code !== 'hero') &&
        !c.duplicate_of_code
    );
    dbPool.forEach(c => {
        c._search = [c.name, c.real_name, c.traits, c.real_traits, dbStrip(c.text), dbStrip(c.real_text)]
            .join(' ').toLowerCase();
    });

    dbEl('db-hero').innerHTML = '<option value="">— Choisir un héros —</option>' +
        dbHeroes.map(h => `<option value="${h.code}">${escapeHtml(h.name)} (${escapeHtml(h.pack_name)})</option>`).join('');

    dbEl('db-faction').innerHTML =
        '<option value="deck">Aspects du deck + Basique</option><option value="all">Tous les aspects</option>' +
        [...DB_ASPECTS, DB_FACTION_INFO.basic].map(a => `<option value="${a.code}">${a.name}</option>`).join('');

    const packs = [];
    CARDS_DATA.forEach(c => { if (!packs.find(p => p.code === c.pack_code)) packs.push({ code: c.pack_code, name: c.pack_name }); });
    dbEl('db-pack').innerHTML = '<option value="">Toutes les extensions</option>' +
        packs.map(p => `<option value="${p.code}">${escapeHtml(p.name)}</option>`).join('');

    dbEl('db-aspects').innerHTML = DB_ASPECTS.map(a =>
        `<button class="db-aspect" data-aspect="${a.code}" style="--aspect:${a.color}">${a.name}</button>`
    ).join('');

    // --- Écouteurs ---
    dbEl('db-hero').addEventListener('change', () => { dbState.heroCode = dbEl('db-hero').value; dbRenderAll(); });
    dbEl('db-name').addEventListener('input', () => { dbState.name = dbEl('db-name').value; });
    dbEl('db-aspects').addEventListener('click', (e) => {
        const btn = e.target.closest('.db-aspect');
        if (!btn) return;
        const a = btn.dataset.aspect;
        dbState.aspects.has(a) ? dbState.aspects.delete(a) : dbState.aspects.add(a);
        dbState.limit = DB_PAGE;
        dbRenderAll();
    });
    let searchTimer = null;
    dbEl('db-search').addEventListener('input', () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => { dbState.limit = DB_PAGE; dbRenderResults(); }, 150);
    });
    ['db-type', 'db-faction', 'db-cost', 'db-pack', 'db-only-deck'].forEach(id =>
        dbEl(id).addEventListener('change', () => { dbState.limit = DB_PAGE; dbRenderResults(); }));
    dbEl('db-more').addEventListener('click', () => { dbState.limit += DB_PAGE; dbRenderResults(); });

    // +/- et aperçu (délégation : la grille est régénérée à chaque filtre)
    const onCardClick = (e) => {
        const btn = e.target.closest('[data-db-add], [data-db-sub]');
        if (btn) {
            const code = btn.dataset.dbAdd || btn.dataset.dbSub;
            dbChange(code, btn.dataset.dbAdd ? 1 : -1);
            return;
        }
        // Clic n'importe où sur la carte (ou sur un nom dans le deck) → aperçu
        const target = e.target.closest('[data-db-zoom], .db-card');
        if (target) {
            const code = target.dataset.dbZoom || target.dataset.code;
            const inDeckList = !!e.target.closest('#db-deck-list');
            dbOpenPreview(code, inDeckList ? 'deck' : 'results');
        }
    };
    dbEl('db-results').addEventListener('click', onCardClick);
    dbEl('db-deck-list').addEventListener('click', onCardClick);

    // Aperçu
    dbEl('db-preview').addEventListener('click', (e) => { if (e.target.id === 'db-preview') dbClosePreview(); });
    dbEl('db-preview-close').addEventListener('click', dbClosePreview);
    dbEl('db-preview-prev').addEventListener('click', () => dbStepPreview(-1));
    dbEl('db-preview-next').addEventListener('click', () => dbStepPreview(1));
    dbEl('db-preview-add').addEventListener('click', () => { dbChange(dbPreview.code, 1); dbRenderPreview(); });
    dbEl('db-preview-sub').addEventListener('click', () => { dbChange(dbPreview.code, -1); dbRenderPreview(); });
    dbEl('db-preview-img').addEventListener('error', () => dbEl('db-preview-img').classList.add('broken'));
    document.addEventListener('keydown', (e) => {
        if (dbEl('db-preview').classList.contains('hidden')) return;
        if (e.key === 'Escape') { e.stopPropagation(); dbClosePreview(); }
        else if (e.key === 'ArrowLeft') dbStepPreview(-1);
        else if (e.key === 'ArrowRight') dbStepPreview(1);
        else if (e.key === '+' || e.key === '=') dbEl('db-preview-add').click();
        else if (e.key === '-') dbEl('db-preview-sub').click();
    });

    dbEl('db-new').addEventListener('click', () => {
        if (dbTotalPlayerCards() > 0 && !confirm('Vider le deck en cours ?')) return;
        dbState.counts = {};
        dbState.name = '';
        dbState.editingId = null;
        dbState.aspects = new Set();
        dbRenderAll();
    });
    dbEl('db-save').addEventListener('click', () => { if (dbSave()) alert('💾 Deck enregistré dans « Mes decks » (onglet Héros).'); });
    dbEl('db-play').addEventListener('click', async () => {
        const saved = dbSave();
        if (!saved) return;
        await startDeck(saved.data, saved.id, 'custom');
    });
}

function dbHero() { return dbState.heroCode ? localDatabase[dbState.heroCode] : null; }

// Cartes propres au héros (toujours incluses, comme sur MarvelCDB)
function dbHeroCards() {
    const hero = dbHero();
    if (!hero || !hero.card_set_code) return [];
    return CARDS_DATA.filter(c =>
        c.card_set_code === hero.card_set_code &&
        c.faction_code === 'hero' &&
        !['hero', 'alter_ego', 'obligation'].includes(c.type_code)
    );
}

function dbLimit(card) { return card.deck_limit || 3; }
function dbTotalPlayerCards() { return Object.values(dbState.counts).reduce((a, b) => a + b, 0); }
function dbTotalCards() { return dbTotalPlayerCards() + dbHeroCards().reduce((a, c) => a + (c.quantity || 1), 0); }

// Une carte est jouable si elle n'appartient à aucun set (carte d'aspect/basique classique)
// ou au set du héros choisi (ex : cartes d'aspect spécifiques à Spider-Woman).
function dbAllowedForHero(card) {
    const hero = dbHero();
    return !card.card_set_code || (hero && card.card_set_code === hero.card_set_code);
}

function dbFilteredPool() {
    const q = dbEl('db-search').value.trim().toLowerCase();
    const type = dbEl('db-type').value;
    const faction = dbEl('db-faction').value;
    const cost = dbEl('db-cost').value;
    const pack = dbEl('db-pack').value;
    const onlyDeck = dbEl('db-only-deck').checked;

    return dbPool.filter(c => {
        if (!dbAllowedForHero(c)) return false;
        if (onlyDeck && !dbState.counts[c.code]) return false;
        if (type && c.type_code !== type) return false;
        if (pack && c.pack_code !== pack) return false;
        if (cost !== '') {
            const n = parseInt(cost);
            if (c.cost === null || c.cost === undefined) return false;
            if (n === 4 ? c.cost < 4 : c.cost !== n) return false;
        }
        if (faction === 'deck') {
            if (c.faction_code !== 'basic' && !dbState.aspects.has(c.faction_code)) return false;
        } else if (faction !== 'all' && c.faction_code !== faction) return false;
        if (q && !q.split(/\s+/).every(w => c._search.includes(w))) return false;
        return true;
    });
}

function dbCostLabel(c) {
    if (c.type_code === 'resource') return 'Ressource';
    return (c.cost === null || c.cost === undefined) ? '—' : `Coût ${c.cost}`;
}

function dbRenderResults() {
    const list = dbFilteredPool();
    const shown = list.slice(0, dbState.limit);
    const results = dbEl('db-results');

    if (list.length === 0) {
        results.innerHTML = `<div class="villain-picker-empty">${dbState.aspects.size === 0 && dbEl('db-faction').value === 'deck'
            ? 'Choisissez au moins un aspect ci-dessus (ou « Tous les aspects » dans le filtre).'
            : 'Aucune carte ne correspond aux filtres.'}</div>`;
    } else {
        results.innerHTML = shown.map(c => {
            const f = DB_FACTION_INFO[c.faction_code];
            const n = dbState.counts[c.code] || 0;
            return `
            <div class="db-card ${n ? 'in-deck' : ''}" data-code="${c.code}" style="--aspect:${f.color}">
                <img src="${getImageUrl(c)}" alt="${escapeHtml(c.name)}" loading="lazy" data-db-zoom="${c.code}"
                     onerror="this.classList.add('broken')">
                <div class="db-card-name" title="${escapeHtml(c.name)}">${c.is_unique ? '★ ' : ''}${escapeHtml(c.name)}</div>
                <div class="db-card-meta">${DB_TYPE_NAMES[c.type_code] ? DB_TYPE_NAMES[c.type_code].replace(/s$/, '') : c.type_name} · ${dbCostLabel(c)}</div>
                <div class="db-card-ctrl">
                    <button data-db-sub="${c.code}" ${n ? '' : 'disabled'} aria-label="Retirer">−</button>
                    <span class="db-card-count">${n}/${dbLimit(c)}</span>
                    <button data-db-add="${c.code}" ${n >= dbLimit(c) ? 'disabled' : ''} aria-label="Ajouter">+</button>
                </div>
            </div>`;
        }).join('');
    }
    const more = dbEl('db-more');
    more.classList.toggle('hidden', list.length <= dbState.limit);
    more.textContent = `Afficher plus (${list.length - shown.length} restantes)`;
}

function dbRenderDeck() {
    const hero = dbHero();
    const listEl = dbEl('db-deck-list');
    const total = dbTotalCards();

    const countEl = dbEl('db-count');
    countEl.textContent = `${total} cartes`;
    const ok = total >= DB_MIN_CARDS && total <= DB_MAX_CARDS;
    countEl.classList.toggle('ok', ok && !!hero);
    dbEl('db-count-hint').textContent = !hero ? 'Choisissez un héros'
        : total < DB_MIN_CARDS ? `encore ${DB_MIN_CARDS - total} min.`
        : total > DB_MAX_CARDS ? `${total - DB_MAX_CARDS} de trop` : 'deck valide (40–50)';

    if (!hero) { listEl.innerHTML = '<div class="villain-picker-empty">Choisissez un héros pour commencer.</div>'; return; }

    const groups = {};
    Object.entries(dbState.counts).forEach(([code, n]) => {
        const c = localDatabase[code];
        if (!c || !n) return;
        (groups[c.type_code] = groups[c.type_code] || []).push({ c, n });
    });

    const heroCards = dbHeroCards();
    const heroCount = heroCards.reduce((a, c) => a + (c.quantity || 1), 0);

    let html = `<details class="db-group db-group-hero"><summary>Cartes du héros <b>${heroCount}</b></summary>` +
        heroCards.map(c => `<div class="db-line"><span class="db-dot" style="--aspect:${DB_FACTION_INFO.hero.color}"></span>
            <span class="db-line-name" data-db-zoom="${c.code}">${escapeHtml(c.name)}</span><span class="db-line-n">×${c.quantity || 1}</span></div>`).join('') +
        `</details>`;

    DB_PLAYER_TYPES.forEach(type => {
        const items = groups[type];
        if (!items) return;
        items.sort((a, b) => (a.c.cost ?? 99) - (b.c.cost ?? 99) || a.c.name.localeCompare(b.c.name, 'fr'));
        const n = items.reduce((a, x) => a + x.n, 0);
        html += `<div class="db-group"><div class="db-group-title">${DB_TYPE_NAMES[type]} <b>${n}</b></div>` +
            items.map(({ c, n }) => `<div class="db-line">
                <span class="db-dot" style="--aspect:${DB_FACTION_INFO[c.faction_code].color}"></span>
                <span class="db-line-cost">${c.cost ?? ''}</span>
                <span class="db-line-name" data-db-zoom="${c.code}" title="Voir la carte">${escapeHtml(c.name)}</span>
                <button data-db-sub="${c.code}" aria-label="Retirer">−</button>
                <span class="db-line-n">×${n}</span>
                <button data-db-add="${c.code}" ${n >= dbLimit(c) ? 'disabled' : ''} aria-label="Ajouter">+</button>
            </div>`).join('') + `</div>`;
    });

    if (dbTotalPlayerCards() === 0) {
        html += '<div class="db-empty-hint">Ajoutez des cartes avec le bouton + dans la liste de gauche.</div>';
    }
    listEl.innerHTML = html;
}

function dbRenderAll() {
    if (!dbPool) return;
    dbEl('db-hero').value = dbState.heroCode;
    dbEl('db-name').value = dbState.name;
    dbEl('db-aspects').querySelectorAll('.db-aspect').forEach(b =>
        b.classList.toggle('active', dbState.aspects.has(b.dataset.aspect)));
    dbRenderResults();
    dbRenderDeck();
}

function dbChange(code, delta) {
    const card = localDatabase[code];
    if (!card) return;
    const n = Math.max(0, Math.min(dbLimit(card), (dbState.counts[code] || 0) + delta));
    if (n) dbState.counts[code] = n; else delete dbState.counts[code];

    // Ajouter une carte d'un aspect non sélectionné l'ajoute aux aspects du deck
    if (delta > 0 && DB_ASPECTS.some(a => a.code === card.faction_code) && !dbState.aspects.has(card.faction_code)) {
        dbState.aspects.add(card.faction_code);
        dbEl('db-aspects').querySelectorAll('.db-aspect').forEach(b =>
            b.classList.toggle('active', dbState.aspects.has(b.dataset.aspect)));
    }

    // Mise à jour sur place de la vignette (évite de recharger toutes les images)
    const tile = dbEl('db-results').querySelector(`.db-card[data-code="${code}"]`);
    if (tile) {
        tile.classList.toggle('in-deck', n > 0);
        tile.querySelector('.db-card-count').textContent = `${n}/${dbLimit(card)}`;
        tile.querySelector('[data-db-sub]').disabled = n === 0;
        tile.querySelector('[data-db-add]').disabled = n >= dbLimit(card);
    }
    if (dbEl('db-only-deck').checked && n === 0) dbRenderResults();
    dbRenderDeck();
}

function dbDefaultName() {
    const hero = dbHero();
    const aspects = DB_ASPECTS.filter(a => dbState.aspects.has(a.code)).map(a => a.name).join('/');
    return `${hero ? hero.name : 'Deck'}${aspects ? ' – ' + aspects : ''}`;
}

// Enregistre le deck dans "Mes decks" ; renvoie { id, data } ou null si invalide.
function dbSave() {
    const hero = dbHero();
    if (!hero) { alert('Choisissez un héros.'); return null; }
    const total = dbTotalCards();
    if ((total < DB_MIN_CARDS || total > DB_MAX_CARDS) &&
        !confirm(`Le deck contient ${total} cartes (règle : 40 à 50). Continuer quand même ?`)) return null;

    const slots = {};
    dbHeroCards().forEach(c => { slots[c.code] = c.quantity || 1; });
    Object.assign(slots, dbState.counts);

    const name = dbState.name.trim() || dbDefaultName();
    const id = dbState.editingId || ('custom-' + Date.now());
    const data = { name, hero_code: hero.code, investigator_name: hero.name, slots };
    rememberDeck(id, name, data, 'custom');
    dbState.editingId = id;
    dbState.name = name;
    dbEl('db-name').value = name;
    return { id, data };
}

// Ouvre un deck de "Mes decks" dans le créateur. Un deck MarvelCDB est copié en deck
// "créé ici" à l'enregistrement, pour ne pas être écrasé par une mise à jour MarvelCDB.
function openDeckBuilderWith(deckId) {
    const saved = getSavedDecks().find(d => d.id === deckId);
    if (!saved || !saved.data) return;
    dbInit();

    let heroCode = saved.data.hero_code;
    if (!localDatabase[heroCode] && localDatabase[heroCode + 'a']) heroCode += 'a';
    dbState.heroCode = heroCode;

    const heroSet = new Set(dbHeroCards().map(c => c.code));
    dbState.counts = {};
    dbState.aspects = new Set();
    Object.entries(saved.data.slots).forEach(([code, n]) => {
        const c = localDatabase[code];
        const base = c && c.duplicate_of_code ? c.duplicate_of_code : code;
        const card = localDatabase[base];
        if (!card || heroSet.has(base) || ['hero', 'alter_ego', 'obligation'].includes(card.type_code)) return;
        dbState.counts[base] = (dbState.counts[base] || 0) + n;
        if (DB_ASPECTS.some(a => a.code === card.faction_code)) dbState.aspects.add(card.faction_code);
    });
    dbState.name = saved.source === 'custom' ? saved.name : `${saved.name} (copie)`;
    dbState.editingId = saved.source === 'custom' ? saved.id : null;
    dbState.limit = DB_PAGE;
    dbEl('db-search').value = '';
    showMenuTab('builder');
}

// ------------------------------------------------------------------
// APERÇU D'UNE CARTE (pour vérifier son choix avant de l'ajouter)
// ------------------------------------------------------------------
var dbPreview = { code: null, list: [] };

const DB_ICONS = {
    energy: '⚡', mental: '🧠', physical: '✊', wild: '✱', per_hero: '<span title="par joueur">👤</span>',
    star: '★', boost: '✦', unique: '★', crisis: '⚠', acceleration: '⏩', amplify: '📢', hazard: '☢', cost: ''
};

// Texte de carte MarvelCDB → HTML sûr : seules <b>, <i>, <em>, <br> sont gardées,
// [[Trait]] en italique et [icône] remplacé par un symbole.
function dbFormatText(text) {
    if (!text) return '';
    let s = escapeHtml(text)
        .replace(/&lt;(\/?)(b|i|em|strong)&gt;/g, '<$1$2>')
        .replace(/&lt;br\s*\/?&gt;/g, '<br>')
        .replace(/\[\[([^\]]+)\]\]/g, '<i class="db-trait">$1</i>')
        .replace(/\[([a-z_]+)\]/g, (m, k) => DB_ICONS[k] !== undefined ? DB_ICONS[k] : m);
    return s.split(/\n+/).map(p => `<p>${p}</p>`).join('');
}

function dbOpenPreview(code, source) {
    if (!localDatabase[code]) return;
    if (source === 'deck') {
        // Ordre de la liste du deck (cartes du héros incluses)
        dbPreview.list = [...dbEl('db-deck-list').querySelectorAll('[data-db-zoom]')].map(e => e.dataset.dbZoom);
    } else {
        dbPreview.list = [...dbEl('db-results').querySelectorAll('.db-card')].map(e => e.dataset.code);
    }
    dbPreview.code = code;
    dbEl('db-preview').classList.remove('hidden');
    dbRenderPreview();
}

function dbClosePreview() {
    dbEl('db-preview').classList.add('hidden');
    dbPreview.code = null;
}

function dbStepPreview(delta) {
    const i = dbPreview.list.indexOf(dbPreview.code);
    if (i === -1) return;
    const next = dbPreview.list[(i + delta + dbPreview.list.length) % dbPreview.list.length];
    if (next) { dbPreview.code = next; dbRenderPreview(); }
}

function dbRenderPreview() {
    const c = localDatabase[dbPreview.code];
    if (!c) return;
    const f = DB_FACTION_INFO[c.faction_code] || DB_FACTION_INFO.basic;
    const img = dbEl('db-preview-img');
    img.classList.remove('broken');
    img.src = getImageUrl(c);
    img.alt = c.name;
    dbEl('db-preview').style.setProperty('--aspect', f.color);

    dbEl('db-preview-name').innerHTML = (c.is_unique ? '★ ' : '') + escapeHtml(c.name) +
        (c.subname ? ` <small>${escapeHtml(c.subname)}</small>` : '');

    const tags = [
        `<span class="db-tag db-tag-aspect">${f.name}</span>`,
        `<span class="db-tag">${escapeHtml(c.type_name || '')}</span>`,
        c.type_code !== 'resource' && c.cost !== null && c.cost !== undefined ? `<span class="db-tag">Coût ${c.cost}</span>` : '',
        c.traits ? `<span class="db-tag db-tag-traits">${escapeHtml(c.traits)}</span>` : ''
    ];
    const res = ['energy', 'mental', 'physical', 'wild']
        .map(k => c['resource_' + k] ? DB_ICONS[k].repeat(c['resource_' + k]) : '').join('');
    if (res) tags.push(`<span class="db-tag" title="Ressources générées">${res}</span>`);
    const stats = [];
    if (c.attack !== null && c.attack !== undefined) stats.push(`ATQ ${c.attack}${c.attack_cost ? ' <small>(-' + c.attack_cost + '❤)</small>' : ''}`);
    if (c.thwart !== null && c.thwart !== undefined) stats.push(`CTR ${c.thwart}${c.thwart_cost ? ' <small>(-' + c.thwart_cost + '❤)</small>' : ''}`);
    if (c.health) stats.push(`PV ${c.health}`);
    if (stats.length) tags.push(`<span class="db-tag">${stats.join(' · ')}</span>`);
    dbEl('db-preview-tags').innerHTML = tags.join('');

    dbEl('db-preview-text').innerHTML = dbFormatText(c.text) +
        (c.flavor ? `<p class="db-flavor">${dbFormatText(c.flavor).replace(/<\/?p>/g, '')}</p>` : '');
    dbEl('db-preview-foot').textContent = `${c.pack_name || ''} · n° ${c.position || ''}`;

    // Les cartes du héros sont imposées : pas de +/− pour elles
    const isHeroCard = c.faction_code === 'hero';
    const n = dbState.counts[c.code] || 0;
    const ctrl = dbEl('db-preview').querySelector('.db-preview-ctrl');
    ctrl.classList.toggle('hidden', isHeroCard);
    if (!isHeroCard) {
        dbEl('db-preview-count').textContent = `${n} / ${dbLimit(c)} dans le deck`;
        dbEl('db-preview-sub').disabled = n === 0;
        dbEl('db-preview-add').disabled = n >= dbLimit(c);
    }
    const many = dbPreview.list.length > 1;
    dbEl('db-preview-prev').classList.toggle('hidden', !many);
    dbEl('db-preview-next').classList.toggle('hidden', !many);
}
