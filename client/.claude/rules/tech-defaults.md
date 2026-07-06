# Quy ước kỹ thuật mặc định

- Dùng alias `@/...` (trỏ tới `src/`) thay vì đường dẫn tương đối dài — xem `jsconfig.json`.
- Component viết dạng function + hooks. Form dùng `react-hook-form` — tham khảo mẫu có sẵn: `src/components/input/InputField.jsx`, `InputForm.jsx`, `src/components/admin/EditProductForm.jsx`.
- Mọi gọi API phải đi qua `axiosInstance` (`src/utils/axios.js`) và đặt hàm trong `src/apis/<domain>.js` theo domain đã có (`app`, `category`, `order`, `product`, `user`, `location`) — không gọi axios trực tiếp trong component. Ngoại lệ đã có: `src/apis/location.js` gọi thẳng API bên ngoài (esgoo.net) vì đó là API công khai của bên thứ ba, không phải backend của dự án.
- State toàn cục dùng Redux Toolkit: mỗi domain có `xSlice.js` + `asyncActions.js` riêng cho thunk bất đồng bộ — theo đúng mẫu `src/store/app/` và `src/store/user/`. Đọc/ghi state qua `useSelector`/`useDispatch`, không truy cập trực tiếp `store.getState()` trong component (chỉ interceptor axios mới cần làm vậy).
- Icon: import qua `src/utils/icons.jsx` (điểm re-export tập trung từ `react-icons`), không import rải rác `react-icons/...` trực tiếp trong từng component.
- Thông báo cho người dùng:
  - `sweetalert2` cho xác nhận/alert cần chặn luồng (ví dụ: yêu cầu đăng nhập trước khi thêm giỏ hàng, xác nhận xoá).
  - `react-toastify` cho toast không chặn (thông báo thành công/lỗi ngắn).
- Modal dùng cơ chế chung toàn app: Redux `app` slice (`isShowModal`, `modalChildren`) + component shell `src/components/common/Modal.jsx` — không tự dựng modal riêng lẻ bằng state cục bộ trừ khi thực sự cần cô lập (ví dụ modal nhỏ trong 1 form).
- Route path: dùng hằng số tập trung trong `src/utils/path.js`, không hard-code chuỗi path trong component.
- Đặt tên đường dẫn ảnh: nếu URL không bắt đầu bằng `https`, ghép với `${VITE_BACKEND_TARGET}/storage/{product|category|avatar}/{filename}` — xem cách làm hiện có trong `ProductCard.jsx`, `Personal.jsx` trước khi thêm nơi hiển thị ảnh mới.
