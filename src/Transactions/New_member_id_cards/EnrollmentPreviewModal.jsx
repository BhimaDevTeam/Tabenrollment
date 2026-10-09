import React, { useState } from "react";
import "./EnrollmentPreviewModal.css";
import { formatCurrency } from "../../utlis/currencyUtils";
import { calculateAge } from "../PickDate/DateUtils";

const EnrollmentPreviewModal = ({
  open,
  onClose,
  onConfirmSave,
  onEditSection,
  isSaving = false,
  subscriberData = {},
  membershipData = {},
  nomineeData = {},
  bankData = {},
  guardaianData = {},
  image = "",
  ekycSignature = null,
  uploadedDocs = [],
  aadharverified = 0,
  aadharNo = "",
  branchName = "",
  branchCode = "",
  currencySymbol = "₹",
  selectedCountry = "India",
  paymentMode = "offline",
  noOfInstallments = 11,
}) => {
  const [imgError, setImgError] = useState(false);

  if (!open) return null;

  // ── Singapore concept commented out - India live only ──────────────────
  // const isSingapore = selectedCountry === "Singapore";
  const isSingapore = false;
  const activeCurrency = "₹";

  // Format Subscriber address
  const fullAddress = [
    subscriberData.address1,
    subscriberData.address2,
    subscriberData.area,
    subscriberData.city,
    subscriberData.state,
    subscriberData.pinCode,
  ]
    .filter((part) => part && String(part).trim().length > 0)
    .join(", ");

  // Nominee address
  const nomineeFullAddress = nomineeData.nomineeaddress || subscriberData.address1 || "-";

  // Age calculation
  const customerAge = subscriberData.dob ? calculateAge(subscriberData.dob) : null;

  // Commodity / metal display
  const metalType =
    membershipData.commodityTypeId === 1 || String(membershipData.commodityTypeId) === "1"
      ? "Gold"
      : membershipData.commodityTypeId === 2 || String(membershipData.commodityTypeId) === "2"
      ? "Silver"
      : membershipData.commodityTypeId || "Gold";

  // Installment amount & Total Payable in India (exact amount without GST markup)
  const installmentAmt = Number(membershipData.installmentAmount) || 0;
  const totalPayable = installmentAmt;

  // Resolve Photo URL
  const resolvePhotoUrl = (raw) => {
    if (!raw || typeof raw !== "string") return "";
    if (
      raw.startsWith("data:image") ||
      raw.startsWith("http://") ||
      raw.startsWith("https://") ||
      raw.startsWith("blob:")
    ) {
      return raw;
    }
    const clean = raw.replace(/^\/+/, "");
    return `https://vrudhi.bhima.info/DraftEnrollmentApi/${clean}`;
  };

  const photoUrl = resolvePhotoUrl(image);

  // Has guardian info
  const hasGuardian =
    guardaianData &&
    (guardaianData.guardname ||
      guardaianData.guardrelationship ||
      guardaianData.guardphone ||
      guardaianData.relationshipName);

  // Has bank info
  const hasBank =
    bankData &&
    (bankData.accountNo || bankData.ifscCode || bankData.bankName);

  return (
    <div className="epm-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="epm-modal-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="epm-modal-header">
          <div className="epm-header-left">
            <div className="epm-header-icon-box">📋</div>
            <div>
              <h3 className="epm-header-title">Enrollment Details Preview</h3>
              <p className="epm-header-sub">
                Review all entered information before confirming and saving
              </p>
            </div>
          </div>
          <button
            type="button"
            className="epm-header-close-btn"
            onClick={onClose}
            aria-label="Close Preview"
          >
            &times;
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="epm-modal-body">
          {/* Hero Summary Card */}
          <div className="epm-hero-card">
            <div className="epm-hero-user">
              <div className="epm-hero-avatar-box">
                {photoUrl && !imgError ? (
                  <img
                    src={photoUrl}
                    alt="Subscriber"
                    className="epm-hero-avatar-img"
                    onError={() => setImgError(true)}
                  />
                ) : (
                  <span className="epm-hero-avatar-fallback">👤</span>
                )}
              </div>
              <div>
                <h4 className="epm-hero-name">
                  {subscriberData.subscriberName || "Subscriber Name"}
                  {aadharverified === 1 && (
                    <span className="epm-badge epm-badge-verified">✓ eKYC Verified</span>
                  )}
                </h4>
                <div className="epm-hero-meta">
                  <span className="epm-hero-meta-item">
                    📱 {subscriberData.mobileNo || "-"}
                  </span>
                  <span>•</span>
                  <span className="epm-hero-meta-item">
                    ✨ {membershipData.selectedSchemeName || "Scheme"}
                  </span>
                  {branchName && (
                    <>
                      <span>•</span>
                      <span className="epm-hero-meta-item">
                        📍 {branchName} {branchCode ? `(${branchCode})` : ""}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="epm-hero-amount-box">
              <span className="epm-hero-amount-label">Monthly Installment</span>
              <div className="epm-hero-amount-val">
                {formatCurrency(installmentAmt, activeCurrency)}
              </div>
            </div>
          </div>

          {/* 1. Subscriber Details */}
          <div className="epm-section-card">
            <div className="epm-section-head">
              <div className="epm-section-title-wrap">
                <span className="epm-section-icon">👤</span>
                <h5 className="epm-section-title">Subscriber Details</h5>
                <span className="epm-badge epm-badge-gold">Personal Info</span>
              </div>
              <button
                type="button"
                className="epm-edit-btn"
                onClick={() => onEditSection("subscriber-header")}
                title="Edit Subscriber Details"
              >
                ✏️ Edit
              </button>
            </div>
            <div className="epm-grid">
              <div className="epm-field">
                <span className="epm-label">Full Name</span>
                <span className="epm-val">{subscriberData.subscriberName || "-"}</span>
              </div>
              <div className="epm-field">
                <span className="epm-label">Mobile Number</span>
                <span className="epm-val">{subscriberData.mobileNo || "-"}</span>
              </div>
              <div className="epm-field">
                <span className="epm-label">Email ID</span>
                <span className="epm-val">{subscriberData.email || "-"}</span>
              </div>
              <div className="epm-field">
                <span className="epm-label">Gender</span>
                <span className="epm-val">{subscriberData.gender || "-"}</span>
              </div>
              <div className="epm-field">
                <span className="epm-label">Date of Birth / Age</span>
                <span className="epm-val">
                  {subscriberData.dob || "-"} {customerAge ? `(${customerAge} yrs)` : ""}
                </span>
              </div>
              <div className="epm-field">
                <span className="epm-label">Aadhaar Number</span>
                <span className="epm-val">
                  {aadharNo || "-"}
                  {aadharverified === 1 ? (
                    <span className="epm-badge epm-badge-verified ms-1">Verified</span>
                  ) : (
                    <span className="epm-badge epm-badge-pending ms-1">Unverified</span>
                  )}
                </span>
              </div>
              <div className="epm-field epm-grid-full">
                <span className="epm-label">Address</span>
                <span className="epm-val">{fullAddress || "-"}</span>
              </div>
            </div>
          </div>

          {/* 2. Guardian Details (if minor / entered) */}
          {hasGuardian && (
            <div className="epm-section-card">
              <div className="epm-section-head">
                <div className="epm-section-title-wrap">
                  <span className="epm-section-icon">🛡️</span>
                  <h5 className="epm-section-title">Guardian Details</h5>
                  <span className="epm-badge epm-badge-pending">Minor Representative</span>
                </div>
                <button
                  type="button"
                  className="epm-edit-btn"
                  onClick={() => onEditSection("guardian-header")}
                  title="Edit Guardian Details"
                >
                  ✏️ Edit
                </button>
              </div>
              <div className="epm-grid">
                <div className="epm-field">
                  <span className="epm-label">Guardian Name</span>
                  <span className="epm-val">{guardaianData.guardname || "-"}</span>
                </div>
                <div className="epm-field">
                  <span className="epm-label">Relationship to Minor</span>
                  <span className="epm-val">
                    {guardaianData.relationshipName ||
                      guardaianData.guardrelationship ||
                      "-"}
                  </span>
                </div>
                <div className="epm-field">
                  <span className="epm-label">Guardian Phone / Gender</span>
                  <span className="epm-val">
                    {guardaianData.guardphone || guardaianData.guardGender || "-"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 3. Scheme Details */}
          <div className="epm-section-card">
            <div className="epm-section-head">
              <div className="epm-section-title-wrap">
                <span className="epm-section-icon">💎</span>
                <h5 className="epm-section-title">Scheme & Plan Details</h5>
                <span className="epm-badge epm-badge-gold">Subscription</span>
              </div>
              <button
                type="button"
                className="epm-edit-btn"
                onClick={() => onEditSection("membership-header")}
                title="Edit Scheme Details"
              >
                ✏️ Edit
              </button>
            </div>
            <div className="epm-grid">
              <div className="epm-field">
                <span className="epm-label">Scheme Name</span>
                <span className="epm-val epm-val-highlight">
                  {membershipData.selectedSchemeName || "-"}
                </span>
              </div>
              <div className="epm-field">
                <span className="epm-label">Scheme Code</span>
                <span className="epm-val">{membershipData.selectedSchemeCode || "-"}</span>
              </div>
              <div className="epm-field">
                <span className="epm-label">Metal / Commodity</span>
                <span className="epm-val">{metalType}</span>
              </div>
              <div className="epm-field">
                <span className="epm-label">Monthly Installment</span>
                <span className="epm-val epm-val-highlight">
                  {formatCurrency(installmentAmt, activeCurrency)}
                </span>
              </div>
              <div className="epm-field">
                <span className="epm-label">Tenure / Installments</span>
                <span className="epm-val">{noOfInstallments || 11} Months</span>
              </div>
              <div className="epm-field">
                <span className="epm-label">Branch</span>
                <span className="epm-val">
                  {branchName || branchCode || membershipData.branch || "-"}
                </span>
              </div>
            </div>
          </div>

          {/* 4. Nominee Details */}
          <div className="epm-section-card">
            <div className="epm-section-head">
              <div className="epm-section-title-wrap">
                <span className="epm-section-icon">👥</span>
                <h5 className="epm-section-title">Nominee Details</h5>
                <span className="epm-badge epm-badge-gold">Beneficiary</span>
              </div>
              <button
                type="button"
                className="epm-edit-btn"
                onClick={() => onEditSection("nominee-header")}
                title="Edit Nominee Details"
              >
                ✏️ Edit
              </button>
            </div>
            <div className="epm-grid">
              <div className="epm-field">
                <span className="epm-label">Nominee Name</span>
                <span className="epm-val">{nomineeData.nomineename || "-"}</span>
              </div>
              <div className="epm-field">
                <span className="epm-label">Relationship</span>
                <span className="epm-val">
                  {nomineeData.relationshipName || nomineeData.relationship || "-"}
                </span>
              </div>
              <div className="epm-field">
                <span className="epm-label">Contact Number</span>
                <span className="epm-val">{nomineeData.nomineephoneno || "-"}</span>
              </div>
              <div className="epm-field epm-grid-full">
                <span className="epm-label">Nominee Address</span>
                <span className="epm-val">{nomineeFullAddress}</span>
              </div>
            </div>
          </div>

          {/* 5. Bank Account Details (if applicable) */}
          {hasBank && (
            <div className="epm-section-card">
              <div className="epm-section-head">
                <div className="epm-section-title-wrap">
                  <span className="epm-section-icon">🏦</span>
                  <h5 className="epm-section-title">Bank Account Details</h5>
                </div>
                <button
                  type="button"
                  className="epm-edit-btn"
                  onClick={() => onEditSection("bank-header")}
                  title="Edit Bank Details"
                >
                  ✏️ Edit
                </button>
              </div>
              <div className="epm-grid">
                <div className="epm-field">
                  <span className="epm-label">Account Number</span>
                  <span className="epm-val">{bankData.accountNo || "-"}</span>
                </div>
                <div className="epm-field">
                  <span className="epm-label">IFSC Code</span>
                  <span className="epm-val">{bankData.ifscCode || "-"}</span>
                </div>
                <div className="epm-field">
                  <span className="epm-label">Bank / Branch Name</span>
                  <span className="epm-val">{bankData.bankName || "-"}</span>
                </div>
              </div>
            </div>
          )}

          {/* 6. Uploaded Documents */}
          <div className="epm-section-card">
            <div className="epm-section-head">
              <div className="epm-section-title-wrap">
                <span className="epm-section-icon">📄</span>
                <h5 className="epm-section-title">KYC Documents</h5>
                <span className="epm-badge epm-badge-gold">
                  {uploadedDocs?.length || 0} Document(s)
                </span>
              </div>
              <button
                type="button"
                className="epm-edit-btn"
                onClick={() => onEditSection("uploaddoc-header")}
                title="Edit Uploaded Documents"
              >
                ✏️ Edit
              </button>
            </div>
            {uploadedDocs && uploadedDocs.length > 0 ? (
              <div className="epm-docs-list">
                {uploadedDocs.map((doc, idx) => (
                  <div key={idx} className="epm-doc-chip">
                    <span className="epm-doc-chip-icon">📎</span>
                    <span>
                      <strong>{doc.Type || doc.DocumentTypeName || `Doc ${idx + 1}`}:</strong>{" "}
                      {doc.Name || doc.documentNo || "Uploaded"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="epm-media-empty">No documents uploaded yet</div>
            )}
          </div>

          {/* 7. Subscriber Photo (Signature commented out as requested) */}
          <div className="epm-section-card">
            <div className="epm-section-head">
              <div className="epm-section-title-wrap">
                <span className="epm-section-icon">📷</span>
                <h5 className="epm-section-title">Subscriber Photo</h5>
              </div>
              <button
                type="button"
                className="epm-edit-btn"
                onClick={() => onEditSection("camera-header")}
                title="Retake or change photo"
              >
                📸 Retake Photo
              </button>
            </div>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <div className="epm-media-box" style={{ width: "100%", maxWidth: "340px" }}>
                <span className="epm-media-title">SUBSCRIBER PHOTO</span>
                {photoUrl && !imgError ? (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                    <img
                      src={photoUrl}
                      alt="Customer Photo"
                      className="epm-media-preview-img"
                      onError={() => setImgError(true)}
                    />
                    <button
                      type="button"
                      className="epm-edit-btn"
                      onClick={() => onEditSection("camera-header")}
                      style={{ marginTop: "4px" }}
                    >
                      📸 Retake Photo
                    </button>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", padding: "12px" }}>
                    <span style={{ fontSize: "36px" }}>👤</span>
                    <span className="epm-media-empty">Photo not captured or preview unavailable</span>
                    <button
                      type="button"
                      className="epm-edit-btn"
                      onClick={() => onEditSection("camera-header")}
                      style={{ marginTop: "4px" }}
                    >
                      📸 Take / Retake Photo
                    </button>
                  </div>
                )}
              </div>

              {/* Customer signature commented out as requested */}
              {/*
              <div className="epm-media-box">
                <span className="epm-media-title">Customer Signature</span>
                {ekycSignature ? (
                  <img
                    src={ekycSignature}
                    alt="Customer Signature"
                    className="epm-media-preview-img"
                  />
                ) : (
                  <span className="epm-media-empty">Signature not provided</span>
                )}
              </div>
              */}
            </div>
          </div>

          {/* 8. Payment Summary */}
          <div className="epm-section-card">
            <div className="epm-section-head">
              <div className="epm-section-title-wrap">
                <span className="epm-section-icon">💳</span>
                <h5 className="epm-section-title">Payment Summary</h5>
                <span className="epm-badge epm-badge-gold">
                  {paymentMode === "online" ? "Online Payment" : "Offline / Showroom"}
                </span>
              </div>
              <button
                type="button"
                className="epm-edit-btn"
                onClick={() => onEditSection("payment-header")}
                title="Edit Payment Mode"
              >
                ✏️ Edit
              </button>
            </div>
            <div className="epm-grid epm-grid-col2">
              <div className="epm-field">
                <span className="epm-label">Payment Mode</span>
                <span className="epm-val">
                  {paymentMode === "online"
                    ? "Online Payment Link"
                    : "Offline Payment (Pay at Showroom / Counter)"}
                </span>
              </div>
              <div className="epm-field">
                <span className="epm-label">Total Payable Amount</span>
                <span className="epm-val epm-val-highlight" style={{ fontSize: "1.15rem", color: "#614119" }}>
                  {formatCurrency(totalPayable, activeCurrency)}
                </span>
              </div>
              <div className="epm-field">
                <span className="epm-label">Terms & Conditions</span>
                <span className="epm-val" style={{ color: "#166534" }}>
                  ✅ Accepted
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Sticky Footer Action Bar */}
        <div className="epm-modal-footer">
          <button
            type="button"
            className="epm-btn-back"
            onClick={onClose}
            disabled={isSaving}
          >
            ✏️ Back to Edit
          </button>
          <button
            type="button"
            className="epm-btn-save"
            onClick={onConfirmSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <span className="epm-spinner"></span>
                <span>Saving Enrollment...</span>
              </>
            ) : (
              <>
                <span>✅ Confirm & Save Enrollment</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EnrollmentPreviewModal;
