// card-data.js — Accès aux cartes : recherche dans la base locale et URL des images
// (scripts classiques chargés dans l'ordre par index.html : les variables et fonctions
//  de premier niveau sont partagées entre tous les fichiers)

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
