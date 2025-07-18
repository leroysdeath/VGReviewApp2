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
      // Make a specific request for this game ID
      const response = await fetch(this.NETLIFY_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gameId: id, // Send as gameId instead of searchTerm
          type: 'getById' // Add a type to distinguish from search
        })
      });

      if (!response.ok) {
        console.error('❌ Failed to fetch game by ID:', response.status, response.statusText);
        return null;
      }

      const data = await response.json();
      
      if (data && data.length > 0) {
        const game = this.mapIGDBToGame(data[0]);
        this.setCache(cacheKey, game);
        return game;
      }
      
      return null;
    } catch (error) {
      console.error('❌ IGDB Service: Get game by ID failed:', error);
      return null;
    }
  }

  async getGameByStringId(id: string): Promise<Game | null> {
    return this.getGameById(id);
  }
