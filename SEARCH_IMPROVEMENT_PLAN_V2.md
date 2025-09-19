# 📈 Search Algorithm Improvement Plan V2
## Based on Diagnostic Analysis & IGDB Rating Issues

## 🔍 **Key Discovery**
**IGDB ratings don't accurately reflect game acclaim or commercial success.** This is a critical issue because our current algorithm heavily weights IGDB ratings for popularity scoring.

## 📊 **Current Algorithm Problems Identified**

### 1. **Popularity Metric Failures**
- **IGDB Rating ≠ Actual Popularity**: Many acclaimed games have low IGDB ratings due to small sample sizes
- **Missing Cultural Impact**: Games like Pokemon Red/Blue, Tetris, or Minecraft may have lower ratings than obscure titles
- **Recency Bias**: Newer games often have inflated ratings compared to classics

### 2. **Alternative Popularity Indicators Available**

#### **From IGDB (Currently Unused):**
```typescript
// Available but not utilized:
- follows: number           // Community interest metric
- hypes: number            // Pre-release excitement
- total_rating_count: number // Sample size indicator
- franchise: object        // Franchise association (valuable!)
- parent_game: number      // Main game association
```

#### **From Our Database:**
```typescript
// User-generated signals:
- totalUserRatings: number   // Our community's engagement
- averageUserRating: number  // Our community's opinion
- review_count: number       // Content generation metric
- activity_count: number     // User interaction metric
```

## 🎯 **Proposed Solution: Multi-Signal Popularity Scoring**

### **New Popularity Score Formula:**

```typescript
interface PopularitySignals {
  // Commercial/Cultural Impact (40%)
  franchiseBonus: number;        // Is it part of a major franchise?
  culturalImpactScore: number;   // Based on franchise + era + platform
  
  // Community Engagement (30%)
  igdbFollows: number;          // IGDB community interest
  ourUserEngagement: number;     // Our reviews + ratings + activity
  
  // Critical Reception (20%)
  ratingQuality: number;         // High rating WITH high sample size
  aggregateScore: number;        // Weighted average of IGDB + our ratings
  
  // Market Presence (10%)
  platformReach: number;         // Multi-platform = wider audience
  longevity: number;            // Still relevant years later?
}
```

## 📋 **Implementation Plan**

### **Phase 1: Franchise Recognition System**
**Problem**: Mario Party 10 might rank below an obscure indie with 95 rating

**Solution**: Franchise-aware scoring
```typescript
const MAJOR_FRANCHISES = {
  // Tier 1 - Global phenomena (1.0 multiplier)
  'mario': { tier: 1, culturalImpact: 1.0 },
  'pokemon': { tier: 1, culturalImpact: 1.0 },
  'zelda': { tier: 1, culturalImpact: 0.95 },
  'call of duty': { tier: 1, culturalImpact: 0.9 },
  'grand theft auto': { tier: 1, culturalImpact: 0.95 },
  'minecraft': { tier: 1, culturalImpact: 1.0 },
  
  // Tier 2 - Major franchises (0.7 multiplier)
  'final fantasy': { tier: 2, culturalImpact: 0.8 },
  'resident evil': { tier: 2, culturalImpact: 0.75 },
  'assassins creed': { tier: 2, culturalImpact: 0.7 },
  
  // Tier 3 - Notable franchises (0.5 multiplier)
  'sonic': { tier: 3, culturalImpact: 0.6 },
  'mega man': { tier: 3, culturalImpact: 0.5 },
  'street fighter': { tier: 3, culturalImpact: 0.55 }
};

// Scoring adjustment:
if (game.franchise || detectFranchiseFromName(game.name)) {
  popularityScore *= franchiseMultiplier;
}
```

### **Phase 2: Community Engagement Metrics**
**Problem**: IGDB rating based on 10 reviews ranks above game with 10,000 follows

**Solution**: Weight by engagement signals
```typescript
function calculateEngagementScore(game) {
  const signals = {
    igdbFollows: game.follows || 0,
    igdbHypes: game.hypes || 0,
    ratingCount: game.total_rating_count || 0,
    ourReviews: game.review_count || 0,
    ourRatings: game.totalUserRatings || 0
  };
  
  // Normalize and weight
  const followScore = Math.min(signals.igdbFollows / 10000, 1) * 0.3;
  const ratingParticipation = Math.min(signals.ratingCount / 1000, 1) * 0.3;
  const ourEngagement = Math.min((signals.ourReviews + signals.ourRatings) / 100, 1) * 0.4;
  
  return followScore + ratingParticipation + ourEngagement;
}
```

