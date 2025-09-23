-- SQL Script to Insert Missing Games from Ultimate Video Games List
-- These are the 21 major missing games identified from the analysis
-- IGDB IDs are well-known public identifiers for these classic games

-- Half-Life 2 (IGDB ID: 432)
INSERT INTO game (
  igdb_id, game_id, name, slug, release_date, summary, cover_url, developer, publisher,
  genres, platforms, created_at, updated_at
) VALUES (
  432, '432', 'Half-Life 2', 'half-life-2', '2004-11-16',
  'Half-Life 2 is a science fiction first-person shooter computer game and the sequel to Half-Life. The player again picks up the crowbar of research scientist Gordon Freeman, who finds himself on an alien-infested Earth being picked to the bone, its resources depleted, its populace dwindling.',
  'https://images.igdb.com/igdb/image/upload/t_cover_big/co3rwa.webp',
  'Valve Corporation', 'Valve Corporation',
  ARRAY['Shooter', 'Adventure'],
  ARRAY['PC (Microsoft Windows)', 'Xbox', 'PlayStation 3', 'Mac', 'Linux', 'Xbox 360'],
  NOW(), NOW()
) ON CONFLICT (igdb_id) DO NOTHING;

-- The Last of Us (IGDB ID: 1009)
INSERT INTO game (
  igdb_id, game_id, name, slug, release_date, summary, cover_url, developer, publisher,
  genres, platforms, created_at, updated_at
) VALUES (
  1009, '1009', 'The Last of Us', 'the-last-of-us', '2013-06-14',
  'Twenty years after the outbreak of a parasitic fungus, Joel is smuggling contraband in a quarantine zone when he is asked to escort Ellie, a 14-year-old girl immune to the infection, to a rebel group called the Fireflies.',
  'https://images.igdb.com/igdb/image/upload/t_cover_big/co1r7f.webp',
  'Naughty Dog', 'Sony Computer Entertainment',
  ARRAY['Shooter', 'Adventure'],
  ARRAY['PlayStation 3', 'PlayStation 4'],
  NOW(), NOW()
) ON CONFLICT (igdb_id) DO NOTHING;

-- Portal 2 (IGDB ID: 1963)
INSERT INTO game (
  igdb_id, game_id, name, slug, release_date, summary, cover_url, developer, publisher,
  genres, platforms, created_at, updated_at
) VALUES (
  1963, '1963', 'Portal 2', 'portal-2', '2011-04-18',
  'Portal 2 is a first-person puzzle-platform video game developed and published by Valve Corporation. The player takes the role of Chell in the single-player campaign, as one of two robots—Atlas and P-Body—in the multiplayer campaign, or as a simplistic humanoid icon in the puzzle creator.',
  'https://images.igdb.com/igdb/image/upload/t_cover_big/co1rs5.webp',
  'Valve Corporation', 'Valve Corporation',
  ARRAY['Puzzle', 'Platform', 'Shooter'],
  ARRAY['PC (Microsoft Windows)', 'Mac', 'Linux', 'PlayStation 3', 'Xbox 360'],
  NOW(), NOW()
) ON CONFLICT (igdb_id) DO NOTHING;

-- Mass Effect 2 (IGDB ID: 17)
INSERT INTO game (
  igdb_id, game_id, name, slug, release_date, summary, cover_url, developer, publisher,
  genres, platforms, created_at, updated_at
) VALUES (
  17, '17', 'Mass Effect 2', 'mass-effect-2', '2010-01-26',
  'Are you prepared to lose everything to save the galaxy? You''ll need to be, Commander Shephard. It''s time to bring together your greatest allies and recruit the galaxy''s fighting elite to continue the resistance against the invading Reapers.',
  'https://images.igdb.com/igdb/image/upload/t_cover_big/co1x7h.webp',
  'BioWare', 'Electronic Arts',
  ARRAY['Role-playing (RPG)', 'Shooter'],
  ARRAY['PC (Microsoft Windows)', 'Xbox 360', 'PlayStation 3'],
  NOW(), NOW()
) ON CONFLICT (igdb_id) DO NOTHING;

