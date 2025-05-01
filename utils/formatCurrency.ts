/**
 * Formats a number as currency with a maximum of 2 decimal places.
 * - If the value has no decimal part, it shows no decimals (e.g., "₹100")
 * - If the value has decimals, it shows up to 2 decimal places (e.g., "₹100.50")
 * - Trims trailing zeros in decimal part (e.g., "₹100.50" not "₹100.50")
 * @param amount The amount to format
 * @param currencySymbol The currency symbol to use (default: ₹)
 * @returns Formatted currency string
 */
export const formatCurrency = (
  amount: number,
  currencySymbol: string = '₹'
): string => {
  // Handle NaN or undefined values
  if (amount === null || amount === undefined || isNaN(amount)) {
    return `${currencySymbol}0`;
  }

  // Format with up to 2 decimal places
  const formattedAmount = parseFloat(amount.toFixed(2));

  // Check if the formatted amount has decimal places
  if (formattedAmount % 1 === 0) {
    // For whole numbers (no decimal part), show no decimal places
    return `${currencySymbol}${formattedAmount.toFixed(0)}`;
  } else {
    // For numbers with decimal places, show up to 2 decimal places
    // Use a string manipulation approach to remove trailing zeros
    const amountStr = formattedAmount.toString();
    return `${currencySymbol}${amountStr}`;
  }
};