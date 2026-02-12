import { ZodSchema, ZodError } from 'zod';
import { logger } from '../utils/logger.js';

export function validate<T>(schema: ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (err) {
    if (err instanceof ZodError) {
      const messages = err.errors.map((e) => `  ${e.path.join('.')}: ${e.message}`);
      logger.error('Validation failed:');
      messages.forEach((m) => console.error(m));
      process.exit(1);
    }
    throw err;
  }
}

export function validatePropertyId(property: string): string {
  if (!property) {
    logger.error('Property ID is required. Use -p <id> or set via: gacli config set property <id>');
    process.exit(1);
  }
  // Strip "properties/" prefix if present
  return property.replace(/^properties\//, '');
}