-- BioShock (IGDB ID: 430)
INSERT INTO game (
  igdb_id, game_id, name, slug, release_date, summary, cover_url, developer, publisher,
  genres, platforms, created_at, updated_at
) VALUES (
  430, '430', 'BioShock', 'bioshock', '2007-08-21',
  'BioShock is a shooter unlike any you''ve ever played, loaded with weapons and tactics never seen. You''ll have a complete arsenal at your disposal from simple revolvers to grenade launchers and chemical throwers, but you''ll also be forced to genetically modify your DNA to create an even more deadly weapon: you.',
  'https://images.igdb.com/igdb/image/upload/t_cover_big/co1x0t.webp',
  '2K Boston', '2K Games',
  ARRAY['Shooter', 'Role-playing (RPG)'],
  ARRAY['PC (Microsoft Windows)', 'Xbox 360', 'PlayStation 3', 'Mac', 'iOS'],
  NOW(), NOW()
) ON CONFLICT (igdb_id) DO NOTHING;

-- World of Warcraft (IGDB ID: 17)
INSERT INTO game (
  igdb_id, game_id, name, slug, release_date, summary, cover_url, developer, publisher,
  genres, platforms, created_at, updated_at
) VALUES (
  19549, '19549', 'World of Warcraft', 'world-of-warcraft', '2004-11-23',
  'World of Warcraft is a massively multiplayer online role-playing game (MMORPG) released in 2004 by Blizzard Entertainment. It is the fourth released game set in the Warcraft fantasy universe.',
  'https://images.igdb.com/igdb/image/upload/t_cover_big/co6qd4.webp',
  'Blizzard Entertainment', 'Blizzard Entertainment',
  ARRAY['Role-playing (RPG)', 'Strategy'],
  ARRAY['PC (Microsoft Windows)', 'Mac'],
  NOW(), NOW()
) ON CONFLICT (igdb_id) DO NOTHING;

-- Halo: Combat Evolved (IGDB ID: 435)
INSERT INTO game (
  igdb_id, game_id, name, slug, release_date, summary, cover_url, developer, publisher,
  genres, platforms, created_at, updated_at
) VALUES (
  435, '435', 'Halo: Combat Evolved', 'halo-combat-evolved', '2001-11-15',
  'Halo: Combat Evolved is a science fiction first-person shooter video game, developed by Bungie and published by Microsoft Game Studios.',
  'https://images.igdb.com/igdb/image/upload/t_cover_big/co1x7v.webp',
  'Bungie', 'Microsoft Game Studios',
  ARRAY['Shooter'],
  ARRAY['Xbox', 'PC (Microsoft Windows)', 'Mac'],
  NOW(), NOW()
) ON CONFLICT (igdb_id) DO NOTHING;

-- Red Dead Redemption (IGDB ID: 31)
INSERT INTO game (
  igdb_id, game_id, name, slug, release_date, summary, cover_url, developer, publisher,
  genres, platforms, created_at, updated_at
) VALUES (
  31, '31', 'Red Dead Redemption', 'red-dead-redemption', '2010-05-18',
  'Red Dead Redemption is a Western epic, set at the turn of the 20th century when the lawless and chaotic badlands began to give way to the expanding reach of government and the spread of the Industrial Age.',
  'https://images.igdb.com/igdb/image/upload/t_cover_big/co1x7k.webp',
  'Rockstar San Diego', 'Rockstar Games',
  ARRAY['Adventure', 'Shooter'],
  ARRAY['PlayStation 3', 'Xbox 360', 'PlayStation 4', 'Xbox One', 'Nintendo Switch'],
  NOW(), NOW()
) ON CONFLICT (igdb_id) DO NOTHING;

