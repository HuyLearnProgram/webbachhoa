import icons from "./icons";
import { useMemo } from "react";
import { BiDotsHorizontalRounded } from "react-icons/bi";
const { FaRegStar, FaStar } = icons;

export const formatMoney = (money) => Number(money?.toFixed(1)).toLocaleString();

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

export const convertToSlug = (text) => {
  const from = "ÁÀẢÃẠÂẤẦẨẪẬĂẮẰẲẴẶĐÉÈẺẼẸÊẾỀỂỄỆÍÌỈĨỊÓÒỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÚÙỦŨỤƯỨỪỬỮỰÝỲỶỸỴáàảãạâấầẩẫậăắằẳẵặđéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵ";
  const to =   "AAAAAAAAAAAAAAAAADEEEEEEEEEEEEIIIIIOOOOOOOOOOOOOUUUUUUUUUUUUUUYYYYYaaaaaaaaaaaaaaaaadeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyy";
  let newText = text;

  for (let i = 0; i < from.length; i++) {
    newText = newText.replace(new RegExp(from[i], "g"), to[i]);
  }

  newText = newText
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

  return newText;
}