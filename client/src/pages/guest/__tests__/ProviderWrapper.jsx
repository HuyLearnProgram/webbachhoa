import React from "react";
import { Provider } from "react-redux";
import { store } from "@/store/redux";

export const ProviderWrapper = ({ children }) => {
  return <Provider store={store}>{children}</Provider>;
};
