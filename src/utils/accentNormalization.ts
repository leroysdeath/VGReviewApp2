/**
 * Accent Normalization Utility
 * 
 * This utility provides functions to normalize accented characters for 
 * search functionality, allowing users to find games regardless of accent marks.
 * 
 * Examples:
 * - "pokemon" should match "Pokémon"
 * - "final fantasy" should match "Final Fantasy™"
 * - "mario" should match "Märio" (hypothetical)
 */

/**
 * Normalize accented characters to their base forms
 * Uses Unicode normalization to convert accented characters
 */
export function normalizeAccents(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  return text
    // Step 1: Unicode normalization (NFD = decomposed form)
    .normalize('NFD')
    // Step 2: Remove combining marks (accents, diacritics)
    .replace(/[\u0300-\u036f]/g, '')
    // Step 3: Handle special cases that Unicode normalization misses
    .replace(/[ÀÁÂÃÄÅàáâãäåĀāĂăĄą]/g, 'a')
    .replace(/[ÇçĆćĈĉĊċČč]/g, 'c')
    .replace(/[ÐĎđ]/g, 'd')
    .replace(/[ÈÉÊËèéêëĒēĔĕĖėĘęĚě]/g, 'e')
    .replace(/[ĜĝĞğĠġĢģ]/g, 'g')
    .replace(/[ĤĥĦħ]/g, 'h')
    .replace(/[ÌÍÎÏìíîïĨĩĪīĬĭĮįİı]/g, 'i')
    .replace(/[Ĵĵ]/g, 'j')
    .replace(/[Ķķ]/g, 'k')
    .replace(/[ĹĺĻļĽľĿŀŁł]/g, 'l')
    .replace(/[ÑñŃńŅņŇň]/g, 'n')
    .replace(/[ÒÓÔÕÖØòóôõöøŌōŎŏŐő]/g, 'o')
    .replace(/[Ŕŕ]/g, 'r')
    .replace(/[ŚśŜŝŞşŠš]/g, 's')
    .replace(/[ŢţŤť]/g, 't')
    .replace(/[ÙÚÛÜùúûüŨũŪūŬŭŮůŰűŲų]/g, 'u')
    .replace(/[Ŵŵ]/g, 'w')
    .replace(/[ÝÿýŶŷŸ]/g, 'y')
    .replace(/[ŹźŻżŽž]/g, 'z')
    // Step 4: Remove trademark symbols and other special characters
    .replace(/[™®©]/g, '')
    // Step 5: Clean up extra whitespace
    .replace(/\s+/g, ' ')
    .trim()
    // Step 6: Convert to lowercase for comparison
    .toLowerCase();
}

/**
 * Create both original and normalized versions of a query for comprehensive searching
 */
export function createSearchVariants(query: string): string[] {
  const normalized = normalizeAccents(query);
  const original = query.toLowerCase().trim();
  
  // Return both versions, removing duplicates
  const variants = [original, normalized];
  return [...new Set(variants)].filter(v => v.length > 0);
}

/**
 * Check if two strings match when normalized (accent-insensitive comparison)
 */
export function isAccentInsensitiveMatch(str1: string, str2: string): boolean {
  return normalizeAccents(str1) === normalizeAccents(str2);
}

/**
 * Game-specific accent normalization patterns
 * These handle common gaming franchise accent variations
 */
