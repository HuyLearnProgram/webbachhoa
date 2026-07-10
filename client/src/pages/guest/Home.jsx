import React from 'react'
import {
    Banner,
    Sidebar,
    FeatureProduct,
    HotDeals,
    HomeRecommendation
} from "@/components";
const Home = () => {
    return (
        <>
            <div className="w-main flex mt-6">
                <div className="flex flex-col gap-5 w-[25%] flex-auto">
                    <Sidebar />
                </div>
                <div className="flex flex-col gap-5 pl-5 w-[75%] flex-auto">
                    <Banner />
                </div>
            </div>
            <div className="mt-8">
                <HomeRecommendation />
            </div>
            <div className="mt-8">
                <HotDeals />
            </div>
            <div className="my-8">
                <FeatureProduct />
            </div>
        </>

    )
}

export default Home