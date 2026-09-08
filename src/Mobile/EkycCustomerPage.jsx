import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import "./Mobile.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import { useSelector } from "react-redux";
import { formatCurrency } from "../utlis/currencyUtils";
import { DigiLockerAPI } from "../apiurl";
import { Drafttabledb } from "../apiurl";


const MAX_POLLS = 180;

const SCHEME_TERMS_MAP = {
  KUBERA: {
    title: "BHIMA KUBERA SCHEME - TERMS & CONDITIONS",
    clauses: [
      "1. Enrollment & Installments: Subscribers shall pay 11 equal monthly installments. Installments must be paid on or before the due date each month.",
      "2. Duration & Maturity: Scheme maturity is 330 days (11 months) from the date of initial enrollment.",
      "3. Scheme Benefit: Upon successful completion of 11 installments, the customer is entitled to 100% discount on Value Addition (making charges) up to specified limits, or 1 month bonus installment benefit as applicable.",
      "4. Redemption: Redemption is permitted solely against Gold Jewelry/Ornaments at authorized Bhima Gold outlets. Cash refunds or cash redemptions are strictly prohibited under any circumstances.",
      "5. Default/Non-Payment: In case of skipped or delayed installments, the bonus benefit / making charge discount will be recalculated or prorated based on actual installment count.",
      "6. Pre-closure: Pre-closure prior to completion of 6 months will disqualify the account from receiving any scheme discount or bonus benefits.",
      "7. Identity Verification: Valid government photo ID proof (Aadhaar / PAN) and KYC verification are mandatory for scheme enrollment and redemption.",
      "8. Taxes & Duties: All applicable statutory taxes including GST, TCS, or government levies at the time of final billing/redemption shall be borne by the customer.",
      "9. Transferability: Scheme account is strictly non-transferable. Only the registered subscriber or designated nominee can redeem upon producing identity proof.",
      "10. Jurisdiction: All disputes are subject to the exclusive jurisdiction of local courts where the branch of enrollment is situated."
    ]
  },
  SAMRUDDHI: {
    title: "BHIMA SAMRUDDHI SCHEME - TERMS & CONDITIONS",
    clauses: [
      "1. Gold Rate Booking & Accumulation: Monthly installments paid are converted into equivalent gold weight (in grams) based on the board rate prevailing on the date of payment.",
      "2. Duration: The scheme spans 11 monthly installments over 330 days.",
      "3. Maturity Benefit: On maturity after 11 complete installments, accumulated gold weight can be redeemed as gold jewelry with 0% making charges up to the accumulated limit.",
      "4. Installment Timelines: Monthly installments must be paid consistently every 30 days. Missed payments will lock rate at default date.",
      "5. No Cash Refunds: Scheme balance cannot be refunded in cash under any circumstances as per statutory rules.",
      "6. Pre-closure Policy: Pre-closure before 6 months will convert accumulated funds to standard purchase value without zero making charge benefits.",
      "7. Taxes: GST and other applicable government taxes at billing time are extra.",
      "8. KYC Compliance: eKYC and Aadhaar/PAN documentation are compulsory.",
      "9. Nominee Clause: In event of demise of subscriber, designated nominee can redeem accumulated gold weight upon valid death certificate & ID proof."
    ]
  },
  RATNA: {
    title: "BHIMA RATNA SCHEME - TERMS & CONDITIONS",
    clauses: [
      "1. Scope: Dedicated savings plan for Diamond, Uncut Diamond, and Precious Gemstone Jewelry purchases.",
      "2. Tenure: 11 equal monthly installments.",
      "3. Special Benefits: 100% waiver on making charges and special diamond value addition discounts upon completing 11 installments.",
      "4. Non-Refundable: Cash refund is strictly disallowed under Indian government guidelines.",
      "5. Redemption: Redemption available exclusively against Diamond and Gemstone studded ornaments at Bhima Gold showrooms.",
      "6. Statutory Taxes: GST as applicable on redemption date must be paid by the customer.",
      "7. Non-transferable: Scheme cannot be assigned or transferred to third parties."
    ]
  },
  "KANAKA PLUS": {
    title: "BHIMA KANAKA PLUS SCHEME - TERMS & CONDITIONS",
    clauses: [
      "1. Dual Benefit Plan: Combines rate lock option with special maturity bonus discounts.",
      "2. Duration: 11 monthly installments over a 330-day period.",
      "3. Maturity Privilege: Entitles subscriber to special making charge discounts on 22K & 18K Gold Ornaments.",
      "4. Cash Refund Restriction: Cash refunds are prohibited under any conditions.",
      "5. Mandatory eKYC: Aadhaar / PAN eKYC verification must be completed prior to scheme enrollment.",
      "6. Taxes: Statutory GST at billing is applicable."
    ]
  },
  SWARNADHARA: {
    title: "BHIMA SWARNADHARA SCHEME - TERMS & CONDITIONS",
    clauses: [
      "1. Weight Accumulation: Monthly payments credited towards gold weight accumulation at current market rate.",
      "2. Duration: 11 months tenure.",
      "3. Benefits: Special Value Addition (VA) discount on gold ornaments upon full tenure completion.",
      "4. Redemption: Strictly in gold jewelry only; no cash refund.",
      "5. Identity Verification: Aadhaar eKYC mandatory."
    ]
  },
  SHREYAS: {
    title: "BHIMA SHREYAS SCHEME - TERMS & CONDITIONS",
    clauses: [
      "1. Premium Privilege Plan: Designed for high-value purchases with maximum VA discounts.",
      "2. Tenure: 11 monthly installments.",
      "3. Redemption: Exclusive redemption against gold & diamond jewelry.",
      "4. No Cash Refund: Non-cashable under any regulatory norms.",
      "5. KYC Mandatory: Customer identity verification is mandatory."
    ]
  }
};