const GAME_SPECIFIC_NORMALIZATIONS: Record<string, string[]> = {
  // Pokemon variations
  'pokemon': ['pokémon', 'pokemon', 'pokémom'],
  'pokémon': ['pokemon', 'pokémon'],
  
  // Final Fantasy variations (in case there are accented versions)
  'final fantasy': ['final fantasy™', 'final fantasy®'],
  
  // Dragon Quest variations (Dragon Warrior had accented versions in some regions)
  'dragon quest': ['dragon quest™', 'dragon warrior'],
  
  // Other common gaming terms with potential accents
  'cafe': ['café'],
  'resume': ['résumé', 'resumé'],
  'elite': ['élite'],
  'pokemon red': ['pokémon red'],
  'pokemon blue': ['pokémon blue'],
  'pokemon yellow': ['pokémon yellow'],
  'pokemon gold': ['pokémon gold'],
  'pokemon silver': ['pokémon silver'],
  'pokemon crystal': ['pokémon crystal'],
  'pokemon ruby': ['pokémon ruby'],
  'pokemon sapphire': ['pokémon sapphire'],
  'pokemon emerald': ['pokémon emerald'],
  'pokemon diamond': ['pokémon diamond'],
  'pokemon pearl': ['pokémon pearl'],
  'pokemon platinum': ['pokémon platinum'],
  'pokemon black': ['pokémon black'],
  'pokemon white': ['pokémon white'],
  'pokemon x': ['pokémon x'],
  'pokemon y': ['pokémon y'],
  'pokemon sun': ['pokémon sun'],
  'pokemon moon': ['pokémon moon'],
  'pokemon sword': ['pokémon sword'],
  'pokemon shield': ['pokémon shield'],
  'pokemon legends': ['pokémon legends'],
  'pokemon scarlet': ['pokémon scarlet'],
  'pokemon violet': ['pokémon violet']
};

/**
 * Expand query with game-specific accent variations
 */
export function expandWithAccentVariations(query: string): string[] {
  const normalizedQuery = normalizeAccents(query);
  const lowerQuery = query.toLowerCase().trim();
  
  const expansions: string[] = [query, normalizedQuery];
  
  // Check for direct matches in our game-specific patterns
  Object.entries(GAME_SPECIFIC_NORMALIZATIONS).forEach(([key, variations]) => {
    if (normalizedQuery.includes(key) || lowerQuery.includes(key)) {
      expansions.push(...variations);
    }
    
    // Also check if any variation matches our query
    variations.forEach(variation => {
      if (normalizeAccents(variation).includes(normalizedQuery) || 
          variation.toLowerCase().includes(lowerQuery)) {
        expansions.push(key, ...variations);
      }
    });
  });
  
  // Remove duplicates and empty strings
  return [...new Set(expansions)].filter(exp => exp && exp.trim().length > 0);
}

/**
 * Test the accent normalization with common gaming examples
 */
export function testAccentNormalization(): void {
  console.log('🧪 Testing Accent Normalization:');
  
  const testCases = [
    { input: 'Pokémon', expected: 'pokemon' },
    { input: 'pokémon red', expected: 'pokemon red' },
    { input: 'Final Fantasy™', expected: 'final fantasy' },
    { input: 'Café', expected: 'cafe' },
    { input: 'Résumé', expected: 'resume' },
    { input: 'naïve', expected: 'naive' },
    { input: 'Sørensen', expected: 'sorensen' },
    { input: 'Müller', expected: 'muller' }
  ];
  
  testCases.forEach(({ input, expected }) => {
    const result = normalizeAccents(input);
    const success = result === expected ? '✅' : '❌';
    console.log(`${success} "${input}" → "${result}" (expected: "${expected}")`);
  });
  
  console.log('\n🧪 Testing Pokemon Query Expansion:');
  const pokemonExpansions = expandWithAccentVariations('pokemon');
  console.log('pokemon expansions:', pokemonExpansions);
  
  const pokemonAccentExpansions = expandWithAccentVariations('pokémon');
  console.log('pokémon expansions:', pokemonAccentExpansions);
}

/**
 * Quick utility to check if a game name contains accented characters
 */
export function containsAccentedCharacters(text: string): boolean {
  if (!text) return false;
  return normalizeAccents(text) !== text.toLowerCase();
}

/**
 * Create a search-friendly version of a game name for indexing
 */
export function createSearchFriendlyName(gameName: string): string {
  return normalizeAccents(gameName)
    .replace(/[^\w\s]/g, ' ') // Replace non-alphanumeric with spaces
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .trim();
}