import { createInterface } from 'node:readline/promises';

/**
 * Ask the user a Y/n question on stderr.
 *
 * Returns:
 *   - the user's choice (true/false) when stdin is a TTY
 *   - the `defaultIfNoTTY` value when stdin is not a TTY (e.g. CI, piped)
 *
 * Output goes to stderr so it doesn't pollute the data stdout.
 */
export async function askYesNo(
  question: string,
  defaultIfNoTTY: boolean,
  defaultAnswer: boolean = true,
): Promise<boolean> {
  if (!process.stdin.isTTY) {
    return defaultIfNoTTY;
  }

  const rl = createInterface({ input: process.stdin, output: process.stderr });
  try {
    const hint = defaultAnswer ? '[Y/n]' : '[y/N]';
    const answer = (await rl.question(`${question} ${hint} `)).trim().toLowerCase();
    if (!answer) return defaultAnswer;
    return answer === 'y' || answer === 'yes';
  } finally {
    rl.close();
  }
}

/** True iff we should prompt the user interactively. */
export function isInteractive(): boolean {
  return process.stdin.isTTY === true && process.stdout.isTTY === true;
}
