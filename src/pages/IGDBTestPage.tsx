import React, { useState } from 'react';
import { GameSearch } from '../components/GameSearch';
import { IGDBDebug } from '../components/IGDBDebug';
import { Game } from '../services/igdbService';
import { useNavigate } from 'react-router-dom';
import { 
  TestTube, 
  Search, 
  Bug, 
  Eye, 
  EyeOff, 
  Gamepad2,
  ArrowLeft,
  ExternalLink
} from 'lucide-react';

export const IGDBTestPage: React.FC = () => {
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [showDebugPanel, setShowDebugPanel] = useState(true);
  const navigate = useNavigate();

  const handleGameSelect = (game: Game) => {
    setSelectedGame(game);
    console.log('🎮 Game selected:', game);
  };

  const exampleSearchTerms = [
    'zelda',
    'mario',
    'witcher',
    'cyberpunk',
    'god of war',
    'minecraft',
    'fortnite',
    'among us',
    'hollow knight',
    'hades'
  ];

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              
              <div className="flex items-center gap-3">
                <TestTube className="h-8 w-8 text-purple-400" />
                <div>
                  <h1 className="text-2xl font-bold text-white">IGDB Integration Test</h1>
                  <p className="text-gray-400 text-sm">Test and debug the IGDB API integration</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowDebugPanel(!showDebugPanel)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                {showDebugPanel ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {showDebugPanel ? 'Hide' : 'Show'} Debug Panel
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Development Notice */}
        {import.meta.env.DEV && (
          <div className="mb-6 p-4 bg-blue-900 bg-opacity-50 border border-blue-700 rounded-lg">
            <div className="flex items-center gap-3">
              <Bug className="h-5 w-5 text-blue-400" />
              <div>
                <h3 className="text-blue-400 font-medium">Development Mode</h3>
                <p className="text-blue-300 text-sm">
                  This page is only available in development. Use it to test the IGDB integration before deploying.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Game Search Section */}
          <div className="space-y-6">
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Search className="h-5 w-5" />
                Game Search Test
              </h2>
              
              <p className="text-gray-400 mb-6">
                Test the GameSearch component with real IGDB API calls. Try different search terms to see how the integration works.
              </p>

              {/* Example Search Terms */}
              <div className="mb-6">
                <h3 className="text-white font-medium mb-3">Quick Test Searches:</h3>
                <div className="flex flex-wrap gap-2">
                  {exampleSearchTerms.map((term) => (
                    <button
                      key={term}
                      onClick={() => {
                        // Trigger search by dispatching input event
                        const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
                        if (searchInput) {
                          searchInput.value = term;
                          searchInput.dispatchEvent(new Event('input', { bubbles: true }));
                        }
                      }}
                      className="px-3 py-1 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors text-sm"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>

              {/* Game Search Component */}
              <GameSearch
                onGameSelect={handleGameSelect}
                placeholder="Search for games to test IGDB integration..."
                showViewToggle={true}
                maxResults={20}
              />
            </div>

            {/* Selected Game Display */}
            {selectedGame && (
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Gamepad2 className="h-5 w-5" />
                  Selected Game Details
                </h3>
                
                <div className="flex gap-4">
                  {selectedGame.coverImage && (
                    <img
                      src={selectedGame.coverImage}
                      alt={selectedGame.title}
                      className="w-24 h-32 object-cover rounded"
                    />
                  )}
                  
                  <div className="flex-1">
                    <h4 className="text-white font-semibold text-lg mb-2">{selectedGame.title}</h4>
                    
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">ID:</span>
                        <span className="text-white">{selectedGame.id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Genre:</span>
                        <span className="text-white">{selectedGame.genre || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Release Date:</span>
                        <span className="text-white">{selectedGame.releaseDate || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Rating:</span>
                        <span className="text-white">{selectedGame.rating || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Developer:</span>
                        <span className="text-white">{selectedGame.developer || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Publisher:</span>
                        <span className="text-white">{selectedGame.publisher || 'N/A'}</span>
                      </div>
                    </div>

                    {selectedGame.platforms && selectedGame.platforms.length > 0 && (
                      <div className="mt-3">
                        <span className="text-gray-400 text-sm">Platforms:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedGame.platforms.map((platform, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded"
                            >
                              {platform}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedGame.description && (
                      <div className="mt-3">
                        <span className="text-gray-400 text-sm">Description:</span>
                        <p className="text-gray-300 text-sm mt-1 line-clamp-3">
                          {selectedGame.description}
                        </p>
                      </div>
                    )}

                    <button
                      onClick={() => navigate(`/game/${selectedGame.id}`)}
                      className="mt-4 flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
                    >
                      <ExternalLink className="h-4 w-4" />
                      View Game Page
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Debug Panel */}
          {showDebugPanel && (
            <div className="space-y-6">
              <IGDBDebug />
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">Testing Instructions</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-white font-medium mb-3">Local Development</h3>
              <ol className="list-decimal list-inside space-y-2 text-gray-300 text-sm">
                <li>Install Netlify CLI: <code className="bg-gray-700 px-2 py-1 rounded text-purple-400">npm install -g netlify-cli</code></li>
                <li>Run: <code className="bg-gray-700 px-2 py-1 rounded text-purple-400">netlify dev</code></li>
                <li>Open: <code className="bg-gray-700 px-2 py-1 rounded text-purple-400">http://localhost:8888</code></li>
                <li>Check function logs in the terminal</li>
              </ol>
            </div>
            
            <div>
              <h3 className="text-white font-medium mb-3">Environment Setup</h3>
              <ol className="list-decimal list-inside space-y-2 text-gray-300 text-sm">
                <li>Create <code className="bg-gray-700 px-2 py-1 rounded text-purple-400">.env</code> file in project root</li>
                <li>Add your Twitch Client ID and Access Token</li>
                <li>Get credentials from <a href="https://dev.twitch.tv/console/apps" className="text-purple-400 hover:text-purple-300">Twitch Developer Console</a></li>
                <li>Restart the dev server after adding environment variables</li>
              </ol>
            </div>
          </div>

          <div className="mt-6 p-4 bg-gray-700 rounded-lg">
            <h4 className="text-white font-medium mb-2">Debugging Tips</h4>
            <ul className="list-disc list-inside space-y-1 text-gray-300 text-sm">
              <li>Use the Debug Panel to test individual API calls</li>
              <li>Check browser Network tab for function requests</li>
              <li>Look for console logs in browser developer tools</li>
              <li>Verify environment variables are loaded correctly</li>
              <li>Test with different search terms to ensure API is working</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};