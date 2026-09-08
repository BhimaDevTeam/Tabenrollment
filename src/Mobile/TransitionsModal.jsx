import * as React from 'react';
import Backdrop from '@mui/material/Backdrop';
import Box from '@mui/material/Box';
import Modal from '@mui/material/Modal';
import Fade from '@mui/material/Fade';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormControl from '@mui/material/FormControl';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import { useNavigate,useLocation } from 'react-router-dom'; // assuming you're using react-router-dom
import 'bootstrap-icons/font/bootstrap-icons.css';
import './MobileVer.css';


const style = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  //width: 400,
  bgcolor: 'background.paper',
  border: '2px solid #000',
  boxShadow: 24,
  p: 4,
};

export default function TransitionsModal({openModal, phoneNo}) {
  const [open, setOpen] = React.useState(false);
  const [selectedOption, setSelectedOption] = React.useState('');
  const[aadharVerification,setAaadharVerification]=React.useState("");
  const navigate = useNavigate(); // using react-router's navigate hook
  const location = useLocation(); 
  // console.log('Location state:', location.state);
  // const phoneNo = location.state?.phoneNo || '';
  // const openModal = location.state?.openModal || false;

  // Automatically open the modal if openModal is true
  React.useEffect(() => {
    // console.log('openModal:', openModal);
    if (openModal) {
      setOpen(true);
    }
  }, [openModal]);

  const handleOpen = () => setOpen(true);
  const handleClose = () => {
    setOpen(false);
    navigate(`/?branch=${localStorage.getItem('decodedBranch')}`);
  }
  const handleOptionChange = (event) => {
    setSelectedOption(event.target.value);
  };

  const handleSubmit = () => {
    if (selectedOption === 'withAadhar') {
      
     
      navigate('/AadharVer',{state:{phoneNo,aadharVerification,selectedOption}}); // navigate to the "with aadhar" page
    } else if (selectedOption === 'withoutAadhar') {
      
      navigate('/Mypage',{state:{phoneNo,aadharVerification,selectedOption}});// navigate to the "without aadhar" page
   
    }
    // console.log("selected option in handleSubmit", selectedOption);
  };
  

  React.useEffect(() => {
    if(selectedOption=='withAadhar'){
      setAaadharVerification(1);
     }
     else if (selectedOption=='withoutAadhar')
      {
       setAaadharVerification(0);
     }
    //  console.log("Aadhar verification status updated:", aadharVerification);
  }, [selectedOption]);

  React.useEffect(() => {
    console.log("Aadhar verification status now:", aadharVerification);
}, [aadharVerification]);



  return (
<div>
       
<Modal 
        aria-labelledby="transition-modal-title"
        aria-describedby="transition-modal-description"
        open={open}
        onClose={handleClose}
        closeAfterTransition
        slots={{ backdrop: Backdrop }}
        slotProps={{
          backdrop: {
            timeout: 500,
          },
        }}
        className="subscription-custom-model"
      >
     <Fade in={open}>
      <Box sx={style}>
        <Box display="flex" justifyContent="space-between" alignItems="center" className="model-xl">
            <Typography id="transition-modal-title" variant="h6" component="h2">
                Subscriber Details
              </Typography>
              <IconButton aria-label="close" onClick={handleClose}>
                <CloseIcon />
              </IconButton>
            </Box>
            <Typography id="transition-modal-description" sx={{ mt: 2 }}>
              Please select one of the options below:
            </Typography>
            <FormControl component="fieldset" sx={{ mt: 2 }}>
              <RadioGroup
                aria-label="aadhar-options"
                name="aadhar-options"
                value={selectedOption}
                onChange={handleOptionChange}
              >
                <FormControlLabel value="withAadhar" control={<Radio />} label="With e-KYC (With Aadhaar Verification)" />
                <FormControlLabel value="withoutAadhar"  control={<Radio />} label="Without e-KYC " />
              </RadioGroup>
              {/* Submit button is now below the radio buttons */}
              <button
              className="custom-button1 w-100" onClick={handleSubmit} sx={{ mt: 3 }}>
                Submit
              </button>
            </FormControl>
          </Box>
        </Fade>
      </Modal>
    </div>
  );
}