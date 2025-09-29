# Affiliate Links Implementation Guide

## Overview
Implementation strategy for adding referral/affiliate links to game pages, allowing users to purchase games while generating revenue for the site.

## 1. Affiliate Program Registration

### Primary Programs
- **Amazon Associates** - Most comprehensive for physical/digital games
- **Best Buy Affiliate Program** (via CJ Affiliate/Impact)
- **PlayStation Direct** (through their affiliate network)
- **Nintendo** (limited program availability)
- **Steam** (no affiliate program currently)
- **Green Man Gaming** - PC games with good commission rates
- **Humble Bundle** - Popular for game bundles and charity

### Registration Requirements
- Business entity or SSN/EIN for tax purposes
- Website with substantial content
- Traffic requirements (varies by program)
- Bank account for payments
- Tax forms (W-9 for US programs)

## 2. Database Schema Requirements

### New Tables Needed

```sql
-- Store definitions
CREATE TABLE stores (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  logo_url TEXT,
  affiliate_program VARCHAR(100),
  commission_rate DECIMAL(5,2),
  cookie_duration_days INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Game availability per store
CREATE TABLE game_store_links (
  id UUID PRIMARY KEY,
  game_id UUID REFERENCES games(id),
  store_id UUID REFERENCES stores(id),
  product_url TEXT NOT NULL,
  affiliate_url TEXT,
  price DECIMAL(10,2),
  currency VARCHAR(3),
  is_available BOOLEAN DEFAULT true,
  region VARCHAR(10),
  last_checked TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(game_id, store_id, region)
);

-- Click tracking
CREATE TABLE affiliate_clicks (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  game_id UUID REFERENCES games(id),
  store_id UUID REFERENCES stores(id),
  click_timestamp TIMESTAMPTZ DEFAULT NOW(),
  ip_hash VARCHAR(64), -- Hashed for privacy
  user_agent TEXT,
  referrer_page TEXT,
  session_id VARCHAR(100)
);

-- Conversion tracking (if available from affiliate networks)
CREATE TABLE affiliate_conversions (
  id UUID PRIMARY KEY,
  click_id UUID REFERENCES affiliate_clicks(id),
  order_id VARCHAR(255),
  commission_amount DECIMAL(10,2),
  currency VARCHAR(3),
  conversion_date TIMESTAMPTZ,
  status VARCHAR(50) -- pending, confirmed, cancelled
);
```

## 3. Technical Implementation

### Service Architecture

```typescript
// /src/services/affiliateService.ts
interface AffiliateService {
  generateAffiliateLink(gameId: string, storeId: string, userId?: string): Promise<string>;
  trackClick(clickData: ClickData): Promise<void>;
  getAvailableStores(gameId: string, region?: string): Promise<Store[]>;
  syncPrices(gameId: string): Promise<void>;
}
```

### Link Redirect Service

```typescript
// /netlify/functions/affiliate-redirect.ts
// Handles /go/[store]/[gameId] redirects
// Tracks clicks and redirects to affiliate URL
```

### Component Structure

```typescript
// /src/components/game/PurchaseLinks.tsx
// Displays available purchase options with affiliate links

// /src/components/game/PriceComparison.tsx
// Shows price comparison across different stores

// /src/components/common/AffiliateDisclosure.tsx
// Required FTC disclosure component
```

## 4. Compliance & Legal Requirements

### FTC Disclosure Requirements
- Clear and conspicuous disclosure near affiliate links
- "As an Amazon Associate, I earn from qualifying purchases"
- Disclosure must be unavoidable for users

### GDPR Compliance
- Cookie consent for tracking
- Data processing agreements with affiliate networks
- User right to opt-out of tracking

### Tax Considerations
- 1099 forms for US affiliates earning over $600
- International tax treaties
- State nexus laws for sales tax

## 5. User Experience Design

### Game Page Integration
```
[Game Details Section]
  └── [Where to Buy]
      ├── [Digital Stores]
      │   ├── Steam - $59.99
      │   ├── PlayStation Store - $59.99
      │   └── Xbox Store - $59.99
      └── [Physical Retailers]
          ├── Amazon - $49.99
          └── Best Buy - $54.99
```

