// Currency Utilities for India (INR / ₹) and Singapore (SGD / S$)

export const getStoredCountry = () => {
  return localStorage.getItem("selectedCountry") || "India";
};

export const getCurrencySymbol = () => {
  const country = getStoredCountry();
  return country === "Singapore" ? "S$" : "₹";
};

export const getCurrencyCode = () => {
  const country = getStoredCountry();
  return country === "Singapore" ? "SGD" : "INR";
};

export const formatCurrency = (amount, customSymbol) => {
  if (amount === undefined || amount === null || amount === "") return "";
  const num = Number(String(amount).replace(/,/g, ""));
  const symbol = customSymbol !== undefined ? customSymbol : getCurrencySymbol();
  if (isNaN(num)) return `${symbol}${amount}`;
  const locale = getStoredCountry() === "Singapore" ? "en-SG" : "en-IN";
  return `${symbol}${num.toLocaleString(locale)}`;
};

export const replaceCurrencySymbols = (text, customSymbol) => {
  if (!text || typeof text !== "string") return text;
  const symbol = customSymbol !== undefined ? customSymbol : getCurrencySymbol();
  if (symbol === "S$") {
    return text.replace(/₹/g, "S$").replace(/\bRs\.?\s*/gi, "S$ ");
  } else {
    return text.replace(/S\$/g, "₹");
  }
};
