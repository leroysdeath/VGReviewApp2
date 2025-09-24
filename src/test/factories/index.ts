import { faker } from '@faker-js/faker';

// ============================================
// User Factory
// ============================================

export const createMockUser = (overrides: Partial<any> = {}) => ({
  id: faker.number.int({ min: 1, max: 1000 }),
  provider: 'supabase',
  provider_id: faker.string.uuid(),
  email: faker.internet.email(),
  name: faker.person.fullName(),
  username: faker.internet.username().toLowerCase(),
  bio: faker.lorem.paragraph(),
  location: faker.location.city(),
  website: faker.internet.url(),
  is_active: true,
  email_verified: true,
  last_login_at: faker.date.recent().toISOString(),
  created_at: faker.date.past().toISOString(),
  updated_at: faker.date.recent().toISOString(),
  platform: faker.helpers.arrayElement(['PC', 'PlayStation', 'Xbox', 'Nintendo Switch']),
  display_name: faker.person.fullName(),
  avatar_url: faker.image.avatar(),
  follower_count: faker.number.int({ min: 0, max: 1000 }),
  following_count: faker.number.int({ min: 0, max: 500 }),
  total_reviews: faker.number.int({ min: 0, max: 100 }),
  completed_games_count: faker.number.int({ min: 0, max: 200 }),
  started_games_count: faker.number.int({ min: 0, max: 150 }),
  ...overrides
});

// ============================================
// Game Factory
// ============================================

export const createMockGame = (overrides: Partial<any> = {}) => {
  const igdbId = faker.number.int({ min: 1000, max: 99999 });
  const name = faker.company.name() + ' ' + faker.word.noun();
  const slug = name.toLowerCase().replace(/\s+/g, '-');
  
  return {
    id: faker.number.int({ min: 1, max: 100000 }),
    game_id: `game_${igdbId}`,
    igdb_id: igdbId,
    name: name,
    slug: slug,
    release_date: faker.date.past({ years: 10 }).toISOString().split('T')[0],
    description: faker.lorem.paragraphs(3),
    summary: faker.lorem.paragraph(),
    pic_url: `https://images.igdb.com/igdb/image/upload/t_cover_big/${faker.string.alphanumeric(12)}.jpg`,
    cover_url: `https://images.igdb.com/igdb/image/upload/t_cover_big/${faker.string.alphanumeric(12)}.jpg`,
    screenshots: Array.from({ length: 4 }, () => 
      `https://images.igdb.com/igdb/image/upload/t_screenshot_big/${faker.string.alphanumeric(12)}.jpg`
    ),
    developer: faker.company.name(),
    publisher: faker.company.name(),
    igdb_link: `https://www.igdb.com/games/${slug}`,
    genre: faker.helpers.arrayElement(['RPG', 'Action', 'Adventure', 'Strategy', 'Simulation']),
    genres: faker.helpers.arrayElements(['RPG', 'Action', 'Adventure', 'Strategy', 'Simulation', 'Puzzle', 'Racing'], 3),
    platforms: faker.helpers.arrayElements(['PC', 'PlayStation 5', 'Xbox Series X', 'Nintendo Switch', 'PlayStation 4', 'Xbox One'], 3),
    igdb_rating: faker.number.int({ min: 60, max: 95 }),
    metacritic_score: faker.number.int({ min: 50, max: 100 }),
    esrb_rating: faker.helpers.arrayElement(['E', 'E10+', 'T', 'M', 'AO']),
    is_verified: true,
    view_count: faker.number.int({ min: 0, max: 10000 }),
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.recent().toISOString(),
    category: faker.helpers.arrayElement([0, 1, 2, 8, 9]), // main game, dlc, expansion, remake, remaster
    ...overrides
  };
};

// ============================================
// Review/Rating Factory
// ============================================

