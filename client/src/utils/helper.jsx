import icons from "./icons";
import { useMemo } from "react";
import { BiDotsHorizontalRounded } from "react-icons/bi";
const { FaRegStar, FaStar } = icons;

export const formatMoney = (money) => Number(money?.toFixed(1)).toLocaleString();

export const downloadBlob = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export const renderStarFromNumber = (number, size) => {
  if (number === undefined || number === null) return;
  number = Math.round(number)

  return Array.from({ length: 5 }, (_, i) =>
    i < number ? <FaStar key={i} color="orange" /> : <FaRegStar key={i} color="orange" />
  );
};

export const generateRange = (start, end) => {
  const length = end + 1 - start
  return Array.from({ length }, (_, index) => start + index)
}

export const usePaginate = (totalPage, currentPage, pageSize, totalProduct, siblingCount = 1) => {
  const paginationArray = useMemo(() => {
    const totalPaginationItem = siblingCount + 5
    if (totalPage <= totalPaginationItem) return generateRange(1, totalPage)
    const isShowLeft = currentPage - siblingCount > 2
    const isShowRight = currentPage + siblingCount < totalPage - 1
    if (isShowLeft && !isShowRight) {
      const rightStart = totalPage - 4
      const rightRange = generateRange(rightStart, totalPage)
      return [1, <BiDotsHorizontalRounded />, ...rightRange]
    }
    if (!isShowLeft && isShowRight) {
      const leftRange = generateRange(1, 5)
      return [...leftRange, <BiDotsHorizontalRounded />, totalPage]
    }
    const siblingLeft = Math.max(currentPage - siblingCount, 1)
    const siblingRight = Math.min(currentPage + siblingCount, totalPage)
    if (isShowLeft && isShowRight) {
      const middleRange = generateRange(siblingLeft, siblingRight)
      return [1, <BiDotsHorizontalRounded />, ...middleRange, <BiDotsHorizontalRounded />, totalPage]
    }
  }, [totalPage, currentPage, pageSize, totalProduct, siblingCount])
  return paginationArray
}

const ACCENTED_CHARS = "ÁÀẢÃẠÂẤẦẨẪẬĂẮẰẲẴẶĐÉÈẺẼẸÊẾỀỂỄỆÍÌỈĨỊÓÒỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÚÙỦŨỤƯỨỪỬỮỰÝỲỶỸỴáàảãạâấầẩẫậăắằẳẵặđéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵ";
const UNACCENTED_CHARS = "AAAAAAAAAAAAAAAAADEEEEEEEEEEEEIIIIIOOOOOOOOOOOOOUUUUUUUUUUUUUUYYYYYaaaaaaaaaaaaaaaaadeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyy";

// Bỏ dấu tiếng Việt, giữ nguyên khoảng trắng/hoa-thường/số từ khác — dùng khi cần gửi
// giá trị lên backend qua query string, vì server hiện xử lý sai ký tự có dấu (xem
// buildProductNameFilter/category.name bên dưới).
export const stripDiacritics = (text) => {
  let newText = text;
  for (let i = 0; i < ACCENTED_CHARS.length; i++) {
    newText = newText.replace(new RegExp(ACCENTED_CHARS[i], "g"), UNACCENTED_CHARS[i]);
  }
  return newText;
};

export const convertToSlug = (text) => {
  let newText = stripDiacritics(text);

  newText = newText
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

  return newText;
}

// Ghép từng từ trong từ khoá tìm kiếm thành điều kiện `productName~'...'` nối bằng `and`,
// để khớp được cả khi các từ không nằm liền nhau/đúng thứ tự trong tên sản phẩm.
// Bỏ dấu từng từ trước khi gửi lên backend: server hiện parse sai ký tự có dấu trong
// mọi query param (đã xác nhận qua test thật, không riêng gì filter DSL), nhưng collation
// MySQL lại accent-insensitive nên gửi bản không dấu vẫn khớp đúng dữ liệu có dấu trong DB.
export const buildProductNameFilter = (searchTerm) => {
  const words = searchTerm.trim().split(/\s+/).filter(Boolean).map(w => stripDiacritics(w).replace(/'/g, ''));
  return words.map(w => `productName~'${w}'`).join(' and ');
};