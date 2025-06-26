import React, { memo } from "react";

const Footer = () => {
  return (
    <div className="w-full mt-10">
      <div className="flex items-center justify-center w-full h-[400px] bg-slate-600 text-white text-[13px]">
        <div className="w-main flex">
          <div className="flex-2 flex flex-col gap-2 pr-2">
            <h3 className="mb-5 text-[15px] font-medium border-l-4 border-main pl-[15px]">
              ABOUT US
            </h3>
            <span>
              <span> Address: </span>
              <span className="opacity-70">
                97 Man Thiện, Hiệp Phú, TP.Thủ Đức, TP.Hồ Chí Minh
              </span>
            </span>
            <span>
              <span> Phone: </span>
              <span className="opacity-70">(+1234)56789xxx</span>
            </span>
            <span>
              <span>Mail: </span>
              <span className="opacity-70">support@gmail.com</span>
            </span>
          </div>
          <div className="flex-1 flex flex-col gap-2">
            <h3 className="mb-5 text-[15px] font-medium border-l-4 border-main pl-[15px]">
              INFORMATION
            </h3>
            <span>Typography</span>
            <span>Gallery</span>
            <span>Store Location</span>
            <span>Today's Deals</span>
            <span>Contact</span>
          </div>
          <div className="flex-1 flex flex-col gap-2">
            <h3 className="mb-5 text-[15px] font-medium border-l-4 border-main pl-[15px]">
              WHO WE ARE
            </h3>
            <span>Help</span>
            <span>Free Shipping</span>
            <span>FAQs</span>
            <span>Return & Exchange</span>
            <span>Testimonials</span>
          </div>
          <div className="flex-1">
            <h3 className="mb-5 text-[15px] font-medium border-l-4 border-main pl-[15px]">
              #OGANIWEBSTORE
            </h3>
          </div>
        </div>
      </div>
      
    </div>
  );
};

export default memo(Footer)
