// import { createAsyncThunk} from "@reduxjs/toolkit";
// import * as apis from "@/apis";

// //https://techmaster.vn/posts/36779/huong-dan-su-dung-createasyncthunk-trong-redux-toolkit
// export const getCategories = createAsyncThunk("app/categories", async () => {
//     const response = await apis.apiGetCategories();
//     //console.log(response);

//     if (response.statusCode < 200 || response.statusCode >= 300) {
//         return rejectWithValue(response);
//     }

//     return response.data.result;
// });
import { createAsyncThunk} from "@reduxjs/toolkit";
import * as apis from "@/apis";

//https://techmaster.vn/posts/36779/huong-dan-su-dung-createasyncthunk-trong-redux-toolkit
// export const getCategories = createAsyncThunk("app/categories", async (params=null) => {
//     if(params === null){
//         const response = await apis.apiGetCategories();
//         console.log(params)
//     }else{
//         const response = await apis.apiGetCategories(params);
//     }
    
//     //console.log(response);

//     if (response.statusCode < 200 || response.statusCode >= 300) {
//         return rejectWithValue(response);
//     }

//     return response.data.result;
// });

//https://techmaster.vn/posts/36779/huong-dan-su-dung-createasyncthunk-trong-redux-toolkit
export const getCategories = createAsyncThunk("app/categories", async () => {
    const response = await apis.apiGetCategories();
    if (response.statusCode < 200 || response.statusCode >= 300) {
        return rejectWithValue(response);
    }
    return response.data.result;
});
