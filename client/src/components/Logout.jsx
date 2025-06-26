import { useDispatch } from "react-redux";
import { logout } from "@/store/user/userSlice";
import { apiLogout } from "@/apis";
import icons from '@/utils/icons'
import { useNavigate, useLocation } from "react-router-dom";
const { IoLogOutOutline } = icons

const Logout = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation(); // Lấy thông tin location

  
    const handleLogout = async () => {
      try {
        await apiLogout();
        dispatch(logout());
        if (location.pathname.startsWith('/admin')) {
          navigate('/'); // Điều hướng về trang chính
      }
      } catch (error) {
        console.error('Error logging out:', error);
      }
    };
  
    return (
      <span 
        onClick={handleLogout}
        className="hover: rounded-full hover:bg-slate-200 hover:text-main cursor-pointer p-2"
      >
        <IoLogOutOutline size={18} />
      </span>
    );
  };
  
  export default Logout;