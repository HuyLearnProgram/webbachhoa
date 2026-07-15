

import React, { useEffect } from 'react'
import path from '@/utils/path'
import { Route, Routes} from "react-router-dom";
import { Login, Home, Public, ProductDetail, Product, ResetPassword, CartDetail, Checkout, ErrorPage, PaymentSuccess, PaymentFailure, LocationSelector, FlashSale } from "@/pages/guest";
import { MemberLayout, Personal, Wishlist, History, RecentlyViewed, MyVoucher, Referral } from '@/pages/member';
import { useDispatch, useSelector } from "react-redux";
import { getCategories } from "@/store/app/asyncActions";
import { Bounce, ToastContainer } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';
import {Modal } from '@/components';
import { Admin } from "./pages/admin/index";
import PaymentSuccessCOD from './pages/guest/payment/PaymentSuccessCOD';
import { apiGetFlashSaleWindows } from '@/apis';
import { setFlashSaleWindowsConfig } from '@/utils/promotion';

const App = () => {
  const dispatch = useDispatch();
  const { isShowModal, modalChildren } = useSelector(state => state.app)

  useEffect(() => {
    dispatch(getCategories());
    // Đồng bộ khung giờ Flash Sale THẬT từ backend (thay vì hardcode) — tránh giá Flash Sale hiện sai
    // (giá thường thay vì giá giảm) khi admin đổi giờ trong application.properties mà FE không hay biết.
    (async () => {
      const res = await apiGetFlashSaleWindows();
      setFlashSaleWindowsConfig(res?.data);
    })();
  }, [dispatch]);

  return (
    <div className="min-h-screen font-main relative">
      
      {isShowModal && <Modal>{modalChildren}</Modal>}
      <Routes>
        <Route path={path.PUBLIC} element={<Public />}>
          <Route path={path.HOME} element={<Home />}></Route>
          <Route path={path.PRODUCTS_BASE} element={<Product />}></Route>
          <Route path={path.PRODUCT_DETAIL} element={<ProductDetail />}></Route>
          <Route path={path.CART} element={<CartDetail />}></Route>
          <Route path={path.FLASH_SALE} element={<FlashSale />}></Route>
          <Route path={path.CHECKOUT} element={<Checkout />}></Route>
          <Route path={path.RESET_PASSWORD} element={<ResetPassword />}></Route>
          <Route path="/error" element={<ErrorPage />} />
          <Route path='*' element={<ErrorPage />}></Route>
          <Route path={path.PAYMENT_SUCCESS} element={<PaymentSuccess />}></Route>
          <Route path={path.PAYMENT_SUCCESS_COD} element={<PaymentSuccessCOD />}></Route>
          <Route path={path.PAYMENT_FAILURE} element={<PaymentFailure />}></Route>
        </Route>
        <Route path={path.ADMIN_LAYOUT} element={<Admin/>} />
        <Route path={path.MEMBER} element={<MemberLayout />}>
          <Route path={path.PERSONAL} element={<Personal />}></Route>
          <Route path={path.HISTORY} element={<History />}></Route>
          <Route path={path.WISHLIST} element={<Wishlist />}></Route>
          <Route path={path.RECENTLY_VIEWED} element={<RecentlyViewed />}></Route>
          <Route path={path.VOUCHER} element={<MyVoucher />}></Route>
          <Route path={path.REFERRAL} element={<Referral />}></Route>
        </Route>
        <Route path={path.LOGIN} element={<Login />}></Route>
        <Route path='/vietnam-location' element={<LocationSelector/>}></Route>
      </Routes>
      <ToastContainer
        position="bottom-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
        transition={Bounce} />
    </div>
  );
}

export default App
