# Referral System Implementation Plan

## Overview
Sales-driven referral tracking system for measuring user acquisition and engagement through sales team efforts. This system will track referral codes, monitor user activation milestones, and provide comprehensive analytics for sales performance.

## System Architecture

### Core Components
1. **Referral Code Capture** - Optional field at signup or via custom URLs
2. **Conversion Tracking** - Monitor 11 key engagement metrics
3. **Admin Dashboard** - Sales performance analytics at `/admin/sales`
4. **Database Architecture** - Comprehensive tracking tables

## Database Schema

### 1. Referral Codes Table
```sql
CREATE TABLE referral_codes (
  code VARCHAR(17) PRIMARY KEY,
  owner_name VARCHAR(255) NOT NULL,
  type VARCHAR(50) CHECK (type IN ('salesperson', 'campaign')),
  created_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);
```

### 2. Referrals Table
```sql
CREATE TABLE referrals (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES user(id) UNIQUE,
  referral_code VARCHAR(17) REFERENCES referral_codes(code),
  signup_method VARCHAR(50) CHECK (signup_method IN ('direct_code', 'referral_url')),
  signup_url VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 3. Referral Conversions Table
```sql
CREATE TABLE referral_conversions (
  id SERIAL PRIMARY KEY,
  referral_id INTEGER REFERENCES referrals(id) UNIQUE,

  -- Profile Completion
  email_verified BOOLEAN DEFAULT false,
  email_verified_at TIMESTAMP,
  profile_photo_uploaded BOOLEAN DEFAULT false,
  profile_photo_uploaded_at TIMESTAMP,
  bio_completed BOOLEAN DEFAULT false,
  bio_completed_at TIMESTAMP,

  -- Content Creation
  reviews_count INTEGER DEFAULT 0,
  review_1_completed_at TIMESTAMP,
  review_5_completed_at TIMESTAMP,
  review_10_completed_at TIMESTAMP,
  comments_count INTEGER DEFAULT 0,
  comment_1_completed_at TIMESTAMP,

  -- Social Engagement
  top5_selected BOOLEAN DEFAULT false,
  top5_selected_at TIMESTAMP,
  following_count INTEGER DEFAULT 0,
  following_3plus BOOLEAN DEFAULT false,
  following_3plus_at TIMESTAMP,
  likes_given_count INTEGER DEFAULT 0,
  likes_3_completed_at TIMESTAMP,

  -- Retention
  active_days_week1 INTEGER DEFAULT 0,
  active_3_days_week1 BOOLEAN DEFAULT false,
  active_3_days_week1_at TIMESTAMP,

  -- Subscription/Monetization
  converted_to_paid BOOLEAN DEFAULT false,
  converted_to_paid_at TIMESTAMP,
  subscription_tier VARCHAR(50),
  subscription_amount DECIMAL(10,2),

  -- Summary
  all_completed BOOLEAN DEFAULT false,
  all_completed_at TIMESTAMP,
  last_updated TIMESTAMP DEFAULT NOW()
);
```

## Engagement Metrics (12 Tracked Actions)

### Profile Completion
- [ ] Email verified
- [ ] Profile photo uploaded
- [ ] Bio completed

### Content Creation
- [ ] 1 review written
- [ ] 5 reviews written
- [ ] 10 reviews written
- [ ] 1 comment written

### Social Engagement
- [ ] Top 5 games selected
- [ ] Following 3+ users
- [ ] 3 likes given

### Retention
- [ ] Active 3 days in first week

### Monetization
- [ ] Converted to paid/pro membership

### Super Converter
- [ ] ALL above completed (including paid conversion)

## Implementation Phases

### Phase 1: Database Setup
1. Create referral tracking tables
2. Add indexes for performance
3. Set up Row Level Security policies
4. Create initial referral codes for sales team

### Phase 2: Signup Integration
1. Add optional referral code field to existing signup modal
2. Create `/signup/:code` route that pre-fills referral code
3. Validate referral codes in real-time
4. Store referral data on user creation

### Phase 3: Conversion Tracking
1. Hook into existing user actions
2. Update conversion metrics in real-time
3. Track milestone completions with timestamps
4. Track subscription conversions and revenue
5. Calculate "all_completed" status automatically

### Phase 4: Admin Dashboard
1. Create protected `/admin/sales` route
2. Universal admin login (separate from user auth)
3. Individual salesperson metrics
4. Combined team metrics
5. Time-based filtering (week/month/quarter/all-time)

## URL Structure

### User-Facing
- `gamevault.to` - Standard signup with optional referral field
- `gamevault.to/signup/[CODE]` - Pre-filled referral signup

### Admin
- `gamevault.to/admin/sales` - Sales dashboard (protected)
- `gamevault.to/admin/sales/login` - Admin authentication

## Attribution Rules

1. **Strict Attribution**: Referral code must be entered at signup
2. **No Persistence**: No cookies or localStorage tracking
3. **Two Entry Methods**:
   - Manual code entry in signup modal
   - Automatic via `/signup/:code` URL
4. **One-Time Capture**: Cannot change referral after signup
5. **No Retroactive**: Only new signups count

## Dashboard Metrics Display

```
[SALESPERSON NAME]'s Performance
================================
Total Signups: XX

