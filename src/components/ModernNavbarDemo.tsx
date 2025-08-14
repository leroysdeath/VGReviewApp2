import React, { useState } from 'react';
import { ModernNavbar } from './ModernNavbar';
import { LoginModal } from './LoginModal';

export const ModernNavbarDemo: React.FC = () => {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<{ name: string; avatar?: string } | undefined>();

  const handleLogin = () => {
    setIsLoginModalOpen(true);
  };

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    setUser({
      name: 'John Gamer',
      avatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150'
    });
    setIsLoginModalOpen(false);
  };

  const toggleAuthState = () => {
    setIsAuthenticated(!isAuthenticated);
    if (!isAuthenticated) {
      setUser({
        name: 'John Gamer',
        avatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150'
      });
    } else {
      setUser(undefined);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <ModernNavbar
        onLoginClick={handleLogin}
        isAuthenticated={isAuthenticated}
        user={user}
      />
      
      {/* Demo Content */}
      <div className="pt-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gray-800 rounded-lg p-8 mb-8">
            <h1 className="text-3xl font-bold text-white mb-4">Modern Gaming Navbar Demo</h1>
            <p className="text-gray-300 mb-6">
              This is a demonstration of the modern navigation header component with all the requested features.
            </p>
            
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={toggleAuthState}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  {isAuthenticated ? 'Sign Out' : 'Sign In'} (Demo)
                </button>
                <span className="text-gray-400">
                  Current state: {isAuthenticated ? 'Authenticated' : 'Not authenticated'}
                </span>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6 mt-8">
                <div className="bg-gray-700 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-white mb-3">Features Included</h3>
                  <ul className="space-y-2 text-gray-300 text-sm">
                    <li>✅ Fixed header with backdrop blur</li>
                    <li>✅ Gaming-themed gradient logo</li>
                    <li>✅ Responsive navigation menu</li>
                    <li>✅ Advanced search bar with focus states</li>
                    <li>✅ User authentication states</li>
                    <li>✅ Mobile burger menu</li>
                    <li>✅ Dark theme with purple/blue accents</li>
                    <li>✅ Smooth transitions and hover effects</li>
                    <li>✅ TypeScript support</li>
                    <li>✅ React Router compatibility</li>
                  </ul>
                </div>
                
                <div className="bg-gray-700 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-white mb-3">Styling Details</h3>
                  <ul className="space-y-2 text-gray-300 text-sm">
                    <li>🎨 Background: bg-gray-900/80 with backdrop-blur-lg</li>
                    <li>🎨 Border: border-b border-gray-800</li>
                    <li>🎨 Logo: Gradient text purple to blue</li>
                    <li>🎨 Hover states with purple transitions</li>
                    <li>🎨 Search: bg-gray-800 with purple focus ring</li>
                    <li>🎨 Buttons: Purple theme with hover effects</li>
                    <li>🎨 Mobile-responsive design</li>
                    <li>🎨 Smooth animations throughout</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-8">
            <h2 className="text-2xl font-bold text-white mb-4">Usage Instructions</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 mb-4">
                To use this navbar in your app, simply import and use the ModernNavbar component:
              </p>
              <pre className="bg-gray-900 p-4 rounded-lg text-sm overflow-x-auto">
                <code className="text-green-400">{`import { ModernNavbar } from './components/ModernNavbar';

function App() {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  
  return (
    <div>
      <ModernNavbar
        onLoginClick={() => setIsLoginModalOpen(true)}
        isAuthenticated={user !== null}
        user={user}
      />
      {/* Your app content */}
    </div>
  );
}`}</code>
              </pre>
            </div>
          </div>
        </div>
      </div>

      <LoginModal 
        isOpen={isLoginModalOpen} 
        onClose={() => setIsLoginModalOpen(false)}
      />
    </div>
  );
};