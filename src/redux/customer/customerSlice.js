import { createSlice } from "@reduxjs/toolkit";

const getInitialCountry = () => {
  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    const branchParam = params.get("branch") || params.get("BRANCH");
    if (branchParam) {
      try {
        const decoded = decodeURIComponent(atob(branchParam)).toUpperCase().trim();
        if (["LN", "LI"].includes(decoded)) return "Singapore";
      } catch {}
      if (["LN", "LI"].includes(branchParam.toUpperCase().trim())) return "Singapore";
    }
    const stored = localStorage.getItem("selectedCountry");
    if (stored) return stored;
  }
  return "India";
};

const initialCountry = getInitialCountry();
const storedLocked = typeof window !== "undefined" && localStorage.getItem("isCountryLocked") === "true";

const initialState = {
    customer: [],
    selectedCustomerID: {},
    isOtherCustomer: false,
    isminorDisable: false,
    selectedCountry: initialCountry,
    currencySymbol: initialCountry === "Singapore" ? "S$" : "₹",
    currencyCode: initialCountry === "Singapore" ? "SGD" : "INR",
    isCountryLocked: storedLocked || initialCountry === "Singapore",
};

export const customerSlice = createSlice({
    name: 'customer',
    initialState,
    reducers: {
        setCustomer: (state, action) => {
            state.customer = action.payload;
        },
        setSelectedCustomerID: (state, action) => {
            state.selectedCustomerID = action.payload;
        },
        setIsOtherCustomer: (state, action) => {
            state.isOtherCustomer = action.payload;
        },
        setIsMinorDisable: (state, action) => {
            state.isminorDisable = action.payload;
        },
        setIsCountryLocked: (state, action) => {
            state.isCountryLocked = action.payload;
            if (typeof window !== "undefined") {
                localStorage.setItem("isCountryLocked", action.payload ? "true" : "false");
            }
        },
        setSelectedCountry: (state, action) => {
            if (state.isCountryLocked) return; // Prevent changing country if locked after mobile verification
            const country = action.payload;
            state.selectedCountry = country;
            state.currencySymbol = country === "Singapore" ? "S$" : "₹";
            state.currencyCode = country === "Singapore" ? "SGD" : "INR";
            if (typeof window !== "undefined") {
                localStorage.setItem("selectedCountry", country);
                localStorage.setItem("selectedCurrency", state.currencySymbol);
                localStorage.setItem("selectedCurrencyCode", state.currencyCode);
            }
        },
        // Force country from branch URL (works even when locked)
        forceSelectedCountry: (state, action) => {
            const country = action.payload;
            state.selectedCountry = country;
            state.currencySymbol = country === "Singapore" ? "S$" : "₹";
            state.currencyCode = country === "Singapore" ? "SGD" : "INR";
            state.isCountryLocked = true;
            if (typeof window !== "undefined") {
                localStorage.setItem("selectedCountry", country);
                localStorage.setItem("selectedCurrency", state.currencySymbol);
                localStorage.setItem("selectedCurrencyCode", state.currencyCode);
                localStorage.setItem("isCountryLocked", "true");
            }
        },
    }
});

export const { setCustomer, setSelectedCustomerID, setIsOtherCustomer, setIsMinorDisable, setSelectedCountry, setIsCountryLocked, forceSelectedCountry } = customerSlice.actions;
export default customerSlice.reducer;