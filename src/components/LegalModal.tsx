import React, { useState, useEffect } from 'react';
import { X, List } from 'lucide-react';

// Terms of Service content (shortened for modal display)
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

## 9. Contact Information

If you have any questions about these Terms of Service, please contact us at legal@gamevault.com.
`;

// Privacy Policy content (shortened for modal display)
const PRIVACY_CONTENT = `
# Privacy Policy

## 1. Introduction

GameVault ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our gaming review platform.

## 2. Information We Collect

### 2.1 Personal Information
We collect information you provide directly to us, such as:
- **Account Information**: Username, email address, password (encrypted)
- **Profile Information**: Display name, bio, location, website, gaming platform preferences
- **User Content**: Game reviews, ratings, comments, and other content you post

### 2.2 Automatically Collected Information
When you use our service, we automatically collect:
- **Usage Data**: Pages visited, time spent, features used, games searched
- **Device Information**: Browser type, operating system, IP address, device identifiers
- **Performance Data**: Load times, errors, crash reports for service improvement

### 2.3 Third-Party Information
We receive information from third-party services:
- **IGDB**: Game metadata, images, and information for our game database
- **Authentication Providers**: If you sign up using social logins (future feature)

## 3. How We Use Your Information

### 3.1 Service Provision
- Create and manage your account
- Display your profile and content to other users
- Enable game reviews, ratings, and social features
- Provide personalized game recommendations

### 3.2 Communication
- Send account-related notifications
- Respond to your inquiries and support requests
- Send important service updates (security, terms changes)

### 3.3 Improvement and Analytics
- Analyze usage patterns to improve our service
- Monitor and analyze trends and user behavior
- Develop new features and functionality

### 3.4 Legal and Safety
- Enforce our Terms of Service
- Protect against fraud and abuse
- Comply with legal obligations

## 4. Information Sharing and Disclosure

### 4.1 Public Information
The following information is publicly visible:
- Username and display name
- Profile information (bio, location, website, platform)
- Game reviews and ratings
- Comments on reviews
- Public activity (games reviewed, ratings given)

### 4.2 Service Providers
We may share information with trusted third-party service providers:
- **Hosting Services**: Supabase for database and authentication
- **Content Delivery**: For fast loading of images and content
- **Analytics**: To understand how our service is used (anonymized data)

### 4.3 Legal Requirements
We may disclose information when required by law or to:
- Respond to legal requests or court orders
- Protect our rights, property, or safety
- Prevent fraud or abuse
- Investigate potential violations of our terms

## 5. Data Security

### 5.1 Security Measures
We implement appropriate technical and organizational measures:
- **Encryption**: Data is encrypted in transit and at rest
- **Access Controls**: Limited access to personal information
- **Regular Audits**: Security reviews and vulnerability assessments
- **Secure Infrastructure**: Using enterprise-grade hosting services

### 5.2 Account Security
You can help protect your account by:
- Using a strong, unique password
- Not sharing your login credentials
- Logging out of shared devices
- Reporting suspicious activity immediately

## 6. Your Rights and Choices

### 6.1 Account Management
You can:
- Update your profile information anytime
- Change your password and email
- Control what information is publicly visible
- Delete your reviews and comments

### 6.2 Data Access and Portability
You have the right to:
- Request a copy of your personal data
- Export your reviews and ratings
- Receive your data in a machine-readable format

### 6.3 Data Correction and Deletion
You can:
- Correct inaccurate personal information
- Request deletion of your account and data
- Remove specific reviews or comments

## 7. Contact Information

