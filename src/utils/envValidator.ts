import { REQUIRED_ENV_VARS, OPTIONAL_ENV_VARS } from '../config/constants';

interface ValidationResult {
  valid: boolean;
  missing: string[];
  warnings: string[];
}

/**
 * Validates that all required environment variables are set
 * Throws an error if any required variables are missing
 */
export function validateEnvironment(): void {
  const result = checkEnvironment();

  if (!result.valid) {
    console.error('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('CONFIGURATIE FOUT');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('De volgende vereiste omgevingsvariabelen ontbreken:');
    result.missing.forEach(varName => {
      console.error(`  - ${varName}`);
    });
    console.error('\nControleer je .env bestand en probeer opnieuw.');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    throw new Error(`Ontbrekende omgevingsvariabelen: ${result.missing.join(', ')}`);
  }

  // Log warnings for optional missing variables
  if (result.warnings.length > 0) {
    console.warn('\n⚠️  Optionele omgevingsvariabelen niet ingesteld:');
    result.warnings.forEach(varName => {
      console.warn(`  - ${varName}`);
    });
    console.warn('');
  }
}

/**
 * Checks environment variables without throwing
 * Returns validation result
 */
export function checkEnvironment(): ValidationResult {
  const missing: string[] = [];
  const warnings: string[] = [];

  // Check required variables
  for (const varName of REQUIRED_ENV_VARS) {
    if (!process.env[varName] || process.env[varName]?.trim() === '') {
      missing.push(varName);
    }
  }

  // Check optional variables (for warnings)
  for (const varName of OPTIONAL_ENV_VARS) {
    if (!process.env[varName] || process.env[varName]?.trim() === '') {
      warnings.push(varName);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
    warnings,
  };
}

/**
 * Gets an environment variable or throws if not set
 */
export function getRequiredEnv(varName: string): string {
  const value = process.env[varName];
  if (!value || value.trim() === '') {
    throw new Error(`Vereiste omgevingsvariabele ontbreekt: ${varName}`);
  }
  return value;
}

/**
 * Gets an optional environment variable with a default value
 */
export function getOptionalEnv(varName: string, defaultValue: string = ''): string {
  return process.env[varName] || defaultValue;
}
