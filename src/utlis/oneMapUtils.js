// ============================================================
//  ONEMAP SINGAPORE POSTAL CODE LOOKUP UTILITY
//  Authenticates and queries www.onemap.gov.sg API v2
// ============================================================

const ONEMAP_CREDENTIALS = {
  email: "pradeepbhat@sharaaninfo.com",
  password: "Sharaaninfo@2025",
};

let inMemoryToken = null;
let inMemoryExpiry = 0; // Unix epoch seconds

/**
 * Fetches an access token from OneMap API or returns cached token.
 */
export const getOneMapToken = async () => {
  const currentEpoch = Math.floor(Date.now() / 1000);

  // Return in-memory token if valid (with 5 min safety buffer)
  if (inMemoryToken && inMemoryExpiry > currentEpoch + 300) {
    return inMemoryToken;
  }

  // Check localStorage for persisted token
  try {
    const savedToken = localStorage.getItem("oneMap_token");
    const savedExpiry = Number(localStorage.getItem("oneMap_expiry") || 0);

    if (savedToken && savedExpiry > currentEpoch + 300) {
      inMemoryToken = savedToken;
      inMemoryExpiry = savedExpiry;
      return savedToken;
    }
  } catch (e) {}

  // Request fresh token from OneMap
  try {
    const response = await fetch("https://www.onemap.gov.sg/api/auth/post/getToken", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(ONEMAP_CREDENTIALS),
    });

    if (!response.ok) {
      console.warn("OneMap auth response not OK:", response.statusText);
      return null;
    }

    const data = await response.json();
    if (data && data.access_token) {
      inMemoryToken = data.access_token;
      inMemoryExpiry = Number(data.expiry_timestamp || currentEpoch + 86400);

      try {
        localStorage.setItem("oneMap_token", inMemoryToken);
        localStorage.setItem("oneMap_expiry", inMemoryExpiry.toString());
      } catch (e) {}

      return inMemoryToken;
    }
  } catch (err) {
    console.error("Error authenticating with OneMap Singapore API:", err);
  }
  return null;
};

/**
 * Searches Singapore Postal Code on OneMap and returns structured address details.
 * @param {string} postalCode - 6-digit Singapore postal code (e.g. "569933")
 */
export const searchSingaporePostal = async (postalCode) => {
  const cleanCode = String(postalCode || "").trim();
  if (!cleanCode || cleanCode.length !== 6 || isNaN(cleanCode)) {
    return null;
  }

  try {
    const token = await getOneMapToken();
    const headers = {};
    if (token) {
      headers["Authorization"] = token; // Raw token string (no Bearer prefix) per OneMap API
    }

    const url = `https://www.onemap.gov.sg/api/common/elastic/search?searchVal=${encodeURIComponent(cleanCode)}&returnGeom=Y&getAddrDetails=Y&pageNum=1`;
    const response = await fetch(url, { headers });

    if (!response.ok) {
      console.warn("OneMap search API response error:", response.statusText);
      return null;
    }

    const data = await response.json();
    if (data && data.found > 0 && Array.isArray(data.results) && data.results.length > 0) {
      const items = data.results.map((match) => {
        const blkNo = match.BLK_NO ? `Blk ${match.BLK_NO}` : "";
        const roadName = match.ROAD_NAME || "";
        const building = match.BUILDING && match.BUILDING !== "N/A" ? match.BUILDING : "";
        const streetAddress = [blkNo, roadName].filter(Boolean).join(" ");
        const fullAddress = match.ADDRESS || [streetAddress, building, "Singapore", cleanCode].filter(Boolean).join(", ");
        const displayLabel = [building, streetAddress].filter(Boolean).join(", ") || match.SEARCHVAL || match.ADDRESS || "Singapore";

        return {
          building,
          blkNo,
          roadName,
          streetAddress,
          fullAddress,
          displayLabel,
          postal: match.POSTAL || cleanCode,
          searchVal: match.SEARCHVAL || "",
          areaName: displayLabel,
          city: "Singapore",
          state: "Singapore",
        };
      });

      return {
        primary: items[0],
        allResults: items,
      };
    }
  } catch (err) {
    console.error("Error querying OneMap Singapore postal search:", err);
  }

  return null;
};
