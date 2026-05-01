import { logger } from './logger.js';

export function handleError(error: unknown): never {
  if (error instanceof Error) {
    const gRPCMatch = error.message.match(/(\d+)\s+(.*)/);
    if (gRPCMatch) {
      const code = parseInt(gRPCMatch[1], 10);
      const message = gRPCMatch[2];

      switch (code) {
        case 3:
          logger.error(`Invalid argument: ${message}`);
          process.exit(3);
          break;
        case 5:
          logger.error(`Not found: ${message}`);
          process.exit(5);
          break;
        case 7:
          logger.error(`Permission denied: ${message}`);
          process.exit(7);
          break;
        case 8:
          logger.error(`Resource exhausted (quota): ${message}`);
          process.exit(8);
          break;
        case 16:
          logger.error(
            `Unauthenticated: ${message}. Check your credentials or run \`gacli auth login\` to re-authenticate.`,
          );
          process.exit(16);
          break;
        default:
          logger.error(`API error (${code}): ${message}`);
          process.exit(1);
      }
    }
    logger.error(error.message);
    if (error.stack && process.env.GACLI_VERBOSE === '1') {
      console.error(error.stack);
    }
  } else {
    logger.error(String(error));
  }
  process.exit(1);
}
