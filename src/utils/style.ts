import { styleText } from 'node:util';

type StyleFormat = Parameters<typeof styleText>[0];

let enabled = true;

export function setColorEnabled(value: boolean): void {
  enabled = value;
}

export function style(format: StyleFormat, text: string): string {
  if (!enabled || process.env.NO_COLOR) return text;
  // validateStream: false — colour decision is ours (flag/config/NO_COLOR), not stdout's TTY state
  return styleText(format, text, { validateStream: false });
}
