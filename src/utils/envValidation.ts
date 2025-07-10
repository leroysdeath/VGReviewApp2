// Environment variable validation utilities
interface RequiredEnvVars {
  VITE_SUPABASE_URL: string;
  VITE_SUPABASE_ANON_KEY: string;
  VITE_IGDB_CLIENT_ID: string;
  VITE_IGDB_ACCESS_TOKEN: string;
}

interface OptionalEnvVars {
  VITE_APP_ENV?: string;
  VITE_APP_URL?: string;
  VITE_GOOGLE_ANALYTICS_ID?: string;
  VITE_SENTRY_DSN?: string;
}

export type EnvVars = RequiredEnvVars & OptionalEnvVars;

class EnvironmentValidator {
  private static instance: EnvironmentValidator;
  private validated = false;
  private envVars: Partial<EnvVars> = {};

  private constructor() {}

  static getInstance(): EnvironmentValidator {
    if (!EnvironmentValidator.instance) {
      EnvironmentValidator.instance = new EnvironmentValidator();
    }
    return EnvironmentValidator.instance;
  }

  validateEnvironment(): EnvVars {
    if (this.validated) {
      return this.envVars as EnvVars;
    }

    const requiredVars: (keyof RequiredEnvVars)[] = [
      'VITE_SUPABASE_URL',
      'VITE_SUPABASE_ANON_KEY',
      'VITE_IGDB_CLIENT_ID',
      'VITE_IGDB_ACCESS_TOKEN'
    ];

    const missingVars: string[] = [];
    const invalidVars: string[] = [];

    // Check required environment variables
    for (const varName of requiredVars) {
      const value = import.meta.env[varName];
      
      if (!value) {
        missingVars.push(varName);
      } else if (this.isPlaceholderValue(value)) {
        invalidVars.push(varName);
      } else {
        this.envVars[varName] = value;
      }
    }

    // Check optional environment variables
    const optionalVars: (keyof OptionalEnvVars)[] = [
      'VITE_APP_ENV',
      'VITE_APP_URL',
      'VITE_GOOGLE_ANALYTICS_ID',
      'VITE_SENTRY_DSN'
    ];

    for (const varName of optionalVars) {
      const value = import.meta.env[varName];
      if (value && !this.isPlaceholderValue(value)) {
        this.envVars[varName] = value;
      }
    }

    // Report errors
    if (missingVars.length > 0 || invalidVars.length > 0) {
      const errorMessages: string[] = [];
      
      if (missingVars.length > 0) {
        errorMessages.push(`Missing required environment variables: ${missingVars.join(', ')}`);
      }
      
      if (invalidVars.length > 0) {
        errorMessages.push(`Invalid placeholder values found for: ${invalidVars.join(', ')}`);
      }

      errorMessages.push('\nPlease check your .env file and ensure all required variables are set with valid values.');
      errorMessages.push('Copy .env.example to .env and fill in your actual API keys and URLs.');

      throw new Error(errorMessages.join('\n'));
    }

    // Validate URL formats
    this.validateUrls();

    this.validated = true;
    return this.envVars as EnvVars;
  }

  private isPlaceholderValue(value: string): boolean {
    const placeholders = [
      'your_supabase_project_url',
      'your_supabase_anon_key',
      'your_igdb_client_id',
      'your_igdb_access_token',
      'your_client_id_here',
      'your_access_token_here',
      'placeholder',
      'example',
      'test'
    ];

    return placeholders.some(placeholder => 
      value.toLowerCase().includes(placeholder.toLowerCase())
    );
  }

  private validateUrls(): void {
    const supabaseUrl = this.envVars.VITE_SUPABASE_URL;
    
    if (supabaseUrl) {
      try {
        const url = new URL(supabaseUrl);
        if (!url.hostname.includes('supabase.co') && !url.hostname.includes('localhost')) {
          console.warn('Supabase URL does not appear to be a valid Supabase URL');
        }
      } catch (error) {
        throw new Error(`Invalid VITE_SUPABASE_URL format: ${supabaseUrl}`);
      }
    }

    const appUrl = this.envVars.VITE_APP_URL;
    if (appUrl) {
      try {
        new URL(appUrl);
      } catch (error) {
        throw new Error(`Invalid VITE_APP_URL format: ${appUrl}`);
      }
    }
  }

  getEnvVar<K extends keyof EnvVars>(key: K): EnvVars[K] {
    if (!this.validated) {
      this.validateEnvironment();
    }
    return this.envVars[key];
  }

  isProduction(): boolean {
    return this.getEnvVar('VITE_APP_ENV') === 'production';
  }

  isDevelopment(): boolean {
    return this.getEnvVar('VITE_APP_ENV') === 'development' || !this.getEnvVar('VITE_APP_ENV');
  }
}

export const envValidator = EnvironmentValidator.getInstance();

// Convenience function to get validated environment variables
export const getEnvVars = (): EnvVars => {
  return envValidator.validateEnvironment();
};

// Convenience function to get a specific environment variable
export const getEnvVar = <K extends keyof EnvVars>(key: K): EnvVars[K] => {
  return envValidator.getEnvVar(key);
};

// Initialize validation on module load
try {
  envValidator.validateEnvironment();
} catch (error) {
  console.error('Environment validation failed:', error);
  
  // In development, show a user-friendly error
  if (import.meta.env.DEV) {
    // Allow development mode to continue with mock data
    console.warn('Running in development mode with mock data due to missing environment variables');
    
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
      position: fixed;
      top: 20px;
      left: 0;
      right: 0;
      background: rgba(255, 193, 7, 0.95);
      color: white;
      padding: 1rem;
      font-family: monospace;
      z-index: 9999;
      text-align: center;
      border-bottom: 3px solid #ff6b6b;
    `;
    errorDiv.innerHTML = `
      <strong style="color: #000;">⚠️ Development Mode: Missing API Credentials</strong>
      <span style="color: #000; margin-left: 1rem;">
        App running with mock data. Set up your .env file for full functionality.
        <button onclick="this.parentElement.parentElement.remove()" style="margin-left: 1rem; padding: 0.25rem 0.5rem; background: #000; color: white; border: none; border-radius: 3px; cursor: pointer;">Dismiss</button>
      </span>
    `;
    document.body.appendChild(errorDiv);
    
    // Auto-dismiss after 10 seconds
    setTimeout(() => {
      if (errorDiv.parentElement) {
        errorDiv.remove();
      }
    }, 10000);
  } else {
    // In production, this should still throw
    throw error;
  }
}
      </p>
    `;
    document.body.appendChild(errorDiv);
  }
}