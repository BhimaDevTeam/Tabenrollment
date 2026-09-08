import React, { useState,useRef, useEffect } from "react";
import { useLocation, useNavigate } from 'react-router-dom';
import './MobileVer.css';
import 'react-toastify/dist/ReactToastify.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import { parseJSON } from "date-fns";
import { setCustomer, setSelectedCustomerID, setIsOtherCustomer } from "../redux/customer/customerSlice";
import { useDispatch, useSelector } from "react-redux";
import { calculateAge } from "../utlis/calculateAge";
import { Mobileverification } from "../apiurl";

const MobileVer = () => {
  const { customer, selectedCountry } = useSelector(state => state.customer || {});
  const dispatch = useDispatch();
  const [phoneNo, setPhoneNo] = useState("");
  const [customerData, setCustomerData] = useState(0);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showMajor, setShowMajor] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const [isDropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null); // Ref to access dropdown height
  const [warningMargin, setWarningMargin] = useState(0); // State for dynamic margin
  const [majorSubscriber, setMajorSubscriber] = useState(null);

  const toggleDropdown = () => {
    setDropdownOpen(prev => !prev);
  };

  const selectedScheme = location.state?.selectedScheme || "";
  const branch = location.state?.branch || "";

  useEffect(() => {
    if (location.state && location.state.phoneNo) {
      setPhoneNo(location.state.phoneNo);
    }
  }, [location.state]);

  useEffect(() => {
    if (phoneNo) {
      fetchCustomerData(phoneNo);
    }
  }, [phoneNo]);

  // Function to fetch customer data
  const fetchCustomerData = async (phoneNo) => {
    setLoading(true);
    setError("");

    const countryStr = selectedCountry || localStorage.getItem("selectedCountry") || "India";
    const isSingapore = countryStr === "Singapore";
    const countryCode = isSingapore ? "sg" : "in";

    try {
      const response = await fetch(`${Mobileverification}/${phoneNo}?country=${encodeURIComponent(countryStr)}&countryCode=${countryCode}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "country-code": countryCode,
          "country": countryStr,
        },
      });

      if (!response.ok) {
        dispatch(setCustomer([]));
        dispatch(setSelectedCustomerID({}));
        navigate("/Mypage", { state: { phoneNo, selectedOption: "withoutAadhar", aadharVerification: 0, selectedScheme, branch } });
        return;
      }

      const res = await response.json();
      let rawList = [];
      if (Array.isArray(res)) {
        rawList = res;
      } else if (res && Array.isArray(res.customers) && res.customers.length > 0) {
        rawList = res.customers;
      } else if (res && Array.isArray(res.draftEnrollments) && res.draftEnrollments.length > 0) {
        rawList = res.draftEnrollments;
      } else if (res && res.primaryRecord && (res.primaryRecord.Cust_ID || res.primaryRecord.Cust_Name)) {
        rawList = [res.primaryRecord];
      }

      const allResDocs = [
        ...(Array.isArray(res?.combinedDocuments) ? res.combinedDocuments : []),
        ...(Array.isArray(res?.draftCustomerDocuments) ? res.draftCustomerDocuments : []),
        ...(Array.isArray(res?.customerDocuments) ? res.customerDocuments : []),
        ...(Array.isArray(res?.nomineeDocuments) ? res.nomineeDocuments : []),
      ];

      const data = rawList.map(e => {
        const custName = e.Cust_Name || e.CustomerName || e.Name || e.subscriberName || "";
        const imgUrl = e.ImageURL || e.ImageUrl || e.Image || res?.primaryRecord?.ImageURL || "";
        const itemDocs = [
          ...(Array.isArray(e.Documents) ? e.Documents : []),
          ...allResDocs
        ];
        return {
          ...e,
          ID: e.ID || e.Cust_ID || e.CustomerID || Math.random(),
          Name: custName,
          CustomerName: custName,
          ImageURL: imgUrl,
          ImageUrl: imgUrl,
          DateOfBirth: e.DateOfBirth || e.DateOf_Birth,
          Isaadharverified: e.Isaadharverified != null ? e.Isaadharverified : (e.AadharNo || e.Aadar_Number ? 1 : 0),
          major: calculateAge(e.DateOfBirth || e.DateOf_Birth) >= 18 ? "Y" : "N",
          Documents: itemDocs,
          combinedDocuments: allResDocs,
          draftCustomerDocuments: res?.draftCustomerDocuments || [],
          customerDocuments: res?.customerDocuments || [],
        };
      });
      // console.log("res in mobilever",res)
      // console.log("data in mobilever",data)
      // Deduplicate subscriber entries by Name and DateOfBirth
      const uniqueSubscribers = [];
      const seenNames = new Set();
      data.forEach(item => {
        const nameKey = (item.Name || '').trim().toLowerCase();
        const key = nameKey ? `${nameKey}_${item.DateOfBirth || ''}` : item.ID;
        if (!seenNames.has(key)) {
          seenNames.add(key);
          uniqueSubscribers.push(item);
        }
      });

      setCustomerData(uniqueSubscribers);
      const verifiedCustomers = Array.isArray(uniqueSubscribers)
        ? uniqueSubscribers.filter(item => item.Isaadharverified === 1 || item.Cust_ID || item.CustomerID || item.Name)
        : [];
      const majorCustomer = verifiedCustomers.find(item => calculateAge(item.DateOfBirth) >= 18);
      // console.log("Verified Customers: ", verifiedCustomers);
      // console.log("Major Customer: ", majorCustomer);
      if (majorCustomer) {
        setMajorSubscriber(majorCustomer); // Set major subscriber if found
      }
    
      if (verifiedCustomers.length > 0) {
        setSelectedCustomer(verifiedCustomers);
        dispatch(setCustomer(verifiedCustomers));
        dispatch(setIsOtherCustomer(false));

        const verified1 = Array.isArray(data) 
          ? data.filter(item => (item.Isaadharverified === 0 && item.CustomerType === 'V' && calculateAge(item.DateOfBirth) <= 18)) 
          : [];
          
        const combinedVerifiedCustomers = [...verifiedCustomers, ...verified1];

        if (combinedVerifiedCustomers.length) {
          setSelectedCustomer(combinedVerifiedCustomers);
          dispatch(setCustomer(combinedVerifiedCustomers));
        }
      } else {
        const specialCustomers = Array.isArray(data) ? data.filter(item => item.CustomerType === "V") : [];
        const majorCustomer = specialCustomers.find(item => calculateAge(item.DateOfBirth) >= 18);

        if (majorCustomer) {
          setMajorSubscriber(majorCustomer); // Set major subscriber if found
        }

        if (specialCustomers.length > 0) {
          setSelectedCustomer(specialCustomers);
          dispatch(setCustomer(specialCustomers));
          dispatch(setIsOtherCustomer(false));
        } else {
          const otherCustomers = data.filter(item => item.Isaadharverified !== 1 && item.CustomerType !== "V");
          if (otherCustomers.length > 0) {
            dispatch(setIsOtherCustomer(true));
            setSelectedCustomer(otherCustomers);
            dispatch(setCustomer(otherCustomers));
          } else {
            navigate(`/Mypage`, { state: { phoneNo, customerData, aadharverified: 0, selectedScheme, branch } });
          }
        }
      }
    } catch (error) {
      console.error("Error fetching customer data:", error);
      dispatch(setCustomer([]));
      dispatch(setSelectedCustomerID({}));
      navigate("/Mypage", { state: { phoneNo, selectedOption: "withoutAadhar", aadharVerification: 0, selectedScheme, branch } });
    } finally {
      setLoading(false);
    }
  };
// console.log("customerData",customerData)
  const handleCustomerSelect = (selectedId) => {
    if (selectedId === "minor") {
      dispatch(setSelectedCustomerID({}));
      navigate(`/Mypage`, { state: { phoneNo, selectedId: 'minor', aadharverified: 0, selectedScheme, branch } });
    } else if (selectedId === "new") {
      dispatch(setIsOtherCustomer(false));
      navigate(`/Mypage`, { state: { phoneNo, selectedId: 'new', aadharverified: 0, selectedScheme, branch } });
    } else {
      const selected = selectedCustomer?.find(item => item.ID == selectedId);
      if (selected) {
        dispatch(setSelectedCustomerID(selected));
        navigate(`/Mypage`, { state: { customerData: [selected], phoneNo, aadharverified: selected.Isaadharverified || 0, aadharNo: selected.AadharNo || "", selectedScheme, branch } });
      }
    }
  };

  const isOtherCustomers = selectedCustomer && selectedCustomer.every(customer => customer.Isaadharverified !== 1 && customer.CustomerType !== "V");

  useEffect(() => {
    if (customer.length) {
      const arrFilter = customer.filter(user => calculateAge(user.DateOfBirth) >= 18);
      if (arrFilter.length) {
        setShowMajor(false);
      }
    }
  }, [customer]);

  const dropdownContainerStyle = {
    position: 'relative',
    marginbottom:'20px'
    
  };

  const customDropdownStyle = {
    cursor: 'pointer',
    border: '1px solid #ccc',
    padding: '8px',
    borderRadius: '4px',
    backgroundColor: 'white',
    transition: 'all 0.3s ease',
    //minWidth:'400px'
  };

  const dropdownOptionsStyle = {
    position: 'absolute',
    top: '100%',
    left: '0',
    right: '0',
    maxHeight: '300px', // Set max-height for scrolling
    overflowY: 'auto', // Enable vertical scrolling
    backgroundColor: 'white',
    border: '1px solid #ccc',
    borderRadius: '4px',
    zIndex: 10,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
 
  };

  const dropdownOptionStyle = {
    padding: '8px',
    cursor: 'pointer',
  
  };
  useEffect(() => {
    if (isDropdownOpen && dropdownRef.current) {
      // Calculate dropdown height and set warning margin
      const dropdownHeight = dropdownRef.current.clientHeight;
      setWarningMargin(dropdownHeight + 10); // Add some extra margin for spacing
    } else {
      setWarningMargin(5);
    }
  }, [isDropdownOpen]);

  return (
    <div className="mobiledropdowncontainer mobilever-page">
      <div className="mobilever-mascot" aria-hidden="true">
        <img
          src={`${process.env.PUBLIC_URL}/images/bhima_boy6.webp`}
          alt=""
        />
      </div>
      {loading && <p>Loading...</p>}
      {error && <p className="error">{error}</p>}
      {customer && customer.length > 0 && (
        <div className="custom-select-wrapper" checkpoint1 >
          <label htmlFor="customerSelect">SUBSCRIBERS:</label>
          <div style={dropdownContainerStyle} className="checkpoint1.5 subscriber-select-div">
           <div
              style={customDropdownStyle}
              onClick={toggleDropdown}
              className="checkpoint2"
            >
             <span id="customerSelect" style={{ display: 'block', textAlign: 'center' }}> -- Select a Subscriber --</span>
              {isDropdownOpen && (
                <ul style={dropdownOptionsStyle} ref={dropdownRef}>
                  {/* Create a shallow copy of the customer array before sorting */}
                  {[...customer]
                    .sort((a, b) => {
                      const ageA = calculateAge(a.DateOfBirth);
                      const ageB = calculateAge(b.DateOfBirth);
                      if (ageA >= 18 && ageB < 18) return -1;
                      if (ageA < 18 && ageB >= 18) return 1;
                      return new Date(b.UpdatedDate) - new Date(a.UpdatedDate);
                    })
                    .map(user => (
                      <li 
                        key={user.ID} 
                        style={dropdownOptionStyle} 
                        onClick={() => {
                          handleCustomerSelect(user.ID); // Pass the ID directly
                          toggleDropdown();
                        }}
                      >
                        <strong>{user.Name || user.Cust_Name || user.CustomerName || "Subscriber"}</strong>{user.Address1 ? ` – ${user.Address1}` : ""} – <span>({calculateAge(user.DateOfBirth) >= 18 ? "Major" : "Minor"})</span>

                      </li>
                    ))}
                  {isOtherCustomers ? (
                    <li 
                      style={dropdownOptionStyle} 
                      onClick={() => { handleCustomerSelect('new'); toggleDropdown(); }}
                    >
                      Enroll a new subscriber
                    </li>
                  ) : (
                    <li 
                      style={dropdownOptionStyle} 
                      onClick={() => { handleCustomerSelect(showMajor ? 'new' : 'minor'); toggleDropdown(); }}
                    >
                      {showMajor ? 'Enroll a new subscriber' : 'Enroll a minor'}
                    </li>
                  )}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
      {majorSubscriber && (
        <p className="warning " style={{ marginTop: warningMargin }}>
          There is a subscriber <strong style={{ color: 'brown'}}>{majorSubscriber.Name}</strong> linked to this mobile number ({phoneNo}). You cannot make any other major's subscription with this number.
        </p>
      )}
    </div>
  );
};

export default MobileVer;