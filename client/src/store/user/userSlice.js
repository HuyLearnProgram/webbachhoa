import { createSlice } from "@reduxjs/toolkit";
import { getCurrentUser } from "./asyncActions";

export const userSlice = createSlice({
    name: "user",
    initialState: {
        isLoggedIn: false,
        current: null,
        token: null,
        isLoading: false,
        message: ''
    },
    reducers: {
        login: (state, action) => {
            state.isLoggedIn = action.payload.isLoggedIn;
            state.token = action.payload.token;
        },
        logout: (state) => {
            state.isLoggedIn = false;
            state.token = null;
            state.current = null;
            state.message = ''; // Không hiển thị thông báo khi đăng xuất
        },
        clearMessage: (state) => {
            state.message = '';
        },
        setExpiredMessage: (state) => {
            state.message = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại'; // Hiển thị thông báo khi token hết hạn
        }
    },
    extraReducers: (builder) => {
        builder.addCase(getCurrentUser.pending, (state) => {
            state.isLoading = true;
        });
        builder.addCase(getCurrentUser.fulfilled, (state, action) => {
            state.isLoading = false;
            state.current = action.payload;
            state.isLoggedIn = true;
        });
        builder.addCase(getCurrentUser.rejected, (state) => {
            state.isLoading = false;
            state.current = null;
            state.isLoggedIn = false;
            state.token = null;
        });
    },
});

export const { login, logout, clearMessage, setExpiredMessage } = userSlice.actions;
export default userSlice.reducer;