export const createMockReview = (overrides: Partial<any> = {}) => ({
  id: faker.number.int({ min: 1, max: 10000 }),
  user_id: faker.number.int({ min: 1, max: 1000 }),
  game_id: faker.number.int({ min: 1, max: 100000 }),
  rating: faker.number.float({ min: 1, max: 10, multipleOf: 0.5 }),
  review: faker.helpers.maybe(() => faker.lorem.paragraphs(2), { probability: 0.7 }),
  is_spoiler: faker.datatype.boolean({ probability: 0.1 }),
  playtime_hours: faker.helpers.maybe(() => faker.number.int({ min: 1, max: 200 })),
  platform_id: faker.helpers.maybe(() => faker.number.int({ min: 1, max: 10 })),
  completion_status: faker.helpers.arrayElement(['not_started', 'playing', 'completed', 'dropped', '100_percent']),
  is_recommended: faker.datatype.boolean({ probability: 0.8 }),
  difficulty_rating: faker.helpers.maybe(() => faker.number.int({ min: 1, max: 5 })),
  replay_value: faker.helpers.maybe(() => faker.number.int({ min: 1, max: 5 })),
  is_published: true,
  like_count: faker.number.int({ min: 0, max: 100 }),
  helpful_count: faker.number.int({ min: 0, max: 50 }),
  post_date_time: faker.date.recent().toISOString(),
  created_at: faker.date.past().toISOString(),
  updated_at: faker.date.recent().toISOString(),
  igdb_id: faker.number.int({ min: 1000, max: 99999 }),
  slug: faker.lorem.slug(),
  comment_count: faker.number.int({ min: 0, max: 50 }),
  ...overrides
});

// ============================================
// Comment Factory
// ============================================

export const createMockComment = (overrides: Partial<any> = {}) => ({
  id: faker.number.int({ min: 1, max: 10000 }),
  user_id: faker.number.int({ min: 1, max: 1000 }),
  rating_id: faker.number.int({ min: 1, max: 10000 }),
  parent_comment_id: faker.helpers.maybe(() => faker.number.int({ min: 1, max: 100 }), { probability: 0.3 }),
  content: faker.lorem.paragraph(),
  is_spoiler: faker.datatype.boolean({ probability: 0.05 }),
  is_published: true,
  like_count: faker.number.int({ min: 0, max: 50 }),
  created_at: faker.date.recent().toISOString(),
  updated_at: faker.date.recent().toISOString(),
  ...overrides
});

// ============================================
// Activity Factory
// ============================================

export const createMockActivity = (overrides: Partial<any> = {}) => {
  const activityTypes = ['review', 'comment', 'follow', 'game_started', 'game_completed', 'wishlist_add', 'collection_add'];
  const activityType = faker.helpers.arrayElement(activityTypes);
  
  return {
    id: faker.number.int({ min: 1, max: 10000 }),
    user_id: faker.number.int({ min: 1, max: 1000 }),
    activity_type: activityType,
    target_id: faker.number.int({ min: 1, max: 10000 }),
    target_type: faker.helpers.arrayElement(['review', 'game', 'user', 'comment']),
    created_at: faker.date.recent({ days: 30 }).toISOString(),
    // Additional fields based on activity type
    ...(activityType === 'review' && {
      review_id: faker.number.int({ min: 1, max: 10000 }),
      game_name: faker.company.name(),
      rating: faker.number.float({ min: 1, max: 10, multipleOf: 0.5 }),
    }),
    ...(activityType === 'comment' && {
      comment_id: faker.number.int({ min: 1, max: 10000 }),
      review_id: faker.number.int({ min: 1, max: 10000 }),
    }),
    ...(activityType === 'follow' && {
      followed_user_id: faker.number.int({ min: 1, max: 1000 }),
      followed_username: faker.internet.username(),
    }),
    ...overrides
  };
};

// ============================================
// Collection/Wishlist Factory
// ============================================

export const createMockCollectionItem = (overrides: Partial<any> = {}) => ({
  id: faker.number.int({ min: 1, max: 10000 }),
  user_id: faker.number.int({ min: 1, max: 1000 }),
  game_id: faker.number.int({ min: 1, max: 100000 }),
  igdb_id: faker.number.int({ min: 1000, max: 99999 }),
  added_at: faker.date.recent().toISOString(),
  ...overrides
});

export const createMockWishlistItem = (overrides: Partial<any> = {}) => ({
  id: faker.number.int({ min: 1, max: 10000 }),
  user_id: faker.number.int({ min: 1, max: 1000 }),
  game_id: faker.number.int({ min: 1, max: 100000 }),
  igdb_id: faker.number.int({ min: 1000, max: 99999 }),
  added_at: faker.date.recent().toISOString(),
  priority: faker.number.int({ min: 0, max: 5 }),
  notes: faker.helpers.maybe(() => faker.lorem.sentence()),
  ...overrides
});

// ============================================
// Game Progress Factory
// ============================================

