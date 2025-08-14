#!/usr/bin/env node

// IGDB Bulk Scraping Script
// Usage: node bulkScrapeIGDB.js [options]

import { igdbBulkScraper, IGDBBulkScraper, ScrapingConfig } from '../services/igdbBulkScraper';

interface CliOptions {
  endpoints?: string[];
  batchSize?: number;
  outputDir?: string;
  resumeEndpoint?: string;
  resumeOffset?: number;
  exportFormat?: 'json' | 'csv' | 'sql';
  exportDir?: string;
  help?: boolean;
}

class IGDBScrapingCLI {
  private parseArguments(): CliOptions {
    const args = process.argv.slice(2);
    const options: CliOptions = {};
    
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      
      switch (arg) {
        case '--help':
        case '-h':
          options.help = true;
          break;
          
        case '--endpoints':
        case '-e':
          options.endpoints = args[++i]?.split(',') || [];
          break;
          
        case '--batch-size':
        case '-b':
          options.batchSize = parseInt(args[++i]) || 500;
          break;
          
        case '--output':
        case '-o':
          options.outputDir = args[++i];
          break;
          
        case '--resume-endpoint':
          options.resumeEndpoint = args[++i];
          break;
          
        case '--resume-offset':
          options.resumeOffset = parseInt(args[++i]) || 0;
          break;
          
        case '--export-format':
          const format = args[++i] as 'json' | 'csv' | 'sql';
          if (['json', 'csv', 'sql'].includes(format)) {
            options.exportFormat = format;
          }
          break;
          
        case '--export-dir':
          options.exportDir = args[++i];
          break;
      }
    }
    
