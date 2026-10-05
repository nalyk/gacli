import type { z } from 'zod';
import { GacliError } from '../core/errors.js';

// Throws ZodError; handleError maps it to a usage error (exit 2).
export function validate<T>(schema: z.ZodType<T>, data: unknown): T {
  return schema.parse(data);
}

export function validatePropertyId(property: string): string {
  if (!property) {
    throw new GacliError('usage', 'Property ID is required.', {
      hint: 'Use -p <id> or set it via: gacli config set property <id>',
    });
  }
  const id = property.replace(/^properties\//, '');
  if (!/^\d+$/.test(id)) {
    throw new GacliError('usage', `Invalid property ID "${property}": expected digits`);
  }
  return id;
}