const DEFAULT_SCHEME_TERMS = {
  title: "BHIMA GOLD MY VRUDHI SCHEME - TERMS & CONDITIONS",
  clauses: [
    "1. Enrollment & Tenure: Subscribers shall pay 11 equal monthly installments. Scheme duration is 330 days from enrollment.",
    "2. Scheme Privileges: Completing 11 monthly payments qualifies the customer for scheme benefits, including making charge discounts and bonus privileges.",
    "3. Payment Schedule: Installments must be paid every month on or before the due date.",
    "4. Non-Refundable in Cash: Under Government of India and RBI regulations, installment amounts cannot be refunded in cash under any circumstances.",
    "5. Redemption: Redemption is permitted solely against Gold, Diamond, or Silver Ornaments at authorized Bhima Gold outlets.",
    "6. eKYC & Identity Proof: Aadhaar eKYC and PAN verification are mandatory for scheme approval and final redemption.",
    "7. Statutory Taxes: Applicable taxes including GST and government levies at billing time shall be borne by the customer.",
    "8. Non-Transferability: Scheme membership is non-transferable and restricted to the registered subscriber or verified nominee.",
    "9. Pre-closure: Early termination before 6 months disqualifies the account from special scheme bonus benefits.",
    "10. Jurisdiction: All transactions are subject to local judicial jurisdiction of the issuing branch."
  ]
};

const getSchemeTerms = (schemeName) => {
  if (!schemeName) return DEFAULT_SCHEME_TERMS;
  const s = String(schemeName).toUpperCase();
  for (const [key, termsObj] of Object.entries(SCHEME_TERMS_MAP)) {
    if (s.includes(key)) {
      return termsObj;
    }
  }
  return DEFAULT_SCHEME_TERMS;
};

