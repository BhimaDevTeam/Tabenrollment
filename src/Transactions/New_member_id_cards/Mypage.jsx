import React, { useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios";
import {
  Container,
  CssBaseline,
  Button,
  Box,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Modal,
  Fade,
} from "@mui/material";

import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Membershipdetails from "./MembershipDetails";
import Subscriberdetails from "./SubscriberDetails";
import Nomineedeatils from "./NomineeDeatils";
import Paymentdetails from "./PaymentDetails";
import GuardaianDetails from "./GuardaianDetails";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./Mypage.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import { calculateAge } from "../PickDate/DateUtils";

import CameraIcon from '@mui/icons-material/Camera';
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Card } from "react-bootstrap";
import { useSelector } from "react-redux";
import { Drafttabledb, getNewMemberApiUrl, getCollectionApiUrl } from "../../apiurl";
import { formatCurrency } from "../../utlis/currencyUtils";
import WebCamComponent from "./WebCamComponent";
import UploadDocument from "./UploadFile";
import EkycQRModal from "./EkycQRModal";

import Paymentgateway from "./Paymentgateway";
import Header from "../../header";

// import { ErrorSharp } from '@mui/icons-material';
const Mypage = () => {
  const { selectedCustomerID, selectedCountry, currencySymbol } = useSelector((state) => state.customer || {});
  const activeSymbol = currencySymbol || (selectedCountry === "Singapore" ? "S$" : "₹");
  console.log("selectedCustomerID",selectedCustomerID)

  const location = useLocation();
  const navigate = useNavigate();
  const {
    customerData,
    phoneNo,
    branch,
    selectedId,
    selectedOption,
    newSubscriber: initialSubscriber,
    aadharverified: initialAadharVerified,
    aadharNo: initialAadharNo,
    selectedScheme: initialSelectedScheme
  } =
    location.state && typeof location.state === "object" ? location.state : {};

  const isBase64 = (str) => {
    if (!str || typeof str !== "string") return false;
    try {
      return btoa(atob(str)) === str;
    } catch {
      return false;
    }
  };

  const getCleanBranch = (val) => {
    const raw = val || localStorage.getItem("decodedBranch") || "";
    if (!raw) return "";
    let decoded = raw;
    if (isBase64(raw)) {
      try {
        decoded = decodeURIComponent(atob(raw));
      } catch (e) {
        decoded = raw;
      }
    }
    if (decoded && decoded.toUpperCase().trim() === "LN") {
      return "LI";
    }
    return decoded;
  };

  const [newSubscriber, setNewSubscriber] = useState(initialSubscriber || null);
  const [aadharverified, setAadharverified] = useState(initialAadharVerified || 0);
  const [aadharNo, setAadharNo] = useState(initialAadharNo || "");

  const [expanded, setExpanded] = useState("subscriber-header");
  const [subscriberData, setSubscriberData] = useState({});
  const [phone, setPhone] = useState(phoneNo || "");
  const [membershipData, setMembershipData] = useState({});
  const [nomineeData, setNomineeData] = useState({});
  const [bankData, setBankData] = useState({});
  const [guardaianData, setGuardianData] = useState({});
  const [showGuardianDetails, setShowGuardianDetails] = useState(false);
  const [saveDraftTrigger, setSaveDraftTrigger] = useState(false);
  const [isDraftSaved, setIsDraftSaved] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const [image, setImage] = useState("");
  const [openofflineModal, setopenofflineModal] = useState(false);
  const [IsDisabledCheck, setIsDisabledCheck] = useState({});
  const [errorValidate, seterrorValidate] = useState({});

  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadedDocs, setUploadedDocs] = useState(selectedCustomerID.Documents || []);

  const [paymentmode, setpaymentmode] = useState("");
  const [draftIDData,setdraftIDData]= useState("")
  const [isSaving, setIsSaving] = useState(false);
  const [IsDisabledall, setIsDisabledall] = useState(false);
  const [alldocs, setAllDocs] = useState([]);// ALL FILES WILL BE STORED HERE IN ARRAY

  // eKYC QR modal state
  const [ekycQROpen, setEkycQROpen] = useState(false);
  const [branchName, setBranchName] = useState("");
  const [noOfInstallments, setNoOfInstallments] = useState(11);
  const [ekycSignature, setEkycSignature] = useState(null); // signature captured on eKYC page
  const [permanentAddress, setPermanentAddress] = useState("");

  // Handle eKYC completion from QR modal - update state in-place without navigating
  const handleEkycComplete = useCallback((ekycData) => {
    console.log("handleEkycComplete received:", { hasPhoto: !!ekycData.aadhaarPhoto, photoLength: ekycData.aadhaarPhoto?.length, aadharNo: ekycData.aadharNo, hasSignature: !!ekycData.ekycSignature, permanentAddress: ekycData.permanentAddress });
    setAadharverified(ekycData.aadharverified || 1);
    if (ekycData.newSubscriber) setNewSubscriber(ekycData.newSubscriber);
    if (ekycData.aadhaarPhoto) setImage(ekycData.aadhaarPhoto);
    if (ekycData.aadharNo) setAadharNo(ekycData.aadharNo);
    if (ekycData.ekycSignature) setEkycSignature(ekycData.ekycSignature);
    if (ekycData.permanentAddress) setPermanentAddress(ekycData.permanentAddress);
    if (ekycData.aadhaarDoc) {
      setUploadedDocs((prev) => {
        return [...prev.filter((d) => d.Type !== "AAD"), ekycData.aadhaarDoc];
      });
      setAllDocs((prev) => {
        return [...prev.filter((d) => d.documentTypeId !== 29), { documentTypeId: 29, imagePath: ekycData.aadhaarDoc.ImagePath, documentNo: ekycData.aadhaarDoc.Name }];
      });
    }
    if (ekycData.panDoc) {
      setUploadedDocs((prev) => {
        return [...prev.filter((d) => d.Type !== "PAN"), ekycData.panDoc];
      });
      setAllDocs((prev) => {
        return [...prev.filter((d) => d.documentTypeId !== 25), { documentTypeId: 25, imagePath: ekycData.panDoc.ImagePath || "", documentNo: ekycData.panDoc.Name }];
      });
    }
  }, []);

  const calculateMaturityDate = (startDateStr, noOfMonths = 11) => {
    if (!startDateStr) return "";
    try {
      const startDate = new Date(startDateStr);
      startDate.setMonth(startDate.getMonth() + noOfMonths);
      return startDate.toISOString().split('T')[0];
    } catch (e) {
      console.error("Error calculating maturity date:", e);
      return "";
    }
  };

  useEffect(() => {
    const fetchBranchAndSchemeDetails = async () => {
      const cleanCode = getCleanBranch(branch || membershipData.branch || localStorage.getItem("decodedBranch"));
      if (!cleanCode) return;
      const apiBase = getCollectionApiUrl(selectedCountry);
      try {
        const response = await fetch(`${apiBase}/branchdetails`);
        if (response.ok) {
          const data = await response.json();
          const found = data.find(b => b.Branch_Code?.toLowerCase() === cleanCode.toLowerCase());
          if (found) {
            setBranchName(found.Branch_Name || found.BranchName || "");
          }
        }
      } catch (err) {
        console.error("Error fetching branch name:", err);
      }

      if (membershipData.selectedSchemeCode) {
        try {
          const response = await fetch(`${apiBase}/schemes?branch=${cleanCode}`);
          if (response.ok) {
            const data = await response.json();
            const match = data.find(s => s.SchemeCode === membershipData.selectedSchemeCode);
            if (match && match.NoOfIns) {
              setNoOfInstallments(match.NoOfIns);
            }
          }
        } catch (err) {
          console.error("Error fetching scheme details:", err);
        }
      }
    };
    fetchBranchAndSchemeDetails();
  }, [branch, membershipData.branch, membershipData.selectedSchemeCode]);

  const generateEnrollmentPdf = async (currentBranchCode) => {
    try {
      const panDoc = alldocs.find(d => Number(d.documentTypeId) === 25);
      let CustPanNo = panDoc ? panDoc.documentNo : "";
      if (!CustPanNo && uploadedDocs) {
        const uploadedPan = uploadedDocs.find(d => d.Type === "PAN");
        if (uploadedPan) {
          CustPanNo = uploadedPan.Name || uploadedPan.documentNo || "";
        }
      }
      
      const aadharDoc = alldocs.find(d => Number(d.documentTypeId) === 29);
      let Aadar_Number = aadharNo || (aadharDoc ? aadharDoc.documentNo : "");
      if (!Aadar_Number && uploadedDocs) {
        const uploadedAadhar = uploadedDocs.find(d => d.Type === "AAD");
        if (uploadedAadhar) {
          Aadar_Number = uploadedAadhar.Name || uploadedAadhar.documentNo || "";
        }
      }

      const cleanBranch = currentBranchCode || getCleanBranch(branch || membershipData.branch || localStorage.getItem("decodedBranch"));
      const today = new Date();
      const Start_Date = today.toISOString().split('T')[0];
      const Maturity_Date = calculateMaturityDate(Start_Date, noOfInstallments);

      // Check web.config flag: EnableSignatureEmail (0 = skip email, 1 = send). Default: enabled.
      const isSignatureEmailEnabled = (localStorage.getItem("EnableSignatureEmail") || window.APP_CONFIG?.EnableSignatureEmail || "1") === "1";

      const pdfPayload = {
        Scheme_Code: membershipData.selectedSchemeCode || "",
        Scheme_Name: membershipData.selectedSchemeName || "",
        Branch_Code: cleanBranch || "",
        Branch_Name: branchName || "",
        Salutation: subscriberData.gender === "Male" ? "Mr." : "Mrs.",
        Cust_Name: subscriberData.subscriberName || "",
        Address1: subscriberData.address1 || "",
        Address2: subscriberData.address2 || "",
        City: subscriberData.city || "",
        State: subscriberData.state || "",
        Pin_Code: subscriberData.pinCode || "",
        Mobile_No: subscriberData.mobileNo || "",
        Phone_No: phone || subscriberData.mobileNo || "",
        DateOf_Birth: subscriberData.dob || "",
        email_id: subscriberData.email || "",
        CustPanNo: CustPanNo || "",
        Aadar_Number: Aadar_Number || "",
        Gender: subscriberData.gender || "",
        Start_Date: Start_Date,
        Maturity_Date: Maturity_Date,
        InstallmentAmount: Number(membershipData.installmentAmount) || 0,
        NomineeName: nomineeData.nomineename || "",
        NomineePhone: nomineeData.nomineephoneno || "",
        NomineeAddress: nomineeData.nomineeaddress || "",
        NomineeRelation: nomineeData.relationshipName || nomineeData.relationship || "",
        GuardianName: guardaianData.guardname || "",
        MetalType: membershipData.commodityTypeId === 1 ? "Gold" : "Silver",
        SalesPersonName: "",
        AccountNo: bankData.accountNo || "",
        IFSC: bankData.ifscCode || "",
        BankName: selectedCustomerID?.BankDetails?.[0]?.BankName || "",
        // Include eKYC signature to generate pre-signed PDF (skips email sign-link step)
        ...(ekycSignature ? { SignatureBase64: ekycSignature } : {}),
        // Tell the API whether to send the signature email (controlled via web.config EnableSignatureEmail)
        sendEmail: isSignatureEmailEnabled,
      };
      const isSingaporeCall = (cleanBranch === "LI" || cleanBranch === "LN" || selectedCountry === "Singapore");
      const pdfApiBase = getCollectionApiUrl(isSingaporeCall ? "Singapore" : selectedCountry);

      console.log("Generating Enrollment PDF with payload:", {
        ...pdfPayload,
        SignatureBase64: pdfPayload.SignatureBase64 ? `[base64 ${String(pdfPayload.SignatureBase64).length} chars]` : undefined,
      });
      const response = await axios.post(
        `${pdfApiBase}/generate-enrollment-pdf-direct`,
        pdfPayload,
        {
          headers: {
            "Content-Type": "application/json",
            "country-code": isSingaporeCall ? "singapore" : "india",
            country: isSingaporeCall ? "Singapore" : "India",
          },
          timeout: 90000,
        }
      );
      console.log("PDF generation response:", response.data);
      const sId = response.data?.SignRequestID || null;
      if (sId) {
        sessionStorage.setItem("currentSignRequestId", sId);
        if (subscriberData.mobileNo) {
          sessionStorage.setItem(`currentSignRequestId_${subscriberData.mobileNo}`, sId);
        }
      }
      return sId;
    } catch (error) {
      console.error("Error generating enrollment PDF:", error);
      return null;
    }
  };

  console.log("draftIDData",draftIDData)
  console.log("alldocs",alldocs)

  //   useEffect(()=>{
  //  if(draftIDData)
  //  {
  //     setIsDisabledall(true)
  //  }
  //  else
  //  {
  //     setIsDisabledall(false)}
  //   },[draftIDData])

  // 1. Handler function to receive the status from the child component
  const handleLinkGenerationStatus = (isGenerated) => {
    console.log("Payment link generated status in Mypage:", isGenerated);
    setIsDisabledall(isGenerated);
  };


  const handlepaymentMethod = (method) => {
    console.log("Payment method changed from", paymentmode, "to", method);
    setpaymentmode(method);

    // If switching to offline and we have an existing draft, log this for debugging
    if (method === "offline" && draftIDData) {
      console.log("Customer switching to offline payment for existing draft:", draftIDData);
    }
  };

  const [flag, setFlag] = useState({
    mobileNo: false,
    subscriberName: false,
    gender: false,
    address1: false,
    pinCode: false,
    area: false,
    city: false,
    state: false,
    email: false,
    dob: false,
  });

  //UPLOAD DOCUMENT
  const docObjTypeId = useMemo(() => {
    return {
      29: "AAD",
      25: "PAN",
      26: "DRI",
      27: "VOT",
      28: "PAS",
    };
  }, []);


  const modalStyle = {
    position: "absolute",
    top: "40%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: 400,
    bgcolor: "background.paper",
    borderRadius: "4px",
    border: "2px ",
    boxShadow: 24,
    p: 4,
  };
  useEffect(() => {
    // Retrieve stored data from localStorage on component load
    const storedSubscriberData =
      JSON.parse(localStorage.getItem("subscriberData")) || {};
    const storedMembershipData =
      JSON.parse(localStorage.getItem("membershipData")) || {};
    const storedNomineeData =
      JSON.parse(localStorage.getItem("nomineeData")) || {};
    const storedBankData = JSON.parse(localStorage.getItem("bankData")) || {};
    const storedGuardianData =
      JSON.parse(localStorage.getItem("guardaianData")) || {};

    // Set the retrieved data into the state
    setSubscriberData(storedSubscriberData);
    setMembershipData(storedMembershipData);
    setNomineeData(storedNomineeData);
    setBankData(storedBankData);
    setGuardianData(storedGuardianData);
  }, []);

  const validateSubscriber = () => {
    function CustomerValidation() {
      const errors = {};
      if (!subscriberData.subscriberName) {
        errors.subscriberName = "Subscriber name is required";
      }
      if (!subscriberData.gender) {
        errors.gender = "Gender is required.";
      }
      if (!subscriberData.dob) {
        errors.dob = "dob is required.";
      }
      if (!subscriberData.email) {
        errors.email = "Email ID is required.";
      } else if (!/\S+@\S+\.\S+/.test(subscriberData.email)) {
        errors.email = "Email is invalid.";
      }
      if (!subscriberData.address1.trim() && aadharverified !== 1) {
        errors.address1 = "Address is required.";
      }
      const isSingapore = selectedCountry === "Singapore";
      if (!/^\d{6}$/.test(subscriberData.pinCode)) {
        errors.pinCode = isSingapore ? "PO Code is required (6 digits)" : "Pin code is required";
      }
      if (!subscriberData.state?.length && !isSingapore) {
        errors.state = "State is required!";
      }
      if (!subscriberData.city?.length && !isSingapore) {
        errors.city = "city is required!";
      }
      if (!subscriberData.area?.length && !isSingapore) {
        errors.area = "area is required!";
      }

      seterrorValidate(errors);
      return errors;
    }

    if (
      selectedCustomerID &&
      Array.isArray(selectedCustomerID) &&
      selectedCustomerID.length > 0
    ) {
      for (let i = 0; i < selectedCustomerID.length; i++) {
        if (selectedCustomerID[i]?.Isaadharverified == 1) {
          // console.log("enter if Isaadharverified ")
          setIsDisabledCheck(subscriberData);
          return CustomerValidation();
        } else if (selectedCustomerID[i]?.customerType === "V") {
          // console.log("else if customer type v")
          // setIsDisabledCheck(subscriberData);
          return CustomerValidation();
        } else if (
          selectedCustomerID[i]?.Isaadharverified !== 1 &&
          selectedCustomerID[i]?.customerType !== "V"
        ) {
          // console.log("else  other customer  ")
          return CustomerValidation();
        }
      }
    } else if (selectedOption != "withoutAadhar") {
      return CustomerValidation();
    } else if (selectedOption == "withoutAadhar") {
      return CustomerValidation();
    }

    // new minor with old phone (subscriber)
    else if (selectedId == "minor" || selectedId == "new") {
      return CustomerValidation();
    }
  };

  const validateMembership = () => {
    const errors = {};
    const { installmentAmount, minInsValue, insMultiples } = membershipData;
    if (!membershipData.selectedSchemeCode) {
      errors.selectedSchemeCode = "Scheme is required";
    } else {
      if (!installmentAmount) {
        errors.installmentAmount = "Installment amount cannot be empty";
      } else {
        // Parse installmentAmount here to ensure we're working with numbers
        const amountInt = parseInt(Number(installmentAmount, 10));
        const minAmount = parseInt(minInsValue, 10);
        const multiple = parseInt(insMultiples, 10);

        if (isNaN(amountInt)) {
          errors.installmentAmount = "Installment amount must be an integer";
        }
        if (amountInt != null && amountInt < minAmount) {
          errors.installmentAmount = `Installment amount must be at least ${minAmount}`;
        }
        if (amountInt != null && amountInt % multiple !== 0) {
          errors.installmentAmount = `Installment amount must be a multiple of ${multiple}`;
        }
      }
    }
    seterrorValidate(errors);
    return errors;
  };
  // Membership Details Validation
  const validateNominee = () => {
    const errors = {};
    if (!nomineeData.nomineename)
      errors.nomineename = "Nominee name is required";
    if (!nomineeData.relationship)
      errors.relationship = "Nominee relationship is required";
    if (!nomineeData.nomineeaddress)
      errors.nomineeaddress = "Nominee Address is required";

    const urlParams = new URLSearchParams(window.location.search);
    const rawBranch = urlParams.get("branch") || urlParams.get("BRANCH") || branch || membershipData?.branch || localStorage.getItem("decodedBranch") || "KRM";
    const cleanBranch = String(rawBranch).toUpperCase().trim();
    const isSg = cleanBranch === "LI" || cleanBranch === "LN" || (selectedCountry === "Singapore" && cleanBranch !== "KRM");
    if (!nomineeData.nomineephoneno) {
      errors.nomineephoneno = "Nominee Phone No is required";
    } else if (isSg && !/^\d{8}$/.test(nomineeData.nomineephoneno)) {
      errors.nomineephoneno = "Nominee phone must be 8 digits";
    } else if (!isSg && !/^\d{10}$/.test(nomineeData.nomineephoneno)) {
      errors.nomineephoneno = "Nominee phone must be 10 digits";
    }
    seterrorValidate(errors);
    return errors;
  };
  // Bank Details Validation
  const validateBank = () => {
    const errors = {};
    if (bankData.accountNo && !/^\d{9,18}$/.test(bankData.accountNo)) {
      errors.accountNo = "Valid account number is required (9 to 18 digits).";
    }
    if (bankData.ifscCode && !/^[A-Z]{4}[0-9]{7}$/.test(bankData.ifscCode)) {
      errors.ifscCode =
        "Valid IFSC code is required (4 letters followed by 7 digits).";
    }
    seterrorValidate(errors);
    return errors;
  };

  // const SetSecondElement = () => {
  //   const element = document.querySelector(`#uploaddoc-header`);
  //   if (element) {
  //     element.scrollIntoView({
  //       behavior: "smooth",
  //       block: "start",
  //     });
  //   }
  // };



  //  else if(alldocs.length===0){
  //     toast.error("Please upload all required documents")
  //     return false;
  //   }
  // Nominee Details Validation

  const validateGuardian = () => {

    const errors = {};
    if (showGuardianDetails) {
      if (!guardaianData.guardname)
        errors.guardname = "Guardian Name is required";
      if (!guardaianData.guardrelationship)
        errors.guardrelationship = "Guardian relationship is required";
      if (!guardaianData.guarddob) {
        errors.guarddob = "Guardian DOB is required";
      } else {
        const age = calculateAge(guardaianData.guarddob);
        if (age != null && age < 18) {
          errors.guarddob = "Guardian DOB should be greater than 18.";
        }
      }
      if (!guardaianData.guardGender)
        errors.guardGender = "Guardian Gender is required.";
    }
    seterrorValidate(errors);
    return errors;
  };

  const validateAllForms = () => {
    const isSingapore = selectedCountry === "Singapore";
    const errors = {
      subscriber: validateSubscriber(),
      membership: validateMembership({ ...membershipData }),
      nominee: validateNominee(),
      guardian: validateGuardian(),
      ...(!isSingapore ? { bank: validateBank() } : {}),
    };

    // Ensure we only proceed with Object.keys if errors is an object
    return Object.keys(errors).reduce((acc, key) => {
      if (errors[key] && Object.keys(errors[key]).length > 0) {
        acc[key] = errors[key];
      }
      return acc;
    }, {});
  };
  const getImageUrl = (url) => {
    setImage(url);
  };
  const handleDraft = async() => {
    //  event.preventDefault();
    // alert("1 handledraft called")
    const errors = validateAllForms();

    // const errors = validateSubscriber();
    // console.log('Submitted Errors:', errors);
    if (Object.keys(errors).length > 0) {
      if (errors.subscriber) {
        const fieldError = Object.values(errors.subscriber)[0]; // Get the first field error
        toast.error(fieldError);
        setExpanded("subscriber-header");
        seterrorValidate(errors.subscriber);
        return;
      }
      if (errors.membership) {
        const fieldError = Object.values(errors.membership)[0]; // Get the first field error
        toast.error(fieldError);
        setExpanded("membership-header");
        seterrorValidate(errors.membership);
        return;
      }
      if (errors.nominee) {
        const fieldError = Object.values(errors.nominee)[0]; // Get the first field error
        toast.error(fieldError);
        setExpanded("nominee-header");
        seterrorValidate(errors.nominee);
        return ;
      }
      if (errors.guardian) {
        const fieldError = Object.values(errors.guardian)[0]; // Get the first field error
        toast.error(fieldError);
        setExpanded("guardian-header");
        seterrorValidate(errors.guardian);
        return;
      }
      if (errors.bank) {
        const fieldError = Object.values(errors.bank)[0]; // Get the first field error
        toast.error(fieldError);
        setExpanded("bank-header");
        seterrorValidate(errors.bank);
        return;
      }
    }
    // Proceed to save draft
    // alert("before savedraft fx")
    const docs = validatedocs();
    console.log("docs caled",docs)
    //  alert("docs present"+docs)
    if (docs) {
      // scro   llToTop()
      if (image) {
        // alert(" inside savedraft response to back withn draftid in handledraft 4 ")
        const draftvalue = await saveDraft();  // IN RESPONSE WE ILL GET DRAFTID number like 809 
        // alert("draftvalue in handledraft aftr  response from savedraft sending this payment 5",draftvalue)
        console.log("draftvalue in handledraft aftr  response from savedraft sending this payment",draftvalue)
        return draftvalue;
      } else {
        // alert("Please capture the image.");
        return false;
      }
    } else {
      return false;
    }
  };

  const selectedCustomerIDocument = selectedCustomerID.Documents ? selectedCustomerID.Documents : []
  console.log("selectedCustomerIDocument",selectedCustomerIDocument)

  useEffect(() => {
    if (!selectedCustomerID || Object.keys(selectedCustomerID).length === 0) {
      setUploadedDocs([]);
      setAllDocs([]);
      return;
    }

    const rawDocs = [
      ...(Array.isArray(selectedCustomerID.Documents) ? selectedCustomerID.Documents : []),
      ...(Array.isArray(selectedCustomerID.customerDocuments) ? selectedCustomerID.customerDocuments : []),
      ...(Array.isArray(selectedCustomerID.combinedDocuments) ? selectedCustomerID.combinedDocuments : []),
      ...(Array.isArray(selectedCustomerID.draftCustomerDocuments) ? selectedCustomerID.draftCustomerDocuments : []),
      ...(Array.isArray(selectedCustomerID.document) ? selectedCustomerID.document : []),
    ];

    const profileImage = selectedCustomerID.ImageURL || selectedCustomerID.ImageUrl || selectedCustomerID.Image;
    if (profileImage && !rawDocs.some(d => (d.ImageURL || d.ImageUrl || d.ImagePath) === profileImage)) {
      rawDocs.push({
        DocumentTypeID: 30,
        Type: "IMG",
        ImageURL: profileImage,
        ImagePath: profileImage,
        DocumentDescription: "Profile Image"
      });
    }

    if (rawDocs.length > 0) {
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

      const typeIdToCodeMap = {
        29: "AAD",
        25: "PAN",
        26: "DRI",
        27: "VOT",
        28: "PAS",
        30: "IMG",
        24: "NEF",
      };

      const uniqueDocs = [];
      const seenTypes = new Set();

      rawDocs.forEach(doc => {
        const url = doc.ImageURL || doc.ImageUrl || doc.ImagePath;
        const typeId = Number(doc.DocumentTypeID || doc.documentTypeId || typeToIdMap[doc.Type] || (!isNaN(doc.Type) ? Number(doc.Type) : 0) || 29);
        const typeCode = typeIdToCodeMap[typeId] || (typeof doc.Type === "string" && isNaN(doc.Type) ? doc.Type : "AAD");
        const docNo = doc.DocumentDescription || doc.DocumentDecription || doc.Name || doc.documentNo || "";

        if (url && !seenTypes.has(typeId)) {
          seenTypes.add(typeId);
          uniqueDocs.push({
            Type: typeCode,
            ImagePath: url,
            ImageURL: url,
            Name: docNo,
            documentNo: docNo,
            documentTypeId: typeId,
            imagePath: url,
          });
        }
      });

      setUploadedDocs(uniqueDocs);
      setAllDocs(uniqueDocs);
    } else {
      setUploadedDocs([]);
      setAllDocs([]);
    }
  }, [selectedCustomerID]); // Depend only on selectedCustomerID



  //UploadedFile
  const handleFileUpload = (data) => {
    setUploadedFile(data); // Store the document data
    if (data) {
      setAllDocs((prevDocs) => [
        ...prevDocs,
        {
          documentTypeId: Number(data.docType),
          imagePath: data.documentData,
          documentNo: data.docNumber,
        },
      ]);
    }
    console.log("xcxcxcxc", data, alldocs, selectedCustomerID.Documents,uploadedFile,uploadedDocs); // Log the data for debugging
    // ImagePath(documentData), Name(docNumber), Type(docType), UpdateOn
    const docObj = {};
    docObj.Name = data.docNumber;
    docObj.Type = docObjTypeId[data.docType];
    docObj.ImagePath = data.documentData;

    // setUploadedDocs([ ...selectedCustomerID.Documents, ...uploadedDocs, docObj]);
    setUploadedDocs((prev) => [...prev, docObj]);
  };
  useEffect(() => {
    console.log("uploadedDocs in mypage", uploadedDocs);
  }, [uploadedDocs]);

  // console.log("checking", [
  //   ...uploadedDocs,
  //   docObj,
  //   ...selectedCustomerID.Documents,
  // ]);
  // const handleFilePanUpload = (data, pandocType) => {
  //   setPanUploadedFile(data); // Store the document data
  //   //  alert("pan")
  //   console.log("Uploaded File Data:", data); // Log the data for debugging
  // };

