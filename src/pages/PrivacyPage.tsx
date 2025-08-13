import React, { useState, useEffect } from 'react';
import { ArrowLeft, List } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Privacy Policy content as constant
const PRIVACY_CONTENT = `
# Privacy Policy

*Last Updated: January 2025*

## 1. Introduction

GameVault ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our gaming community platform.

## 2. Information We Collect

### 2.1 Information You Provide
- **Account Information**: Username, email address, password (encrypted), and profile information
- **Profile Data**: Avatar, bio, location (optional), gaming preferences, and platform preferences
- **User Content**: Reviews, ratings, comments, game lists, and other content you post
- **Communications**: Messages you send to us or other users through the platform

### 2.2 Information Collected Automatically
- **Usage Data**: Pages visited, features used, time spent on the platform, and interaction patterns
- **Game Activity**: Games viewed, reviewed, rated, and added to lists
- **Device Information**: Browser type, operating system, device type, and screen resolution
- **Log Data**: IP address, access times, and referring URLs

### 2.3 Information from Third Parties
- **Authentication Providers**: If you sign in using social login, we receive basic profile information
- **Game Data**: We retrieve game information from IGDB (Internet Game Database)

## 3. How We Use Your Information

We use collected information to:
- Provide and maintain the Service
- Create and manage your account
- Personalize your experience and provide game recommendations
- Process and display your reviews, ratings, and other content
- Communicate with you about updates, features, and community activities
- Improve our Service through analytics and user feedback
- Detect and prevent fraud, abuse, and security issues
- Comply with legal obligations

## 4. Information Sharing and Disclosure

### 4.1 We Do Not Sell Your Data
We never sell, rent, or trade your personal information to third parties for their marketing purposes.

### 4.2 Service Providers
We share information with third-party service providers that help us operate the Service:
- **Supabase**: Authentication and database services
- **IGDB**: Game information and metadata
- **Analytics Providers**: To understand usage patterns (anonymized data only)

### 4.3 Public Information
Your public profile, reviews, ratings, and comments are visible to other users. You control what information appears on your public profile.

### 4.4 Legal Requirements
We may disclose information if required by law, court order, or government request, or if necessary to protect our rights, users, or the public.

## 5. Data Security

We implement appropriate technical and organizational measures to protect your information:
- Encryption of passwords and sensitive data
- Secure HTTPS connections
- Regular security audits and updates
- Limited access to personal information by employees
- Secure data storage with Supabase

However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.

## 6. Cookies and Tracking Technologies

### 6.1 How We Use Cookies
- **Essential Cookies**: For authentication and core functionality
- **Preference Cookies**: To remember your settings and preferences
- **Analytics Cookies**: To understand how users interact with the Service

### 6.2 Managing Cookies
You can control cookies through your browser settings. Disabling certain cookies may limit functionality.

## 7. Your Rights and Choices

### 7.1 Access and Update
You can access and update your account information through your profile settings.

### 7.2 Data Portability
You can request a copy of your data in a machine-readable format.

### 7.3 Deletion
You can request deletion of your account and associated data. Some information may be retained for legal or legitimate business purposes.

### 7.4 Opt-Out
You can opt-out of:
- Promotional emails (through unsubscribe links)
- Certain data collection through privacy settings
- Analytics tracking through browser settings

### 7.5 Do Not Track
We currently do not respond to Do Not Track browser signals.

## 8. Data Retention

We retain your information for as long as your account is active or as needed to provide the Service. After account deletion:
- Account data is deleted within 30 days
- Anonymized analytics data may be retained
- Content you posted may remain visible but dissociated from your account
- We may retain certain information to comply with legal obligations

## 9. International Data Transfers

If you access GameVault from outside the United States, your information may be transferred to and processed in the United States. By using the Service, you consent to this transfer.

### 9.1 GDPR Compliance (European Users)
For users in the European Economic Area:
- We process data based on consent, contract, or legitimate interests
- You have rights to access, rectification, erasure, and data portability
- You may lodge complaints with supervisory authorities
- Contact us for any GDPR-related requests

## 10. California Privacy Rights

California residents have additional rights under the California Consumer Privacy Act (CCPA):
- Right to know what personal information is collected
- Right to know if information is sold or disclosed (we do not sell information)
- Right to deletion of personal information
- Right to non-discrimination for exercising privacy rights

## 11. Changes to This Privacy Policy

We may update this Privacy Policy periodically. We will notify you of material changes via:
- Email notification to registered users
- Prominent notice on the Service
- Update to the "Last Updated" date

Your continued use after changes constitutes acceptance of the updated policy.

## 12. Third-Party Links

GameVault may contain links to third-party websites. We are not responsible for their privacy practices. We encourage you to review their privacy policies.

## 13. Contact Information

For privacy-related questions or concerns:
- **Email**: privacy@gamevault.com
- **Data Protection Officer**: dpo@gamevault.com
- **Address**: GameVault LLC

For GDPR inquiries (EU residents): gdpr@gamevault.com
For CCPA inquiries (California residents): ccpa@gamevault.com

## 14. Data Protection Framework

We adhere to the following principles:
- **Lawfulness**: Processing data only with legal basis
- **Transparency**: Clear communication about data use
- **Purpose Limitation**: Using data only for stated purposes
- **Data Minimization**: Collecting only necessary information
- **Accuracy**: Keeping information up to date
- **Storage Limitation**: Retaining data only as long as needed
- **Integrity**: Ensuring data security and confidentiality
- **Accountability**: Taking responsibility for data protection
`;

const LAST_UPDATED = "January 2025";

interface TableOfContentsItem {
  id: string;
  title: string;
  level: number;
}

const PrivacyPage: React.FC = React.memo(() => {
  const navigate = useNavigate();
  const [tocItems, setTocItems] = useState<TableOfContentsItem[]>([]);
  const [activeSection, setActiveSection] = useState<string>('');
  const [showToc, setShowToc] = useState(false);

  // Parse content for table of contents
  useEffect(() => {
    const lines = PRIVACY_CONTENT.split('\n');
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
    const lines = PRIVACY_CONTENT.split('\n');
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
                <h1 className="text-2xl font-bold">Privacy Policy</h1>
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
                For privacy-related questions, please contact us at{' '}
                <a href="mailto:privacy@gamevault.com" className="text-purple-400 hover:text-purple-300">
                  privacy@gamevault.com
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

PrivacyPage.displayName = 'PrivacyPage';

export default PrivacyPage;
