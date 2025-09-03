/**
 * Basic Search Tests - Simplified version without complex interfaces
 */

import { describe, it, expect } from '@jest/globals';
import { filterProtectedContent } from '../utils/contentProtectionFilter';
import { detectFranchiseSearch, isFlagshipGame } from '../utils/flagshipGames';

// Simple mock game data that matches the expected Game interface
const mockMarioGame = {
  id: 1,
  name: 'Super Mario Bros.',
  developer: 'Nintendo',
  publisher: 'Nintendo',
  category: 0,
  genres: ['Platform'],
  summary: 'Classic Mario platformer'
};

const mockFanGame = {
  id: 2,
  name: 'Mario Bros ROM Hack',
  developer: 'Fan Developer',
  publisher: 'Homebrew',
  category: 5,
  genres: ['Platform'],
  summary: 'Fan-made Mario modification'
};

describe('Basic Search System Tests', () => {
  
  describe('Content Protection Filter', () => {
    it('should filter fan-made content', () => {
      const testGames = [mockMarioGame, mockFanGame];
      const filtered = filterProtectedContent(testGames);
      
      // Should filter out fan game but keep official game
      expect(filtered.length).toBeLessThan(testGames.length);
      expect(filtered.some(g => g.name === 'Super Mario Bros.')).toBe(true);
      expect(filtered.some(g => g.name === 'Mario Bros ROM Hack')).toBe(false);
    });

    it('should preserve official Nintendo games', () => {
      const officialGames = [mockMarioGame];
      const filtered = filterProtectedContent(officialGames);
      
      // Official games should pass through
      expect(filtered.length).toBe(officialGames.length);
    });
  });

  describe('Franchise Detection', () => {
    it('should detect Mario franchise', () => {
      const franchise = detectFranchiseSearch('mario');
      expect(franchise).toBe('mario');
    });

    it('should detect Pokemon franchise', () => {
      const franchise = detectFranchiseSearch('pokemon');
      expect(franchise).toBe('pokemon');
    });

    it('should return null for non-franchise queries', () => {
      const franchise = detectFranchiseSearch('random game name');
      expect(franchise).toBeNull();
    });
  });

  describe('Flagship Game Detection', () => {
    it('should identify flagship Mario games', () => {
      const isFlagship = isFlagshipGame('Super Mario Bros. 3', 'mario');
      expect(isFlagship).toBeTruthy();
    });

    it('should identify flagship Pokemon games', () => {
      const isFlagship = isFlagshipGame('Pokemon Red', 'pokemon');
      expect(isFlagship).toBeTruthy();
    });

    it('should not identify non-flagship games as flagship', () => {
      const isFlagship = isFlagshipGame('Mario Tennis', 'mario');
      expect(isFlagship).toBeFalsy();
    });
  });
});