import React, { useState, useEffect } from "react";
import { Form, Col, Row } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import { COLLECTION_API } from "../../apiurl";
import { useSelector } from "react-redux";

const Nomineedeatils = ({
  setNomineeData,
  errorValidate,
  clearError,
  subscriberAddress,
  subscriberGender,
  phoneNo,
  isdraftid_gen,
}) => {
  const { selectedCustomerID, selectedCountry } = useSelector((state) => state.customer || {});
  const urlParams = new URLSearchParams(window.location.search);
  const rawBranch = (urlParams.get("branch") || urlParams.get("BRANCH") || "").toUpperCase().trim();
  const isSgBranch = rawBranch === "LN" || rawBranch === "LI";
  const isIndianBranch = rawBranch && !isSgBranch;
  const isSingapore = isSgBranch || (selectedCountry === "Singapore" && !isIndianBranch);
  const phoneMaxLen = isSingapore ? 8 : 10;
  const phoneCountryCode = isSingapore ? "+65" : "+91";
  const phoneFlag = isSingapore ? "🇸🇬" : "🇮🇳";

  const normalizePhone = (val) => {
    const digits = String(val || "").replace(/\D/g, "");
    return digits.slice(0, phoneMaxLen);
  };

  // Helper function to safely handle undefined/null/empty values
  const safeValue = (val) => (val && val !== "undefined" ? val : "");

  // Local state for form data
  const [formData, setFormData] = useState({
    nomineename: "",
    relationship: "",
    relationshipName: "",
    nomineeaddress: "",
    nomineephoneno: "",
  });
  const [relationships, setRelationships] = useState([]);
  const [sameAsSubscriber, setSameAsSubscriber] = useState(false);

  // Filter relationship options based on subscriber gender
  const currentGender = (subscriberGender || subscriberAddress?.gender || "").toString().trim().toLowerCase();
  const filteredRelationships = relationships.filter((rel) => {
    const relName = rel.Name ? rel.Name.trim().toLowerCase() : "";
    if (currentGender === "male" && relName === "husband") {
      return false;
    }
    if (currentGender === "female" && relName === "wife") {
      return false;
    }
    return true;
  });

  // If currently selected relationship is filtered out due to gender change, reset it
  useEffect(() => {
    if (formData.relationship && filteredRelationships.length > 0) {
      const isValid = filteredRelationships.some(
        (r) => String(r.ID) === String(formData.relationship)
      );
      if (!isValid) {
        setFormData((prevFormData) => ({
          ...prevFormData,
          relationship: "",
        }));
      }
    }
  }, [filteredRelationships, formData.relationship]);

  useEffect(() => {
    const customer = selectedCustomerID || {};
    const nomineeObj = (Array.isArray(customer.Nominee) && customer.Nominee[0]) ? customer.Nominee[0] : {};

    const nomName = customer.NomineeName || customer.NomineName || nomineeObj.Name || "";
    const nomRel = customer.NomineeRelationID || customer.NomineRelationship || nomineeObj.RelationType || nomineeObj.RelationID || "";
    const nomPhone = customer.NomineePhone || customer.NominePhone || nomineeObj.Phone || customer.MobileNo || customer.Mobile_No || phoneNo || "";
    const nomAddress = customer.NomineeAddress || customer.NomineAddress || nomineeObj.Address || "";

    if (nomName || nomRel || nomAddress) {
      const matchedRelationship = relationships.find(
        (r) =>
          String(r.ID) === String(nomRel) ||
          (r.Name && r.Name.toLowerCase() === String(nomRel).toLowerCase())
      );

      setFormData({
        nomineename: safeValue(nomName),
        relationship: matchedRelationship ? String(matchedRelationship.ID) : String(nomRel || ""),
        relationshipName: matchedRelationship ? matchedRelationship.Name : String(nomRel || ""),
        nomineeaddress: safeValue(nomAddress),
        nomineephoneno: normalizePhone(nomPhone),
      });
    } else {
      // If no nominee data, reset to defaults
      setFormData({
        nomineename: "",
        relationship: "",
        relationshipName: "",
        nomineeaddress: "",
        nomineephoneno: normalizePhone(phoneNo),
      });
    }
  }, [selectedCustomerID, phoneNo, relationships, phoneMaxLen]);

  //Dropdown for Nominee Relationship API
  useEffect(() => {
    const fetchRelationships = async () => {
      try {
        const response = await fetch(`${COLLECTION_API}/nomineedetails`);
        const data = await response.json();
        setRelationships(data); // Assuming data is an array of relationship objects
      } catch (error) {
        console.error("Error fetching relationship data:", error);
      }
    };
    fetchRelationships();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "nomineename") {
      const upperCaseValue = value.toUpperCase(); // Convert to uppercase
      if (/^[a-zA-Z\s]*$/.test(upperCaseValue)) {
        // Only allow alphabets and spaces
        setFormData((prevFormData) => ({
          ...prevFormData,
          nomineename: upperCaseValue,
        }));
        clearError("nomineename");
      }
    } else {
      let relationshipName = "";
      if (name === "relationship") {
        const selectedRel = relationships.find(r => String(r.ID) === String(value));
        if (selectedRel) {
          relationshipName = selectedRel.Name;
        }
      }
      setFormData((prevFormData) => ({
        ...prevFormData,
        [name]: value,
        ...(name === "relationship" ? { relationshipName } : {}),
      }));
      clearError(name);
    }
  };
  const handleNomineeAddressChange = (e) => {
    const { value } = e.target;

    // Update formData for nomineeaddress
    setFormData((prevFormData) => ({
      ...prevFormData,
      nomineeaddress: value,
    }));

    // Clear error if there is a value entered
    if (value.trim()) {
      clearError("nomineeaddress");
    }
  };

  const handleNomineePhoneNoChange = (e) => {
    const value = normalizePhone(e.target.value);
    setFormData({
      ...formData,
      nomineephoneno: value,
    });
    clearError("nomineephoneno");
  };

  const handleCheckboxChange = (e) => {
    const isChecked = e.target.checked;
    setSameAsSubscriber(isChecked);

    if (isChecked) {
      // Construct the full subscriber address
      const fullAddress = [
        subscriberAddress?.address1,
        subscriberAddress?.address2,
        subscriberAddress?.address3,
        subscriberAddress?.area,
        subscriberAddress?.city,
        subscriberAddress?.pinCode,
      ]
        .filter(Boolean) // removes undefined, null, empty string
        .join(", "); // join with comma

      setFormData((prevFormData) => ({
        ...prevFormData,
        nomineeaddress: fullAddress,
      }));
      clearError("nomineeaddress");
    } else {
      setFormData((prevFormData) => ({
        ...prevFormData,
        nomineeaddress: "",
      }));
    }
  };

  useEffect(() => {
    setNomineeData(formData);
  }, [formData, setNomineeData]);

  return (
    <div className="container">
      <Form className="form">
        <Row>
          <Col xs={12} md={6} className="me-md-6">
            <Form.Group controlId="formNomineeName" className="form-group">
              <Form.Label className="form-label">Name*:</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter nominee name"
                className="form-control custom-placeholder"
                name="nomineename"
                value={formData.nomineename}
                onChange={handleChange}
                disabled={isdraftid_gen}
                required
              />
              {errorValidate.nomineename && (
                <Form.Text className="text-danger">
                  {errorValidate.nomineename}
                </Form.Text>
              )}
            </Form.Group>
          </Col>

          <Col xs={12} md={6} className="me-6">
            <Form.Group controlId="formRelationship" className="form-group">
              <Form.Label className="form-label">Relationship*:</Form.Label>
              <Form.Select
                name="relationship"
                value={formData.relationship}
                onChange={handleChange}
                className="form-control custom-placeholder"
                disabled={isdraftid_gen}
                required
              >
                <option value="" disabled hidden>
                  Select the Relationship
                </option>
                {filteredRelationships.map((relationship) => (
                  <option key={relationship.ID} value={String(relationship.ID)}>
                    {relationship.Name}
                  </option>
                ))}
              </Form.Select>
              {errorValidate.relationship && (
                <Form.Text className="text-danger">
                  {errorValidate.relationship}
                </Form.Text>
              )}
            </Form.Group>
          </Col>
        </Row>
        {/* <Form.Group controlId="formNomineAddress" className="form-group">
            <Form.Label className="form-label">Address*:</Form.Label>
            <Form.Control
              as="textarea" // Set as textarea
              name="nomineeaddress"
              rows={3}
                 className="custom-placeholder custom-padding"
              cols={50}
              style={{ minHeight: "70px" }}
              placeholder="Enter Nominee address"
              value={formData.nomineeaddress}
              onChange={handleNomineeAddressChange}
              minLength={5}
              maxLength={150} 
            />
            {errorValidate.nomineeaddress && <Form.Text className="text-danger">{errorValidate.nomineeaddress}</Form.Text>}
          </Form.Group>
     */}
        <Form.Group className="form-group" controlId="formNomineeAddress">
          <Form.Label className="form-label">Address*:</Form.Label>
          <Form.Check
            type="checkbox"
            label="Same as Subscriber Address"
            checked={sameAsSubscriber}
            onChange={handleCheckboxChange}
            className="checkbox-label"
            disabled={isdraftid_gen}
          />
          <Form.Control
            as="textarea"
            rows={3}
            placeholder="Enter Nominee address"
            value={formData.nomineeaddress}
            onChange={handleNomineeAddressChange}
            disabled={sameAsSubscriber || isdraftid_gen} // Disable input if checkbox is checked
            className="form-control custom-placeholder"
            style={{ minHeight: "60px", marginTop: "3px" }}
            required
          />
          {errorValidate.nomineeaddress && (
            <Form.Text className="text-danger">
              {errorValidate.nomineeaddress}
            </Form.Text>
          )}
        </Form.Group>

        <Col xs={12} md={6} className="me-6">
          <Form.Group controlId="formNomineePhoneNo" className="form-group">
            <Form.Label className="form-label">Phone No.*:</Form.Label>
            <div style={{ display: "flex", alignItems: "stretch", width: "100%" }}>
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
                  whiteSpace: "nowrap",
                }}
              >
                <span>{phoneFlag}</span>
                <span>{phoneCountryCode}</span>
              </span>
              <Form.Control
                type="text"
                placeholder={isSingapore ? "Enter 8-digit mobile number" : "Enter 10-digit mobile number"}
                value={formData.nomineephoneno}
                maxLength={phoneMaxLen}
                onChange={handleNomineePhoneNoChange}
                inputMode="numeric"
                pattern="[0-9]*"
                className="form-control custom-placeholder"
                disabled={isdraftid_gen}
                style={{ borderRadius: "0 4px 4px 0" }}
              />
            </div>
            {errorValidate.nomineephoneno && (
              <Form.Text className="text-danger">
                {errorValidate.nomineephoneno}
              </Form.Text>
            )}
          </Form.Group>
        </Col>
      </Form>
    </div>
  );
};

export default Nomineedeatils;
