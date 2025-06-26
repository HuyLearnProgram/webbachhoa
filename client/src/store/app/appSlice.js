import { createSlice } from "@reduxjs/toolkit";
import * as actions from "./asyncActions";

export const appSlice = createSlice({
  name: "app",
  initialState: {
    categories: null,
    isLoading: false,
    isShowModal: false,
    modalChildren: null,
    errorCode: null
  },
  reducers: {
    showModal: (state, action) => {
      state.isShowModal = action.payload.isShowModal
      state.modalChildren = action.payload.modalChildren
    },
    setErrorCode: (state, action) => {
      state.errorCode = action.payload.errorCode
      console.log(state.errorCode)
    }
  },
  extraReducers: (builder) => {
    builder.addCase(actions.getCategories.pending, (state) => {
      state.isLoading = true;
    });
    
    builder.addCase(actions.getCategories.fulfilled, (state, action) => {
      state.isLoading = false;
      state.categories = action.payload;
    });

    builder.addCase(actions.getCategories.rejected, (state, action) => {
      state.isLoading = false;
      state.errorMessage = action.error.message;
    });
  },
});

export const { showModal, setErrorCode } = appSlice.actions
//export reducer = reducer(s) = extrareducers
export default appSlice.reducer;
