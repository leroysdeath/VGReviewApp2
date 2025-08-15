// Database service for handling API calls
// This would typically connect to your backend API

import { 
  User, 
  Game, 
  Rating, 
  Platform, 
  GameWithRatings, 
  UserProfile,
  CreateRatingRequest,
  UpdateRatingRequest,
  CreateGameRequest,
  GameSearchResult,
  UserSearchResult
} from '../types/database';

class DatabaseService {
  private baseUrl = '/api'; // This would be your backend API URL

  // User operations
  async getUser(id: number): Promise<UserProfile | null> {
    try {
      const response = await fetch(`${this.baseUrl}/users/${id}`);
      if (!response.ok) throw new Error('User not found');
      return await response.json();
    } catch (error) {
      console.error('Error fetching user:', error);
      return null;
    }
  }

  async getUserByEmail(email: string): Promise<User | null> {
    try {
      const response = await fetch(`${this.baseUrl}/users/email/${encodeURIComponent(email)}`);
      if (!response.ok) throw new Error('User not found');
      return await response.json();
    } catch (error) {
      console.error('Error fetching user by email:', error);
      return null;
    }
  }

  async searchUsers(query: string, page = 1, limit = 20): Promise<UserSearchResult> {
    try {
      const response = await fetch(
        `${this.baseUrl}/users/search?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`
      );
      if (!response.ok) throw new Error('Search failed');
      return await response.json();
    } catch (error) {
      console.error('Error searching users:', error);
      return { users: [], total: 0, page, limit };
    }
  }

  // Game operations
  async getGame(id: number): Promise<GameWithRatings | null> {
    try {
      const response = await fetch(`${this.baseUrl}/games/${id}`);
      if (!response.ok) throw new Error('Game not found');
      return await response.json();
    } catch (error) {
      console.error('Error fetching game:', error);
      return null;
    }
  }

  async searchGames(query: string, page = 1, limit = 20): Promise<GameSearchResult> {
    try {
      const response = await fetch(
        `${this.baseUrl}/games/search?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`
      );
      if (!response.ok) throw new Error('Search failed');
      return await response.json();
    } catch (error) {
      console.error('Error searching games:', error);
      return { games: [], total: 0, page, limit };
    }
  }

  async getPopularGames(limit = 20): Promise<GameWithRatings[]> {
    try {
      const response = await fetch(`${this.baseUrl}/games/popular?limit=${limit}`);
      if (!response.ok) throw new Error('Failed to fetch popular games');
      return await response.json();
    } catch (error) {
      console.error('Error fetching popular games:', error);
      return [];
    }
  }

  async getRecentGames(limit = 20): Promise<GameWithRatings[]> {
    try {
      const response = await fetch(`${this.baseUrl}/games/recent?limit=${limit}`);
      if (!response.ok) throw new Error('Failed to fetch recent games');
      return await response.json();
    } catch (error) {
      console.error('Error fetching recent games:', error);
      return [];
    }
  }

  async createGame(gameData: CreateGameRequest): Promise<Game | null> {
    try {
      const response = await fetch(`${this.baseUrl}/games`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(gameData),
      });
      if (!response.ok) throw new Error('Failed to create game');
      return await response.json();
    } catch (error) {
      console.error('Error creating game:', error);
      return null;
    }
  }

  // Rating operations
  async getUserRatings(userId: number, page = 1, limit = 20): Promise<Rating[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/users/${userId}/ratings?page=${page}&limit=${limit}`
      );
      if (!response.ok) throw new Error('Failed to fetch user ratings');
      return await response.json();
    } catch (error) {
      console.error('Error fetching user ratings:', error);
      return [];
    }
  }

  async getGameRatings(gameId: number, page = 1, limit = 20): Promise<Rating[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/games/${gameId}/ratings?page=${page}&limit=${limit}`
      );
      if (!response.ok) throw new Error('Failed to fetch game ratings');
      return await response.json();
    } catch (error) {
      console.error('Error fetching game ratings:', error);
      return [];
    }
  }

  async createRating(ratingData: CreateRatingRequest): Promise<Rating | null> {
    try {
      const response = await fetch(`${this.baseUrl}/ratings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ratingData),
      });
      if (!response.ok) throw new Error('Failed to create rating');
      return await response.json();
    } catch (error) {
      console.error('Error creating rating:', error);
      return null;
    }
  }

  async updateRating(ratingData: UpdateRatingRequest): Promise<Rating | null> {
    try {
      const response = await fetch(`${this.baseUrl}/ratings/${ratingData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ratingData),
      });
      if (!response.ok) throw new Error('Failed to update rating');
      return await response.json();
    } catch (error) {
      console.error('Error updating rating:', error);
      return null;
    }
  }

  async deleteRating(id: number): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/ratings/${id}`, {
        method: 'DELETE',
      });
      return response.ok;
    } catch (error) {
      console.error('Error deleting rating:', error);
      return false;
    }
  }

  // Platform operations
  async getPlatforms(): Promise<Platform[]> {
    try {
      const response = await fetch(`${this.baseUrl}/platforms`);
      if (!response.ok) throw new Error('Failed to fetch platforms');
      return await response.json();
    } catch (error) {
      console.error('Error fetching platforms:', error);
      return [];
    }
  }

  // Statistics
  async getUserStats(userId: number): Promise<{
    totalGames: number;
    completedGames: number;
    averageRating: number;
    totalReviews: number;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/users/${userId}/stats`);
      if (!response.ok) throw new Error('Failed to fetch user stats');
      return await response.json();
    } catch (error) {
      console.error('Error fetching user stats:', error);
      return {
        totalGames: 0,
        completedGames: 0,
        averageRating: 0,
        totalReviews: 0,
      };
    }
  }

  async getGameStats(gameId: number): Promise<{
    averageRating: number;
    totalRatings: number;
    ratingDistribution: { rating: number; count: number }[];
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/games/${gameId}/stats`);
      if (!response.ok) throw new Error('Failed to fetch game stats');
      return await response.json();
    } catch (error) {
      console.error('Error fetching game stats:', error);
      return {
        averageRating: 0,
        totalRatings: 0,
        ratingDistribution: [],
      };
    }
  }
}

export const databaseService = new DatabaseService();