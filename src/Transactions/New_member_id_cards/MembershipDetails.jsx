import React, { useState, useEffect } from "react";
import { Form, Modal, Button } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import { useSearchParams } from 'react-router-dom';
import { useSelector } from "react-redux";
import { formatCurrency, replaceCurrencySymbols } from "../../utlis/currencyUtils";
import {COLLECTION_API} from "../../apiurl"
import { SCHEME_COMMODITY_RATE_MAP } from "../../utlis/commodityConfig";
import schemesDisplayData from "../../data/schemesData";

// Singapore branch codes: app-facing → DB branch code mapping
const SINGAPORE_BRANCH_MAP = { LN: "LI", LI: "LI" };
const SINGAPORE_BRANCHES = Object.keys(SINGAPORE_BRANCH_MAP);

const Membershipdetails = ({ setMembershipData, branch ,errorValidate, clearError, membershipData, validateMembership ,isdraftid_gen, preSelectedScheme}) => {
  const { currencySymbol, selectedCountry } = useSelector((state) => state.customer || {});
  const activeSymbol = currencySymbol || "₹";
  const isSingapore = selectedCountry === "Singapore";

  const [schemeData, setSchemeData] = useState([]);
  const [branchData, setBranchData] = useState([]);
  const [commodityRates, setCommodityRates] = useState({});
  const [calculatedWeight, setCalculatedWeight] = useState({});
  const [showCalculator, setShowCalculator] = useState(false);
  const [showSchemeBrowser, setShowSchemeBrowser] = useState(false);
  const [browsingScheme, setBrowsingScheme] = useState(null);
  const [isLocked, setIsLocked] = useState(!!preSelectedScheme);

  const [formData, setFormData] = useState({
    selectedSchemeCode: '',
    selectedSchemeName: '',
    minInsValue: '',
    insMultiples: '',
    schemeType: '',
    commodityTypeId: '',
    installmentAmount: '',
    branch: '',
    isGSTInclusive: 0,
    gstValue: 0,
  });
  // console.log("branch in bmem", branch);
  // console.log("branchdata", branchData);
  const [searchParams] = useSearchParams();
 
  useEffect(() => {
    fetchBranchData();
    fetchSchemeData();
  }, [searchParams,formData.branch]);

  const fetchBranchData = async () => {
    try {
      const branchFromParams = localStorage.getItem('decodedBranch');

      // — Singapore branch: bypass India DB lookup, map LN → LI directly
      if (branchFromParams && SINGAPORE_BRANCHES.includes(branchFromParams.toUpperCase())) {
        const sgBranchCode = SINGAPORE_BRANCH_MAP[branchFromParams.toUpperCase()] || branchFromParams.toUpperCase();
        setFormData(prevData => ({ ...prevData, branch: sgBranchCode }));
        return;
      }

      // — India branches: normal lookup against India DB
      const response = await fetch(`${COLLECTION_API}/branchdetails`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error(`Network response was not ok: ${response.statusText}`);
      }

      const responseData = await response.json();
      setBranchData(responseData);

      if (branchFromParams) {
        const isValidBranch = responseData.filter(branch => branch.Branch_Code === branchFromParams);
        if (isValidBranch.length) {
          setFormData(prevData => ({
            ...prevData,
            branch: isValidBranch[0].Branch_Code
          }));
        }
      }
    } catch (error) {
      console.error("Error fetching branch data:", error);
    }
  };


  const fetchSchemeData = async () => {
    if (!formData.branch) return;
    try {
      const isSingapore = selectedCountry === "Singapore";
      const response = await fetch(`${COLLECTION_API}/schemes?branch=${formData.branch}&country=${selectedCountry}`, {
        method: "GET",
        headers: {
          "Key": "WEYA5TXDZCEEZFG9CLATH37HFV84AMH6794CVYGVY8WXS52",
          "Content-Type": "application/json",
          "country": selectedCountry || "India",
          "country-code": isSingapore ? "sg" : "in",
        },
      });

      if (!response.ok) {
        throw new Error(`Network response was not ok: ${response.statusText}`);
      }

      const responseData = await response.json();
      // console.log("responsedata", responseData);

      if (Array.isArray(responseData) && responseData.length > 0) {
        const activeSchemes = responseData.filter(s => {
          if (s.isClosed && String(s.isClosed).toUpperCase() === 'Y') return false;
          const isTabEn = s.isTabEnScheme ?? s.IsTabEnScheme ?? s.isTabEn ?? s.IsTabEn;
          const isEnabled =
            isTabEn === true ||
            Number(isTabEn) === 1 ||
            String(isTabEn).toLowerCase() === 'true' ||
            String(isTabEn).toUpperCase() === 'Y' ||
            String(isTabEn) === '1';
          return isEnabled;
        });
        // Show Shreyas first in scheme list
        activeSchemes.sort((a, b) => {
          const aSh = /shreyas/i.test(a.SchemeName || "") || /^BSR/i.test(a.SchemeCode || "") ? 0 : 1;
          const bSh = /shreyas/i.test(b.SchemeName || "") || /^BSR/i.test(b.SchemeCode || "") ? 0 : 1;
          return aSh - bSh;
        });
        setSchemeData(activeSchemes);

        // Auto-select scheme if preSelectedScheme is provided and not already selected
        if (preSelectedScheme && !formData.selectedSchemeCode) {
          let searchCode = "";
          let searchName = "";
          if (typeof preSelectedScheme === "string") {
            searchName = preSelectedScheme;
          } else if (typeof preSelectedScheme === "object" && preSelectedScheme !== null) {
            searchCode = preSelectedScheme.SchemeCode || preSelectedScheme.schemeCode || preSelectedScheme.apiSchemeData?.SchemeCode || "";
            searchName = preSelectedScheme.title || preSelectedScheme.SchemeName || preSelectedScheme.schemeName || "";
          }

          const match = activeSchemes.find(s => {
            if (searchCode && String(s.SchemeCode).toUpperCase() === String(searchCode).toUpperCase()) return true;
            if (searchName && s.SchemeName) {
              const sName = s.SchemeName.toLowerCase();
              const pStr = searchName.toLowerCase();
              return sName.includes(pStr) || pStr.includes(sName);
            }
            return false;
          });

          if (match) {
            setFormData(prev => ({
              ...prev,
              selectedSchemeCode: match.SchemeCode,
              selectedSchemeName: match.SchemeName,
              minInsValue: match.MinInsValue,
              insMultiples: match.InsMultiples,
              schemeType: match.SchemeType,
              commodityTypeId: match.CommodityTypeID,
              installmentAmount: '',
              isGSTInclusive: Number(match.IsGSTInclusive) || 0,
              gstValue: Number(match.GSTValue) || 0,
            }));
            if (match.SchemeType === 'W') {
              const currentBranch = formData.branch || branch || localStorage.getItem('decodedBranch');
              fetchCommodityRates(currentBranch);
            }
          }
        }

      } else {
        throw new Error("No scheme data received");
      }
    } catch (error) {
      console.error("Error fetching scheme data:", error);
      //   setErrors(error.message);
    }
  };

    const fetchCommodityRates = async (branch) => {
    try {
        if (!branch) {
        console.error("Branch is undefined or null");
        return;
        }

        const response = await fetch(`${COLLECTION_API}/goldrate?branch=${branch}`);
        if (!response.ok) throw new Error(`Network response was not ok: ${response.statusText}`);
        const responseData = await response.json();

        if (Array.isArray(responseData?.data)) {
        const rates = {};
        responseData.data.forEach(item => {
            rates[item.CommodityTypeID] = item.Rate;
        });
        setCommodityRates(rates);
        } else {
        throw new Error("No rate data received");
        }
    } catch (error) {
        console.error("Error fetching commodity rates:", error);
    }
    };

  useEffect(() => {
    setMembershipData(formData);
  }, [formData, setMembershipData]);

   const handleSchemeChange = (e) => {
    const schemeCode = e.target.value;
    const selectedScheme = schemeData.find(scheme => scheme.SchemeCode === schemeCode);

    if (selectedScheme) {
      setFormData({
        ...formData,
        selectedSchemeCode: schemeCode,
        selectedSchemeName: selectedScheme.SchemeName,
        minInsValue: selectedScheme.MinInsValue,
        insMultiples: selectedScheme.InsMultiples,
        schemeType: selectedScheme.SchemeType,
        commodityTypeId: selectedScheme.CommodityTypeID,
        installmentAmount: '',
        isGSTInclusive: Number(selectedScheme.IsGSTInclusive) || 0,
        gstValue: Number(selectedScheme.GSTValue) || 0,
      });
      clearError('selectedSchemeCode');
      // setErrors('');

      if (selectedScheme.SchemeType === 'W') {
        const currentBranch = formData.branch;
        // console.log("currentbranch in memb", currentBranch);
         fetchCommodityRates(currentBranch);
      } else {
        setCommodityRates({});
        setCalculatedWeight({}); // Reset weight for non-'W' schemes
      }
    } else {
      setFormData({
        ...formData,
        selectedSchemeCode: '',
        selectedSchemeName: '',
        minInsValue: '',
        insMultiples: '',
        schemeType: '',
        commodityTypeId: '', 
        installmentAmount: ''
      });
      clearError('selectedSchemeCode');
      setCommodityRates({});
      setCalculatedWeight({}); // Reset weight
    }
  };

  const handleInstallmentAmountChange = (e) => {
    const value = e.target.value;

    // Allow only digits
    if (/^\d*$/.test(value)) {
      const amountInt = value === '' ? '' : parseInt(Number(value, 10));
      setFormData({
        ...formData,
        installmentAmount: amountInt,
      });
      clearError('installmentAmount');
      if (formData.schemeType === 'W' && amountInt !== '') {
        const weights = {};
        const rateMap = SCHEME_COMMODITY_RATE_MAP[formData.commodityTypeId];

        // For Singapore GST-inclusive schemes, calculate weight from Acc. Amount.
        // For GST-exclusive schemes, weight is calculated from full installmentAmount directly.
        let amountForWeight = amountInt;
        if (isSingapore) {
          const gstRate = Number(formData.gstValue) > 0 ? Number(formData.gstValue) : 9;
          const isInclusive = formData.isGSTInclusive === undefined || formData.isGSTInclusive === null
            ? true
            : (Number(formData.isGSTInclusive) === 1 || formData.isGSTInclusive === true);

          if (isInclusive) {
            // Reverse GST: acc. amount = total - (total * gstRate / (100 + gstRate))
            const gstAmt = (amountInt * gstRate) / (100 + gstRate);
            amountForWeight = amountInt - gstAmt;
          } else {
            // Exclusive GST: entered amount is already the Acc. Amount
            amountForWeight = amountInt;
          }
        }

        if (rateMap) {
          const primaryRate = commodityRates[rateMap.primary];
          if (primaryRate) {
            weights.gold = (amountForWeight / primaryRate).toFixed(3);
          }

          if (rateMap.secondary) {
            const secondaryRate = commodityRates[rateMap.secondary];
            if (secondaryRate) {
              weights.silverCoin = (amountForWeight / secondaryRate).toFixed(3);
            }
          }
        }

        setCalculatedWeight(weights);
      } else {
        setCalculatedWeight({});
      }
    }
  }     

  useEffect( () => {
     // Validate only when the installment amount changes
     if (membershipData.selectedSchemeCode) {
      validateMembership();
    }
  }, [membershipData.installmentAmount, membershipData.selectedSchemeCode]); // Add scheme code to dependencies

  const handleBranchChange = (e) => {
    setFormData({
      ...formData,
      branch: e.target.value
    });
  };

  const getFilteredDisplaySchemes = () => {
    if (!Array.isArray(schemeData) || schemeData.length === 0) {
      return schemesDisplayData;
    }
    const mapped = schemeData.map((apiScheme, index) => {
      const apiName = (apiScheme.SchemeName || "").trim().toLowerCase();
      const apiCode = (apiScheme.SchemeCode || "").trim().toLowerCase();

      const match = schemesDisplayData.find((s) => {
        const sTitle = (s.title || "").trim().toLowerCase();
        const sCode = (s.SchemeCode || "").trim().toLowerCase();
        return (
          sTitle === apiName ||
          (sCode && sCode === apiCode) ||
          apiName.includes(sTitle) ||
          sTitle.includes(apiName)
        );
      });

      if (match) {
        return {
          ...match,
          SchemeCode: apiScheme.SchemeCode,
          SchemeName: apiScheme.SchemeName,
          order: apiScheme.SchemeCode || match.order || String(index + 1),
          title: match.title,
          minimumValue: apiScheme.MinInsValue != null ? String(apiScheme.MinInsValue) : match.minimumValue,
          numberOfInstallment: apiScheme.NoOfIns != null ? `${apiScheme.NoOfIns} months` : match.numberOfInstallment,
          apiSchemeData: apiScheme,
        };
      }

      const formattedTitle = apiScheme.SchemeName
        ? apiScheme.SchemeName.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ")
        : "Scheme";

      return {
        order: apiScheme.SchemeCode || String(index + 1),
        SchemeCode: apiScheme.SchemeCode,
        SchemeName: apiScheme.SchemeName,
        title: formattedTitle,
        description: `Start with Just ${activeSymbol} ${apiScheme.MinInsValue || 1000} a month & avail special scheme benefits.`,
        logoImage: "https://images.bhimagold.com/admin/general/images/1781181763056-1777273905752-BhimaMyChoicelog.jpeg",
        backgroundImageLink: "https://images.bhimagold.com/admin/common/images/1776927824375-BMC-Background-Img.png",
        imageLink: "https://images.bhimagold.com/admin/images/31349e70-e99e-11ed-a46c-8f70e05ffb43.png",
        numberOfInstallment: `${apiScheme.NoOfIns || 11} months`,
        minimumValue: String(apiScheme.MinInsValue || 1000),
        Bonus: "Exclusive scheme benefits.",
        brochureLink: "",
        termDuration: `Start with ${activeSymbol}${apiScheme.MinInsValue || 1000} per month for a period of ${apiScheme.NoOfIns || 11} months.`,
        benefits: "Avail special discounts and benefits upon maturity.",
        calculator: "",
        redemption: "Redeemable against gold, silver, diamond, or platinum jewellery.",
        apiSchemeData: apiScheme,
      };
    });

    return [...mapped].sort((a, b) => {
      const aSh = /shreyas/i.test(a.title || a.SchemeName || "") || /^BSR/i.test(a.SchemeCode || "") ? 0 : 1;
      const bSh = /shreyas/i.test(b.title || b.SchemeName || "") || /^BSR/i.test(b.SchemeCode || "") ? 0 : 1;
      return aSh - bSh;
    });
  };

  return (
    <div className="container" >
      <Form className="form">
        {/* <input type="hidden" name="branch" value={formData.branch} style={{ display: 'none' }}/> */}
        <Form.Group className="form-group" controlId="formScheme">
          <Form.Label className="form-label">Scheme* :</Form.Label>
          <Form.Select
            aria-label="Scheme"
            className="mb-0"
            value={formData.selectedSchemeCode}
            onChange={handleSchemeChange}
            disabled={isdraftid_gen || isLocked}
            required
          >
          <option value="" disabled hidden>
              Select the Scheme
            </option>
            {schemeData.map(scheme => (
              <option key={scheme.SchemeCode} value={scheme.SchemeCode}>
                {scheme.SchemeName}
              </option>
            ))}
          </Form.Select>
          {formData.selectedSchemeCode && (
            <p style={{ margin: '0', fontSize: '12px', marginLeft: '5px' }} className="mt-1">
              Min Inst Amt.: {formatCurrency(formData.minInsValue, activeSymbol)} <span style={{ marginLeft: '20px' }}>
                Inst Multiples: {formatCurrency(formData.insMultiples, activeSymbol)}
              </span>
            </p>
          )}
          {isLocked && !isdraftid_gen && (
            <button
              type="button"
              onClick={() => { setShowSchemeBrowser(true); setBrowsingScheme(null); }}
              style={{
                background: "none", border: "none", color: "#614119",
                fontSize: "13px", cursor: "pointer", textDecoration: "underline",
                padding: "4px 0", marginTop: "4px",
              }}
            >
              Click here to select other scheme
            </button>
          )}
          {errorValidate.selectedSchemeCode && <Form.Text className="text-danger">{errorValidate.selectedSchemeCode}</Form.Text>}

          {/* Inline scheme browser */}
          {showSchemeBrowser && !browsingScheme && (
            <div style={{
              marginTop: "16px", padding: "16px", background: "#faf7f2",
              borderRadius: "10px", border: "1px solid #e5d8c7",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <h6 style={{ margin: 0, color: "#614119", fontWeight: "bold", fontSize: "15px" }}>Choose a Scheme</h6>
                <button type="button" onClick={() => setShowSchemeBrowser(false)}
                  style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#614119", lineHeight: 1 }}>×</button>
              </div>
              <div style={{ display: "flex", overflowX: "auto", gap: "14px", paddingBottom: "8px", scrollSnapType: "x mandatory" }}>
                {getFilteredDisplaySchemes().map((s) => (
                  <div key={s.SchemeCode || s.order} onClick={() => setBrowsingScheme(s)} style={{
                    minWidth: "220px", maxWidth: "220px", flex: "0 0 auto", background: "#fff",
                    borderRadius: "8px", border: "1px solid #d4c5b0", scrollSnapAlign: "start",
                    cursor: "pointer", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                  }}>
                    <div style={{ padding: "10px 12px", borderBottom: "1px solid #ece3d5", textAlign: "right" }}>
                      <img src={s.logoImage} alt={s.title} style={{ maxHeight: "28px", objectFit: "contain" }} />
                    </div>
                    <div style={{ padding: "12px" }}>
                      <h6 style={{ fontWeight: "700", fontSize: "16px", color: "#221f20", marginBottom: "6px" }}>{s.title}</h6>
                      <p style={{ fontSize: "12px", color: "#666", lineHeight: "1.4", marginBottom: "10px" }}>{s.description}</p>
                      <button type="button" className="custom-button1" style={{ fontSize: "12px", padding: "6px 16px", borderRadius: "4px" }}
                        onClick={(e) => { e.stopPropagation(); setBrowsingScheme(s); }}>View Details</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Scheme detail with calculator */}
          {showSchemeBrowser && browsingScheme && (
            <div style={{
              marginTop: "16px", background: "#fff", borderRadius: "10px",
              border: "1px solid #d4c5b0", overflow: "hidden",
            }}>
              <div style={{
                background: "#faf7f2", padding: "12px 16px", borderBottom: "1px solid #ece3d5",
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <img src={browsingScheme.logoImage} alt={browsingScheme.title} style={{ maxHeight: "30px", objectFit: "contain" }} />
                  <strong style={{ color: "#221f20", fontSize: "15px" }}>{browsingScheme.title}</strong>
                </div>
                <button type="button" onClick={() => setBrowsingScheme(null)}
                  style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#614119", lineHeight: 1 }}>×</button>
              </div>
              <div style={{ padding: "16px", fontSize: "13px", color: "#444", lineHeight: "1.7" }}>
                <div style={{ marginBottom: "12px" }}>
                  <strong style={{ color: "#614119" }}>Term Duration:</strong>
                  <p style={{ margin: "4px 0 0" }}>{browsingScheme.termDuration}</p>
                </div>
                <div style={{ marginBottom: "12px" }}>
                  <strong style={{ color: "#614119" }}>Benefits:</strong>
                  <p style={{ margin: "4px 0 0" }}>{browsingScheme.benefits}</p>
                </div>
                <div style={{ marginBottom: "12px" }}>
                  <strong style={{ color: "#614119" }}>Redemption:</strong>
                  <p style={{ margin: "4px 0 0" }}>{browsingScheme.redemption}</p>
                </div>
                {!isSingapore && browsingScheme.calculator && (
                  <div style={{ margin: "14px 0", borderRadius: "6px", overflow: "hidden", border: "1px solid #ece3d5" }}>
                    <div style={{ background: "#faf7f2", padding: "6px 10px", fontWeight: "600", color: "#614119", fontSize: "12px", borderBottom: "1px solid #ece3d5" }}>Calculator</div>
                    <iframe src={browsingScheme.calculator} title={`${browsingScheme.title} calculator`}
                      style={{ width: "100%", height: "380px", border: "none", display: "block" }} />
                  </div>
                )}
                <button type="button" className="custom-button1" style={{ width: "100%", padding: "10px", fontSize: "14px", fontWeight: "600", borderRadius: "4px", marginTop: "8px" }}
                  onClick={() => {
                    const match = schemeData.find(s => s.SchemeName && s.SchemeName.toLowerCase().includes(browsingScheme.title.toLowerCase()));
                    if (match) {
                      setFormData(prev => ({ 
                        ...prev, 
                        selectedSchemeCode: match.SchemeCode, 
                        selectedSchemeName: match.SchemeName, 
                        minInsValue: match.MinInsValue, 
                        insMultiples: match.InsMultiples, 
                        schemeType: match.SchemeType, 
                        commodityTypeId: match.CommodityTypeID, 
                        installmentAmount: '',
                        isGSTInclusive: Number(match.IsGSTInclusive) || 0,
                        gstValue: Number(match.GSTValue) || 0,
                      }));
                      if (match.SchemeType === 'W') { fetchCommodityRates(formData.branch); } else { setCommodityRates({}); setCalculatedWeight({}); }
                    }
                    setIsLocked(true); setShowSchemeBrowser(false); setBrowsingScheme(null);
                  }}
                >Select {browsingScheme.title}</button>
                <button type="button" onClick={() => setBrowsingScheme(null)}
                  style={{ width: "100%", background: "none", border: "none", color: "#614119", fontWeight: "500", fontSize: "13px", marginTop: "10px", cursor: "pointer", textDecoration: "underline" }}
                >← Choose another plan</button>
              </div>
            </div>
          )}
        </Form.Group>

        {/* View Details button removed — scheme details now shown via inline scheme browser */}

        <Modal
          show={showCalculator}
          onHide={() => setShowCalculator(false)}
          fullscreen
        >
          <Modal.Header closeButton>
            <Modal.Title>Scheme Calculator</Modal.Title>
          </Modal.Header>
          <Modal.Body style={{ padding: 0 }}>
            <iframe
              src={`https://jppcalculator.bhima.info/?scheme_name=${encodeURIComponent(formData.selectedSchemeName.toLowerCase())}&show_menu=0&show_title=0`}
              title="Scheme Calculator"
              style={{
                width: "100%",
                height: "100vh",
                border: "none",
              }}
            />
          </Modal.Body>
        </Modal>

        <Form.Group className="form-group" controlId="formInstallmentAmount" id="#installment_amount" >
          <Form.Label className="form-label">Installment Amount*:</Form.Label>
          <Form.Control
            type="text"
            value={formData.installmentAmount}
            onChange={handleInstallmentAmountChange}
             className="form-control custom-placeholder"
             placeholder="Enter the installment amount"
            inputMode="numeric"
            pattern="[0-9]*"
            disabled={isdraftid_gen}
            required
          />
          <div style={{position:"absolute"}}>{errorValidate.installmentAmount?<p style={{color: "#dc3545",margintop:"25px",fontSize: "14px"
}}>{errorValidate.installmentAmount}</p>:<p style={{fontSize:"24px"}} ></p>}</div>
        </Form.Group>

        {/* GST Breakdown — Singapore only, shown when amount is entered */}
        {isSingapore && formData.selectedSchemeCode && Number(formData.installmentAmount) > 0 && (() => {
          const amt = Number(formData.installmentAmount);
          // Use API-provided GST values, fallback to Singapore default (9% inclusive)
          const gstRate = Number(formData.gstValue) > 0 ? Number(formData.gstValue) : 9;
           const isInclusive = formData.isGSTInclusive === undefined || formData.isGSTInclusive === null
            ? true
            : (Number(formData.isGSTInclusive) === 1 || formData.isGSTInclusive === true);

          let gstAmt, accAmt, totalPayable;
          if (isInclusive) {
            // Reverse calculation: GST is inside the entered amount
            gstAmt = (amt * gstRate) / (100 + gstRate);
            accAmt = amt - gstAmt;
            totalPayable = amt;
          } else {
            // Forward calculation: GST added on top
            gstAmt = (amt * gstRate) / 100;
            accAmt = amt;
            totalPayable = amt + gstAmt;
          }

          const fieldStyle = {
            display: "flex",
            alignItems: "center",
            marginBottom: "8px",
            gap: "8px",
          };
          const labelStyle = {
            minWidth: "160px",
            fontSize: "13px",
            color: "#444",
            fontWeight: "500",
            flexShrink: 0,
          };
          const inputStyle = {
            flex: 1,
            border: "1px solid #ced4da",
            borderRadius: "6px",
            padding: "6px 10px",
            fontSize: "13px",
            background: "#f8f9fa",
            color: "#333",
            fontWeight: "600",
            textAlign: "right",
          };

          return (
            <div style={{ marginTop: "14px" }}>
              {/* GST Amount */}
              <div style={fieldStyle}>
                <span style={labelStyle}>GST Amount ({gstRate}%):</span>
                <div style={{ ...inputStyle, color: "#28a745" }}>
                  {gstAmt.toFixed(2)}
                </div>
              </div>
              {/* Acc. Amount */}
              <div style={fieldStyle}>
                <span style={labelStyle}>Acc. Amount:</span>
                <div style={{ ...inputStyle, color: "#555" }}>
                  {accAmt.toFixed(2)}
                </div>
              </div>
              {/* Total Payable Amount */}
              <div style={{ ...fieldStyle, marginBottom: 0 }}>
                <span style={{ ...labelStyle, color: "#614119", fontWeight: "700" }}>Total Payable Amount:</span>
                <div style={{ ...inputStyle, color: "#614119", fontWeight: "700", fontSize: "14px", background: "#faf7f2", border: "1.5px solid #d4af37" }}>
                  {totalPayable.toFixed(2)}
                </div>
              </div>
            </div>
          );
        })()}
       {/* <p> {errorValidate.installmentAmount ?<> {errorValidate.installmentAmount && <Form.Text className="text-danger">{errorValidate.installmentAmount}</Form.Text>}</>:<div></div>} */}
         
   
    {formData.schemeType === 'W' && (
    <Form.Group controlId="formCalculatedWeight" style={{ marginTop: '15px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Form.Label className="form-label" style={{ marginBottom: '0', color: "black" }}>Weight:</Form.Label>
        <h5 style={{ margin: '0', fontSize: '15px', color: "black" }}>
             22Kt Gold Rate: {commodityRates[1] ? formatCurrency(commodityRates[1], activeSymbol) : 'Loading...'}
        </h5>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
      <Form.Control
        type="text"
        value={calculatedWeight.gold ? `${calculatedWeight.gold} gms` : ''}
        readOnly
        disabled
      />
      </div>
     {formData.commodityTypeId === 5 && (
      <>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
          <Form.Label className="form-label" style={{ marginBottom: '0', color: "black" }}>Silver Weight:</Form.Label>
          <h5 style={{ margin: '0', fontSize: '15px', color: "black" }}>
            Silver Rate: {commodityRates[7] ? formatCurrency(commodityRates[7], activeSymbol) : 'Loading...'}
          </h5>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Form.Control
            type="text"
            value={calculatedWeight.silverCoin ? `${calculatedWeight.silverCoin} gms` : ''}
            readOnly
            disabled
          />
        </div>
      </>
       )}
     </Form.Group>
)}
        
        <Form.Group className="form-group" controlId="formBranch" style={{ display: 'none' }} >
          <Form.Label className="form-label">Branch  :</Form.Label>
          <Form.Control
            type="text"
            value={formData.branch}
            onChange={handleBranchChange}
            disabled
            required

          />
        </Form.Group>
       
        {/* <Form.Select 
                aria-label="Branch" 
                value={formData.branch} 
                onChange={handleBranchChange}
              >
                <option value="">Select the Branch</option>
                {branchData.map(branch => (
                  <option key={branch.Branch_Code} value={branch.Branch_Code} defaultChecked={branch.Branch_Name == formData.branch} selected={branch.Branch_Name == formData.branch}>
                    {branch.Branch_Name}
                  </option>
                ))}
              </Form.Select> */}

        {/* </Form.Group>
        */}

        
      </Form>
    </div>
  );
};

export default Membershipdetails;
