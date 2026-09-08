import React, { useState, useEffect } from "react";
import { COLLECTION_API } from "./apiurl";
import { useSelector, useDispatch } from "react-redux";
import { useLocation } from "react-router-dom";
import { formatCurrency } from "./utlis/currencyUtils";
import { setSelectedCountry } from "./redux/customer/customerSlice";

// Singapore branch codes — always locked to Singapore
const SINGAPORE_BRANCHES = ["LN", "LI"];

const isSingaporeBranch = (branchCode) => {
  if (!branchCode) return false;
  return SINGAPORE_BRANCHES.includes((branchCode || "").toUpperCase().trim());
};

const Header = ({ branch }) => {
  const dispatch = useDispatch();
  const location = useLocation();
  const { currencySymbol, selectedCountry, isCountryLocked } = useSelector((state) => state.customer || {});
  const activeSymbol = currencySymbol || "₹";
  const currentCountry = selectedCountry || "India";

  // Lock country selection when branch URL is present OR on enrollment sub-pages
  const currentPath = (location.pathname || "").toLowerCase();
  const isPageLocked = currentPath.includes("mobilever") || currentPath.includes("mypage");

  const storedBranch = typeof window !== "undefined" ? localStorage.getItem("decodedBranch") : null;
  const urlHasBranch = typeof window !== "undefined"
    ? !!(new URLSearchParams(window.location.search).get("branch") || new URLSearchParams(window.location.search).get("BRANCH"))
    : false;
  const isSgBranch = isSingaporeBranch(storedBranch) || isSingaporeBranch(branch);

  // Always lock when opened with a branch URL (India or Singapore) — country cannot be changed
  const isLocked = isPageLocked || isSgBranch || !!storedBranch || urlHasBranch || !!isCountryLocked;

  const [rates, setRates] = useState({
    silver: null,
    gold22: null,
    gold24: null,
    gold18: null,
  });
  const [displayBranch, setDisplayBranch] = useState("KRM");

  const fromBase64 = (val) => {
    try {
      return decodeURIComponent(atob(val));
    } catch {
      return val;
    }
  };

  // ─── Decode branch: always try Base64 (TE4= → LN, etc.) ───────────────────
  const decodeBranch = (raw) => {
    if (!raw) return null;
    try {
      const decoded = decodeURIComponent(atob(raw));
      // Only accept if decoded result looks like a plain branch code (letters/digits)
      if (/^[A-Za-z0-9_-]+$/.test(decoded)) return decoded;
    } catch {}
    return raw; // return as-is if not valid Base64
  };

  useEffect(() => {
    // Priority 1: Use the already-decoded branch saved by Mobile.jsx
    const storedDecoded = localStorage.getItem("decodedBranch");

    let cleanBranch = storedDecoded;

    if (!cleanBranch) {
      // Priority 2: Read from prop or URL param
      let raw = branch;
      if (!raw) {
        const urlParams = new URLSearchParams(window.location.search);
        raw = urlParams.get("branch") || urlParams.get("BRANCH") || null;
      }
      if (raw) {
        cleanBranch = decodeBranch(raw);
      }
    }

    const finalBranch = (cleanBranch || "KRM").toUpperCase();
    setDisplayBranch(finalBranch);
    fetchRates(finalBranch);
  }, [branch, selectedCountry]); // re-fetch when country changes (India ↔ Singapore)

  const fetchRates = async (branchCode) => {
    // Detect Singapore by Redux state OR by branch code directly (handles first load race)
    const sgBranches = ["LN", "LI"];
    const isSingapore = currentCountry === "Singapore"
      || sgBranches.includes((branchCode || "").toUpperCase().trim())
      || localStorage.getItem("selectedCountry") === "Singapore";

    const baseUrl = isSingapore ? "https://suvarnagopura.com/VrudhiPortalAPISG" : "https://vrudhi.bhima.info/VrudhiPortalAPI";
    const primaryUrl = `${baseUrl}/api/payment-gateway/goldrate-details/${branchCode.toLowerCase()}`;
    const fallbackUrl = `${COLLECTION_API}/goldrate?branch=${branchCode.toUpperCase()}`;

    try {
      let data = null;
      try {
        const response = await fetch(primaryUrl, {
          headers: {
            Key: "WEYA5TXDZCEEZFG9CLATH37HFV84AMH6794CVYGVY8WXS52",
          },
        });
        if (response.ok) {
          data = await response.json();
        }
      } catch (err) {
        console.warn("Primary goldrate API failed, trying fallback:", err);
      }

      if (!data || !Array.isArray(data) || data.length === 0 || data.Message) {
        const response = await fetch(fallbackUrl);
        if (response.ok) {
          const resObj = await response.json();
          data = resObj.data || resObj;
        }
      }

      if (Array.isArray(data) && data.length > 0) {
        let silver = null;
        let gold22 = null;
        let gold24 = null;
        let gold18 = null;

        data.forEach((item) => {
          const id = Number(item.CommodityTypeID);
          const rate = Number(item.Rate);
          if ((id === 2 || id === 7) && !silver) silver = rate;
          if ((id === 1 || id === 5 || id === 9) && !gold22) gold22 = rate;
          if ((id === 3 || id === 8) && !gold24) gold24 = rate;
          if (id === 6 && !gold18) gold18 = rate;
        });

        setRates({ silver, gold22, gold24, gold18 });
      }
    } catch (err) {
      console.warn("Failed to fetch gold rates:", err);
    }
  };

  const handleCountrySelect = (country) => {
    if (isLocked) {
      return;
    }
    dispatch(setSelectedCountry(country));
  };

  const silverRate = rates.silver ? `${formatCurrency(rates.silver, activeSymbol)}/g` : `${activeSymbol}355/g`;
  const gold22Rate = rates.gold22 ? `${formatCurrency(rates.gold22, activeSymbol)}/g` : `${activeSymbol}14,650/g`;

  return (
    <div className="app-rates-header" style={{ width: "100%", maxWidth: "1100px", margin: "0 auto 8px auto", padding: "0 4px", boxSizing: "border-box", fontFamily: "'Inter', sans-serif" }}>
      <div className="app-rates-bar">
        <div className="app-rates-row">
          <div className="app-rates-left">
            <span className="app-rates-badge">✦ RATES</span>
            <span className="app-rate-item">
              <span className="app-rate-label silver">Silver</span>
              <span className="app-rate-value">{silverRate}</span>
            </span>
            <span className="app-rate-sep">|</span>
            <span className="app-rate-item">
              <span className="app-rate-label gold">22K Gold</span>
              <span className="app-rate-value">{gold22Rate}</span>
            </span>
          </div>

          <div className="app-country-chip">
            {isLocked ? (
              <span className="app-country-active" title={currentCountry === "Singapore" ? "Singapore" : "India"}>
                <span>{currentCountry === "Singapore" ? "🇸🇬" : "🇮🇳"}</span>
                <span className="app-country-name app-country-short">{currentCountry === "Singapore" ? "SG" : "IN"}</span>
                <span className="app-country-name app-country-full">{currentCountry === "Singapore" ? "Singapore" : "India"}</span>
              </span>
            ) : (
              <>
                <button
                  type="button"
                  className={`app-country-btn${currentCountry === "India" ? " is-active" : ""}`}
                  onClick={() => handleCountrySelect("India")}
                >
                  <span className="app-country-short">🇮🇳 IN</span>
                  <span className="app-country-full">🇮🇳 India</span>
                </button>
                <button
                  type="button"
                  className={`app-country-btn${currentCountry === "Singapore" ? " is-active" : ""}`}
                  onClick={() => handleCountrySelect("Singapore")}
                >
                  <span className="app-country-short">🇸🇬 SG</span>
                  <span className="app-country-full">🇸🇬 Singapore</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;