For privacy-related questions, contact us at privacy@gamevault.com.
`;

const LAST_UPDATED = "January 15, 2024";

interface TableOfContentsItem {
  id: string;
  title: string;
  level: number;
}

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'terms' | 'privacy';
}

export const LegalModal: React.FC<LegalModalProps> = ({ isOpen, onClose, type }) => {
  const [tocItems, setTocItems] = useState<TableOfContentsItem[]>([]);
  const [activeSection, setActiveSection] = useState<string>('');
  const [showToc, setShowToc] = useState(false);

  const content = type === 'terms' ? TERMS_CONTENT : PRIVACY_CONTENT;
  const title = type === 'terms' ? 'Terms of Service' : 'Privacy Policy';

  // Parse content for table of contents
  useEffect(() => {
    if (!isOpen) return;
    
    const lines = content.split('\n');
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
  }, [content, isOpen]);

  // Handle scroll to section
  const scrollToSection = (id: string) => {
    const element = document.getElementById(`modal-${id}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setShowToc(false);
    }
  };

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Convert markdown content to JSX
  const renderContent = () => {
    const lines = content.split('\n');
    const elements: JSX.Element[] = [];

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
          1: 'text-xl font-bold text-white mb-4 mt-6',
          2: 'text-lg font-semibold text-white mb-3 mt-4',
          3: 'text-base font-medium text-white mb-2 mt-3'
        }[level] || 'text-sm font-medium text-white mb-2 mt-2';

        elements.push(
          <h1 key={index} id={`modal-${id}`} className={headerClasses}>
            {title}
          </h1>
        );
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
          <p key={index} className="text-gray-300 mb-3 leading-relaxed text-sm">
            {formattedParts}
          </p>
        );
      }
      // Regular paragraphs
      else {
        elements.push(
          <p key={index} className="text-gray-300 mb-3 leading-relaxed text-sm">
            {trimmed}
          </p>
        );
      }
    });

    return elements;
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div 
          className="bg-gray-800 rounded-xl max-w-[calc(100vw-2rem)] sm:max-w-lg md:max-w-2xl lg:max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl pointer-events-auto border border-gray-700"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-700">
            <div className="flex items-center gap-4">
              <div>
                <h2 className="text-xl font-bold text-white">{title}</h2>
                <p className="text-gray-400 text-sm">Last updated: {LAST_UPDATED}</p>
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
            
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700 transition-colors"
              aria-label="Close modal"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          
          {/* Content */}
          <div className="flex h-[calc(90vh-120px)]">
            {/* Table of Contents - Desktop */}
            <div className="hidden lg:block w-64 flex-shrink-0 border-r border-gray-700">
              <div className="p-4 h-full overflow-y-auto">
                <h3 className="text-sm font-semibold text-white mb-3">Contents</h3>
                <nav className="space-y-1">
                  {tocItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => scrollToSection(item.id)}
                      className={`block w-full text-left px-2 py-1 rounded text-xs transition-colors ${
                        activeSection === item.id
                          ? 'bg-purple-600 text-white'
                          : 'text-gray-400 hover:text-white hover:bg-gray-700'
                      }`}
                      style={{ paddingLeft: `${item.level * 8 + 8}px` }}
                    >
                      {item.title}
                    </button>
                  ))}
                </nav>
              </div>
            </div>

            {/* Table of Contents - Mobile */}
            {showToc && (
              <div className="lg:hidden absolute inset-0 bg-black/50 z-10" onClick={() => setShowToc(false)}>
                <div className="absolute top-0 right-0 w-80 h-full bg-gray-800 p-4 overflow-y-auto border-l border-gray-700">
                  <h3 className="text-sm font-semibold text-white mb-3">Contents</h3>
                  <nav className="space-y-1">
                    {tocItems.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => scrollToSection(item.id)}
                        className={`block w-full text-left px-2 py-1 rounded text-xs transition-colors ${
                          activeSection === item.id
                            ? 'bg-purple-600 text-white'
                            : 'text-gray-400 hover:text-white hover:bg-gray-700'
                        }`}
                        style={{ paddingLeft: `${item.level * 8 + 8}px` }}
                      >
                        {item.title}
                      </button>
                    ))}
                  </nav>
                </div>
              </div>
            )}

            {/* Main Content */}
            <div className="flex-1 p-6 overflow-y-auto">
              <div className="prose prose-invert max-w-none">
                {renderContent()}
              </div>
              
              {/* Footer */}
              <div className="mt-8 pt-6 border-t border-gray-700">
                <p className="text-gray-400 text-xs">
                  {type === 'terms' ? (
                    <>
                      If you have any questions about these Terms of Service, please contact us at{' '}
                      <a href="mailto:legal@gamevault.com" className="text-purple-400 hover:text-purple-300">
                        legal@gamevault.com
                      </a>
                    </>
                  ) : (
                    <>
                      For privacy-related questions, please contact us at{' '}
                      <a href="mailto:privacy@gamevault.com" className="text-purple-400 hover:text-purple-300">
                        privacy@gamevault.com
                      </a>
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};