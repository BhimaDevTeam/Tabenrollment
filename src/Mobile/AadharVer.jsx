import React, { useState, useEffect, useRef } from "react";
import { Form, Modal } from "react-bootstrap";
import { useNavigate, useLocation } from 'react-router-dom';
import "./Mobile.css";
import 'bootstrap-icons/font/bootstrap-icons.css';
import { AadharAPI } from "../apiurl";
const AadharVer = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const otpInputRef = useRef(null);

  // State variables
  const [aadharNo, setAadharNo] = useState("");
  const [errors, setErrors] = useState("");
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [receivedOtp, setReceivedOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [aadharGenerateID, setAadharGenerateID] = useState("");
  const [refID, setRefID] = useState("");

  // Extract phoneNo and selectedOption from the location's state
  const { phoneNo = '', aadharVerification} = location.state || {};
  // console.log(" aadharVerification in aaddhar", aadharVerification);

  const handleAadharNoChange = (e) => {
    const { value } = e.target;
    // Allow only numbers and limit input to 12 digits
    if (/^\d{0,12}$/.test(value)) {
      setAadharNo(value);
    }
  
    // Validate and set error based on the new value
    setErrors((_prevErrors) => {
      if (value.length === 12) {
        return /^\d{12}$/.test(value) ? "" : "Aadhaar number must be exactly 12 digits";
      } else {
        return "";
      }
    });
  };
  
  useEffect(() => {
    if (showModal) {
      setOtpError(""); // Reset OTP error when the modal opens
      if (otpInputRef.current) {
        otpInputRef.current.focus(); // Focus on OTP input when modal opens
      }
    }
  }, [showModal]);

  // Handle form submission to send OTP
  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    if (!aadharNo) {
      setErrors("Aadhar number cannot be empty.");
      return;
    } else if (!/^\d{12}$/.test(aadharNo)) {
      setErrors("Aadhar number must be exactly 12 digits.");
      return;
    }

    setLoading(true);
    setErrors(""); // Clear previous errors
     
    try {
      const responseRevOTP = await fetch(
        `${AadharAPI}/draftAadharGenerateOTP`,
        {
          method: "POST",
          body: JSON.stringify({
            AadharNo: aadharNo,
            MobileNo: phoneNo,
            MinorRelationship: ""
          }),
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!responseRevOTP.ok) {
        const errorText = await responseRevOTP.text();
        const errorData = JSON.parse(errorText);
        throw new Error(
          `${errorData.message}`
        );
      }

      const result = await responseRevOTP.json();
      //  console.log(" aadhar number submission response",result);
      if (result.success) {
        setAadharGenerateID(result.AadharGenerateID);
        setRefID(result.ref_id);
        setShowModal(true); // Show the OTP modal
        
        //  console.log(" after receiving otp setting aadhar generated id",result.AadharGenerateID);
        // console.log(" after receiving otp setting aadhar ref_id id",result.ref_id);
        //  console.log(result.ref_id);
      } else {
        setErrors(result.err || "An error occurred while processing your request.");
       
      }

      
    } catch (error) {
      setErrors("Failed to connect to the server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handle received OTP change
  const handleReceivedOtpChange = (e) => {
    const { value } = e.target;

    // Allow only numbers and limit input to 6 digits
    if (/^\d{0,6}$/.test(value)) {
      setReceivedOtp(value);
    }
    
    // Validate if OTP is exactly 6 digits or if it's empty
    setOtpError(_prevOtpError => {
      if (value === "") {
        return "OTP cannot be empty";
      } else if (value.length === 6 && !/^\d{6}$/.test(value)) {
        return "OTP must be exactly 6 digits";
      } else {
        return "";
      }
    });
  };

  // Handle OTP submission
  const handleOtpSubmit = async (e) => {

    if (receivedOtp.length !== 6 || !/^\d{6}$/.test(receivedOtp)) {
      setOtpError("Please enter a valid 6-digit OTP");
      return;
    }

    if (!aadharGenerateID || !refID) {
      setOtpError("OTP generation details are missing.");
      return;
    }

    setOtpError(""); // Clear previous OTP errors
    setLoading(true);
   
    try {
      const responseSubOTP = await fetch(
        `${AadharAPI}/draftAadharSubmitOTP`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            AadharGenerateID: aadharGenerateID.toString(),
            ref_id: refID.toString(),
            otp: receivedOtp,
          }),
        }
      );

      if (!responseSubOTP.ok) {
        const errorText = await responseSubOTP.text();
        throw new Error(
          `HTTP error! status: ${responseSubOTP.status}, message: ${errorText}`
        );
      }

      const data = await responseSubOTP.json();
      
      if (data.success) {
        navigate(`/Mypage`, {
          state: {
            aadharverified: aadharVerification,
            newSubscriber: data,
            phoneNo: phoneNo,
			aadharNo:aadharNo
          },
        }); 
        setShowModal(false); // Close the OTP modal
      } else {
        setOtpError("Invalid OTP. Please try again.");
        setReceivedOtp("");
      }
    } catch (error) {
      setOtpError("Failed to verify OTP. Please try again.");
      setReceivedOtp("");
    } finally {
      setLoading(false);
    }
   
  };
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

  const handleResend = () => {
    handleSubmit(); // Call the submit function
    setDisabled(true);
    setTimer(180); // Restart timer
  };

  return (
    <div className="form-mobilecontainer">
      <div className="mobilecontainer">
        <div className="mobileheader">
          <p className="_x102">E-Verify Your Aadhaar</p>
        </div>
        <Form className="mainmobilecontainer" onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Aadhaar No*:</Form.Label>
            <Form.Control
               className="forminput custom-placeholder"
               type="tel"
              placeholder="Enter Aadhaar Number"
              value={aadharNo}
              onChange={handleAadharNoChange}
              maxLength={12}
              inputMode="numeric"
              required
             
            />
            {errors && <Form.Text className="text-danger">{errors}</Form.Text>}
          </Form.Group>
          <button type="submit" disabled={loading} className="custom-button1 w-100">
            {loading ? "Submitting..." : "Get OTP"}
          </button>
        </Form>
      </div>
      {/* OTP Modal */}
      <Modal
        show={showModal}
        centered
        onHide={() => setShowModal(false)}
        backdrop="static"
        keyboard={false}
      >
        <Modal.Header closeButton style={{ background: 'rgb(205, 154, 80)' }}>
          <Modal.Title style={{ textAlign: 'center', width: '100%' }}>Aadhaar Authentication</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: '1rem 1.5rem', height: '200px' }}>
          <Form style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <Form.Group className="mb-3">
              <Form.Label>Enter OTP*</Form.Label>
              <Form.Control
                type="text"
                className="form-control custom-placeholder"
         
                placeholder="Enter OTP"
                value={receivedOtp}
                onChange={handleReceivedOtpChange}
                ref={otpInputRef} // Ref to focus on input
                inputMode="numeric"
                pattern="[0-9]*"
                required
              />
              {otpError && <Form.Text className="text-danger">{otpError}</Form.Text>}
            </Form.Group>
            <button
              className="custom-button1 w-100"
              onClick={handleOtpSubmit}
              disabled={loading}
            >
              {loading ? "Verifying..." : "Verify OTP"}
            </button>
            <p className="resendNote" style={{ marginTop: "1px" }}>
              Didn't receive the code?{" "}
              {disabled ? (
                <span style={{ color: "gray" }}>
                  Resend in {String(Math.floor(timer / 60)).padStart(2, "0")}:
                  {String(timer % 60).padStart(2, "0")}s
                </span>
              ) : (
                <button style={{paddingInline:8}} onClick={handleResend}>
                  Resend OTP
                </button>
              )}
            </p>
            </Form>
        </Modal.Body>
      </Modal>
     
    </div>
  );
};

export default AadharVer;

