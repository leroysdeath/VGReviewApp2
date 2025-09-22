/**
 * Roman Numeral Converter Utility
 * Provides bidirectional conversion between Arabic numbers and Roman numerals
 * for game title search expansion
 */

/**
 * Convert Arabic number to Roman numeral
 * @param num Number to convert (1-50)
 * @returns Roman numeral string or null if out of range
 */
export function numberToRoman(num: number): string | null {
  if (num < 1 || num > 50) return null;

  const romanNumerals: [number, string][] = [
    [50, 'L'],
    [40, 'XL'],
    [30, 'XXX'],
    [20, 'XX'],
    [19, 'XIX'],
    [18, 'XVIII'],
    [17, 'XVII'],
    [16, 'XVI'],
    [15, 'XV'],
    [14, 'XIV'],
    [13, 'XIII'],
    [12, 'XII'],
    [11, 'XI'],
    [10, 'X'],
    [9, 'IX'],
    [8, 'VIII'],
    [7, 'VII'],
    [6, 'VI'],
    [5, 'V'],
    [4, 'IV'],
    [3, 'III'],
    [2, 'II'],
    [1, 'I']
  ];

  for (const [value, numeral] of romanNumerals) {
    if (num === value) return numeral;
  }

  // Build Roman numeral for numbers not in the lookup
  let result = '';
  let remaining = num;

  const values = [50, 40, 10, 9, 5, 4, 1];
  const numerals = ['L', 'XL', 'X', 'IX', 'V', 'IV', 'I'];

  for (let i = 0; i < values.length; i++) {
    while (remaining >= values[i]) {
      result += numerals[i];
      remaining -= values[i];
    }
  }

  return result;
}

/**
 * Convert Roman numeral to Arabic number
 * @param roman Roman numeral string
 * @returns Number or null if invalid
 */
export function romanToNumber(roman: string): number | null {
  if (!roman || typeof roman !== 'string') return null;

  const upperRoman = roman.toUpperCase().trim();

  // Quick lookup for common numerals
  const romanLookup: Record<string, number> = {
    'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5,
    'VI': 6, 'VII': 7, 'VIII': 8, 'IX': 9, 'X': 10,
    'XI': 11, 'XII': 12, 'XIII': 13, 'XIV': 14, 'XV': 15,
    'XVI': 16, 'XVII': 17, 'XVIII': 18, 'XIX': 19, 'XX': 20,
    'XXI': 21, 'XXII': 22, 'XXIII': 23, 'XXIV': 24, 'XXV': 25,
    'XXVI': 26, 'XXVII': 27, 'XXVIII': 28, 'XXIX': 29, 'XXX': 30,
    'XL': 40, 'L': 50
  };

  if (romanLookup[upperRoman]) {
    return romanLookup[upperRoman];
  }

  // Parse Roman numeral character by character for other cases
  const romanValues: Record<string, number> = {
    'I': 1,
    'V': 5,
    'X': 10,
    'L': 50
  };

  let result = 0;
  let prevValue = 0;

  for (let i = upperRoman.length - 1; i >= 0; i--) {
    const char = upperRoman[i];
    const value = romanValues[char];

    if (!value) return null; // Invalid character

    if (value < prevValue) {
      result -= value;
    } else {
      result += value;
    }

    prevValue = value;
  }

  // Validate the result is reasonable (1-50)
  if (result < 1 || result > 50) return null;

  return result;
}

/**
 * Expand a query with Roman numeral variations
 * @param query The search query
 * @returns Array of query variations with Roman/Arabic conversions
 */
export function expandWithRomanNumerals(query: string): string[] {
  const expansions: string[] = [];

  // Pattern to match Roman numerals (I-L) as whole words
  const romanPattern = /\b([IVXLivxl]{1,})\b/g;

  // Pattern to match Arabic numbers (1-50) as whole words
  const numberPattern = /\b(\d{1,2})\b/g;

  // Check for Roman numerals and convert to numbers
  let romanMatch;
  while ((romanMatch = romanPattern.exec(query)) !== null) {
    const roman = romanMatch[1];
    const number = romanToNumber(roman);

    if (number) {
      // Replace Roman with Arabic
      const expanded = query.substring(0, romanMatch.index) +
                       number +
                       query.substring(romanMatch.index + roman.length);
      expansions.push(expanded.toLowerCase());
    }
  }

  // Check for Arabic numbers and convert to Roman
  let numberMatch;
  while ((numberMatch = numberPattern.exec(query)) !== null) {
    const num = parseInt(numberMatch[1], 10);
    const roman = numberToRoman(num);

    if (roman) {
      // Replace Arabic with Roman (both upper and lower case)
      const expandedUpper = query.substring(0, numberMatch.index) +
                           roman +
                           query.substring(numberMatch.index + numberMatch[1].length);
      const expandedLower = query.substring(0, numberMatch.index) +
                           roman.toLowerCase() +
                           query.substring(numberMatch.index + numberMatch[1].length);

      expansions.push(expandedUpper.toLowerCase());
      if (expandedUpper !== expandedLower) {
        expansions.push(expandedLower.toLowerCase());
      }
    }
  }

  // Remove duplicates
  return [...new Set(expansions)];
}

/**
 * Check if a string contains a Roman numeral
 */
export function containsRomanNumeral(text: string): boolean {
  const romanPattern = /\b([IVXLivxl]{1,})\b/;
  const match = text.match(romanPattern);
  if (!match) return false;

  const number = romanToNumber(match[1]);
  return number !== null;
}

/**
 * Check if a string contains an Arabic number that could be a game sequel number
 */
export function containsSequelNumber(text: string): boolean {
  return /\b([1-9]|[12]\d|3[0-9]|4[0-9]|50)\b/.test(text);
}