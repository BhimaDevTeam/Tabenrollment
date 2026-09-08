const fs = require('fs');

const path = "c:\\inetpub\\wwwroot\\vrudhitabenrollment\\src\\Transactions\\New_member_id_cards\\Mypage.jsx";
let content = fs.readFileSync(path, 'utf8');

const brokenCode = `          if (!signRequestId) {
            signRequestId = await generateEnrollmentPdf(cleanBranch);

            setopenofflineModal(true);
            return draftIDData; // Return existing draft ID
          } else {
            console.error("Failed to update draft payment method");

            return false;
          }`;

const fixedCode = `          if (!signRequestId) {
            signRequestId = await generateEnrollmentPdf(cleanBranch);
          }

          const updateData = {
            DraftID: draftIDData, // Include existing draft ID for update
            Branch: cleanBranch,
            Scheme: membershipData.selectedSchemeCode || "",
            Cust_Name: subscriberData.subscriberName || "",
            Gender: subscriberData.gender || "",
            Address1: add1 || "",
            Address2: add2 || "",
            Address3: subscriberData.area || "",
            PermanentAddress: permanentAddress || "",
            State: subscriberData.state || "",
            City: subscriberData.city || "",
            Pin_Code: subscriberData.pinCode || "",
            Mobile_No: subscriberData.mobileNo || "",
            email_id: subscriberData.email || "",
            DateOf_Birth: subscriberData.dob || "",
            InstallmentAmount: membershipData.installmentAmount || "",
            NomineName: nomineeData.nomineename || "",
            NomineRelationship: nomineeData.relationship || "",
            NominePhone: nomineeData.nomineephoneno || "",
            NomineAddress: nomineeData.nomineeaddress || "",
            Accountno: bankData.accountNo || "",
            ifsccode: bankData.ifscCode || "",
            GuardianName: guardaianData.guardname || "",
            GuardianRelation: guardaianData.guardrelationship || "",
            Guardiangender: guardaianData.guardGender || "",
            GuardianDOB: guardaianData.guarddob || "",
            IsMembershipCreated: membershipData.isMembershipCreated || "N" || "",
            MembershipNo: membershipData.membershipNo || "",
            IsAadarVerified: isaadharVerified,
            IsCancelFlag: "N",
            imageUrl: image,
            inserted_By: "BY",
            documents: alldocs,
            TnxType: "offline",
            AadharNo: aadhar_No,
            SignRequestID: signRequestId
          };

          console.log("Complete draft data for update:", updateData);

          const updateResponse = await axios.post(
            \`\${Drafttabledb}/draftenrollment\`,
            updateData,
            {
              headers: { 
                "Content-Type": "application/json",
                "country-code": (selectedCountry === "Singapore" || cleanBranch === "LI" || cleanBranch === "LN") ? "SG" : "IN"
              },
            }
          );

          if (updateResponse.data) {
            console.log("Draft payment method successfully updated to offline",updateResponse.data);

            setopenofflineModal(true);
            return draftIDData; // Return existing draft ID
          } else {
            console.error("Failed to update draft payment method");
            return false;
          }`;

if(content.includes(brokenCode)) {
    content = content.replace(brokenCode, fixedCode);
    fs.writeFileSync(path, content, 'utf8');
    console.log("Fixed Mypage.jsx SaveData function.");
} else {
    console.log("Could not find broken code in Mypage.jsx.");
}
