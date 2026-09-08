import React, { useState, useEffect } from "react";
import Form from "react-bootstrap/Form";
import 'bootstrap/dist/css/bootstrap.min.css';
import { useSelector } from "react-redux";
const Paymentdetails = ({ setBankData, errorValidate, clearError }) => {
 const { selectedCustomerID } = useSelector((state) => state.customer);

  const bank = selectedCustomerID?.BankDetails?.[0] || {}; // get first bank or empty

  const [formData, setFormData] = useState({
    ifscCode: bank.IFSC && bank.IFSC !== "undefined" ? bank.IFSC : "",
    accountNo: bank.BankAccNo && bank.BankAccNo !== "undefined" ? bank.BankAccNo : ""
  });

  const handleIFSCChange = (e) => {
    const value = e.target.value;
    const formattedValue = value.toUpperCase().trim();
  
    // Validate if the input matches the IFSC pattern
    if (/^[A-Z]{0,4}[0-9]{0,7}$/.test(formattedValue)) {
      setFormData({
        ...formData,
        ifscCode: formattedValue,
      });
      clearError('ifscCode'); // Clear error if valid pattern
    }
  };
  

  const handleAccountNoChange = (e) => {
    const value = e.target.value;
    // Allow only numeric values and enforce a length between 9 and 18 digits
    if (/^\d{0,18}$/.test(value)) {
      setFormData({ ...formData, accountNo: value });
      if (value.length >= 9) {
        clearError('accountNo'); // Clear error if length is valid
      }
    }
  };

 

  // Call validateForm on change to dynamically handle errors or update data
  useEffect(() => {
    // console.log("Form Data before setting bank details  data:", formData);
    setBankData(formData);

  }, [formData, setBankData]);
 
  return (
    <div className="container">

      <Form className="form">
        <Form.Group controlId="formAccountNo" className="form-group">
          <Form.Label className="form-label">Account No:</Form.Label>
          <Form.Control
            type="text"
            name="accountNo"
            value={formData.accountNo}
            onChange={handleAccountNoChange}
            className="form-control custom-placeholder"
            placeholder="Enter your bank account number"
            inputMode="numeric"
            pattern="[0-9]*" // Ensures numeric keyboard on mobile
            maxLength={18} // Prevent more than 18 digits
          />

          {errorValidate.accountNo && <Form.Text className="text-danger">{errorValidate.accountNo}</Form.Text>}

          {/* {errors.accountNo && <div className="invalid-feedback d-block">{errors.accountNo}</div>} */}
        </Form.Group>

        <Form.Group controlId="formIFSCCode" className="form-group">
          <Form.Label className="form-label">IFSC :</Form.Label>
          <Form.Control
            type="text"
            name="ifscCode"
            value={formData.ifscCode}
            onChange={handleIFSCChange}
             placeholder="Enter the IFSC"
              className="form-control custom-placeholder"
       // IFSC code length is limited to 11 characters
          />
  {errorValidate.ifscCode && <Form.Text className="text-danger">{errorValidate.ifscCode}</Form.Text>}
     </Form.Group>
   </Form>
    </div>
  );
};

export default Paymentdetails;
