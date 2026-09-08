
import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Drafttabledb } from "../../apiurl";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { formatCurrency } from "../../utlis/currencyUtils";
import "./Mypage.css";

const PaymentSuccess = () => {
  const { currencySymbol } = useSelector((state) => state.customer || {});
  const { linkId } = useParams();
  const [membershipdata, setMembershipData] = useState(null);
  const [isLoading, setIsLoading] = useState(true); // track loading state

  const navigate = useNavigate();             ///////////////// Mohith_dev///////////
  
  const storedMembershipData = JSON.parse(localStorage.getItem("membershipData")) || {};
  const [schemeName, setSchemeName] = useState(
    storedMembershipData?.selectedSchemeName || "-"
  );

  const getMembershipid = async () => {
    let retries = 5;
    const poll = async () => {
      try {
        const getApiUrlMb = `${Drafttabledb}/resposne/${linkId}`;
        const getApiResponseMB = await fetch(getApiUrlMb);
        if (!getApiResponseMB.ok) throw new Error("GET API request failed");
        const getApiData = await getApiResponseMB.json();

        if (getApiData?.response) {
          setMembershipData(getApiData.response);
          
          // Finalize the signed PDF with official MembershipNo if a sign request ID exists in sessionStorage
          const storedSubscriberData = JSON.parse(localStorage.getItem("subscriberData")) || {};
          const mob = storedSubscriberData?.mobileNo;
          const signRequestId = (mob ? sessionStorage.getItem("currentSignRequestId_" + mob) : null) || sessionStorage.getItem("currentSignRequestId");
          const mNo = getApiData.response.MembershipNo;
          if (signRequestId && mNo) {
            let storedCountry = "";
            try {
              storedCountry = (JSON.parse(localStorage.getItem("membershipData") || "{}") || {}).selectedCountry || "";
            } catch (_) {}
            const branchHint = localStorage.getItem("decodedBranch") || "";
            const isSg =
              String(storedCountry).toLowerCase().includes("singapore") ||
              branchHint === "LI" ||
              branchHint === "LN";
            const countryHint = isSg ? "singapore" : "india";
            fetch(`${Drafttabledb}/finalize-signed-pdf`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                country: countryHint,
                "country-code": isSg ? "sg" : "in",
              },
              body: JSON.stringify({
                MembershipNo: mNo,
                SignRequestID: signRequestId,
                oldFileName: String(signRequestId),
                country: countryHint,
                countryCode: isSg ? "sg" : "in",
              }),
            })
              .then((res) => res.json())
              .then((data) => {
                console.log("Finalized signed PDF successfully:", data);
                sessionStorage.removeItem("currentSignRequestId");
                if (mob) {
                  sessionStorage.removeItem("currentSignRequestId_" + mob);
                }
              })
              .catch((err) => {
                console.error("Error calling finalize-signed-pdf:", err);
              });
          }
          setIsLoading(false);
        } else {
          if (retries > 0) {
            retries--;
            setTimeout(poll, 2000);
          } else {
            setMembershipData(null);
            setIsLoading(false);
          }
        }
      } catch (err) {
        if (retries > 0) {
          retries--;
          setTimeout(poll, 2000);
        } else {
          setMembershipData(null);
          setIsLoading(false);
        }
      }
    };

    poll();
  };

  useEffect(() => {
     getMembershipid();
  }, []);

  useEffect(() => {
    if (!membershipdata?.MembershipNo) return;
    
    const mNo = membershipdata.MembershipNo;
    const match = mNo.match(/^(\d{3})([A-Za-z]+)(\d+)/);
    const branchCode = match ? match[1] : (localStorage.getItem("decodedBranch") || "030");
    const schemeCode = match ? match[2] : (mNo.match(/([A-Za-z]+)/)?.[1] || "");

    if (schemeCode) {
      fetch(`${Drafttabledb}/schemes?branch=${branchCode}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            const foundScheme = data.find(s => s.SchemeCode === schemeCode);
            if (foundScheme && foundScheme.SchemeName) {
              setSchemeName(foundScheme.SchemeName);
            }
          }
        })
        .catch(err => console.error("Error fetching scheme name:", err));
    }
  }, [membershipdata]);

  if (isLoading) {
    return (
      <div style={{ textAlign: "center", marginTop: "50px" }}>Loading...</div>
    );
  }

  if (!membershipdata) {
    return (
      <div style={{ textAlign: "center", marginTop: "50px", color: "red" }}>
        Please contact Bhima agent.
        <p
          style={{
            marginTop: "15px", fontSize: "16px", color: 'blue', textAlign: "center", cursor: "pointer"
            , textDecoration: "underline"
          }}
          onClick={() => {
            const encodedBranch = localStorage.getItem("encodedBranch") || btoa(localStorage.getItem("decodedBranch") || "KRM");
            localStorage.clear();
            navigate(`/?branch=${encodedBranch}`);
          }}>
          Go to home page
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-start", padding: "16px", minHeight: "100vh", boxSizing: "border-box" }}>
      <div className="payment-success-card">
        {/* Success Icon */}
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <div
            style={{
              width: "60px",
              height: "60px",
              borderRadius: "50%",
              backgroundColor: "#4CAF50",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 15px",
            }}
          >
            <span style={{ fontSize: "32px", color: "white" }}>✔</span>
          </div>
          <h2 style={{ margin: "0", fontSize: "22px", fontWeight: "bold" }}>
            Your Receipt
          </h2>
          <p style={{ marginTop: 10 }}>Thank you for Subscribing for JPP Scheme</p>
        </div>

        {/* Receipt details */}
        <div style={{ fontSize: "14px", lineHeight: "1.8" }}>
          <p>
            <strong>Receipt No:</strong> {membershipdata?.ReceiptNo || "-"}
          </p>
          <p>
            <strong>Name:</strong> {membershipdata?.CustName || "-"}
          </p>
          <p>
            <strong>Mobile No:</strong> {membershipdata?.MobileNo || "-"}
          </p>
          <p>
            <strong>Amount Paid:</strong> {formatCurrency(membershipdata?.SchemeAmt, currencySymbol || "₹") || "-"}
          </p>
          <p>
            <strong>Status:</strong> {membershipdata?.Status || "-"}
          </p>
          <p>
            <strong>Scheme Name:</strong> {schemeName}         
          </p>
          <p>
            <strong>Membership No:</strong>{" "}
            {membershipdata?.MembershipNo || "-"}
          </p>

          <p>
            <strong>Date:</strong> {membershipdata?.InsertedDate || "-"}
          </p>
          <p>
            <strong>Link ID:</strong> {membershipdata?.LinkID || "-"}
          </p>
        </div>

        {/* Thank you note */}
        <div
          style={{
            textAlign: "center",
            marginTop: "15px",
            fontSize: "13px",
            color: "#666",
          }}
        >
        </div>

        {membershipdata?.ReceiptLink && (
          <a
            href={membershipdata.ReceiptLink}
            download={`Receipt_${membershipdata?.ReceiptNo || "payment"}.pdf`}
            style={{
              display: "inline-block",
              width: "100%",
              marginTop: "20px",
              padding: "12px",
              borderRadius: "10px",
              background: "linear-gradient(90deg, #7b5ce6, #4f2dbf)",
              color: "white",
              textAlign: "center",
              textDecoration: "none",
              fontSize: "15px",
              fontWeight: "bold",
              cursor: "pointer",
              boxShadow: "0px 4px 10px rgba(0,0,0,0.2)",
            }}
          >
            Download Receipt
          </a>
        )}

        <p
          style={{
            marginTop: "15px", fontSize: "16px", color: 'blue', textAlign: "center", cursor: "pointer"
            , textDecoration: "underline"
          }}
          onClick={() => {
            const encodedBranch = localStorage.getItem("encodedBranch") || btoa(localStorage.getItem("decodedBranch") || "KRM");
            localStorage.clear();
            navigate(`/?branch=${encodedBranch}`);
          }}>
          Go to home page
        </p>

      </div>
    </div>
  );
};

export default PaymentSuccess;
