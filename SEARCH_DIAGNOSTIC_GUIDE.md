# Search Diagnostic Tool Guide

## Overview

The Search Diagnostic Tool is a comprehensive admin interface for analyzing search performance, filter distributions, and identifying patterns in game search behavior. It's designed to be IGDB compliant and help optimize search functionality.

## Features

### 🔍 Single Search Analysis
- **Performance Metrics**: Database query time, IGDB query time, total duration
- **Search Breakdown**: Name vs summary search results
- **Filter Analysis**: Genre, platform, rating, and release year distributions
- **Sorting Analysis**: Comparison of rating-based vs relevance-based sorting

### 🧪 Bulk Testing
- Test multiple queries simultaneously
- Pattern detection across search results
- Performance bottleneck identification
- Quality issue detection
- Automated recommendations

### 📊 Pattern Analysis
- Common filter distributions across searches
- Performance bottleneck identification
- Search quality assessment
- Optimization recommendations

## IGDB Compliance

### Rate Limiting
- **4 requests per second** maximum
- **450 requests per day** (conservative limit)
- Automatic rate limiting with cooldown periods
- Request quota tracking and monitoring

### Best Practices
- Results caching to minimize API calls
- Intelligent IGDB usage (only when database results are insufficient)
- Proper error handling for rate limit hits
- Attribution compliance (built into requests)

## Access & Authentication

### Admin Login
The tool requires admin authentication. Valid admin keys:
- `vg-search-admin-2024`
- `debug`
- `diagnostic-tool`

### URL
Access the tool at: `http://localhost:8888/admin/diagnostic`

## Usage Guide

### Single Search Testing

1. **Login** with admin credentials
2. **Enter a search query** (e.g., "mario", "pokemon blue", "final fantasy")
3. **Click "Analyze"** to run comprehensive analysis
4. **Review results**:
   - Performance metrics
   - Search breakdown (name vs summary matches)
   - Filter distributions
   - Sorting effectiveness

### Bulk Testing

1. **Navigate to "Bulk Testing"** tab
2. **Choose a preset** or enter custom queries (one per line)
3. **Click "Run Bulk Test"** to analyze all queries
4. **View pattern analysis** with recommendations

### Understanding Results

#### Performance Metrics
- **Total Time**: Complete search duration (should be < 2 seconds)
- **DB Query Time**: Database search time (should be < 1 second)
- **DB Results**: Number of database matches
- **IGDB Used**: Whether IGDB API was queried

#### Filter Analysis
- **Genre Distribution**: Most common genres in results
- **Platform Distribution**: Most common platforms
- **Rating Distribution**: Score ranges (0-20, 21-40, etc.)
- **Release Year**: Temporal distribution of games

#### Sorting Analysis
- **Top Games by Rating**: Highest IGDB-rated games
- **Top Games by Relevance**: Best matches for the query
- **Average Rating**: Mean IGDB rating across all results

## Common Test Scenarios

### Franchise Testing
Test broad franchise searches to ensure good coverage:
```
mario
zelda
pokemon
final fantasy
call of duty
```

### Genre Testing
Test genre-based searches:
```
rpg
shooter
platformer
racing
puzzle
```

### Specific Game Testing
Test exact game title searches:
```
Super Mario Bros
The Legend of Zelda Breath of the Wild
Pokemon Red
Final Fantasy VII
```

### Edge Cases
Test challenging queries:
```
obscure indie game
ff
cod
mario kart
pokemon blue vs red
```

## Interpreting Results

### Performance Issues
- **Database timeouts**: Queries taking > 1 second indicate indexing needs
- **High total time**: > 2 seconds suggests optimization needed
- **Frequent IGDB usage**: May indicate poor database coverage

### Quality Issues
- **Low result counts**: < 5 results may indicate search term issues
- **Poor relevance**: Top results not matching query suggest sorting problems
- **Missing popular games**: Indicates database coverage gaps

### Optimization Recommendations

The tool automatically provides recommendations such as:
- Database indexing improvements
- Search algorithm adjustments
- Database coverage expansion
- IGDB usage optimization

## API Limits & Monitoring

### IGDB Quotas
- **Daily requests**: Tracked and displayed in real-time
- **Rate limiting**: Automatic throttling to prevent violations
- **Quota warnings**: Alerts when approaching limits

### Best Practices
1. **Use bulk testing sparingly** - each query may trigger IGDB calls
2. **Monitor quotas** - keep daily usage under 400 requests
3. **Cache results** - avoid re-testing identical queries
4. **Test during development** - not in production

## Troubleshooting

### Common Issues

#### "Admin access required"
- Verify admin key is correct
- Check browser localStorage for existing session
- Try logging out and back in

#### "IGDB rate limit hit"
- Wait 1-2 seconds between requests
- Reduce bulk test query count
- Check daily quota usage

#### "Database timeout"
- Specific queries may be too complex
- Check database indexing
- Consider query optimization

#### Test failures
- Some tests may fail due to network issues
- IGDB API availability affects integration tests
- Database connection issues affect DB tests

## Development & Extension

### Adding New Metrics
1. Extend the `SearchDiagnostic` interface
2. Update analysis methods in `searchDiagnosticService.ts`
3. Add UI components in `SearchDiagnosticTool.tsx`

### Custom Test Queries
Create custom test sets for specific use cases:
```typescript
const CUSTOM_QUERIES = [
  'your custom query 1',
  'your custom query 2'
];
```

### Integration with Existing Search
The diagnostic tool uses the same search services as the main application:
- `gameDataServiceV2.ts` - Database search logic
- `igdbServiceV2.ts` - IGDB API integration
- Same filtering and sorting algorithms

This ensures diagnostic results accurately reflect production search behavior.

## Security Notes

- Admin authentication is simple key-based (suitable for development)
- For production, consider implementing proper user management
- Admin keys should be kept secure and not committed to version control
- Consider IP restrictions for admin access in production environments

## Support

For issues or enhancements:
1. Check browser console for error details
2. Verify IGDB API credentials and quotas
3. Test database connectivity
4. Review network/firewall restrictions

The diagnostic tool is designed to be self-explanatory with comprehensive logging and error reporting to help identify and resolve search performance issues.