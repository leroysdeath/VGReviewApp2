// IGDB Bulk Database Scraper
// WARNING: This tool should be used responsibly and in compliance with IGDB's terms of service
// Consider contacting IGDB at partner@igdb.com for enterprise access for large-scale operations

import fs from 'fs';
import path from 'path';

interface ScrapingConfig {
  batchSize: number;
  maxConcurrentRequests: number;
  requestsPerSecond: number;
  outputDirectory: string;
  endpoints: string[];
  resumeFrom?: number;
}

interface ScrapingProgress {
  endpoint: string;
  totalRecords: number;
  scrapedRecords: number;
  startTime: Date;
  lastUpdate: Date;
  estimatedCompletion?: Date;
}

interface BulkScrapingResult {
  success: boolean;
  endpoint: string;
  totalRecords: number;
  outputFile: string;
  duration: number;
  errors: string[];
}

class RateLimiter {
  private queue: (() => Promise<any>)[] = [];
  private running = 0;
  private lastRequestTime = 0;

  constructor(
    private maxConcurrent: number,
    private requestsPerSecond: number
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      
      this.process();
    });
  }

  private async process() {
    if (this.running >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    const fn = this.queue.shift()!;
    this.running++;

    // Rate limiting: ensure we don't exceed requests per second
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    const minInterval = 1000 / this.requestsPerSecond;

    if (timeSinceLastRequest < minInterval) {
      await new Promise(resolve => setTimeout(resolve, minInterval - timeSinceLastRequest));
    }

    this.lastRequestTime = Date.now();

    try {
      await fn();
    } finally {
      this.running--;
      this.process();
    }
  }
}

class IGDBBulkScraper {
  private rateLimiter: RateLimiter;
  private progress: Map<string, ScrapingProgress> = new Map();
  private isRunning = false;
  private shouldStop = false;

  constructor(
    private config: ScrapingConfig = {
      batchSize: 500,
      maxConcurrentRequests: 4, // Conservative to respect IGDB limits
      requestsPerSecond: 3.5, // Slightly under the 4/second limit
      outputDirectory: './igdb-data',
      endpoints: ['games', 'platforms', 'genres', 'companies', 'covers', 'screenshots']
    }
  ) {
    this.rateLimiter = new RateLimiter(
      config.maxConcurrentRequests,
      config.requestsPerSecond
    );
    
    // Ensure output directory exists
    this.ensureOutputDirectory();
  }

  /**
   * Start the bulk scraping process
   */
  async startBulkScraping(): Promise<BulkScrapingResult[]> {
    if (this.isRunning) {
      throw new Error('Bulk scraping is already in progress');
    }

    console.log('🚀 Starting IGDB bulk scraping...');
    console.log('⚠️  Please ensure you have proper authorization for bulk data access');
    console.log('📧 For large-scale operations, consider contacting IGDB at partner@igdb.com');

    this.isRunning = true;
    this.shouldStop = false;
    const results: BulkScrapingResult[] = [];

    try {
      // Create output directory with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const sessionDir = path.join(this.config.outputDirectory, `scraping-session-${timestamp}`);
      await fs.promises.mkdir(sessionDir, { recursive: true });

      // Scrape each endpoint
      for (const endpoint of this.config.endpoints) {
        if (this.shouldStop) {
          console.log('🛑 Scraping stopped by user');
          break;
        }

        console.log(`\n📊 Starting to scrape endpoint: ${endpoint}`);
        const result = await this.scrapeEndpoint(endpoint, sessionDir);
        results.push(result);

        if (!result.success) {
          console.error(`❌ Failed to scrape ${endpoint}:`, result.errors);
        } else {
          console.log(`✅ Successfully scraped ${endpoint}: ${result.totalRecords} records`);
        }
      }

      // Generate summary report
      await this.generateSummaryReport(sessionDir, results);

    } finally {
      this.isRunning = false;
    }

    return results;
  }

  /**
   * Stop the current scraping process
   */
  stopScraping(): void {
    console.log('🛑 Stopping bulk scraping...');
    this.shouldStop = true;
  }

