import React, { useState, useEffect } from 'react';
import { ArrowLeft, List } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Terms of Service content as constant
const TERMS_CONTENT = `
# Terms of Service

## 1. Acceptance of Terms

By accessing and using GameVault ("the Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.

## 2. Description of Service

GameVault is a web-based platform that allows users to:
- Create accounts and user profiles
- Search and discover video games
- Write and publish game reviews
- Rate games on a scale of 1-10
- Interact with other users' reviews through comments
- Maintain personal game libraries and wishlists

## 3. User Accounts

### 3.1 Registration
To access certain features of the Service, you must register for an account by providing accurate, current, and complete information about yourself as prompted by the registration form.

### 3.2 Account Security
You are responsible for safeguarding the password and all activities that occur under your account. You agree to immediately notify us of any unauthorized use of your account.

### 3.3 Account Termination
We reserve the right to suspend or terminate your account at any time for violations of these Terms of Service.

## 4. User Content and Conduct

### 4.1 Content Guidelines
Users may post reviews, comments, and other content ("User Content"). You agree that your User Content will not:
- Contain harmful, threatening, abusive, harassing, defamatory, vulgar, obscene, or otherwise objectionable material
- Infringe any patent, trademark, trade secret, copyright, or other proprietary rights
- Contain spam, chain letters, or pyramid schemes
- Impersonate any person or entity or misrepresent your affiliation with any person or entity

### 4.2 Content Ownership
You retain ownership of your User Content, but by posting it on GameVault, you grant us a non-exclusive, worldwide, royalty-free license to use, display, and distribute your content in connection with the Service.

### 4.3 Content Moderation
We reserve the right to remove any User Content that violates these terms or is otherwise objectionable, at our sole discretion.

## 5. Intellectual Property

### 5.1 GameVault Property
The Service and its original content, features, and functionality are owned by GameVault and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.

### 5.2 Third-Party Content
Game information, images, and metadata are sourced from third-party providers including IGDB. All rights to such content remain with their respective owners.

## 6. Privacy and Data Protection

Your privacy is important to us. Please review our Privacy Policy, which also governs your use of the Service, to understand our practices.

## 7. Prohibited Uses

You may not use the Service:
- For any unlawful purpose or to solicit others to perform unlawful acts
- To violate any international, federal, provincial, or state regulations, rules, laws, or local ordinances
- To infringe upon or violate our intellectual property rights or the intellectual property rights of others
- To harass, abuse, insult, harm, defame, slander, disparage, intimidate, or discriminate
- To submit false or misleading information
- To upload viruses or other malicious code
- To spam, phish, pharm, pretext, spider, crawl, or scrape

## 8. Service Availability

### 8.1 Uptime
While we strive to maintain high availability, we do not guarantee that the Service will be available 100% of the time.

### 8.2 Maintenance
We may temporarily suspend the Service for maintenance, updates, or improvements.

## 9. Disclaimer of Warranties

The Service is provided on an "AS IS" and "AS AVAILABLE" basis. GameVault expressly disclaims all warranties of any kind, whether express or implied, including but not limited to the implied warranties of merchantability, fitness for a particular purpose, and non-infringement.

## 10. Limitation of Liability

In no event shall GameVault, its directors, employees, partners, agents, suppliers, or affiliates be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your use of the Service.

## 11. Indemnification

You agree to defend, indemnify, and hold harmless GameVault and its licensee and licensors, and their employees, contractors, agents, officers and directors, from and against any and all claims, damages, obligations, losses, liabilities, costs or debt, and expenses (including but not limited to attorney's fees).

## 12. Termination

We may terminate or suspend your account and bar access to the Service immediately, without prior notice or liability, under our sole discretion, for any reason whatsoever and without limitation, including but not limited to a breach of the Terms.

## 13. Governing Law

These Terms shall be interpreted and governed by the laws of the jurisdiction in which GameVault operates, without regard to its conflict of law provisions.

## 14. Changes to Terms

We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material, we will provide at least 30 days notice prior to any new terms taking effect.

## 15. Contact Information

If you have any questions about these Terms of Service, please contact us at legal@gamevault.com.

## 16. Severability

If any provision of these Terms is held to be unenforceable or invalid, such provision will be changed and interpreted to accomplish the objectives of such provision to the greatest extent possible under applicable law and the remaining provisions will continue in full force and effect.

## 17. Waiver

The failure of GameVault to enforce any right or provision of these Terms will not be considered a waiver of those rights.
`;

const LAST_UPDATED = "January 15, 2024";

interface TableOfContentsItem {
  id: string;
  title: string;
  level: number;
}

