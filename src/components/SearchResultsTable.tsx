/**
 * Search Results Table Component
 * Comprehensive table showing detailed analysis of each search result
 */

import React, { useState, useMemo } from 'react';
import type { SearchResultsAnalysis, ResultAnalysis } from '../services/resultAnalysisService';

interface SearchResultsTableProps {
  analysis: SearchResultsAnalysis;
}

type SortField = 'position' | 'relevance' | 'quality' | 'popularity' | 'total_score' | 'name' | 'total_rating' | 'follows' | 'flag_status' | 'copyright_level';
type SortDirection = 'asc' | 'desc';

export const SearchResultsTable: React.FC<SearchResultsTableProps> = ({ analysis }) => {
  const [sortField, setSortField] = useState<SortField>('position');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [selectedResult, setSelectedResult] = useState<ResultAnalysis | null>(null);
  const [showFiltered, setShowFiltered] = useState(true);
  const [showOnlyProblems, setShowOnlyProblems] = useState(false);

  // Sort and filter results
  const sortedResults = useMemo(() => {
    let filtered = analysis.resultAnalyses;
    
    if (!showFiltered) {
      filtered = filtered.filter(r => !r.wasFiltered);
    }
    
    if (showOnlyProblems) {
      filtered = filtered.filter(r => 
        r.wasFiltered || 
        (r.relevanceBreakdown.nameMatch.type === 'exact' && r.finalPosition > 5) ||
        (r.rankingFactors.relevanceScore < 0.1 && r.finalPosition !== -1 && r.finalPosition < 10)
      );
    }
    
    return [...filtered].sort((a, b) => {
      let aValue: number | string;
      let bValue: number | string;
      
      switch (sortField) {
        case 'position':
          aValue = a.finalPosition === -1 ? 999 : a.finalPosition;
          bValue = b.finalPosition === -1 ? 999 : b.finalPosition;
          break;
        case 'relevance':
          aValue = a.rankingFactors.relevanceScore;
          bValue = b.rankingFactors.relevanceScore;
          break;
        case 'quality':
          aValue = a.qualityMetrics.completenessScore;
          bValue = b.qualityMetrics.completenessScore;
          break;
        case 'popularity':
          aValue = a.rankingFactors.popularityScore;
          bValue = b.rankingFactors.popularityScore;
          break;
        case 'total_score':
          aValue = a.totalSortingScore;
          bValue = b.totalSortingScore;
          break;
        case 'name':
          aValue = a.gameName.toLowerCase();
          bValue = b.gameName.toLowerCase();
          break;
        case 'total_rating':
          aValue = a.igdbMetrics?.totalRating || 0;
          bValue = b.igdbMetrics?.totalRating || 0;
          break;
        case 'follows':
          aValue = a.igdbMetrics?.follows || 0;
          bValue = b.igdbMetrics?.follows || 0;
          break;
        case 'flag_status':
          aValue = a.flagStatus.hasGreenlight ? 2 : a.flagStatus.hasRedlight ? 1 : 0;
          bValue = b.flagStatus.hasGreenlight ? 2 : b.flagStatus.hasRedlight ? 1 : 0;
          break;
        case 'copyright_level':
          const levelValues = { 'BLOCK_ALL': 4, 'AGGRESSIVE': 3, 'MODERATE': 2, 'MOD_FRIENDLY': 1 };
          aValue = levelValues[a.copyrightInfo.level] || 0;
          bValue = levelValues[b.copyrightInfo.level] || 0;
          break;
        default:
          return 0;
      }
      
      if (typeof aValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue as string)
          : (bValue as string).localeCompare(aValue);
      }
      
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    });
  }, [analysis.resultAnalyses, sortField, sortDirection, showFiltered, showOnlyProblems]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return '↕️';
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  const getRelevanceColor = (score: number) => {
    if (score >= 0.7) return 'text-green-400';
    if (score >= 0.4) return 'text-yellow-400';
    if (score >= 0.2) return 'text-orange-400';
    return 'text-red-400';
  };

  const getQualityColor = (score: number) => {
    if (score >= 0.8) return 'text-green-400';
    if (score >= 0.6) return 'text-yellow-400';
    if (score >= 0.4) return 'text-orange-400';
    return 'text-red-400';
  };

  const getPositionColor = (position: number, relevanceScore: number) => {
    if (position === -1) return 'text-red-500'; // Filtered
    if (position === 0) return 'text-green-500'; // First place
    if (position < 5) return 'text-blue-400';   // Top 5
    if (position < 10) return 'text-gray-300';  // Top 10
    if (relevanceScore > 0.5 && position > 10) return 'text-orange-400'; // Should be higher
    return 'text-gray-500';
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-gray-800 p-4 rounded-lg">
        <div className="flex flex-wrap gap-4 items-center">
          <h3 className="text-lg font-bold">Search Results Analysis</h3>
          
          <div className="flex gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showFiltered}
                onChange={(e) => setShowFiltered(e.target.checked)}
                className="rounded"
              />
              Show Filtered Results
            </label>
            
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showOnlyProblems}
                onChange={(e) => setShowOnlyProblems(e.target.checked)}
                className="rounded"
              />
              Show Only Problems
            </label>
          </div>
          
          <div className="text-sm text-gray-400">
            {sortedResults.length} of {analysis.totalResults} results
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-700 border-b border-gray-600">
                <th 
                  className="px-4 py-3 text-left cursor-pointer hover:bg-gray-600"
                  onClick={() => handleSort('position')}
                >
                  Rank {getSortIcon('position')}
                </th>
                <th 
                  className="px-4 py-3 text-left cursor-pointer hover:bg-gray-600"
                  onClick={() => handleSort('name')}
                >
                  Game Name {getSortIcon('name')}
                </th>
                <th 
                  className="px-4 py-3 text-center cursor-pointer hover:bg-gray-600"
                  onClick={() => handleSort('relevance')}
                >
                  Relevance {getSortIcon('relevance')}
                </th>
                <th 
                  className="px-4 py-3 text-center cursor-pointer hover:bg-gray-600"
                  onClick={() => handleSort('quality')}
                >
                  Quality {getSortIcon('quality')}
                </th>
                <th 
                  className="px-4 py-3 text-center cursor-pointer hover:bg-gray-600"
                  onClick={() => handleSort('popularity')}
                >
                  Popularity {getSortIcon('popularity')}
                </th>
                <th 
                  className="px-4 py-3 text-center cursor-pointer hover:bg-gray-600"
                  onClick={() => handleSort('total_score')}
                >
                  Total Score {getSortIcon('total_score')}
                </th>
                <th 
                  className="px-4 py-3 text-center cursor-pointer hover:bg-gray-600"
                  onClick={() => handleSort('flag_status')}
                >
                  Flag Status {getSortIcon('flag_status')}
                </th>
                <th 
                  className="px-4 py-3 text-center cursor-pointer hover:bg-gray-600"
                  onClick={() => handleSort('copyright_level')}
                >
                  Copyright Level {getSortIcon('copyright_level')}
                </th>
                <th className="px-4 py-3 text-center">Match Type</th>
                <th className="px-4 py-3 text-center">Issues</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedResults.map((result, index) => (
                <tr 
                  key={result.gameId} 
                  className="border-b border-gray-700 hover:bg-gray-750"
                >
                  <td className="px-4 py-3">
                    <div className={`font-mono ${getPositionColor(result.finalPosition, result.rankingFactors.relevanceScore)}`}>
                      {result.finalPosition === -1 ? '❌ FILTERED' : `#${result.finalPosition + 1}`}
                    </div>
                    <div className="text-xs text-gray-500">
                      {result.source === 'igdb' ? '🌐 IGDB' : '💾 DB'}
                    </div>
                  </td>
                  
                  <td className="px-4 py-3">
                    <div className="font-medium truncate max-w-xs" title={result.gameName}>
                      {result.gameName}
                    </div>
                    {result.wasFiltered && (
                      <div className="text-xs text-red-400 mt-1">
                        {result.filteringSummary}
                      </div>
                    )}
                  </td>
                  
                  <td className="px-4 py-3 text-center">
                    <div className={`font-mono ${getRelevanceColor(result.rankingFactors.relevanceScore)}`}>
                      {result.rankingFactors.relevanceScore.toFixed(3)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {result.relevanceBreakdown.nameMatch.type.replace('_', ' ')}
                    </div>
                  </td>
                  
                  <td className="px-4 py-3 text-center">
                    <div className={`font-mono ${getQualityColor(result.qualityMetrics.completenessScore)}`}>
                      {(result.qualityMetrics.completenessScore * 100).toFixed(0)}%
                    </div>
                    <div className="text-xs text-gray-500 flex justify-center gap-1 mt-1">
                      {result.qualityMetrics.hasDescription && '📝'}
                      {result.qualityMetrics.hasCover && '🖼️'}
                      {result.qualityMetrics.hasGenres && '🎮'}
                      {result.qualityMetrics.hasPlatforms && '💻'}
                      {result.qualityMetrics.hasRating && '⭐'}
                    </div>
                  </td>
                  
                  <td className="px-4 py-3 text-center">
                    <div className="font-mono text-blue-400">
                      {result.rankingFactors.popularityScore.toFixed(3)}
                    </div>
                  </td>
                  
                  <td className="px-4 py-3 text-center">
                    <div className="font-mono text-purple-400">
                      {result.totalSortingScore.toFixed(3)}
                    </div>
                  </td>
                  
                  <td className="px-4 py-3 text-center">
                    <div className="text-xs">
                      {result.flagStatus.hasGreenlight && (
                        <div className="text-green-400 font-semibold">✅ GREENLIGHT</div>
                      )}
                      {result.flagStatus.hasRedlight && (
                        <div className="text-red-400 font-semibold">🚫 REDLIGHT</div>
                      )}
                      {!result.flagStatus.overrideActive && (
                        <div className="text-gray-400">⚪ Auto</div>
                      )}
                    </div>
                    {result.flagStatus.flagReason && (
                      <div className="text-xs text-gray-400 mt-1 truncate" title={result.flagStatus.flagReason}>
                        {result.flagStatus.flagReason}
                      </div>
                    )}
                  </td>
                  
                  <td className="px-4 py-3 text-center">
                    <div className="text-xs">
                      <div className={`font-semibold ${
                        result.copyrightInfo.level === 'BLOCK_ALL' ? 'text-red-600' :
                        result.copyrightInfo.level === 'AGGRESSIVE' ? 'text-red-400' :
                        result.copyrightInfo.level === 'MODERATE' ? 'text-yellow-400' :
                        'text-green-400'
                      }`}>
                        {result.copyrightInfo.level}
                      </div>
                      <div className="text-gray-400 truncate" title={result.copyrightInfo.responsibleCompany}>
                        {result.copyrightInfo.responsibleCompany}
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-4 py-3 text-center">
                    <div className="text-xs">
                      {result.relevanceBreakdown.nameMatch.type === 'exact' && '🎯 Exact'}
                      {result.relevanceBreakdown.nameMatch.type === 'starts_with' && '▶️ Starts'}
                      {result.relevanceBreakdown.nameMatch.type === 'contains' && '📍 Contains'}
                      {result.relevanceBreakdown.nameMatch.type === 'word_match' && '🔤 Words'}
                      {result.relevanceBreakdown.nameMatch.type === 'no_match' && '❌ None'}
                    </div>
                    {result.relevanceBreakdown.summaryMatch.hasMatch && (
                      <div className="text-xs text-gray-400 mt-1">📝 Summary</div>
                    )}
                  </td>
                  
                  <td className="px-4 py-3 text-center">
                    <div className="space-y-1 text-xs">
                      {/* Exact match but low position */}
                      {result.relevanceBreakdown.nameMatch.type === 'exact' && result.finalPosition > 3 && (
                        <div className="text-orange-400">🚨 Exact → Low Rank</div>
                      )}
                      
                      {/* High relevance but filtered */}
                      {result.rankingFactors.relevanceScore > 0.5 && result.wasFiltered && (
                        <div className="text-red-400">🚨 High Rel → Filtered</div>
                      )}
                      
                      {/* Low relevance but high position */}
                      {result.rankingFactors.relevanceScore < 0.2 && result.finalPosition !== -1 && result.finalPosition < 10 && (
                        <div className="text-yellow-400">⚠️ Low Rel → High Rank</div>
                      )}
                      
                      {/* Quality issues */}
                      {result.qualityMetrics.completenessScore < 0.4 && (
                        <div className="text-gray-400">📉 Low Quality</div>
                      )}
                    </div>
                  </td>
                  
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => setSelectedResult(result)}
                      className="px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs"
                    >
                      🔍 Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detailed Result Modal */}
      {selectedResult && (
        <DetailedResultModal 
          result={selectedResult} 
          query={analysis.query}
          onClose={() => setSelectedResult(null)} 
        />
      )}
      
      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-800 p-4 rounded-lg">
          <h4 className="font-semibold mb-2 text-yellow-400">⚠️ Sorting Issues</h4>
          <div className="space-y-2 text-sm">
            {analysis.sortingInsights.sortingProblems.slice(0, 3).map((problem, idx) => (
              <div key={idx} className="text-gray-300">{problem}</div>
            ))}
          </div>
        </div>
        
        <div className="bg-gray-800 p-4 rounded-lg">
          <h4 className="font-semibold mb-2 text-red-400">🚫 Filtering Issues</h4>
          <div className="space-y-2 text-sm">
            <div>Most common: {analysis.filteringInsights.mostCommonFilterReason}</div>
            <div>Filtered: {analysis.filteredCount}/{analysis.totalResults}</div>
          </div>
        </div>
        
        <div className="bg-gray-800 p-4 rounded-lg">
          <h4 className="font-semibold mb-2 text-blue-400">💡 Recommendations</h4>
          <div className="space-y-2 text-sm">
            {analysis.sortingInsights.recommendations.slice(0, 2).map((rec, idx) => (
              <div key={idx} className="text-gray-300">{rec}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Detailed Result Modal Component
const DetailedResultModal: React.FC<{
  result: ResultAnalysis;
  query: string;
  onClose: () => void;
}> = ({ result, query, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold">{result.gameName}</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-2xl"
            >
              ×
            </button>
          </div>
          
          {/* Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-gray-700 p-4 rounded">
              <h4 className="font-semibold mb-2">Position & Source</h4>
              <div className="space-y-2">
                <div>Final Rank: {result.finalPosition === -1 ? '❌ Filtered' : `#${result.finalPosition + 1}`}</div>
                <div>Source: {result.source === 'igdb' ? '🌐 IGDB' : '💾 Database'}</div>
                <div>Status: {result.wasFiltered ? '❌ Filtered Out' : '✅ Included'}</div>
              </div>
            </div>
            
            <div className="bg-gray-700 p-4 rounded">
              <h4 className="font-semibold mb-2">Scoring Breakdown</h4>
              <div className="space-y-2 text-sm">
                <div>Relevance: {result.rankingFactors.relevanceScore.toFixed(3)}</div>
                <div>Quality: {result.qualityMetrics.completenessScore.toFixed(3)}</div>
                <div>Popularity: {result.rankingFactors.popularityScore.toFixed(3)}</div>
                <div>Total: {result.totalSortingScore.toFixed(3)}</div>
              </div>
            </div>
            
            <div className="bg-gray-700 p-4 rounded">
              <h4 className="font-semibold mb-2">Match Analysis</h4>
              <div className="space-y-2 text-sm">
                <div>Name: {result.relevanceBreakdown.nameMatch.type.replace('_', ' ')}</div>
                <div>Score: {result.relevanceBreakdown.nameMatch.score.toFixed(3)}</div>
                <div>Summary: {result.relevanceBreakdown.summaryMatch.hasMatch ? '✅' : '❌'}</div>
                <div>Genre: {result.relevanceBreakdown.genreMatch.matches.length > 0 ? '✅' : '❌'}</div>
              </div>
            </div>
          </div>

          {/* Manual Flags & Copyright Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-gray-700 p-4 rounded">
              <h4 className="font-semibold mb-2">🏷️ Manual Flag Status</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span>Status:</span>
                  {result.flagStatus.hasGreenlight && (
                    <span className="text-green-400 font-semibold">✅ GREENLIGHT</span>
                  )}
                  {result.flagStatus.hasRedlight && (
                    <span className="text-red-400 font-semibold">🚫 REDLIGHT</span>
                  )}
                  {!result.flagStatus.overrideActive && (
                    <span className="text-gray-400">⚪ Auto (No Override)</span>
                  )}
                </div>
                {result.flagStatus.flagReason && (
                  <div>Reason: {result.flagStatus.flagReason}</div>
                )}
                {result.flagStatus.flaggedAt && (
                  <div>Flagged: {new Date(result.flagStatus.flaggedAt).toLocaleDateString()}</div>
                )}
                {result.flagStatus.flaggedBy && (
                  <div>By: {result.flagStatus.flaggedBy}</div>
                )}
              </div>
            </div>
            
            <div className="bg-gray-700 p-4 rounded">
              <h4 className="font-semibold mb-2">©️ Copyright Protection</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span>Level:</span>
                  <span className={`font-semibold ${
                    result.copyrightInfo.level === 'BLOCK_ALL' ? 'text-red-600' :
                    result.copyrightInfo.level === 'AGGRESSIVE' ? 'text-red-400' :
                    result.copyrightInfo.level === 'MODERATE' ? 'text-yellow-400' :
                    'text-green-400'
                  }`}>
                    {result.copyrightInfo.level}
                  </span>
                </div>
                <div>Company: {result.copyrightInfo.responsibleCompany}</div>
                <div className="text-gray-300">{result.copyrightInfo.levelDescription}</div>
                {result.copyrightInfo.policyReason && (
                  <div className="text-xs text-gray-400 mt-2">{result.copyrightInfo.policyReason}</div>
                )}
              </div>
            </div>
          </div>

          {/* Filtering Decisions */}
          <div className="mb-6">
            <h4 className="font-semibold mb-3">🛡️ Filtering Decisions</h4>
            <div className="space-y-3">
              {result.filteringDecisions.map((decision, idx) => (
                <div 
                  key={idx} 
                  className={`p-3 rounded border-l-4 ${
                    decision.passed 
                      ? 'bg-green-900/30 border-green-500' 
                      : 'bg-red-900/30 border-red-500'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium capitalize">
                      {decision.stage.replace('_', ' ')} Filter
                    </span>
                    <span className={decision.passed ? 'text-green-400' : 'text-red-400'}>
                      {decision.passed ? '✅ PASS' : '❌ FAIL'}
                    </span>
                  </div>
                  <div className="text-sm text-gray-300 mt-1">
                    {decision.reason}
                  </div>
                  {decision.score && (
                    <div className="text-xs text-gray-400 mt-1">
                      Score: {decision.score.toFixed(3)}
                      {decision.threshold && ` (threshold: ${decision.threshold})`}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Sorting Components */}
          <div className="mb-6">
            <h4 className="font-semibold mb-3">📊 Sorting Components</h4>
            <div className="space-y-2">
              {result.sortingComponents.map((component, idx) => (
                <div key={idx} className="bg-gray-700 p-3 rounded">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{component.component}</span>
                    <span className="font-mono text-purple-400">
                      {component.contribution.toFixed(3)}
                    </span>
                  </div>
                  <div className="text-sm text-gray-300 mt-1">
                    {component.explanation}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    Raw Score: {component.score.toFixed(3)} × Weight: {component.weight} = {component.contribution.toFixed(3)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quality Metrics */}
          <div>
            <h4 className="font-semibold mb-3">📋 Quality Metrics</h4>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { label: 'Description', value: result.qualityMetrics.hasDescription, icon: '📝' },
                { label: 'Cover Image', value: result.qualityMetrics.hasCover, icon: '🖼️' },
                { label: 'Genres', value: result.qualityMetrics.hasGenres, icon: '🎮' },
                { label: 'Platforms', value: result.qualityMetrics.hasPlatforms, icon: '💻' },
                { label: 'Rating', value: result.qualityMetrics.hasRating, icon: '⭐' }
              ].map((metric, idx) => (
                <div key={idx} className="bg-gray-700 p-3 rounded text-center">
                  <div className="text-2xl mb-1">{metric.icon}</div>
                  <div className="text-sm">{metric.label}</div>
                  <div className={`font-bold ${metric.value ? 'text-green-400' : 'text-red-400'}`}>
                    {metric.value ? '✅' : '❌'}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 text-center">
              <span className="text-lg font-semibold">
                Completeness: {(result.qualityMetrics.completenessScore * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchResultsTable;