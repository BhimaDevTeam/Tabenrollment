import React, { useState, useRef, useEffect } from "react";
import { useSelector } from 'react-redux';
import { Button } from "@mui/material";
import { Camera, RefreshCw, Image } from 'lucide-react';

const CameraComponent = ({ getImageUrl, capturedImage, aadharVerified }) => {
  const { selectedCustomerID } = useSelector((state) => state.customer);
  const [imageBase64, setImageBase64] = useState(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [existingProfileImage, setExistingProfileImage] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [cameraStream, setCameraStream] = useState(null);
  const loadedCustomerIdRef = useRef(null);
 
  useEffect(() => {
    if (selectedCustomerID) {
      const allDocs = [
        ...(Array.isArray(selectedCustomerID.Documents) ? selectedCustomerID.Documents : []),
        ...(Array.isArray(selectedCustomerID.customerDocuments) ? selectedCustomerID.customerDocuments : []),
        ...(Array.isArray(selectedCustomerID.combinedDocuments) ? selectedCustomerID.combinedDocuments : []),
        ...(Array.isArray(selectedCustomerID.draftCustomerDocuments) ? selectedCustomerID.draftCustomerDocuments : []),
        ...(Array.isArray(selectedCustomerID.document) ? selectedCustomerID.document : []),
      ];

      const profileDoc = allDocs.find(doc => doc.Type === "IMG" || Number(doc.DocumentTypeID) === 30 || Number(doc.documentTypeId) === 30);
      const imgUrl = selectedCustomerID.ImageURL || selectedCustomerID.ImageUrl || selectedCustomerID.Image || profileDoc?.ImageURL || profileDoc?.ImageUrl || profileDoc?.ImagePath;

      if (imgUrl) {
        setExistingProfileImage(imgUrl);
        setImageBase64(imgUrl);
        if (getImageUrl) getImageUrl(imgUrl);
      }
    }
  }, [selectedCustomerID, getImageUrl]);

  // Show eKYC Aadhaar photo when capturedImage changes (from parent)
  useEffect(() => {
    if (capturedImage && (capturedImage.startsWith("data:image") || capturedImage.startsWith("http"))) {
      setImageBase64(capturedImage);
      setExistingProfileImage(null);
      setIsCameraOpen(false);
    }
  }, [capturedImage]);


  // Start camera
  const startCamera = async () => {
    try {
      stopCamera(); // Stop existing stream if any
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error("Error accessing camera: ", error);
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
      if (videoRef.current) videoRef.current.srcObject = null;
    }
  };

  // Retake or Open Camera (shared)
  const handleCameraOpen = async () => {
    setImageBase64(null);
    setExistingProfileImage(null);
    if (getImageUrl) getImageUrl(null);
    setIsCameraOpen(true);
    await startCamera();
  };

  const takePhoto = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const photoBase64 = canvas.toDataURL("image/jpeg", 0.5);
    setImageBase64(photoBase64);
    stopCamera();
    setIsCameraOpen(false);
    if (getImageUrl) getImageUrl(photoBase64);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => stopCamera();
  }, []);

  return (
    <div className="flex flex-col items-center justify-center space-y-4 animate-fade-in">
      {/* === Existing image (no retake yet) === */}
      {existingProfileImage && !imageBase64 && !isCameraOpen && (
        <div style={{ textAlign: "center" }}>
          <img src={existingProfileImage} alt="Existing Profile"
            style={{ width: "100%", maxWidth: "400px", borderRadius: "8px", marginTop: "20px", border: "2px solid #ddd" }}
          />
          <div style={{ display: "flex", justifyContent: "center", marginTop: "10px" }}>
            
            <Button
              onClick={handleCameraOpen}
              style={{
                background: "linear-gradient(103.45deg, #614119 -11.68%, #CD9A50 48.54%, #614119 108.76%)",
                color: "white", display: "flex", alignItems: "center", gap: "8px"
              }}
              onMouseEnter={e => e.currentTarget.style.transform = "scale(1.05)"}
              onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
            >
              <RefreshCw className="w-6 h-6" />
              Retake Photo
            </Button>
          </div>
        </div>
      )}

      {/* === Camera Interface === */}
          {isCameraOpen && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <video
                ref={videoRef}
                autoPlay
            playsInline
                style={{
              width: "100%", maxWidth: "400px", height: "400px",
              objectFit: "cover", border: "1px solid black"
            }}
          />
          <Button
            onClick={takePhoto}
                style={{
                  marginTop: "10px",
              background: "linear-gradient(103.45deg, #614119 -11.68%, #CD9A50 48.54%, #614119 108.76%)",
              color: "white", display: "flex", alignItems: "center", gap: "8px"
            }}
            onMouseEnter={e => e.currentTarget.style.transform = "scale(1.05)"}
            onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
          >
            <Image />
                    Take Photo
                </Button>
            </div>
          )} 

      {/* === New captured photo === */}
      {imageBase64 && (
        <div style={{ textAlign: "center" }}>
          <img src={imageBase64} alt="Captured"
            style={{ width: "100%", maxWidth: "400px", borderRadius: "8px", marginTop: "20px" }}
          />
          {!aadharVerified && (
            <div style={{ display: "flex", justifyContent: "center", marginTop: "10px" }}>
              <Button
                onClick={handleCameraOpen}
                style={{
                  background: "linear-gradient(103.45deg, #614119 -11.68%, #CD9A50 48.54%, #614119 108.76%)",
                  color: "white", display: "flex", alignItems: "center", gap: "8px"
                }}
                onMouseEnter={e => e.currentTarget.style.transform = "scale(1.05)"}
                onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
              >
                <RefreshCw className="w-6 h-6" />
                Retake Photo
              </Button>
            </div>
          )}
        </div>
      )}

      {/* === No image at all, show open camera === */}
      {!existingProfileImage && !imageBase64 && !isCameraOpen && (
  <div style={{ display: "flex", justifyContent: "center", marginTop: "10px" }}>
    <Button
      onClick={handleCameraOpen}
      style={{
        background: "linear-gradient(103.45deg, #614119 -11.68%, #CD9A50 48.54%, #614119 108.76%)",
        color: "white", display: "flex", alignItems: "center", gap: "8px"
      }}
      onMouseEnter={e => e.currentTarget.style.transform = "scale(1.05)"}
      onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
    >
      <Camera />
      Open Camera
    </Button>
  </div>
)}


      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
};

export default CameraComponent;
