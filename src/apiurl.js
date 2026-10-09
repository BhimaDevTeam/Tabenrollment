// ============================================================
//  API URL CONFIG  -  change base URLs here only
//  Hosted API : https://vrudhi.bhima.info/DraftEnrollmentApi
// ============================================================

const getEnv = () => {
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host.includes("suvarnagopura.com") || host === "192.168.10.32" || host.includes("192.168.10.32")) return "hosted";
    if (host.includes("sharaanapps.co.in")) return "production";
    if (host.includes("bhima.info")) return "network";
    if (host === "localhost" || host === "127.0.0.1") return "local";
  }
  return "network";
};

const ENV = getEnv();

const BASE_URLS = {
  local: "http://localhost:9000/api",
  hosted: "https://vrudhi.bhima.info/DraftEnrollmentApi/api",
  network: "https://vrudhi.bhima.info/DraftEnrollmentApi/api",
  production: "https://draftenrollment.sharaanapps.co.in/api",
};

const BASE_CAMERA_URL = {
  local: "http://localhost:9000",
  hosted: "https://vrudhi.bhima.info/DraftEnrollmentApi",
  network: "https://vrudhi.bhima.info/DraftEnrollmentApi",
  production: "https://vrudhicameranew.sharaanapps.co.in",
};

// ── Singapore API Base Overrides ──────────────────────────────────────
export const SG_COLLECTION_API = "https://vrudhi.bhima.info/DraftEnrollmentApi/api";
export const SG_BaseURL = "https://vrudhi.bhima.info/DraftEnrollmentApi";
export const SG_SCHEME_API = "https://suvarnagopura.com/VrudhiPortalAPISG/api/payment-gateway/scheme-details";

export const getCollectionApiUrl = (countryOrCode) => {
  const v = String(countryOrCode || "").toLowerCase();
  const isSg = v === "singapore" || v === "sg" || v === "sgd";
  if (isSg) {
    return SG_COLLECTION_API;
  }
  return BASE_URLS[ENV];
};

export const getBaseCameraUrl = (countryOrCode) => {
  const v = String(countryOrCode || "").toLowerCase();
  const isSg = v === "singapore" || v === "sg" || v === "sgd";
  if (isSg) {
    return SG_BaseURL;
  }
  return BASE_CAMERA_URL[ENV];
};

// ── Main Draft Enrollment API base ───────────────────────────────────
export const COLLECTION_API = BASE_URLS[ENV];
export const Drafttabledb = BASE_URLS[ENV];   // alias - kept for backward compatibility

// ── Camera / Image base URL ──────────────────────────────────────────
export const BaseURL = BASE_CAMERA_URL[ENV];

// ── External / Third-party APIs ──────────────────────────────────────
export const CustomerMobileOTP = "https://vrudhi.bhima.info/bhimaapi/api_db.js/api";
export const Mobileverification = `${COLLECTION_API}/customer-full-details`;
export const BHIMA_LIVE_CUSTOMER_API = "https://vrudhi.bhima.info/bhimaapi/api_db.js/api/GetCustomerDetails";
export const LegacyMobileverification = "https://vrudhi.bhima.info/bhimaapi/api_db.js/api/GetCustomerDetails";
export const CRM_CUSTOMER_DETAILS_API = "https://vrudhi.bhima.info/bhimaapi/api_db.js/api/GetCustomerDetails";
export const CRM_CUSTOMER_FALLBACK_API = "https://suvarnagopura.com/crm/api_db.js/api/GetCustomerDetails";
export const AadharAPI = "https://suvarnagopura.com/MagentoAPI/api_db.js/api";
export const PincodeAPI = "https://api.postalpincode.in/pincode";
export const DigiLockerAPI = "https://suvarnagopura.com/DIGILOCKER/api/digilocker";

export const getCustomerDetailsApiUrl = (countryOrCode) => {
  const v = String(countryOrCode || "").toLowerCase();
  const isSg = v === "singapore" || v === "sg" || v === "sgd";
  return isSg ? Mobileverification : BHIMA_LIVE_CUSTOMER_API;
};

// ── New member creation (portal) - country-specific ──────────────────
export const NEW_MEMBER_API_IN =
  "https://vrudhi.bhima.info/VrudhiPortalAPI/api/payment-gateway/newmember-creationTE";
export const NEW_MEMBER_API_SG =
  "https://suvarnagopura.com/VrudhiPortalAPISG/api/payment-gateway/newmember-creationTE";

export const getNewMemberApiUrl = (countryOrCode) => {
  const v = String(countryOrCode || "").toLowerCase();
  const isSg = v === "singapore" || v === "sg" || v === "sgd";
  return isSg ? NEW_MEMBER_API_SG : NEW_MEMBER_API_IN;
};