### Features to Implement
- Price tracking and history
- Price drop alerts
- Regional pricing display
- Platform availability (PC/Console/Mobile)
- DRM information
- Edition comparison (Standard/Deluxe/Ultimate)

## 6. Revenue Optimization Strategies

### A/B Testing Targets
- Button colors and sizes
- Placement (above/below fold)
- Text ("Buy Now" vs "Check Price" vs "View on Amazon")
- Number of stores displayed
- Price display format

### Analytics to Track
- Click-through rate per store
- Conversion rate (if available)
- Revenue per thousand impressions (RPM)
- User engagement with purchase links
- Geographic performance

## 7. Technical Challenges & Solutions

### Challenge: Ad Blockers
**Solution:**
- First-party domain redirects
- Server-side link generation
- Non-tracking fallback links

### Challenge: Price Accuracy
**Solution:**
- Scheduled price sync jobs
- Webhooks from affiliate APIs
- Cache with TTL
- "Price last updated" timestamps

### Challenge: Link Rot
**Solution:**
- Regular link validation
- Automated broken link detection
- Fallback to search URLs

### Challenge: Multiple Regions
**Solution:**
- GeoIP detection
- User preference settings
- Regional store priority

## 8. Implementation Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Database schema creation
- [ ] Basic affiliate service
- [ ] Amazon Associates integration
- [ ] FTC disclosure component

### Phase 2: Core Features (Week 3-4)
- [ ] Click tracking implementation
- [ ] Redirect service
- [ ] Purchase links component
- [ ] 2-3 additional store integrations

### Phase 3: Optimization (Week 5-6)
- [ ] Price comparison features
- [ ] Analytics dashboard
- [ ] A/B testing framework
- [ ] Mobile optimization

### Phase 4: Advanced Features (Week 7-8)
- [ ] Price history tracking
- [ ] Price alerts
- [ ] Regional support
- [ ] API rate limiting

## 9. Monitoring & Maintenance

### Daily Tasks
- Monitor click tracking
- Check for broken links
- Review error logs

### Weekly Tasks
- Sync prices
- Review conversion reports
- Update unavailable products

### Monthly Tasks
- Commission reconciliation
- Performance analysis
- A/B test results review
- Compliance audit

## 10. Security Considerations

### API Key Management
- Store keys in environment variables
- Use Netlify Functions for API calls
- Rotate keys regularly
- Implement rate limiting

### Data Privacy
- Hash IP addresses
- Comply with GDPR/CCPA
- Secure storage of click data
- Regular data purging policy

## 11. Testing Strategy

### Unit Tests
- Affiliate link generation
- Click tracking logic
- Price formatting
- Region detection

### Integration Tests
- Database operations
- API interactions
- Redirect flow
- Analytics tracking

### E2E Tests
- Complete purchase flow
- Multiple store scenarios
- Mobile responsiveness
- Disclosure visibility

## 12. Performance Considerations

### Caching Strategy
- Cache store availability (1 hour)
- Cache prices (15 minutes)
- Cache affiliate links (1 day)
- CDN for store logos

### Database Optimization
- Indexes on game_id, store_id
- Partitioned tables for clicks
- Archived old conversion data
- Query optimization for hot paths

## 13. Success Metrics

### Primary KPIs
- Revenue per user
- Click-through rate
- Conversion rate
- Average order value

### Secondary KPIs
- Page load time with affiliate links
- User engagement with purchase options
- Store coverage percentage
- Link accuracy rate

## 14. Risk Mitigation

### Business Risks
- Affiliate program termination
- Commission rate changes
- Compliance violations
- User trust issues

### Technical Risks
- API rate limiting
- Service downtime
- Data breaches
- Performance degradation

### Mitigation Strategies
- Diversify affiliate programs
- Transparent disclosure
- Regular compliance audits
- Performance monitoring
- Incident response plan