import React,{useState} from 'react';
import { format, parseISO } from 'date-fns';
import Form from 'react-bootstrap/Form';
import { calculateAge } from '../PickDate/DateUtils';

const isPlaceholderDob = (date) => {
    if (!date) return true;
    const str = String(date).trim();
    return (
        !str ||
        str.startsWith('1901-01-01') ||
        str.startsWith('1900-01-01') ||
        str.startsWith('01-01-1901') ||
        str.startsWith('01/01/1901') ||
        str.startsWith('01-01-1900') ||
        str.startsWith('01/01/1900')
    );
};

const PickDate = ({ dob = '', onDateChange,disabled,label  }) => {
    // Function to format date to yyyy-MM-dd
    const [age, setAge] = useState("");
    
    const formatDate = (date) => {
        if (isPlaceholderDob(date)) return '';
        try {
            return format(parseISO(date), 'yyyy-MM-dd');
        } catch {
            return '';
        }
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
                    disabled={isPlaceholderDob(dob) ? false : Boolean(disabled)}
                    max={getTodayDate()}
            
                />
                 {/* {errorValidate.dob && <Form.Text className="text-danger">{errorValidate.dob}</Form.Text>} */}
               
              
        </Form.Group>
    );
};

export default PickDate;
