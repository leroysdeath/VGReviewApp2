import React, { useState, useEffect } from 'react';
import { ArrowLeft, List } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Terms of Service content as constant
const TERMS_CONTENT = `
# Terms of Service

*Last Updated: August 2025*

## 1. Acceptance of Terms

By accessing or using GameVault ("the Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, please do not use the Service.

## 2. User Accounts & Registration

### 2.1 Eligibility
You must be at least 16 years old to use GameVault. By creating an account, you represent that you meet this age requirement.

### 2.2 Account Information
You agree to provide accurate, current, and complete information during registration and to update such information to keep it accurate, current, and complete.

### 2.3 Account Security
You are responsible for safeguarding your account password and for any activities or actions under your account. You agree to notify us immediately of any unauthorized use of your account.

## 3. Acceptable Use Policy

### 3.1 Prohibited Content
You may not post, upload, or share content that:
- Contains pornographic or sexually explicit material
- Promotes or depicts violence, gore, or graphic content
- Harasses, threatens, or discriminates against individuals or groups
- Contains hate speech based on race, ethnicity, religion, gender, sexual orientation, disability, or other protected characteristics
- Violates any applicable laws or regulations

### 3.2 Profanity
While profanity is permitted on the platform, it must not be used to target, harass, or attack other users. Profanity used in a harassing manner will be treated as a violation of our harassment policy.

### 3.3 Consequences
Violations of this policy may result in content removal and account termination.

## 4. User-Generated Content

### 4.1 Your Content
You retain ownership of the reviews, ratings, comments, and other content you post on GameVault ("Your Content").

### 4.2 License to GameVault
By posting Your Content, you grant GameVault a non-exclusive, worldwide, royalty-free, perpetual license to use, display, reproduce, and distribute Your Content in connection with the Service.

### 4.3 Content Responsibility
You are solely responsible for Your Content and the consequences of posting it. You represent that you have all necessary rights to post Your Content.

## 5. Community Guidelines

### 5.1 Authentic Reviews
All reviews and ratings must be based on your genuine experience with games. Fake reviews, review manipulation, or incentivized reviews are prohibited.

### 5.2 No Spam
Do not post repetitive, irrelevant, or promotional content. Self-promotion should be limited and relevant to the gaming community.

### 5.3 No Impersonation
Do not impersonate other users, developers, or any other individuals or entities.

## 6. Intellectual Property

### 6.1 Respect for IP Rights
You must respect the intellectual property rights of game developers, publishers, and other content creators.

### 6.2 DMCA Compliance
We respond to notices of alleged copyright infringement that comply with the Digital Millennium Copyright Act. If you believe your copyright has been infringed, please contact us with the required information.

### 6.3 Game Data
Game information, images, and metadata are provided through third-party services (IGDB) and remain the property of their respective owners.

## 7. Privacy & Data Collection

Your use of GameVault is also governed by our Privacy Policy, which describes how we collect, use, and protect your information.

## 8. Third-Party Services

### 8.1 External Services
GameVault integrates with third-party services including IGDB for game data and Supabase for authentication and data storage. Your use of these services is subject to their respective terms and policies.

### 8.2 External Links
GameVault may contain links to third-party websites. We are not responsible for the content or practices of these external sites.

## 9. Termination & Suspension

We reserve the right to terminate or suspend your account immediately, without prior notice, for any violation of these Terms or for any other reason at our sole discretion.

## 10. Disclaimers & Limitations

### 10.1 Service Availability
GameVault is provided "as is" and "as available" without warranties of any kind. We do not guarantee uninterrupted or error-free service.

### 10.2 Limitation of Liability
To the maximum extent permitted by law, GameVault shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of the Service.

### 10.3 User Disputes
You are solely responsible for your interactions with other users. We reserve the right, but have no obligation, to monitor disputes between users.

## 11. Dispute Resolution

### 11.1 Governing Law
These Terms shall be governed by and construed in accordance with the laws of the United States, without regard to its conflict of law provisions.

### 11.2 Arbitration
Any dispute arising from these Terms shall be resolved through binding arbitration in accordance with the rules of the American Arbitration Association.

### 11.3 Class Action Waiver
You agree to resolve disputes with GameVault on an individual basis and waive your right to participate in class actions.

## 12. Changes to Terms

We reserve the right to modify these Terms at any time. We will notify users of any material changes via email or through the Service. Your continued use of GameVault after such modifications constitutes acceptance of the updated Terms.

## 13. Contact Information

If you have any questions about these Terms of Service, please contact us at:
- Email: legal@gamevault.com
- Address: GameVault LLC

## 14. Severability

If any provision of these Terms is found to be unenforceable, the remaining provisions shall continue in full force and effect.

## 15. Entire Agreement

These Terms, together with our Privacy Policy, constitute the entire agreement between you and GameVault regarding the use of the Service.
`;

const LAST_UPDATED = "January 2025";

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
    
    lines.forEach((line) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('#')) {
        const level = trimmed.match(/^#+/)?.[0].length || 1;
        const title = trimmed.replace(/^#+\s*/, '').replace(/^\*.*\*$/, ''); // Remove italic markers
        const id = title.toLowerCase()
          .replace(/[^\w\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .trim();
        
        if (title && level <= 3 && !title.includes('Last Updated')) {
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
    let inList = false;
    let listItems: string[] = [];

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      
      if (!trimmed) {
        if (inList && listItems.length > 0) {
          elements.push(
            <ul key={`list-${index}`} className="list-disc list-inside text-gray-300 mb-4 space-y-2 ml-4">
              {listItems.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          );
          listItems = [];
          inList = false;
        }
        elements.push(<div key={index} className="mb-4" />);
        return;
      }

      // Italic text (for date)
      if (trimmed.startsWith('*') && trimmed.endsWith('*')) {
        elements.push(
          <p key={index} className="text-gray-400 italic mb-4">
            {trimmed.slice(1, -1)}
          </p>
        );
      }
      // Headers
      else if (trimmed.startsWith('#')) {
        if (inList && listItems.length > 0) {
          elements.push(
            <ul key={`list-${index}`} className="list-disc list-inside text-gray-300 mb-4 space-y-2 ml-4">
              {listItems.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          );
          listItems = [];
          inList = false;
        }

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
      // List items
      else if (trimmed.startsWith('-')) {
        inList = true;
        listItems.push(trimmed.substring(1).trim());
      }
      // Bold text (markdown **text**)
      else if (trimmed.includes('**')) {
        const parts = trimmed.split(/(\*\*[^*]+\*\*)/);
        const formattedParts = parts.map((part, partIndex) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={partIndex} className="font-semibold text-white">{part.slice(2, -2)}</strong>;
          }
          return part;
        });
        
        elements.push(
          <p key={index} className="text-gray-300 mb-4 leading-relaxed">
            {formattedParts}
          </p>
        );
      }
      // Regular paragraphs
      else {
        if (inList && listItems.length > 0) {
          elements.push(
            <ul key={`list-${index}`} className="list-disc list-inside text-gray-300 mb-4 space-y-2 ml-4">
              {listItems.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          );
          listItems = [];
          inList = false;
        }
        elements.push(
          <p key={index} className="text-gray-300 mb-4 leading-relaxed">
            {trimmed}
          </p>
        );
      }
    });

    // Handle any remaining list items
    if (inList && listItems.length > 0) {
      elements.push(
        <ul key="list-final" className="list-disc list-inside text-gray-300 mb-4 space-y-2 ml-4">
          {listItems.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      );
    }

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
