import React, { useState, useRef, useEffect, useCallback } from "react";
import { useSelector } from 'react-redux';
import { Button } from "@mui/material";
import { Camera, RefreshCw, Image, X, SwitchCamera } from 'lucide-react';

const CameraComponent = ({ getImageUrl, capturedImage, aadharVerified }) => {
  const { selectedCustomerID } = useSelector((state) => state.customer);
  const [imageBase64, setImageBase64] = useState(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [existingProfileImage, setExistingProfileImage] = useState(null);
  const [facingMode, setFacingMode] = useState("user"); // "user" (front/selfie) or "environment" (back camera)
  const [isSwitchingCamera, setIsSwitchingCamera] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [cameraStream, setCameraStream] = useState(null);
  const facingModeRef = useRef("user");

  const getImageUrlRef = useRef(getImageUrl);
  useEffect(() => {
    getImageUrlRef.current = getImageUrl;
  }, [getImageUrl]);

  const previousImageRef = useRef(null);
  const isRetakingRef = useRef(false);
  const customerLoadedIdRef = useRef(null);
  const prevCapturedImageRef = useRef(null);

  // Load existing profile picture from customer details ONCE per customer
  useEffect(() => {
    if (!selectedCustomerID || Object.keys(selectedCustomerID).length === 0) return;

    const custId =
      selectedCustomerID.ID ||
      selectedCustomerID.NewCustID ||
      selectedCustomerID.CustomerID ||
      selectedCustomerID.Cust_ID ||
      selectedCustomerID.id ||
      selectedCustomerID.Mobile_No ||
      "loaded";

    // Only load initial photo once per customer; do not override if user is retaking
    if (customerLoadedIdRef.current === custId) return;
    customerLoadedIdRef.current = custId;

    const allDocs = [
      ...(Array.isArray(selectedCustomerID.Documents) ? selectedCustomerID.Documents : []),
      ...(Array.isArray(selectedCustomerID.customerDocuments) ? selectedCustomerID.customerDocuments : []),
      ...(Array.isArray(selectedCustomerID.combinedDocuments) ? selectedCustomerID.combinedDocuments : []),
      ...(Array.isArray(selectedCustomerID.draftCustomerDocuments) ? selectedCustomerID.draftCustomerDocuments : []),
      ...(Array.isArray(selectedCustomerID.document) ? selectedCustomerID.document : []),
    ];

    const profileDoc = allDocs.find(
      (doc) => doc.Type === "IMG" || Number(doc.DocumentTypeID) === 30 || Number(doc.documentTypeId) === 30
    );
    const imgUrl =
      selectedCustomerID.Profileimg ||
      selectedCustomerID.profileimg ||
      selectedCustomerID.ProfileImg ||
      selectedCustomerID.ImageURL ||
      selectedCustomerID.ImageUrl ||
      selectedCustomerID.Image ||
      profileDoc?.ImageURL ||
      profileDoc?.ImageUrl ||
      profileDoc?.ImagePath ||
      profileDoc?.Profileimg ||
      profileDoc?.profileimg;

    if (imgUrl) {
      setExistingProfileImage(imgUrl);
      setImageBase64(imgUrl);
      previousImageRef.current = imgUrl;
      if (getImageUrlRef.current) getImageUrlRef.current(imgUrl);
    }
  }, [selectedCustomerID]);

  // Stop camera helper
  const stopCamera = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {
          console.warn("Track stop error:", e);
        }
      });
      setCameraStream(null);
      if (videoRef.current) videoRef.current.srcObject = null;
    }
  }, [cameraStream]);

  // Show eKYC Aadhaar photo when capturedImage changes from parent (e.g. eKYC completion)
  useEffect(() => {
    if (
      capturedImage &&
      capturedImage !== prevCapturedImageRef.current &&
      !isRetakingRef.current &&
      (capturedImage.startsWith("data:image") || capturedImage.startsWith("http"))
    ) {
      setImageBase64(capturedImage);
      setExistingProfileImage(null);
      previousImageRef.current = capturedImage;
      setIsCameraOpen(false);
      stopCamera();
    }
    prevCapturedImageRef.current = capturedImage;
  }, [capturedImage, stopCamera]);

  // Ensure camera stream attaches to video element once rendered
  useEffect(() => {
    if (isCameraOpen && cameraStream && videoRef.current) {
      if (videoRef.current.srcObject !== cameraStream) {
        videoRef.current.srcObject = cameraStream;
      }
      videoRef.current.play().catch((err) => console.warn("Video play error:", err));
    }
  }, [isCameraOpen, cameraStream]);

  // Start camera with chosen facingMode ("user" for front/selfie, "environment" for back camera)
  const startCamera = async (targetMode = facingModeRef.current) => {
    setIsSwitchingCamera(true);
    try {
      // Stop any existing stream tracks first
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
        setCameraStream(null);
        if (videoRef.current) videoRef.current.srcObject = null;
      }

      facingModeRef.current = targetMode;
      setFacingMode(targetMode);

      let stream = null;
      // 1. Try with ideal facingMode constraint
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: { ideal: targetMode },
          },
        });
      } catch (err1) {
        console.warn(`Ideal facingMode ${targetMode} failed, trying exact:`, err1);
        // 2. Try exact facingMode
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              facingMode: targetMode,
            },
          });
        } catch (err2) {
          console.warn("Exact facingMode failed, falling back to default video input:", err2);
          // 3. Fallback to generic video
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
          });
        }
      }

      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch((err) => console.warn("Video play error:", err));
      }
    } catch (error) {
      console.error("Error accessing camera: ", error);
      alert("Unable to access camera. Please check camera permissions in your browser and ensure no other application is using it.");
      setIsCameraOpen(false);
      isRetakingRef.current = false;
      if (previousImageRef.current) {
        setImageBase64(previousImageRef.current);
        setExistingProfileImage(previousImageRef.current);
        if (getImageUrlRef.current) getImageUrlRef.current(previousImageRef.current);
      }
    } finally {
      setIsSwitchingCamera(false);
    }
  };

  // Toggle between front (selfie) and back camera
  const toggleCamera = async () => {
    const nextMode = facingMode === "user" ? "environment" : "user";
    await startCamera(nextMode);
  };

  // Retake or Open Camera
  const handleCameraOpen = async (preferredMode = facingMode) => {
    if (imageBase64 || existingProfileImage) {
      previousImageRef.current = imageBase64 || existingProfileImage;
    }
    isRetakingRef.current = true;
    setImageBase64(null);
    setExistingProfileImage(null);
    if (getImageUrlRef.current) getImageUrlRef.current(null);
    setIsCameraOpen(true);
    await startCamera(preferredMode);
  };

  // Cancel retaking / camera
  const handleCancelCamera = () => {
    stopCamera();
    setIsCameraOpen(false);
    isRetakingRef.current = false;
    if (previousImageRef.current) {
      setImageBase64(previousImageRef.current);
      setExistingProfileImage(previousImageRef.current);
      if (getImageUrlRef.current) getImageUrlRef.current(previousImageRef.current);
    }
  };

  const takePhoto = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const photoBase64 = canvas.toDataURL("image/jpeg", 0.7);
    isRetakingRef.current = false;
    previousImageRef.current = photoBase64;
    setImageBase64(photoBase64);
    setExistingProfileImage(null);
    stopCamera();
    setIsCameraOpen(false);
    if (getImageUrlRef.current) getImageUrlRef.current(photoBase64);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [cameraStream]);

  const displayImage = imageBase64 || existingProfileImage;

  return (
    <div className="flex flex-col items-center justify-center space-y-4 animate-fade-in">
      {/* === Active Camera Feed === */}
      {isCameraOpen && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ position: "relative", width: "100%", maxWidth: "420px" }}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: "100%",
                maxWidth: "420px",
                height: "380px",
                objectFit: "cover",
                borderRadius: "8px",
                border: "2px solid #CD9A50",
                backgroundColor: "#000",
              }}
            />

            {/* Current camera indicator badge */}
            <span
              style={{
                position: "absolute",
                top: "12px",
                left: "12px",
                background: "rgba(0, 0, 0, 0.65)",
                color: "#fff",
                padding: "4px 10px",
                borderRadius: "20px",
                fontSize: "12px",
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                backdropFilter: "blur(4px)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
              }}
            >
              {facingMode === "environment" ? "📷 Back Camera" : "🤳 Front Camera (Selfie)"}
            </span>

            {/* Overlay quick-switch button */}
            <button
              type="button"
              onClick={toggleCamera}
              disabled={isSwitchingCamera}
              title={facingMode === "user" ? "Switch to Back Camera" : "Switch to Front Camera"}
              style={{
                position: "absolute",
                top: "12px",
                right: "12px",
                background: "rgba(0, 0, 0, 0.65)",
                color: "#fff",
                border: "1px solid rgba(255, 255, 255, 0.3)",
                padding: "6px 12px",
                borderRadius: "20px",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                backdropFilter: "blur(4px)",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0, 0, 0, 0.85)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(0, 0, 0, 0.65)")}
            >
              <SwitchCamera style={{ width: "16px", height: "16px" }} />
              <span>{facingMode === "user" ? "Use Back Camera" : "Use Front Camera"}</span>
            </button>
          </div>

          {/* Action buttons below feed */}
          <div style={{ display: "flex", gap: "10px", marginTop: "14px", justifyContent: "center", flexWrap: "wrap" }}>
            <Button
              onClick={takePhoto}
              disabled={isSwitchingCamera}
              style={{
                background: "linear-gradient(103.45deg, #614119 -11.68%, #CD9A50 48.54%, #614119 108.76%)",
                color: "white",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 20px",
                textTransform: "none",
                fontWeight: 600,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.03)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
            >
              <Image className="w-5 h-5" />
              Capture Photo
            </Button>

            <Button
              onClick={toggleCamera}
              disabled={isSwitchingCamera}
              variant="outlined"
              style={{
                borderColor: "#CD9A50",
                color: "#614119",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 16px",
                textTransform: "none",
                fontWeight: 600,
                backgroundColor: "#fffdf9",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#fef9f0")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#fffdf9")}
            >
              <SwitchCamera className="w-5 h-5" />
              {facingMode === "user" ? "Switch to Back Camera" : "Switch to Front Camera"}
            </Button>

            {previousImageRef.current && (
              <Button
                onClick={handleCancelCamera}
                variant="outlined"
                style={{
                  borderColor: "#614119",
                  color: "#614119",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 16px",
                  textTransform: "none",
                }}
              >
                <X className="w-5 h-5" />
                Cancel
              </Button>
            )}
          </div>
        </div>
      )}

      {/* === Existing or Captured Photo Display === */}
      {!isCameraOpen && displayImage && (
        <div style={{ textAlign: "center" }}>
          <img
            src={displayImage}
            alt="Profile"
            style={{
              width: "100%",
              maxWidth: "400px",
              height: "auto",
              maxHeight: "400px",
              objectFit: "cover",
              borderRadius: "8px",
              marginTop: "10px",
              border: "2px solid #CD9A50",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            }}
          />
          <div style={{ display: "flex", justifyContent: "center", gap: "10px", marginTop: "12px", flexWrap: "wrap" }}>
            <Button
              onClick={() => handleCameraOpen("user")}
              style={{
                background: "linear-gradient(103.45deg, #614119 -11.68%, #CD9A50 48.54%, #614119 108.76%)",
                color: "white",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 18px",
                textTransform: "none",
                fontWeight: 600,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
            >
              <RefreshCw className="w-5 h-5" />
              Retake (Front Camera)
            </Button>
            <Button
              onClick={() => handleCameraOpen("environment")}
              variant="outlined"
              style={{
                borderColor: "#CD9A50",
                color: "#614119",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 18px",
                textTransform: "none",
                fontWeight: 600,
                backgroundColor: "#fffdf9",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#fef9f0")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#fffdf9")}
            >
              <Camera className="w-5 h-5" />
              Retake (Back Camera)
            </Button>
          </div>
        </div>
      )}

      {/* === No Photo & Camera Closed === */}
      {!isCameraOpen && !displayImage && (
        <div style={{ display: "flex", justifyContent: "center", gap: "12px", marginTop: "10px", flexWrap: "wrap" }}>
          <Button
            onClick={() => handleCameraOpen("user")}
            style={{
              background: "linear-gradient(103.45deg, #614119 -11.68%, #CD9A50 48.54%, #614119 108.76%)",
              color: "white",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 18px",
              textTransform: "none",
              fontWeight: 600,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            <Camera className="w-5 h-5" />
            Front Camera (Selfie)
          </Button>

          <Button
            onClick={() => handleCameraOpen("environment")}
            variant="outlined"
            style={{
              borderColor: "#CD9A50",
              color: "#614119",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 18px",
              textTransform: "none",
              fontWeight: 600,
              backgroundColor: "#fffdf9",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#fef9f0")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#fffdf9")}
          >
            <SwitchCamera className="w-5 h-5" />
            Back Camera
          </Button>
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
};

export default CameraComponent;
