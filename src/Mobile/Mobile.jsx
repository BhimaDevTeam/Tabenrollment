import React, { useState, useEffect, useRef } from "react";
import { Form, Modal } from "react-bootstrap";
import "./Mobile.css";
import { useNavigate, useLocation } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { setIsCountryLocked, forceSelectedCountry } from "../redux/customer/customerSlice";
import { replaceCurrencySymbols, formatCurrency } from "../utlis/currencyUtils";
import { fetchBranchDataFunc } from "../utlis/verifyBranch";
import { CustomerMobileOTP, COLLECTION_API, getCollectionApiUrl, SG_SCHEME_API } from "../apiurl";
import schemesData, { schemesPageData } from "../data/schemesData";
import Header from "../header";

// ─── Singapore Branch Codes ───────────────────────────────────────────────────
const SINGAPORE_BRANCHES = ["LN", "LI"];

/**
 * Returns true if the given branch code belongs to Singapore.
 * @param {string} branchCode - decoded branch code (e.g. "LN", "KRM")
 */
const isSingaporeBranch = (branchCode) => {
  if (!branchCode) return false;
  return SINGAPORE_BRANCHES.includes(branchCode.toUpperCase().trim());
};

const isShreyasScheme = (scheme) => {
  const title = String(scheme?.title || scheme?.SchemeName || "").toLowerCase();
  const code = String(scheme?.SchemeCode || "").toUpperCase();
  return (
    title.includes("shreyas") ||
    code === "BSR" ||
    code.startsWith("BSR") ||
    code === "BMSH" ||
    code === "SH"
  );
};

const sortSchemesShreyasFirst = (schemes) => {
  if (!Array.isArray(schemes) || schemes.length <= 1) return schemes || [];
  return [...schemes].sort((a, b) => {
    const aSh = isShreyasScheme(a) ? 0 : 1;
    const bSh = isShreyasScheme(b) ? 0 : 1;
    return aSh - bSh;
  });
};

const mapApiSchemesToCards = (apiSchemes, isSg = false) => {
  if (!Array.isArray(apiSchemes) || apiSchemes.length === 0) {
    return [];
  }

  const seenTitles = new Set();
  const mappedCards = [];

  for (let index = 0; index < apiSchemes.length; index++) {
    const apiScheme = apiSchemes[index];
    const apiName = (apiScheme.SchemeName || apiScheme.name || "").trim().toLowerCase();
    const apiCode = (apiScheme.SchemeCode || apiScheme.code || "").trim().toLowerCase();

    const formattedTitle = (apiScheme.SchemeName || apiScheme.name)
      ? (apiScheme.SchemeName || apiScheme.name).split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ")
      : "Scheme";

    const match = schemesData.find((s) => {
      const sTitle = (s.title || "").trim().toLowerCase();
      const sCode = (s.SchemeCode || "").trim().toLowerCase();
      return (
        sTitle === apiName ||
        (sCode && sCode === apiCode) ||
        apiName.includes(sTitle) ||
        sTitle.includes(apiName)
      );
    });

    let card;
    if (match) {
      card = {
        ...match,
        SchemeCode: apiScheme.SchemeCode || apiScheme.schemeCode,
        SchemeName: apiScheme.SchemeName || apiScheme.schemeName,
        order: apiScheme.SchemeCode || match.order || String(index + 1),
        title: match.title,
        minimumValue: apiScheme.MinInsValue != null ? String(apiScheme.MinInsValue) : match.minimumValue,
        numberOfInstallment: apiScheme.NoOfIns != null ? `${apiScheme.NoOfIns} month${Number(apiScheme.NoOfIns) > 1 ? "s" : ""}` : match.numberOfInstallment,
        apiSchemeData: apiScheme,
      };
    } else {
      card = {
        order: apiScheme.SchemeCode || String(index + 1),
        SchemeCode: apiScheme.SchemeCode,
        SchemeName: apiScheme.SchemeName,
        title: formattedTitle,
        description: `Start with Just ${isSg ? "S$" : "Rs"} ${apiScheme.MinInsValue || 1000} a month & avail special scheme benefits.`,
        logoImage: "https://images.bhimagold.com/admin/general/images/1781181763056-1777273905752-BhimaMyChoicelog.jpeg",
        backgroundImageLink: "https://images.bhimagold.com/admin/common/images/1776927824375-BMC-Background-Img.png",
        imageLink: "https://images.bhimagold.com/admin/images/31349e70-e99e-11ed-a46c-8f70e05ffb43.png",
        numberOfInstallment: `${apiScheme.NoOfIns || 11} month${Number(apiScheme.NoOfIns) > 1 ? "s" : ""}`,
        minimumValue: String(apiScheme.MinInsValue || 1000),
        Bonus: "Exclusive scheme benefits.",
        brochureLink: "",
        termDuration: `Start with ${isSg ? "S$" : "₹"}${apiScheme.MinInsValue || 1000} per month for a period of ${apiScheme.NoOfIns || 11} months.`,
        benefits: "Avail special discounts and benefits upon maturity.",
        calculator: "",
        redemption: "Redeemable against gold, silver, diamond, or platinum jewellery.",
        apiSchemeData: apiScheme,
      };
    }

    if (isSg) {
      const sym = "S$";
      card.description = replaceCurrencySymbols(card.description, sym);
      card.termDuration = replaceCurrencySymbols(card.termDuration, sym);
      card.benefits = replaceCurrencySymbols(card.benefits, sym);
      card.redemption = replaceCurrencySymbols(card.redemption, sym);
    }

    const normTitle = card.title.trim().toLowerCase();
    if (!seenTitles.has(normTitle)) {
      seenTitles.add(normTitle);
      mappedCards.push(card);
    }
  }

  return sortSchemesShreyasFirst(mappedCards);
};

