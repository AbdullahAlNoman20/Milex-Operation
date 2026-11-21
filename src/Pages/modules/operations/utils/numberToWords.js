// src/Pages/modules/operations/utils/numberToWords.js
const ONES = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];
const TENS = [
  "",
  "",
  "Twenty",
  "Thirty",
  "Forty",
  "Fifty",
  "Sixty",
  "Seventy",
  "Eighty",
  "Ninety",
];

const two = (n) =>
  n < 20
    ? ONES[n]
    : `${TENS[Math.floor(n / 10)]}${n % 10 ? ` ${ONES[n % 10]}` : ""}`;
const three = (n) =>
  [
    Math.floor(n / 100) ? `${ONES[Math.floor(n / 100)]} Hundred` : "",
    n % 100 ? two(n % 100) : "",
  ]
    .filter(Boolean)
    .join(" ");

// Bangladeshi numbering: Crore / Lakh / Thousand. 150000 ✈ "One Lakh Fifty Thousand Only"
export const amountInWordsBD = (value) => {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n) || n < 0) return "";
  if (n === 0) return "Zero Only";
  const parts = [
    [Math.floor(n / 10000000), "Crore"],
    [Math.floor((n % 10000000) / 100000), "Lakh"],
    [Math.floor((n % 100000) / 1000), "Thousand"],
  ]
    .filter(([v]) => v > 0)
    .map(([v, label]) => `${three(v)} ${label}`);
  if (n % 1000) parts.push(three(n % 1000));
  return `${parts.join(" ")} Only`;
};
