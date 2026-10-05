import { styleText } from 'node:util';

type StyleFormat = Parameters<typeof styleText>[0];

let enabled = true;

export function setColorEnabled(value: boolean): void {
  enabled = value;
}

function forced(): boolean {
  const v = process.env.FORCE_COLOR;
  return v !== undefined && v !== '' && v !== '0' && v !== 'false';
}

// Data goes to stdout, so that is the default stream; the logger passes stderr.
export function style(
  format: StyleFormat,
  text: string,
  stream: NodeJS.WriteStream = process.stdout,
): string {
  if (!enabled || process.env.NO_COLOR) return text;
  if (!forced() && !stream.isTTY) return text;
  return styleText(format, text, { validateStream: false });
}
