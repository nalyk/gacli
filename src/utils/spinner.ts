export interface Spinner {
  stop(): void;
}

// ora (and its string-width dependency) is loaded only when a spinner is actually shown.
export async function startSpinner(text: string): Promise<Spinner> {
  const { default: ora } = await import('ora');
  return ora({ text, spinner: 'dots' }).start();
}