export const createMockGameProgress = (overrides: Partial<any> = {}) => {
  const started = faker.datatype.boolean();
  const completed = faker.datatype.boolean({ probability: started ? 0.6 : 0 });
  
  return {
    id: faker.number.int({ min: 1, max: 10000 }),
    user_id: faker.number.int({ min: 1, max: 1000 }),
    game_id: faker.number.int({ min: 1, max: 100000 }),
    started: started,
    completed: completed,
    started_date: started ? faker.date.recent({ days: 90 }).toISOString() : null,
    completed_date: completed ? faker.date.recent({ days: 30 }).toISOString() : null,
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.recent().toISOString(),
    igdb_id: faker.number.int({ min: 1000, max: 99999 }),
    slug: faker.lorem.slug(),
    ...overrides
  };
};

// ============================================
// Notification Factory
// ============================================

export const createMockNotification = (overrides: Partial<any> = {}) => ({
  id: faker.number.int({ min: 1, max: 10000 }),
  user_id: faker.number.int({ min: 1, max: 1000 }),
  actor_id: faker.number.int({ min: 1, max: 1000 }),
  type: faker.helpers.arrayElement(['like', 'comment', 'follow', 'mention', 'review']),
  title: faker.lorem.sentence(),
  message: faker.lorem.paragraph(),
  entity_type: faker.helpers.arrayElement(['review', 'comment', 'user']),
  entity_id: faker.number.int({ min: 1, max: 10000 }),
  is_read: faker.datatype.boolean({ probability: 0.3 }),
  created_at: faker.date.recent({ days: 7 }).toISOString(),
  ...overrides
});

// ============================================
// Auth User Factory (Supabase Auth)
// ============================================

export const createMockAuthUser = (overrides: Partial<any> = {}) => ({
  id: faker.string.uuid(),
  email: faker.internet.email(),
  email_confirmed_at: faker.date.past().toISOString(),
  created_at: faker.date.past().toISOString(),
  updated_at: faker.date.recent().toISOString(),
  app_metadata: {
    provider: 'email',
    providers: ['email'],
  },
  user_metadata: {
    name: faker.person.fullName(),
    avatar_url: faker.image.avatar(),
  },
  aud: 'authenticated',
  role: 'authenticated',
  ...overrides
});

// ============================================
// Session Factory
// ============================================

export const createMockSession = (overrides: Partial<any> = {}) => ({
  access_token: faker.string.alphanumeric(40),
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: faker.date.future().getTime() / 1000,
  refresh_token: faker.string.alphanumeric(40),
  user: createMockAuthUser(),
  ...overrides
});

// ============================================
// ExploreGame Factory for ExplorePage Testing
// ============================================

export const createMockExploreGame = (overrides: Partial<any> = {}) => ({
  id: faker.number.int({ min: 1, max: 100000 }),
  igdb_id: faker.number.int({ min: 1000, max: 99999 }),
  name: faker.commerce.productName(),
  description: faker.lorem.paragraphs(2),
  summary: faker.lorem.paragraph(),
  release_date: faker.date.past({ years: 5 }).toISOString().split('T')[0],
  cover_url: `https://images.igdb.com/igdb/image/upload/t_cover_big/${faker.string.alphanumeric(12)}.jpg`,
  platforms: faker.helpers.arrayElements(['PC', 'PlayStation 5', 'Xbox Series X', 'Nintendo Switch'], 2),
  avg_user_rating: faker.number.float({ min: 1, max: 10, multipleOf: 0.1 }),
  user_rating_count: faker.number.int({ min: 1, max: 500 }),
  category: faker.helpers.arrayElement([0, 1, 2, 8, 9]),
  greenlight_flag: faker.datatype.boolean({ probability: 0.8 }),
  redlight_flag: false, // Should always be false in results
  ...overrides,
});

export const createMockExploreGamesList = (count: number = 10) => {
  return Array.from({ length: count }, (_, index) => {
    // Create games with decreasing unified scores for proper ranking
    const baseScore = 0.9 - (index * 0.1);
    const avgRating = 8.5 - (index * 0.3);
    const reviewCount = 100 - (index * 8);
    
    return createMockExploreGame({
      name: `Top Game #${index + 1}`,
      avg_user_rating: Math.max(1, avgRating),
      user_rating_count: Math.max(1, reviewCount),
    });
  });
};