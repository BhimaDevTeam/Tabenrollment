import React, { useState, useEffect } from 'react'
import { Form, Col, Row } from 'react-bootstrap'
import 'bootstrap/dist/css/bootstrap.min.css';
import PickDate from '../PickDate/PickDate';
import { calculateAge } from '../PickDate/DateUtils';
import { COLLECTION_API } from '../../apiurl';
import { useSelector } from 'react-redux';

const GuardaianDetails = ({ setGuardianData, errorValidate, clearError }) => {
  const data=useSelector(state=>state?.customer)
  const [formData, setFormData] = useState({
    guardname: '',
    guardGender: '',
    guardrelationship: '',
    guarddob: '',
  });

  const [errors, setErrors] = useState('');
  const [isEdit, setIsEdit] = useState(false)
  const [relationships, setRelationships] = useState([]); // State to hold relationships
  const [storeObj, setStoreObj] = useState({});
  const fetchRelationships = async () => {
    try {
      const response = await fetch(`${COLLECTION_API}/guardiandetails`, {
        method: "GET",
        headers: {

          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Network response was not ok: ${response.statusText}`);
      }

      const responseData = await response.json();
     

      if (Array.isArray(responseData) && responseData.length > 0) {
        setRelationships(responseData);
      } else {
        throw new Error("No scheme data received");
      } // Assuming data is an array of relationship objects

    } catch (error) {
      console.error('Error fetching relationships:', error);
    }
  };

  useEffect(() => {
   
    if (Array.isArray(data?.customer)) {
      const majorObject = data?.customer?.find(e => e.major === "Y")
      
      const genderMap = {
        M: "Male",
        F: "Female",
        O: "Others",
      };
      if (majorObject) {
        const { Name, Aadharname, Sex, DateOfBirth } = majorObject
        const obj = {
          guardname: Name || Aadharname,
          guardGender: genderMap[Sex],
          guardrelationship: '',
          guarddob: DateOfBirth,
        }
        setIsEdit(true)
        setFormData(obj)
        setStoreObj(obj)
      }
      else{
        setStoreObj({})
      }
    }
    fetchRelationships();
  },[data?.customer]);

 

  useEffect(() => {
    setGuardianData(formData);

  }, [formData, setGuardianData]);



  const handleGuardGenderChange = (event) => {
    const selectedValue = event.target.value; // Get the selected value from the event
    // console.log("Before change:", formData.guardGender);
    setFormData((prevFormData) => ({ ...prevFormData, guardGender: selectedValue }));
    // console.log("After change:", selectedValue);
    clearError('guardGender');
  };


  const handleDateChange = (newDate) => {
    setFormData((prevFormData) => ({ ...prevFormData, guarddob: newDate }));
    clearError('guarddob');
  };


  useEffect(() => {
    const age = calculateAge(formData.guarddob);
    if (age !== null && age <= 18) {
      errorValidate.guarddob = 'Guardian age should be greater than 18.';
    }
  }, [formData.guarddob, errorValidate]);


  return (
    <div className='container'>

      <Form className="form">
        <p>kyc document is to be furnished </p>
        <Row className="mb-3">
          <Col md={7}>
            <Form.Group controlId="formGuardName" className="form-group">
              <Form.Label className="form-label"> Name*:</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter Guardian Name"
                name="guardname"
                disabled={isEdit &&  storeObj.guardname}
                value={formData.guardname}
                onChange={(e) => {
                  const value = e.target.value;
                  const upperCaseValue = value.toUpperCase(); // Convert to uppercase
                  // Allow only alphabetic characters and spaces
                  if (/^[a-zA-Z\s]*$/.test(upperCaseValue)) {
                    setFormData({ ...formData, guardname: upperCaseValue });
                    clearError('guardname');
                  }
                }}
                className="form-control custom-placeholder"
           
                required

              />
              {errorValidate.guardname && <Form.Text className="text-danger">{errorValidate.guardname}</Form.Text>}

            </Form.Group>
          </Col>



          <Col md={5}>
            <Form.Group controlId="formGuardrelationship" className="form-group">
              <Form.Label className="form-label">Relationship*:</Form.Label>
              <Form.Select
                name="guardrelationship"
                className="form-control custom-placeholder"
                value={formData.guardrelationship}
                onChange={(e) => {
                  const value = e.target.value;
                  setFormData({
                    ...formData,
                    guardrelationship: value,
                  });
                  if (value) {
                    clearError('guardrelationship');
                  }
                }}
              >
                <option value="" hidden>
                  Select a relationship
                </option> 
                {relationships.map((relationship) => (
                  <option key={relationship.ID} value={relationship.ID}>
                    {relationship.Name}
                  </option>
                ))}
              </Form.Select>
              {errorValidate.guardrelationship && <Form.Text className="text-danger">{errorValidate.guardrelationship}</Form.Text>}
            </Form.Group>
          </Col>


          <Form.Group controlId="formGender" className="form-group">
            <Form.Label className="form-label"> Gender*:</Form.Label>
            <div className="d-flex flex-wrap" required >
              <div className="gender-option mx-2 ">
                <Form.Check
                  inline
                  type="radio"
                  label="Male"
                  name="guardGender"
                  id="genderMale"
                  value="Male" // Add value prop
                  disabled={isEdit && storeObj.guardGender}
                  checked={formData.guardGender === "Male"}
                  onChange={handleGuardGenderChange} // Directly use the handler

                />
              </div>
              <div className="gender-option mx-2 ">
                <Form.Check
                  inline
                  type="radio"
                  label="Female"
                  name="guardGender"
                  id="genderFemale"
                  disabled={isEdit && storeObj.guardGender}
                  value="Female" // Add value prop
                  checked={formData.guardGender === "Female"}
                  onChange={handleGuardGenderChange} // Directly use the handler


                />
              </div>
              <div className="gender-option mx-2 ">
                <Form.Check
                  inline
                  type="radio"
                  label="Others"
                  name="guardGender"
                  id="genderOthers"
                  disabled={isEdit && storeObj.guardGender}
                  value="Others" // Add value prop
                  checked={formData.guardGender === "Others"}
                  onChange={handleGuardGenderChange} // Directly use the handler


                />
              </div>

            </div>
            {errorValidate.guardGender && <Form.Text className="text-danger">{errorValidate.guardGender}</Form.Text>}
          </Form.Group>
          <Form.Group controlId="formGuardianDob">

            <PickDate dob={formData.guarddob} onDateChange={handleDateChange} label="Guardian DOB*:"  disabled={isEdit &&  storeObj.guardname}/>
            {errorValidate.guarddob && <Form.Text className="text-danger">{errorValidate.guarddob}</Form.Text>}
            {/* {formData.guarddob && calculateAge(formData.guarddob) <= 18 && (
            <Form.Text className="text-danger">
              Guardian age should be greater than 18.
            </Form.Text>
          )} */}
          </Form.Group>
        </Row>
      </Form>
    </div>
  )
}

export default GuardaianDetails