### **Phase 3: Rating Quality Score**
**Problem**: 95/100 rating from 5 people outranks 85/100 from 5000 people

**Solution**: Statistical confidence weighting
```typescript
function calculateRatingQuality(game) {
  const rating = game.igdb_rating || 0;
  const sampleSize = game.total_rating_count || 0;
  
  // Bayesian average - pulls low-sample ratings toward mean
  const ASSUMED_MEAN = 70;  // Average game rating
  const MIN_VOTES = 50;      // Minimum votes for full weight
  
  const weightedRating = (
    (rating * sampleSize + ASSUMED_MEAN * MIN_VOTES) / 
    (sampleSize + MIN_VOTES)
  );
  
  // Confidence factor (0-1)
  const confidence = Math.min(sampleSize / MIN_VOTES, 1);
  
  return {
    adjustedRating: weightedRating,
    confidence: confidence,
    finalScore: (weightedRating / 100) * confidence
  };
}
```

### **Phase 4: Historical & Cultural Context**
**Problem**: Classic games penalized for age despite massive influence

**Solution**: Era-adjusted scoring
```typescript
const GOLDEN_AGE_GAMES = {
  'Super Mario Bros': { year: 1985, impact: 1.0 },
  'Tetris': { year: 1984, impact: 1.0 },
  'Pac-Man': { year: 1980, impact: 0.95 },
  'The Legend of Zelda': { year: 1986, impact: 0.95 },
  'Pokemon Red/Blue': { year: 1996, impact: 1.0 },
  'Final Fantasy VII': { year: 1997, impact: 0.9 }
};

function calculateHistoricalBonus(game) {
  // Games that defined their era get bonus
  if (GOLDEN_AGE_GAMES[game.name]) {
    return GOLDEN_AGE_GAMES[game.name].impact;
  }
  
  // Platform-defining games
  if (game.platforms?.includes('NES') && game.release_year < 1990) {
    return 0.3; // NES era bonus
  }
  
  // Genre-defining games
  if (isGenreDefining(game)) {
    return 0.4;
  }
  
  return 0;
}
```

### **Phase 5: Platform & Availability Scoring**
**Problem**: Platform exclusives ranked equally with multi-platform hits

**Solution**: Market reach scoring
```typescript
function calculateMarketReach(game) {
  const platforms = game.platforms || [];
  
  const PLATFORM_WEIGHTS = {
    // Current gen (high reach)
    'PlayStation 5': 0.9,
    'Xbox Series X/S': 0.85,
    'Nintendo Switch': 1.0,
    'PC (Windows)': 1.0,
    
    // Last gen (still significant)
    'PlayStation 4': 0.7,
    'Xbox One': 0.65,
    
    // Mobile (massive reach)
    'iOS': 0.8,
    'Android': 0.8,
    
    // Retro (niche but dedicated)
    'NES': 0.3,
    'SNES': 0.35,
    'Nintendo 64': 0.4
  };
  
  // Sum platform weights, cap at 2.0
  const totalReach = Math.min(
    platforms.reduce((sum, platform) => 
      sum + (PLATFORM_WEIGHTS[platform] || 0.2), 0
    ),
    2.0
  );
  
  return totalReach / 2; // Normalize to 0-1
}
```

## 🔄 **Revised Sorting Algorithm**

### **New Component Weights:**
```typescript
const SORTING_WEIGHTS = {
  relevance: 0.35,      // Down from 0.4 (still most important)
  popularity: 0.25,     // Same, but completely redefined
  quality: 0.20,        // Down from 0.3 (data completeness)
  engagement: 0.15,     // NEW - community signals
  cultural: 0.05        // NEW - franchise/historical bonus
};
```

### **Complete Scoring Function:**
```typescript
function calculateFinalScore(game, query) {
  // 1. Relevance (name, summary, genre matching)
  const relevanceScore = calculateRelevance(game, query);
  
  // 2. Popularity (NEW multi-signal approach)
  const popularityScore = calculatePopularity({
    franchiseBonus: getFranchiseBonus(game),
    engagement: calculateEngagementScore(game),
    ratingQuality: calculateRatingQuality(game),
    marketReach: calculateMarketReach(game),
    historical: calculateHistoricalBonus(game)
  });
  
  // 3. Quality (data completeness)
  const qualityScore = calculateDataQuality(game);
  
  // 4. Engagement (community activity)
  const engagementScore = calculateEngagementScore(game);
  
  // 5. Cultural Impact
  const culturalScore = calculateCulturalImpact(game);
  
  // Apply weights
  return {
    total: 
      relevanceScore * SORTING_WEIGHTS.relevance +
      popularityScore * SORTING_WEIGHTS.popularity +
      qualityScore * SORTING_WEIGHTS.quality +
      engagementScore * SORTING_WEIGHTS.engagement +
      culturalScore * SORTING_WEIGHTS.cultural,
    breakdown: {
      relevance: relevanceScore,
      popularity: popularityScore,
      quality: qualityScore,
      engagement: engagementScore,
      cultural: culturalScore
    }
  };
}
```