const EkycCustomerPage = () => {
  const { currencySymbol } = useSelector((state) => state.customer || {});
  const activeSymbol = currencySymbol || "₹";

  const [searchParams] = useSearchParams();
  const ref = searchParams.get("ref") || "";
  const digiUrl = searchParams.get("url") || "";
  const phone = searchParams.get("phone") || "";
  const name = searchParams.get("name") || "";
  const scheme = searchParams.get("scheme") || "";
  const amount = searchParams.get("amount") || "";
  const dob = searchParams.get("dob") || "";
  const gender = searchParams.get("gender") || "";
  const address = searchParams.get("address") || "";
  const city = searchParams.get("city") || "";
  const state = searchParams.get("state") || "";
  const pincode = searchParams.get("pincode") || "";

  const [agreed, setAgreed] = useState(false);
  const [started, setStarted] = useState(false);

  // Signature pad states and ref
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX = e.clientX;
    let clientY = e.clientY;

    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const { x, y } = getCoordinates(e);

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = "#000080";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const { x, y } = getCoordinates(e);

    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSigned(true);
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSigned(false);
  };

  // Terms & Conditions reading state
  const [hasReadTerms, setHasReadTerms] = useState(false);
  const termsContainerRef = useRef(null);
  const activeTerms = getSchemeTerms(scheme);

  const handleTermsScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    if (scrollTop + clientHeight >= scrollHeight - 15) {
      setHasReadTerms(true);
    }
  };

  useEffect(() => {
    if (termsContainerRef.current) {
      const { scrollHeight, clientHeight } = termsContainerRef.current;
      if (scrollHeight <= clientHeight + 10) {
        setHasReadTerms(true);
      }
    }
  }, [scheme]);

  // Post-eKYC states: verifying | success | error
  const [ekycStatus, setEkycStatus] = useState(null);
  const [statusMsg, setStatusMsg] = useState("");
  const [ekycError, setEkycError] = useState("");
  const [aadhaarNo, setAadhaarNo] = useState("");
  const [aadhaarPhoto, setAadhaarPhoto] = useState("");
  const [panNo, setPanNo] = useState("");
  const [aadhaarName, setAadhaarName] = useState("");
  const [aadhaarDob, setAadhaarDob] = useState("");
  const [aadhaarAddress, setAadhaarAddress] = useState("");
  const pollRef = useRef(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const fetchDocuments = useCallback(async (refId) => {
    try {
      setStatusMsg("Fetching your verified documents...");
      const resp = await fetch(`${DigiLockerAPI}/document/AADHAAR?reference_id=${refId}`);
      if (!resp.ok) throw new Error("Failed to fetch Aadhaar data.");
      const data = await resp.json();
      const doc = data?.data || data;

      const sa = doc?.split_address || {};
      const rawPhoto = doc?.photo_link || doc?.photo || doc?.photo_url || "";
      const photo = rawPhoto
        ? rawPhoto.startsWith("http") ? rawPhoto : `data:image/jpeg;base64,${rawPhoto}`
        : "";

      setAadhaarNo(doc?.uid || "");
      setAadhaarPhoto(photo);
      setAadhaarName(doc?.name || "");
      setAadhaarDob(doc?.dob || "");
      setAadhaarAddress([sa?.house, sa?.street, sa?.vtc, sa?.dist, sa?.state, sa?.pincode].filter(Boolean).join(", "));

      try {
        const panResp = await fetch(`${DigiLockerAPI}/document/PAN?reference_id=${refId}`);
        if (panResp.ok) {
          const panData = await panResp.json();
          const pd = panData?.data || panData;
          if (pd?.pan) setPanNo(pd.pan);
        }
      } catch (_) {}

      setEkycStatus("success");
      sessionStorage.removeItem("ekyc_ref");
    } catch (err) {
      setEkycError("Failed to fetch verification data. Please contact the agent.");
      setEkycStatus("error");
    }
  }, []);

  const startPolling = useCallback((refId) => {
    setEkycStatus("verifying");
    setStatusMsg("Checking verification status...");
    let count = 0;

    pollRef.current = setInterval(async () => {
      count += 1;
      if (count > MAX_POLLS) {
        stopPolling();
        setEkycError("Verification timed out. Please contact the agent.");
        setEkycStatus("error");
        return;
      }

      try {
        const resp = await fetch(`${DigiLockerAPI}/status?reference_id=${refId}`);
        const data = await resp.json();
        const status = data?.data?.status || data?.status;

        if (status === "AUTHENTICATED") {
          stopPolling();
          setStatusMsg("Verified! Fetching documents...");
          fetchDocuments(refId);
        } else if (status === "EXPIRED") {
          stopPolling();
          setEkycError("The DigiLocker session has expired. Please contact the agent to restart.");
          setEkycStatus("error");
        }
      } catch (_) {}
    }, 2000);
  }, [stopPolling, fetchDocuments]);

  // On mount: check if returning from DigiLocker (ref saved in sessionStorage)
  useEffect(() => {
    const savedRef = sessionStorage.getItem("ekyc_ref");
    if (savedRef && !started) {
      startPolling(savedRef);
    }
    return () => stopPolling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleProceed = () => {
    if (!agreed) return;
    if (!hasSigned) {
      alert("Please draw your signature in the Signature box before proceeding.");
      return;
    }
    if (!digiUrl) return;

    if (canvasRef.current && hasSigned) {
      try {
        const sigData = canvasRef.current.toDataURL("image/png");
        localStorage.setItem("customerSignature", sigData);
        if (ref) localStorage.setItem(`sig_${ref}`, sigData);
        if (phone) localStorage.setItem(`sig_${phone}`, sigData);

        // POST signature to server so the agent browser can retrieve it after eKYC completion
        if (ref) {
          fetch(`${Drafttabledb}/save-ekyc-signature`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reference_id: ref, signatureBase64: sigData }),
          }).catch(() => {}); // fire-and-forget, don't block the redirect
        }
      } catch (_) {}
    }

    setStarted(true);
    sessionStorage.setItem("ekyc_ref", ref);
    window.location.href = digiUrl;
  };

  if (ekycStatus === "verifying") {
    return (
      <div className="form-mobilecontainer">
        <div className="mobilecontainer">
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "12px", padding: "16px 0 8px" }}>
            <img src={process.env.PUBLIC_URL + "/images/bhima_logo3.png"} alt="Bhima Logo" style={{ maxWidth: "80px", maxHeight: "60px", objectFit: "contain" }} />
            <img src={process.env.PUBLIC_URL + "/images/bhimastamp.webp"} alt="Bhima Stamp" style={{ maxWidth: "80px", maxHeight: "60px", objectFit: "contain" }} />
            <img src={process.env.PUBLIC_URL + "/images/home.png"} alt="Home" style={{ maxWidth: "80px", maxHeight: "60px", objectFit: "contain" }} />
          </div>
          <div className="mobileheader">
            <p className="_x102">eKYC Verification in Progress</p>
          </div>
          <div className="mainmobilecontainer" style={{ textAlign: "center", padding: "24px 20px" }}>
            <div className="spinner-border" role="status" style={{ color: "rgb(205, 154, 80)", width: "48px", height: "48px" }}>
              <span className="visually-hidden">Loading...</span>
            </div>
            <p style={{ marginTop: "16px", color: "#666", fontSize: "15px" }}>
              {statusMsg || "Checking your verification status..."}
            </p>
            <p style={{ marginTop: "8px", color: "#aaa", fontSize: "12px" }}>
              Please keep this page open while we verify your documents.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (ekycStatus === "success") {
    return (
      <div className="form-mobilecontainer">
        <div className="mobilecontainer">
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "12px", padding: "16px 0 8px" }}>
            <img src={process.env.PUBLIC_URL + "/images/bhima_logo3.png"} alt="Bhima Logo" style={{ maxWidth: "80px", maxHeight: "60px", objectFit: "contain" }} />
            <img src={process.env.PUBLIC_URL + "/images/bhimastamp.webp"} alt="Bhima Stamp" style={{ maxWidth: "80px", maxHeight: "60px", objectFit: "contain" }} />
            <img src={process.env.PUBLIC_URL + "/images/home.png"} alt="Home" style={{ maxWidth: "80px", maxHeight: "60px", objectFit: "contain" }} />
          </div>
          <div className="mobileheader">
            <p className="_x102">eKYC Verification Successful</p>
          </div>
          <div className="mainmobilecontainer" style={{ padding: "20px" }}>
            <div style={{ textAlign: "center", marginBottom: "20px" }}>
              <div style={{
                width: "64px", height: "64px", borderRadius: "50%",
                background: "#e8f5e9", display: "inline-flex",
                alignItems: "center", justifyContent: "center", marginBottom: "12px"
              }}>
                <i className="bi bi-check-circle-fill" style={{ fontSize: "36px", color: "#4caf50" }}></i>
              </div>
              <h3 style={{ color: "#2e7d32", fontSize: "18px", marginBottom: "6px" }}>
                eKYC Verification Successful!
              </h3>
              <p style={{ color: "#666", fontSize: "13px" }}>
                Your Aadhaar and PAN have been verified via DigiLocker
              </p>
            </div>

            {aadhaarPhoto && (
              <div style={{ textAlign: "center", marginBottom: "16px" }}>
                <img src={aadhaarPhoto} alt="Aadhaar Photo" style={{
                  width: "100px", height: "120px", objectFit: "cover",
                  borderRadius: "8px", border: "2px solid #e5d8c7"
                }} />
              </div>
            )}

            <div style={{
              background: "#f9f6f1", borderRadius: "12px", padding: "16px",
              marginBottom: "16px", border: "1px solid #e5d8c7"
            }}>
              <h4 style={{ color: "#614119", fontSize: "15px", marginBottom: "12px", fontWeight: "bold" }}>
                <i className="bi bi-person-vcard" style={{ marginRight: "8px" }}></i>
                Verified Documents
              </h4>
              <div style={{ fontSize: "14px", color: "#333", lineHeight: "2" }}>
                {aadhaarName && (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#888" }}>Name (as per Aadhaar):</span>
                    <span style={{ fontWeight: "500" }}>{aadhaarName}</span>
                  </div>
                )}
                {aadhaarNo && (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#888" }}>Aadhaar Number:</span>
                    <span style={{ fontWeight: "500" }}>
                      {aadhaarNo.replace(/(\d{4})(\d{4})(\d{4})/, "XXXX-XXXX-$3")}
                    </span>
                  </div>
                )}
                {aadhaarDob && (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#888" }}>Date of Birth:</span>
                    <span style={{ fontWeight: "500" }}>{aadhaarDob}</span>
                  </div>
                )}
                {aadhaarAddress && (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#888" }}>Address:</span>
                    <span style={{ fontWeight: "500", textAlign: "right", maxWidth: "60%" }}>{aadhaarAddress}</span>
                  </div>
                )}
                {panNo && (
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px", paddingTop: "8px", borderTop: "1px solid #e5d8c7" }}>
                    <span style={{ color: "#888" }}>PAN Number:</span>
                    <span style={{ fontWeight: "500" }}>{panNo}</span>
                  </div>
                )}
              </div>
            </div>

            <div style={{
              background: "#e8f5e9", borderRadius: "10px", padding: "14px",
              marginBottom: "16px", border: "1px solid #c8e6c9", textAlign: "center"
            }}>
              <i className="bi bi-shield-check" style={{ fontSize: "20px", color: "#4caf50", marginRight: "6px" }}></i>
              <span style={{ color: "#2e7d32", fontSize: "14px", fontWeight: "500" }}>
                Your identity has been verified successfully
              </span>
            </div>

            <p style={{ textAlign: "center", color: "#888", fontSize: "13px" }}>
              You can now close this page. The agent has been notified of your verification.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (ekycStatus === "error") {
    return (
      <div className="form-mobilecontainer">
        <div className="mobilecontainer">
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "12px", padding: "16px 0 8px" }}>
            <img src={process.env.PUBLIC_URL + "/images/bhima_logo3.png"} alt="Bhima Logo" style={{ maxWidth: "80px", maxHeight: "60px", objectFit: "contain" }} />
            <img src={process.env.PUBLIC_URL + "/images/bhimastamp.webp"} alt="Bhima Stamp" style={{ maxWidth: "80px", maxHeight: "60px", objectFit: "contain" }} />
            <img src={process.env.PUBLIC_URL + "/images/home.png"} alt="Home" style={{ maxWidth: "80px", maxHeight: "60px", objectFit: "contain" }} />
          </div>
          <div className="mobileheader">
            <p className="_x102">eKYC Verification Failed</p>
          </div>
          <div className="mainmobilecontainer" style={{ textAlign: "center", padding: "24px 20px" }}>
            <i className="bi bi-x-circle-fill" style={{ fontSize: "48px", color: "#f44336", marginBottom: "16px" }}></i>
            <p style={{ color: "#666", fontSize: "15px", marginBottom: "16px" }}>
              {ekycError || "Something went wrong during verification."}
            </p>
            <p style={{ color: "#aaa", fontSize: "13px" }}>
              Please contact the agent to restart the eKYC process.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (started) {
    return (
      <div className="form-mobilecontainer">
        <div className="mobilecontainer">
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "12px", padding: "16px 0 8px" }}>
            <img src={process.env.PUBLIC_URL + "/images/bhima_logo3.png"} alt="Bhima Logo" style={{ maxWidth: "80px", maxHeight: "60px", objectFit: "contain" }} />
            <img src={process.env.PUBLIC_URL + "/images/bhimastamp.webp"} alt="Bhima Stamp" style={{ maxWidth: "80px", maxHeight: "60px", objectFit: "contain" }} />
            <img src={process.env.PUBLIC_URL + "/images/home.png"} alt="Home" style={{ maxWidth: "80px", maxHeight: "60px", objectFit: "contain" }} />
          </div>
          <div className="mobileheader">
            <p className="_x102">Redirecting to DigiLocker...</p>
          </div>
          <div className="mainmobilecontainer" style={{ textAlign: "center", padding: "24px 20px" }}>
            <div className="spinner-border" role="status" style={{ color: "rgb(205, 154, 80)", width: "48px", height: "48px" }}>
              <span className="visually-hidden">Loading...</span>
            </div>
            <p style={{ marginTop: "16px", color: "#666", fontSize: "15px" }}>
              Please wait, you are being redirected to DigiLocker for Aadhaar verification.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="form-mobilecontainer">
      <div className="mobilecontainer">
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "12px", padding: "16px 0 8px" }}>
          <img src={process.env.PUBLIC_URL + "/images/bhima_logo3.png"} alt="Bhima Logo" style={{ maxWidth: "80px", maxHeight: "60px", objectFit: "contain" }} />
          <img src={process.env.PUBLIC_URL + "/images/bhimastamp.webp"} alt="Bhima Stamp" style={{ maxWidth: "80px", maxHeight: "60px", objectFit: "contain" }} />
          <img src={process.env.PUBLIC_URL + "/images/home.png"} alt="Home" style={{ maxWidth: "80px", maxHeight: "60px", objectFit: "contain" }} />
        </div>
        <div className="mobileheader">
          <p className="_x102">eKYC Verification</p>
        </div>

        <div className="mainmobilecontainer" style={{ padding: "20px" }}>
          <div style={{ textAlign: "center", marginBottom: "20px" }}>
            <i className="bi bi-shield-check" style={{ fontSize: "48px", color: "rgb(205, 154, 80)" }}></i>
            <h3 style={{ color: "#614119", marginTop: "10px", fontSize: "18px" }}>
              Review Your Details
            </h3>
            <p style={{ color: "#888", fontSize: "13px" }}>
              Please verify the details below and approve to proceed with eKYC
            </p>
          </div>

          {/* Enrollment Data Card */}
          <div style={{
            background: "#fff",
            borderRadius: "8px",
            padding: "20px",
            marginBottom: "20px",
            border: "1px solid #e0d6c8",
            boxShadow: "0 1px 4px rgba(0,0,0,0.05)"
          }}>
            <h4 style={{ color: "#8c5c34", fontSize: "15px", marginBottom: "16px", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px" }}>
              <i className="bi bi-person-circle"></i>
              Subscriber Details
            </h4>
            <table style={{ width: "100%", fontSize: "14px", borderCollapse: "collapse" }}>
              <tbody>
                <tr style={{ borderBottom: "1px solid #f0e8dc" }}>
                  <td style={{ padding: "10px 0", color: "#666", fontWeight: "500", width: "40%", verticalAlign: "top" }}>Name :</td>
                  <td style={{ padding: "10px 0", color: "#1a1a1a", fontWeight: "600" }}>{name || "-"}</td>
                </tr>
                <tr style={{ borderBottom: "1px solid #f0e8dc" }}>
                  <td style={{ padding: "10px 0", color: "#666", fontWeight: "500", verticalAlign: "top" }}>Mobile :</td>
                  <td style={{ padding: "10px 0", color: "#1a1a1a", fontWeight: "600" }}>{phone || "-"}</td>
                </tr>
                {dob && (
                  <tr style={{ borderBottom: "1px solid #f0e8dc" }}>
                    <td style={{ padding: "10px 0", color: "#666", fontWeight: "500", verticalAlign: "top" }}>Date of Birth :</td>
                    <td style={{ padding: "10px 0", color: "#1a1a1a", fontWeight: "600" }}>{dob}</td>
                  </tr>
                )}
                {gender && (
                  <tr style={{ borderBottom: "1px solid #f0e8dc" }}>
                    <td style={{ padding: "10px 0", color: "#666", fontWeight: "500", verticalAlign: "top" }}>Gender :</td>
                    <td style={{ padding: "10px 0", color: "#1a1a1a", fontWeight: "600" }}>{gender === "M" || gender === "Male" ? "Male" : gender === "F" || gender === "Female" ? "Female" : gender || "Other"}</td>
                  </tr>
                )}
                {address && (
                  <tr style={{ borderBottom: "1px solid #f0e8dc" }}>
                    <td style={{ padding: "10px 0", color: "#666", fontWeight: "500", verticalAlign: "top" }}>Address :</td>
                    <td style={{ padding: "10px 0", color: "#1a1a1a", fontWeight: "600" }}>{address}</td>
                  </tr>
                )}
                {(city || state) && (
                  <tr style={{ borderBottom: "1px solid #f0e8dc" }}>
                    <td style={{ padding: "10px 0", color: "#666", fontWeight: "500", verticalAlign: "top" }}>City/State :</td>
                    <td style={{ padding: "10px 0", color: "#1a1a1a", fontWeight: "600" }}>{[city, state].filter(Boolean).join(", ")}</td>
                  </tr>
                )}
                {pincode && (
                  <tr>
                    <td style={{ padding: "10px 0", color: "#666", fontWeight: "500", verticalAlign: "top" }}>Pincode :</td>
                    <td style={{ padding: "10px 0", color: "#1a1a1a", fontWeight: "600" }}>{pincode}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Scheme Details Card */}
          {scheme && (
            <div style={{
              background: "#fff",
              borderRadius: "8px",
              padding: "20px",
              marginBottom: "20px",
              border: "1px solid #e0d6c8",
              boxShadow: "0 1px 4px rgba(0,0,0,0.05)"
            }}>
              <h4 style={{ color: "#8c5c34", fontSize: "15px", marginBottom: "16px", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px" }}>
                <i className="bi bi-collection"></i>
                Scheme Details
              </h4>
              <table style={{ width: "100%", fontSize: "14px", borderCollapse: "collapse" }}>
                <tbody>
                  <tr style={{ borderBottom: "1px solid #f0e8dc" }}>
                    <td style={{ padding: "10px 0", color: "#666", fontWeight: "500", width: "40%", verticalAlign: "top" }}>Scheme :</td>
                    <td style={{ padding: "10px 0", color: "#1a1a1a", fontWeight: "600" }}>{scheme}</td>
                  </tr>
                  {amount && (
                    <tr>
                      <td style={{ padding: "10px 0", color: "#666", fontWeight: "500", verticalAlign: "top", whiteSpace: "nowrap" }}>Installment Amount :</td>
                      <td style={{ padding: "10px 0", color: "#1a1a1a", fontWeight: "600" }}>{formatCurrency(amount, activeSymbol)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Full Scheme Terms & Conditions Box */}
          <div style={{
            background: "#ffffff",
            borderRadius: "10px",
            padding: "16px",
            marginBottom: "20px",
            border: "1.5px solid #d4af37",
            boxShadow: "0 2px 8px rgba(212,175,55,0.15)"
          }}>
            <h4 style={{ color: "#7a1f2b", fontSize: "15px", marginBottom: "12px", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px" }}>
              <i className="bi bi-file-text" style={{ fontSize: "18px", color: "#8c5c34" }}></i>
              {activeTerms.title}
            </h4>

            {/* Scrollable Terms Text Container */}
            <div
              ref={termsContainerRef}
              onScroll={handleTermsScroll}
              style={{
                maxHeight: "220px",
                overflowY: "auto",
                padding: "12px",
                background: "#faf7f2",
                borderRadius: "6px",
                border: "1px solid #e0d6c8",
                fontSize: "12px",
                lineHeight: "1.6",
                color: "#333"
              }}
            >
              <p style={{ fontWeight: "600", color: "#8c5c34", marginBottom: "8px" }}>
                Please scroll down to read the complete Terms & Conditions for {scheme || "this scheme"}:
              </p>
              {activeTerms.clauses.map((clause, idx) => (
                <p key={idx} style={{ marginBottom: "8px" }}>
                  {clause}
                </p>
              ))}
              <div style={{
                textAlign: "center",
                padding: "8px",
                marginTop: "10px",
                background: "#e8f5e9",
                color: "#2e7d32",
                borderRadius: "4px",
                fontWeight: "600"
              }}>
                --- END OF TERMS & CONDITIONS ---
              </div>
            </div>

            {/* Scroll instruction indicator when not yet fully read */}
            {!hasReadTerms && (
              <div style={{
                marginTop: "10px",
                padding: "8px 12px",
                background: "#fff3cd",
                border: "1px solid #ffeaa7",
                borderRadius: "6px",
                fontSize: "12px",
                color: "#856404",
                textAlign: "center",
                fontWeight: "600",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px"
              }}>
                <i className="bi bi-arrow-down-circle-fill" style={{ fontSize: "16px" }}></i>
                Please scroll to the bottom of the Terms & Conditions box above to enable the approval checkbox.
              </div>
            )}

            {/* Success indicator when fully read */}
            {hasReadTerms && (
              <div style={{
                marginTop: "10px",
                padding: "6px 12px",
                background: "#e8f5e9",
                border: "1px solid #c8e6c9",
                borderRadius: "6px",
                fontSize: "12px",
                color: "#2e7d32",
                textAlign: "center",
                fontWeight: "600"
              }}>
                <i className="bi bi-check-circle-fill" style={{ marginRight: "6px" }}></i>
                Thank you for reading the full Terms & Conditions.
              </div>
            )}
          </div>

          {/* Checkbox Agreement - ONLY DISPLAYED WHEN FULLY READ */}
          {hasReadTerms && (
            <div style={{
              background: "#fff3cd",
              borderRadius: "10px",
              padding: "14px",
              marginBottom: "20px",
              border: "1px solid #ffeaa7"
            }}>
              <label style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "10px",
                cursor: "pointer",
                fontSize: "13px",
                color: "#555",
                lineHeight: "1.6"
              }}>
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  style={{
                    marginTop: "3px",
                    width: "18px",
                    height: "18px",
                    accentColor: "#CD9A50",
                    flexShrink: 0,
                  }}
                />
                <span>
                  I have read and agree to the <strong>{activeTerms.title}</strong> above.
                  I declare that the details furnished are true and correct, and authorize Bhima Gold to fetch my Aadhaar & PAN details from DigiLocker for eKYC verification.
                </span>
              </label>
            </div>
          )}

          {/* Digital Signature Pad Box - DISPLAYED WHEN TERMS AGREED */}
          {hasReadTerms && agreed && (
            <div style={{
              background: "#ffffff",
              borderRadius: "10px",
              padding: "16px",
              marginBottom: "20px",
              border: "1.5px solid #CD9A50",
              boxShadow: "0 2px 8px rgba(205,154,80,0.15)"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <h4 style={{ color: "#7a1f2b", fontSize: "14px", margin: 0, fontWeight: "700", display: "flex", alignItems: "center", gap: "6px" }}>
                  <i className="bi bi-pencil-square" style={{ fontSize: "16px", color: "#CD9A50" }}></i>
                  Customer Digital Signature:
                </h4>
                {hasSigned && (
                  <button
                    type="button"
                    onClick={clearSignature}
                    style={{
                      background: "#fff0f0",
                      border: "1px solid #ffcdd2",
                      color: "#d32f2f",
                      borderRadius: "4px",
                      padding: "4px 10px",
                      fontSize: "12px",
                      fontWeight: "600",
                      cursor: "pointer"
                    }}
                  >
                    <i className="bi bi-eraser" style={{ marginRight: "4px" }}></i>
                    Clear Signature
                  </button>
                )}
              </div>

              <div style={{
                border: "2px dashed #CD9A50",
                borderRadius: "8px",
                background: "#fafafa",
                touchAction: "none",
                position: "relative"
              }}>
                <canvas
                  ref={canvasRef}
                  width={320}
                  height={140}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  style={{
                    width: "100%",
                    height: "140px",
                    display: "block",
                    borderRadius: "6px",
                    cursor: "crosshair"
                  }}
                />
                {!hasSigned && (
                  <div style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    color: "#999",
                    fontSize: "13px",
                    pointerEvents: "none",
                    textAlign: "center"
                  }}>
                    <i className="bi bi-pen" style={{ fontSize: "22px", display: "block", marginBottom: "4px", opacity: 0.6 }}></i>
                    Sign inside this box using finger or stylus
                  </div>
                )}
              </div>

              {hasSigned ? (
                <p style={{ color: "#2e7d32", fontSize: "12px", marginTop: "6px", marginBottom: 0, fontWeight: "600", textAlign: "center" }}>
                  <i className="bi bi-check-circle-fill" style={{ marginRight: "4px" }}></i>
                  Signature captured successfully
                </p>
              ) : (
                <p style={{ color: "#d9534f", fontSize: "12px", marginTop: "6px", marginBottom: 0, textAlign: "center", fontWeight: "500" }}>
                  * Please draw your signature above to complete verification
                </p>
              )}
            </div>
          )}

          {/* Proceed Button */}
          <button
            className="custom-button1 w-100"
            onClick={handleProceed}
            disabled={!agreed || !hasSigned}
            style={{
              opacity: agreed && hasSigned ? 1 : 0.5,
              cursor: agreed && hasSigned ? "pointer" : "not-allowed",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
            }}
          >
            <i className="bi bi-shield-lock" style={{ fontSize: "16px" }}></i>
            I Approve & Submit eKYC
          </button>

          {(!agreed || !hasSigned) && (
            <p style={{ textAlign: "center", color: "#999", fontSize: "12px", marginTop: "10px" }}>
              {!agreed
                ? "Please check the Terms agreement box above to proceed"
                : "Please draw your signature in the box above to submit"}
            </p>
          )}

          <p style={{ textAlign: "center", color: "#bbb", fontSize: "11px", marginTop: "16px" }}>
            <i className="bi bi-info-circle" style={{ marginRight: "4px" }}></i>
            You will be redirected to DigiLocker to complete Aadhaar verification
          </p>
        </div>
      </div>
    </div>
  );
};

export default EkycCustomerPage;
