# IGDB Database Scraping Guide

This document explains how to use the IGDB bulk scraping functionality to extract data from the Internet Game Database.

## ⚠️ Important Disclaimers

**READ BEFORE USING:**

1. **IGDB Policy**: IGDB explicitly discourages mass database downloading and has experienced performance issues due to bulk scraping abuse.

2. **Rate Limits**: This tool respects IGDB's rate limits (3.5 requests/second, max 4 concurrent) but large-scale scraping may still be problematic.

3. **Commercial Use**: For commercial or large-scale operations, contact IGDB directly at `partner@igdb.com` for enterprise access.

4. **Responsible Use**: Only scrape what you need. Consider incremental updates rather than full database dumps.

## Installation

First, install the required dependency:

```bash
npm install tsx --save-dev
```

## Quick Start

### 1. View Help

```bash
npm run scrape-igdb:help
```

### 2. Basic Scraping

Scrape default endpoints (games, platforms, genres, companies, covers, screenshots):

```bash
npm run scrape-igdb
```

### 3. Custom Endpoints

Scrape specific endpoints only:

```bash
npm run scrape-igdb -- --endpoints games,platforms,genres
```

### 4. Custom Configuration

```bash
npm run scrape-igdb -- --endpoints games --batch-size 500 --output ./my-data
```

## Available Endpoints

| Endpoint | Description | Estimated Records | Priority |
|----------|-------------|------------------|----------|
| `games` | Main game data | 500,000+ | ⭐⭐⭐ |
| `platforms` | Gaming platforms | ~500 | ⭐⭐⭐ |
| `genres` | Game genres | ~50 | ⭐⭐⭐ |
| `companies` | Developers/Publishers | 50,000+ | ⭐⭐ |
| `covers` | Game cover art | 400,000+ | ⭐⭐ |
| `screenshots` | Game screenshots | 2,000,000+ | ⭐ |
| `artworks` | Game artwork | 500,000+ | ⭐ |
| `characters` | Game characters | 100,000+ | ⭐ |
| `people` | Industry people | 200,000+ | ⭐ |
| `themes` | Game themes | ~100 | ⭐⭐ |
| `franchises` | Game franchises | 10,000+ | ⭐⭐ |
| `collections` | Game collections | 20,000+ | ⭐⭐ |

## Command Options

```bash
npm run scrape-igdb -- [options]
```

### Options

- `--endpoints <list>`: Comma-separated endpoints (default: games,platforms,genres,companies,covers,screenshots)
- `--batch-size <number>`: Records per batch, max 500 (default: 500)  
- `--output <directory>`: Output directory (default: ./igdb-data)
- `--resume-endpoint <name>`: Resume scraping for specific endpoint
- `--resume-offset <number>`: Offset to resume from
- `--export-format <format>`: Export format: json, csv, sql
- `--export-dir <directory>`: Directory to export from

## Examples

### Scrape Only Essential Data

```bash
npm run scrape-igdb -- --endpoints games,platforms,genres
```

### Resume Interrupted Scraping

```bash
npm run scrape-igdb -- --resume-endpoint games --resume-offset 25000
```

### Export to Different Formats

```bash
# Export to CSV
npm run scrape-igdb -- --export-format csv --export-dir ./igdb-data/scraping-session-2024-01-01

# Export to SQL
npm run scrape-igdb -- --export-format sql --export-dir ./igdb-data/scraping-session-2024-01-01
```

## Data Structure

### Output Format

Each endpoint generates a JSON file with this structure:

```json
{
  "metadata": {
    "endpoint": "games",
    "totalRecords": 50000,
    "scrapedAt": "2024-01-01T12:00:00.000Z",
    "isPartial": false,
    "version": "1.0"
  },
  "data": [
    {
      "id": 1,
      "name": "Game Title",
      "summary": "Game description...",
      // ... other fields
    }
  ]
}
```

### Key Fields by Endpoint

