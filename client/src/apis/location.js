import axios from "axios";

export const apiGetProVinces = async () =>
    axios({
        url: 'https://esgoo.net/api-tinhthanh/1/0.htm',
        method: 'get'
    })

export const apiGetDistricts = async (selectedProvince) =>
    axios({
        url: `https://esgoo.net/api-tinhthanh/2/${selectedProvince}.htm`,
        method: 'get'
    })

export const apiGetWards = async (selectedDistrict) =>
    axios({
        url: `https://esgoo.net/api-tinhthanh/3/${selectedDistrict}.htm`,
        method: 'get'
    })