  /**
   * Scrape a specific endpoint
   */
  async scrapeEndpoint(endpoint: string, outputDir: string): Promise<BulkScrapingResult> {
    const startTime = Date.now();
    const outputFile = path.join(outputDir, `${endpoint}.json`);
    const progressFile = path.join(outputDir, `${endpoint}-progress.json`);
    
    let allData: any[] = [];
    let offset = this.config.resumeFrom || 0;
    let totalRecords = 0;
    const errors: string[] = [];
    let hasMore = true;

    // Initialize progress tracking
    this.progress.set(endpoint, {
      endpoint,
      totalRecords: 0,
      scrapedRecords: 0,
      startTime: new Date(),
      lastUpdate: new Date()
    });

    try {
      while (hasMore && !this.shouldStop) {
        try {
          const batch = await this.rateLimiter.execute(() =>
            this.fetchBatch(endpoint, offset, this.config.batchSize)
          );

          if (batch.length === 0) {
            hasMore = false;
            break;
          }

          allData.push(...batch);
          totalRecords += batch.length;
          offset += this.config.batchSize;

          // Update progress
          const progress = this.progress.get(endpoint)!;
          progress.scrapedRecords = totalRecords;
          progress.lastUpdate = new Date();
          progress.totalRecords = totalRecords; // This will be updated as we go

          console.log(`📈 ${endpoint}: Scraped ${totalRecords} records (offset: ${offset})`);

          // Save progress periodically
          if (totalRecords % (this.config.batchSize * 5) === 0) {
            await this.saveProgress(progressFile, {
              endpoint,
              totalRecords,
              currentOffset: offset,
              timestamp: new Date().toISOString()
            });

            // Also save partial data
            await this.saveToFile(outputFile, allData, true);
          }

          // Check if we got fewer records than requested (end of data)
          if (batch.length < this.config.batchSize) {
            hasMore = false;
          }

        } catch (error) {
          const errorMsg = `Error at offset ${offset}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          console.error(`❌ ${errorMsg}`);

          // Continue with next batch if error is not critical
          if (errors.length > 10) {
            console.error('🚨 Too many errors, stopping endpoint scraping');
            break;
          }

          offset += this.config.batchSize; // Skip the problematic batch
        }
      }

      // Save final data
      await this.saveToFile(outputFile, allData);

      // Clean up progress file on successful completion
      try {
        await fs.promises.unlink(progressFile);
      } catch (e) {
        // Progress file might not exist, ignore
      }

      return {
        success: true,
        endpoint,
        totalRecords,
        outputFile,
        duration: Date.now() - startTime,
        errors
      };

    } catch (error) {
      errors.push(`Fatal error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      return {
        success: false,
        endpoint,
        totalRecords,
        outputFile,
        duration: Date.now() - startTime,
        errors
      };
    }
  }

  /**
   * Fetch a batch of data from IGDB API
   */
  private async fetchBatch(endpoint: string, offset: number, limit: number): Promise<any[]> {
    const requestBody = this.buildRequestBody(endpoint, offset, limit);
    
    console.log(`🌐 Fetching ${endpoint} batch: offset=${offset}, limit=${limit}`);

    const response = await fetch('/.netlify/functions/igdb-search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        endpoint,
        requestBody,
        isBulkRequest: true,
        offset,
        limit
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return Array.isArray(data) ? data : data.games || data.data || [];
  }

  /**
   * Build request body for different endpoints
   */
  private buildRequestBody(endpoint: string, offset: number, limit: number): string {
    const baseFields = this.getEndpointFields(endpoint);
    
    return `
fields ${baseFields};
limit ${limit};
offset ${offset};
sort id asc;
    `.trim();
  }

  /**
   * Get appropriate fields for each endpoint
   */
  private getEndpointFields(endpoint: string): string {
    const fieldMap: Record<string, string> = {
      games: 'id,name,slug,summary,storyline,first_release_date,rating,rating_count,aggregated_rating,aggregated_rating_count,category,status,cover.url,platforms.name,platforms.id,genres.name,genres.id,themes.name,game_modes.name,player_perspectives.name,involved_companies.company.name,involved_companies.developer,involved_companies.publisher,franchises.name,collection.name,release_dates.date,release_dates.platform.name,age_ratings.rating,age_ratings.category,keywords.name,language_supports.language.name,multiplayer_modes.campaigncoop,multiplayer_modes.dropin,multiplayer_modes.lancoop,multiplayer_modes.offlinecoop,multiplayer_modes.onlinecoop,multiplayer_modes.splitscreen,game_engines.name,alternative_names.name,websites.url,websites.category',
      
      platforms: 'id,name,slug,abbreviation,alternative_name,category,generation,summary,url,platform_logo.url,platform_family.name,versions.name,websites.url',
      
      genres: 'id,name,slug,url',
      
      companies: 'id,name,slug,country,description,developed.name,published.name,logo.url,websites.url',
      
      covers: 'id,url,game.id,game.name,image_id,width,height',
      
      screenshots: 'id,url,game.id,game.name,image_id,width,height',
      
      artworks: 'id,url,game.id,game.name,image_id,width,height',
      
      characters: 'id,name,slug,description,games.name,mug_shot.url',
      
      people: 'id,name,slug,description,country',
      
      themes: 'id,name,slug,url',
      
      game_modes: 'id,name,slug,url',
      
      player_perspectives: 'id,name,slug,url',
      
      franchises: 'id,name,slug,url,games.name',
      
      collections: 'id,name,slug,url,games.name',
      
      keywords: 'id,name,slug,url',
      
      language_supports: 'id,game.name,language.name,language_support_type.name',
      
      multiplayer_modes: 'id,game.name,campaigncoop,dropin,lancoop,offlinecoop,onlinecoop,splitscreen',
      
      age_ratings: 'id,game.name,category,rating,rating_cover_url,synopsis',
      
      websites: 'id,game.name,category,trusted,url',
      
      release_dates: 'id,game.name,date,human,platform.name,region.name',
      
      game_engines: 'id,name,slug,description,logo.url,companies.name',
      
      alternative_names: 'id,game.name,name,comment',
      
      external_games: 'id,game.name,category,name,uid,url'
    };

    return fieldMap[endpoint] || '*';
  }

  /**
   * Save data to JSON file
   */
  private async saveToFile(filePath: string, data: any[], partial = false): Promise<void> {
    const jsonData = {
      metadata: {
        endpoint: path.basename(filePath, '.json'),
        totalRecords: data.length,
        scrapedAt: new Date().toISOString(),
        isPartial: partial,
        version: '1.0'
      },
      data
    };

    await fs.promises.writeFile(filePath, JSON.stringify(jsonData, null, 2), 'utf8');
  }

  /**
   * Save scraping progress
   */
  private async saveProgress(filePath: string, progress: any): Promise<void> {
    await fs.promises.writeFile(filePath, JSON.stringify(progress, null, 2), 'utf8');
  }

  /**
   * Generate summary report
   */
  private async generateSummaryReport(sessionDir: string, results: BulkScrapingResult[]): Promise<void> {
    const reportPath = path.join(sessionDir, 'scraping-report.json');
    
    const report = {
      sessionInfo: {
        startTime: new Date().toISOString(),
        totalEndpoints: results.length,
        successfulEndpoints: results.filter(r => r.success).length,
        failedEndpoints: results.filter(r => !r.success).length,
        configuration: this.config
      },
      results,
      summary: {
        totalRecordsScraped: results.reduce((sum, r) => sum + r.totalRecords, 0),
        totalDuration: results.reduce((sum, r) => sum + r.duration, 0),
        totalErrors: results.reduce((sum, r) => sum + r.errors.length, 0)
      },
      recommendations: [
        "Review any error logs for failed endpoints",
        "Consider rate limiting if experiencing API errors",
        "For large-scale operations, contact IGDB at partner@igdb.com",
        "Validate data integrity before using in production"
      ]
    };

    await fs.promises.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf8');
    console.log(`📋 Scraping report saved: ${reportPath}`);
  }

  /**
   * Ensure output directory exists
   */
  private async ensureOutputDirectory(): Promise<void> {
    try {
      await fs.promises.mkdir(this.config.outputDirectory, { recursive: true });
    } catch (error) {
      console.warn('Could not create output directory:', error);
    }
  }

  /**
   * Get current progress for all endpoints
   */
  getProgress(): ScrapingProgress[] {
    return Array.from(this.progress.values());
  }

  /**
   * Check if scraping is currently running
   */
  isScrapingActive(): boolean {
    return this.isRunning;
  }

  /**
   * Resume scraping from a specific offset for an endpoint
   */
  async resumeEndpoint(endpoint: string, fromOffset: number): Promise<BulkScrapingResult> {
    const sessionDir = path.join(this.config.outputDirectory, `resume-${endpoint}-${Date.now()}`);
    await fs.promises.mkdir(sessionDir, { recursive: true });
    
    console.log(`📤 Resuming scraping for ${endpoint} from offset ${fromOffset}`);
    
    // Temporarily update config
    const originalResumeFrom = this.config.resumeFrom;
    this.config.resumeFrom = fromOffset;
    
    try {
      return await this.scrapeEndpoint(endpoint, sessionDir);
    } finally {
      this.config.resumeFrom = originalResumeFrom;
    }
  }

  /**
   * Export scraped data in different formats
   */
  async exportData(inputDir: string, format: 'json' | 'csv' | 'sql' = 'json'): Promise<string[]> {
    const exportDir = path.join(inputDir, `export-${format}`);
    await fs.promises.mkdir(exportDir, { recursive: true });
    
    const exportedFiles: string[] = [];
    
    // Find all JSON data files in input directory
    const files = await fs.promises.readdir(inputDir);
    const dataFiles = files.filter(f => f.endsWith('.json') && !f.includes('progress') && !f.includes('report'));
    
    for (const file of dataFiles) {
      const inputPath = path.join(inputDir, file);
      const data = JSON.parse(await fs.promises.readFile(inputPath, 'utf8'));
      
      const baseName = path.basename(file, '.json');
      let outputPath: string;
      
      switch (format) {
        case 'csv':
          outputPath = path.join(exportDir, `${baseName}.csv`);
          await this.exportToCSV(data.data, outputPath);
          break;
          
        case 'sql':
          outputPath = path.join(exportDir, `${baseName}.sql`);
          await this.exportToSQL(data.data, baseName, outputPath);
          break;
          
        default:
          outputPath = path.join(exportDir, file);
          await fs.promises.copyFile(inputPath, outputPath);
      }
      
      exportedFiles.push(outputPath);
    }
    
    return exportedFiles;
  }

  /**
   * Export data to CSV format
   */
  private async exportToCSV(data: any[], outputPath: string): Promise<void> {
    if (data.length === 0) return;
    
    // Get all unique keys for headers
    const headers = Array.from(new Set(data.flatMap(item => Object.keys(item))));
    
    const csvContent = [
      headers.join(','),
      ...data.map(item => 
        headers.map(header => {
          let value = item[header];
          if (typeof value === 'object') value = JSON.stringify(value);
          if (typeof value === 'string') value = `"${value.replace(/"/g, '""')}"`;
          return value || '';
        }).join(',')
      )
    ].join('\n');
    
    await fs.promises.writeFile(outputPath, csvContent, 'utf8');
  }

  /**
   * Export data to SQL format
   */
  private async exportToSQL(data: any[], tableName: string, outputPath: string): Promise<void> {
    if (data.length === 0) return;
    
    const sqlStatements: string[] = [];
    
    // Create table statement (simplified)
    const sampleItem = data[0];
    const columns = Object.keys(sampleItem).map(key => `${key} TEXT`).join(', ');
    sqlStatements.push(`CREATE TABLE IF NOT EXISTS ${tableName} (${columns});`);
    
    // Insert statements
    for (const item of data) {
      const values = Object.values(item).map(value => {
        if (value === null || value === undefined) return 'NULL';
        if (typeof value === 'object') return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
        return `'${String(value).replace(/'/g, "''")}'`;
      });
      
      sqlStatements.push(`INSERT INTO ${tableName} VALUES (${values.join(', ')});`);
    }
    
    await fs.promises.writeFile(outputPath, sqlStatements.join('\n'), 'utf8');
  }
}

// Export the scraper class and a singleton instance
export { IGDBBulkScraper, ScrapingConfig, ScrapingProgress, BulkScrapingResult };

// Create and export default instance
export const igdbBulkScraper = new IGDBBulkScraper();