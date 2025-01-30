import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export const formatCurrency = (value) => {
  if (isNaN(value)) return "RpNaN"; // Handle NaN values
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);
};

export const calculatePriceChange = (currentPrice, previousPrice) => {
  if (typeof currentPrice !== 'number' || typeof previousPrice !== 'number') {
    return { priceChange: 0, priceChangePercent: 0 }; // Default values if invalid
  }

  const priceChange = currentPrice - previousPrice;
  const priceChangePercent = (priceChange / previousPrice) * 100;

  return {
    priceChange,
    priceChangePercent: parseFloat(priceChangePercent.toFixed(2)), // Ensure it's a number
  };
};