Profile Completion:
├── Email Verified: XX (XX%)
├── Profile Photo: XX (XX%)
└── Bio Added: XX (XX%)

Content Creation:
├── 1+ Reviews: XX (XX%)
├── 5+ Reviews: XX (XX%)
├── 10+ Reviews: XX (XX%)
└── 1+ Comments: XX (XX%)

Social Engagement:
├── Top 5 Selected: XX (XX%)
├── Following 3+: XX (XX%)
└── Given 3+ Likes: XX (XX%)

Retention:
└── Active 3d/Week1: XX (XX%)

Monetization:
└── Converted to Paid: XX (XX%) 💰

🏆 FULLY ACTIVATED: XX (XX%)
```

## Technical Specifications

### Referral Code Format
- **Type**: Alphanumeric only
- **Length**: Maximum 17 characters
- **Case**: Case-insensitive storage and lookup
- **Examples**: JOHN, MIKE2024, SUMMERSALE

### Security Considerations
- Rate limit referral code validation
- Prevent self-referrals (user cannot use their own code)
- Email verification required for conversion credit
- Activity threshold to prevent gaming

### Performance Optimizations
- Index on referral_code for fast lookups
- Materialized views for dashboard metrics
- Batch update conversions every 5 minutes
- Cache dashboard data with 1-minute TTL

## API Endpoints

### User-Facing
- `POST /api/validate-referral-code` - Check if code is valid
- `GET /api/referral-info/:code` - Get basic info for pre-filling

### Admin (Protected)
- `GET /api/admin/sales/metrics` - Dashboard data
- `GET /api/admin/sales/metrics/:code` - Individual salesperson
- `GET /api/admin/sales/export` - CSV export
- `POST /api/track-subscription` - Track paid conversions

## Future Enhancements

### Phase 2 (Later)
- Automated email reports to sales team
- Slack notifications for milestones
- A/B testing different signup flows
- Referral link QR codes

### Phase 3 (Future)
- Commission calculation integration
- Subscription revenue attribution
- Campaign-specific tracking
- API access for external tools

## Success Metrics

### Primary KPIs
- Signup-to-activation rate (email verified + profile)
- Signup-to-engagement rate (1+ review)
- Signup-to-retention rate (active 3d in week 1)
- Signup-to-paid rate (subscription conversion)
- Full activation rate (all 12 metrics)
- Revenue per referral code

### Secondary Metrics
- Average time to each milestone
- Drop-off points in funnel
- Salesperson performance comparison
- Campaign effectiveness

## Testing Plan

1. Test referral code validation
2. Test signup with various code formats
3. Verify conversion tracking accuracy
4. Test dashboard calculations
5. Load test with 1000+ referrals
6. Security test for SQL injection
7. Test admin authentication

## Rollout Strategy

1. **Week 1**: Database and basic tracking
2. **Week 2**: Signup integration and testing
3. **Week 3**: Admin dashboard MVP
4. **Week 4**: Full launch with sales team

## Notes

- All referral codes manually created by admin
- No automated code generation
- Sales team won't have individual logins initially
- Focus on accuracy over real-time updates
- Privacy-first: no IP tracking or fingerprinting