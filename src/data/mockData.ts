export const mockGames = [
  {
    id: '1',
    title: 'The Witcher 3: Wild Hunt',
    coverImage: 'https://images.pexels.com/photos/442576/pexels-photo-442576.jpeg?auto=compress&cs=tinysrgb&w=400',
    releaseDate: '2015-05-19',
    genre: 'RPG',
    rating: 9.3,
    description: 'You are Geralt of Rivia, mercenary monster slayer. Before you lies a war-torn, monster-infested continent you can explore at will. Your current contract? Tracking down Ciri — the Child of Prophecy, a living weapon that can alter the shape of the world.',
    developer: 'CD Projekt Red',
    publisher: 'CD Projekt'
  },
  {
    id: '2',
    title: 'Cyberpunk 2077',
    coverImage: 'https://images.pexels.com/photos/2047905/pexels-photo-2047905.jpeg?auto=compress&cs=tinysrgb&w=400',
    releaseDate: '2020-12-10',
    genre: 'RPG',
    rating: 7.8,
    description: 'Cyberpunk 2077 is an open-world, action-adventure story set in Night City, a megalopolis obsessed with power, glamour and body modification.',
    developer: 'CD Projekt Red',
    publisher: 'CD Projekt'
  },
  {
    id: '3',
    title: 'Red Dead Redemption 2',
    coverImage: 'https://images.pexels.com/photos/3165335/pexels-photo-3165335.jpeg?auto=compress&cs=tinysrgb&w=400',
    releaseDate: '2018-10-26',
    genre: 'Action',
    rating: 9.7,
    description: 'America, 1899. Arthur Morgan and the Van der Linde gang are outlaws on the run. With federal agents and the best bounty hunters in the nation massing on their heels, the gang must rob, steal and fight their way across the rugged heartland of America.',
    developer: 'Rockstar Games',
    publisher: 'Rockstar Games'
  },
  {
    id: '4',
    title: 'The Last of Us Part II',
    coverImage: 'https://images.pexels.com/photos/3945667/pexels-photo-3945667.jpeg?auto=compress&cs=tinysrgb&w=400',
    releaseDate: '2020-06-19',
    genre: 'Action',
    rating: 8.9,
    description: 'Five years after their dangerous journey across the post-pandemic United States, Ellie and Joel have settled down in Jackson, Wyoming. Living amongst a thriving community of survivors has allowed them peace and stability.',
    developer: 'Naughty Dog',
    publisher: 'Sony Interactive Entertainment'
  },
  {
    id: '5',
    title: 'God of War',
    coverImage: 'https://images.pexels.com/photos/3945670/pexels-photo-3945670.jpeg?auto=compress&cs=tinysrgb&w=400',
    releaseDate: '2018-04-20',
    genre: 'Action',
    rating: 9.5,
    description: 'His vengeance against the Gods of Olympus years behind him, Kratos now lives as a man in the realm of Norse Gods and monsters. It is in this harsh, unforgiving world that he must fight to survive.',
    developer: 'Santa Monica Studio',
    publisher: 'Sony Interactive Entertainment'
  },
  {
    id: '6',
    title: 'Horizon Zero Dawn',
    coverImage: 'https://images.pexels.com/photos/3945672/pexels-photo-3945672.jpeg?auto=compress&cs=tinysrgb&w=400',
    releaseDate: '2017-02-28',
    genre: 'Action',
    rating: 8.7,
    description: 'Experience Aloy\'s entire legendary quest to unravel the mysteries of a world ruled by deadly Machines. An outcast from her tribe, the young hunter fights to uncover her destiny.',
    developer: 'Guerrilla Games',
    publisher: 'Sony Interactive Entertainment'
  },
  {
    id: '7',
    title: 'Elden Ring',
    coverImage: 'https://images.pexels.com/photos/3945654/pexels-photo-3945654.jpeg?auto=compress&cs=tinysrgb&w=400',
    releaseDate: '2022-02-25',
    genre: 'RPG',
    rating: 9.6,
    description: 'THE NEW FANTASY ACTION RPG. Rise, Tarnished, and be guided by grace to brandish the power of the Elden Ring and become an Elden Lord in the Lands Between.',
    developer: 'FromSoftware',
    publisher: 'Bandai Namco Entertainment'
  },
  {
    id: '8',
    title: 'Ghost of Tsushima',
    coverImage: 'https://images.pexels.com/photos/3945656/pexels-photo-3945656.jpeg?auto=compress&cs=tinysrgb&w=400',
    releaseDate: '2020-07-17',
    genre: 'Action',
    rating: 8.8,
    description: 'In the late 13th century, the Mongol empire has laid waste to entire nations along their campaign to conquer the East. Tsushima Island is all that stands between mainland Japan and a massive Mongol invasion fleet.',
    developer: 'Sucker Punch Productions',
    publisher: 'Sony Interactive Entertainment'
  }
];

