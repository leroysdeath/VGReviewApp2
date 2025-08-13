import React, { useState, useEffect } from 'react';
import { ArrowLeft, List } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Privacy Policy content as constant
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

### 4.4 Business Transfers
In the event of a merger, acquisition, or sale, user information may be transferred as part of the business assets.

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

### 6.4 Communication Preferences
You can opt out of:
- Non-essential email communications
- Promotional notifications
- Feature announcements (while keeping security updates)

## 7. Data Retention

### 7.1 Active Accounts
We retain your information while your account is active and as needed to provide services.

### 7.2 Inactive Accounts
After account deletion, we may retain some information for:
- Legal compliance (as required by law)
- Fraud prevention
- Analytics (in anonymized form)

### 7.3 Content Retention
- Deleted reviews may be cached for up to 30 days
- Comments on others' reviews may remain visible unless specifically deleted
- Public contributions to the gaming database may be retained for community benefit

## 8. International Data Transfers

GameVault is hosted on servers that may be located in different countries. By using our service, you consent to the transfer of your information to countries that may have different data protection laws.

## 9. Children's Privacy

### 9.1 Age Restrictions
Our service is not intended for children under 13. We do not knowingly collect personal information from children under 13.

### 9.2 Parental Controls
If you believe a child under 13 has provided personal information, please contact us immediately for removal.

## 10. Cookies and Tracking

### 10.1 Essential Cookies
We use cookies that are necessary for:
- User authentication and session management
- Security and fraud prevention
- Basic site functionality

### 10.2 Analytics Cookies
We may use analytics cookies to:
- Understand how users interact with our service
- Identify popular features and content
- Improve user experience

### 10.3 Cookie Management
You can control cookies through your browser settings, though this may affect site functionality.

## 11. Third-Party Links and Services

### 11.1 External Links
Our service may contain links to third-party websites. We are not responsible for their privacy practices.

### 11.2 Game Information
Game data and images are sourced from IGDB. Their use is subject to IGDB's terms and policies.

## 12. Changes to This Policy

### 12.1 Policy Updates
We may update this Privacy Policy to reflect:
- Changes in our practices
- Legal or regulatory requirements
- Service improvements

### 12.2 Notification
We will notify you of significant changes through:
- Email notification to registered users
- Prominent notice on our website
- In-app notifications

### 12.3 Continued Use
Continued use of our service after policy changes constitutes acceptance of the updated terms.

## 13. Regional Privacy Rights

### 13.1 GDPR (European Users)
If you are in the European Economic Area, you have additional rights under GDPR:
- Right to be informed about data processing
- Right of access to your personal data
- Right to rectification of inaccurate data
- Right to erasure ("right to be forgotten")
- Right to restrict processing
- Right to data portability
- Right to object to processing
- Rights related to automated decision-making

### 13.2 CCPA (California Users)
California residents have rights under the California Consumer Privacy Act:
- Right to know what personal information is collected
- Right to delete personal information
- Right to opt-out of the sale of personal information (we do not sell data)
- Right to non-discrimination for exercising privacy rights

## 14. Contact Information

### 14.1 Privacy Inquiries
For privacy-related questions, contact us at:
- **Email**: privacy@gamevault.com
- **Subject Line**: Privacy Policy Inquiry

### 14.2 Data Protection Officer
For GDPR-related inquiries:
- **Email**: dpo@gamevault.com

### 14.3 Response Time
We will respond to privacy inquiries within:
- 30 days for general inquiries
- 72 hours for urgent security matters
- As required by applicable law for formal requests

## 15. Effective Date

This Privacy Policy is effective as of the "Last Updated" date shown at the top of this page and will remain in effect except with respect to any changes in its provisions in the future, which will be in effect immediately after being posted.
`;

const LAST_UPDATED = "January 15, 2024";

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
    const lines = PRIVACY_CONTENT.split('\n');
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