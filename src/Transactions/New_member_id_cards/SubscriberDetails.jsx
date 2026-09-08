import React, { useState, useEffect, useRef } from "react";
import { Form, Col, Row } from "react-bootstrap";
import PickDate from "../PickDate/PickDate";
// import GuardaianDetails from "./GuardaianDetails";
import { calculateAge } from "../PickDate/DateUtils";
import { useDispatch, useSelector } from "react-redux";
import { setIsMinorDisable } from "../../redux/customer/customerSlice";
import { PincodeAPI } from "../../apiurl";
import { searchSingaporePostal } from "../../utlis/oneMapUtils";

const Subscriberdetails = ({
  setSubscriberData,
  phoneNo,
  showGuardianDetails,
  setShowGuardianDetails,
  selectedOption,
  selectedId,
  newSubscriber,
  errorValidate,
  clearError,
  flag,
  setFlag,
}) => {
  const { customer, selectedCustomerID, isOtherCustomer, selectedCountry } = useSelector(
    (state) => state.customer || {}
  );
  const isSingapore = selectedCountry === "Singapore";
  const dispatch = useDispatch();
  const [error, setErrors] = useState({});
  const [isminorDisabled, setIsMinorDisabled] = useState(false);
  const address1Ref = useRef(null);
  const [formKey, SetformKey] = useState("");

  const [areaName, setAreas] = useState([]);
  const [formData, setFormData] = useState({
    mobileNo: phoneNo || "",
    subscriberName: "",
    gender: "",
    address1: "",
    address2: "",
    address3: "",
    permanentAddress: "",
    pinCode: "",
    area: "",
    city: "",
    state: "",
    email: "",
    dob: "",
  });
  const [age, setAge] = useState(false);
  const [area, setArea] = useState("");
  const [addressInput, setAddressInput] = useState("");

  useEffect(() => {
    if (newSubscriber) {
      // Auto-fill the form and disable fields for newSubscriber

      const genderMap = {
        M: "Male",
        F: "Female",
        O: "Others",
      };

      // Merge Address1, Address2, and Address3 into a single address
      const mergedAddress = [
        newSubscriber.Address1,
        newSubscriber.Address2,
        // newSubscriber.Address3
      ].filter(addr => addr && addr.trim()).join(", ");

    ///////////////////Mohith Dev////////////////////////
      const combinedAddress = [
        newSubscriber?.Address1,
        newSubscriber?.Address2,
        newSubscriber?.Address3,
        newSubscriber?.State,
        newSubscriber?.PinCode
      ]
        .filter(Boolean)         // removes null/undefined/empty strings
        .join(", ");             // join with commas (or space if you prefer)

      const ekycAddress = (!newSubscriber?.Address1 || !newSubscriber?.Address2) ? combinedAddress : mergedAddress;

      const newEmail = newSubscriber.email_id || newSubscriber.Email_ID || newSubscriber.EmailID || newSubscriber.email || "";
      const newPinCode = newSubscriber.Pin_Code || newSubscriber.PinCode || newSubscriber.pinCode || "";

      setFormData((prevFormData) => {
        const userEnteredAddress = prevFormData.address1 || addressInput || "";
        return {
          ...prevFormData,
          mobileNo: newSubscriber.MobileNo || phoneNo || prevFormData.mobileNo || "",
          subscriberName: newSubscriber.Cust_Name || newSubscriber.CustomerName || newSubscriber.Name || prevFormData.subscriberName || "",
          gender: genderMap[newSubscriber.Gender] || genderMap[newSubscriber.Sex] || prevFormData.gender || "",
          address1: userEnteredAddress ? userEnteredAddress : ekycAddress,
          permanentAddress: ekycAddress,
          area: newSubscriber.Locality || newSubscriber.Address3 || prevFormData.area || "",
          pinCode: newPinCode || prevFormData.pinCode || "",
          city: newSubscriber.City || prevFormData.city || "",
          state: newSubscriber.State || prevFormData.state || "",
          email: newEmail || prevFormData.email || "",
          dob: newSubscriber.DateOf_Birth || newSubscriber.DateOfBirth || prevFormData.dob || "",
        };
      });
      // setIsAadharDisabled(true);
      setArea((prevArea) => prevArea || newSubscriber.Locality || newSubscriber.Address3 || "");

      setAddressInput((prevInput) => (prevInput && prevInput.trim() ? prevInput : ekycAddress));
    } else {
      // Handle customerData
      const customer = selectedCustomerID;
      if (customer) {
        const genderMap = {
          M: "Male",
          F: "Female",
          O: "Others",
        };
        
        setArea(customer.Locality || customer.Address3 || "");

        // Merge Address1, Address2, and Address3 into a single address
        const mergedAddress = [
          customer.Address1,
          customer.Address2,
          // customer.Address3
        ].filter(addr => addr && addr.trim()).join(", ");

        const isAadhaarVerified = customer.Isaadharverified === 1;
        const custEmail = customer.email_id || customer.Email_ID || customer.EmailID || customer.email || "";
        const custPinCode = customer.Pin_Code || customer.PinCode || customer.pinCode || "";

        setFormData((prevFormData) => {
          const userEnteredAddress = prevFormData.address1 || addressInput || "";
          return {
            ...prevFormData,
            mobileNo: customer.MobileNo || customer.Mobile_No || phoneNo || prevFormData.mobileNo || "",
            subscriberName:
              customer.Cust_Name || customer.CustomerName || customer.Name || customer.Aadharname || prevFormData.subscriberName || "",
            gender: genderMap[customer.Gender] || genderMap[customer.Sex] || prevFormData.gender || "",
            address1: userEnteredAddress ? userEnteredAddress : (mergedAddress || ""),
            permanentAddress: isAadhaarVerified ? (mergedAddress || "") : (prevFormData.permanentAddress || ""),
            area: customer.Locality || customer.Address3 || prevFormData.area || "",
            city: customer.City || prevFormData.city || "",
            state: customer.State || prevFormData.state || "",
            pinCode: custPinCode || prevFormData.pinCode || "",
            email: custEmail || prevFormData.email || "",
            dob: customer.DateOf_Birth || customer.DateOfBirth || prevFormData.dob || "",
          };
        });
        setAddressInput((prevInput) =>
          prevInput && prevInput.trim()
            ? prevInput
            : [customer.Address1, customer.Address2].filter((addr) => addr && addr.trim()).join(", ")
        );
      } else {
        // Handle case where customerData is empty or not provided
        setFormData((prevState) => ({
          ...prevState,
          mobileNo: phoneNo || prevState.mobileNo,
        }));
        setArea("");
        setAddressInput("");
      }
    }
    SetformKey(Math.random());
  }, [customer, phoneNo, age, setShowGuardianDetails, newSubscriber]);

  // just for check delete later
  useEffect(() => {
    // console.log("isminorDisabled**", selectedId, isminorDisabled, formData);
  }, [selectedId, isminorDisabled, formData]);

  useEffect(() => {
    if (
      selectedId === "minor" ||
      selectedId === "new" ||
      selectedOption === "withoutAadhar"
    )
      setFormData({
        ...formData,
        // mobileNo: phoneNo ||"",
        subscriberName: "",
        gender: "",
        address1: "",
        area: "",
        pinCode: "",
        city: "",
        state: "",
        email: "",
        dob: "",
      });
  }, [selectedId, selectedOption]);

  useEffect(() => {
    // enroll new minor
    if (selectedId === "minor" && !newSubscriber && formData.dob) {
      const age = calculateAge(formData.dob);

      if (age >= 18) {
        setErrors({ dob: "Age must be below 18 for minor enrollment." });
        setIsMinorDisabled(true);
        dispatch(setIsMinorDisable(true));
        setShowGuardianDetails(false);
      } else {
        setErrors({});
        setIsMinorDisabled(false);
        dispatch(setIsMinorDisable(false));
        setShowGuardianDetails(true);
      }
    } else {
      // Reset states when selectedId is not "minor"
      setErrors({});
      // Show guardian details only if age is less than 18
      if (formData.dob) {
        const age = calculateAge(formData.dob);
        setShowGuardianDetails(age < 18);
      } else {
        setShowGuardianDetails(false);
      }
    }
  }, [formData.dob, selectedId, newSubscriber]);

  useEffect(() => {
    setSubscriberData(formData);
  }, [formData]);

  const handleDateChange = (newDate) => {
    setFormData((prevFormData) => ({ ...prevFormData, dob: newDate }));
    setFlag({
      ...flag,
      dob: true,
    });
    clearError("dob");
  };

  // const pinCodeRef = useRef(null);
  // const handleFocusOnPinCode = () => {
  //   pinCodeRef.current.focus();
  // };
  useEffect(() => {
    if (formData.pinCode) {
      fetchPinCodeDetails(formData.pinCode);
    }
  }, [formData.pinCode]);

  const [sgResultsState, setSgResultsState] = useState([]);

  const fetchPinCodeDetails = async (pinCode) => {
    if (isSingapore) {
      if (pinCode && pinCode.length === 6) {
        const res = await searchSingaporePostal(pinCode);
        const sgResults = res?.allResults || (res?.primary ? [res.primary] : []);
        if (sgResults.length > 0) {
          setSgResultsState(sgResults);
          const areaOptions = sgResults.map((r) => r.displayLabel);
          setAreas(areaOptions);

          const selectedObj = sgResults[0];
          const defaultStreetAddr = selectedObj.streetAddress || selectedObj.fullAddress || "";
          setFormData((prevFormData) => ({
            ...prevFormData,
            address1: defaultStreetAddr,
            address2: selectedObj.building || "",
            city: "Singapore",
            state: "Singapore",
            area: selectedObj.displayLabel,
          }));
          setAddressInput(defaultStreetAddr);
          clearError("pinCode");
          clearError("city");
          clearError("state");
          clearError("area");
          clearError("address1");
        } else {
          setFormData((prevFormData) => ({
            ...prevFormData,
            city: "Singapore",
            state: "Singapore",
          }));
          setAreas(["Singapore"]);
          setSgResultsState([]);
        }
      }
      return;
    }

    try {
      const response = await fetch(`${PincodeAPI}/${pinCode}`);
      const data = await response.json();
      if (data[0].Status === "Success") {
        const postOfficeData = data[0].PostOffice;
        const areaName = postOfficeData.map((office) => office.Name);
        const state = postOfficeData[0].State;
        const city = postOfficeData[0].District;
        setFormData((prevFormData) => ({
          ...prevFormData,
          area: prevFormData.area, // Preserve existing area if multiple
          state: state,
          city,
        }));
        setAreas(areaName); // Populate cities in case of multiple cities
      } else {
        setErrors((prevErrors) => ({
          ...prevErrors,
          pinCode: "Invalid pin code",
        }));
        setAreas([]); // Clear cities if invalid pin code
        clearError("state");
        clearError("city");
        clearError("area");
      }
    } catch (error) {
      console.error("Error fetching pin code details:", error);
    }
  };

  const handlePinCodeChange = (e) => {
    const { value } = e.target;
    if (/^\d{0,6}$/.test(value)) {
      setFormData((prevFormData) => ({
        ...prevFormData,
        pinCode: value,
        ...(isSingapore ? { city: "Singapore", state: "Singapore" } : {}),
      }));

      setFlag({
        ...flag,
        pinCode: true,
      });

      if (value.length === 6) {
        fetchPinCodeDetails(value);
      } else {
        clearError("pinCode");
        if (!isSingapore) {
          clearError("city");
          clearError("state");
          clearError("area");

          setFormData((prevFormData) => ({
            ...prevFormData,
            city: "",
            area: "",
            state: "",
          }));
          setAreas([]);
        }
      }
    }
  };
  const handleGenderChange = (value) => {
    setFormData((prevFormData) => ({ ...prevFormData, gender: value }));
    setFlag({
      ...flag,
      gender: true,
    });
    clearError("gender");
  };
  const handleFocus = () => {
    if (!formData.address1) {
      address1Ref.current.focus(); // Focus back to address1 if empty
    }
  };
  const handleAddressChange = (e) => {
    setAddressInput(e.target.value);
    setFlag({
      ...flag,
      address1: true,
    });
    clearError("address1");
  };

  const handleAddressBlur = () => {
    const parts = addressInput.split(",").map((part) => part.trim());
    setFormData((prevFormData) => ({
      ...prevFormData,
      address1: parts[0] || "",
      address2: parts[1] || "",
      address3: parts[2] || "",
    }));
  };

  const handleNameChange = (e) => {
    const { value } = e.target;
    const upperCaseValue = value.toUpperCase(); // Convert to uppercase
    if (/^[a-zA-Z\s]*$/.test(upperCaseValue)) {
      // Only allow alphabets and spaces
      setFormData((prevFormData) => ({
        ...prevFormData,
        subscriberName: upperCaseValue,
      }));
      setFlag({
        ...flag,
        subscriberName: true,
      });
      clearError("subscriberName");
    }
  };

  const handleEmailChange = (e) => {
    const { value } = e.target;
    // Allow any value to be entered, validation will be handled separately
    setFormData((prevFormData) => ({
      ...prevFormData,
      email: value,
    }));
    setFlag({
      ...flag,
      email: true,
    });
    clearError("email");
  };
  const [oldAddressData, setOldAddressData] = useState(null); // State to store old address data
  const [isNewAddressMode, setIsNewAddressMode] = useState(false);
  const handleAddressEdit = (e) => {
    // Store the old address data before clearing
    setOldAddressData({
      address1: formData.address1,
      area: formData.area,
      pinCode: formData.pinCode,
      city: formData.city,
      state: formData.state,
    });

    setFormData((prev) => ({
      ...prev,
      address1: "",
      area: "",
      pinCode: "",
      city: "",
      state: "",
    }));
    setArea("");
    address1Ref.current.focus();
    setIsNewAddressMode(true); // Enter new address mode
  };

  const handleRevertAddress = () => {
    if (oldAddressData) {
      setFormData((prev) => ({
        ...prev,
        address1: oldAddressData.address1,
        area: oldAddressData.area,
        pinCode: oldAddressData.pinCode,
        city: oldAddressData.city,
        state: oldAddressData.state,
      }));
      setArea(oldAddressData.area);
      setOldAddressData(null); // Clear the stored old data
      setIsNewAddressMode(false); // Exit new address mode
    }
  };
  // const handleAddressEdit = (e) => {
  //   setFormData((prev) => {
  //     return {
  //       ...prev,
  //       address1: "",
  //       area: "",
  //       pinCode: "",
  //       city: "",
  //       state: "",
  //     };
  //   });
  //   setArea("");
  //   address1Ref.current.focus();
  // };

  const handleAreaChange = (e) => {
    const areaValue = e.target.value;
    if (isSingapore && sgResultsState && sgResultsState.length > 0) {
      const matchedObj = sgResultsState.find((r) => r.displayLabel === areaValue) || sgResultsState[0];
      const streetAddr = matchedObj.streetAddress || matchedObj.fullAddress || matchedObj.displayLabel || "";
      setFormData((prevData) => ({
        ...prevData,
        area: matchedObj.displayLabel,
        address1: streetAddr,
        address2: matchedObj.building || "",
        city: "Singapore",
        state: "Singapore",
      }));
      // Also update addressInput so the Address textarea reflects the selection
      setAddressInput(streetAddr);
    } else {
      setFormData((prevData) => ({
        ...prevData,
        area: areaValue,
      }));
      // If address is empty, populate with selected area
      if (!addressInput || !addressInput.trim()) {
        setAddressInput(areaValue);
      }
    }
    setFlag((prevFlag) => ({
      ...prevFlag,
      area: true,
    }));
    clearError("area");
  };
  const handleKeyDownPress = (event) => {
    if (event.key === "Enter") {
      event.preventDefault(); // Prevent form submission
    }
  };

  return (
    <div className="container">
      <Form onSubmit={(e) => e.preventDefault()} onKeyDown={handleKeyDownPress}>
        <Form.Group controlId="formMobileNo" className="form-group">
          <Form.Label className="form-label">Mobile No:</Form.Label>
          <div style={{ display: "flex", alignItems: "center" }}>
            <span
              style={{
                background: "#e9ecef",
                color: "#495057",
                fontWeight: "700",
                fontSize: "14px",
                padding: "8px 12px",
                border: "1px solid #ced4da",
                borderRight: "none",
                borderRadius: "4px 0 0 4px",
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                height: "38px",
                boxSizing: "border-box",
              }}
            >
              <span>{isSingapore ? "🇸🇬" : "🇮🇳"}</span>
              <span>{isSingapore ? "+65" : "+91"}</span>
            </span>
            <Form.Control
              type="text"
              value={formData.mobileNo}
              onChange={(e) =>
                setFormData({ ...formData, mobileNo: e.target.value })
              }
              className="form-control"
              disabled
              style={{ borderRadius: "0 4px 4px 0" }}
            />
          </div>
        </Form.Group>

        <Form.Group controlId="formSubscriberName" className="form-group">
          <Form.Label className="form-label">Subscriber Name*:</Form.Label>
          <Form.Control
            placeholder="Enter subscriber name"
            value={formData.subscriberName}
            onChange={handleNameChange}
            className="form-control custom-placeholder"
            required
            disabled={
              isminorDisabled ||
              (flag.subscriberName ? false : formData.subscriberName?.length)
            }
          />
          {errorValidate.subscriberName && (
            <Form.Text className="text-danger">
              {errorValidate.subscriberName}
            </Form.Text>
          )}
        </Form.Group>
        <PickDate
          dob={formData.dob}
          onDateChange={handleDateChange}
          disabled={flag.dob ? false : formData.dob?.length}
          errorValidate={errorValidate}
          clearError={clearError}
        />
        {errorValidate.dob && (
          <Form.Text className="text-danger">{errorValidate.dob}</Form.Text>
        )}

        {selectedId === "minor" &&
          formData.dob &&
          calculateAge(formData.dob) >= 18 && (
            <Form.Text className="text-danger">
              Age must be below 18 for minor enrollment.
            </Form.Text>
          )}

        <Form.Group controlId="formGender" className="form-group">
          <Form.Label className="form-label">Gender*:</Form.Label>
          <div className="d-flex flex-wrap" required>
            <Form.Check
              inline
              type="radio"
              label="Male"
              name="gender"
              id="genderMale"
              checked={formData.gender === "Male"}
              onChange={() => handleGenderChange("Male")}
              className="gender-option mx-2 "
              disabled={
                isminorDisabled ||
                (flag.gender ? false : formData.gender?.length)
              }
            />
            <Form.Check
              inline
              type="radio"
              label="Female"
              name="gender"
              id="genderFemale"
              checked={formData.gender === "Female"}
              onChange={() => handleGenderChange("Female")}
              className="gender-option mx-2 "
              disabled={
                isminorDisabled ||
                (flag.gender ? false : formData.gender?.length)
              }
            />
            <Form.Check
              inline
              type="radio"
              label="Others"
              name="gender"
              id="genderOthers"
              checked={formData.gender === "Others"}
              onChange={() => handleGenderChange("Others")}
              className="gender-option mx-2 "
              disabled={
                isminorDisabled ||
                (flag.gender ? false : formData.gender?.length)
              }
            />
          </div>
          {errorValidate.gender && (
            <Form.Text className="text-danger">
              {errorValidate.gender}
            </Form.Text>
          )}
        </Form.Group>

        <Form.Group controlId="formEmail" className="form-group">
          <Form.Label className="form-label">Email-ID:</Form.Label>
          <Form.Control
            type="email"
            placeholder="Enter email ID"
            className="form-control custom-placeholder"
            value={formData.email}
            onChange={handleEmailChange}

          //disabled={isminorDisabled || (flag.email ? false : formData.email?.length) }
          />
          {errorValidate.email && (
            <Form.Text className="text-danger">{errorValidate.email}</Form.Text>
          )}
        </Form.Group>

        <Form.Group className="  form-group" controlId="formAddress">
          <Form.Label className="form-label">Address*:</Form.Label>
          <Form.Control
            as="textarea"
            rows={3}
            value={addressInput}
            onChange={handleAddressChange}
            onBlur={handleAddressBlur}
            minLength={5}
            style={{ minHeight: "70px", marginTop: "3px" }}
            maxLength={150}
            className="form-control custom-placeholder"
            placeholder="Enter the Address"
            ref={address1Ref}
            disabled={
              isminorDisabled ||
              // For Singapore: never lock by address content (area auto-fills it, user may still edit)
              (!isSingapore && (flag.address1 ? false : formData.address1?.trim().length)) ||
              newSubscriber || // Disable if data comes from Aadhar verification
              (selectedCustomerID && selectedCustomerID.Isaadharverified === 1) // Disable if customer is Aadhar verified
            }
          />


          <div
            className={`edit_add ${
              newSubscriber || selectedId === "minor" || selectedId === "new" || selectedOption === "withoutAadhar"
                ? "hidden"
                : ""
              }`}
          >
            {!newSubscriber && !(selectedCustomerID && selectedCustomerID.Isaadharverified === 1) && (
              <>
                {!isNewAddressMode && ( // Show Add New Address only when not in new address mode
                  <button className="styled-button1" onClick={handleAddressEdit}>
                    Add New Address
                  </button>
                )}
                {oldAddressData && isNewAddressMode && ( // Show Revert only when in new address mode and old data exists
                  <button
                    className="styled-button1"
                    onClick={handleRevertAddress}
                  >
                    Revert to Previous Address
                  </button>
                )}
              </>
            )}
          </div>

          {/* <div className={`edit_add ${newSubscriber ? "hidden" : ""}`}>
            {!newSubscriber && (
              <button className="styled-button1" onClick={handleAddressEdit}>
                Add New Address
              </button>
            )}
          </div> */}

          {errorValidate.address1 && (
            <Form.Text className="text-danger">
              {errorValidate.address1}
            </Form.Text>
          )}
        </Form.Group>

        {Boolean(formData.permanentAddress && formData.permanentAddress.trim()) && (
          <Form.Group className="form-group" controlId="formPermanentAddress">
            <Form.Label className="form-label">Permanent Address (Aadhaar):</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={formData.permanentAddress || ""}
              onChange={(e) => {
                const val = e.target.value;
                setFormData((prevFormData) => ({
                  ...prevFormData,
                  permanentAddress: val,
                }));
              }}
              minLength={5}
              style={{ minHeight: "70px", marginTop: "3px" }}
              maxLength={150}
              className="form-control custom-placeholder"
              placeholder="Permanent Address from Aadhaar"
              disabled
            />
          </Form.Group>
        )}
        <Row>
          <Col md={6}>
            <Form.Group controlId="formPinCode" className="form-group">
              <Form.Label className="form-label">{isSingapore ? "PO Code*:" : "Pin Code*:"}</Form.Label>
              <Form.Control
                type="text"
                placeholder={isSingapore ? "Enter 6-digit PO Code (e.g. 569933)" : "Enter pincode"}
                value={formData.pinCode}
                onChange={handlePinCodeChange}
                maxLength={6}
                className="form-control custom-placeholder"
                disabled={
                  isminorDisabled ||
                  (flag.pinCode
                    ? false
                    : formData.pinCode?.length &&
                    formData.state?.length &&
                    formData.area?.length &&
                    formData.city?.length)
                }
                inputMode="numeric"
                pattern="[0-9]*"

              // ref={pinCodeRef}
              />
              {errorValidate.pinCode && (
                <Form.Text className="text-danger">
                  {errorValidate.pinCode}
                </Form.Text>
              )}
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group controlId="formCity" className="form-group">
              <Form.Label className="form-label">Area*: </Form.Label>
              <Form.Select
                key={formData.area || area}
                value={formData.area || area || ""}
                disabled={isSingapore ? false : Boolean(area)}
                onChange={(e) => handleAreaChange(e)}
              >
                {area ? (
                  <option value={area}>{area}</option>
                ) : (
                  <>
                    {" "}
                    <option value={""} hidden>Select the area</option>
                    {areaName?.map((e) => {
                      return (
                        <option value={e} key={e}>
                          {e}
                        </option>
                      );
                    })}
                  </>
                )}
              </Form.Select>
              {errorValidate.area && (
                <Form.Text className="text-danger">
                  {errorValidate.area}
                </Form.Text>
              )}
            </Form.Group>
          </Col>
        </Row>
        <Row>
          <Col md={6}>
            <Form.Group controlId="formState" className="form-group">
              <Form.Label className="form-label">City*:</Form.Label>
              <Form.Control
                type="text"
                value={formData.city} // Automatically filled by API
                className="form-control"
                disabled

              // onFocus={handleFocusOnPinCode}
              />
              {errorValidate.city && (
                <Form.Text className="text-danger">
                  {errorValidate.city}
                </Form.Text>
              )}
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group controlId="formState" className="form-group">
              <Form.Label className="form-label">State*:</Form.Label>
              <Form.Control
                type="text"
                value={formData.state} // Automatically filled by API
                className="form-control"
                disabled
                required
              />
              {errorValidate.state && (
                <Form.Text className="text-danger">
                  {errorValidate.state}
                </Form.Text>
              )}
            </Form.Group>
          </Col>
        </Row>
      </Form>
    </div>
  );
};
export default Subscriberdetails;
