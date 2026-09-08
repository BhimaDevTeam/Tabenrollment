import React,{useState} from 'react';
import { format, parseISO } from 'date-fns';
import Form from 'react-bootstrap/Form';
import { calculateAge } from '../PickDate/DateUtils';

const PickDate = ({ dob = '', onDateChange,disabled,label  }) => {
    // Function to format date to yyyy-MM-dd
    const [age, setAge] = useState("");
    
    const formatDate = (date) => {
        return date ? format(parseISO(date), 'yyyy-MM-dd') : '';
    };
    const getTodayDate = () => {
        return format(new Date(), 'yyyy-MM-dd');
    };

    const handleDateChange = (e) => {
        const newDate = e.target.value;
        onDateChange(newDate); // Pass the date value to the parent component
       // clearError(newDate);
    };
    
   
    return (
       
            <Form.Group controlId="formDob" className="form-group">
            <Form.Label className="form-label">{label || "Date of Birth*"}</Form.Label>
                <Form.Control
                    type="date"
                   
                    value={formatDate(dob)}
                    onChange={handleDateChange}
                    required
                    disabled={disabled}
                    max={getTodayDate()}
            
                />
                 {/* {errorValidate.dob && <Form.Text className="text-danger">{errorValidate.dob}</Form.Text>} */}
               
              
        </Form.Group>
    );
};

export default PickDate;
