import { useDispatch } from "react-redux";
import { logout } from "@/store/user/userSlice";
import { apiLogout } from "@/apis";
import icons from '@/utils/icons'
import { useNavigate } from "react-router-dom";
import path from "@/utils/path";
import clsx from "clsx";

const { IoLogOutOutline } = icons

const Logout = ({text = ""}) => {
  const dispatch = useDispatch();
  const nav = useNavigate()
  const handleLogout = async () => {
    try {
      await apiLogout();
      dispatch(logout());
      nav(`/${path.HOME}`);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <span
      onClick={handleLogout}
      className={clsx(text === "" && "hover: rounded-full hover:bg-slate-200 hover:text-main cursor-pointer p-2"
        ,text !== "" && "p-2 w-full hover:bg-sky-100 flex gap-1 items-center")}
    >
      {text}
      <IoLogOutOutline size={18} />
    </span>
  );
};

export default Logout;