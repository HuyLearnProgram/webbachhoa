// src/store/ProviderWrapper.jsx
import React from "react";
import { Provider } from "react-redux";
import { store } from "@/store/redux"; // đúng theo redux.js bạn đã cấu hình

export const ProviderWrapper = ({ children }) => {
  return <Provider store={store}>{children}</Provider>;
};
