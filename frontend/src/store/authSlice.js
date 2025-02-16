// import { createSlice } from "@reduxjs/toolkit";

// const initialState = {
//     isAuthenticated: false,
//     user: null,
//     loading: false,
//     error: null,
// };

// const authSlice = createSlice({
//     name: "auth",
//     initialState,
//     reducers: {
//         setAuthenticated: (state, action) => {
//             state.isAuthenticated = true;
//             state.user = action.payload;
//             state.loading = false;
//             state.error = null;
//         },
//         setUnauthenticated: (state) => {
//             state.isAuthenticated = false;
//             state.user = null;
//             state.loading = false;
//             state.error = null;
//         },
//         setLoading: (state) => {
//             state.loading = true;
//         },
//         setError: (state, action) => {
//             state.loading = false;
//             state.error = action.payload;
//         },
//     },
// });

// export const {
//     setAuthenticated,
//     setUnauthenticated,
//     setLoading,
//     setError,
// } = authSlice.actions;

// export default authSlice.reducer;
// src/store/authSlice.js
import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  isAuthenticated: false,
  user: null,
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setAuthenticated: (state, action) => {
      state.isAuthenticated = true;
      state.user = action.payload;
      state.loading = false;
      state.error = null;
    },
    setUnauthenticated: (state) => {
      state.isAuthenticated = false;
      state.user = null;
      state.loading = false;
      state.error = null;
    },
    setLoading: (state) => {
      state.loading = true;
    },
    setError: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },
  },
});

export const {
  setAuthenticated,
  setUnauthenticated,
  setLoading,
  setError,
} = authSlice.actions;

export default authSlice.reducer;