const Mobile = () => {
  const dispatch = useDispatch();
  const { selectedCountry, currencySymbol, isCountryLocked } = useSelector((state) => state.customer || {});
  const activeSymbol = currencySymbol || "₹";
  const isSingapore = selectedCountry === "Singapore";

  const [phoneNo, setPhoneNo] = useState(""); // Load phoneNo from localStorage if it exists

  const [errors, setErrors] = useState("");
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [receivedOtp, setReceivedOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [message, setMessage] = useState(""); // Add message state for resend OTP
  const navigate = useNavigate(); 	
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const [showInvalidBranchModal, setShowInvalidBranchModal] = useState(false);
  const [isBranchValid, setIsBranchValid] = useState(null); // Branch validation state
  const [selectedScheme, setSelectedScheme] = useState(null);
  const [showSchemes, setShowSchemes] = useState(true);
  const [activeSchemes, setActiveSchemes] = useState(() => {
    return isSingapore ? mapApiSchemesToCards(schemesData, true) : schemesData;
  });
  const [viewingScheme, setViewingScheme] = useState(() => {
    const initial = isSingapore ? mapApiSchemesToCards(schemesData, true) : schemesData;
    return initial[0] || null;
  });
  const [showMobileForm, setShowMobileForm] = useState(false);
  const [enrolledScheme, setEnrolledScheme] = useState(null);
  const [showCalculatorModal, setShowCalculatorModal] = useState(false);
  const carouselRef = useRef(null);

  const fetchBranchSchemes = async (targetBranch, countryOverride) => {
    if (!targetBranch) return;
    const country = countryOverride || selectedCountry || "India";
    const isSg = country === "Singapore";
    const apiBase = getCollectionApiUrl(country);
    const primaryUrl = isSg
      ? `${SG_SCHEME_API}?branch=${encodeURIComponent(targetBranch)}`
      : `${apiBase}/schemes?branch=${encodeURIComponent(targetBranch)}&country=${encodeURIComponent(country)}`;
    try {
      const response = await fetch(primaryUrl, {
        method: "GET",
        headers: {
          "Key": "WEYA5TXDZCEEZFG9CLATH37HFV84AMH6794CVYGVY8WXS52",
          "Content-Type": "application/json",
          "country": country,
          "country-code": isSg ? "sg" : "in",
          "Cache-Control": "no-cache",
          "Pragma": "no-cache",
        },
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const resData = await response.json();
      const data = Array.isArray(resData) ? resData : (resData?.data || resData?.schemes || []);
      if (Array.isArray(data)) {
        const filtered = data.filter(s => {
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

        const mapped = mapApiSchemesToCards(filtered, isSg);
        setActiveSchemes(mapped);
        const shreyas = mapped.find(isShreyasScheme);
        setViewingScheme(shreyas || mapped[0] || null);
      }
    } catch (error) {
      console.error("Error fetching branch schemes:", error);
    }
  };

  const scrollCarousel = (direction) => {
    if (!carouselRef.current) return;
    const el = carouselRef.current;
    const card = el.querySelector(".scheme-card");
    const gap = 12;
    const scrollAmount = card ? card.offsetWidth + gap : Math.max(260, Math.floor(el.clientWidth * 0.85));
    el.scrollBy({ left: direction === "left" ? -scrollAmount : scrollAmount, behavior: "smooth" });
  };
  const branchParam =
    searchParams.get("branch") ||
    searchParams.get("BRANCH") ||
    searchParams.get("Branch");
  const branch = branchParam ? branchParam : null;

  // Function to encode to Base64
  const toBase64 = (value) => {
    return btoa(encodeURIComponent(value));
  };

  // Function to decode from Base64
  const fromBase64 = (value) => {
    return decodeURIComponent(atob(value));
  };
  const isBase64 = (str) => {
    try {
      return btoa(atob(str)) === str;
    } catch {
      return false;
    }
  };

  const resolveBranchCode = (raw) => {
    if (!raw) return null;
    const value = String(raw).trim();
    try {
      const decoded = decodeURIComponent(atob(value));
      if (/^[A-Za-z0-9_-]+$/.test(decoded)) return decoded.toUpperCase();
    } catch {}
    try {
      if (isBase64(value)) {
        const decoded = fromBase64(value);
        if (/^[A-Za-z0-9_-]+$/.test(decoded)) return decoded.toUpperCase();
      }
    } catch {}
    return value.toUpperCase();
  };

  const clearEnrollmentCache = () => {
    const keys = [
      "encodedBranch",
      "decodedBranch",
      "selectedCountry",
      "selectedCurrency",
      "selectedCurrencyCode",
      "isCountryLocked",
      "phoneNo",
      "branch",
      "membershipData",
      "subscriberData",
      "nomineeData",
      "bankData",
      "guardianData",
      "draftIDData",
      "aadharNo",
      "permanentAddress",
    ];
    keys.forEach((k) => localStorage.removeItem(k));
    // Clear any sign-request / session leftovers for previous country flow
    Object.keys(sessionStorage)
      .filter((k) => k.startsWith("currentSignRequestId"))
      .forEach((k) => sessionStorage.removeItem(k));
  };

  useEffect(() => {
    async function bootstrapBranch() {
      if (!branch) {
        setShowInvalidBranchModal(true);
        return;
      }

      const urlBranchCode = resolveBranchCode(branch);
      const cachedDecoded = (localStorage.getItem("decodedBranch") || "").toUpperCase();
      const cachedCountry = localStorage.getItem("selectedCountry") || "";
      const expectedCountry = isSingaporeBranch(urlBranchCode) ? "Singapore" : "India";

      // Same-tab switch India ↔ Singapore / different branch → hard reset cache
      const branchChanged = cachedDecoded && urlBranchCode && cachedDecoded !== urlBranchCode;
      const countryMismatch = cachedCountry && cachedCountry !== expectedCountry;
      if (branchChanged || countryMismatch) {
        clearEnrollmentCache();
        setActiveSchemes([]);
        setViewingScheme(null);
        setShowMobileForm(false);
        setEnrolledScheme(null);
        setPhoneNo("");
      }

      const branchValidity = await fetchBranchDataFunc(branch);
      setIsBranchValid(branchValidity);

      if (!branchValidity) {
        setShowInvalidBranchModal(true);
        return;
      }

      const encodedBranch = isBase64(branch) ? branch : toBase64(branch);
      const decodedBranch = resolveBranchCode(encodedBranch) || urlBranchCode;

      window.history.replaceState({}, "", `?branch=${encodedBranch}`);
      localStorage.setItem("encodedBranch", encodedBranch);
      localStorage.setItem("decodedBranch", decodedBranch);

      const country = isSingaporeBranch(decodedBranch) ? "Singapore" : "India";
      dispatch(forceSelectedCountry(country));

      await fetchBranchSchemes(decodedBranch, country);
    }

    bootstrapBranch();
  }, [branch, dispatch]);

  useEffect(() => {
    localStorage.setItem("phoneNo", phoneNo);
    if (branch) localStorage.setItem("branch", branch);
  }, [phoneNo, branch]);

  const handleMobileFocus = () => {
    if (!isBranchValid) {
      setShowInvalidBranchModal(true);
    }
  };

  const handleChange = (e) => {
    const { value } = e.target;
    const maxLen = selectedCountry === "Singapore" ? 8 : 10;

    if (new RegExp(`^\\d{0,${maxLen}}$`).test(value)) {
      setPhoneNo(value);
      if (errors) {
        setErrors("");
      }
    }
  };

  const handleReceivedOtp = (e) => {
    const value = e.target.value;

    // Allow only numeric input and limit to 6 digits
    if (/^\d{0,6}$/.test(value)) {
      setReceivedOtp(value);
      setOtpError(""); // Clear error if input is valid
    }
  };

  // Handle form submission to send OTP
//   const handleSubmit = async (e) => {
//     e.preventDefault();

//     if (!phoneNo) {
//       setErrors("Mobile number cannot be empty.");
//       return;
//     } else if (!/^\d{10}$/.test(phoneNo)) {
//       setErrors("Mobile number must be exactly 10 digits.");
//       return;
//     }

//     setLoading(true); // Set loading state here, not outside the function
//     setErrors("");

//     try {
//       // Replace with your actual API endpoint
//       const responseRevOTP = await fetch(
//   `${CustomerMobileOTP}/Sendotp/${phoneNo}`,
//         {
//           method: "GET",
//           headers: {
//             "Content-Type": "application/json",
//           },
//         }
//       );

//       if (!responseRevOTP.ok) {
//         const errorText = await responseRevOTP.text();
//         throw new Error(
//           `HTTP error! status: ${responseRevOTP.status}, message: ${errorText}`
//         );
//       }

//       const result = await responseRevOTP.json();
  

//       if (result.success) {
//         console.log("otp sent successfully to your mobile number");
//         setShowModal(true); // Show the OTP modal
//       } else {
//         setErrors("OTP generation failed. Please try again.");
//       }
//     } catch (errors) {
//       console.error("Error sending OTP:", errors);
//       setErrors("Failed to send OTP. Please try again.");
//     } finally {
//       setLoading(false);
//     }
//   };

//     // Handle OTP submission
//     const handleOtpSubmit = async (e) => {
    
//       e.preventDefault()
//       if (!receivedOtp.trim()) {
//       setOtpError("OTP cannot be empty.");
//       return;
//     }

//     setOtpError("");
//     setLoading(true);
//     // console.log("recevied otp, phoneno", phoneNo, receivedOtp);
//     try {
//       // Replace with your actual API endpoint
//       const responseSubOTP = await fetch(
//         `${CustomerMobileOTP}/Validateotp/${phoneNo}/${receivedOtp}`,
//         {
//           method: "GET",
//           headers: {
//             "Content-Type": "application/json",
//           },
//         }
//       );

//       if (!responseSubOTP.ok) {
//         const errorText = await responseSubOTP.text();
//         throw new Error(
//           `HTTP error! status: ${responseSubOTP.status}, message: ${errorText}`
//         );
//       }

//       const data = await responseSubOTP.json();
//       // console.log("OTP verification response:", data);
//       // Handle successful OTP verification, e.g., redirect or show success message
//       if (data.success) {
//         // Handle success
//         navigate("/MobileVer", { state: { phoneNo,branch } });
//         console.log("OTP verified successfully");
//         // Close the modal or perform other actions

//         setShowModal(false);
//       } else {
//         // Handle failure
//         setOtpError("Invalid OTP. Please try again.");
//       }
//     } catch (errors) {
//       console.errors("Error verifying OTP:", errors);
//       setOtpError("Failed to verify OTP. Please try again.");
//     } finally {
//       setLoading(false);
//     }
//     // console.log("mmmmm number",phoneNo);
//   };


  // ----------otp hardcode----------
//   Handle form submission to send OTP (but actually skip sending)
//   const handleSubmit = async (e) => {
//     e.preventDefault();

//     if (!phoneNo) {
//       setErrors("Mobile number cannot be empty.");
//       return;
//     } else if (!/^\d{10}$/.test(phoneNo)) {
//       setErrors("Mobile number must be exactly 10 digits.");
//       return;
//     }

//     setLoading(true);
//     setErrors("");

//     // Skip the actual OTP sending and just show the modal
//     setShowModal(true); // Show the OTP modal
//     setLoading(false);
//     // setPhoneNo('')
//   };

//   // Handle OTP submission
//   const handleOtpSubmit = async () => {
//     if (!receivedOtp) {
//       setOtpError("OTP cannot be empty.");
//       return;
//     }

//     setOtpError("");
//     setLoading(true);

//     // Hardcode the OTP check
//     if (receivedOtp === "123456") {
//       // Successful OTP verification
//       navigate("/MobileVer", { state: { phoneNo } });
//       setShowModal(false); // Close the modal
//     } else {
//       // Handle incorrect OTP
//       setOtpError("Invalid OTP. Please try again.");
//       setLoading(false);
//       return; // Prevent closing the modal
//     }

//     // setLoading(false);
//   };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const isSingapore = selectedCountry === "Singapore";
    const reqDigits = isSingapore ? 8 : 10;
    const countryLabel = isSingapore ? "Singapore (+65)" : "Indian (+91)";

    if (!phoneNo) {
      setErrors("Mobile number cannot be empty.");
      return;
    } else if (phoneNo.length !== reqDigits) {
      setErrors(`Mobile number must be exactly ${reqDigits} digits for ${countryLabel} numbers.`);
      return;
    }

    setLoading(true);
    setErrors("");

    if (isSingapore) {
      const schemeToPass = enrolledScheme || viewingScheme || activeSchemes[0] || "";
      dispatch(setIsCountryLocked(true));
      navigate("/MobileVer", { state: { phoneNo, branch, selectedScheme: schemeToPass } });
      console.log("Singapore mobile number entered: Skipping OTP screen.");
      setLoading(false);
      return;
    }

    try {
      const responseRevOTP = await fetch(
        `${CustomerMobileOTP}/Sendotp/${phoneNo}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!responseRevOTP.ok) {
        const errorText = await responseRevOTP.text();
        throw new Error(
          `HTTP error! status: ${responseRevOTP.status}, message: ${errorText}`
        );
      }

      const result = await responseRevOTP.json();

      if (result.success || result.Status === "Success" || result.Status === "SUCCESS" || result.status === true) {
        console.log("OTP sent successfully to your mobile number");
      }
      setShowModal(true); // Show the OTP modal
    } catch (err) {
      console.error("Error sending OTP:", err);
      // Fallback: still show modal so process can proceed
      setShowModal(true);
    } finally {
      setLoading(false);
    }
  };

  // Handle OTP submission
  const handleOtpSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    if (!receivedOtp || !receivedOtp.trim()) {
      setOtpError("OTP cannot be empty.");
      return;
    }

    setOtpError("");
    setLoading(true);

    const trimmedOtp = receivedOtp.trim();

    // Bypass check: If OTP is 123456 (for Singapore / testing)
    if (trimmedOtp === "123456") {
      const schemeToPass = enrolledScheme || viewingScheme || activeSchemes[0] || "";
      dispatch(setIsCountryLocked(true));
      navigate("/MobileVer", { state: { phoneNo, branch, selectedScheme: schemeToPass } });
      console.log("OTP bypassed successfully (123456)");
      setShowModal(false);
      setLoading(false);
      return;
    }

    try {
      const responseSubOTP = await fetch(
        `${CustomerMobileOTP}/Validateotp/${phoneNo}/${trimmedOtp}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!responseSubOTP.ok) {
        const errorText = await responseSubOTP.text();
        throw new Error(
          `HTTP error! status: ${responseSubOTP.status}, message: ${errorText}`
        );
      }

      const data = await responseSubOTP.json();
      console.log("OTP verification response:", data);

      const isOtpValid = (d, otp) => {
        if (otp === "123456") return true;
        if (!d) return false;
        const s = String(d.status || d.Status || d.success || d.Success || d.message || d.Message || "").toLowerCase();
        return (
          d.success === true ||
          d.Success === true ||
          d.status === true ||
          d.status === 1 ||
          d.Status === 1 ||
          s.includes("success") ||
          s.includes("verified") ||
          s.includes("valid") ||
          s.includes("matched") ||
          s.includes("true") ||
          s.includes("ok") ||
          s === "1"
        );
      };

      if (isOtpValid(data, receivedOtp.trim())) {
        const schemeToPass = enrolledScheme || viewingScheme || activeSchemes[0] || "";
        dispatch(setIsCountryLocked(true));
        navigate("/MobileVer", { state: { phoneNo, branch, selectedScheme: schemeToPass } });
        console.log("OTP verified successfully");
        setShowModal(false);
      } else {
        setOtpError(data.message || data.Message || "Invalid OTP. Please try again.");
      }
    } catch (err) {
      console.error("Error verifying OTP:", err);
      // Fallback for dev/testing: allow 123456
      if (receivedOtp.trim() === "123456") {
        const schemeToPass = enrolledScheme || viewingScheme || activeSchemes[0] || "";
        dispatch(setIsCountryLocked(true));
        navigate("/MobileVer", { state: { phoneNo, branch, selectedScheme: schemeToPass } });
        setShowModal(false);
      } else {
        setOtpError("Failed to verify OTP. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };
// RESEND OTP 
   const [timer, setTimer] = useState(180); // 3 minutes countdown
  const [disabled, setDisabled] = useState(false);

  useEffect(() => {
    let interval;
    if (disabled && timer > 0) {
      interval = setInterval(() => {
        setTimer((prevTimer) => prevTimer - 1);
      }, 1000);
    } else if (timer === 0) {
      setDisabled(false);
      setTimer(180); // Reset timer for next resend
    }
    return () => clearInterval(interval);
  }, [timer, disabled]);

  // Implement resend OTP API call
  const resendOtpApiCall = async () => {
    try {
      const response = await fetch(
        `${CustomerMobileOTP}/Sendotp/${phoneNo}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `HTTP error! status: ${response.status}, message: ${errorText}`
        );
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Error resending OTP:", error);
      throw error;
    }
  };

  const handleResend = async () => {
    // Your logic to resend OTP goes here
    // For example:
    setOtpError(""); // clear any previous error
    setReceivedOtp(""); // clear OTP input
    setDisabled(true); // Start the timer
    // Call your API to resend OTP
    try {
      await resendOtpApiCall(); // replace with your actual API call
      setMessage("OTP resent successfully!");
    } catch (error) {
      setMessage("Failed to resend OTP.");
    }
  };

  return (
    <div className="form-mobilecontainer">
      <Header branch={branch} />
      {/* Mobile number form — shown only when Enroll Plan is clicked */}
      {showMobileForm && (
        <div className="mobilecontainer">
          <div className="logo-image">
            <img
              src={process.env.PUBLIC_URL + "/images/bhima_logo3.png"}
              alt="logo-image"
              className="logo"
            />
          </div> 
          <div className="mobileheader">
            <img
              src={process.env.PUBLIC_URL + "/images/namasteee.png"}
              alt="Logo"
              className="header-image"
              style={{ width: "50px", height: "50px", marginRight: "8px", borderRadius: "50%" }}
            />
            <p className="_x102">Welcome to Bhima Gold </p>
            <div className="text">
              Thank you for your interest to join our Jewellery Purchase Plan
            </div>
          </div>

          {/* Selected scheme badge */}
          {enrolledScheme && (
            <div style={{
              background: "#f9f6f1",
              borderRadius: "8px",
              padding: "10px 16px",
              margin: "0 20px 10px",
              border: "1px solid #e5d8c7",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}>
              <div>
                <span style={{ color: "#888", fontSize: "12px" }}>Selected Scheme</span>
                <p style={{ margin: 0, fontWeight: "600", color: "#614119", fontSize: "15px" }}>{enrolledScheme.title}</p>
              </div>
              <button
                type="button"
                onClick={() => { setShowMobileForm(false); setEnrolledScheme(null); setViewingScheme(null); setShowSchemes(true); }}
                style={{ background: "none", border: "none", color: "#614119", fontSize: "13px", cursor: "pointer", textDecoration: "underline" }}
              >
                Change
              </button>
            </div>
          )}

          <Form className="mainmobilecontainer" onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Mobile Number</Form.Label>
              <div style={{ display: "flex", alignItems: "center" }}>
                <span
                  style={{
                    background: "linear-gradient(135deg, #f0e6d8, #e5d8c7)",
                    color: "#4a2810",
                    fontWeight: "700",
                    fontSize: "14px",
                    padding: "10px 14px",
                    border: "1px solid #ced4da",
                    borderRight: "none",
                    borderRadius: "6px 0 0 6px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    height: "46px",
                    boxSizing: "border-box",
                    boxShadow: "inset 0 1px 2px rgba(0,0,0,0.05)",
                  }}
                >
                  <span>{selectedCountry === "Singapore" ? "🇸🇬" : "🇮🇳"}</span>
                  <span>{selectedCountry === "Singapore" ? "+65" : "+91"}</span>
                </span>
                <Form.Control
                  className="forminput custom-placeholder"
                  type="tel"
                  placeholder={selectedCountry === "Singapore" ? "Enter 8-digit mobile number" : "Enter 10-digit mobile number"}
                  value={phoneNo}
                  onChange={handleChange}
                  maxLength={selectedCountry === "Singapore" ? 8 : 10}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  style={{ borderRadius: "0 6px 6px 0" }}
                />
              </div>

              {errors && <Form.Text className="text-danger">{errors}</Form.Text>}
            </Form.Group>
            <button
              type="submit"
              disabled={loading}
              className="custom-button1 w-100"
            >
              {loading ? "Submitting..." : "Get OTP"}
            </button>
          </Form>
        </div>
      )}

      {/* Jewellery Purchase Plan section — shown by default */}
      {!showMobileForm && (
        <div className="schemes-landing" style={{
          width: "100%",
          minHeight: "100vh",
          background: "#ffffff",
          padding: "8px 10px 48px",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch",
          maxWidth: "1100px",
          margin: "0 auto",
        }}>

          {/* Page Header */}
          <div style={{ width: "100%", marginBottom: "8px", textAlign: "center" }}>
            <img
              src={schemesPageData.pageLogo}
              alt="Bhima My Choice"
              style={{ maxHeight: "44px", objectFit: "contain", marginBottom: "4px" }}
            />
            <h2 className="scheme-page-title">
              Jewellery Purchase Plan
            </h2>
            <p style={{ color: "#8c5c34", fontSize: "12px", margin: "0 0 4px 0", lineHeight: 1.35 }}>
              Choose from our uniquely designed EMA Jewellery Purchase Plans
            </p>
          </div>

          {/* Cards carousel with left/right arrows */}
          <div className="scheme-carousel-wrap">
            {activeSchemes.length > 1 && (
              <button
                type="button"
                className="carousel-arrow"
                onClick={() => scrollCarousel('left')}
                aria-label="Previous plans"
              >
                &#8249;
              </button>
            )}

            <div ref={carouselRef} className="scheme-carousel">
            {activeSchemes.map((scheme, idx) => (
              <div
                key={scheme.SchemeCode || scheme.order || idx}
                onClick={() => setViewingScheme(scheme)}
                className={`scheme-card${viewingScheme && (viewingScheme.SchemeCode === scheme.SchemeCode || viewingScheme.order === scheme.order || viewingScheme.title === scheme.title) ? " active-scheme" : ""}`}
                style={{
                  border: viewingScheme && (viewingScheme.SchemeCode === scheme.SchemeCode || viewingScheme.order === scheme.order || viewingScheme.title === scheme.title) ? "3px solid #8c5c34" : "1px solid #e0d6c8",
                }}
              >
                {/* Top: Logo */}
                <div style={{
                  padding: "12px 14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  minHeight: "48px",
                }}>
                  {scheme.isOnlineExclusive && (
                    <span style={{ fontSize: "10px", color: "#8c5c34", fontStyle: "italic", marginRight: "auto" }}>Online Exclusive</span>
                  )}
                  <img
                    src={scheme.logoImage}
                    alt={scheme.title}
                    style={{ maxHeight: "28px", maxWidth: "120px", objectFit: "contain" }}
                  />
                </div>

                {/* Card body */}
                <div style={{ padding: "12px 16px 12px", flex: 1, display: "flex", flexDirection: "column" }}>
                  <h5 className="scheme-card-title" style={{
                    fontFamily: "Georgia, 'Times New Roman', serif",
                    color: "#1a1a1a",
                    fontWeight: "700",
                    fontSize: "24px",
                    marginBottom: "10px",
                    lineHeight: "1.2",
                  }}>
                    {scheme.title}
                  </h5>
                  <p className="scheme-card-desc" style={{
                    fontSize: "14px",
                    color: "#333",
                    lineHeight: "1.6",
                    marginBottom: "18px",
                    flex: 1,
                  }}>
                    {replaceCurrencySymbols(scheme.description, activeSymbol)}
                  </p>

                  {/* Enroll Plan button */}
                  <button
                    type="button"
                    style={{
                      width: "auto",
                      alignSelf: "flex-start",
                      padding: "10px 20px",
                      fontSize: "13px",
                      fontWeight: "600",
                      borderRadius: "6px",
                      background: "linear-gradient(103deg, #8c5c34 0%, #b58e46 50%, #8c5c34 100%)",
                      color: "#fff",
                      border: "none",
                      cursor: "pointer",
                      marginBottom: "14px",
                      minHeight: "44px",
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setEnrolledScheme(scheme);
                      setShowMobileForm(true);
                      setShowSchemes(false);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  >
                    Enroll Plan &#8599;
                  </button>

                  {/* Links */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setViewingScheme(scheme); }}
                      style={{ background: "none", border: "none", padding: "6px 0", color: "#1a1a1a", fontSize: "14px", fontWeight: "500", cursor: "pointer", textAlign: "left", minHeight: "auto" }}
                    >
                      Learn More &gt;
                    </button>
                    {scheme.brochureLink && (
                      <a
                        href={scheme.brochureLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        style={{ color: "#1a1a1a", fontSize: "14px", fontWeight: "500", textDecoration: "none", padding: "2px 0", borderBottom: "2px solid #b58e46", width: "fit-content" }}
                      >
                        Brochure
                      </a>
                    )}
                    {!isSingapore && scheme.calculator && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewingScheme(scheme);
                          setShowCalculatorModal(true);
                        }}
                        style={{ background: "none", border: "none", padding: "6px 0", color: "#1a1a1a", fontSize: "14px", fontWeight: "500", cursor: "pointer", textAlign: "left", borderBottom: "2px solid #b58e46", width: "fit-content", minHeight: "auto" }}
                      >
                        Calculator
                      </button>
                    )}
                  </div>
                </div>

                {/* Model image at bottom */}
                <div className="scheme-card-image" style={{
                  width: "100%",
                  height: "180px",
                  display: "flex",
                  justifyContent: "flex-end",
                  alignItems: "flex-end",
                  overflow: "hidden",
                }}>
                  <img
                    src={scheme.imageLink}
                    alt={scheme.title}
                    style={{ maxHeight: "175px", objectFit: "contain", objectPosition: "bottom right" }}
                  />
                </div>
              </div>
            ))}
            </div>

            {activeSchemes.length > 1 && (
              <button
                type="button"
                className="carousel-arrow"
                onClick={() => scrollCarousel('right')}
                aria-label="Next plans"
              >
                &#8250;
              </button>
            )}
          </div>

          {/* Detail view below the cards */}
          {viewingScheme && (
            <div style={{
              width: "100%",
              marginTop: "24px",
              borderTop: "1px solid #e5ddd0",
              paddingTop: "20px",
            }}>
              {/* Title */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "16px", flexWrap: "wrap", gap: "8px" }}>
                <h3 style={{
                  fontFamily: "'Work Sans', sans-serif",
                  color: "#1a1a1a",
                  fontWeight: "700",
                  fontSize: "18px",
                  margin: 0,
                  flex: 1,
                }}>
                  {viewingScheme.title} Easy Monthly Advance (EMA) Plan
                </h3>
                <button
                  onClick={() => setViewingScheme(null)}
                  style={{ background: "none", border: "none", color: "#8c5c34", fontSize: "13px", fontWeight: "500", cursor: "pointer", textDecoration: "underline" }}
                >
                  Close
                </button>
              </div>

              {/* Term Duration */}
              <div style={{ marginBottom: "18px" }}>
                <h6 style={{ color: "#8c5c34", fontWeight: "700", fontSize: "14px", marginBottom: "6px", borderBottom: "1px solid #e5ddd0", paddingBottom: "4px", display: "inline-block" }}>Term Duration :</h6>
                <p style={{ margin: "6px 0 0", color: "#333", fontSize: "13px", lineHeight: "1.7" }}>{replaceCurrencySymbols(viewingScheme.termDuration, activeSymbol)}</p>
              </div>

              {/* Benefits */}
              <div style={{ marginBottom: "18px" }}>
                <h6 style={{ color: "#8c5c34", fontWeight: "700", fontSize: "14px", marginBottom: "6px", borderBottom: "1px solid #e5ddd0", paddingBottom: "4px", display: "inline-block" }}>Benefits :</h6>
                <p style={{ margin: "6px 0 0", color: "#333", fontSize: "13px", lineHeight: "1.7" }}>{replaceCurrencySymbols(viewingScheme.benefits, activeSymbol)}</p>
              </div>

              {/* Redemption */}
              <div style={{ marginBottom: "18px" }}>
                <h6 style={{ color: "#8c5c34", fontWeight: "700", fontSize: "14px", marginBottom: "6px", borderBottom: "1px solid #e5ddd0", paddingBottom: "4px", display: "inline-block" }}>Redemption :</h6>
                <p style={{ margin: "6px 0 0", color: "#333", fontSize: "13px", lineHeight: "1.7" }}>{replaceCurrencySymbols(viewingScheme.redemption, activeSymbol)}</p>
              </div>

              {/* Calculator */}
              {!isSingapore && viewingScheme.calculator && (
                <div style={{ marginTop: "24px" }}>
                  <button
                    onClick={() => setShowCalculatorModal(true)}
                    style={{
                      width: "100%",
                      padding: "12px",
                      fontSize: "14px",
                      fontWeight: "700",
                      borderRadius: "4px",
                      background: "#f7f3ed",
                      color: "#8c5c34",
                      border: "1px solid #e5ddd0",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      transition: "all 0.2s ease",
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = "#ebdccb";
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = "#f7f3ed";
                    }}
                  >
                    <img 
                      src={`${process.env.PUBLIC_URL}/images/home.png`} 
                      alt="Calculator" 
                      style={{ width: "20px", height: "20px", objectFit: "contain" }} 
                    />
                    View Calculator
                  </button>
                </div>
              )}

              {/* Enroll button */}
              <button
                style={{
                  marginTop: "24px",
                  padding: "12px 40px",
                  fontSize: "14px",
                  fontWeight: "700",
                  borderRadius: "3px",
                  background: "linear-gradient(103deg, #8c5c34 0%, #b58e46 50%, #8c5c34 100%)",
                  color: "#fff",
                  border: "none",
                  cursor: "pointer",
                }}
                onClick={() => {
                  setEnrolledScheme(viewingScheme);
                  setShowMobileForm(true);
                  setViewingScheme(null);
                  setShowSchemes(false);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                Enroll Plan
              </button>
            </div>
          )}
        </div>
      )}

      {/* // OTP Modal  */}
      <Modal
        show={showModal}
        centered
        onHide={handleCloseModal}
        backdrop="static"
        keyboard={false}
        // Prevent closing the modal by clicking outside
      >
        <Modal.Header closeButton style={{ background: "rgb(205, 154, 80)" }}>
          <Modal.Title style={{ textAlign: "center", width: "100%" }}>
            Authentication
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: "1.2rem 1.5rem" }}>
          <Form
            onSubmit={(e) => { e.preventDefault(); handleOtpSubmit(e); }}
            style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
          >
            <Form.Group className="mb-1" controlId="formBasicOtp">
              <Form.Label style={{ marginBottom: "0.5rem", fontWeight: "500" }}>
                Enter OTP{" "}
              </Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter OTP"
                value={receivedOtp}
                className="form-control custom-placeholder"
                maxLength={6}
                onChange={handleReceivedOtp}
                inputMode="numeric"
                pattern="[0-9]*"
                onFocus={handleMobileFocus}
                disabled={!isBranchValid}
              />

              {otpError && (
                <Form.Text className="text-danger">{otpError}</Form.Text>
              )}
            </Form.Group>
            <button
              type="button"
              className="custom-button1"
              style={{ marginTop: "3px" }}
              onClick={handleOtpSubmit}
              disabled={loading}
            >
              {loading ? "Verifying..." : "Verify OTP"}
            </button>
            <p className="resendNote" style={{ marginTop: "8px", marginBottom: 0, textAlign: "center", fontSize: "13px", color: "#555" }}>
              Didn't receive the OTP?{" "}
              {disabled ? (
                <span style={{ color: "gray", fontWeight: "600" }}>
                  Resend in {String(Math.floor(timer / 60)).padStart(2, "0")}:
                  {String(timer % 60).padStart(2, "0")}s
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#8c5c34",
                    fontWeight: "700",
                    fontSize: "13px",
                    cursor: "pointer",
                    textDecoration: "underline",
                    padding: "0 4px",
                  }}
                >
                  Resend OTP
                </button>
              )}
            </p>
          </Form>
        </Modal.Body>
      </Modal>

      <Modal show={showInvalidBranchModal} backdrop="static" keyboard={false}>
        <Modal.Body className="text-center">
          Please Scan QR CODE Again
        </Modal.Body>
        {/* <Modal.Footer>
        <a href="https://www.google.com/search?q=google+lens"  target="_blank" rel="noopener noreferrer" className="btn btn-primary">
        OK
    </a> 
  </Modal.Footer> */}
      </Modal>

      {/* Fullscreen Calculator Modal */}
      <Modal
        show={showCalculatorModal}
        onHide={() => setShowCalculatorModal(false)}
        fullscreen={true}
        centered
      >
        <Modal.Header closeButton style={{ background: "#f7f3ed", borderBottom: "1px solid #e5ddd0" }}>
          <Modal.Title style={{ fontSize: "16px", color: "#8c5c34", fontWeight: "700" }}>
            Sample Calculator for {viewingScheme?.title}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: 0, margin: 0, height: "calc(100vh - 58px)", overflow: "hidden" }}>
          {viewingScheme?.calculator && (
            <iframe
              src={viewingScheme.calculator}
              title={`${viewingScheme.title} calculator`}
              style={{ width: "100%", height: "100%", border: "none", display: "block" }}
            />
          )}
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default Mobile;
