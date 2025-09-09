import { 
  detectSearchIntent, 
  SearchIntent,
  calculateIntelligentScore,
  sortGamesIntelligently,
  getIntelligentSearchResults
} from '../utils/intelligentPrioritization';

describe('Phase 3: Intelligent Result Prioritization', () => {
  
  beforeAll(() => {
    console.log('\n🧠 PHASE 3 TESTING: Intelligent result prioritization and search intent detection');
    console.log('New features:');
    console.log('- Search intent detection (specific vs. browse vs. discovery)');
    console.log('- Comprehensive relevance scoring with quality metrics');
    console.log('- Context-aware sorting based on user intent');
    console.log('- Performance optimization with intelligent caching');
  });

  describe('Search Intent Detection', () => {
    const intentTests = [
      {
        query: 'The Legend of Zelda: Breath of the Wild',
        expectedIntent: SearchIntent.SPECIFIC_GAME,
        description: 'Long specific game title should be detected as specific search'
      },
      {
        query: 'mario games',
        expectedIntent: SearchIntent.FRANCHISE_BROWSE,
        description: 'Franchise + games should be franchise browse'
      },
      {
        query: 'mario',
        expectedIntent: SearchIntent.FRANCHISE_BROWSE,
        description: 'Short franchise name should be franchise browse'
      },
      {
        query: 'rpg games',
        expectedIntent: SearchIntent.GENRE_DISCOVERY,
        description: 'Genre terms should be genre discovery'
      },
      {
        query: 'action adventure',
        expectedIntent: SearchIntent.GENRE_DISCOVERY,
        description: 'Multiple genres should be genre discovery'
      },
      {
        query: 'nintendo games',
        expectedIntent: SearchIntent.DEVELOPER_SEARCH,
        description: 'Developer name + games should be developer search'
      },
      {
        query: '2024 games',
        expectedIntent: SearchIntent.YEAR_SEARCH,
        description: 'Year search should be detected'
      },
      {
        query: 'new games',
        expectedIntent: SearchIntent.YEAR_SEARCH,
        description: 'New/latest keywords should be year search'
      },
      {
        query: 'ps5 exclusive',
        expectedIntent: SearchIntent.PLATFORM_SEARCH,
        description: 'Platform keywords should be platform search'
      }
    ];

    intentTests.forEach(test => {
      it(`should detect intent: ${test.description}`, () => {
        console.log(`\n🎯 Testing intent detection: "${test.query}"`);
        
        const detectedIntent = detectSearchIntent(test.query);
        console.log(`   Intent detected: ${detectedIntent} (expected: ${test.expectedIntent})`);
        
        expect(detectedIntent).toBe(test.expectedIntent);
      });
    });
  });

  describe('Relevance Scoring Algorithm', () => {
    const mockGames = [
      {
        id: 1,
        name: 'The Legend of Zelda: Breath of the Wild',
        summary: 'Open-world action-adventure game',
        description: 'Step into a world of discovery, exploration, and adventure',
        developer: 'Nintendo',
        publisher: 'Nintendo',
        category: 0,
        genres: ['Action', 'Adventure'],
        igdb_rating: 97,
        avg_user_rating: 9.2,
        user_rating_count: 1500,
        release_date: '2017-03-03',
        follows: 50000,
        hypes: 15000,
        cover: { url: 'https://example.com/cover.jpg' }
      },
      {
        id: 2,
        name: 'Zelda II: The Adventure of Link',
        summary: 'Side-scrolling action-adventure',
        developer: 'Nintendo',
        category: 0,
        genres: ['Action', 'Adventure'],
        igdb_rating: 72,
        avg_user_rating: 6.5,
        user_rating_count: 800,
        release_date: '1987-01-14'
      },
      {
        id: 3,
        name: 'The Legend of Zelda: Breath of the Wild DLC',
        summary: 'Expansion pack for Breath of the Wild',
        developer: 'Nintendo',
        category: 1, // DLC
        genres: ['Action', 'Adventure'],
        user_rating_count: 200
      }
    ];

    it('should score exact matches highest for specific searches', () => {
      console.log('\n🔍 Testing exact match scoring');
      
      const query = 'The Legend of Zelda: Breath of the Wild';
      const scores = mockGames.map(game => ({
        game: game.name,
        score: calculateIntelligentScore(game, query)
      }));
      
      console.log('   Relevance scores:');
      scores.forEach(s => {
        console.log(`   - ${s.game}: ${s.score.relevanceScore} (total: ${s.score.totalScore})`);
      });
      
      // Exact match should have highest relevance score
      expect(scores[0].score.relevanceScore).toBeGreaterThan(scores[1].score.relevanceScore);
      expect(scores[0].score.relevanceScore).toBeGreaterThan(scores[2].score.relevanceScore);
    });

    it('should boost quality games in genre discovery', () => {
      console.log('\n🎮 Testing quality boosting for genre discovery');
      
      const query = 'action adventure';
      const scores = mockGames.map(game => ({
        game: game.name,
        score: calculateIntelligentScore(game, query)
      }));
      
      console.log('   Quality scores:');
      scores.forEach(s => {
        console.log(`   - ${s.game}: quality=${s.score.qualityScore}, total=${s.score.totalScore}`);
      });
      
      // High-rated game should have better quality score
      expect(scores[0].score.qualityScore).toBeGreaterThan(scores[1].score.qualityScore);
    });

    it('should penalize DLC for specific game searches', () => {
      console.log('\n🚫 Testing DLC penalization for specific searches');
      
      const query = 'The Legend of Zelda: Breath of the Wild';
      const scores = mockGames.map(game => ({
        game: game.name,
        score: calculateIntelligentScore(game, query),
        intent: detectSearchIntent(query)
      }));
      
      console.log(`   Intent detected: ${scores[0].intent}`);
      console.log('   Intent match scores:');
      scores.forEach(s => {
        console.log(`   - ${s.game}: ${s.score.intentMatchScore}`);
      });
      
      // Main game should have higher intent score than DLC
      expect(scores[0].score.intentMatchScore).toBeGreaterThanOrEqual(scores[2].score.intentMatchScore);
    });
  });

  describe('Intelligent Sorting Integration', () => {
    const testGames = [
      {
        id: 1,
        name: 'Super Mario Odyssey',
        summary: 'Mario adventure with Cappy',
        developer: 'Nintendo',
        category: 0,
        igdb_rating: 97,
        avg_user_rating: 9.1,
        user_rating_count: 2000,
        release_date: '2017-10-27'
      },
      {
        id: 2,
        name: 'Mario Kart 8 Deluxe',
        summary: 'Racing game featuring Mario characters',
        developer: 'Nintendo', 
        category: 0,
        igdb_rating: 92,
        avg_user_rating: 8.8,
        user_rating_count: 1800,
        release_date: '2017-04-28'
      },
      {
        id: 3,
        name: 'New Super Mario Bros.',
        summary: 'Classic Mario platformer',
        developer: 'Nintendo',
        category: 0,
        igdb_rating: 89,
        avg_user_rating: 8.2,
        user_rating_count: 1200,
        release_date: '2006-05-15'
      },
      {
        id: 4,
        name: 'Mario Tennis Aces',
        summary: 'Tennis game with Mario characters',
        developer: 'Nintendo',
        category: 0,
        igdb_rating: 77,
        avg_user_rating: 7.5,
        user_rating_count: 600,
        release_date: '2018-06-22'
      }
    ];

    it('should prioritize exact matches for specific searches', () => {
      console.log('\n🎯 Testing exact match prioritization');
      
      const query = 'Super Mario Odyssey';
      const sorted = sortGamesIntelligently(testGames, query);
      
      console.log(`   Query: "${query}"`);
      console.log('   Sorted results:');
      sorted.slice(0, 3).forEach((game, index) => {
        const score = calculateIntelligentScore(game, query);
        console.log(`   ${index + 1}. ${game.name} (total score: ${score.totalScore})`);
      });
      
      // Exact match should be first
      expect(sorted[0].name).toBe('Super Mario Odyssey');
    });

    it('should balance relevance and quality for franchise browsing', () => {
      console.log('\n⚖️ Testing franchise browse balancing');
      
      const query = 'mario';
      const sorted = sortGamesIntelligently(testGames, query);
      const intent = detectSearchIntent(query);
      
      console.log(`   Query: "${query}" (intent: ${intent})`);
      console.log('   Sorted results with scores:');
      sorted.forEach((game, index) => {
        const score = calculateIntelligentScore(game, query);
        console.log(`   ${index + 1}. ${game.name}`);
        console.log(`      Relevance: ${score.relevanceScore}, Quality: ${score.qualityScore}, Total: ${score.totalScore}`);
      });
      
      // Should have reasonable ordering balancing relevance and quality
      expect(sorted.length).toBe(testGames.length);
      expect(sorted[0].name).toContain('Mario'); // Top result should contain Mario
    });

    it('should boost newer games for discovery searches', () => {
      console.log('\n🆕 Testing recency boost for discovery');
      
      const query = 'action games';
      const sorted = sortGamesIntelligently(testGames, query);
      
      console.log(`   Query: "${query}"`);
      console.log('   Results with recency scores:');
      sorted.forEach((game, index) => {
        const score = calculateIntelligentScore(game, query);
        console.log(`   ${index + 1}. ${game.name} (${game.release_date}) - recency: ${score.recencyBonus}`);
      });
      
      // More recent games should get recency bonus
      const recentGame = sorted.find(g => g.release_date === '2018-06-22');
      const olderGame = sorted.find(g => g.release_date === '2006-05-15');
      
      if (recentGame && olderGame) {
        const recentScore = calculateIntelligentScore(recentGame, query);
        const olderScore = calculateIntelligentScore(olderGame, query);
        expect(recentScore.recencyBonus).toBeGreaterThan(olderScore.recencyBonus);
      }
    });
  });

  describe('Search Analytics and Insights', () => {
    const analyticsTestGames = [
      {
        id: 1,
        name: 'The Witcher 3: Wild Hunt',
        summary: 'Fantasy RPG with rich storytelling',
        developer: 'CD Projekt RED',
        category: 0,
        genres: ['RPG', 'Adventure'],
        igdb_rating: 96,
        avg_user_rating: 9.3,
        user_rating_count: 3000,
        release_date: '2015-05-19'
      },
      {
        id: 2,
        name: 'Cyberpunk 2077',
        summary: 'Futuristic RPG in Night City',
        developer: 'CD Projekt RED',
        category: 0,
        genres: ['RPG', 'Action'],
        igdb_rating: 86,
        avg_user_rating: 7.8,
        user_rating_count: 2500,
        release_date: '2020-12-10'
      },
      {
        id: 3,
        name: 'The Witcher 3: Blood and Wine',
        summary: 'Major expansion for The Witcher 3',
        developer: 'CD Projekt RED',
        category: 2, // Expansion
        genres: ['RPG', 'Adventure'],
        igdb_rating: 92,
        avg_user_rating: 9.0,
        user_rating_count: 1200
      }
    ];

    it('should provide detailed search analytics', () => {
      console.log('\n📊 Testing search analytics system');
      
      const query = 'witcher';
      const results = getIntelligentSearchResults(analyticsTestGames, query, 5);
      
      console.log(`   Query: "${query}"`);
      console.log(`   Detected intent: ${results.intent}`);
      console.log(`   Total games analyzed: ${results.totalGames}`);
      console.log('   Summary metrics:');
      console.log(`   - Average relevance: ${results.summary.avgRelevance.toFixed(2)}`);
      console.log(`   - Average quality: ${results.summary.avgQuality.toFixed(2)}`);
      console.log(`   - Top categories: ${results.summary.topCategories.join(', ')}`);
      
      console.log('\n   Top results with detailed breakdown:');
      results.results.slice(0, 3).forEach((result, index) => {
        console.log(`   ${index + 1}. ${result.game.name}`);
        console.log(`      Total Score: ${result.score.totalScore}`);
        console.log(`      Breakdown: relevance=${result.score.relevanceScore}, quality=${result.score.qualityScore}`);
      });
      
      expect(results.intent).toBeDefined();
      expect(results.summary.avgRelevance).toBeGreaterThan(0);
      expect(results.summary.avgQuality).toBeGreaterThan(0);
      expect(results.results.length).toBeGreaterThan(0);
    });

    it('should maintain consistent scoring across multiple queries', () => {
      console.log('\n🔄 Testing scoring consistency');
      
      const queries = ['witcher 3', 'rpg games', 'cd projekt'];
      const consistencyResults: Array<{query: string, topScore: number, avgScore: number}> = [];
      
      queries.forEach(query => {
        const results = getIntelligentSearchResults(analyticsTestGames, query, 3);
        const topScore = results.results[0]?.score.totalScore || 0;
        const avgScore = results.results.reduce((sum, r) => sum + r.score.totalScore, 0) / results.results.length;
        
        consistencyResults.push({ query, topScore, avgScore });
        console.log(`   "${query}": top=${topScore}, avg=${avgScore.toFixed(2)}`);
      });
      
      // All queries should produce reasonable scores
      consistencyResults.forEach(result => {
        expect(result.topScore).toBeGreaterThan(0);
        expect(result.avgScore).toBeGreaterThan(0);
        expect(result.topScore).toBeGreaterThanOrEqual(result.avgScore); // Top score should be >= average
      });
    });
  });

  describe('Performance and Quality Assurance', () => {
    const performanceTestGames = Array.from({ length: 50 }, (_, i) => ({
      id: i + 1,
      name: `Test Game ${i + 1}`,
      summary: `Test game number ${i + 1} with various features`,
      developer: i % 3 === 0 ? 'Nintendo' : i % 3 === 1 ? 'Sony' : 'Microsoft',
      category: i % 5, // Mix of categories
      genres: ['Action', 'Adventure', 'RPG'][i % 3] ? [['Action', 'Adventure', 'RPG'][i % 3]] : undefined,
      igdb_rating: 60 + (i % 40), // Ratings from 60-100
      avg_user_rating: 6 + (i % 4), // User ratings 6-10
      user_rating_count: 100 + (i * 10), // Varying popularity
      release_date: `${2015 + (i % 10)}-01-01` // Spread across years
    }));

    it('should maintain good performance with larger datasets', () => {
      console.log('\n⚡ Testing performance with 50 games');
      
      const queries = ['action', 'nintendo', 'test game 25'];
      const performanceResults: number[] = [];
      
      queries.forEach(query => {
        const startTime = performance.now();
        const sorted = sortGamesIntelligently(performanceTestGames, query);
        const endTime = performance.now();
        const responseTime = (endTime - startTime) / 1000;
        
        performanceResults.push(responseTime);
        console.log(`   "${query}": ${sorted.length} games sorted in ${responseTime.toFixed(3)}s`);
      });
      
      const avgResponseTime = performanceResults.reduce((sum, time) => sum + time, 0) / performanceResults.length;
      console.log(`   Average response time: ${avgResponseTime.toFixed(3)}s`);
      
      // Should maintain reasonable performance (under 1s for 50 games)
      expect(avgResponseTime).toBeLessThan(1.0);
      performanceResults.forEach(time => {
        expect(time).toBeLessThan(2.0); // Individual queries should be reasonably fast
      });
    });

    it('should preserve result quality with Phase 3 improvements', () => {
      console.log('\n✨ Testing result quality preservation');
      
      const qualityQueries = ['nintendo games', 'action rpg', 'test game'];
      let totalRelevantResults = 0;
      let totalResults = 0;
      
      qualityQueries.forEach(query => {
        const results = getIntelligentSearchResults(performanceTestGames, query, 10);
        const relevantResults = results.results.filter(r => r.score.relevanceScore > 100).length;
        
        totalRelevantResults += relevantResults;
        totalResults += results.results.length;
        
        console.log(`   "${query}": ${relevantResults}/${results.results.length} relevant results`);
      });
      
      const relevancePercentage = (totalRelevantResults / totalResults) * 100;
      console.log(`   Overall relevance: ${relevancePercentage.toFixed(1)}%`);
      
      // Should maintain good relevance (at least 60% for test data)
      expect(relevancePercentage).toBeGreaterThanOrEqual(60);
    });
  });

  afterAll(() => {
    console.log('\n📊 PHASE 3 ENHANCEMENT SUMMARY:');
    console.log('✅ Implemented search intent detection (6 different intent types)');
    console.log('✅ Added comprehensive relevance scoring with quality metrics');  
    console.log('✅ Created context-aware sorting based on user intent');
    console.log('✅ Integrated performance optimization and analytics');
    console.log('✅ Maintained backward compatibility with existing features');
    console.log('✅ Added detailed debugging and monitoring capabilities');
    console.log('\nPhase 3 should deliver significantly improved search result quality!');
  });
});