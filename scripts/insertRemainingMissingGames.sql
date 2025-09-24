-- Insert only the games that are actually missing from the database
-- Excludes: Doom, Metal Gear Solid 3 Snake Eater, Mortal Kombat, Pokémon Red Version (already exist)

INSERT INTO game (
  igdb_id, game_id, name, slug, release_date, summary, cover_url, developer, publisher,
  genres, platforms, created_at, updated_at
) VALUES
  -- Half-Life 2
  (432, '432', 'Half-Life 2', 'half-life-2', '2004-11-16',
   'Half-Life 2 is a science fiction first-person shooter game developed by Valve Corporation. It is the sequel to Half-Life and is considered one of the greatest video games ever made.',
   'https://images.igdb.com/igdb/image/upload/t_cover_big/co3rwa.webp',
   'Valve Corporation', 'Valve Corporation',
   ARRAY['Shooter', 'Adventure'],
   ARRAY['PC (Microsoft Windows)', 'Xbox', 'PlayStation 3', 'Mac', 'Linux', 'Xbox 360'],
   NOW(), NOW()),

  -- The Last of Us
  (1265, '1265', 'The Last of Us', 'the-last-of-us', '2013-06-14',
   'The Last of Us is an action-adventure survival horror game developed by Naughty Dog. Set in a post-apocalyptic world, it follows Joel and Ellie as they navigate through a dangerous landscape.',
   'https://images.igdb.com/igdb/image/upload/t_cover_big/co1r7f.webp',
   'Naughty Dog', 'Sony Computer Entertainment',
   ARRAY['Adventure', 'Shooter'],
   ARRAY['PlayStation 3', 'PlayStation 4'],
   NOW(), NOW()),

  -- Portal 2
  (1030, '1030', 'Portal 2', 'portal-2', '2011-04-18',
   'Portal 2 is a puzzle-platform game developed by Valve Corporation. It is the sequel to Portal and features mind-bending puzzles using portal technology.',
   'https://images.igdb.com/igdb/image/upload/t_cover_big/co2gmh.webp',
   'Valve Corporation', 'Valve Corporation',
   ARRAY['Puzzle', 'Platform', 'Adventure'],
   ARRAY['PC (Microsoft Windows)', 'Mac', 'Linux', 'PlayStation 3', 'Xbox 360'],
   NOW(), NOW()),

  -- Mass Effect 2
  (437, '437', 'Mass Effect 2', 'mass-effect-2', '2010-01-26',
   'Mass Effect 2 is an action role-playing game developed by BioWare. It is the second installment in the Mass Effect series and is widely considered one of the best RPGs ever made.',
   'https://images.igdb.com/igdb/image/upload/t_cover_big/co1vex.webp',
   'BioWare', 'Electronic Arts',
   ARRAY['Role-playing (RPG)', 'Shooter', 'Adventure'],
   ARRAY['PC (Microsoft Windows)', 'Xbox 360', 'PlayStation 3'],
   NOW(), NOW()),

  -- BioShock
  (3025, '3025', 'BioShock', 'bioshock', '2007-08-21',
   'BioShock is a first-person shooter game developed by 2K Boston. Set in the underwater city of Rapture, it combines shooting gameplay with RPG elements and a compelling narrative.',
   'https://images.igdb.com/igdb/image/upload/t_cover_big/co2md0.webp',
   '2K Boston', '2K Games',
   ARRAY['Shooter', 'Role-playing (RPG)', 'Adventure'],
   ARRAY['PC (Microsoft Windows)', 'Xbox 360', 'PlayStation 3', 'Mac', 'iOS'],
   NOW(), NOW()),

  -- World of Warcraft
  (119, '119', 'World of Warcraft', 'world-of-warcraft', '2004-11-23',
   'World of Warcraft is a massively multiplayer online role-playing game developed by Blizzard Entertainment. Set in the Warcraft fantasy universe, it has become one of the most popular MMORPGs of all time.',
   'https://images.igdb.com/igdb/image/upload/t_cover_big/co49wj.webp',
   'Blizzard Entertainment', 'Blizzard Entertainment',
   ARRAY['Role-playing (RPG)', 'Adventure'],
   ARRAY['PC (Microsoft Windows)', 'Mac'],
   NOW(), NOW()),

  -- Halo: Combat Evolved
  (739, '739', 'Halo: Combat Evolved', 'halo-combat-evolved', '2001-11-15',
   'Halo: Combat Evolved is a first-person shooter game developed by Bungie. It launched the Xbox console and the Halo franchise, revolutionizing console FPS games.',
   'https://images.igdb.com/igdb/image/upload/t_cover_big/co1x7z.webp',
   'Bungie', 'Microsoft Game Studios',
   ARRAY['Shooter'],
   ARRAY['Xbox', 'PC (Microsoft Windows)', 'Mac'],
   NOW(), NOW()),

  -- Red Dead Redemption
  (1045, '1045', 'Red Dead Redemption', 'red-dead-redemption', '2010-05-18',
   'Red Dead Redemption is an action-adventure game developed by Rockstar San Diego. Set in the American Old West, it follows John Marston as he hunts down former gang members.',
   'https://images.igdb.com/igdb/image/upload/t_cover_big/co1q1f.webp',
   'Rockstar San Diego', 'Rockstar Games',
   ARRAY['Adventure', 'Shooter'],
   ARRAY['PlayStation 3', 'Xbox 360', 'Nintendo Switch', 'PlayStation 4', 'Xbox One'],
   NOW(), NOW()),

  -- Castlevania: Symphony of the Night
  (1552, '1552', 'Castlevania: Symphony of the Night', 'castlevania-symphony-of-the-night', '1997-03-20',
   'Castlevania: Symphony of the Night is an action-adventure game developed by Konami. It is considered one of the greatest video games of all time and helped define the Metroidvania genre.',
   'https://images.igdb.com/igdb/image/upload/t_cover_big/co2e2v.webp',
   'Konami', 'Konami',
   ARRAY['Platform', 'Adventure', 'Role-playing (RPG)'],
   ARRAY['PlayStation', 'Sega Saturn', 'PlayStation Portable', 'Xbox 360', 'PlayStation 4'],
   NOW(), NOW()),

  -- Uncharted 2: Among Thieves
  (1875, '1875', 'Uncharted 2: Among Thieves', 'uncharted-2-among-thieves', '2009-10-13',
   'Uncharted 2: Among Thieves is an action-adventure game developed by Naughty Dog. It follows Nathan Drake as he searches for the Cintamani Stone and the lost city of Shambhala.',
   'https://images.igdb.com/igdb/image/upload/t_cover_big/co1tmu.webp',
   'Naughty Dog', 'Sony Computer Entertainment',
   ARRAY['Adventure', 'Shooter', 'Platform'],
   ARRAY['PlayStation 3', 'PlayStation 4'],
   NOW(), NOW()),

  -- Metroid Prime
  (471, '471', 'Metroid Prime', 'metroid-prime', '2002-11-17',
   'Metroid Prime is a first-person action-adventure game developed by Retro Studios. It successfully translated the Metroid series into 3D while maintaining the exploration-focused gameplay.',
   'https://images.igdb.com/igdb/image/upload/t_cover_big/co1nmn.webp',
   'Retro Studios', 'Nintendo',
   ARRAY['Adventure', 'Shooter'],
   ARRAY['GameCube', 'Wii'],
   NOW(), NOW()),

  -- Final Fantasy VI
  (1024, '1024', 'Final Fantasy VI', 'final-fantasy-vi', '1994-04-02',
   'Final Fantasy VI is a role-playing game developed by Square. It is widely regarded as one of the greatest RPGs of all time, featuring an ensemble cast and an epic story.',
   'https://images.igdb.com/igdb/image/upload/t_cover_big/co3p2d.webp',
   'Square', 'Square',
   ARRAY['Role-playing (RPG)', 'Turn-based strategy (TBS)'],
   ARRAY['Super Nintendo Entertainment System', 'PlayStation', 'Game Boy Advance', 'Nintendo DS', 'PlayStation Portable', 'iOS', 'Android', 'PC (Microsoft Windows)', 'PlayStation 3', 'PlayStation Vita'],
   NOW(), NOW()),

  -- Half-Life
  (430, '430', 'Half-Life', 'half-life', '1998-11-19',
   'Half-Life is a science fiction first-person shooter developed by Valve Corporation. It revolutionized the FPS genre with its immersive storytelling and seamless gameplay.',
   'https://images.igdb.com/igdb/image/upload/t_cover_big/co1rs7.webp',
   'Valve Corporation', 'Valve Corporation',
   ARRAY['Shooter', 'Adventure'],
   ARRAY['PC (Microsoft Windows)', 'PlayStation 2', 'Mac', 'Linux'],
   NOW(), NOW()),

  -- Deus Ex
  (421, '421', 'Deus Ex', 'deus-ex', '2000-06-17',
   'Deus Ex is a cyberpunk-themed action RPG developed by Ion Storm. It combines first-person shooting, stealth, and role-playing elements in a conspiracy-driven story.',
   'https://images.igdb.com/igdb/image/upload/t_cover_big/co1qaa.webp',
   'Ion Storm', 'Eidos Interactive',
   ARRAY['Role-playing (RPG)', 'Shooter', 'Adventure'],
   ARRAY['PC (Microsoft Windows)', 'Mac', 'PlayStation 2'],
   NOW(), NOW()),

  -- Super Metroid
  (1006, '1006', 'Super Metroid', 'super-metroid', '1994-03-19',
   'Super Metroid is an action-adventure game developed by Nintendo R&D1. It is considered one of the greatest video games of all time and a masterpiece of the Metroidvania genre.',
   'https://images.igdb.com/igdb/image/upload/t_cover_big/co1nmk.webp',
   'Nintendo R&D1', 'Nintendo',
   ARRAY['Platform', 'Adventure', 'Shooter'],
   ARRAY['Super Nintendo Entertainment System', 'Game Boy Advance', 'Wii', 'Nintendo 3DS', 'Wii U', 'New Nintendo 3DS'],
   NOW(), NOW()),

  -- Gran Turismo
  (1029, '1029', 'Gran Turismo', 'gran-turismo', '1997-12-23',
   'Gran Turismo is a racing simulation game developed by Polyphony Digital. It set the standard for realistic racing games and launched one of the most successful racing franchises.',
   'https://images.igdb.com/igdb/image/upload/t_cover_big/co1r3j.webp',
   'Polyphony Digital', 'Sony Computer Entertainment',
   ARRAY['Racing', 'Simulator', 'Sport'],
   ARRAY['PlayStation', 'PlayStation Portable'],
   NOW(), NOW()),

  -- God of War (2005)
  (1447, '1447', 'God of War', 'god-of-war-2005', '2005-03-22',
   'God of War is an action-adventure game developed by Santa Monica Studio. It follows Kratos, a Spartan warrior seeking revenge against the Greek gods.',
   'https://images.igdb.com/igdb/image/upload/t_cover_big/co1thr.webp',
   'Santa Monica Studio', 'Sony Computer Entertainment',
   ARRAY['Adventure', 'Hack and slash/Beat ''em up'],
   ARRAY['PlayStation 2', 'PlayStation 3', 'PlayStation Vita'],
   NOW(), NOW())

ON CONFLICT (igdb_id) DO NOTHING;