    return options;
  }

  private showHelp(): void {
    console.log(`
🎮 IGDB Bulk Database Scraper

DESCRIPTION:
  Scrape data from the IGDB (Internet Game Database) API in bulk.
  Respects rate limits and saves data in JSON format.

USAGE:
  npm run scrape-igdb [options]
  
OPTIONS:
  -h, --help                    Show this help message
  -e, --endpoints <list>        Comma-separated list of endpoints to scrape
                               Default: games,platforms,genres,companies,covers,screenshots
  -b, --batch-size <number>     Records per batch (max 500)
                               Default: 500
  -o, --output <directory>      Output directory for scraped data
                               Default: ./igdb-data
  --resume-endpoint <name>      Resume scraping for a specific endpoint
  --resume-offset <number>      Offset to resume from
  --export-format <format>      Export format: json, csv, sql
                               Default: json
  --export-dir <directory>      Directory containing data to export

ENDPOINTS:
  games              Main game data (recommended)
  platforms          Gaming platforms (PlayStation, Xbox, PC, etc.)
  genres            Game genres (Action, RPG, Strategy, etc.)  
  companies          Game developers and publishers
  covers            Game cover art
  screenshots        Game screenshots
  artworks          Game artwork
  characters         Game characters
  people            Industry people
  themes            Game themes
  franchises         Game franchises
  collections        Game collections

EXAMPLES:
  # Scrape all default endpoints
  npm run scrape-igdb
  
  # Scrape only games and platforms
  npm run scrape-igdb --endpoints games,platforms
  
  # Resume scraping games from offset 10000
  npm run scrape-igdb --resume-endpoint games --resume-offset 10000
  
  # Export scraped data to CSV
  npm run scrape-igdb --export-format csv --export-dir ./igdb-data/scraping-session-2024-01-01

WARNINGS:
  ⚠️  This tool should be used responsibly
  ⚠️  IGDB discourages mass database downloading
  ⚠️  For commercial use, contact IGDB at partner@igdb.com
  ⚠️  Rate limited to 3.5 requests/second to respect API limits
  ⚠️  Large datasets may take hours or days to complete

RATE LIMITS:
  - 3.5 requests per second (conservative)
  - Maximum 4 concurrent requests
  - Automatic retry on rate limit errors

OUTPUT:
  Data is saved in JSON format with metadata:
  {
    "metadata": {
      "endpoint": "games",
      "totalRecords": 50000,
      "scrapedAt": "2024-01-01T12:00:00.000Z",
      "version": "1.0"
    },
    "data": [...]
  }
`);
  }

  async run(): Promise<void> {
    const options = this.parseArguments();

    if (options.help) {
      this.showHelp();
      return;
    }

    console.log('🎮 IGDB Bulk Database Scraper');
    console.log('=============================\n');
    
    // Handle export functionality
    if (options.exportFormat && options.exportDir) {
      console.log(`📤 Exporting data from ${options.exportDir} to ${options.exportFormat} format...`);
      
      try {
        const exportedFiles = await igdbBulkScraper.exportData(
          options.exportDir, 
          options.exportFormat
        );
        
        console.log('✅ Export completed!');
        console.log('📁 Exported files:');
        exportedFiles.forEach(file => console.log(`  - ${file}`));
        
      } catch (error) {
        console.error('❌ Export failed:', error);
        process.exit(1);
      }
      
      return;
    }

    // Handle resume functionality
    if (options.resumeEndpoint) {
      console.log(`📤 Resuming scraping for ${options.resumeEndpoint} from offset ${options.resumeOffset || 0}...`);
      
      try {
        const result = await igdbBulkScraper.resumeEndpoint(
          options.resumeEndpoint,
          options.resumeOffset || 0
        );
        
        if (result.success) {
          console.log(`✅ Successfully resumed and completed ${options.resumeEndpoint}`);
          console.log(`📊 Total records: ${result.totalRecords}`);
          console.log(`⏱️  Duration: ${Math.round(result.duration / 1000)}s`);
        } else {
          console.error(`❌ Resume failed for ${options.resumeEndpoint}:`, result.errors);
        }
        
      } catch (error) {
        console.error('❌ Resume operation failed:', error);
        process.exit(1);
      }
      
      return;
    }

    // Configure scraper
    const config: Partial<ScrapingConfig> = {};
    
    if (options.endpoints) {
      config.endpoints = options.endpoints;
      console.log(`📋 Endpoints to scrape: ${options.endpoints.join(', ')}`);
    }
    
    if (options.batchSize) {
      config.batchSize = Math.min(options.batchSize, 500);
      console.log(`📦 Batch size: ${config.batchSize}`);
    }
    
    if (options.outputDir) {
      config.outputDirectory = options.outputDir;
      console.log(`📁 Output directory: ${config.outputDirectory}`);
    }

    // Create scraper instance with custom config
    const scraper = new IGDBBulkScraper(config as ScrapingConfig);

    console.log('\n⚠️  IMPORTANT WARNINGS:');
    console.log('   • This operation may take several hours or days');
    console.log('   • IGDB discourages mass database downloading');
    console.log('   • Consider contacting IGDB for enterprise access');
    console.log('   • Press Ctrl+C to stop at any time\n');

    // Setup graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Received interrupt signal. Stopping scraper...');
      scraper.stopScraping();
    });

    process.on('SIGTERM', () => {
      console.log('\n🛑 Received termination signal. Stopping scraper...');
      scraper.stopScraping();
    });

    try {
      console.log('🚀 Starting bulk scraping operation...\n');
      
      const results = await scraper.startBulkScraping();
      
      console.log('\n🎉 Bulk scraping completed!');
      console.log('\n📊 SUMMARY:');
      console.log('===========');
      
      let totalRecords = 0;
      let totalErrors = 0;
      
      results.forEach(result => {
        const status = result.success ? '✅' : '❌';
        const duration = Math.round(result.duration / 1000);
        
        console.log(`${status} ${result.endpoint}: ${result.totalRecords} records (${duration}s)`);
        
        if (result.errors.length > 0) {
          console.log(`   Errors: ${result.errors.length}`);
          result.errors.slice(0, 3).forEach(error => {
            console.log(`     - ${error}`);
          });
        }
        
        totalRecords += result.totalRecords;
        totalErrors += result.errors.length;
      });
      
      console.log(`\n📈 Total records scraped: ${totalRecords.toLocaleString()}`);
      
      if (totalErrors > 0) {
        console.log(`⚠️  Total errors: ${totalErrors}`);
        console.log('   Check the detailed log files for more information');
      }
      
      console.log('\n💡 Next steps:');
      console.log('   • Review the scraping report in the output directory');
      console.log('   • Use --export-format to convert to CSV or SQL');
      console.log('   • Validate data integrity before using in production');
      
    } catch (error) {
      console.error('\n💥 Bulk scraping failed:', error);
      
      if (error instanceof Error) {
        console.error('Error details:', error.message);
        
        if (error.message.includes('401') || error.message.includes('authentication')) {
          console.error('\n🔐 Authentication Error:');
          console.error('   • Check your TWITCH_CLIENT_ID environment variable');
          console.error('   • Check your TWITCH_APP_ACCESS_TOKEN environment variable');
          console.error('   • Verify your Twitch app has IGDB API access');
        }
      }
      
      process.exit(1);
    }
  }
}

// Run the CLI if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const cli = new IGDBScrapingCLI();
  cli.run().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

export { IGDBScrapingCLI };