## 🧪 **Testing Strategy**

### **Test Cases to Validate:**

1. **Franchise Recognition Test**
   - Query: "mario"
   - Expected: Main Mario games before high-rated indies
   - Validate: Super Mario Bros, Mario Kart, Mario Odyssey in top 10

2. **Engagement vs Rating Test**
   - Query: "rpg"
   - Expected: Popular RPGs (Final Fantasy, Pokemon) before obscure high-rated ones
   - Validate: Check `follows` count correlates with ranking

3. **Historical Importance Test**
   - Query: "platformer"
   - Expected: Super Mario Bros, Sonic high despite age
   - Validate: Classic games not penalized for release date

4. **Platform Reach Test**
   - Query: "racing"
   - Expected: Multi-platform (Need for Speed, Forza) before exclusives
   - Validate: Platform count influences ranking

5. **Sample Size Test**
   - Query: "shooter"
   - Expected: Call of Duty (85 rating, 10000 votes) > Indie (95 rating, 50 votes)
   - Validate: Bayesian average working correctly

## 📊 **Data Collection Requirements**

### **From IGDB (expand current fetching):**
- ✅ Already have: name, rating, genres, platforms
- ❌ Need to add: `follows`, `hypes`, `total_rating_count`, `franchise`, `collection`

### **From Database:**
- ✅ Track: user reviews, ratings, activity
- ❌ Need: franchise mapping table, cultural impact scores

### **New Tables/Columns Needed:**
```sql
-- Franchise mapping
CREATE TABLE franchise_metadata (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE,
  tier INTEGER, -- 1, 2, or 3
  cultural_impact DECIMAL(3,2), -- 0.00 to 1.00
  main_genre VARCHAR(100),
  established_year INTEGER
);

-- Game engagement metrics
ALTER TABLE game ADD COLUMN IF NOT EXISTS 
  igdb_follows INTEGER DEFAULT 0,
  igdb_hypes INTEGER DEFAULT 0,
  igdb_rating_count INTEGER DEFAULT 0,
  franchise_id INTEGER REFERENCES franchise_metadata(id),
  engagement_score DECIMAL(3,2) GENERATED ALWAYS AS (
    -- Calculated column
  ) STORED;
```

## 🚀 **Implementation Priority**

### **Quick Wins (1-2 days):**
1. Use `total_rating_count` for Bayesian averaging
2. Fetch and use `follows` from IGDB
3. Add franchise detection from game names

### **Medium Term (3-5 days):**
1. Build franchise recognition system
2. Implement engagement scoring
3. Add platform reach calculation

### **Long Term (1-2 weeks):**
1. Historical/cultural impact database
2. Machine learning for relevance tuning
3. A/B testing framework for weight optimization

## 📈 **Expected Improvements**

### **Before:**
- Pokemon Blue: Position #15 (low IGDB rating)
- Obscure Indie RPG: Position #3 (95 rating, 10 reviews)
- Mario Party: Position #25 (rated 75)

### **After:**
- Pokemon Blue: Position #2 (franchise + engagement boost)
- Obscure Indie RPG: Position #12 (rating confidence adjustment)
- Mario Party: Position #5 (franchise recognition)

## 🔬 **Measurement & Validation**

### **Success Metrics:**
1. **Click-through rate** on search results
2. **Time to find** desired game
3. **Search abandonment** rate
4. **User satisfaction** surveys

### **A/B Testing Plan:**
- 10% of users: New algorithm
- 90% of users: Current algorithm
- Measure: CTR, bounce rate, game page views
- Duration: 2 weeks
- Success criteria: >15% improvement in CTR

## 💡 **Key Insights**

**The core realization is that IGDB ratings are a weak signal for actual game popularity and cultural impact.** By incorporating:
- Franchise recognition
- Community engagement metrics
- Statistical confidence in ratings
- Historical/cultural context
- Platform reach

We can create a much more accurate representation of what games users actually want to find.

This plan addresses the fundamental issue: **Popular, acclaimed games shouldn't be buried beneath obscure titles just because of rating system quirks.**