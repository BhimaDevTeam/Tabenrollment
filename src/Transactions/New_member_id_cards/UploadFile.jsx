import React, { useState, useEffect, useMemo, useRef } from "react";
import { Card, Form, Button, Alert, Table, Row, Col } from "react-bootstrap";
import useSWR from "swr";
import axios from "axios";
import { getCollectionApiUrl } from "../../apiurl";
import { useSelector } from "react-redux";
import { formatCurrency } from "../../utlis/currencyUtils";
import { IoCloseCircleOutline } from "react-icons/io5";

// Fetcher function
const fetcher = async (url) => {
  const response = await axios.get(url);
  return response.data;
};

export const resolveDocImageUrl = (doc, isAadharVerified) => {
  if (!doc) return "";
  let raw = String(
    doc.ImagePath || doc.ImageURL || doc.imagePath || doc.ImageUrl || ""
  ).trim();
  if (isAadharVerified === 1) {
    if (!raw && doc.Type === "AAD") return "/images/aadhardummy.png";
    if (!raw && doc.Type === "PAN") return "/images/pandummy.png";
  } else {
    if (raw.startsWith("/images/")) return "";
  }
  if (!raw) return "";
  if (
    raw.startsWith("data:") ||
    raw.startsWith("http://") ||
    raw.startsWith("https://") ||
    raw.startsWith("blob:") ||
    raw.startsWith("/images/")
  ) {
    return raw;
  }
  const clean = raw.replace(/^\/+/, "");
  return `https://vrudhi.bhima.info/DraftEnrollmentApi/${clean}`;
};

