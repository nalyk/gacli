export function resolveDate(input: string): string {
  // If already in YYYY-MM-DD format, return as-is
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    return input;
  }

  const today = new Date();

  // GA4 relative date keywords
  const relativeDates: Record<string, () => Date> = {
    today: () => today,
    yesterday: () => {
      const d = new Date(today);
      d.setDate(d.getDate() - 1);
      return d;
    },
  };

  if (relativeDates[input]) {
    return formatDate(relativeDates[input]());
  }

  // "NdaysAgo" format
  const daysAgoMatch = input.match(/^(\d+)daysAgo$/);
  if (daysAgoMatch) {
    const d = new Date(today);
    d.setDate(d.getDate() - parseInt(daysAgoMatch[1], 10));
    return formatDate(d);
  }

  // GA4 accepts these keywords directly
  if (['today', 'yesterday'].includes(input) || /^\d+daysAgo$/.test(input)) {
    return input;
  }

  return input;
}

function formatDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