export const mockUsers = [
  {
    id: '1',
    username: 'GameMaster92',
    avatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150',
    bio: 'Gaming enthusiast with a passion for RPGs and indie games. Always looking for the next great adventure.',
    joinDate: 'January 2022',
    reviewCount: 45,
    followers: 234,
    following: 67
  },
  {
    id: '2',
    username: 'PixelPundit',
    avatar: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=150',
    bio: 'Retro gaming aficionado and modern gaming critic. Love exploring game design and storytelling.',
    joinDate: 'March 2021',
    reviewCount: 78,
    followers: 456,
    following: 123
  },
  {
    id: '3',
    username: 'NightOwlGamer',
    avatar: 'https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=150',
    bio: 'Late-night gaming sessions and comprehensive reviews. Specializing in horror and action games.',
    joinDate: 'June 2020',
    reviewCount: 92,
    followers: 612,
    following: 89
  },
  {
    id: '4',
    username: 'CasualCritic',
    avatar: 'https://images.pexels.com/photos/1310522/pexels-photo-1310522.jpeg?auto=compress&cs=tinysrgb&w=150',
    bio: 'Casual gamer with serious opinions. I play everything and review what matters.',
    joinDate: 'September 2022',
    reviewCount: 23,
    followers: 87,
    following: 45
  }
];

export const mockReviews = [
  {
    id: '1',
    userId: '1',
    gameId: '1',
    rating: 9.5,
    text: 'The Witcher 3 is an absolute masterpiece. The world-building is phenomenal, characters are deep and complex, and the side quests are better than most games\' main stories. Geralt\'s journey is both personal and epic in scope.',
    date: '2024-01-15',
    hasText: true,
    author: 'GameMaster92',
    authorAvatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150'
  },
  {
    id: '2',
    userId: '2',
    gameId: '2',
    rating: 7.0,
    text: 'Cyberpunk 2077 has improved significantly since launch. The world is stunning and the story is engaging, but technical issues still persist. Worth playing if you can look past the bugs.',
    date: '2024-01-10',
    hasText: true,
    author: 'PixelPundit',
    authorAvatar: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=150'
  },
  {
    id: '3',
    userId: '3',
    gameId: '3',
    rating: 10.0,
    text: 'Red Dead Redemption 2 is a technical and narrative marvel. The attention to detail is unprecedented, and Arthur Morgan\'s story is one of the best in gaming. A true work of art.',
    date: '2024-01-08',
    hasText: true,
    author: 'NightOwlGamer',
    authorAvatar: 'https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=150'
  },
  {
    id: '4',
    userId: '4',
    gameId: '4',
    rating: 8.5,
    text: 'The Last of Us Part II is emotionally devastating and mechanically refined. The story is divisive, but the gameplay and production values are top-notch.',
    date: '2024-01-05',
    hasText: true,
    author: 'CasualCritic',
    authorAvatar: 'https://images.pexels.com/photos/1310522/pexels-photo-1310522.jpeg?auto=compress&cs=tinysrgb&w=150'
  },
  {
    id: '5',
    userId: '1',
    gameId: '7',
    rating: 9.0,
    text: 'Elden Ring successfully translates the Souls formula to an open world. The exploration is rewarding and the boss fights are memorable. A must-play for RPG fans.',
    date: '2024-01-03',
    hasText: true,
    author: 'GameMaster92',
    authorAvatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150'
  },
  {
    id: '6',
    userId: '2',
    gameId: '8',
    rating: 8.0,
    text: 'Ghost of Tsushima is visually stunning with satisfying combat. The open world activities can feel repetitive, but the main story and atmosphere make up for it.',
    date: '2024-01-01',
    hasText: true,
    author: 'PixelPundit',
    authorAvatar: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=150'
  }
];