#### Games
- `id`, `name`, `slug`, `summary`, `storyline`
- `first_release_date`, `rating`, `aggregated_rating`
- `platforms[]`, `genres[]`, `themes[]`
- `involved_companies[]` (developers/publishers)
- `cover`, `screenshots[]`, `artworks[]`

#### Platforms
- `id`, `name`, `abbreviation`, `category`
- `generation`, `platform_family`
- `platform_logo`, `websites[]`

#### Companies
- `id`, `name`, `slug`, `country`, `description`
- `developed[]`, `published[]`
- `logo`, `websites[]`

## Performance & Limitations

### Time Estimates

| Endpoint | Estimated Records | Est. Time | Data Size |
|----------|------------------|-----------|-----------|
| Games | 500,000 | 36+ hours | 2-5 GB |
| Platforms | 500 | 2 minutes | <1 MB |
| Genres | 50 | 30 seconds | <1 MB |
| Companies | 50,000 | 4+ hours | 100-500 MB |
| Screenshots | 2,000,000+ | 5+ days | 10+ GB |

### Rate Limiting

- **Requests per second**: 3.5 (conservative, IGDB allows 4)
- **Concurrent requests**: 4 maximum
- **Retry logic**: Automatic retry on rate limit errors
- **Backoff**: Exponential backoff on repeated failures

### Resource Usage

- **Memory**: ~100-500 MB depending on batch size
- **Disk**: Varies by endpoint (see table above)
- **Network**: Sustained bandwidth usage during scraping

## Troubleshooting

### Common Errors

1. **401 Authentication Error**
   ```
   Check TWITCH_CLIENT_ID and TWITCH_APP_ACCESS_TOKEN environment variables
   ```

2. **Rate Limited**
   ```
   The scraper automatically handles rate limits, but you may need to reduce --batch-size
   ```

3. **Memory Issues**
   ```
   Reduce --batch-size to 250 or 100 for memory-constrained environments
   ```

4. **Network Timeouts**
   ```
   Check internet connection. Scraper will retry failed requests automatically.
   ```

### Recovery

The scraper creates progress files and can resume from where it left off:

1. Check the output directory for `*-progress.json` files
2. Use `--resume-endpoint` and `--resume-offset` to continue
3. Partial data is saved every 2,500 records

### Monitoring Progress

```bash
# Check progress in another terminal
tail -f ./igdb-data/scraping-session-*/scraping-report.json
```

## Best Practices

### For Small Projects
1. Start with essential endpoints: `games,platforms,genres`
2. Use smaller batch sizes: `--batch-size 100`
3. Scrape during off-peak hours

### For Research/Analysis
1. Focus on specific data ranges or criteria
2. Consider sampling rather than complete dumps
3. Export to CSV for analysis tools

### For Production Use
1. Contact IGDB for enterprise access
2. Implement incremental updates
3. Cache and optimize data locally

## Legal and Ethical Considerations

1. **Terms of Service**: Ensure compliance with IGDB's terms of service
2. **Attribution**: Credit IGDB when using their data
3. **Commercial Use**: Requires proper licensing from IGDB
4. **Data Privacy**: Respect user privacy in any derivative works
5. **Fair Use**: Don't overload IGDB's servers or impact other users

## Integration with Your App

After scraping, you can integrate the data:

```typescript
import { igdbBulkScraper } from './src/services/igdbBulkScraper';

// Load scraped games
const gamesData = await loadScrapedData('./igdb-data/games.json');

// Process and import to your database
await importToDatabase(gamesData.data);
```

## Support and Resources

- **IGDB API Documentation**: [https://api-docs.igdb.com/](https://api-docs.igdb.com/)
- **Enterprise Contact**: partner@igdb.com
- **Rate Limits**: [https://api-docs.igdb.com/#rate-limits](https://api-docs.igdb.com/#rate-limits)

---

**Remember**: Use this tool responsibly. IGDB provides an incredible service to the gaming community, and bulk scraping can impact their infrastructure. Consider reaching out to them for legitimate commercial or research use cases.