import React from "react";
import { usePaginate } from "@/utils/helper";
import PagiItem from "./PagiItem";

const Pagination = ({ totalPage, currentPage, pageSize, totalProduct, onPageChange, siblingCount = 1 }) => {

    const pagination = usePaginate(totalPage, currentPage, pageSize, totalProduct, siblingCount);
    return (
        <div className="flex flex-row my-4 items-center justify-center">
            {pagination?.map((el,index) =>(
                <PagiItem   
                    key={typeof el === 'object' ? `dots-${index}` : el} 
                    onClick={()=>onPageChange(el)}
                    currentPage={currentPage}
                >
                    {el}
                </PagiItem>
            ))}
        </div>
    )
}

export default Pagination

//first + last + current + sibling + 2 * DOTS
// min = 6 => sibling + 5

// [1,2,3,4,5,6]
// [1,...,6,7,8,9,10]
// [1,2,3,4,5,...,10]
// [1,...,5,6,7,...,10]