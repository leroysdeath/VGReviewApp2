/**
 * Vite Plugin for CSP Hash Generation
 * Generates SHA-256 hashes for inline scripts at build time
 * These hashes are used in Content Security Policy headers
 */

import { createHash } from 'crypto';
import type { Plugin } from 'vite';
import fs from 'fs';
import path from 'path';

interface CSPGuardOptions {
  /**
   * Output file for generated hashes
   */
  outputFile?: string;
  /**
   * Algorithm for hash generation
   */
  algorithm?: 'sha256' | 'sha384' | 'sha512';
  /**
   * Enable detailed logging
   */
  verbose?: boolean;
}

interface ScriptHash {
  hash: string;
  content: string;
  source: string;
}

export function vitePluginCSPGuard(options: CSPGuardOptions = {}): Plugin {
  const {
    outputFile = 'csp-hashes.json',
    algorithm = 'sha256',
    verbose = false
  } = options;

  const scriptHashes: ScriptHash[] = [];
  const styleHashes: ScriptHash[] = [];

  /**
   * Generate hash for content
   */
  function generateHash(content: string): string {
    const hash = createHash(algorithm);
    hash.update(content);
    return hash.digest('base64');
  }

  /**
   * Extract and hash inline scripts from HTML
   */
  function processHtml(html: string, id: string): string {
    // Find inline scripts
    const scriptRegex = /<script(?![^>]*\ssrc=)([^>]*)>([\s\S]*?)<\/script>/gi;
    let match;

    while ((match = scriptRegex.exec(html)) !== null) {
      const scriptContent = match[2].trim();
      if (scriptContent) {
        const hash = generateHash(scriptContent);
        scriptHashes.push({
          hash: `'${algorithm}-${hash}'`,
          content: scriptContent.substring(0, 100) + '...',
          source: id
        });

        if (verbose) {
          console.log(`📝 Found inline script in ${id}`);
          console.log(`   Hash: ${algorithm}-${hash}`);
        }
      }
    }

    // Find inline styles
    const styleRegex = /<style([^>]*)>([\s\S]*?)<\/style>/gi;
    while ((match = styleRegex.exec(html)) !== null) {
      const styleContent = match[2].trim();
      if (styleContent) {
        const hash = generateHash(styleContent);
        styleHashes.push({
          hash: `'${algorithm}-${hash}'`,
          content: styleContent.substring(0, 100) + '...',
          source: id
        });

        if (verbose) {
          console.log(`🎨 Found inline style in ${id}`);
          console.log(`   Hash: ${algorithm}-${hash}`);
        }
      }
    }

    // Find event handler attributes (these would need refactoring)
    const eventHandlerRegex = /\s(on\w+)=["']([^"']+)["']/gi;
    const eventHandlers: string[] = [];
    while ((match = eventHandlerRegex.exec(html)) !== null) {
      eventHandlers.push(`${match[1]}="${match[2]}"`);
    }

    if (eventHandlers.length > 0 && verbose) {
      console.warn(`⚠️  Found inline event handlers in ${id}:`);
      eventHandlers.forEach(handler => console.warn(`   ${handler}`));
    }

    return html;
  }

  /**
   * Generate CSP header with hashes
   */
  function generateCSPHeader(): string {
    const scriptSrc = [
      "'self'",
      // Add hashes for inline scripts
      ...scriptHashes.map(h => h.hash),
      // RevenueCat domains
      'https://api.revenuecat.com',
      'https://sdk.revenuecat.com',
      'https://app.revenuecat.com',
      // Existing domains
      'https://*.supabase.co',
      'https://*.netlify.app',
      'https://www.googletagmanager.com',
      'https://www.google-analytics.com'
    ].join(' ');

    const styleSrc = [
      "'self'",
      // Keep unsafe-inline for React styles for now
      // In production, we could use hashes for critical styles
      "'unsafe-inline'",
      'https://fonts.googleapis.com'
    ].join(' ');

    const connectSrc = [
      "'self'",
      // RevenueCat API endpoints
      'https://api.revenuecat.com',
      'https://purchases.revenuecat.com',
      'https://api.segment.io', // If using RevenueCat analytics
      // Existing endpoints
      'https://*.supabase.co',
      'https://api.igdb.com',
      'wss://*.supabase.co',
      'https://www.google-analytics.com',
      'https://images.igdb.com'
    ].join(' ');

    const frameSrc = [
      "'self'",
      // RevenueCat checkout
      'https://checkout.revenuecat.com'
    ].join(' ');

    return `default-src 'self'; script-src ${scriptSrc}; style-src ${styleSrc}; img-src 'self' data: https: blob:; font-src 'self' data: https://fonts.gstatic.com; connect-src ${connectSrc}; frame-src ${frameSrc}; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests; report-uri /csp-report;`;
  }

  return {
    name: 'vite-plugin-csp-guard',

    transformIndexHtml(html, ctx) {
      if (verbose) {
        console.log('🔍 Analyzing HTML for CSP...');
      }

      return processHtml(html, ctx.filename);
    },

    generateBundle(_options, bundle) {
      // Process all HTML files in the bundle
      for (const [fileName, asset] of Object.entries(bundle)) {
        if (asset.type === 'asset' && fileName.endsWith('.html')) {
          const html = asset.source as string;
          processHtml(html, fileName);
        }
      }
    },

    writeBundle() {
      // Write hashes to file
      const output = {
        generated: new Date().toISOString(),
        algorithm,
        scripts: scriptHashes,
        styles: styleHashes,
        cspHeader: generateCSPHeader(),

        // Separate headers for different route types
        headers: {
          // Standard header for public routes
          public: generateCSPHeader(),

          // Stricter header for payment routes (future use)
          payment: generateCSPHeader().replace("'unsafe-inline'", ''),

          // Report-only for testing
          reportOnly: generateCSPHeader()
        },

        // RevenueCat specific requirements
        revenueCat: {
          requiredDomains: [
            'https://api.revenuecat.com',
            'https://sdk.revenuecat.com',
            'https://purchases.revenuecat.com',
            'https://checkout.revenuecat.com'
          ],
          optionalDomains: [
            'https://api.segment.io' // For analytics
          ]
        }
      };

      const outputPath = path.resolve(process.cwd(), outputFile);
      fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

      console.log(`\n✅ CSP hashes generated: ${outputPath}`);
      console.log(`   📝 Scripts: ${scriptHashes.length} hashes`);
      console.log(`   🎨 Styles: ${styleHashes.length} hashes`);

      if (scriptHashes.length > 0) {
        console.log('\n📋 Add these hashes to your CSP script-src:');
        scriptHashes.forEach(h => {
          console.log(`   ${h.hash}`);
        });
      }

      console.log('\n🔒 Generated CSP Header:');
      console.log(generateCSPHeader());
    }
  };
}