const UploadDocument = ({
  amount,
  noOfInstallments,
  schemename,
  onFileUpload,
  onDocImageError,
  uploadedDocs,
  onEkyc,
  aadharverified,
}) => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [docType, setDocType] = useState("");
  const [docNumber, setDocNumber] = useState("");
  const [docNumberError, setDocNumberError] = useState("");
  const [message, setMessage] = useState("");
  const [popupImage, setPopupImage] = useState(null);
  const [brokenImageUrls, setBrokenImageUrls] = useState({});

  const fileInputRef = useRef(null);
  const { selectedCustomerID, currencySymbol, selectedCountry } = useSelector(
    (state) => state.customer || {}
  );
  const activeSymbol = currencySymbol || "₹";
  const isSingapore = selectedCountry === "Singapore";
  const collectionApi = getCollectionApiUrl(selectedCountry);

  const isMobile = window.innerWidth < 768;

  const docHasValidImage = (doc) => {
    if (!doc || doc.imageError) return false;
    const resolved = resolveDocImageUrl(doc, aadharverified);
    if (!resolved) return false;
    if (brokenImageUrls[resolved]) return false;
    return true;
  };

  const insAmt = Number(amount || 0);
  const PAN_THRESHOLD = 143000;
  const isHighValue = insAmt >= PAN_THRESHOLD;
  const hasPanUploaded = (uploadedDocs || []).some(
    (doc) =>
      (doc.Type === "PAN" || doc.Type === "NRIC") &&
      (aadharverified === 1 || docHasValidImage(doc))
  );
  const isPanRequiredManually = isHighValue && !hasPanUploaded && !isSingapore;

  const { data: sgDocList } = useSWR(
    isSingapore ? `${collectionApi}/doclist?country=SG` : null,
    fetcher
  );

  const documentTypes = useMemo(() => {
    if (isSingapore && Array.isArray(sgDocList) && sgDocList.length > 0) {
      const typeCodeMap = {
        25: ["NRIC", "PAN"],
        26: ["DRI"],
        27: ["FIN", "VOT"],
        28: ["PAS"],
        30: ["OTH", "IMG"],
      };
      return sgDocList.map((item) => ({
        id: item.id,
        name: item.LovName,
        typeCode: typeCodeMap[item.id] || [String(item.id)],
      }));
    }

    if (isSingapore) {
      return [
        { id: 25, name: "NRIC Card", typeCode: ["NRIC", "PAN"] },
        { id: 26, name: "Driving License", typeCode: ["DRI"] },
        { id: 27, name: "E-Pass(FIN Number)", typeCode: ["FIN", "VOT"] },
        { id: 28, name: "Passport", typeCode: ["PAS"] },
        { id: 30, name: "Others", typeCode: ["OTH"] },
      ];
    }

    return [
      { id: 25, name: "PAN Card", typeCode: ["PAN"] },
      { id: 29, name: "Aadhar Card", typeCode: ["AAD"] },
      { id: 26, name: "Driving License", typeCode: ["DRI"] },
      { id: 27, name: "Voter ID Card", typeCode: ["VOT"] },
      { id: 28, name: "Passport", typeCode: ["PAS"] },
      { id: 24, name: "Scheme Opening Document", typeCode: ["NEF"] },
      { id: 30, name: "Profile Image", typeCode: ["IMG"] },
      { id: 31, name: "Aadhar Back", typeCode: ["ADB"] },
    ];
  }, [isSingapore, sgDocList]);

  const documentConfig = useMemo(
    () => ({
      25: isSingapore
        ? {
            pattern: /^[STFGM][0-9]{7}[A-Z]$/i,
            maxLength: 9,
            errorMessage: 'Please enter a valid NRIC number (e.g., "S1234567A").',
            type: "NRIC",
          }
        : {
            pattern: /^(?!.*\s)[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
            maxLength: 10,
            errorMessage: 'Please enter a valid PAN number (e.g., "ABCDE1234F").',
            type: "PAN",
          },
      26: {
        pattern: /^[A-Z0-9]{5,15}$/i,
        maxLength: 15,
        errorMessage: "Please enter a valid Driving License number.",
        type: "DRI",
      },
      27: isSingapore
        ? {
            pattern: /^[FGM][0-9]{7}[A-Z]$/i,
            maxLength: 9,
            errorMessage: 'Please enter a valid FIN number (e.g., "F1234567A").',
            type: "FIN",
          }
        : {
            pattern: /^[A-Z]{3}[0-9]{7}$/,
            maxLength: 10,
            errorMessage:
              'Please enter a valid Voter ID number (e.g., "XYZ1234567").',
            type: "VOT",
          },
      28: {
        pattern: /^[A-Z0-9]{6,12}$/i,
        maxLength: 12,
        errorMessage: "Please enter a valid Passport number.",
        type: "PAS",
      },
      29: {
        pattern: /^[0-9]{12}$/,
        maxLength: 12,
        errorMessage:
          'Please enter a valid 12-digit Aadhaar number (e.g., "123456789012").',
        type: "AAD",
      },
      30: {
        pattern: /^.+$/,
        maxLength: 30,
        errorMessage: "Please enter valid document details.",
        type: "OTH",
      },
    }),
    [isSingapore]
  );

  const verifyDocObj = useMemo(
    () => ({
      AAD: 29,
      PAN: 25,
      NRIC: 25,
      DRI: 26,
      VOT: 27,
      FIN: 27,
      PAS: 28,
      NEF: 24,
      IMG: 30,
      OTH: 30,
    }),
    []
  );

  const getMembershipNumber = () => {
    return selectedCustomerID?.MembershipNo || "000000";
  };

  const availableTypes = useMemo(() => {
    const excludedNames = ["Profile Image", "Scheme Opening Document"];

    return documentTypes.filter((doc) => {
      if (excludedNames.includes(doc.name)) return false;

      // Exclude only if the same document type is already uploaded WITH a valid image
      return !(uploadedDocs || []).some((uploaded) => {
        const uploadedTypeName = documentTypes.find((d) =>
          d.typeCode.includes(uploaded.Type)
        )?.name;
        const resolved = resolveDocImageUrl(uploaded, aadharverified);
        const hasValidImg =
          Boolean(resolved) && !uploaded.imageError && !brokenImageUrls[resolved];
        return uploadedTypeName === doc.name && hasValidImg;
      });
    });
  }, [uploadedDocs, documentTypes, brokenImageUrls, aadharverified]);

  const getDocTypeName = (type, typeId) => {
    const found = documentTypes.find(
      (d) =>
        d.typeCode.includes(type) ||
        Number(d.id) === Number(typeId) ||
        Number(d.id) === Number(type)
    );
    if (found) return found.name;
    if (type === "AAD" || Number(typeId) === 29) return "Aadhaar Card";
    if (type === "PAN" || type === "NRIC" || Number(typeId) === 25)
      return isSingapore ? "NRIC Card" : "PAN Card";
    if (type === "DRI" || Number(typeId) === 26) return "Driving License";
    if (type === "VOT" || Number(typeId) === 27) return "Voter ID Card";
    if (type === "PAS" || Number(typeId) === 28) return "Passport";
    if (type === "IMG" || Number(typeId) === 30) return "Profile Image";
    return type || "Document";
  };

  const displayDocs = useMemo(() => {
    if (!Array.isArray(uploadedDocs)) return [];
    const filtered = uploadedDocs.filter(
      (doc) =>
        !(
          doc.Type?.startsWith("NEF") ||
          doc.Type?.startsWith("SOD") ||
          doc.Type === "IMG" ||
          Number(doc.documentTypeId) === 30
        )
    );
    const uniqueDocs = [];
    const seen = new Set();
    const typeToIdMap = {
      AAD: 29,
      PAN: 25,
      NRIC: 25,
      DRI: 26,
      VOT: 27,
      PAS: 28,
      IMG: 30,
      NEF: 24,
    };

    filtered.forEach((doc) => {
      const typeId = Number(
        doc.documentTypeId ||
          doc.DocumentTypeID ||
          typeToIdMap[doc.Type] ||
          (!isNaN(doc.Type) ? Number(doc.Type) : 0) ||
          29
      );
      if (!seen.has(typeId)) {
        seen.add(typeId);
        uniqueDocs.push({ ...doc, resolvedTypeId: typeId });
      }
    });
    return uniqueDocs;
  }, [uploadedDocs]);

  const docsMissingImage = useMemo(() => {
    if (aadharverified === 1) return [];
    return displayDocs.filter((doc) => {
      const resolved = resolveDocImageUrl(doc, aadharverified);
      return !resolved || doc.imageError || Boolean(brokenImageUrls[resolved]);
    });
  }, [displayDocs, brokenImageUrls, aadharverified]);

  // Auto-select the first document missing an image so the user can upload right away
  useEffect(() => {
    if (!docType && docsMissingImage.length > 0) {
      const firstMissing = docsMissingImage[0];
      const targetTypeId = String(firstMissing.resolvedTypeId || 25);
      const existingNo = String(
        firstMissing.Name ||
          firstMissing.documentNo ||
          firstMissing.DocumentDescription ||
          firstMissing.DocumentDecription ||
          ""
      )
        .trim()
        .toUpperCase();
      setDocType(targetTypeId);
      if (existingNo) {
        setDocNumber(existingNo);
      }
    }
  }, [docsMissingImage, docType]);

  const validateDocNumber = (docTypeId, docNum) => {
    const config = documentConfig[docTypeId];
    if (!config) return null;
    return config.pattern.test(docNum.trim()) ? null : config.errorMessage;
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreview(
        selectedFile.type.startsWith("image/")
          ? URL.createObjectURL(selectedFile)
          : ""
      );
      setMessage("");
    }
  };

  const handleDocTypeChange = (e) => {
    const selectedTypeId = e.target.value;
    setDocType(selectedTypeId);
    const selectedDocDef = documentTypes.find(
      (d) => String(d.id) === String(selectedTypeId)
    );
    const existingDoc = (uploadedDocs || []).find(
      (u) =>
        Number(u.documentTypeId || u.DocumentTypeID) === Number(selectedTypeId) ||
        (selectedDocDef && selectedDocDef.typeCode.includes(u.Type))
    );
    const existingNo = String(
      existingDoc?.Name ||
        existingDoc?.documentNo ||
        existingDoc?.DocumentDescription ||
        existingDoc?.DocumentDecription ||
        ""
    )
      .trim()
      .toUpperCase();

    setDocNumber(existingNo);
    setDocNumberError(
      existingNo ? validateDocNumber(selectedTypeId, existingNo) : ""
    );
    setMessage("");
  };

  const handleQuickUploadForDoc = (doc) => {
    const typeToIdMap = {
      AAD: 29,
      PAN: 25,
      NRIC: 25,
      DRI: 26,
      VOT: 27,
      PAS: 28,
      IMG: 30,
      NEF: 24,
    };
    const targetTypeId = String(
      doc.resolvedTypeId ||
        doc.documentTypeId ||
        doc.DocumentTypeID ||
        typeToIdMap[doc.Type] ||
        25
    );
    const existingNo = String(
      doc.Name ||
        doc.documentNo ||
        doc.DocumentDescription ||
        doc.DocumentDecription ||
        ""
    )
      .trim()
      .toUpperCase();

    setDocType(targetTypeId);
    setDocNumber(existingNo);
    setDocNumberError(
      existingNo ? validateDocNumber(targetTypeId, existingNo) : ""
    );
    setMessage("");

    setTimeout(() => {
      if (fileInputRef.current && !fileInputRef.current.disabled) {
        fileInputRef.current.click();
      } else if (fileInputRef.current) {
        fileInputRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 100);
  };

  const handleDocNumberChange = (e) => {
    const value = e.target.value.toUpperCase();
    const maxLength = docType && documentConfig[docType]?.maxLength;
    if (!maxLength || value.length <= maxLength) {
      setDocNumber(value);
      const error = validateDocNumber(docType, value);
      setDocNumberError(error);
    }
    setMessage("");
  };

  const handleUpload = () => {
    if (!docType || !docNumber || !file) {
      setMessage("All fields are required.");
      return;
    }

    const error = validateDocNumber(docType, docNumber);
    if (error) {
      setDocNumberError(error);
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const mimeType = file.type;
      const base64String = reader.result.split(",")[1];
      if (!base64String) {
        setMessage("Base64 conversion failed.");
        return;
      }

      const documentData = `data:${mimeType};base64,${base64String}`;
      const selectedDoc = documentTypes.find(
        (d) => Number(d.id) === Number(docType)
      );
      let typeCode = selectedDoc?.typeCode[0];

      if (typeCode === "NEF") {
        typeCode = `NEF${getMembershipNumber()}`;
      }

      onFileUpload({
        documentData,
        docType,
        docNumber,
        verifyDocObj,
        typeCode,
      });

      setMessage("Document uploaded successfully!");
      setFile(null);
      setPreview("");
      setDocType("");
      setDocNumber("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    };

    reader.onerror = () => {
      setMessage("File read error.");
    };

    reader.readAsDataURL(file);
  };

  const handleDelete = () => {
    setFile(null);
    setPreview("");
    setDocType("");
    setDocNumber("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const isEkycEnabled =
    (localStorage.getItem("EnableEkyc") ||
      window.APP_CONFIG?.EnableEkyc ||
      "0") === "1";

  return (
    <div>
      <Card className="mb-3">
        <Card.Body>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "10px",
            }}
          >
            <Card.Title className="text-center mb-0">Upload Documents</Card.Title>
            {isEkycEnabled && !isSingapore && onEkyc && aadharverified !== 1 && (
              <Button
                size="sm"
                onClick={onEkyc}
                style={{
                  background:
                    "linear-gradient(103.45deg, #614119 -11.68%, #CD9A50 48.54%, #614119 108.76%)",
                  color: "white",
                  border: "none",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontWeight: "bold",
                }}
              >
                <i className="bi bi-shield-check" style={{ fontSize: "16px" }}></i>
                Send for eKYC
              </Button>
            )}
          </div>
          {!isSingapore && aadharverified === 1 && (
            <Alert variant="success" className="mb-3">
              <i
                className="bi bi-check-circle-fill"
                style={{ marginRight: "8px" }}
              ></i>
              eKYC verified. Documents fetched from DigiLocker.
            </Alert>
          )}

          {docsMissingImage.length > 0 && (
            <Alert
              variant="warning"
              className="mb-3"
              style={{
                borderLeft: "5px solid #dc3545",
                backgroundColor: "#fff8e6",
                color: "#856404",
              }}
            >
              <i
                className="bi bi-exclamation-triangle-fill"
                style={{ marginRight: "8px", color: "#dc3545" }}
              ></i>
              <strong>Document Image Required:</strong>{" "}
              {docsMissingImage
                .map(
                  (d) =>
                    `${getDocTypeName(d.Type, d.documentTypeId)}${
                      d.Name || d.documentNo ? ` (${d.Name || d.documentNo})` : ""
                    }`
                )
                .join(", ")}{" "}
              has no image attached. Please choose a file and click{" "}
              <strong>Upload</strong> below (or click{" "}
              <strong>Upload Image</strong> in the table).
            </Alert>
          )}

          {isPanRequiredManually && (
            <Alert
              variant="warning"
              className="mb-3"
              style={{
                borderLeft: "5px solid #dc3545",
                backgroundColor: "#fff3cd",
                color: "#856404",
              }}
            >
              <i
                className="bi bi-exclamation-triangle-fill"
                style={{ marginRight: "8px", color: "#dc3545" }}
              ></i>
              <strong>PAN Card Mandatory!</strong> Installment amount is{" "}
              {formatCurrency(insAmt, activeSymbol)} (
              {formatCurrency(143000, activeSymbol)} &amp; above). PAN Card is
              mandatory. Please upload your PAN Card image below.
            </Alert>
          )}

          {(aadharverified !== 1 ||
            isPanRequiredManually ||
            availableTypes.length > 0) && (
            <>
              <Row className="mb-3 align-items-end upload-document-items">
                <Col md={4}>
                  {availableTypes.length === 0 ? (
                    <Alert variant="success" className="mt-2 mb-0">
                      All documents uploaded!
                    </Alert>
                  ) : (
                    <div className="selextParentBox">
                      <Form.Select
                        value={docType}
                        onChange={handleDocTypeChange}
                        name="uploadd-cocument"
                      >
                        <option value="">Select Document</option>
                        {availableTypes.map((type) => (
                          <option key={type.id} value={type.id}>
                            {type.name}
                          </option>
                        ))}
                      </Form.Select>
                    </div>
                  )}
                </Col>
                <Col md={4}>
                  <Form.Control
                    type="text"
                    placeholder="Enter Document Number"
                    value={docNumber}
                    onChange={handleDocNumberChange}
                    disabled={availableTypes.length === 0}
                  />
                </Col>
                <Col md={4}>
                  <Form.Control
                    type="file"
                    ref={fileInputRef}
                    disabled={
                      !docType || !docNumber || availableTypes.length === 0
                    }
                    accept="image/*,application/pdf"
                    onChange={handleFileChange}
                  />
                </Col>
              </Row>

              <div className="text-center">
                {preview ? (
                  <img
                    src={preview}
                    alt="Preview"
                    style={{
                      width: 120,
                      height: 85,
                      borderRadius: "8px",
                      objectFit: "cover",
                      border: "1px solid #cd9a50",
                    }}
                  />
                ) : file?.type === "application/pdf" ? (
                  <div>
                    <i
                      className="bi bi-file-earmark-pdf-fill"
                      style={{ fontSize: "30px" }}
                    ></i>
                    <p>PDF Selected</p>
                  </div>
                ) : (
                  <i className="bi bi-camera" style={{ fontSize: "40px" }}></i>
                )}
              </div>

              {file && (
                <div className="text-center mt-2">
                  <Button variant="primary" size="sm" onClick={handleUpload}>
                    Upload
                  </Button>{" "}
                  <Button variant="danger" size="sm" onClick={handleDelete}>
                    Delete
                  </Button>
                </div>
              )}
            </>
          )}
        </Card.Body>
      </Card>

      {docNumberError && <Alert variant="danger">{docNumberError}</Alert>}
      {message && (
        <Alert variant={message.includes("success") ? "success" : "danger"}>
          {message}
        </Alert>
      )}

      <h5 className="mt-4">Uploaded Documents</h5>
      <div className="sm-table">
        <Table striped bordered hover>
          <thead>
            <tr>
              <th>Sl. No.</th>
              <th>Doc Type</th>
              <th>Doc No.</th>
              <th>Preview</th>
            </tr>
          </thead>
          <tbody>
            {displayDocs.length > 0 ? (
              displayDocs.map((doc, index) => {
                const resolvedImg = resolveDocImageUrl(doc, aadharverified);
                const hasValidImg =
                  Boolean(resolvedImg) &&
                  !doc.imageError &&
                  !brokenImageUrls[resolvedImg];
                const isPdf =
                  hasValidImg &&
                  (resolvedImg.toLowerCase().endsWith(".pdf") ||
                    resolvedImg.startsWith("data:application/pdf"));

                return (
                  <tr key={index}>
                    <td style={{ verticalAlign: "middle" }}>{index + 1}</td>
                    <td style={{ verticalAlign: "middle" }}>
                      {getDocTypeName(doc.Type, doc.documentTypeId)}
                    </td>
                    <td style={{ verticalAlign: "middle" }}>
                      {doc.Name ||
                        doc.documentNo ||
                        doc.DocumentDescription ||
                        doc.DocumentDecription ||
                        "-"}
                    </td>
                    <td style={{ verticalAlign: "middle" }}>
                      {hasValidImg && !isPdf ? (
                        <div
                          style={{
                            display: "inline-flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: "4px",
                            cursor: "pointer",
                          }}
                          onClick={() => setPopupImage(resolvedImg)}
                          title="Click to view full document image"
                        >
                          <img
                            src={resolvedImg}
                            alt={getDocTypeName(doc.Type, doc.documentTypeId)}
                            style={{
                              width: "96px",
                              height: "62px",
                              objectFit: "cover",
                              borderRadius: "6px",
                              border: "1px solid #cd9a50",
                              backgroundColor: "#f8f9fa",
                            }}
                            onError={() => {
                              setBrokenImageUrls((prev) => ({
                                ...prev,
                                [resolvedImg]: true,
                              }));
                              if (typeof onDocImageError === "function") {
                                onDocImageError(doc);
                              }
                            }}
                          />
                          <span
                            style={{
                              fontSize: "11px",
                              color: "#614119",
                              fontWeight: "600",
                            }}
                          >
                            <i className="bi bi-eye"></i> View
                          </span>
                        </div>
                      ) : isPdf ? (
                        <span
                          style={{
                            cursor: "pointer",
                            color: "#614119",
                            fontWeight: "600",
                          }}
                          onClick={() => window.open(resolvedImg, "_blank")}
                        >
                          <i className="bi bi-file-earmark-pdf-fill"></i> View PDF
                        </span>
                      ) : (
                        <div
                          style={{
                            display: "inline-flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "12px",
                              color: "#dc3545",
                              fontWeight: "600",
                            }}
                          >
                            <i
                              className="bi bi-exclamation-circle-fill"
                              style={{ marginRight: "4px" }}
                            ></i>
                            No Image
                          </span>
                          <Button
                            size="sm"
                            onClick={() => handleQuickUploadForDoc(doc)}
                            style={{
                              background:
                                "linear-gradient(103.45deg, #614119 -11.68%, #CD9A50 48.54%, #614119 108.76%)",
                              color: "#fff",
                              border: "none",
                              fontSize: "12px",
                              padding: "3px 10px",
                              fontWeight: "600",
                            }}
                          >
                            <i
                              className="bi bi-upload"
                              style={{ marginRight: "4px" }}
                            ></i>
                            Upload Image
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="4" className="text-center">
                  No documents uploaded.
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>

      {popupImage && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
          onClick={() => setPopupImage(null)}
        >
          <div
            style={{
              backgroundColor: "white",
              padding: "20px",
              borderRadius: "8px",
              ...(isMobile ? { width: "90vw" } : { width: "90vh" }),
              maxWidth: "1200px",
              position: "relative",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              overflow: "hidden",
              boxSizing: "border-box",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              style={{
                position: "absolute",
                top: "10px",
                right: "15px",
                background: "none",
                border: "none",
                fontSize: "24px",
                cursor: "pointer",
                color: "#333",
              }}
              onClick={() => setPopupImage(null)}
            >
              <IoCloseCircleOutline color="brown" size={30} />
            </button>
            <img
              src={popupImage}
              alt="Preview"
              style={{
                maxWidth: "100%",
                maxHeight: "100%",
                width: "100%",
                height: "100%",
                objectFit: "contain",
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadDocument;
