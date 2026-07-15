const path = {
  PUBLIC: "/",
  HOME: "",
  ALL: "*",
  LOGIN: "login",
  PRODUCTS_BASE: 'products',

  PRODUCT_DETAIL: "/products/:category/:pid/:productname",
  FLASH_SALE: "flash-sale",
  RESET_PASSWORD: "reset-password",
  CART: "cart",
  CHECKOUT: "checkout",
  PAYMENT_SUCCESS: "payment-success",
  PAYMENT_SUCCESS_COD: "payment-success-cod",
  PAYMENT_FAILURE: "payment-failure",

  // Member path
  MEMBER: "member",
  PERSONAL: "personal",
  HISTORY: "buy-history",
  WISHLIST: "wishlist",
  RECENTLY_VIEWED: "recently-viewed",
  VOUCHER: "voucher",
  REFERRAL: "referral",

  //Admin path
  ADMIN: "admin",
  DASHBOARD: "dashboard",

  ADMIN_LAYOUT: "/admin/*",
  ADMIN_OVERVIEW: "overview",
  ADMIN_PRODUCT: "product",
  ADMIN_CATEGORY: "category",
  ADMIN_USER: "user",
  ADMIN_ORDER: "order",

  ADMIN_USER_DETAIL: "user/detail/:userId",
  ADMIN_EDIT_PRODUCT: "product/edit/:productId",
  ADMIN_PRODUCT_DETAIL: "product/detail/:productId",
  ADMIN_EDIT_USER: "user/edit/:userId",
  ADMIN_EDIT_CATEGORY: "category/edit/:categoryId",

  ADMIN_ORDER_DETAIL: "order/:orderId",

  ADMIN_FEEDBACK: "feedback",
  ADMIN_FEEDBACK_DETAIL: "",
  ADMIN_RECOMMENDATION: "recommendation-metrics",
  ADMIN_VOUCHER: "voucher",
  ADMIN_EDIT_VOUCHER: "voucher/edit/:voucherId",
  ADMIN_VOUCHER_AUTO_GRANT_RULES: "voucher-auto-grant-rules",
  ADMIN_LUCKY_DRAW: "lucky-draw",

  ADD_PRODUCT: "product/add",
  ADD_CATEGORY: "category/add",
  ADD_VOUCHER: "voucher/add",
  // ADMIN_
  FEEDBACK: "feedback"
};

export default path;