// ==========================================
// BASE DE DONNÉES LOCALE - MARVEL CHAMPIONS
// ==========================================

const MARVEL_DB = {
    
    // --- HÉROS PRÉCONSTRUITS ---
    heroes: [
        // --- Existants (Boîte de Base + Strange) ---
        {
            id: "spiderman_core",
            name: "Spider-Man - Justice (Boîte de base)",
            hero_code: "01001a",
            deck: ['01001a', '01002', '01003', '01003', '01004', '01004', '01005', '01005', '01006', '01006', '01006', '01007', '01007', '01008', '01009', '01009', '01058', '01059', '01060', '01060', '01060', '01061', '01061', '01062', '01062', '01063', '01064', '01064', '01065', '01065', '01065', '01084', '01085', '01088', '01089', '01090', '01091', '01092', '01093', '01093', '01093']
        },
        {
            id: "captainmarvel_core",
            name: "Captain Marvel - Commandement (Boîte de base)",
            hero_code: "01010a",
            deck: ['01010a', '01011', '01012', '01013', '01013', '01014', '01014', '01015', '01015', '01015', '01016', '01016', '01016', '01017', '01066', '01067', '01068', '01069', '01069', '01070', '01070', '01071', '01071', '01072', '01072', '01073', '01073', '01074', '01083', '01083', '01084', '01084', '01085', '01085', '01088', '01089', '01090', '01091', '01092', '01093', '01093']
        },
        {
            id: "shehulk_core",
            name: "Miss Hulk - Agressivité (Cartes de base)",
            hero_code: "01018a",
            deck: ['01018a', '01019', '01020', '01020', '01021', '01021', '01022', '01022', '01022', '01023', '01023', '01024', '01024', '01025', '01026']
        },
        {
            id: "blackpanther_core",
            name: "Black Panther - Protection (Cartes de base)",
            hero_code: "01027a",
            deck: ['01027a', '01028', '01029', '01029', '01029', '01030', '01031', '01031', '01031', '01031', '01032', '01032', '01033', '01034', '01035']
        },
        {
            id: "ironman_core",
            name: "Iron Man - Agressivité (Cartes de base)",
            hero_code: "01039a",
            deck: ['01039a', '01040', '01041', '01041', '01042', '01042', '01043', '01044', '01044', '01045', '01045', '01046', '01047', '01048', '01049']
        },
        {
            id: "doctor_strange",
            name: "Doctor Strange - Protection (Préconstruit + Deck Invocation)",
            hero_code: "09001a",
            deck: ["09001a", "09002", "09003", "09004", "09004", "09005", "09005", "09006", "09007", "09007", "09008", "09009", "09010", "09011", "09011", "09012", "09012", "09013", "09013", "09014", "09015", "09016", "09017", "09017", "09018", "09018", "09019", "09019", "09020", "09020", "09021", "09022", "09022", "09022", "09023", "09024", "09025", "09026", "09027", "09028"],
            secondary_deck: ["09032", "09033", "09034", "09035", "09036"]
        },

        // --- Nouveaux Héros (Prêts à être remplis) ---
        { id: "captain_america", name: "Captain America", hero_code: "", deck: [] },
        { id: "ms_marvel", name: "Ms. Marvel", hero_code: "", deck: [] },
        { id: "thor", name: "Thor", hero_code: "", deck: [] },
        { id: "black_widow", name: "Black Widow", hero_code: "08001a", deck: [] },
        { id: "hulk", name: "Hulk", hero_code: "", deck: [] },
        { id: "hawkeye", name: "Hawkeye", hero_code: "", deck: [] },
        { id: "spider_woman", name: "Spider-Woman", hero_code: "", deck: [] },
        { id: "ant_man", name: "Ant-Man", hero_code: "", deck: [] },
        { id: "wasp", name: "La Guêpe (Wasp)", hero_code: "", deck: [] },
        { id: "quicksilver", name: "Vif-Argent (Quicksilver)", hero_code: "", deck: [] },
        { id: "scarlet_witch", name: "La Sorcière Rouge (Scarlet Witch)", hero_code: "", deck: [] },
        { id: "venom", name: "Venom", hero_code: "", deck: [] },
        { id: "spectrum", name: "Spectrum", hero_code: "", deck: [] },
        { id: "adam_warlock", name: "Adam Warlock", hero_code: "", deck: [] },
        { id: "nebula", name: "Nébula", hero_code: "", deck: [] },
        { id: "war_machine", name: "War Machine", hero_code: "", deck: [] },
        { id: "valkyrie", name: "Valkyrie", hero_code: "", deck: [] },
        { id: "vision", name: "Vision", hero_code: "", deck: [] },
        { id: "nova", name: "Nova", hero_code: "", deck: [] },
        { id: "ironheart", name: "Ironheart", hero_code: "", deck: [] },
        { id: "spider_ham", name: "Spider-Ham", hero_code: "", deck: [] },
        { id: "spdr", name: "SP//dr", hero_code: "", deck: [] },
        { id: "ghost_spider", name: "Ghost-Spider", hero_code: "", deck: [] },
        { id: "miles_morales", name: "Miles Morales", hero_code: "", deck: [] },
        { id: "cyclops", name: "Cyclope", hero_code: "33001a", deck: [] },
        { id: "phoenix", name: "Phénix", hero_code: "", deck: [] },
        { id: "wolverine", name: "Wolverine", hero_code: "35001a", start_on_board: ["35002"], deck: [] },
        { id: "storm", name: "Tornade (Storm)", hero_code: "", deck: [] },
        { id: "gambit", name: "Gambit", hero_code: "", deck: [] },
        { id: "rogue", name: "Maligne (Rogue)", hero_code: "", deck: [] },
        { id: "cable", name: "Cable", hero_code: "", deck: [] },
        { id: "domino", name: "Domino", hero_code: "", deck: [] },
        { id: "psylocke", name: "Psylocke", hero_code: "", deck: [] },
        { id: "angel", name: "Angel", hero_code: "", deck: [] },
        { id: "x23", name: "X-23", hero_code: "", deck: [] },
        { id: "deadpool", name: "Deadpool", hero_code: "", deck: [] },
        { id: "bishop", name: "Bishop", hero_code: "", deck: [] },
        { id: "magik", name: "Magik", hero_code: "", deck: [] },
        { id: "iceman", name: "Iceberg (Iceman)", hero_code: "46001a", deck: [] ,start_on_board: ["46002","46002","46002","46002","46002","46002"] },
        { id: "jubilee", name: "Jubilé", hero_code: "", deck: [] },
        { id: "nightcrawler", name: "Diable Manquant (Nightcrawler)", hero_code: "", deck: [] },
        { id: "magneto", name: "Magnéto", hero_code: "", deck: [] }
    ],

    // --- SCÉNARIOS DES MÉCHANTS ---
    villains: [
        // --- Existants (Boîte de base + Thanos) ---
        {
            id: "rhino",
            name: "Rhino (Boîte de base)",
            card_set_code: "rhino",
            stages: ["01094", "01095", "01096"], 
            schemes: ["01097"],         
            default_modulars: ["bomb_scare"]
        },
        {
            id: "klaw",
            name: "Klaw (Boîte de base)",
            card_set_code: "klaw",
            stages: ["01113", "01114","01115"], 
            schemes: ["01116", "01117"],         
            default_modulars: ["masters_of_evil"]
        },
        {
            id: "ultron",
            name: "Ultron (Boîte de base)",
            card_set_code: "ultron",
            stages: ["01134", "01135", "01136"], 
            schemes: ["01137", "01138", "01139"],         
            default_modulars: ["under_attack"],
            start_on_board: ["01140"]
        },
       

        // --- Nouveaux Méchants (Avec card_set_code complétés) ---
        {
            // Mise en place : mettez en jeu l'environnement Entreprise Criminelle. Mélangez le deck Rencontre. Avancez au stade 1B.
            id: "green_goblin_risky_business",
            name: "Le Bouffon Vert - Business en Risque",
            card_set_code: "risky_business",
            stages: ["02001a", "02002a", "02003a"],
            schemes: ["02004", "02005"],
            default_modulars: ["goblin_gimmicks"],
            start_on_board: ["02006a"]
        },
        {
            // Mise en place : mettez en jeu un sbire Esclave Bouffon engagé avec chaque joueur. Mélangez le deck Rencontre. Avancez au stade 1B.
            id: "green_goblin_mutagen_formula",
            name: "Le Bouffon Vert - Formule Mutagène",
            card_set_code: "mutagen_formula",
            stages: ["02014", "02015", "02016"],
            schemes: ["02017", "02018"],
            default_modulars: ["goblin_gimmicks"],
            start_on_board: ["02024"]
        },
        { 
            id: "wrecking_crew", 
            name: "Les Démolisseurs",
            card_set_code: "wrecking_crew",
            multi_villains: [
                { id: "le_démolisseur", name: "Le Démolisseur", stages: ["07002"] },
                { id: "le_boulet", name: "Le Boulet", stages: ["07017"] },
                { id: "le_compresseur", name: "Le Compresseur", stages: ["07032"] },
                { id: "le_bulldozer", name: "Le Bulldozer", stages: ["07046"] }
            ], 
            schemes: ["07001"],
            default_modulars: [],
            start_on_board: ["07004","07019","07034","07048"],
            jeton: true
        },
        { 
            id: "crossbones",
            name: "Crossbones",
            card_set_code: "crossbones",
            stages: ["04058","04059","04060"],
            schemes: ["04061","04062","04063"],
            mandatory_modulars: ["exper_weapon"],
            default_modulars: ["legions_of_hydra","hydra_assault","weapon_master"]
        },
        { 
            id: "absorbing_man", 
            name: "L'Homme-Absorbant", 
            card_set_code: "absorbing_man",
            stages: ["04076","04077","04078"], 
            schemes: ["04079"], 
            default_modulars: ["hydra_patrol"]
        },
        { 
            id: "taskmaster",
            name: "Le Taskmaster", 
            card_set_code: "taskmaster",
            stages: ["04093","04094","04095"], 
            schemes: ["04096"], 
            mandatory_modulars: ["hydra_patrol"],
            default_modulars: ["weapon_master"],
            start_on_board: ["04154"],
            start_set_aside: ["04097","04098","04099","04100"]
        },
        {
            id: "zola", 
            name: "Arnim Zola", 
            card_set_code: "zola", 
            stages: ["04109","04110","04111"],
            schemes: ["04112","04113"], 
            start_on_board: ["04122","04114"],
            default_modulars: ["under_attack"]
        },
        {
            id: "red_skull",
            name: "Crâne Rouge",
            card_set_code: "red_skull",
            stages: ["04125","04126","04127"], 
            schemes: ["04128","04129"], 
            default_modulars: ["hydra_assault","hydra_patrol"],
            secondary_deck: ["04140", "04141", "04142", "04143", "04144"],
            start_on_board: ["04139"],
            start_set_aside: ["04130"]
        
        },
        {
            // TODO: plusieurs cartes méchant au même stade (variantes) : à trier à la main
            // TODO: cartes de mise en place non retrouvées : Kang
            id: "kang",
            name: "Kang le Conquérant",
            card_set_code: "kang",
            stages: ["11001", "11002", "11003", "11004", "11005", "11006"],
            schemes: ["11007", "11008", "11009", "11010", "11011", "11012", "11013"],
            default_modulars: ["temporal"],
            start_set_aside: ["11023"]
        },
        { 
            id: "drang",
            name: "Drang de la Confrérie Badoon",
            card_set_code: "brotherhood_of_badoon",
            stages: ["16058","16059","16060"],
            schemes: ["16061a","16062a"],
            // La face A de "Invasion Terrestre" (16061a) n'est que le texte de mise en place
            // (aucune menace, aucune mécanique) : la partie démarre directement sur la face B
            // (16061b, 2 de menace, mécanique du Vaisseau Badoon déjà active).
            schemes_start_flipped: true,
            mandatory_modulars: ["ship_command"],
            default_modulars: ["band_of_badoon"],
            start_on_board: ["16063","16142"]
        },
        {
            // Mise en place : créer l'aire de jeu appelée "La Collection" (voir le livret pour plus de détails). Mettez la carte du dessus du deck de chaque joueur dans La Collection, face visible.
            // TODO: étapes de mise en place spéciales (défausser, retirer, jetons…) non automatisées
            id: "collector_infiltrate",
            name: "Le Collectionneur - Infiltration du Musée",
            card_set_code: "infiltrate_the_museum",
            stages: ["16070", "16071", "16072"],
            schemes: ["16073a"],
            mandatory_modulars: ["galactic_artifacts"],
            default_modulars: ["menagerie_medley"]
        },
        {
            // Mise en place : mettez en jeu l'environnement Labyrinthe de Rayonnages. Mettez de côté le set de rencontre Contrôles du Vaisseau.
            id: "collector_escape",
            name: "Le Collectionneur - Fuite du Musée",
            card_set_code: "escape_the_museum",
            stages: ["16080a", "16081a"],
            schemes: ["16082a", "16083a", "16084a"],
            mandatory_modulars: ["galactic_artifacts", "ship_command"],
            default_modulars: ["menagerie_medley"],
            start_on_board: ["16085a"]
        },
        { 
            id: "nebula_villain",
            name: "Nébula (Méchante)",
            card_set_code: "nebula",
            stages: ["16088","16089","16090"],
            schemes: ["16091a","16092a"],
            mandatory_modulars: ["power_stone","ship_command"],
            default_modulars: ["space_pirates"],
            start_on_board: ["16149","16093","16142"]
        },
        { 
            id: "ronan", 
            name: "Ronan l'Accusateur", 
            card_set_code: "ronan", 
            stages: ["16103","16104","16105"], 
            schemes: ["16106a","16107a"],
            mandatory_modulars: ["power_stone","ship_command"],
            default_modulars: ["kree_militants"],
            start_on_board: ["16108","16109","16142","16149"]
        },
        { 
            id: "ebony_maw",
            name: "Ebony Maw",
            card_set_code: "ebony_maw", 
            stages: ["21071","21072","21073"], 
            schemes: ["21074","21075"], 
            default_modulars: ["black_order","armies_of_titan"] 
        },
        { 
            id: "tower_defense", 
            name: "Défense de la Tour", 
            card_set_code: "tower_defense", 
            multi_villains: [
                { id: "proxima", name: "Proxima", stages: ["21092", "21093", "21094"] },
                { id: "Corvus", name: "Corvus", stages: ["21095", "21096", "21097"] }
            ], 
            schemes: ["21098"], 
            start_on_board: ["21099"],
            default_modulars: ["black_order"],
            jeton: true
        },
        {
            id: "thanos",
            name: "Thanos (L'Ombre du Titan Fou)",
            card_set_code: "thanos",
            stages: ["21111", "21112", "21113"], 
            schemes: ["21114", "21115"],   
            mandatory_modulars: ["infinity_gauntlet"],
            default_modulars: ["children_of_thanos","black_order"]
        },
        { 
            id: "hela",
            name: "Hela",
            card_set_code: "hela",
            stages: ["21136a","21137a"],
            schemes: ["21138"],
            default_modulars: ["legions_of_hel","frost_giants"],
            start_on_board: ["21139a","21140","21143"],
            start_set_aside: ["21142","21144","21145","21141"]
        },
        { 
            id: "loki",
            name: "Loki",
            card_set_code: "loki",
            villain_deck: ["21160", "21161", "21162", "21163", "21164"],
            schemes: ["21165"],
            mandatory_modulars: ["infinity_gauntlet"],
            default_modulars: ["enchantress","frost_giants"],
            start_on_board: ["21167"]
        },
        {
            // Mise en place : choisissez 7 sets de rencontre modulaires et mettez-les de côté (vous pouvez les prendre au hasard). Sélectionnez aléatoirement 1 de ces sets, puis mélangez-le dans le deck Rencontre.
            // TODO: mise en place avec choix de modulaires (au hasard / au choix) : à vérifier
            id: "the_hood",
            name: "Le Capuchon (The Hood)",
            card_set_code: "the_hood",
            stages: ["24001", "24002", "24003"],
            schemes: ["24004", "24005", "24006"],
            default_modulars: ["streets_of_mayhem"]
        },
        {
             id: "sandman",
             name: "L'Homme-Sable",
             card_set_code: "sandman",
             stages: ["27061","27062","27063"],
             schemes: ["27064"],
             mandatory_modulars: ["city_in_chaos"],
             default_modulars: ["down_to_earth"],
             start_on_board: ["27065"],
        },
        { 
            id: "venom_villain",
            name: "Venom (Méchant)",
            card_set_code: "venom",
            stages: ["27073","27074","27075"],
            schemes: ["27076a"],
            mandatory_modulars: ["symbiotic_strength"],
            default_modulars: ["down_to_earth"],
            start_on_board: ["27077a"]
        },
        {
            id: "mysterio",
            name: "Mystério",
            card_set_code: "mysterio",
            stages: ["27084","27085","27086"],
            schemes: ["27087","27088"],
            mandatory_modulars: ["personal_nightmare"],
            default_modulars: ["whispers_of_paranoia"],
            start_on_board: ["27091"]
        },
        {
            // Mise en place : prenez X méchants au hasard, X étant le nombre de joueurs plus 1. Mettez en jeu ces méchants, placez le jeton Actif sur le machant avec l'ordre d'activation le moins élevé et mettez de côté les autres méchants. Mettez en jeu la manigance annexe Lumière au Bout du Tunnel, face PIÈGE ! visible
            // TODO: scénario à plusieurs méchants : vérifier multi_villains et le placement du jeton
            // TODO: mise en place avec choix de modulaires (au hasard / au choix) : à vérifier
            id: "sinister_six",
            name: "Les Six Sinistres",
            card_set_code: "sinister_six",
            multi_villains: [
                { id: "doctor_octopus", name: "Docteur Octopus", stages: ["27094"] },
                { id: "electro", name: "Electro", stages: ["27095"] },
                { id: "hobgoblin", name: "Le Super Bouffon", stages: ["27096"] },
                { id: "kraven_the_hunter", name: "Kraven le Chasseur", stages: ["27097"] },
                { id: "scorpion", name: "Scorpion", stages: ["27098"] },
                { id: "vulture", name: "Le Vautour", stages: ["27099"] }
            ],
            schemes: ["27100", "27101a"],
            default_modulars: ["guerilla_tactics"],
            start_on_board: ["27102a"],
            jeton: true
        },
        {
            id: "venom_goblin",
            name: "Venom-Bouffon",
            card_set_code: "venom_goblin",
            stages: ["27113","27114","27115"],
            schemes: ["27116a"],
            mandatory_modulars: ["symbiotic_strength"],
            default_modulars: ["goblin_gear"],
            start_on_board: ["27117a","27118a","27119a"],
            jeton: true
        },
        {
            id: "sabretooth",
            name: "Dents-de-Sabre", 
            card_set_code: "sabretooth", 
            stages: ["32060","32061","32062"], 
            schemes: ["32063","32064"], 
            default_modulars: ["brotherhood","mystique"],
            start_on_board: ["32065a","32066"] 
        },
        {
            id: "sentinel", 
            name: "Sentinelle", 
            card_set_code: "project_wideawake", 
            stages: ["32084","32085","32086"], 
            schemes: ["32087"],
            mandatory_modulars: ["zero_tolerance"], 
            default_modulars: ["sentinels"],
            start_on_board: ["32088a","32104"],
            start_set_aside: ["32089","32090","32091","32092"] 
        },
        {
            id: "master_mold", 
            name: "Moule Initial", 
            card_set_code: "master_mold", 
            stages: ["32109","32110","32111"], 
            schemes: ["32112","32113"],
            mandatory_modulars: ["sentinels"], 
            default_modulars: ["zero_tolerance"],
            start_on_board: ["32172b"] 
        },
        {
            // Mise en place : mettez en jeu l'environnement Sauver l'École. Mélangez tous les exemplaires de la manigance principale 2A et empilez-les, sous La Confrérie Attaque ! Mélangez les méchants ensemble (sans regarder) pour créer le deck Méchant. La carte du dessus de ce deck en jeu.
            // TODO: plusieurs cartes méchant au même stade (variantes) : à trier à la main
            id: "mansion_attack",
            name: "Attaque de l'Institut",
            card_set_code: "mansion_attack",
            stages: ["32121a", "32122a", "32123a", "32124a"],
            schemes: ["32125", "32126", "32127", "32128", "32129"],
            mandatory_modulars: ["brotherhood"],
            default_modulars: ["mystique"],
            start_on_board: ["32130"]
        },
        { 
            id: "magneto_villain", 
            name: "Magnéto (Méchant)", 
            card_set_code: "magneto_villain", 
            stages: ["32138","32139","32140"], 
            schemes: ["32141","32142","32143"], 
            default_modulars: ["acolytes"],
            start_on_board: ["32144a"],
            start_set_aside: ["32145a"]  
        },
        {
            // Mise en place : placez en jeu l'environnement Le Champion et l'environnement Les Challengeurs, avec leur face FOULE MÉCONTENTE visible.
            // TODO: modulaire recommandé non reconnu : « 1 set modulaire pris au hasard dans le Paquet Scénario MojoMania »
            // TODO: mise en place avec choix de modulaires (au hasard / au choix) : à vérifier
            id: "magog",
            name: "Magog",
            card_set_code: "magog",
            stages: ["39001a"],
            schemes: ["39002a"],
            default_modulars: ["crime"],
            start_on_board: ["39003a", "39004a"]
        },
        {
            // Mise en place : mettez en jeu la manigance annexe À La Recherche de Spirale et 1 environnement SPECTACLE pris au hasard. Mélangez tous les autres environnements SPECTACLE avec la traîtrise Acculée ! pour constituer le deck Spectacle. (Voir livret de règles, p. 11.) Placez Spirale, face EN FUITE visible.
            // TODO: mise en place avec choix de modulaires (au hasard / au choix) : à vérifier
            // TODO: cartes de mise en place non retrouvées : 1 random SHOW
            // TODO: étapes de mise en place spéciales (défausser, retirer, jetons…) non automatisées
            id: "spiral",
            name: "Spirale",
            card_set_code: "spiral",
            stages: ["39012a", "39013a", "39014a"],
            schemes: ["39015a"],
            default_modulars: ["fantasy"],
            start_on_board: ["39016"]
        },
        {
            // Mise en place : choisissez 1 set modulaire, plus 1[per_hero] set modulaire supplémentaire, du Paquet Scénario MojoMania et mettez-les de côté. Mettez en jeu l'environnement La Roue Des Genres, face EN ROTATION visible.
            // TODO: mise en place avec choix de modulaires (au hasard / au choix) : à vérifier
            id: "mojo",
            name: "Mojo",
            card_set_code: "mojo",
            stages: ["39022", "39023", "39024"],
            schemes: ["39025a"],
            default_modulars: ["sitcom"],
            start_on_board: ["39026a"]
        },
        {
            // Mise en place : mettez en jeu l'environnement Mis Hors d'État de Nuire. Mettez de côté la traîtrise Cachez-Vous! et chaque allié Morlock. Mélangez ensemble les méchants (sans regarder) pour créer le deck Méchant. La cartge du dessus de ce deck est en jeu.
            // TODO: aucune carte méchant dans ce set (méchant dans un autre set / deck de méchants ?)
            id: "morlock_siege",
            name: "Siège des Morlocks",
            card_set_code: "morlock_siege",
            stages: [],
            schemes: ["40077", "40078"],
            default_modulars: ["military_grade", "mutant_slayers"],
            start_on_board: ["40081a"],
            start_set_aside: ["40080", "40079"]
        },
        {
            // Mise en place : mettez en jeu 1 méchant MARAUDER pris au hasard. Retirez de la partie le sbire ayant le même titre que le méchant ainsi que tous les autres méchants. Attachez l'attachement Le Ravisseur de Hope au méchant, face CONFIANT visible.
            // TODO: aucune carte méchant dans ce set (méchant dans un autre set / deck de méchants ?)
            // TODO: mise en place avec choix de modulaires (au hasard / au choix) : à vérifier
            // TODO: cartes de mise en place non retrouvées : 1 random MARAUDER villain
            // TODO: étapes de mise en place spéciales (défausser, retirer, jetons…) non automatisées
            id: "on_the_run",
            name: "En Fuite",
            card_set_code: "on_the_run",
            stages: [],
            schemes: ["40103", "40104"],
            mandatory_modulars: ["mutant_slayers"],
            default_modulars: ["military_grade", "nasty_boys"],
            start_on_board: ["40105a"]
        },
        {
            // Mise en place : attachez le Casque du Fléau. Mettez en Jeu Hope Summers sous le contrôle du premier joueur.
            id: "juggernaut",
            name: "Le Fléau (Juggernaut)",
            card_set_code: "juggernaut",
            stages: ["40118", "40119", "40120"],
            schemes: ["40121"],
            mandatory_modulars: ["hope_summers"],
            default_modulars: ["black_tom_cassidy"],
            start_on_board: ["40122a", "40130"]
        },
        {
            // Mise en place : mettez de côté les sets de Rencontre Vol, Super Force et Télépathie. Mettez en jeu Hope Summers sous le contrôle du premier joueur.
            id: "mister_sinister",
            name: "Monsieur Sinistre",
            card_set_code: "mister_sinister",
            stages: ["40136", "40137", "40138"],
            schemes: ["40139", "40140", "40141", "40142", "40143"],
            mandatory_modulars: ["flight", "super_strength", "telepathy", "hope_summers"],
            default_modulars: ["nasty_boys"],
            start_on_board: ["40130"]
        },
        {
            id: "stryfe",
            name: "Stryfe",
            card_set_code: "stryfe",
            stages: ["40163", "40164", "40165"],
            schemes: ["40166", "40167"],
            default_modulars: ["zero_tolerance"],
            start_on_board: ["40130", "40168a"]
        },
        {
            // Mise en place : révélez la manigance annexe Réserve de Gènes. En mode expert, attribuez à chaque joueur une carte Rencontre face cachée.
            id: "unus",
            name: "Unus l'Intouchable",
            card_set_code: "unus",
            stages: ["45059", "45060", "45061"],
            schemes: ["45062"],
            mandatory_modulars: ["infinites"],
            default_modulars: ["dystopian_nightmare"],
            start_on_board: ["45071"]
        },
        {
            // Mise en place : mélangez les quatre méchants CAVALIERS, puis révélez-les les uns après les autres, en les alignant de gauche à droite. Placez le jeton Actif sur le méchant le plus à gauche (voir livret de règles). Chaque joueur révèle une manigance annexe prise au hasard dans le set de rencontre Quatre Cavaliers.
            // TODO: plusieurs cartes méchant au même stade (variantes) : à trier à la main
            // TODO: mise en place avec choix de modulaires (au hasard / au choix) : à vérifier
            id: "four_horsemen",
            name: "Les Quatre Cavaliers",
            card_set_code: "four_horsemen",
            stages: ["45081a", "45082a", "45083a", "45084a"],
            schemes: ["45085"],
            default_modulars: ["dystopian_nightmare", "hounds"]
        },
        {
            // Mise en place : mettez de côté chaque carte Méchant inutilisée, chaque sbire PRÉLAT et la manigance annexe Le Trône du Tyran. Révélez la manigance annexe Cœur de l'Empire. Le premier joueur révèle aléatoirement un sbire PRÉLAT mis de côté.
            id: "apocalypse",
            name: "Apocalypse",
            card_set_code: "apocalypse",
            stages: ["45101a", "45102a"],
            schemes: ["45103"],
            default_modulars: ["dark_riders", "infinites"],
            start_on_board: ["45104a"]
        },
        { id: "dark_phoenix", name: "Phénix Noir", card_set_code: "dark_phoenix", stages: [], schemes: [], default_modulars: [] },
        {
            // Mise en place : Apocalypse commence la partie sous forme BIOMORPHE. Attribuez à chaque joueur une carte Rencontre face cachée.
            id: "en_sabah_nur",
            name: "En Sabah Nur",
            card_set_code: "en_sabah_nur",
            stages: ["45184a", "45185a", "45186a"],
            schemes: ["45147", "45148"],
            default_modulars: ["celestial_tech", "clan_akkaba"]
        },

        // --- Ajoutés automatiquement par generate_villains.py ---
        {
            // Mise en place : mettez de côté les sets Lune Bleue, Génosha et Terre Sauvage (y compris chaque carte Environnement de ces sets). En mode expert, révélez l'attachement Lunettes High-Tech.
            // TODO: scénario ajouté automatiquement : vérifier le nom et la mise en place
            // TODO: cartes de mise en place non retrouvées : Blue Moon, Savage Land sets
            id: "dark_beast",
            name: "Le Fauve Noir (L'Ère d'Apocalypse)",
            card_set_code: "dark_beast",
            stages: ["45118", "45119", "45120"],
            schemes: ["45121"],
            default_modulars: ["dystopian_nightmare"],
            start_on_board: ["45122"],
            start_set_aside: ["45133"]
        },
        {
            // TODO: scénario ajouté automatiquement : vérifier le nom et la mise en place
            id: "black_widow_villain",
            name: "Black Widow (Agents of S.H.I.E.L.D.)",
            card_set_code: "black_widow_villain",
            stages: ["50064", "50065", "50066"],
            schemes: ["50067a"],
            default_modulars: []
        },
        {
            // TODO: scénario ajouté automatiquement : vérifier le nom et la mise en place
            id: "batroc",
            name: "Batroc (Agents of S.H.I.E.L.D.)",
            card_set_code: "batroc",
            stages: ["50086a"],
            schemes: ["50087a", "50088a", "50089a"],
            default_modulars: [],
            start_on_board: ["50090a"],
            start_set_aside: ["50091"]
        },
        {
            // TODO: scénario ajouté automatiquement : vérifier le nom et la mise en place
            // TODO: cartes de mise en place non retrouvées : 1 random Adaptoid, others
            // TODO: étapes de mise en place spéciales (défausser, retirer, jetons…) non automatisées
            id: "m.o.d.o.k.",
            name: "M.O.D.O.K (Agents of S.H.I.E.L.D.)",
            card_set_code: "m.o.d.o.k.",
            stages: ["50103a"],
            schemes: ["50104a"],
            default_modulars: [],
            start_on_board: ["50113"]
        },
        {
            // TODO: scénario ajouté automatiquement : vérifier le nom et la mise en place
            // TODO: mise en place avec choix de modulaires (au hasard / au choix) : à vérifier
            // TODO: cartes de mise en place non retrouvées : of those, Justice, Like Lightning
            id: "thunderbolts",
            name: "Thunderbolts (Agents of S.H.I.E.L.D.)",
            card_set_code: "thunderbolts",
            stages: ["50129a"],
            schemes: ["50130a"],
            default_modulars: []
        },
        {
            // TODO: scénario ajouté automatiquement : vérifier le nom et la mise en place
            // TODO: cartes de mise en place non retrouvées : Board Member
            id: "baron_zemo",
            name: "Baron Zemo (Agents of S.H.I.E.L.D.)",
            card_set_code: "baron_zemo",
            stages: ["50165a", "50166a"],
            schemes: ["50167a", "50168a", "50169a"],
            default_modulars: []
        },
        {
            // TODO: scénario ajouté automatiquement : vérifier le nom et la mise en place
            // TODO: cartes de mise en place non retrouvées : random Hypnotic Gaze, remaining Hypnotic Gaze
            id: "enchantress_villain",
            name: "Enchantress (Trickster Takeover)",
            card_set_code: "enchantress_villain",
            stages: ["55001", "55002", "55003"],
            schemes: ["55004a", "55005a"],
            default_modulars: [],
            start_set_aside: ["55006"]
        },
        {
            // TODO: scénario ajouté automatiquement : vérifier le nom et la mise en place
            // TODO: étapes de mise en place spéciales (défausser, retirer, jetons…) non automatisées
            id: "god_of_lies",
            name: "God of Lies (Trickster Takeover)",
            card_set_code: "god_of_lies",
            stages: ["55027a", "55029a", "55030a", "55031a", "55032a"],
            schemes: ["55028a", "55033a"],
            default_modulars: []
        },
        {
            // TODO: scénario ajouté automatiquement : vérifier le nom et la mise en place
            id: "kingpin",
            name: "Kingpin (Fear No Evil)",
            card_set_code: "kingpin",
            stages: ["60159a", "60160a"],
            schemes: ["60161a", "60162a"],
            default_modulars: []
        }
    ],

    // --- SETS MODULAIRES ---
    modulars: [
        // --- Existants ---
        { id: "bomb_scare", name: "Alerte à la Bombe", card_set_code: "bomb_scare" },
        { id: "masters_of_evil", name: "Les Maîtres du Mal", card_set_code: "masters_of_evil" },
        { id: "under_attack", name: "En Pleine Attaque", card_set_code: "under_attack" },
        { id: "legions_of_hydra", name: "Légions de l'Hydra", card_set_code: "legions_of_hydra" },
        { id: "doomsday_chair", name: "Le Siège de l'Apocalypse", card_set_code: "the_doomsday_chair" },
        

        // --- Nouveaux Sets Modulaires (Avec card_set_code complétés) ---
        
        // Bouffon Vert (Green Goblin)
        { id: "goblin_gimmicks", name: "Gadgets du Bouffon", card_set_code: "goblin_gimmicks" },
        { id: "a_mess_of_things", name: "Un Sacré Bazar", card_set_code: "a_mess_of_things" },
        { id: "power_drain", name: "Absorption de Pouvoir", card_set_code: "power_drain" },
        { id: "running_interference", name: "Interférences", card_set_code: "running_interference" },
        
        // L'Avènement de Crâne Rouge (Rise of Red Skull)
        { id: "exper_weapon", name: "Armes Expérimentales", card_set_code: "exper_weapon" , secondary_set_code: "exper_weapon"},
        { id: "hydra_assault", name: "Assaut de l'Hydra", card_set_code: "hydra_assault" },
        { id: "hydra_patrol", name: "Patrouille de l'Hydra", card_set_code: "hydra_patrol" },
        { id: "weapon_master", name: "Maître d'Armes", card_set_code: "weap_master" },

        // Kang
        { id: "temporal", name: "Temporel", card_set_code: "temporal" },
        { id: "anachronauts", name: "Anachronautes", card_set_code: "anachronauts" },
        { id: "master_of_time", name: "Maître du Temps", card_set_code: "mot" },

        // Convoitise Galactique (Galaxy's Most Wanted)
        { id: "band_of_badoon", name: "Bande de Badoon", card_set_code: "band_of_badoon" },
        { id: "menagerie_medley", name: "Méli-mélo de la Ménagerie", card_set_code: "menagerie_medley" },
        { id: "galactic_artifacts", name: "Artéfacts Galactiques", card_set_code: "galactic_artifacts" },
        { id: "kree_militants", name: "Militants Kree", card_set_code: "kree_militant" },
        { id: "power_stone", name: "Pierre de pouvoir", card_set_code: "power_stone" },
        { id: "space_pirates", name: "Pirates de l'Espace", card_set_code: "space_pirates" },
        { id: "ship_command", name: "Commandement du Vaisseau", card_set_code: "ship_command" },
        { id: "badoon_headhunter", name: "Chasseur de Têtes Badoon", card_set_code: "badoon_headhunter" },

        // L'Ombre du Titan Fou (Mad Titan's Shadow)
        { id: "enchantress", name: "L'Enchanteresse", card_set_code: "enchantress" },
        { id: "black_order", name: "L'ordre noir", card_set_code: "black_order" },
        { id: "infinity_gauntlet", name: "Gant de l'Infini", card_set_code: "infinity_gauntlet", start_on_board: ["21129"], secondary_set_code: "infinity_gauntlet" },
        { id: "children_of_thanos", name: "Enfant de thanos", card_set_code: "children_of_thanos" },
        { id: "armies_of_titan", name: "Armee de titan", card_set_code: "armies_of_titan" },
        { id: "galactic_armory", name: "Armurerie Galactique", card_set_code: "galactic_armory" },
        { id: "legions_of_hel", name: "Légions de Hel", card_set_code: "legions_of_hel" },
        { id: "frost_giants", name: "Géants des Glaces", card_set_code: "frost_giants" },

        // Le Capuchon (The Hood)
        { id: "beasty_boys", name: "Les Bestiaux", card_set_code: "beasty_boys" },
        { id: "brothers_grimm", name: "Les Frères Grimm", card_set_code: "brothers_grimm" },
        { id: "crossfires_crew", name: "L'Équipe de Crossfire", card_set_code: "crossfires_crew" },
        { id: "mister_hyde", name: "Mister Hyde", card_set_code: "mister_hyde" },
        { id: "sinister_syndicate", name: "Le Syndicat Sinistre", card_set_code: "sinister_syndicate" },
        { id: "state_of_emergency", name: "État d'Urgence", card_set_code: "state_of_emergency" },
        { id: "streets_of_mayhem", name: "Rues du Chaos", card_set_code: "streets_of_mayhem" },
        { id: "wrecking_crew_modular", name: "Les Démolisseurs (Modulaire)", card_set_code: "wrecking_crew_modular" },
        
        // Motifs Sinistres (Sinister Motives)
        { id: "city_in_chaos", name: "La Ville en Chaos", card_set_code: "city_in_chaos" },
        { id: "down_to_earth", name: "Retour sur Terre", card_set_code: "down_to_earth" },
        { id: "goblin_gear", name: "Équipement du Bouffon", card_set_code: "goblin_gear" },
        { id: "guerilla_tactics", name: "Tactiques de Guérilla", card_set_code: "guerrilla_tactics" },
        { id: "osborn_tech", name: "Technologie Osborn", card_set_code: "osborn_tech" },
        { id: "personal_nightmare", name: "Cauchemar Personnel", card_set_code: "personal_nightmare" },
        { id: "sinister_assault", name: "Assaut Sinistre", card_set_code: "sinister_assault" },
        { id: "symbiotic_strength", name: "Force Symbiotique", card_set_code: "symbiotic_strength" },
        { id: "whispers_of_paranoia", name: "Murmures de Paranoïa", card_set_code: "whispers_of_paranoia" },

        // Genèse Mutante (Mutant Genesis)
        { id: "brotherhood", name: "La Confrérie des Mauvais Mutants", card_set_code: "brotherhood" },
        { id: "mystique", name: "Mystique", card_set_code: "mystique" },
        { id: "zero_tolerance", name: "Tolérance Zéro", card_set_code: "zero_tolerance" },
        { id: "sentinels", name: "Sentinelles", card_set_code: "sentinels" },
        { id: "acolytes", name: "Acolytes", card_set_code: "acolytes" },
        { id: "future_past", name: "Futur Antérieur", card_set_code: "future_past" },

        // MojoMania
        { id: "crime", name: "Crime", card_set_code: "crime" },
        { id: "fantasy", name: "Fantasy", card_set_code: "fantasy" },
        { id: "horror", name: "Horreur", card_set_code: "horror" },
        { id: "sci_fi", name: "Science-Fiction", card_set_code: "sci-fi" },
        { id: "sitcom", name: "Sitcom", card_set_code: "sitcom" },
        { id: "western", name: "Western", card_set_code: "western" },

        // NeXT Evolution
        { id: "flight", name: "Vol", card_set_code: "flight" },
        { id: "super_strength", name: "Super Force", card_set_code: "super_strength" },
        { id: "telepathy", name: "Télépathie", card_set_code: "telepathy" },
        { id: "morlocks", name: "Morlocks", card_set_code: "morlocks" },
        { id: "mutant_peacemakers", name: "Pacificateurs Mutants", card_set_code: "mutant_peacemakers" },
        { id: "mutant_provocateurs", name: "Provocateurs Mutants", card_set_code: "mutant_provocateurs" },
        { id: "nasty_boys", name: "Les Mauvais Garçons", card_set_code: "nasty_boys" },
        { id: "reavers", name: "Les Reavers", card_set_code: "reavers" },

        // L'Ère d'Apocalypse (Age of Apocalypse)
        { id: "clan_akkaba", name: "Clan Akkaba", card_set_code: "clan_akkaba" },
        { id: "hounds", name: "Les Chiens de Chasse", card_set_code: "hounds" },
        { id: "infinites", name: "Les Infinis", card_set_code: "infinites" },
        { id: "prelates", name: "Les Prélats", card_set_code: "prelates" },
        { id: "savage_land", name: "Terre Sauvage", card_set_code: "savage_land" },
        { id: "dark_riders", name: "Les Cavaliers de l'Ombre", card_set_code: "dark_riders" },

        // --- Ajoutés automatiquement par generate_villains.py ---
        { id: "military_grade", name: "Équipement Militaire", card_set_code: "military_grade" },
        { id: "mutant_slayers", name: "Tueurs de Mutants", card_set_code: "mutant_slayers" },
        { id: "hope_summers", name: "Hope Summers", card_set_code: "hope_summers" },
        { id: "black_tom_cassidy", name: "Black Tom Cassidy", card_set_code: "black_tom_cassidy" },
        { id: "dystopian_nightmare", name: "Cauchemar Dystopique", card_set_code: "dystopian_nightmare" },
        { id: "celestial_tech", name: "Technologie Céleste", card_set_code: "celestial_tech" }
    ],

    // --- SETS DE DIFFICULTÉ ---
    difficulty: {
        standard_1: { 
            cards: ["01186", "01186", "01187", "01187", "01188", "01189", "01190"] 
        },
        expert_1: { 
            cards: ["01191", "01192", "01193"] 
        },
        standard_2: {
            cards: ["24049", "24050", "24050", "24051", "24052", "24053", "24054", "24054"], 
            start_on_board: ["24049"]
        },
        standard_3: {
            cards: ["45075a", "45076", "45076", "45077", "45077", "45078", "45079", "45080"], 
            start_on_board: ["45075a"]
        },
        expert_2: { 
            cards: ["24029", "24030", "24031", "24032"] 
        }
    }

};
