const path = {
  PUBLIC: "/",
  HOME: "",
  ALL: "*",
  LOGIN: "login",
  PRODUCTS: "products/:category",
  PRODUCTS_BASE: 'products',

  PRODUCT_DETAIL: "/products/:category/:pid/:productname",
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

  //Admin path
  ADMIN: "admin",
  DASHBOARD: "dashboard",

  ADMIN_LAYOUT: "/admin/*",
  ADMIN_OVERVIEW: "overview",
  ADMIN_PRODUCT: "product",
  ADMIN_CATEGORY: "category",
  ADMIN_USER: "user",
  ADMIN_ORDER: "order",

  ADMIN_USER_DETAIL: "",
  ADMIN_EDIT_PRODUCT: "product/edit/:productId",
  ADMIN_EDIT_USER: "",
  ADMIN_EDIT_CATEGORY: "category/edit/:categoryId",

  ADMIN_ORDER_DETAIL: "order/:orderId",

  ADMIN_FEEDBACK: "feedback",
  ADMIN_FEEDBACK_DETAIL: "",

  ADD_PRODUCT: "product/add",
  ADD_CATEGORY: "category/add",
  // ADMIN_
  FEEDBACK: "feedback"
};

export default path;