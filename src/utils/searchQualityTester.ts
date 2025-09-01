interface ImportantGame {
  name: string;
  alternativeNames?: string[];
  description?: string;
}

interface SearchQualityResult {
  franchise: string;
  searchTerm: string;
  totalImportantGames: number;
  foundGames: number;
  foundGamesList: string[];
  missingGames: string[];
  qualityPercentage: number;
}

export const IMPORTANT_GAMES_LISTS = {
  mario: [
    { name: 'Super Mario Bros.', alternativeNames: ['Super Mario Brothers', 'SMB'] },
    { name: 'Super Mario Bros. 2', alternativeNames: ['Super Mario Brothers 2', 'SMB2'] },
    { name: 'Super Mario Bros. 3', alternativeNames: ['Super Mario Brothers 3', 'SMB3'] },
    { name: 'Super Mario World', alternativeNames: ['SMW'] },
    { name: 'Super Mario 64', alternativeNames: ['SM64', 'Mario 64'] },
    { name: 'Super Mario Sunshine', alternativeNames: ['Mario Sunshine'] },
    { name: 'Super Mario Galaxy', alternativeNames: ['Mario Galaxy'] },
    { name: 'Super Mario Galaxy 2', alternativeNames: ['Mario Galaxy 2'] },
    { name: 'Super Mario Odyssey', alternativeNames: ['Mario Odyssey'] }
  ] as ImportantGame[],
  
  zelda: [
    { name: 'The Legend of Zelda', alternativeNames: ['Zelda 1', 'LoZ'] },
    { name: 'Zelda II: The Adventure of Link', alternativeNames: ['Adventure of Link', 'Zelda 2'] },
    { name: 'The Legend of Zelda: A Link to the Past', alternativeNames: ['Link to the Past', 'ALttP'] },
    { name: 'The Legend of Zelda: Link\'s Awakening', alternativeNames: ['Links Awakening'] },
    { name: 'The Legend of Zelda: Ocarina of Time', alternativeNames: ['Ocarina of Time', 'OoT'] },
    { name: 'The Legend of Zelda: Majora\'s Mask', alternativeNames: ['Majoras Mask', 'MM'] },
    { name: 'The Legend of Zelda: The Wind Waker', alternativeNames: ['Wind Waker', 'WW'] },
    { name: 'The Legend of Zelda: Twilight Princess', alternativeNames: ['Twilight Princess', 'TP'] },
    { name: 'The Legend of Zelda: Breath of the Wild', alternativeNames: ['Breath of the Wild', 'BotW'] },
    { name: 'The Legend of Zelda: Tears of the Kingdom', alternativeNames: ['Tears of the Kingdom', 'TotK'] }
  ] as ImportantGame[],
  
  megamanx: [
    { name: 'Mega Man X', alternativeNames: ['MMX', 'Megaman X'] },
    { name: 'Mega Man X2', alternativeNames: ['MMX2', 'Megaman X2'] },
    { name: 'Mega Man X3', alternativeNames: ['MMX3', 'Megaman X3'] },
    { name: 'Mega Man X4', alternativeNames: ['MMX4', 'Megaman X4'] },
    { name: 'Mega Man X5', alternativeNames: ['MMX5', 'Megaman X5'] },
    { name: 'Mega Man X6', alternativeNames: ['MMX6', 'Megaman X6'] },
    { name: 'Mega Man X7', alternativeNames: ['MMX7', 'Megaman X7'] },
    { name: 'Mega Man X8', alternativeNames: ['MMX8', 'Megaman X8'] }
  ] as ImportantGame[]
};

export function findGameInResults(
  importantGame: ImportantGame, 
  searchResults: any[]
): boolean {
  const searchNames = [importantGame.name, ...(importantGame.alternativeNames || [])];
  
  return searchResults.some(result => {
    const resultName = result.name?.toLowerCase() || '';
    return searchNames.some(searchName => {
      const normalizedSearchName = searchName.toLowerCase();
      return resultName.includes(normalizedSearchName) || 
             normalizedSearchName.includes(resultName) ||
             isCloseMatch(normalizedSearchName, resultName);
    });
  });
}

function isCloseMatch(name1: string, name2: string): boolean {
  // Simple fuzzy matching for games with slight name variations
  const normalize = (str: string) => str.replace(/[:\-\.\s]/g, '').toLowerCase();
  const normalized1 = normalize(name1);
  const normalized2 = normalize(name2);
  
  return normalized1.includes(normalized2) || 
         normalized2.includes(normalized1) ||
         levenshteinDistance(normalized1, normalized2) <= 3;
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
  
  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
  
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator
      );
    }
  }
  
  return matrix[str2.length][str1.length];
}

export async function testSearchQuality(
  franchise: keyof typeof IMPORTANT_GAMES_LISTS,
  searchTerm: string,
  searchFunction: (query: string) => Promise<any[]>
): Promise<SearchQualityResult> {
  const importantGames = IMPORTANT_GAMES_LISTS[franchise];
  const searchResults = await searchFunction(searchTerm);
  
  const foundGames: string[] = [];
  const missingGames: string[] = [];
  
  importantGames.forEach(importantGame => {
    const found = findGameInResults(importantGame, searchResults);
    if (found) {
      foundGames.push(importantGame.name);
    } else {
      missingGames.push(importantGame.name);
    }
  });
  
  const qualityPercentage = (foundGames.length / importantGames.length) * 100;
  
  return {
    franchise,
    searchTerm,
    totalImportantGames: importantGames.length,
    foundGames: foundGames.length,
    foundGamesList,
    missingGames,
    qualityPercentage
  };
}

export function generateQualityReport(results: SearchQualityResult[]): string {
  let report = '🎮 SEARCH QUALITY ANALYSIS REPORT\n\n';
  
  results.forEach(result => {
    report += `📊 ${result.franchise.toUpperCase()} FRANCHISE - "${result.searchTerm}" search\n`;
    report += `✅ Found: ${result.foundGames}/${result.totalImportantGames} important games (${result.qualityPercentage.toFixed(1)}%)\n`;
    
    if (result.foundGamesList.length > 0) {
      report += `\n✅ FOUND GAMES:\n`;
      result.foundGamesList.forEach(game => {
        report += `   - ${game}\n`;
      });
    }
    
    if (result.missingGames.length > 0) {
      report += `\n❌ MISSING GAMES:\n`;
      result.missingGames.forEach(game => {
        report += `   - ${game}\n`;
      });
    }
    
    report += '\n' + '='.repeat(60) + '\n\n';
  });
  
  const avgQuality = results.reduce((sum, r) => sum + r.qualityPercentage, 0) / results.length;
  report += `📈 OVERALL AVERAGE QUALITY: ${avgQuality.toFixed(1)}%\n`;
  
  return report;
}