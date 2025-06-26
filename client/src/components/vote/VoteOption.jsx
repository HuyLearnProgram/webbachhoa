import React, { memo, useRef, useEffect, useState } from "react";
import { voteOption } from "@/utils/constants";
import { AiFillStar } from "react-icons/ai";
import { Button } from '@/components';
const VoteOption = ({ nameProduct, handleSubmitOption }) => {
    const modalRef = useRef()
    const [chosenScore, setChosenScore] = useState(null)
    const [comment, setComment] = useState('')
    useEffect(() => {
        modalRef.current.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }, [])
    return (
        <div onClick={e => e.stopPropagation()} ref={modalRef} className="bg-white h-[400px] w-[700px] flex items-center justify-center flex-col px-6">
            <h2 className="text-center text-medium text-lg">{`Đánh giá sản phẩm ${nameProduct}`}</h2>
            <textarea
                className="form-textarea w-full placeholder:italic placeholder:text-xs placeholder:text-gray-500 text-sm"
                placeholder="Nhập đánh giá"
                value={comment}
                onChange={e => setComment(e.target.value)}></textarea>
            <div className="w-full flex flex-col gap-4">
                <p>Bạn có thích sản phẩm này?</p>
                <div className="flex justify-center gap-4 items-center">
                    {voteOption.map(el => (
                        <div className="w-[100px] bg-gray-200 hover:bg-gray-300 cursor-pointer rounded-md p-1 h-[100px] flex
                        flex-col gap-2 justify-center items-center " key={el.id}
                            onClick={() => setChosenScore(el.id)}>
                            {(Number(chosenScore) && chosenScore >= el.id) ? <AiFillStar color="orange" /> : <AiFillStar color="gray" />}
                            <span className="text-center text-sm">{el.text}</span>
                        </div>
                    ))}
                </div>
            </div>
            <Button handleOnClick={() => handleSubmitOption({ comment, score: chosenScore })} fw>Đánh giá</Button>
        </div>
    )
}
export default memo(VoteOption)