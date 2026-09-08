import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Mobile.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import { DigiLockerAPI } from "../apiurl";

const MAX_POLLS = 180; // 6 minutes at 2-second intervals

const DigiLockerKYC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { phoneNo = "", aadharVerification } = location.state || {};

  const [step, setStep] = useState("init"); // init | ready | polling | fetching | done | error
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [referenceId, setReferenceId] = useState(null);
  const [digiLockerUrl, setDigiLockerUrl] = useState("");
  const [statusMsg, setStatusMsg] = useState("");
  const [pollCount, setPollCount] = useState(0);
  const [popupOpen, setPopupOpen] = useState(false);
  const pollRef = useRef(null);
  const popupRef = useRef(null);
  const popupCheckRef = useRef(null);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const stopPopupCheck = () => {
    if (popupCheckRef.current) {
      clearInterval(popupCheckRef.current);
      popupCheckRef.current = null;
    }
  };

  const closePopup = () => {
    if (popupRef.current && !popupRef.current.closed) {
      popupRef.current.close();
    }
    popupRef.current = null;
    stopPopupCheck();
    setPopupOpen(false);
  };

  useEffect(() => {
    return () => {
      stopPolling();
      closePopup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Intercept browser back button — close the popup instead of navigating away.
  // We also call navigate() to override any backward navigation React Router
  // may have triggered from the same popstate event.
  useEffect(() => {
    const handlePopState = () => {
      if (popupRef.current && !popupRef.current.closed) {
        closePopup();
        navigate("/DigiLockerKYC", {
          replace: true,
          state: { phoneNo, aadharVerification },
        });
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listen for postMessage from the popup (instant close if backend sends it)
  // Backend callback page should include:
  //   if (window.opener) { window.opener.postMessage('digilocker_complete', '*'); window.close(); }
  useEffect(() => {
    const onMessage = (event) => {
      if (
        event.data === "digilocker_complete" ||
        event.data === "digilocker_failed"
      ) {
        closePopup();
        // Immediately trigger a status check instead of waiting for the next poll
        if (pollRef.current && referenceId) {
          stopPolling();
          fetch(`${DigiLockerAPI}/status?reference_id=${referenceId}`)
            .then((r) => r.json())
            .then((data) => {
              const status = data?.data?.status || data?.status;
              if (status === "AUTHENTICATED") {
                setStep("fetching");
                setStatusMsg("Verified! Fetching your documents...");
                fetchDocuments(referenceId);
              } else {
                setError("Verification was not completed. Please try again.");
                setStep("error");
              }
            })
            .catch(() => {
              setError("Verification failed. Please try again.");
              setStep("error");
            });
        }
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [referenceId]);

  const fetchDocuments = async (refId) => {
    try {
      // --- Aadhaar ---
      const resp = await fetch(
        `${DigiLockerAPI}/document/AADHAAR?reference_id=${refId}`
      );
      if (!resp.ok) throw new Error("Failed to fetch Aadhaar data.");
      const data = await resp.json();

      const doc = data?.data || data;
      // split_address is the structured address object from Cashfree DigiLocker
      const sa = doc?.split_address || {};

      // DigiLocker returns dob as "DD-MM-YYYY"; PickDate needs "YYYY-MM-DD"
      const convertDob = (dobStr) => {
        if (!dobStr) return "";
        if (/^\d{4}-\d{2}-\d{2}$/.test(dobStr)) return dobStr; // already ISO
        const parts = dobStr.split("-");
        if (parts.length === 3 && parts[2].length === 4) {
          return `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
        return dobStr;
      };

      const mappedSubscriber = {
        Name: doc?.name || "",
        Gender: (doc?.gender || "M").toUpperCase().charAt(0),
        DateOfBirth: convertDob(doc?.dob || ""),
        Address1: sa?.house || doc?.care_of || "",
        Address2: sa?.street || "",
        Address3: sa?.vtc || sa?.subdist || "",
        PinCode: sa?.pincode || "",
        City: sa?.dist || "",
        State: sa?.state || "",
        MobileNo: phoneNo || "",
        EmailID: "",
      };

      const aadhaarNumber = doc?.uid || "";

      // photo_link is raw base64 JPEG from Cashfree DigiLocker
      const aadhaarPhoto = doc?.photo_link
        ? `data:image/jpeg;base64,${doc.photo_link}`
        : "";

      // Package the Aadhaar document for the documents table in Mypage
      const aadhaarDoc = aadhaarPhoto
        ? { Type: "AAD", Name: aadhaarNumber, ImagePath: aadhaarPhoto }
        : null;

      // --- PAN (optional — doesn't block Aadhaar if unavailable) ---
      let panDoc = null;
      try {
        setStatusMsg("Fetching PAN details...");
        const panResp = await fetch(
          `${DigiLockerAPI}/document/PAN?reference_id=${refId}`
        );
        if (panResp.ok) {
          const panData = await panResp.json();
          const pd = panData?.data || panData;
          if (pd?.pan) {
            panDoc = { Type: "PAN", Name: pd.pan, ImagePath: "" };
          }
        }
      } catch (_) {
        // PAN not consented / not available — proceed with Aadhaar only
      }

      navigate("/Mypage", {
        replace: true,
        state: {
          aadharverified: 1,
          newSubscriber: mappedSubscriber,
          phoneNo: phoneNo,
          aadharNo: aadhaarNumber,
          aadhaarPhoto: aadhaarPhoto,
          aadhaarDoc: aadhaarDoc,
          panDoc: panDoc,
        },
      });
    } catch (err) {
      setError("Failed to fetch Aadhaar data. Please try again.");
      setStep("error");
    }
  };

  const startPolling = (refId) => {
    setStep("polling");
    setStatusMsg("Waiting for DigiLocker verification...");
    let count = 0;

    pollRef.current = setInterval(async () => {
      count += 1;
      setPollCount(count);

      if (count > MAX_POLLS) {
        stopPolling();
        setError(
          "Verification timed out. Please try again."
        );
        setStep("error");
        return;
      }
      try {
        const resp = await fetch(
          `${DigiLockerAPI}/status?reference_id=${refId}`
        );
        const data = await resp.json();
        const status =
          data?.data?.status || data?.status;

        if (status === "AUTHENTICATED") {
          stopPolling();
          closePopup(); // auto-close the popup window
          setStep("fetching");
          setStatusMsg("Verified! Fetching your documents...");
          fetchDocuments(refId);
        } else if (status === "EXPIRED") {
          stopPolling();
          setError(
            "The DigiLocker session has expired. Please try again."
          );
          setStep("error");
        }
      } catch (_err) {
        // ignore transient network errors and keep polling
      }
    }, 2000); // Poll every 2 seconds so popup closes quickly after callback
  };

  const initDigiLocker = async () => {
    stopPolling();
    setLoading(true);
    setError("");
    setPollCount(0);
    setStep("init");

    try {
      // Step 1 — verify account (non-blocking, proceed regardless)
      try {
        await fetch(`${DigiLockerAPI}/verify-account`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mobile_number: phoneNo }),
        });
      } catch (_) {
        // proceed even if verify-account fails
      }

      // Step 2 — create DigiLocker URL
      const createResp = await fetch(`${DigiLockerAPI}/create-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          document_requested: ["AADHAAR", "PAN"],
          user_flow: "signup",
        }),
      });

      if (!createResp.ok)
        throw new Error("Failed to create DigiLocker session. Please try again.");

      const createData = await createResp.json();

      if (!createData.success || !createData.data?.url)
        throw new Error(
          "Failed to get DigiLocker URL. Please try again."
        );

      setReferenceId(createData.data.reference_id);
      setDigiLockerUrl(createData.data.url);
      setStep("ready");
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
      setStep("error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initDigiLocker();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOpenDigiLocker = () => {
    // Phones open a new tab (popup params are ignored on phone browsers).
    // Tablets and desktops get a centred popup window.
    const isPhone =
      /Android.*Mobile|iPhone|iPod/i.test(navigator.userAgent) ||
      window.innerWidth < 480;

    let popup;
    if (isPhone) {
      // Phone: open as new tab
      popup = window.open(digiLockerUrl, "_blank");
    } else {
      // Tablet / Desktop: centered popup window sized to 92% of available screen
      const screenW = window.screen.availWidth || window.screen.width;
      const screenH = window.screen.availHeight || window.screen.height;
      const w = Math.min(600, Math.floor(screenW * 0.92));
      const h = Math.min(800, Math.floor(screenH * 0.92));
      const left = Math.max(0, Math.floor((screenW - w) / 2));
      const top = Math.max(0, Math.floor((screenH - h) / 2));
      popup = window.open(
        digiLockerUrl,
        "DigiLockerVerification",
        `width=${w},height=${h},top=${top},left=${left},scrollbars=yes,resizable=yes`
      );
    }

    if (!popup || popup.closed) {
      // Popup was blocked by the browser
      setError(
        "Popup was blocked by your browser. Please allow popups for this site and try again."
      );
      setStep("error");
      return;
    }

    popupRef.current = popup;
    setPopupOpen(true);

    // Detect if user closes the popup manually before verification completes
    popupCheckRef.current = setInterval(() => {
      if (popupRef.current && popupRef.current.closed) {
        stopPopupCheck();
        popupRef.current = null;
        setPopupOpen(false);
        stopPolling();      // safe to call even if already stopped
        setPollCount(0);
        setStep("ready");   // let user re-open
      }
    }, 1000);

    if (step !== "polling") {
      startPolling(referenceId);
    }
  };

  const handleRetry = () => {
    initDigiLocker();
  };




  return (
    <div className="form-mobilecontainer">
      <div className="mobilecontainer">
        <div className="mobileheader">
          <p className="_x102">Aadhaar eKYC Verification</p>
        </div>

        <div
          className="mainmobilecontainer"
          style={{ textAlign: "center", padding: "24px 20px" }}
        >
          {/* INIT / LOADING */}
          {(loading || step === "init") && (
            <div>
              <div
                className="spinner-border"
                role="status"
                style={{ color: "rgb(205, 154, 80)", width: "48px", height: "48px" }}
              >
                <span className="visually-hidden">Loading...</span>
              </div>
              <p style={{ marginTop: "16px", color: "#666", fontSize: "15px" }}>
                Preparing your DigiLocker session...
              </p>
            </div>
          )}

          {/* READY — show Open DigiLocker button */}
          {!loading && step === "ready" && (
            <div>
              <i
                className="bi bi-shield-lock"
                style={{ fontSize: "56px", color: "rgb(205, 154, 80)" }}
              ></i>
              <p
                style={{
                  color: "#333",
                  margin: "16px 0 20px",
                  fontSize: "15px",
                  lineHeight: "1.5",
                }}
              >
                Your DigiLocker session is ready.
                <br />
                Click the button below to open DigiLocker and verify your Aadhaar.
              </p>
              <button
                className="custom-button1 w-100"
                onClick={handleOpenDigiLocker}
              >
                <i
                  className="bi bi-box-arrow-up-right"
                  style={{ marginRight: "8px" }}
                ></i>
                Open DigiLocker &amp; Verify
              </button>
              <p
                style={{
                  marginTop: "14px",
                  fontSize: "12px",
                  color: "#999",
                  lineHeight: "1.5",
                }}
              >
                {/Android.*Mobile|iPhone|iPod/i.test(navigator.userAgent) || window.innerWidth < 480
                  ? "DigiLocker will open in a new tab. Complete verification there and return to this page — it updates automatically."
                  : "A popup window will open for DigiLocker. Complete your Aadhaar verification there — this page will update automatically once done."}
              </p>
            </div>
          )}

          {/* POLLING — waiting for user to complete DigiLocker */}
          {!loading && step === "polling" && (
            <div>
              <div
                className="spinner-border"
                role="status"
                style={{ color: "rgb(205, 154, 80)", width: "48px", height: "48px" }}
              >
                <span className="visually-hidden">Checking...</span>
              </div>
              <p
                style={{
                  marginTop: "16px",
                  color: "#333",
                  fontSize: "15px",
                  fontWeight: "500",
                }}
              >
                {statusMsg}
              </p>
              {popupOpen ? (
                <p style={{ color: "#888", fontSize: "13px", marginTop: "10px" }}>
                  <i className="bi bi-window" style={{ marginRight: "6px" }}></i>
                  DigiLocker popup is open — complete verification there.
                  <br />
                  This page checks every 5 seconds automatically.
                </p>
              ) : (
                <button
                  className="custom-button1 w-100"
                  style={{ marginTop: "16px", opacity: 0.85 }}
                  onClick={handleOpenDigiLocker}
                >
                  <i className="bi bi-window" style={{ marginRight: "8px" }}></i>
                  Re-open Verification Popup
                </button>
              )}
              <p style={{ color: "#bbb", fontSize: "12px", marginTop: "10px" }}>
                Checks: {pollCount} / {MAX_POLLS}
              </p>
            </div>
          )}

          {/* FETCHING — authenticated, loading Aadhaar document */}
          {!loading && step === "fetching" && (
            <div>
              <div
                className="spinner-border"
                role="status"
                style={{ color: "green", width: "48px", height: "48px" }}
              >
                <span className="visually-hidden">Loading...</span>
              </div>
              <p style={{ marginTop: "16px", color: "#333", fontSize: "15px" }}>
                {statusMsg}
              </p>
            </div>
          )}

          {/* ERROR */}
          {step === "error" && (
            <div>
              <i
                className="bi bi-exclamation-triangle"
                style={{ fontSize: "56px", color: "#dc3545" }}
              ></i>
              <p
                style={{
                  marginTop: "16px",
                  color: "#dc3545",
                  fontSize: "15px",
                }}
              >
                {error}
              </p>
              <button
                className="custom-button1 w-100"
                onClick={handleRetry}
                style={{ marginTop: "16px" }}
              >
                <i
                  className="bi bi-arrow-clockwise"
                  style={{ marginRight: "8px" }}
                ></i>
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>

      {/* No iframe overlay — popup window is used instead */}
    </div>
  );
};

export default DigiLockerKYC;
