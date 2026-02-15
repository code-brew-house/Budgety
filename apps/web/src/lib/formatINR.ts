/** Indian comma grouping: last 3 digits, then groups of 2. "100000" → "1,00,000" */
export function formatINR(value: string): string {
  const digits = value.replace(/[^0-9]/g, '');
  if (!digits) return '';
  if (digits.length <= 3) return digits;

  const last3 = digits.slice(-3);
  const rest = digits.slice(0, -3);
  const grouped = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return `${grouped},${last3}`;
}

/** Remove commas for numeric submission */
export function stripINRFormatting(value: string): string {
  return value.replace(/,/g, '');
}

/** Format a number as ₹ with Indian grouping */
export function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}
