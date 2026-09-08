import React, { useState, useEffect, useRef, useCallback } from "react";
import { Modal, Box, Typography, Button, CircularProgress } from "@mui/material";
import { IoCloseCircleOutline } from "react-icons/io5";
import { DigiLockerAPI, Drafttabledb } from "../../apiurl";


const MAX_POLLS = 180; // 6 minutes at 2-second intervals

const EkycQRModal = ({ open, onClose, phoneNo, onEkycComplete, enrollmentData }) => {
  const [step, setStep] = useState("init"); // init | loading | ready | polling | fetching | success | error
  const [qrUrl, setQrUrl] = useState("");
  const [referenceId, setReferenceId] = useState("");
  const [statusMsg, setStatusMsg] = useState("");
  const [error, setError] = useState("");
  const [pollCount, setPollCount] = useState(0);

  const pollRef = useRef(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const fetchDocuments = useCallback(
    async (refId) => {
      try {
        setStatusMsg("Fetching your documents...");

        const resp = await fetch(
          `${DigiLockerAPI}/document/AADHAAR?reference_id=${refId}`
        );
        if (!resp.ok) throw new Error("Failed to fetch Aadhaar data.");
        const data = await resp.json();
        const doc = data?.data || data;

        const sa = doc?.split_address || {};
        const convertDob = (dobStr) => {
          if (!dobStr) return "";
          if (/^\d{4}-\d{2}-\d{2}$/.test(dobStr)) return dobStr;
          const parts = dobStr.split("-");
          if (parts.length === 3 && parts[2].length === 4) {
            return `${parts[2]}-${parts[1]}-${parts[0]}`;
          }
          return dobStr;
        };

        const aadhaarNumber = doc?.uid || "";
        const rawPhoto = doc?.photo_link || doc?.photo || doc?.photo_url || "";
        const aadhaarPhoto = rawPhoto
          ? rawPhoto.startsWith("http")
            ? rawPhoto
            : `data:image/jpeg;base64,${rawPhoto}`
          : "";
        const aadhaarDummyImage = `${process.env.PUBLIC_URL}/images/aadhardummy.png`;
        const aadhaarDoc = aadhaarNumber
          ? { Type: "AAD", Name: aadhaarNumber, ImagePath: aadhaarDummyImage }
          : null;

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

        const permanentAddress =
          doc?.address ||
          [
            sa?.house || doc?.care_of,
            sa?.street,
            sa?.landmark,
            sa?.loc,
            sa?.vtc || sa?.subdist,
            sa?.dist,
            sa?.state,
            sa?.pincode,
          ]
            .filter(Boolean)
            .join(", ");

        let panDoc = null;
        try {
          const panResp = await fetch(
            `${DigiLockerAPI}/document/PAN?reference_id=${refId}`
          );
          if (panResp.ok) {
            const panData = await panResp.json();
            const pd = panData?.data || panData;
            if (pd?.pan) {
              const panDummyImage = `${process.env.PUBLIC_URL}/images/pandummy.png`;
              panDoc = { Type: "PAN", Name: pd.pan, ImagePath: panDummyImage };
            }
          }
        } catch (_) {}

        setStep("success");
        setStatusMsg("eKYC completed successfully!");

        // Fetch the customer signature that was saved on the server during eKYC page
        let ekycSignature = null;
        try {
          const sigResp = await fetch(`${Drafttabledb}/get-ekyc-signature?reference_id=${refId}`);
          if (sigResp.ok) {
            const sigData = await sigResp.json();
            if (sigData.signatureBase64) {
              ekycSignature = sigData.signatureBase64;
            }
          }
        } catch (_) {}

        onEkycComplete({
          aadharverified: 1,
          newSubscriber: mappedSubscriber,
          phoneNo,
          aadharNo: aadhaarNumber,
          aadhaarPhoto,
          aadhaarDoc,
          panDoc,
          ekycSignature,
          permanentAddress,
        });

      } catch (err) {
        setError("Failed to fetch Aadhaar data. Please try again.");
        setStep("error");
      }
    },
    [phoneNo, onEkycComplete]
  );

  const startPolling = useCallback(
    (refId) => {
      setStep("polling");
      setStatusMsg("Waiting for customer to complete eKYC on their device...");
      let count = 0;

      pollRef.current = setInterval(async () => {
        count += 1;
        setPollCount(count);

        if (count > MAX_POLLS) {
          stopPolling();
          setError("Verification timed out. Please try again.");
          setStep("error");
          return;
        }

        try {
          const resp = await fetch(
            `${DigiLockerAPI}/status?reference_id=${refId}`
          );
          const data = await resp.json();
          const status = data?.data?.status || data?.status;

          if (status === "AUTHENTICATED") {
            stopPolling();
            setStep("fetching");
            setStatusMsg("Verified! Fetching documents...");
            fetchDocuments(refId);
          } else if (status === "EXPIRED") {
            stopPolling();
            setError("The DigiLocker session has expired. Please try again.");
            setStep("error");
          }
        } catch (_) {}
      }, 2000);
    },
    [stopPolling, fetchDocuments]
  );

  const initDigiLocker = useCallback(async () => {
    stopPolling();
    setStep("loading");
    setError("");
    setPollCount(0);
    setStatusMsg("Creating eKYC session...");

    try {
      try {
        await fetch(`${DigiLockerAPI}/verify-account`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mobile_number: phoneNo }),
        });
      } catch (_) {}

      const createResp = await fetch(`${DigiLockerAPI}/create-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          document_requested: ["AADHAAR", "PAN"],
          user_flow: "signup",
        }),
      });

      if (!createResp.ok)
        throw new Error("Failed to create DigiLocker session.");

      const createData = await createResp.json();

      if (!createData.success || !createData.data?.url)
        throw new Error("Failed to get DigiLocker URL.");

      setReferenceId(createData.data.reference_id);
      setQrUrl(createData.data.url);
      setStep("ready");
      startPolling(createData.data.reference_id);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
      setStep("error");
    }
  }, [phoneNo, stopPolling, startPolling]);

  // Start session when modal opens
  useEffect(() => {
    if (open) {
      initDigiLocker();
    } else {
      stopPolling();
      setStep("init");
      setQrUrl("");
      setReferenceId("");
      setError("");
      setStatusMsg("");
      setPollCount(0);
    }
    return () => stopPolling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleRetry = () => {
    initDigiLocker();
  };

  const handleClose = () => {
    stopPolling();
    onClose();
  };

  const customerUrl = qrUrl
    ? (() => {
        const baseUrl = `${window.location.origin}${process.env.PUBLIC_URL}/ekyc-customer`;
        const params = new URLSearchParams();
        params.append("ref", referenceId);
        params.append("url", qrUrl);
        params.append("phone", phoneNo || "");
        if (enrollmentData) {
          if (enrollmentData.name) params.append("name", enrollmentData.name);
          if (enrollmentData.scheme) params.append("scheme", enrollmentData.scheme);
          if (enrollmentData.amount) params.append("amount", enrollmentData.amount);
          if (enrollmentData.dob) params.append("dob", enrollmentData.dob);
          if (enrollmentData.gender) params.append("gender", enrollmentData.gender);
          if (enrollmentData.address) params.append("address", enrollmentData.address);
          if (enrollmentData.city) params.append("city", enrollmentData.city);
          if (enrollmentData.state) params.append("state", enrollmentData.state);
          if (enrollmentData.pincode) params.append("pincode", enrollmentData.pincode);
        }
        return `${baseUrl}?${params.toString()}`;
      })()
    : "";

  const qrImageUrl = customerUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(customerUrl)}`
    : "";

  return (
    <Modal
      open={open}
      onClose={(event, reason) => {
        if (reason === "backdropClick") return;
        handleClose();
      }}
      className="success-model-popup2"
    >
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: { xs: "90vw", sm: "450px" },
          bgcolor: "background.paper",
          borderRadius: "16px",
          boxShadow: 24,
          p: 4,
          textAlign: "center",
          outline: "none",
        }}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          style={{
            position: "absolute",
            top: "12px",
            right: "12px",
            background: "none",
            border: "none",
            cursor: "pointer",
          }}
        >
          <IoCloseCircleOutline color="#999" size={28} />
        </button>

        {/* Loading state */}
        {(step === "init" || step === "loading") && (
          <div>
            <CircularProgress
              size={48}
              sx={{
                color: "#CD9A50",
                mb: 2,
              }}
            />
            <Typography variant="body1" sx={{ color: "#666" }}>
              {statusMsg || "Initializing eKYC..."}
            </Typography>
          </div>
        )}

        {/* QR Code ready + polling */}
        {(step === "ready" || step === "polling") && (
          <div>
            <Typography
              variant="h6"
              sx={{ mb: 2, fontWeight: "bold", color: "#614119" }}
            >
              Scan QR Code for eKYC
            </Typography>
            <Typography variant="body2" sx={{ mb: 2, color: "#666" }}>
              Ask the customer to scan this QR code with their phone to complete
              Aadhaar verification via DigiLocker
            </Typography>

            <div
              style={{
                display: "flex",
                justifyContent: "center",
                marginBottom: "16px",
              }}
            >
              <img
                src={qrImageUrl}
                alt="eKYC QR Code"
                style={{
                  width: "280px",
                  height: "280px",
                  border: "2px solid #CD9A50",
                  borderRadius: "12px",
                  padding: "8px",
                }}
              />
            </div>

            {customerUrl && (
              <Box sx={{ mb: 2, wordBreak: "break-all", maxWidth: "100%" }}>
                <Typography variant="caption" sx={{ color: "#999", display: "block", mb: 0.5 }}>
                  Or share this link with the customer:
                </Typography>
                <a
                  href={customerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: "#614119",
                    fontSize: "12px",
                    wordBreak: "break-all",
                  }}
                >
                  {customerUrl}
                </a>
              </Box>
            )}

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                marginBottom: "8px",
              }}
            >
              <CircularProgress size={20} sx={{ color: "#CD9A50" }} />
              <Typography variant="body2" sx={{ color: "#666" }}>
                {statusMsg}
              </Typography>
            </div>
            <Typography variant="caption" sx={{ color: "#999" }}>
              Polling... ({pollCount}/{MAX_POLLS})
            </Typography>
          </div>
        )}

        {/* Fetching documents */}
        {step === "fetching" && (
          <div>
            <CircularProgress size={48} sx={{ color: "#CD9A50", mb: 2 }} />
            <Typography variant="body1" sx={{ color: "#666" }}>
              {statusMsg}
            </Typography>
          </div>
        )}

        {/* Success */}
        {step === "success" && (
          <div>
            <div
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "50%",
                background: "#4CAF50",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
              }}
            >
              <i
                className="bi bi-check-lg"
                style={{ fontSize: "36px", color: "white" }}
              ></i>
            </div>
            <Typography
              variant="h6"
              sx={{ mb: 1, fontWeight: "bold", color: "#4CAF50" }}
            >
              eKYC Completed!
            </Typography>
            <Typography variant="body2" sx={{ color: "#666", mb: 2 }}>
              Aadhaar and PAN documents have been verified and added to the
              enrollment form.
            </Typography>
            <Button
              variant="contained"
              onClick={handleClose}
              sx={{
                background:
                  "linear-gradient(103.45deg, #614119 -11.68%, #CD9A50 48.54%, #614119 108.76%)",
                color: "white",
                borderRadius: "8px",
                textTransform: "none",
              }}
            >
              Continue
            </Button>
          </div>
        )}

        {/* Error */}
        {step === "error" && (
          <div>
            <div
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "50%",
                background: "#f44336",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
              }}
            >
              <i
                className="bi bi-x-lg"
                style={{ fontSize: "28px", color: "white" }}
              ></i>
            </div>
            <Typography
              variant="h6"
              sx={{ mb: 1, fontWeight: "bold", color: "#f44336" }}
            >
              Verification Failed
            </Typography>
            <Typography variant="body2" sx={{ color: "#666", mb: 2 }}>
              {error}
            </Typography>
            <Button
              variant="contained"
              onClick={handleRetry}
              sx={{
                background:
                  "linear-gradient(103.45deg, #614119 -11.68%, #CD9A50 48.54%, #614119 108.76%)",
                color: "white",
                borderRadius: "8px",
                textTransform: "none",
                mr: 1,
              }}
            >
              Retry
            </Button>
            <Button
              variant="outlined"
              onClick={handleClose}
              sx={{
                borderColor: "#614119",
                color: "#614119",
                borderRadius: "8px",
                textTransform: "none",
              }}
            >
              Cancel
            </Button>
          </div>
        )}
      </Box>
    </Modal>
  );
};

export default EkycQRModal;
