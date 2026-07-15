import React from 'react'
import { Outlet } from 'react-router-dom'
import { Header, Footer, TopHeader } from '@/components'
const Public = () => {
    return (
        <div className='w-full flex flex-col items-center max-h-screen overflow-y-auto'>
            <TopHeader/>
            <Header />
            <div className="w-full flex flex-col items-center">
                <Outlet />
            </div>
            <Footer/>
        </div>

    )
}

export default Public