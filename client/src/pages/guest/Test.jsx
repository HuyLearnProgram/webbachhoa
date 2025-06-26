import React, { useEffect, useState } from 'react';
import { apiGetDistricts, apiGetProVinces, apiGetWards } from '@/apis';

const LocationSelector = () => {
    const [provinces, setProvinces] = useState([]);
    const [districts, setDistricts] = useState([]);
    const [wards, setWards] = useState([]);
    const [selectedProvince, setSelectedProvince] = useState('');
    const [selectedDistrict, setSelectedDistrict] = useState('');
    const [selectedWard, setSelectedWard] = useState('');

    const fetchProvinces = async () => {
        const res = await apiGetProVinces();
        setProvinces(res?.data.data);
    };

    const fetchDistricts = async (pid) => {
        const res = await apiGetDistricts(pid);
        setDistricts(res?.data.data);
    };

    const fetchWards = async (did) => {
        const res = await apiGetWards(did);
        setWards(res?.data.data);
    };

    useEffect(() => {
        fetchProvinces();
    }, []);

    useEffect(() => {
        if (selectedProvince) {
            fetchDistricts(selectedProvince);
            setSelectedDistrict('');
            setWards([]);
            setSelectedWard('');
        }
    }, [selectedProvince]);

    useEffect(() => {
        if (selectedDistrict) {
            fetchWards(selectedDistrict);
            setSelectedWard('');
        }
    }, [selectedDistrict]);

    return (
        <div className="grid h-screen place-items-center">
            <div className="p-6 w-[65vw] mx-auto bg-white rounded-xl shadow-md space-y-4">
                <h2 className="text-xl font-bold text-center">Chọn địa điểm</h2>
    
                <div>
                    <label className="block text-sm font-medium text-gray-700">Tỉnh/Thành phố</label>
                    <select
                        value={selectedProvince}
                        onChange={(e) => setSelectedProvince(e.target.value)}
                        className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    >
                        <option value="">Chọn tỉnh/thành phố</option>
                        {Array.isArray(provinces) && provinces.map((province) => (
                            <option key={province.id} value={province.id}>{province.name}</option>
                        ))}
                    </select>
                </div>
    
                <div>
                    <label className="block text-sm font-medium text-gray-700">Quận/Huyện</label>
                    <select
                        value={selectedDistrict}
                        onChange={(e) => setSelectedDistrict(e.target.value)}
                        disabled={!selectedProvince}
                        className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    >
                        <option value="">Chọn quận/huyện</option>
                        {Array.isArray(districts) && districts.map((district) => (
                            <option key={district.id} value={district.id}>{district.name}</option>
                        ))}
                    </select>
                </div>
    
                <div>
                    <label className="block text-sm font-medium text-gray-700">Phường/Xã</label>
                    <select
                        value={selectedWard}
                        onChange={(e) => setSelectedWard(e.target.value)}
                        disabled={!selectedDistrict}
                        className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    >
                        <option value="">Chọn phường/xã</option>
                        {Array.isArray(wards) && wards.map((ward) => (
                            <option key={ward.id} value={ward.id}>{ward.name}</option>
                        ))}
                    </select>
                </div>
            </div>
        </div>
    );
    
}    

export default LocationSelector;
