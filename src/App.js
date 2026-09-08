
import './App.css';
import MobileVer from './Mobile/MobileVer';
import 'bootstrap/dist/css/bootstrap.min.css';
import { BrowserRouter,Routes, Route } from 'react-router-dom';
import Mobile from './Mobile/Mobile';
import Mypage from './Transactions/New_member_id_cards/Mypage';
import TransitionsModal from './Mobile/TransitionsModal';
import AadharVer from './Mobile/AadharVer';
import EkycCustomerPage from './Mobile/EkycCustomerPage';
import PaymentSuccess from './Transactions/New_member_id_cards/Paymentsuccess';


function App() {
  const basename =
    typeof window !== "undefined" && window.location.pathname.startsWith('/vrudhitabenrollment')
      ? '/vrudhitabenrollment'
      : '';

  return (
    <BrowserRouter basename={basename}>
      <Routes>
         <Route path="/" element={<Mobile/>}/>
         {/* <Route path="/Mobile"  element={<Mobile/>}/> */}
        <Route path="/MobileVer" element={<MobileVer/>}/>
        <Route path="/TransitionsModal" element={<TransitionsModal/>}/>  
        <Route path="/AadharVer" element={<AadharVer/>}/>
        <Route path="/Mypage" element={<Mypage/>}/>
        <Route path="/ekyc-customer" element={<EkycCustomerPage/>}/>
        <Route path="/success-page/:linkId" element={<PaymentSuccess/>}/>
      </Routes>
     </BrowserRouter> 
  );
};

export default App;
