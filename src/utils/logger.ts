import { setColorEnabled, style } from './style.js';

class Logger {
  private verbose = false;

  setVerbose(v: boolean): void {
    this.verbose = v;
  }

  setNoColor(noColor: boolean): void {
    setColorEnabled(!noColor);
  }

  info(msg: string): void {
    console.error(`${style('blue', 'ℹ')} ${msg}`);
  }

  success(msg: string): void {
    console.error(`${style('green', '✔')} ${msg}`);
  }

  warn(msg: string): void {
    console.error(`${style('yellow', '⚠')} ${msg}`);
  }

  error(msg: string): void {
    console.error(`${style('red', '✖')} ${msg}`);
  }

  debug(msg: string): void {
    if (this.verbose) {
      console.error(`${style('gray', '⬡')} ${msg}`);
    }
  }
}

export const logger = new Logger();
