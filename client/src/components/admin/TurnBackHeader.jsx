import React from 'react'
import { HiArrowLeft } from "react-icons/hi2";
import { useNavigate } from 'react-router-dom';

function TurnBackHeader({ turnBackPage, header }) {
    const navigate = useNavigate();
    const handleTurnBack = () => {
        if (window.history.length > 1) {
            navigate(-1);
        } else {
            navigate(turnBackPage);
        }
    };
    return (
        <button
            type="button"
            onClick={handleTurnBack}
            className="inline-flex items-center gap-2 mb-4 px-3 py-1.5 rounded-full text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 hover:text-gray-900 transition-colors"
        >
            <HiArrowLeft className="w-4 h-4" />
            {header}
        </button>
    )
}

export default TurnBackHeader
