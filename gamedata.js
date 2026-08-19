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
        { id: "green_goblin_risky_business", name: "Le Bouffon Vert - Business en Risque", card_set_code: "risky_business", stages: [], schemes: [], default_modulars: ["goblin_gimmicks"] },
        { id: "green_goblin_mutagen_formula", name: "Le Bouffon Vert - Formule Mutagène", card_set_code: "mutagen_formula", stages: [], schemes: [], default_modulars: ["goblin_gimmicks"] },
        { id: "wrecking_crew", name: "Les Démolisseurs", card_set_code: "wrecking_crew", stages: [], schemes: [], default_modulars: [] },
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
        { id: "kang", name: "Kang le Conquérant", card_set_code: "kang", stages: [], schemes: [], default_modulars: ["temporal"] },
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
        { id: "collector_infiltrate", name: "Le Collectionneur - Infiltration du Musée", card_set_code: "infiltrate_the_museum", stages: [], schemes: [], default_modulars: ["galactic_artifacts"] },
        { id: "collector_escape", name: "Le Collectionneur - Fuite du Musée", card_set_code: "escape_the_museum", stages: [], schemes: [], default_modulars: ["galactic_artifacts"] },
        { 
            id: "nebula_villain",
            name: "Nébula (Méchante)",
            card_set_code: "nebula_villain",
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
                { id: "thanos_side", name: "Thanos", stages: ["21092", "21093", "21094"] },
                { id: "maw_side", name: "Ebony Maw", stages: ["21095", "21096", "21097"] }
            ], 
            schemes: ["21098","21099"], 
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
        { id: "the_hood", name: "Le Capuchon (The Hood)", card_set_code: "the_hood", stages: [], schemes: [], default_modulars: ["streets_of_mayhem"] },
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
            card_set_code: "venom_villain",
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
        { id: "sinister_six", name: "Les Six Sinistres", card_set_code: "sinister_six", stages: [], schemes: [], default_modulars: ["guerilla_tactics"] },
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
        { id: "sentinel", name: "Sentinelle", card_set_code: "sentinel", stages: [], schemes: [], default_modulars: ["zero_tolerance"] },
        { id: "master_mold", name: "Moule Initial", card_set_code: "master_mold", stages: [], schemes: [], default_modulars: ["sentinels"] },
        { id: "mansion_attack", name: "Attaque de l'Institut", card_set_code: "mansion_attack", stages: [], schemes: [], default_modulars: ["brotherhood"] },
        { id: "magneto_villain", name: "Magnéto (Méchant)", card_set_code: "magneto_villain", stages: [], schemes: [], default_modulars: ["acolytes"] },
        { id: "magog", name: "Magog", card_set_code: "magog", stages: [], schemes: [], default_modulars: ["crime"] },
        { id: "spiral", name: "Spirale", card_set_code: "spiral", stages: [], schemes: [], default_modulars: ["fantasy"] },
        { id: "mojo", name: "Mojo", card_set_code: "mojo", stages: [], schemes: [], default_modulars: ["sitcom"] },
        { id: "morlock_siege", name: "Siège des Morlocks", card_set_code: "morlock_siege", stages: [], schemes: [], default_modulars: ["mutant_peacemakers"] },
        { id: "on_the_run", name: "En Fuite", card_set_code: "on_the_run", stages: [], schemes: [], default_modulars: ["mutant_provocateurs"] },
        { id: "juggernaut", name: "Le Fléau (Juggernaut)", card_set_code: "juggernaut", stages: [], schemes: [], default_modulars: ["nasty_boys"] },
        { id: "mister_sinister", name: "Monsieur Sinistre", card_set_code: "mister_sinister", stages: [], schemes: [], default_modulars: ["reavers"] },
        { id: "stryfe", name: "Stryfe", card_set_code: "stryfe", stages: [], schemes: [], default_modulars: ["zero_tolerance"] },
        { id: "unus", name: "Unus l'Intouchable", card_set_code: "unus", stages: [], schemes: [], default_modulars: ["infinites"] },
        { id: "four_horsemen", name: "Les Quatre Cavaliers", card_set_code: "four_horsemen", stages: [], schemes: [], default_modulars: ["clan_akkaba"] },
        { id: "apocalypse", name: "Apocalypse", card_set_code: "apocalypse", stages: [], schemes: [], default_modulars: ["prelates"] },
        { id: "dark_phoenix", name: "Phénix Noir", card_set_code: "dark_phoenix", stages: [], schemes: [], default_modulars: [] },
        { id: "en_sabah_nur", name: "En Sabah Nur", card_set_code: "en_sabah_nur", stages: [], schemes: [], default_modulars: [] }
    ],

    // --- SETS MODULAIRES ---
    modulars: [
        // --- Existants ---
        { id: "bomb_scare", name: "Alerte à la Bombe", card_set_code: "bomb_scare" },
        { id: "masters_of_evil", name: "Les Maîtres du Mal", card_set_code: "masters_of_evil" },
        { id: "under_attack", name: "En Pleine Attaque", card_set_code: "under_attack" },
        { id: "legions_of_hydra", name: "Légions de l'Hydra", card_set_code: "legions_of_hydra" },
        { id: "doomsday_chair", name: "Le Siège de l'Apocalypse", card_set_code: "doomsday_chair" },
        

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
        { id: "master_of_time", name: "Maître du Temps", card_set_code: "master_of_time" },

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
        { id: "sci_fi", name: "Science-Fiction", card_set_code: "sci_fi" },
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
        { id: "dark_riders", name: "Les Cavaliers de l'Ombre", card_set_code: "dark_riders" }
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
