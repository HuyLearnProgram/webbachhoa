import React from "react";
import logo from "@/assets/logo.png";
import icons from "@/utils/icons";
import { Link } from "react-router-dom";
import path from "@/utils/path";

const {FaUserCircle, FaCartShopping } = icons;

const Header = () => {
  return (
    <div className="flex justify-between w-main h-[110px] py-[35px]">

      <Link to={`/${path.HOME}`}>
        <img src={logo} alt="logo" className="w-[120px] object-contain" />
      </Link>

      <div className="ml-auto flex">
        <div className="cursor-pointer hover:underline flex items-center justify-center gap-2 px-5 border-r">
          <FaCartShopping color="#10B981" size={25} />
          <span>0 sản phẩm</span>
        </div>

        <div className="cursor-pointer hover:underline flex items-center justify-center px-5 gap-2">
          <FaUserCircle color="#10B981" size={25} />
          <span>Tài khoản</span>
        </div>
      </div>
    </div>
  );
};
export default Header;