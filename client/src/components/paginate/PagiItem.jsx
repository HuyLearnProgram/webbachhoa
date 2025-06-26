import React from "react";
import clsx from "clsx";

const PagiItem = ({children, onClick, currentPage})=>{
    return (
        <button className={clsx("p-2  w-10 h-10 justify-center flex ",
            !Number(children) && "items-end font-semibold text-xl mt-1", 
            Number(children) && "items-center hover:rounded-full hover:bg-gray-400",
            Number(children) == currentPage && "rounded-full bg-gray-300")} 
            onClick={onClick}
            type="button"
            disabled={!Number(children)}>{children}</button>
    )
}

export default PagiItem