//   const SetFirstElement = () => {
//     const element = document.querySelector(`#subscriber-header`);
//     if (element) {
//       element.scrollIntoView({
//         behavior: "smooth",
//         block: "start",
//       });
//     }
//   };

  const saveDraft = async (overrideMode) => {
    // alert("in savdraaft called 2")
    try {
      if (!subscriberData.mobileNo) {
        // alert(
        //   "Phone number is required. You will be redirected to the home page."
        // );
        // toast.error('Phone number is required.'); // Display error message
        navigate(`/?branch=${localStorage.getItem("encodedBranch") || btoa(localStorage.getItem("decodedBranch") || "KRM")}`); // Navigate to the home page
        return; // Prevent saving the draft
      }
      const isSingapore = selectedCountry === "Singapore";
      if (!isSingapore && !alldocs) {
        alert("Please upload a document.");
        return;
      }
      if (!image) {
        alert("Please capture the image.");
        return;
      }

      const insAmt = Number(membershipData.installmentAmount || 0);
      const PAN_THRESHOLD = 143000;
      const hasPan = (uploadedDocs || []).some(d => d.Type === "PAN" || d.Type === "NRIC") || (alldocs || []).some(d => d.documentTypeId === 25);
      if (!isSingapore && insAmt >= PAN_THRESHOLD && !hasPan) {
        alert(`For installment amount ₹${insAmt.toLocaleString("en-IN")} (₹1,43,000 & above), PAN Card is mandatory. Please upload your PAN Card.`);
        return;
      }

      setIsSaving(true);
      // console.log('All validations passed. Initiating save draft process.');
      setFlag(true);
      let add1 = subscriberData.address1 || "";
      let add2 = subscriberData.address2 || "";

      console.log("add1", add1);
      console.log("add2", add2);

      const isaadharVerified = aadharverified || 0;
      const aadhar_No = aadharNo ? aadharNo : null;
      const cleanBranch = getCleanBranch(branch || membershipData.branch);
      const mob = subscriberData.mobileNo;
      // Reuse existing SignRequestID when available (avoid regenerating PDF on every Save)
      let signRequestId =
        sessionStorage.getItem(mob ? `currentSignRequestId_${mob}` : "currentSignRequestId") ||
        sessionStorage.getItem("currentSignRequestId") ||
        null;
      if (!signRequestId) {
        // Check web.config flag: EnableSignatureEmail (0 = skip, 1 = send email). Default: enabled.
        const isSignatureEmailEnabled = (localStorage.getItem("EnableSignatureEmail") || window.APP_CONFIG?.EnableSignatureEmail || "1") === "1";
        if (isSignatureEmailEnabled) {
          try {
            signRequestId = await generateEnrollmentPdf(cleanBranch);
          } catch (pdfErr) {
            console.warn("PDF generation failed (continuing draft save):", pdfErr);
            signRequestId = null;
          }
        } else {
          console.log("[SaveDraft] Signature email disabled via EnableSignatureEmail=0 — skipping generateEnrollmentPdf.");
        }
      }
      let installmentAmt = Number(membershipData.installmentAmount) || 0;
      let gstAmount = 0;
      let totalAmount = installmentAmt;

      if (isSingapore && installmentAmt > 0) {
        const gstRate = Number(membershipData.gstValue) > 0 ? Number(membershipData.gstValue) : 9;
        const isInclusive = membershipData.isGSTInclusive === undefined || membershipData.isGSTInclusive === null
          ? true
          : (Number(membershipData.isGSTInclusive) === 1 || membershipData.isGSTInclusive === true);

        if (isInclusive) {
          gstAmount = (installmentAmt * gstRate) / (100 + gstRate);
          installmentAmt = installmentAmt - gstAmount; // Acc. Amount
          totalAmount = Number(membershipData.installmentAmount);
        } else {
          gstAmount = (installmentAmt * gstRate) / 100;
          totalAmount = installmentAmt + gstAmount;
        }
      }

      const draftData = {
        ...(draftIDData ? { DraftID: draftIDData } : {}),
        country: selectedCountry || "India",
        countryCode: selectedCountry === "Singapore" ? "SG" : "IN",
        Country: selectedCountry || "India",
        Branch: cleanBranch,
        Scheme: membershipData.selectedSchemeCode || "",
        Cust_Name: subscriberData.subscriberName || "",
        Gender: subscriberData.gender || "",
        Address1: add1 || "",
        Address2: add2 || "",
        Address3: subscriberData.area || "",
        PermanentAddress: permanentAddress || "",
        State: subscriberData.state || "",
        City: subscriberData.city || "", //CITY
        Pin_Code: subscriberData.pinCode || "",
        Mobile_No: subscriberData.mobileNo || "",
        email_id: subscriberData.email || "",
        DateOf_Birth: subscriberData.dob || "",
        InstallmentAmount: installmentAmt,
        NomineName: nomineeData.nomineename || "",
        NomineRelationship: nomineeData.relationship || "",
        NominePhone: nomineeData.nomineephoneno || "",
        NomineAddress: nomineeData.nomineeaddress || "",
        Accountno: bankData.accountNo || "",
        ifsccode: bankData.ifscCode || "",
        GuardianName: guardaianData.guardname || "",
        GuardianRelation: guardaianData.guardrelationship || "",
        Guardiangender: guardaianData.guardGender || "",
        GuardianDOB: guardaianData.guarddob || null,
        IsMembershipCreated: membershipData.isMembershipCreated || "N" || "",
        MembershipNo: membershipData.membershipNo || "",
        IsAadarVerified: isaadharVerified,
        IsCancelFlag: "N",
        imageUrl: image,
        inserted_By: "BY",
        documents: alldocs,
        TnxType: overrideMode || paymentmode,
        AadharNo: aadhar_No,
        SignRequestID: signRequestId,
        GST_Amount: gstAmount.toFixed(2),
        TotalAmount: totalAmount.toFixed(2)
      };

      console.log("Draft Data to be saved:", draftData);

      const countryName =
        selectedCountry === "Singapore" || cleanBranch === "LI" || cleanBranch === "LN"
          ? "Singapore"
          : "India";
      const countryCode = countryName === "Singapore" ? "SG" : "IN";
      const draftApiBase = getCollectionApiUrl(countryName);

      // 1) Always save draft in DraftEnrollmentApi (needs DraftID)
      const response = await axios.post(
        `${draftApiBase}/draftenrollment`,
        draftData,
        {
          headers: {
            "Content-Type": "application/json",
            country: countryName,
            "country-code": countryCode,
          },
          timeout: 60000,
        }
      );
      console.log("Draft saved successfully:", response);
      if (response.data) {
        setdraftIDData(response.data.DraftID);
        console.log("response.data", response.data);

        // 2) After draft save → country portal newmember-creationTE
        //    India  → VrudhiPortalAPI/.../newmember-creationTE
        //    Singapore → VrudhiPortalAPISG/.../newmember-creationTE
        if (response.data.DraftID) {
          const newMemberUrl = getNewMemberApiUrl(countryCode);
          fetch(newMemberUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              country: countryName,
              "country-code": countryCode,
            },
            body: JSON.stringify({
              ID: response.data.DraftID,
              Status: "SUCCESS",
            }),
          })
            .then(async (r) => {
              const d = await r.json();
              const mNo = d?.MembershipNo || d?.membershipNo || d?.Data?.MembershipNo || d?.Data?.membershipNo;
              console.log(`[newmember-creationTE] ${countryName}:`, newMemberUrl, d);
              if (mNo) {
                console.log("[newmember-creationTE] created membership number:", mNo);
              }

              // 3) Finalize — pass MembershipNo to finalize API
              const sid = sessionStorage.getItem("currentSignRequestId");
              const finalizeBody = mNo && sid
                ? {
                    DraftID: response.data.DraftID,
                    SignRequestID: sid,
                    MembershipNo: mNo,
                    country: countryName,
                    countryCode,
                  }
                : {
                    DraftID: response.data.DraftID,
                    SignRequestID: sid || undefined,
                    country: countryName,
                    countryCode,
                  };
              const finalizeUrl = mNo && sid
                ? `${draftApiBase}/finalize-signed-pdf`
                : `${draftApiBase}/finalize-from-draft`;

              fetch(finalizeUrl, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  country: countryName,
                  "country-code": countryCode,
                },
                body: JSON.stringify(finalizeBody),
              })
                .then((fr) => fr.json())
                .then((fd) => console.log("[finalize] after newmember:", fd))
                .catch((fe) => console.warn("[finalize] after newmember failed (non-blocking):", fe));
            })
            .catch((e) => console.warn("[newmember-creationTE] failed (non-blocking):", e));

          // Also sync documents via DraftEnrollmentApi helper (uses same portal URLs server-side)
          fetch(`${draftApiBase}/upload-to-crm`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              country: countryName,
              "country-code": countryCode,
            },
            body: JSON.stringify({
              DraftID: response.data.DraftID,
              country: countryName,
              countryCode,
            }),
          })
            .then((r) => r.json())
            .then((d) => console.log("[CRM] upload-to-crm after draft save:", d))
            .catch((e) => console.warn("[CRM] Upload failed (non-blocking):", e));
        }

        setIsDraftSaved(true);

        console.log("response.data.DraftID", response.data.DraftID);
        return response.data.DraftID;
      } else {
        alert("Server is Busy...plz retry");
      }
    } catch (error) {
      const apiMsg =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        (typeof error?.response?.data === "string" ? error.response.data.slice(0, 200) : null) ||
        error?.message ||
        "Draft save failed. Please retry.";
      alert(apiMsg);
      console.log("saveDraft error:", error?.response?.status, error?.response?.data || error);
    } finally {
      setIsSaving(false);
      setSaveDraftTrigger(false);
    }
  };

  const handlepaymentupdate = (childfunction) => {
    // alert("handle payment ,")
    childfunction();
  };

  const handleModalClose = () => {
    setOpenModal(false);
    setopenofflineModal(false);
    clearData();
    navigate(`/?branch=${localStorage.getItem("encodedBranch") || btoa(localStorage.getItem("decodedBranch") || "KRM")}`); // Redirect to mobile page on modal close
    //  window.location.reload();
  };

  const handleModalOenOffline = () => {

    setpaymentmode("offline");
    //setOpenModal(true);
    setopenofflineModal(true);


    // clearData();
    // navigate(`/?branch=${localStorage.getItem("decodedBranch")}`); // Redirect to mobile page on modal close
    // //  window.location.reload();
  };
  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (!isDraftSaved) {
        const message =
          "Are you sure you want to leave this page? Any unsaved changes will be lost.";
        event.preventDefault();
        event.returnValue = message;
        sessionStorage.setItem("reloading", "true");
        return message;
      }
    };

    // Add the beforeunload event listener
    window.addEventListener("beforeunload", handleBeforeUnload);

    // Cleanup the event listener when component unmounts
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isDraftSaved]);

  // Redirect to /mobile if a reload was detected
  useEffect(() => {
    if (sessionStorage.getItem("reloading") === "true") {
      sessionStorage.removeItem("reloading");
      navigate(`/?branch=${localStorage.getItem("encodedBranch") || btoa(localStorage.getItem("decodedBranch") || "KRM")}`);
    }
  }, [navigate]);

  const clearData = () => {
    sessionStorage.removeItem("currentSignRequestId");
    if (subscriberData.mobileNo) {
      sessionStorage.removeItem(`currentSignRequestId_${subscriberData.mobileNo}`);
    }
    localStorage.removeItem("subscriberData"); // subscriberData
    localStorage.removeItem("membershipData");
    localStorage.removeItem("nomineeData");
    localStorage.removeItem("bankData");
    localStorage.removeItem("guardaianData");
    setSubscriberData({});
    setMembershipData({});
    setNomineeData({});
    setBankData({});
    setGuardianData({});
    setPhone("");
    setdraftIDData("");
    setPermanentAddress("");
  };

  const clearError = (fieldName) => {
    seterrorValidate((prev) => ({
      ...prev,
      [fieldName]: undefined,
    }));
  };
  useEffect(() => {
    localStorage.setItem("subscriberData", JSON.stringify(subscriberData));
    localStorage.setItem("membershipData", JSON.stringify(membershipData));
    localStorage.setItem("nomineeData", JSON.stringify(nomineeData));
    localStorage.setItem("bankData", JSON.stringify(bankData));
    localStorage.setItem("guardaianData", JSON.stringify(guardaianData));
  }, [subscriberData, membershipData, nomineeData, bankData, guardaianData]);
  const branch1 = localStorage.getItem("decodedBranch");

  const On_click_subsriber_validation = () => {
    const errors = validateSubscriber();
    if (Object.keys(errors).length === 0) {
      showGuardianDetails
        ? setExpanded("guardian-header")
        : setExpanded("membership-header");
    } else {
      const fieldError = Object.values(errors)[0]; // Get the first error message
      toast.error(fieldError);
      setExpanded("subscriber-header");
      return true;
    }
    // SetFirstElement();
  };

  const On_click_guardian_validation = () => {
    const sub = On_click_subsriber_validation();

    if (sub) {
      setExpanded("subscriber-header");
      return;
    }
    const errors = validateGuardian();
    console.log("gurdian validation result", errors);
    if (Object.keys(errors).length === 0) {
      setExpanded("membership-header");
    } else {
      const fieldError = Object.values(errors)[0]; // Get the first error message
      toast.error(fieldError);
      setExpanded("guardian-header");
      return true;
    }

    // SetFirstElement();
  };

  const On_click_membership_validation = () => {
    const sub = On_click_subsriber_validation();
    if (sub) {
      setExpanded("subscriber-header");
      return false;
    }
  
    const gub = On_click_guardian_validation();
    if (gub) {
      setExpanded("guardian-header");
      return;
    }
    const errors = validateMembership();
    console.log("gurdianmm validation result", errors);
    if (Object.keys(errors).length === 0) {
      setExpanded("nominee-header");
    } else {
      const fieldError = Object.values(errors)[0]; // Get the first error message
      toast.error(fieldError);
      setExpanded("membership-header");
      return true;
    }
    // SetFirstElement();
  };

  const On_click_nominee_validation = (targetSection = "bank-header") => {
    const sub = On_click_subsriber_validation();
    if (sub) {
      setExpanded("subscriber-header");
      return true;
    }
    const gub = On_click_guardian_validation();
    if (gub) {
      setExpanded("guardian-header");
      return true;
    }
    const meb = On_click_membership_validation();
    if (meb) {
      setExpanded("membership-header");
      return true;
    }
    const errors = validateNominee();
    if (Object.keys(errors).length === 0) {
      const defaultNext = selectedCountry === "Singapore" ? "uploaddoc-header" : "bank-header";
      const nextHeader = typeof targetSection === "string" ? targetSection : defaultNext;
      setExpanded(nextHeader);
      return false;
    } else {
      const fieldError = Object.values(errors)[0]; // Get the first error message
      toast.error(fieldError);
      setExpanded("nominee-header");
      return true;
    }
  };

  const On_click_bank_validation = (targetSection = "uploaddoc-header") => {
    const sub = On_click_subsriber_validation();
    if (sub) {
      setExpanded("subscriber-header");
      return true;
    }
    const gub = On_click_guardian_validation();
    if (gub) {
      setExpanded("guardian-header");
      return true;
    }
    const meb = On_click_membership_validation();
    if (meb) {
      setExpanded("membership-header");
      return true;
    }
    const nom = On_click_nominee_validation("bank-header");
    if (nom) {
      return true;
    }
    const errors = validateBank(); // Validate the bank details
    if (Object.keys(errors).length === 0) {
      const nextHeader = typeof targetSection === "string" ? targetSection : "uploaddoc-header";
      setExpanded(nextHeader);
      return false;
    } else {
      const fieldError = Object.values(errors)[0]; // Get the first error message
      toast.error(fieldError);
      setExpanded("bank-header");
      return true;
    }
  };
  const validatedocs = () => {
    const isSingapore = selectedCountry === "Singapore";

    const sub = On_click_subsriber_validation();
    if (sub) {
      setExpanded("subscriber-header");
      return false;
    }
    const gub = On_click_guardian_validation();
    if (gub) {
      setExpanded("guardian-header");
      return false;
    }

    const meb = On_click_membership_validation();
    if (meb) {
      setExpanded("membership-header");
      return false;
    }

    const nom = On_click_nominee_validation();
    if (nom) {
      setExpanded("nominee-header");
      return false;
    }

    if (!isSingapore) {
      const bank = On_click_bank_validation();
      if (bank) {
        setExpanded("bank-header");
        return false;
      }
    }

    // Check if any address proof document is uploaded
    const isAddressUploaded = uploadedDocs.some(
      (doc) => ["AAD", "DRI", "VOT", "PAS", "PAN", "NRIC"].includes(doc.Type)
    );

    console.log("uploadedDocs", uploadedDocs);
    console.log("isAddressUploaded", isAddressUploaded);
    console.log("aadharverified", aadharverified);

    // Only require address proof for India if not Aadhaar e-verified AND no documents uploaded
    if (!isSingapore && !isAddressUploaded && aadharverified !== 1) {
      toast.error("Please Upload at least one Address Proof document");
      setExpanded("uploaddoc-header");
      return false;
    }

    // If documents are okay or Singapore or Aadhaar is verified, proceed to camera
    setExpanded("camera-header");
    return true;
  };

  const On_click_payment_camera_validation = () => {
    const sub = On_click_subsriber_validation();
    if (sub) {
      setExpanded("subscriber-header");
      return false;
    }
    const gub = On_click_guardian_validation();
    if (gub) {
      setExpanded("guardian-header");
      return false;
    }

    const meb = On_click_membership_validation();
    if (meb) {
      setExpanded("membership-header");
      return false;
    }

    const nom = On_click_nominee_validation();
    if (nom) {
      setExpanded("nominee-header");
      return false;
    }

    const bank= On_click_bank_validation();
    if (bank) {
      setExpanded("bank-header");
      return false;
    }

    const doc = validatedocs();
    if (!doc) {
      setExpanded("uploaddoc-header");
      return false;
    }

    if (!image) {
      toast.error("Please capture your image.");
      setExpanded("camera-header");
      return false;
    } else {
      setExpanded("payment-header");
      return;
    }
  };

  // const On_click_uploaddoc_validation = () => {
  //   // const bnk=On_click_bank_validation()
  //   // if(bnk){
  //   //   setExpanded("bank-header")
  //   //   return
  //   // }
  //   const doc = validatedocs();
  //   SetSecondElement();
  //   // return doc
  // };

  // const On_click_camera_validation = () => {
  //   validatedocs();
  // };

  const CallModal = () => {
    // alert("calling modal")
    setOpenModal(true);
  };


  const SaveData = async (overrideMode) => {
    const activeMode = overrideMode || paymentmode;
    console.log("SaveData called with activeMode:", activeMode);

    if (activeMode === "online") {
      // For online payment, create new draft
      const handle = await saveDraft(activeMode);
      return handle;
    }
    else if (activeMode === "offline") {
      // Check if switching from online to offline (draft already exists)
      if (draftIDData) {
        try {
          console.log("Updating existing draft to offline payment method");
          setIsSaving(true);

          // Prepare complete draft data with existing DraftID
          let add1 = subscriberData.address1 || "";
          let add2 = subscriberData.address2 || "";
          const isaadharVerified = aadharverified || 0;
          const aadhar_No = aadharNo ? aadharNo : null;
          const cleanBranch = getCleanBranch(branch || membershipData.branch);
          
          const mob = subscriberData.mobileNo;
          let signRequestId =
            sessionStorage.getItem(mob ? `currentSignRequestId_${mob}` : "currentSignRequestId") ||
            sessionStorage.getItem("currentSignRequestId") ||
            null;
          if (!signRequestId) {
            // Check web.config flag: EnableSignatureEmail (0 = skip, 1 = send email). Default: enabled.
            const isSignatureEmailEnabled = (localStorage.getItem("EnableSignatureEmail") || window.APP_CONFIG?.EnableSignatureEmail || "1") === "1";
            if (isSignatureEmailEnabled) {
              try {
                signRequestId = await generateEnrollmentPdf(cleanBranch);
              } catch (e) {
                console.warn("PDF generate failed on offline update:", e);
              }
            } else {
              console.log("[OfflineUpdate] Signature email disabled via EnableSignatureEmail=0 — skipping generateEnrollmentPdf.");
            }
          }
          setIsSaving(false);
          setopenofflineModal(true);
          return draftIDData;
        } catch (error) {
          console.error("Error updating draft payment method:", error);

          // Handle different types of errors
          if (error.response && error.response.data && error.response.data.message) {
            toast.error(error.response.data.message);
          } else {
            toast.error("Error updating payment method");
          }
          return false;
        } finally {
          setIsSaving(false);
        }
      } else {
        // No existing draft, create new one with offline payment
        const handle = await saveDraft(activeMode);
        console.log("handle in mypage for new offline draft", handle);
        if(handle) {
          setopenofflineModal(true);
        }
        return handle;
      }
    }
  };
  return (
    <Container component="main" className="mypage-header" maxWidth="md">
      {isSaving && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          backgroundColor: "rgba(255, 255, 255, 0.7)",
          backdropFilter: "blur(5px)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          transition: "all 0.3s ease"
        }}>
          <div className="spinner-border" role="status" style={{ width: "3rem", height: "3rem", color: "#8c5c34" }}>
            <span className="visually-hidden">Loading...</span>
          </div>
          <p style={{ marginTop: "16px", color: "#8c5c34", fontWeight: "600", fontSize: "16px" }}>
            Saving, please wait...
          </p>
        </div>
      )}
      <CssBaseline />
      <Header branch={branch1} />
      <div className="header-container flex items-center justify-between px-4 py-3">
        <div>
          <Link to={`/?branch=${branch1}`} style={{ textDecoration: "none" }}>
            <div
              style={{
                position: "relative",
                // backgroundColor:"white",
                display: "inline-block",
                fontWeight: "bold",
              }}
            >
              <img
                src={`${process.env.PUBLIC_URL}/images/bhima_logo3.png`}
                alt="Home"
                style={{
                  width: "100px", // Adjust the size of the icon as needed
                  height: "60px", // Adjust the height accordingly
                  marginRight: "0px", // Add margin to create space between the icon and text
                  marginBottom: "15px",
                }}
              />
            </div>
          </Link>
        </div>

        <div className="flex-1 text-center" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "linear-gradient(135deg, #4a2810, #7a4b27)",
              color: "#fcde7e",
              border: "1px solid #d4af37",
              borderRadius: "20px",
              padding: "4px 14px",
              fontSize: "13px",
              fontWeight: "700",
              marginBottom: "4px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            }}
          >
            <span>{selectedCountry === "Singapore" ? "🇸🇬" : "🇮🇳"}</span>
            <span>{selectedCountry === "Singapore" ? "Singapore (S$ - SGD)" : "India (₹ - INR)"}</span>
          </div>
          <h2
            className="text-black"
            style={{ fontFamily: "Quiche Sans", fontWeight: "normal", color: "white", margin: 0 }}
          >
            ENROLLMENT
          </h2>
        </div>
      </div>

      <Box mb={2}>
        <Accordion
          expanded={expanded === "subscriber-header"}
          onChange={() =>
            setExpanded(
              expanded === "subscriber-header" ? false : "subscriber-header"
            )
          }
          sx={{
            background:
              "linear-gradient(103.45deg, rgb(97, 65, 25) -11.68%, rgb(205, 154, 80) 48.54%, rgb(97, 65, 25) 108.76%)",
            color: "#fff", // Ensure text remains readable
            borderRadius: "8px", // Optional: Adds rounded corners
          }}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="subscriber-content"
            id="subscriber-header"
          >
            <Typography sx={{ color: "#fff" }}>Subscriber Details</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Subscriberdetails
              flag={flag}
              setFlag={setFlag}
              setSubscriberData={setSubscriberData}
              newSubscriber={newSubscriber}
              errorValidate={errorValidate}
              selectedId={selectedId}
              selectedOption={selectedOption}
              customerData={customerData}
              phoneNo={phoneNo}
              clearError={clearError}
              showGuardianDetails={showGuardianDetails}
              setShowGuardianDetails={setShowGuardianDetails}
              validationdisable={IsDisabledCheck}
            />
          </AccordionDetails>
        </Accordion>
      </Box>

      {showGuardianDetails && (
        <Box mb={2}>
          <Accordion
            expanded={expanded === "guardian-header"}
            onClick={On_click_subsriber_validation}
            onChange={() =>
              setExpanded(
                expanded === "guardian-header" ? false : "guardian-header"
              )
            }
            sx={{
              background:
                "linear-gradient(103.45deg, rgb(97, 65, 25) -11.68%, rgb(205, 154, 80) 48.54%, rgb(97, 65, 25) 108.76%)",
              color: "#fff", // Ensure text remains readable
              borderRadius: "8px", // Optional: Adds rounded corners
            }}
          >
            {/* <Accordion expanded={expanded === 'guardian-header'} onChange={() => setExpanded(expanded === 'guardian-header' ? false : 'guardian-header')}>
             */}
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              aria-controls="guardian-content"
              id="guardian-header"
            >
              <Typography sx={{ color: "#fff" }}>Guardian Details</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <GuardaianDetails
                setGuardianData={setGuardianData}
                errorValidate={errorValidate}
                clearError={clearError}

              />
              <div className="button-container">
                {/* <button
                  className="styled-button"
                  onClick={() => {
                    const errors = validateGuardian();
                    if (Object.keys(errors).length === 0) {
                      setExpanded('membership-header');
                    } else {
                      const fieldError = Object.values(errors)[0]; // Get the first error message
                      toast.error(fieldError);
                    }
                  }}
                >
                 <i class="bi bi-arrow-right"></i>
                </button> */}
              </div>
            </AccordionDetails>
          </Accordion>
        </Box>
      )}

      <Box mb={2}>
        <Accordion
          expanded={expanded === "membership-header"}
          onClick={On_click_guardian_validation}
          onChange={() =>
            setExpanded(
              expanded === "membership-header" ? false : "membership-header"
            )
          }
          sx={{
            background:
              "linear-gradient(103.45deg, rgb(97, 65, 25) -11.68%, rgb(205, 154, 80) 48.54%, rgb(97, 65, 25) 108.76%)",
            color: "#fff", // Ensure text remains readable
            borderRadius: "8px", // Optional: Adds rounded corners
          }}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="membership-content"
            id="membership-header"
          >
            <Typography sx={{ color: "#fff" }}>Scheme Details</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Membershipdetails
              validateMembership={validateMembership}
              setMembershipData={setMembershipData}
              membershipData={membershipData}
              branch={getCleanBranch(branch)}
              errorValidate={errorValidate}
              clearError={clearError}
              isdraftid_gen={IsDisabledall}
              preSelectedScheme={initialSelectedScheme}
            />
          </AccordionDetails>
        </Accordion>
      </Box>

      <Box mb={2}>
        <Accordion
          expanded={expanded === "nominee-header"}
          onClick={On_click_membership_validation}
          onChange={() =>
            setExpanded(
              expanded === "nominee-header" ? false : "nominee-header"
            )
          }
          sx={{
            background:
              "linear-gradient(103.45deg, rgb(97, 65, 25) -11.68%, rgb(205, 154, 80) 48.54%, rgb(97, 65, 25) 108.76%)",
            color: "#fff", // Ensure text remains readable
            borderRadius: "8px", // Optional: Adds rounded corners
          }}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="nominee-content"
            id="nominee-header"
          >
            <Typography sx={{ color: "#fff" }}>Nominee Details</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Nomineedeatils
              setNomineeData={setNomineeData}
              errorValidate={errorValidate}
              clearError={clearError}
              subscriberAddress={subscriberData}
              subscriberGender={subscriberData.gender}
              isdraftid_gen={IsDisabledall}
            />
          </AccordionDetails>
        </Accordion>
      </Box>

      {selectedCountry !== "Singapore" && (
        <Box mb={2}>
          <Accordion
            expanded={expanded === "bank-header"}
            onChange={(e, isExpanded) => {
              if (isExpanded) {
                On_click_nominee_validation("bank-header");
              } else {
                setExpanded(false);
              }
            }}
            sx={{
              background:
                "linear-gradient(103.45deg, rgb(97, 65, 25) -11.68%, rgb(205, 154, 80) 48.54%, rgb(97, 65, 25) 108.76%)",
              color: "#fff", // Ensure text remains readable
              borderRadius: "8px", // Optional: Adds rounded corners
            }}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              aria-controls="bank-content"
              id="bank-header"
            >
              <Typography sx={{ color: "#fff" }}>Bank Account Details</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Paymentdetails
                setBankData={setBankData}
                errorValidate={errorValidate}
                clearError={clearError}
              />
            </AccordionDetails>
          </Accordion>
        </Box>
      )}

      {/* Upload Documents accordion - visible for all countries; optional for Singapore */}
      <Box mb={2}>
        <Accordion
          expanded={expanded === "uploaddoc-header"}
          onChange={(e, isExpanded) => {
            if (isExpanded) {
              if (selectedCountry === "Singapore") {
                On_click_nominee_validation("uploaddoc-header");
              } else {
                On_click_bank_validation("uploaddoc-header");
              }
            } else {
              setExpanded(false);
            }
          }}
          sx={{
            background:
              "linear-gradient(103.45deg, rgb(97, 65, 25) -11.68%, rgb(205, 154, 80) 48.54%, rgb(97, 65, 25) 108.76%)",
            color: "#fff", // Ensure text remains readable
            borderRadius: "8px", // Optional: Adds rounded corners
          }}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="uploaddoc-content"
            id="uploaddoc-header"
          >
            <Typography sx={{ color: "#fff" }}>Upload Documents</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <UploadDocument
              amount={membershipData.installmentAmount}
              noOfInstallments={noOfInstallments}
              schemename={membershipData.selectedSchemeName}
              onFileUpload={handleFileUpload}
              uploadedDocs={uploadedDocs}
              onEkyc={() => setEkycQROpen(true)}
              aadharverified={aadharverified}
            />
          </AccordionDetails>
        </Accordion>
      </Box>

      <Box mb={2}>
        <Accordion
          expanded={expanded === "camera-header"}
          onClick={validatedocs}
          onChange={() =>
            setExpanded(expanded === "camera-header" ? false : "camera-header")
          }
          sx={{
            background: "linear-gradient(103.45deg, rgb(97, 65, 25) -11.68%, rgb(205, 154, 80) 48.54%, rgb(97, 65, 25) 108.76%)", // same beige gradient
            color:"#fff",
            borderRadius: "10px",
            boxShadow: "0 2px 6px rgba(0,0,0,0.05)", // very subtle shadow
          }}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon sx={{ color: "#6b4a2b" }} />} // brown arrow
            aria-controls="camera-content"
            id="camera-header"
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 2,
            }}
          >
            {/* Icon Box */}
            {/* <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: "12px",
          backgroundColor: "#e5d8c7", 
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CameraIcon sx={{ color: "#6b4a2b" }} />
      </Box> */}

            <Box>
              <Typography sx={{  color:  "#fff" }}>
                Camera
              </Typography>
              <Typography sx={{ fontSize: "14px", color:  "#fff" }}>
                Click on the Camera to Capture your Photo
              </Typography>
            </Box>
          </AccordionSummary>

          <AccordionDetails>
            <WebCamComponent getImageUrl={getImageUrl} capturedImage={image} aadharVerified={aadharverified} />
          </AccordionDetails>
        </Accordion>
      </Box>


      <Box mb={2}>
        <Accordion
          expanded={expanded === "payment-header"}
          onClick={On_click_payment_camera_validation}
          onChange={() =>
            setExpanded(expanded === "payment-header" ? false : "payment-header")
          }
          sx={{
            background:
              "linear-gradient(103.45deg, rgb(97, 65, 25) -11.68%, rgb(205, 154, 80) 48.54%, rgb(97, 65, 25) 108.76%)",
            color: "#fff", // Ensure text remains readable
            borderRadius: "8px", // Optional: Adds rounded corners
          }}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="payment-content"
            id="payment-header"
          >
            <Typography sx={{ color: "#fff" }}>Payment</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Paymentgateway
              setExpanded={setExpanded}
              savedraft={SaveData}
              handlepayment={handlepaymentupdate}
              openModal={CallModal}
              paymentMethodMode={handlepaymentMethod}
              handleModalOenOffline={handleModalOenOffline}
              onLinkGenerationStatus={handleLinkGenerationStatus}
              hasEkycSignature={!!ekycSignature}
              ekycSignature={ekycSignature}
              setEkycSignature={setEkycSignature}
              generateEnrollmentPdfProp={generateEnrollmentPdf}
            />
          </AccordionDetails>
        </Accordion>
      </Box>



      {/* <Box mb={2}>
        <Card
          style={{
            background:
              "linear-gradient(103.45deg, rgb(97, 65, 25) -11.68%, rgb(205, 154, 80) 48.54%, rgb(97, 65, 25) 108.76%)",
            color: "#fff", // Ensure text remains readable
            borderRadius: "8px", // Optional: Adds rounded corners
          }}
        >
          <Card.Body>
            <Card.Title>Payment</Card.Title>
            <Paymentgateway
              setExpanded={setExpanded}
              savedraft={SaveData}
              handlepayment={handlepaymentupdate}
              openModal={CallModal}
              paymentMethodMode={handlepaymentMethod}
              handleModalOenOffline={handleModalOenOffline}
            />
          </Card.Body>
        </Card>
      </Box> */}

      {/* Success Modal */}
      {/* <Modal
        open={openModal}
        onClose={(event, reason) => {
          if (reason && reason === "backdropClick") return; // Prevent close on outside click
          handleModalClose(); // Only close if it's not a backdrop click
        }}
        closeAfterTransition
        className="success-model-popup2"
      >
        <Fade in={openModal}>
          <Box sx={modalStyle} class="modal-content">
            <div className="text-center">
              <div className="icon-box">
                <CheckCircleIcon sx={{ fontSize: 60, color: "green" }} />  ///////////////// Mohith_dev///////////
              </div>
            </div>
            <Typography
              variant="h6"
              component="h2"
              align="center"
              sx={{
                mt: 2,
                fontSize: { xs: "16px" },
              }}
            >
              " Thank you for Subscribing for JPP Scheme"
            </Typography>
            <Typography sx={{ mt: 2 }} align="center">
              <ul style={{ listStyleType: "none", paddingLeft: 0 }}>
                <li>Mobile No: {subscriberData.mobileNo}</li>
                <li>Subscriber Name: {subscriberData.subscriberName}</li>
                <li>Scheme Name: {membershipData.selectedSchemeName}</li>
                <li>
                  Installment Amount: ₹
                  {membershipData.installmentAmount
                    ? membershipData.installmentAmount.toLocaleString("en-IN")
                    : "N/A"}
                </li>
              </ul>
            </Typography>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "20px", // same as gap-x-5
              }}
            >
              <button
                className="custom-button1"
                style={{
                  display: "inline-block",
                  width: "100%",
                  marginTop: "20px",
                  padding: "12px",
                  borderRadius: "10px",
                  // background: "linear-gradient(90deg, #7b5ce6, #4f2dbf)",
                  color: "white",
                  textAlign: "center",
                  textDecoration: "none",
                  fontSize: "15px",
                  fontWeight: "bold",
                  cursor: "pointer",
                  boxShadow: "0px 4px 10px rgba(0,0,0,0.2)",
                }}
                onClick={handleModalClose}
              >
                OK
              </button>
            </div>
          </Box>
        </Fade>
      </Modal> */}

      <Modal
        open={openofflineModal}
        onClose={(event, reason) => {
          if (reason && reason === "backdropClick") return; // Prevent close on outside click
          handleModalClose(); // Only close if it's not a backdrop click
        }}
        closeAfterTransition
        className="success-model-popup2"
      >
        <Fade in={openofflineModal}>
          <Box sx={modalStyle} class="modal-content">
            <div className="text-center">
              <div className="icon-box">
                <CheckCircleIcon sx={{ fontSize: 60, color: "green" }} />
              </div>
            </div>
            <Typography
              variant="h6"
              component="h2"
              align="center"
              sx={{
                mt: 2,
                fontSize: { xs: "16px" },
              }}
            >
              "Thank you for your interest in the JPP Scheme. Please contact a
              Bhima agent to proceed with the payment."
            </Typography>
            <Typography sx={{ mt: 2 }} align="center">
              <ul style={{ listStyleType: "none", paddingLeft: 0 }}>
                <li>Mobile No: {subscriberData.mobileNo}</li>
                <li>Subscriber Name: {subscriberData.subscriberName}</li>
                <li>Scheme Name: {membershipData.selectedSchemeName}</li>
                <li>
                  Installment Amount: {formatCurrency(membershipData.installmentAmount || 0, activeSymbol)}
                </li>
              </ul>
            </Typography>
            <button className="custom-button1 w-100" onClick={handleModalClose}>
              OK
            </button>
          </Box>
        </Fade>
      </Modal>

      <EkycQRModal
        open={ekycQROpen}
        onClose={() => setEkycQROpen(false)}
        phoneNo={phoneNo}
        onEkycComplete={handleEkycComplete}
        enrollmentData={{
          name: subscriberData.subscriberName || "",
          scheme: membershipData.selectedSchemeName || "",
          amount: membershipData.installmentAmount || "",
          dob: subscriberData.dob || "",
          gender: subscriberData.gender || "",
          address: [subscriberData.address1, subscriberData.address2, subscriberData.address3].filter(Boolean).join(", "),
          city: subscriberData.city || "",
          state: subscriberData.state || "",
          pincode: subscriberData.pinCode || "",
        }}
      />

      <ToastContainer />
    </Container>
  );
};

export default Mypage;