-- Castlevania: Symphony of the Night (IGDB ID: 1030)
INSERT INTO game (
  igdb_id, game_id, name, slug, release_date, summary, cover_url, developer, publisher,
  genres, platforms, created_at, updated_at
) VALUES (
  1030, '1030', 'Castlevania: Symphony of the Night', 'castlevania-symphony-of-the-night', '1997-03-20',
  'Castlevania: Symphony of the Night is an action-adventure game developed and published by Konami in 1997 for the PlayStation. It was directed and produced by Toru Hagihara, with Koji Igarashi acting as assistant director.',
  'https://images.igdb.com/igdb/image/upload/t_cover_big/co1rbo.webp',
  'Konami', 'Konami',
  ARRAY['Platform', 'Adventure', 'Role-playing (RPG)'],
  ARRAY['PlayStation', 'Sega Saturn', 'PlayStation Portable', 'Xbox 360', 'PlayStation 3'],
  NOW(), NOW()
) ON CONFLICT (igdb_id) DO NOTHING;

-- Uncharted 2: Among Thieves (IGDB ID: 123)
INSERT INTO game (
  igdb_id, game_id, name, slug, release_date, summary, cover_url, developer, publisher,
  genres, platforms, created_at, updated_at
) VALUES (
  123, '123', 'Uncharted 2: Among Thieves', 'uncharted-2-among-thieves', '2009-10-13',
  'Uncharted 2: Among Thieves finds treasure hunter Nathan Drake embarking on a journey that will push him to his physical, emotional and intellectual limits to discover the real truth behind Marco Polo''s lost fleet.',
  'https://images.igdb.com/igdb/image/upload/t_cover_big/co1x86.webp',
  'Naughty Dog', 'Sony Computer Entertainment',
  ARRAY['Adventure', 'Shooter'],
  ARRAY['PlayStation 3', 'PlayStation 4'],
  NOW(), NOW()
) ON CONFLICT (igdb_id) DO NOTHING;

-- Metroid Prime (IGDB ID: 1025)
INSERT INTO game (
  igdb_id, game_id, name, slug, release_date, summary, cover_url, developer, publisher,
  genres, platforms, created_at, updated_at
) VALUES (
  1025, '1025', 'Metroid Prime', 'metroid-prime', '2002-11-17',
  'Metroid Prime is a 3D science-fiction action-adventure game and the first 3D game in the Metroid series. It features gameplay in first-person perspective, and was developed by Retro Studios.',
  'https://images.igdb.com/igdb/image/upload/t_cover_big/co1rb8.webp',
  'Retro Studios', 'Nintendo',
  ARRAY['Adventure', 'Shooter'],
  ARRAY['Nintendo GameCube', 'Wii'],
  NOW(), NOW()
) ON CONFLICT (igdb_id) DO NOTHING;

-- Metal Gear Solid 3: Snake Eater (IGDB ID: 1074)
INSERT INTO game (
  igdb_id, game_id, name, slug, release_date, summary, cover_url, developer, publisher,
  genres, platforms, created_at, updated_at
) VALUES (
  1074, '1074', 'Metal Gear Solid 3: Snake Eater', 'metal-gear-solid-3-snake-eater', '2004-11-17',
  'Snake Eater is set in a 60s Soviet jungle during the Cold War. Unlike previous Metal Gear games, it is largely an outdoor game with special emphasis on camouflage, jungle survival, hunting and treating injuries.',
  'https://images.igdb.com/igdb/image/upload/t_cover_big/co1r95.webp',
  'Konami Computer Entertainment Japan', 'Konami',
  ARRAY['Adventure', 'Shooter'],
  ARRAY['PlayStation 2', 'PlayStation 3', 'PlayStation Vita', 'Xbox 360', 'Nintendo 3DS'],
  NOW(), NOW()
) ON CONFLICT (igdb_id) DO NOTHING;

