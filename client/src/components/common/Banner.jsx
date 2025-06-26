import React from "react";
import { Link } from "react-router-dom";
import path from "@/utils/path";
const Banner = () => {
    return (
        <div className="w-full relative">
            <img
                className="w-full h-[400px] object-cover"
                src="https://kachabazar-store-nine.vercel.app/_next/image?url=https%3A%2F%2Fres.cloudinary.com%2Fahossain%2Fimage%2Fupload%2Fv1697688491%2Fsettings%2Fslider-2_o6aezc.jpg&w=1080&q=75"
                alt="banner"
            />

            <div className="absolute inset-0 flex flex-col justify-center items-start ml-8">
                <h1 className="text-3xl font-semibold mb-4 text-">Chào mừng bạn đến với Ogani</h1>
                <p className="text-main mb-4">Xem ngay những sản phẩm dành cho bạn</p>
                <Link className="bg-main font-bold py-2 px-4 rounded text-gray-50"
                    to={`/${path.PRODUCTS_BASE}`}>
                    Mua ngay
                </Link>
            </div>
        </div>
    );
};

export default Banner;
