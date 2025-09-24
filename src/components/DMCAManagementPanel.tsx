/**
 * DMCA Management Panel
 * 
 * Provides bulk operations for redlighting games from specific companies or mod categories
 * to handle DMCA takedown requests efficiently.
 */

import React, { useState, useEffect } from 'react';
import {
  Building,
  Zap,
  AlertTriangle,
  Search,
  Eye,
  EyeOff,
  Shield,
  Ban,
  Check,
  X,
  Download,
  Trash2,
  FileText
} from 'lucide-react';
import {
  dmcaManagementService,
  type CompanyAnalysis,
  type BulkFlagRequest,
  type BulkFlagResult
} from '../services/dmcaManagementService';

export const DMCAManagementPanel: React.FC = () => {
  const [companyAnalysis, setCompanyAnalysis] = useState<CompanyAnalysis | null>(null);
  const [flagStatistics, setFlagStatistics] = useState<any>(null);
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [companyGames, setCompanyGames] = useState<any[]>([]);
  const [modGames, setModGames] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [bulkRequest, setBulkRequest] = useState<BulkFlagRequest>({
    type: 'company',
    target: '',
    flagType: 'redlight',
    reason: '',
    dryRun: true
  });
  const [bulkResult, setBulkResult] = useState<BulkFlagResult | null>(null);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'companies' | 'mods' | 'bulk'>('overview');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load company analysis
      const companyResult = await dmcaManagementService.getCompanyAnalysis();
      if (companyResult.success) {
        setCompanyAnalysis(companyResult.data!);
      }

      // Load flag statistics
      const statsResult = await dmcaManagementService.getFlagStatistics();
      if (statsResult.success) {
        setFlagStatistics(statsResult.data!);
      }

      // Load mod games
      const modResult = await dmcaManagementService.getModGames();
      if (modResult.success) {
        setModGames(modResult.data || []);
      }
    } catch (error) {
      console.error('Failed to load DMCA data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompanySelect = async (company: string, type: 'publisher' | 'developer') => {
    setIsLoading(true);
    try {
      const result = await dmcaManagementService.getCompanyGames(company, type);
      if (result.success) {
        setCompanyGames(result.data || []);
        setSelectedCompany(`${company} (${type === 'publisher' ? 'Publisher' : 'Developer'})`);
        setBulkRequest(prev => ({
          ...prev,
          target: `${company} (${type === 'publisher' ? 'Publisher' : 'Developer'})`
        }));
      }
    } catch (error) {
      console.error('Failed to load company games:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkOperation = async () => {
    if (!bulkRequest.target || !bulkRequest.reason.trim()) {
      alert('Please select a target and provide a reason');
      return;
    }

    // Warn about large operations
    if (!bulkRequest.dryRun && selectedCompany && companyGames.length > 100) {
      const confirmed = window.confirm(
        `⚠️ This will affect ${companyGames.length} games. This operation may take several minutes and cannot be undone. Are you sure you want to continue?`
      );
      if (!confirmed) return;
    }

    setIsLoading(true);
    setBulkResult(null); // Clear previous results
    
    try {
      console.log(`🚀 Starting bulk operation: ${bulkRequest.type} - ${bulkRequest.target}`);
      
      const result = await dmcaManagementService.bulkFlag(bulkRequest);
      setBulkResult(result);
      
      if (result.success) {
        if (bulkRequest.dryRun) {
          console.log(`✅ Dry run completed - would affect ${result.affectedGames.length} games`);
        } else {
          // Reload data after successful operation
          await loadData();
          alert(`✅ Bulk operation completed:\n- ${result.processedCount} games processed\n- ${result.errorCount} errors`);
        }
      } else {
        alert(`❌ Operation failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Bulk operation failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`❌ Bulk operation failed: ${errorMessage}`);
      setBulkResult({
        success: false,
        processedCount: 0,
        skippedCount: 0,
        errorCount: 1,
        affectedGames: [],
        error: errorMessage
      });
    } finally {
      setIsLoading(false);
    }
  };

  const exportResults = () => {
    if (!bulkResult || !bulkResult.affectedGames.length) return;

    const csv = [
      'Game ID,Game Name,Action,Reason',
      ...bulkResult.affectedGames.map(game => 
        `${game.id},"${game.name}","${game.action}","${game.reason || ''}"`
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dmca-operation-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredPublishers = companyAnalysis?.publishers.filter(pub =>
    pub.company.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const filteredDevelopers = companyAnalysis?.developers.filter(dev =>
    dev.company.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const filteredModGames = modGames.filter(game =>
    game.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gray-800 p-6 rounded-lg">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="h-6 w-6 text-red-400" />
          <h2 className="text-xl font-bold">DMCA Management Panel</h2>
        </div>
        <p className="text-gray-300 mb-4">
          Bulk operations for managing game flags in response to DMCA takedown requests. 
          Use this panel to redlight entire company catalogs or mod collections efficiently.
        </p>
        <div className="bg-red-900/20 border border-red-500/30 rounded p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-red-300">Important Notice</h4>
              <p className="text-red-200 text-sm mt-1">
                These operations will permanently flag games and affect search results. 
                Always test with "Dry Run" mode first and maintain proper documentation.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Overview */}
      {flagStatistics && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">Total Games</span>
              <Building className="h-4 w-4 text-gray-400" />
            </div>
            <div className="text-2xl font-bold">{flagStatistics.totalGames?.toLocaleString()}</div>
          </div>
          
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">Redlighted</span>
              <Ban className="h-4 w-4 text-red-400" />
            </div>
            <div className="text-2xl font-bold text-red-400">{flagStatistics.redlightCount?.toLocaleString()}</div>
          </div>

          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">Greenlighted</span>
              <Check className="h-4 w-4 text-green-400" />
            </div>
            <div className="text-2xl font-bold text-green-400">{flagStatistics.greenlightCount?.toLocaleString()}</div>
          </div>

          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">Unflagged</span>
              <Eye className="h-4 w-4 text-gray-400" />
            </div>
            <div className="text-2xl font-bold">{flagStatistics.unflaggedCount?.toLocaleString()}</div>
          </div>

          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">Total Mods</span>
              <Zap className="h-4 w-4 text-purple-400" />
            </div>
            <div className="text-2xl font-bold text-purple-400">{flagStatistics.modGamesCount?.toLocaleString()}</div>
          </div>

          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">Redlighted Mods</span>
              <Ban className="h-4 w-4 text-red-400" />
            </div>
            <div className="text-2xl font-bold text-red-400">{flagStatistics.redlightedModsCount?.toLocaleString()}</div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <nav className="flex space-x-4">
        {(['overview', 'companies', 'mods', 'bulk'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setSelectedTab(tab)}
            className={`px-4 py-2 rounded font-medium ${
              selectedTab === tab
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {tab === 'overview' && '📊 Overview'}
            {tab === 'companies' && '🏢 Companies'}
            {tab === 'mods' && '⚡ Mods'}
            {tab === 'bulk' && '🔧 Bulk Operations'}
          </button>
        ))}
      </nav>

      {/* Tab Content */}
      {selectedTab === 'overview' && companyAnalysis && (
        <div className="space-y-6">
          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-lg font-bold mb-4">Database Overview</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400">{companyAnalysis.publishers.length}</div>
                <div className="text-gray-400 text-sm">Publishers</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">{companyAnalysis.developers.length}</div>
                <div className="text-gray-400 text-sm">Developers</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-400">{companyAnalysis.totalCompanies}</div>
                <div className="text-gray-400 text-sm">Total Companies</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-400">{companyAnalysis.totalGames}</div>
                <div className="text-gray-400 text-sm">Total Games</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-800 p-6 rounded-lg">
              <h4 className="font-semibold mb-4">Top Publishers</h4>
              <div className="space-y-2">
                {companyAnalysis.publishers.slice(0, 10).map((pub, index) => (
                  <div key={pub.company} className="flex justify-between items-center p-2 bg-gray-700 rounded">
                    <span className="font-medium">{pub.company}</span>
                    <span className="text-blue-400 font-mono">{pub.gameCount} games</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-800 p-6 rounded-lg">
              <h4 className="font-semibold mb-4">Top Developers</h4>
              <div className="space-y-2">
                {companyAnalysis.developers.slice(0, 10).map((dev, index) => (
                  <div key={dev.company} className="flex justify-between items-center p-2 bg-gray-700 rounded">
                    <span className="font-medium">{dev.company}</span>
                    <span className="text-green-400 font-mono">{dev.gameCount} games</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedTab === 'companies' && (
        <div className="space-y-4">
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="flex gap-4 mb-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search companies..."
                className="flex-1 p-3 bg-gray-700 border border-gray-600 rounded text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-800 p-6 rounded-lg">
              <h4 className="font-semibold mb-4">Publishers ({filteredPublishers.length})</h4>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredPublishers.map((pub) => (
                  <div
                    key={pub.company}
                    className="flex justify-between items-center p-3 bg-gray-700 rounded hover:bg-gray-600 cursor-pointer"
                    onClick={() => handleCompanySelect(pub.company, 'publisher')}
                  >
                    <div>
                      <div className="font-medium">{pub.company}</div>
                      <div className="text-xs text-gray-400">
                        {pub.sampleGames.slice(0, 2).join(', ')}
                        {pub.sampleGames.length > 2 && '...'}
                      </div>
                    </div>
                    <span className="text-blue-400 font-mono">{pub.gameCount}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-800 p-6 rounded-lg">
              <h4 className="font-semibold mb-4">Developers ({filteredDevelopers.length})</h4>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredDevelopers.map((dev) => (
                  <div
                    key={dev.company}
                    className="flex justify-between items-center p-3 bg-gray-700 rounded hover:bg-gray-600 cursor-pointer"
                    onClick={() => handleCompanySelect(dev.company, 'developer')}
                  >
                    <div>
                      <div className="font-medium">{dev.company}</div>
                      <div className="text-xs text-gray-400">
                        {dev.sampleGames.slice(0, 2).join(', ')}
                        {dev.sampleGames.length > 2 && '...'}
                      </div>
                    </div>
                    <span className="text-green-400 font-mono">{dev.gameCount}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Selected Company Games */}
          {selectedCompany && companyGames.length > 0 && (
            <div className="bg-gray-800 p-6 rounded-lg">
              <h4 className="font-semibold mb-4">Games from {selectedCompany} ({companyGames.length})</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                {companyGames.map((game) => (
                  <div key={game.id} className="flex items-center justify-between p-2 bg-gray-700 rounded text-sm">
                    <span className="truncate flex-1">{game.name}</span>
                    <div className="flex gap-1 ml-2">
                      {game.greenlight_flag && <Check className="h-4 w-4 text-green-400" />}
                      {game.redlight_flag && <Ban className="h-4 w-4 text-red-400" />}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {selectedTab === 'mods' && (
        <div className="space-y-4">
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="flex gap-4 mb-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search mod games..."
                className="flex-1 p-3 bg-gray-700 border border-gray-600 rounded text-white"
              />
            </div>
          </div>

          <div className="bg-gray-800 p-6 rounded-lg">
            <h4 className="font-semibold mb-4">Mod Games ({filteredModGames.length})</h4>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredModGames.map((game) => (
                <div key={game.id} className="flex items-center justify-between p-3 bg-gray-700 rounded">
                  <div className="flex-1">
                    <div className="font-medium">{game.name}</div>
                    <div className="text-xs text-gray-400">
                      {game.developer && `Dev: ${game.developer}`}
                      {game.developer && game.publisher && ' | '}
                      {game.publisher && `Pub: ${game.publisher}`}
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    {game.greenlight_flag && <Check className="h-4 w-4 text-green-400" />}
                    {game.redlight_flag && <Ban className="h-4 w-4 text-red-400" />}
                    {!game.greenlight_flag && !game.redlight_flag && <Eye className="h-4 w-4 text-gray-400" />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {selectedTab === 'bulk' && (
        <div className="space-y-6">
          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-lg font-bold mb-4">Bulk Flag Operations</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Operation Type</label>
                  <select
                    value={bulkRequest.type}
                    onChange={(e) => setBulkRequest(prev => ({ ...prev, type: e.target.value as any }))}
                    className="w-full p-3 bg-gray-700 border border-gray-600 rounded text-white"
                  >
                    <option value="company">Company (Publisher/Developer)</option>
                    <option value="mods">All Mod Games</option>
                  </select>
                </div>

                {bulkRequest.type === 'company' && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Company Target</label>
                    <input
                      type="text"
                      value={bulkRequest.target}
                      onChange={(e) => setBulkRequest(prev => ({ ...prev, target: e.target.value }))}
                      placeholder="e.g., Nintendo (Publisher) or Valve (Developer)"
                      className="w-full p-3 bg-gray-700 border border-gray-600 rounded text-white"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Format: "Company Name (Publisher)" or "Company Name (Developer)"
                    </p>
                  </div>
                )}

                {bulkRequest.type === 'mods' && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Target</label>
                    <input
                      type="text"
                      value="All Mod Games (Category 5)"
                      disabled
                      className="w-full p-3 bg-gray-600 border border-gray-600 rounded text-gray-300"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-2">Action</label>
                  <select
                    value={bulkRequest.flagType}
                    onChange={(e) => setBulkRequest(prev => ({ ...prev, flagType: e.target.value as any }))}
                    className="w-full p-3 bg-gray-700 border border-gray-600 rounded text-white"
                  >
                    <option value="redlight">Redlight (Hide from search)</option>
                    <option value="clear">Clear Flags (Restore visibility)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Reason</label>
                  <textarea
                    value={bulkRequest.reason}
                    onChange={(e) => setBulkRequest(prev => ({ ...prev, reason: e.target.value }))}
                    placeholder="DMCA takedown request from [Company], Case #[Number], Date: [Date]"
                    rows={3}
                    className="w-full p-3 bg-gray-700 border border-gray-600 rounded text-white"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="dryRun"
                    checked={bulkRequest.dryRun}
                    onChange={(e) => setBulkRequest(prev => ({ ...prev, dryRun: e.target.checked }))}
                    className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded"
                  />
                  <label htmlFor="dryRun" className="text-sm font-medium">
                    Dry Run (Preview only, don't make changes)
                  </label>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-yellow-900/20 border border-yellow-500/30 rounded p-4">
                  <h4 className="font-semibold text-yellow-300 mb-2">Operation Preview</h4>
                  <div className="text-sm space-y-1">
                    <div><span className="text-gray-400">Type:</span> {bulkRequest.type}</div>
                    <div><span className="text-gray-400">Target:</span> {bulkRequest.target || 'Not specified'}</div>
                    <div><span className="text-gray-400">Action:</span> {bulkRequest.flagType}</div>
                    <div><span className="text-gray-400">Mode:</span> {bulkRequest.dryRun ? 'Dry Run' : 'Live Operation'}</div>
                    {selectedCompany && companyGames.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-yellow-500/20">
                        <div><span className="text-gray-400">Games Found:</span> <span className="font-mono text-yellow-300">{companyGames.length}</span></div>
                        {companyGames.length > 100 && (
                          <div className="text-orange-300 text-xs mt-1">⚠️ Large operation - will be processed in chunks</div>
                        )}
                      </div>
                    )}
                    {bulkRequest.type === 'mods' && modGames.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-yellow-500/20">
                        <div><span className="text-gray-400">Mod Games:</span> <span className="font-mono text-yellow-300">{modGames.length}</span></div>
                        {modGames.length > 100 && (
                          <div className="text-orange-300 text-xs mt-1">⚠️ Large operation - will be processed in chunks</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={handleBulkOperation}
                  disabled={isLoading || !bulkRequest.target || !bulkRequest.reason.trim()}
                  className={`w-full py-3 px-4 rounded font-medium ${
                    bulkRequest.dryRun 
                      ? 'bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600'
                      : 'bg-red-600 hover:bg-red-700 disabled:bg-gray-600'
                  } disabled:cursor-not-allowed`}
                >
                  {isLoading ? (
                    bulkRequest.dryRun ? '🔄 Analyzing...' : '🔄 Processing (check console for progress)...'
                  ) : (
                    bulkRequest.dryRun ? '👁️ Preview Operation' : '⚠️ Execute Operation'
                  )}
                </button>

                {isLoading && !bulkRequest.dryRun && (
                  <div className="bg-blue-900/20 border border-blue-500/30 rounded p-3">
                    <div className="text-blue-300 text-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
                        <span>Operation in progress...</span>
                      </div>
                      <div className="text-xs text-blue-200">
                        • Large operations are processed in chunks<br/>
                        • Check the browser console for detailed progress<br/>
                        • Do not close this page until completion
                      </div>
                    </div>
                  </div>
                )}

                {bulkResult && (
                  <div className="bg-gray-700 p-4 rounded">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">Operation Result</h4>
                      {bulkResult.affectedGames.length > 0 && (
                        <button
                          onClick={exportResults}
                          className="flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm"
                        >
                          <Download className="h-4 w-4" />
                          Export CSV
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>Processed: <span className="font-mono text-green-400">{bulkResult.processedCount}</span></div>
                      <div>Errors: <span className="font-mono text-red-400">{bulkResult.errorCount}</span></div>
                    </div>
                    {bulkResult.error && (
                      <div className="mt-2 p-2 bg-red-900/20 border border-red-500/30 rounded text-red-300 text-sm">
                        {bulkResult.error}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Results Preview */}
          {bulkResult && bulkResult.affectedGames.length > 0 && (
            <div className="bg-gray-800 p-6 rounded-lg">
              <h4 className="font-semibold mb-4">
                {bulkRequest.dryRun ? 'Preview Results' : 'Operation Results'} 
                ({bulkResult.affectedGames.length} games)
              </h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {bulkResult.affectedGames.slice(0, 50).map((game, index) => (
                  <div key={`${game.id}-${index}`} className="flex items-center justify-between p-2 bg-gray-700 rounded text-sm">
                    <span className="truncate flex-1">{game.name}</span>
                    <div className="flex items-center gap-2 ml-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        game.action === 'flagged' ? 'bg-red-900 text-red-300' :
                        game.action === 'cleared' ? 'bg-green-900 text-green-300' :
                        game.action === 'error' ? 'bg-red-900 text-red-200' :
                        'bg-gray-600 text-gray-300'
                      }`}>
                        {game.action}
                      </span>
                    </div>
                  </div>
                ))}
                {bulkResult.affectedGames.length > 50 && (
                  <div className="text-center text-gray-400 text-sm py-2">
                    ... and {bulkResult.affectedGames.length - 50} more games
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};