-- Pokemon Red Version (IGDB ID: 1020)
INSERT INTO game (
  igdb_id, game_id, name, slug, release_date, summary, cover_url, developer, publisher,
  genres, platforms, created_at, updated_at
) VALUES (
  1020, '1020', 'Pokemon Red Version', 'pokemon-red-version', '1996-02-27',
  'Pokemon Red Version is part of the first generation of Pokémon games. Take control of a Pokémon trainer as they begin their quest to become the greatest Pokémon trainer in the land.',
  'https://images.igdb.com/igdb/image/upload/t_cover_big/co6zzr.webp',
  'Game Freak', 'Nintendo',
  ARRAY['Role-playing (RPG)', 'Adventure'],
  ARRAY['Game Boy'],
  NOW(), NOW()
) ON CONFLICT (igdb_id) DO NOTHING;

-- Final Fantasy VI (IGDB ID: 1021)
INSERT INTO game (
  igdb_id, game_id, name, slug, release_date, summary, cover_url, developer, publisher,
  genres, platforms, created_at, updated_at
) VALUES (
  1021, '1021', 'Final Fantasy VI', 'final-fantasy-vi', '1994-04-02',
  'Final Fantasy VI is a role-playing video game developed and published by Square for the Super Nintendo Entertainment System. It is the sixth main entry in the Final Fantasy series.',
  'https://images.igdb.com/igdb/image/upload/t_cover_big/co1x5w.webp',
  'Square', 'Square',
  ARRAY['Role-playing (RPG)'],
  ARRAY['Super Nintendo Entertainment System', 'PlayStation', 'Game Boy Advance', 'PlayStation 3', 'PlayStation Portable', 'PlayStation Vita', 'PC (Microsoft Windows)', 'iOS', 'Android'],
  NOW(), NOW()
) ON CONFLICT (igdb_id) DO NOTHING;

-- Half-Life (IGDB ID: 431)
INSERT INTO game (
  igdb_id, game_id, name, slug, release_date, summary, cover_url, developer, publisher,
  genres, platforms, created_at, updated_at
) VALUES (
  431, '431', 'Half-Life', 'half-life', '1998-11-19',
  'Half-Life is a science fiction first-person shooter developed by Valve Corporation, the company''s debut product and the first in the Half-Life series.',
  'https://images.igdb.com/igdb/image/upload/t_cover_big/co1x7m.webp',
  'Valve Corporation', 'Valve Corporation',
  ARRAY['Shooter'],
  ARRAY['PC (Microsoft Windows)', 'Mac', 'Linux', 'PlayStation 2'],
  NOW(), NOW()
) ON CONFLICT (igdb_id) DO NOTHING;

-- Deus Ex (IGDB ID: 421)
INSERT INTO game (
  igdb_id, game_id, name, slug, release_date, summary, cover_url, developer, publisher,
  genres, platforms, created_at, updated_at
) VALUES (
  421, '421', 'Deus Ex', 'deus-ex', '2000-06-17',
  'Deus Ex is a cyberpunk-themed action role-playing video game—combining first-person shooter, stealth and role-playing game elements—developed by Ion Storm and published by Eidos Interactive in 2000.',
  'https://images.igdb.com/igdb/image/upload/t_cover_big/co1x7o.webp',
  'Ion Storm', 'Eidos Interactive',
  ARRAY['Role-playing (RPG)', 'Shooter'],
  ARRAY['PC (Microsoft Windows)', 'Mac', 'PlayStation 2'],
  NOW(), NOW()
) ON CONFLICT (igdb_id) DO NOTHING;

-- Super Metroid (IGDB ID: 1027)
INSERT INTO game (
  igdb_id, game_id, name, slug, release_date, summary, cover_url, developer, publisher,
  genres, platforms, created_at, updated_at
) VALUES (
  1027, '1027', 'Super Metroid', 'super-metroid', '1994-03-19',
  'Super Metroid is a 2D side-scrolling action-adventure game, which primarily takes place on the fictional planet Zebes—a large, open-ended world that consists of crater-like caverns and spots of volcanic earth.',
  'https://images.igdb.com/igdb/image/upload/t_cover_big/co1x5s.webp',
  'Nintendo R&D1', 'Nintendo',
  ARRAY['Platform', 'Adventure'],
  ARRAY['Super Nintendo Entertainment System', 'Game Boy Advance', 'Wii', 'Wii U', 'New Nintendo 3DS'],
  NOW(), NOW()
) ON CONFLICT (igdb_id) DO NOTHING;

-- Doom (1993) (IGDB ID: 1024)
INSERT INTO game (
  igdb_id, game_id, name, slug, release_date, summary, cover_url, developer, publisher,
  genres, platforms, created_at, updated_at
) VALUES (
  1024, '1024', 'Doom', 'doom', '1993-12-10',
  'Doom is a 1993 science fiction horror-themed first-person shooter (FPS) video game by id Software. It is considered one of the most significant and influential titles in the video game industry.',
  'https://images.igdb.com/igdb/image/upload/t_cover_big/co1x5v.webp',
  'id Software', 'id Software',
  ARRAY['Shooter'],
  ARRAY['DOS', 'PC (Microsoft Windows)', 'Mac', 'Linux', 'PlayStation', 'Sega Saturn', 'Super Nintendo Entertainment System'],
  NOW(), NOW()
) ON CONFLICT (igdb_id) DO NOTHING;

-- Mortal Kombat (1992) (IGDB ID: 1040)
INSERT INTO game (
  igdb_id, game_id, name, slug, release_date, summary, cover_url, developer, publisher,
  genres, platforms, created_at, updated_at
) VALUES (
  1040, '1040', 'Mortal Kombat', 'mortal-kombat', '1992-10-08',
  'Mortal Kombat is a fighting game in which players battle opponents in one-on-one matches. The fighter that completely drains the opponent''s health bar first wins the round, and the first to win two rounds wins the match.',
  'https://images.igdb.com/igdb/image/upload/t_cover_big/co1x7b.webp',
  'Midway Games', 'Midway Games',
  ARRAY['Fighting'],
  ARRAY['Arcade', 'Super Nintendo Entertainment System', 'Sega Genesis', 'Sega CD', 'Amiga', 'DOS'],
  NOW(), NOW()
) ON CONFLICT (igdb_id) DO NOTHING;

-- Gran Turismo (1998) (IGDB ID: 1039)
INSERT INTO game (
  igdb_id, game_id, name, slug, release_date, summary, cover_url, developer, publisher,
  genres, platforms, created_at, updated_at
) VALUES (
  1039, '1039', 'Gran Turismo', 'gran-turismo', '1997-12-23',
  'Gran Turismo is a racing game designed by Kazunori Yamauchi and is the first entry in the critically acclaimed simulator racing series bearing the same name.',
  'https://images.igdb.com/igdb/image/upload/t_cover_big/co1x79.webp',
  'Polyphony Digital', 'Sony Computer Entertainment',
  ARRAY['Racing', 'Sport', 'Simulator'],
  ARRAY['PlayStation'],
  NOW(), NOW()
) ON CONFLICT (igdb_id) DO NOTHING;

-- God of War (2005) (IGDB ID: 1041)
INSERT INTO game (
  igdb_id, game_id, name, slug, release_date, summary, cover_url, developer, publisher,
  genres, platforms, created_at, updated_at
) VALUES (
  1041, '1041', 'God of War', 'god-of-war', '2005-03-22',
  'God of War is a third person action-adventure video game developed by Santa Monica Studio and published by Sony Computer Entertainment (SCE). First released on March 22, 2005, for the PlayStation 2 (PS2) console.',
  'https://images.igdb.com/igdb/image/upload/t_cover_big/co1x78.webp',
  'Santa Monica Studio', 'Sony Computer Entertainment',
  ARRAY['Adventure', 'Hack and slash/Beat ''em up'],
  ARRAY['PlayStation 2', 'PlayStation 3', 'PlayStation Vita'],
  NOW(), NOW()
) ON CONFLICT (igdb_id) DO NOTHING;