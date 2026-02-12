import chalk from 'chalk';
import boxen from 'boxen';
import { type ReportData } from '../types/common.js';

const MAX_BAR_WIDTH = 40;
const BAR_CHAR = '\u2588'; // Full block character

const BAR_COLORS = [
  chalk.green,
  chalk.blue,
  chalk.magenta,
  chalk.cyan,
  chalk.yellow,
  chalk.red,
];

/**
 * Format ReportData as a horizontal ASCII bar chart.
 *
 * The last column is treated as the numeric metric value.  All
 * preceding columns are concatenated to form the row label.  Bars are
 * normalised so the largest value spans MAX_BAR_WIDTH characters.
 */
export function formatChart(data: ReportData): string {
  if (data.rows.length === 0) {
    return chalk.yellow('No data to chart.');
  }

  if (data.headers.length < 2) {
    return chalk.red('Chart requires at least two columns (dimension + metric).');
  }

  const metricIndex = data.headers.length - 1;
  const metricHeader = data.headers[metricIndex];
  const dimensionHeaders = data.headers.slice(0, metricIndex);

  // Parse numeric values and build labels
  const entries: { label: string; value: number }[] = [];

  for (const row of data.rows) {
    const label = dimensionHeaders.map((_, i) => row[i]).join(' | ');
    const raw = row[metricIndex] ?? '0';
    const value = parseFloat(raw.replace(/,/g, ''));
    entries.push({ label, value: Number.isFinite(value) ? value : 0 });
  }

  const maxValue = Math.max(...entries.map((e) => e.value), 1);

  // Determine the widest label so we can align the bars
  const maxLabelWidth = Math.max(...entries.map((e) => e.label.length), 1);

  const lines: string[] = [];

  // Title
  const title = chalk.bold.white(
    `${metricHeader} by ${dimensionHeaders.join(', ')}`,
  );
  lines.push(title);
  lines.push('');

  for (let i = 0; i < entries.length; i++) {
    const { label, value } = entries[i];
    const barWidth = Math.round((value / maxValue) * MAX_BAR_WIDTH);
    const colorFn = BAR_COLORS[i % BAR_COLORS.length];

    const paddedLabel = label.padEnd(maxLabelWidth);
    const bar = colorFn(BAR_CHAR.repeat(Math.max(barWidth, 1)));
    const formattedValue = chalk.white.bold(formatNumber(value));

    lines.push(`  ${chalk.gray(paddedLabel)}  ${bar} ${formattedValue}`);
  }

  lines.push('');
  lines.push(chalk.gray(`${data.rowCount} row(s)`));

  const content = lines.join('\n');

  return boxen(content, {
    padding: 1,
    borderColor: 'gray',
    borderStyle: 'round',
    title: 'Chart',
    titleAlignment: 'left',
  });
}

/**
 * Format a number with locale-aware thousand separators for display.
 */
function formatNumber(n: number): string {
  if (Number.isInteger(n)) {
    return n.toLocaleString('en-US');
  }
  return n.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}
