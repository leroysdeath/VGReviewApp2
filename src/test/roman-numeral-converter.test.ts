/**
 * Unit tests for Roman Numeral Converter
 */

import { describe, it, expect } from '@jest/globals';
import {
  numberToRoman,
  romanToNumber,
  expandWithRomanNumerals,
  containsRomanNumeral,
  containsSequelNumber
} from '../utils/romanNumeralConverter';

describe('Roman Numeral Converter', () => {

  describe('numberToRoman', () => {
    it('should convert single digits correctly', () => {
      expect(numberToRoman(1)).toBe('I');
      expect(numberToRoman(2)).toBe('II');
      expect(numberToRoman(3)).toBe('III');
      expect(numberToRoman(4)).toBe('IV');
      expect(numberToRoman(5)).toBe('V');
      expect(numberToRoman(6)).toBe('VI');
      expect(numberToRoman(7)).toBe('VII');
      expect(numberToRoman(8)).toBe('VIII');
      expect(numberToRoman(9)).toBe('IX');
    });

    it('should convert double digits correctly', () => {
      expect(numberToRoman(10)).toBe('X');
      expect(numberToRoman(11)).toBe('XI');
      expect(numberToRoman(12)).toBe('XII');
      expect(numberToRoman(13)).toBe('XIII');
      expect(numberToRoman(14)).toBe('XIV');
      expect(numberToRoman(15)).toBe('XV');
      expect(numberToRoman(20)).toBe('XX');
      expect(numberToRoman(30)).toBe('XXX');
      expect(numberToRoman(40)).toBe('XL');
      expect(numberToRoman(50)).toBe('L');
    });

    it('should handle edge cases', () => {
      expect(numberToRoman(0)).toBeNull();
      expect(numberToRoman(-1)).toBeNull();
      expect(numberToRoman(51)).toBeNull();
      expect(numberToRoman(100)).toBeNull();
    });
  });

  describe('romanToNumber', () => {
    it('should convert single digit Roman numerals', () => {
      expect(romanToNumber('I')).toBe(1);
      expect(romanToNumber('II')).toBe(2);
      expect(romanToNumber('III')).toBe(3);
      expect(romanToNumber('IV')).toBe(4);
      expect(romanToNumber('V')).toBe(5);
      expect(romanToNumber('VI')).toBe(6);
      expect(romanToNumber('VII')).toBe(7);
      expect(romanToNumber('VIII')).toBe(8);
      expect(romanToNumber('IX')).toBe(9);
    });

    it('should convert double digit Roman numerals', () => {
      expect(romanToNumber('X')).toBe(10);
      expect(romanToNumber('XI')).toBe(11);
      expect(romanToNumber('XII')).toBe(12);
      expect(romanToNumber('XIII')).toBe(13);
      expect(romanToNumber('XIV')).toBe(14);
      expect(romanToNumber('XV')).toBe(15);
      expect(romanToNumber('XX')).toBe(20);
      expect(romanToNumber('XXX')).toBe(30);
      expect(romanToNumber('XL')).toBe(40);
      expect(romanToNumber('L')).toBe(50);
    });

    it('should handle lowercase Roman numerals', () => {
      expect(romanToNumber('i')).toBe(1);
      expect(romanToNumber('v')).toBe(5);
      expect(romanToNumber('x')).toBe(10);
      expect(romanToNumber('xiv')).toBe(14);
    });

    it('should return null for invalid Roman numerals', () => {
      expect(romanToNumber('')).toBeNull();
      expect(romanToNumber('ABC')).toBeNull();
      expect(romanToNumber('IIII')).toBe(4); // Still valid, if unusual
      expect(romanToNumber('IC')).toBeNull(); // Invalid - has C which we don't support
    });
  });

  describe('expandWithRomanNumerals', () => {
    it('should expand queries with Arabic numbers to Roman numerals', () => {
      const expansions = expandWithRomanNumerals('Street Fighter 2');
      expect(expansions).toContain('street fighter ii');

      const ff7Expansions = expandWithRomanNumerals('Final Fantasy 7');
      expect(ff7Expansions).toContain('final fantasy vii');
    });

    it('should expand queries with Roman numerals to Arabic numbers', () => {
      const expansions = expandWithRomanNumerals('Street Fighter II');
      expect(expansions).toContain('street fighter 2');

      const ffVIIExpansions = expandWithRomanNumerals('Final Fantasy VII');
      expect(ffVIIExpansions).toContain('final fantasy 7');
    });

    it('should handle multiple numbers in a query', () => {
      const expansions = expandWithRomanNumerals('Street Fighter 2 vs Street Fighter 3');
      expect(expansions).toContain('street fighter ii vs street fighter 3');
      expect(expansions).toContain('street fighter 2 vs street fighter iii');
      expect(expansions).toContain('street fighter ii vs street fighter iii');
    });

    it('should not expand numbers that are part of longer strings', () => {
      const expansions = expandWithRomanNumerals('PlayStation 2');
      expect(expansions).toContain('playstation ii');

      const noExpansion = expandWithRomanNumerals('Area51');
      expect(noExpansion).toHaveLength(0); // No expansion for numbers in middle of words
    });

    it('should handle case variations correctly', () => {
      const upperExpansions = expandWithRomanNumerals('STREET FIGHTER II');
      expect(upperExpansions).toContain('street fighter 2');

      const lowerExpansions = expandWithRomanNumerals('street fighter ii');
      expect(lowerExpansions).toContain('street fighter 2');
    });

    it('should return empty array for queries without numbers or Roman numerals', () => {
      expect(expandWithRomanNumerals('Mario Bros')).toHaveLength(0);
      expect(expandWithRomanNumerals('The Legend of Zelda')).toHaveLength(0);
    });
  });

  describe('containsRomanNumeral', () => {
    it('should detect valid Roman numerals', () => {
      expect(containsRomanNumeral('Final Fantasy VII')).toBe(true);
      expect(containsRomanNumeral('Street Fighter II')).toBe(true);
      expect(containsRomanNumeral('Quake III Arena')).toBe(true);
      expect(containsRomanNumeral('Grand Theft Auto IV')).toBe(true);
    });

    it('should detect lowercase Roman numerals', () => {
      expect(containsRomanNumeral('final fantasy vii')).toBe(true);
      expect(containsRomanNumeral('street fighter ii')).toBe(true);
    });

    it('should not detect non-Roman numerals', () => {
      expect(containsRomanNumeral('Final Fantasy')).toBe(false);
      expect(containsRomanNumeral('Street Fighter')).toBe(false);
      expect(containsRomanNumeral('Mario Bros')).toBe(false);
    });

    it('should not detect invalid letter combinations', () => {
      expect(containsRomanNumeral('Mix')).toBe(false); // IX is valid but Mix is not
      expect(containsRomanNumeral('Vim')).toBe(false); // Not a standalone Roman numeral
    });
  });

  describe('containsSequelNumber', () => {
    it('should detect Arabic sequel numbers', () => {
      expect(containsSequelNumber('Street Fighter 2')).toBe(true);
      expect(containsSequelNumber('Final Fantasy 7')).toBe(true);
      expect(containsSequelNumber('Quake 3 Arena')).toBe(true);
      expect(containsSequelNumber('Civilization 6')).toBe(true);
    });

    it('should detect numbers up to 50', () => {
      expect(containsSequelNumber('Game 1')).toBe(true);
      expect(containsSequelNumber('Game 25')).toBe(true);
      expect(containsSequelNumber('Game 50')).toBe(true);
    });

    it('should not detect numbers over 50 or 0', () => {
      expect(containsSequelNumber('Game 0')).toBe(false);
      expect(containsSequelNumber('Game 51')).toBe(false);
      expect(containsSequelNumber('Game 100')).toBe(false);
    });

    it('should not detect non-sequel numbers', () => {
      expect(containsSequelNumber('Street Fighter')).toBe(false);
      expect(containsSequelNumber('Final Fantasy')).toBe(false);
      expect(containsSequelNumber('Mario Bros')).toBe(false);
    });
  });

  describe('Real-world game title scenarios', () => {
    it('should handle common game franchise patterns', () => {
      // Street Fighter series
      expect(expandWithRomanNumerals('Street Fighter 2')).toContain('street fighter ii');
      expect(expandWithRomanNumerals('Street Fighter II')).toContain('street fighter 2');

      // Final Fantasy series
      expect(expandWithRomanNumerals('Final Fantasy 7')).toContain('final fantasy vii');
      expect(expandWithRomanNumerals('Final Fantasy VII')).toContain('final fantasy 7');
      expect(expandWithRomanNumerals('Final Fantasy 13')).toContain('final fantasy xiii');
      expect(expandWithRomanNumerals('Final Fantasy XIII')).toContain('final fantasy 13');

      // Grand Theft Auto series
      expect(expandWithRomanNumerals('Grand Theft Auto 4')).toContain('grand theft auto iv');
      expect(expandWithRomanNumerals('Grand Theft Auto IV')).toContain('grand theft auto 4');

      // Civilization series
      expect(expandWithRomanNumerals('Civilization 6')).toContain('civilization vi');
      expect(expandWithRomanNumerals('Civilization VI')).toContain('civilization 6');
    });

    it('should handle subtitles with Roman numerals', () => {
      const expansions = expandWithRomanNumerals('Final Fantasy XIII-2');
      expect(expansions).toContain('final fantasy 13-2');

      const sonicExpansions = expandWithRomanNumerals('Sonic Adventure 2');
      expect(sonicExpansions).toContain('sonic adventure ii');
    });
  });
});