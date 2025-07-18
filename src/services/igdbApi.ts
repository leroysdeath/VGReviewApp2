/**
   * Get game by ID - Updated to use proper IGDB ID lookup
   */
  async getGameById(id: string): Promise<Game | null> {
    console.log('🔍 IGDB Service: Getting game by ID:', id);
    
    const cacheKey = `game:${id}`;
    
    // Check cache first
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }
    
    try {
      const requestStartTime = Date.now();
      
      console.log('🌐 Making Netlify function request for game ID:', {
        url: this.NETLIFY_FUNCTION_URL,
        gameId: id,
        timestamp: new Date().toISOString()
      });

      const response = await fetch(this.NETLIFY_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gameId: id,
          type: 'getById'
        })
      });

      const requestDuration = Date.now() - requestStartTime;
      
      console.log('📡 Netlify function response for game ID:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        duration: `${requestDuration}ms`
      });

      if (!response.ok) {
        console.error('❌ Failed to fetch game by ID:', response.status, response.statusText);
        return null;
      }

      const data = await response.json();
      console.log('📄 Game data received:', data ? 'Found' : 'Not found');
      
      if (data) {
        const game = this.mapIGDBToGame(data);
        this.setCache(cacheKey, game);
        console.log('✅ Successfully loaded game:', game.title);
        return game;
      }
      
      console.log('❌ No game data returned for ID:', id);
      return null;
    } catch (error) {
      console.error('❌ IGDB Service: Get game by ID failed:', error);
      return null;
    }
  }

  async getGameByStringId(id: string): Promise<Game | null> {
    return this.getGameById(id);
  }

  private mapIGDBToGame(igdbGame: IGDBGame): Game {
    return {
      id: igdbGame.id.toString(),
      title: igdbGame.name,
      coverImage: igdbGame.cover?.url || 'https://images.pexels.com/photos/442576/pexels-photo-442576.jpeg?auto=compress&cs=tinysrgb&w=400',
      releaseDate: igdbGame.first_release_date 
        ? new Date(igdbGame.first_release_date * 1000).toISOString().split('T')[0]
        : '',
      genre: igdbGame.genres?.[0]?.name || 'Unknown',
      rating: igdbGame.rating ? Math.round(igdbGame.rating / 10) : 0,
      description: igdbGame.summary || '',
      developer: (igdbGame as any).developer || 'Unknown', // The Netlify function now provides this
      publisher: (igdbGame as any).publisher || 'Unknown', // The Netlify function now provides this
      platforms: igdbGame.platforms?.map(p => p.name) || [],
      screenshots: igdbGame.screenshots?.map(s => s.url) || [],
      videos: [],
      igdbId: igdbGame.id
    };
  }
