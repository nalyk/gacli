import { setColorEnabled, style } from './style.js';

class Logger {
  private verbose = false;

  setVerbose(v: boolean): void {
    this.verbose = v;
  }

  isVerbose(): boolean {
    return this.verbose;
  }

  setNoColor(noColor: boolean): void {
    setColorEnabled(!noColor);
  }

  info(msg: string): void {
    console.error(`${style('blue', 'ℹ', process.stderr)} ${msg}`);
  }

  success(msg: string): void {
    console.error(`${style('green', '✔', process.stderr)} ${msg}`);
  }

  warn(msg: string): void {
    console.error(`${style('yellow', '⚠', process.stderr)} ${msg}`);
  }

  error(msg: string): void {
    console.error(`${style('red', '✖', process.stderr)} ${msg}`);
  }

  debug(msg: string): void {
    if (this.verbose) {
      console.error(`${style('gray', '⬡', process.stderr)} ${msg}`);
    }
  }
}

export const logger = new Logger();