const TermsPage: React.FC = React.memo(() => {
  const navigate = useNavigate();
  const [tocItems, setTocItems] = useState<TableOfContentsItem[]>([]);
  const [activeSection, setActiveSection] = useState<string>('');
  const [showToc, setShowToc] = useState(false);

  // Parse content for table of contents
  useEffect(() => {
    const lines = TERMS_CONTENT.split('\n');
    const items: TableOfContentsItem[] = [];
    
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('#')) {
        const level = trimmed.match(/^#+/)?.[0].length || 1;
        const title = trimmed.replace(/^#+\s*/, '');
        const id = title.toLowerCase()
          .replace(/[^\w\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .trim();
        
        if (title && level <= 3) {
          items.push({ id, title, level });
        }
      }
    });
    
    setTocItems(items);
  }, []);

  // Handle scroll to section
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setShowToc(false);
    }
  };

  // Observe sections for active highlighting
  useEffect(() => {
    const observerOptions = {
      rootMargin: '-20% 0px -35% 0px',
      threshold: 0
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    }, observerOptions);

    // Observe all section elements
    tocItems.forEach(item => {
      const element = document.getElementById(item.id);
      if (element) {
        observer.observe(element);
      }
    });

    return () => observer.disconnect();
  }, [tocItems]);

  // Convert markdown content to JSX
  const renderContent = () => {
    const lines = TERMS_CONTENT.split('\n');
    const elements: JSX.Element[] = [];
    let currentIndex = 0;

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      
      if (!trimmed) {
        elements.push(<div key={index} className="mb-4" />);
        return;
      }

      // Headers
      if (trimmed.startsWith('#')) {
        const level = trimmed.match(/^#+/)?.[0].length || 1;
        const title = trimmed.replace(/^#+\s*/, '');
        const id = title.toLowerCase()
          .replace(/[^\w\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .trim();

        const headerClasses = {
          1: 'text-2xl font-bold text-white mb-6 mt-8',
          2: 'text-xl font-semibold text-white mb-4 mt-6',
          3: 'text-lg font-medium text-white mb-3 mt-4'
        }[level] || 'text-base font-medium text-white mb-2 mt-3';

        elements.push(
          <h1 key={index} id={id} className={headerClasses}>
            {title}
          </h1>
        );
      }
      // Regular paragraphs
      else {
        elements.push(
          <p key={index} className="text-gray-300 mb-4 leading-relaxed">
            {trimmed}
          </p>
        );
      }
    });

    return elements;
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
                <span>Back</span>
              </button>
              <div>
                <h1 className="text-2xl font-bold">Terms of Service</h1>
                <p className="text-gray-400 text-sm">Last updated: {LAST_UPDATED}</p>
              </div>
            </div>
            
            {/* Table of Contents Toggle */}
            <button
              onClick={() => setShowToc(!showToc)}
              className="lg:hidden flex items-center gap-2 px-3 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
            >
              <List className="h-4 w-4" />
              <span>Contents</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex gap-8">
          {/* Table of Contents - Desktop */}
          <div className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-8">
              <h3 className="text-lg font-semibold text-white mb-4">Contents</h3>
              <nav className="space-y-2">
                {tocItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => scrollToSection(item.id)}
                    className={`block w-full text-left px-3 py-2 rounded-lg transition-colors text-sm ${
                      activeSection === item.id
                        ? 'bg-purple-600 text-white'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800'
                    }`}
                    style={{ paddingLeft: `${item.level * 12}px` }}
                  >
                    {item.title}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Table of Contents - Mobile */}
          {showToc && (
            <div className="lg:hidden fixed inset-0 bg-black/50 z-50" onClick={() => setShowToc(false)}>
              <div className="absolute top-0 right-0 w-80 h-full bg-gray-800 p-6 overflow-y-auto">
                <h3 className="text-lg font-semibold text-white mb-4">Contents</h3>
                <nav className="space-y-2">
                  {tocItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => scrollToSection(item.id)}
                      className={`block w-full text-left px-3 py-2 rounded-lg transition-colors text-sm ${
                        activeSection === item.id
                          ? 'bg-purple-600 text-white'
                          : 'text-gray-400 hover:text-white hover:bg-gray-700'
                      }`}
                      style={{ paddingLeft: `${item.level * 12}px` }}
                    >
                      {item.title}
                    </button>
                  ))}
                </nav>
              </div>
            </div>
          )}

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <div className="prose prose-invert max-w-none">
              {renderContent()}
            </div>
            
            {/* Footer */}
            <div className="mt-12 pt-8 border-t border-gray-700">
              <p className="text-gray-400 text-sm">
                If you have any questions about these Terms of Service, please contact us at{' '}
                <a href="mailto:legal@gamevault.com" className="text-purple-400 hover:text-purple-300">
                  legal@gamevault.com
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

TermsPage.displayName = 'TermsPage';

export default TermsPage;