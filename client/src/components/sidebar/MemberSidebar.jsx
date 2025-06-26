import React, { Fragment, useState, useEffect, memo } from "react";
import avatar from '@/assets/avatarDefault.png'
import { memberSidebar } from '@/utils/constants';
import { NavLink } from "react-router-dom";
import clsx from "clsx";
import { AiOutlineCaretDown, AiOutlineCaretRight } from "react-icons/ai";
import { useSelector } from "react-redux";
import { getUserById } from "@/apis";

const activedStyle = 'px-4 py-2 flex items-center gap-2 text-white  bg-[#10B981]'
const notActivedStyle = 'px-4 py-2 flex items-center gap-2 hover:bg-green-100'
const MemberSidebar = () => {
    const [actived, setActived] = useState([])
    const { current } = useSelector(state => state.user)
    const [user, setUser] = useState()


    const handleShowTabs = (tabId) => {
        if (actived.some(el => el === tabId)) setActived(prev => prev.filter(el => el !== tabId))
        else setActived(prev => [...prev, tabId])
    }

    const fetchUserByCurrentId = async () => {
        try {
            const response = await getUserById(current?.id);
            setUser(response.data)
        } catch (error) {
            console.error("Error fetching avatar:", error);
        }
    }


    useEffect(() => {
        fetchUserByCurrentId()
    }, [current])

    return (
        <div className="bg-white h-full py-4">
            <div className="w-full flex flex-col  items-center justify-center p-4">
                <img
                    src={user?.avatarUrl || `https://res-console.cloudinary.com/du0adzgjs/media_explorer_thumbnails/9604c80eaaa49fb7d5590b186a3c12f1/detailed`}
                    alt="Image Avatar"
                    className="w-20 h-20 object-cover rounded-full"
                />
                <span>{user?.name}</span>
            </div>
            <div>
                {memberSidebar.map(el => (
                    <Fragment key={el.id}>
                        {el.type === 'SINGLE' && <NavLink
                            to={el.path}
                            className={({ isActive }) => clsx(isActive && activedStyle, !isActive && notActivedStyle)}
                        >
                            <span>{el.icon}</span>
                            <span>{el.text}</span>
                        </NavLink>}
                        {el.type === 'PARENT' && <div className="flex flex-col" onClick={() => handleShowTabs(+el.id)}>
                            <div
                                className="flex items-center justify-between px-4 py-2 hover:bg-green-100 cursor-pointer"

                            >
                                <div className="flex items-center gap-2">
                                    <span>{el.icon}</span>
                                    <span>{el.text}</span>
                                </div>
                                {actived.some(id => id === +el.id) ? <AiOutlineCaretRight /> : <AiOutlineCaretDown />}
                            </div>
                            {actived.some(id => id === +el.id) && <div className="flex flex-col ">
                                {el.submenu.map((item, index) => (
                                    <NavLink key={`${item.text}` + `${index}`}
                                        to={item.path}
                                        className={({ isActive }) => clsx(isActive && activedStyle, !isActive && notActivedStyle, 'pl-10')}
                                        onClick={E => E.stopPropagation()}
                                    >
                                        {item.text}
                                    </NavLink>
                                ))}
                            </div>}
                        </div>}
                    </Fragment>
                ))}
            </div>
        </div>
    )
}

export default memo(MemberSidebar)