import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut,
  signInWithPhoneNumber,
  PhoneAuthProvider,
  linkWithCredential,
} from "firebase/auth";
import { auth } from "../firebase";

/**
 * Sign up with email/password + send verification email
 */
export const signUp = createAsyncThunk(
  "auth/signUp",
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      //  verification email
      await sendEmailVerification(user);

      //minimal user info 
      return { uid: user.uid, email: user.email };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const sendPhoneVerification = createAsyncThunk(
  "auth/sendPhoneVerification",
  async (phoneNumberE164, { rejectWithValue }) => {
    try {
      const confirmationResult = await signInWithPhoneNumber(auth, phoneNumberE164);
      return { verificationId: confirmationResult.verificationId };
    } catch (error) {
      console.log("Phone Auth Error Code:", error.code);
      console.log("Phone Auth Error Message:", error.message);
      return rejectWithValue(error.message);
    }
  }
);

export const verifyPhone = createAsyncThunk(
  "auth/verifyPhone",
  async ({ verificationId, code }, { rejectWithValue }) => {
    try {
      const credential = PhoneAuthProvider.credential(verificationId, code);
      const linkedCred = await linkWithCredential(auth.currentUser, credential);
      const user = linkedCred.user;
      return {
        uid: user.uid,
        email: user.email,
        phoneNumber: user.phoneNumber, // linked
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);
/**
 * Optional: login
 */
export const login = createAsyncThunk(
  "auth/login",
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      return { uid: user.uid, email: user.email, phoneNumber: user.phoneNumber };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

/**
 *  logout
 */
export const logout = createAsyncThunk("auth/logout", async (_, { rejectWithValue }) => {
  try {
    await signOut(auth);
    return;
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

const authSlice = createSlice({
  name: "auth",
  initialState: {
    user: null,           
    loading: false,
    error: null,
    verificationId: null, // for phone
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      // signUp
      .addCase(signUp.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(signUp.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
      })
      .addCase(signUp.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // sendPhoneVerification
      .addCase(sendPhoneVerification.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(sendPhoneVerification.fulfilled, (state, action) => {
        state.loading = false;
        state.verificationId = action.payload.verificationId;
      })
      .addCase(sendPhoneVerification.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // verifyPhone
      .addCase(verifyPhone.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(verifyPhone.fulfilled, (state, action) => {
        state.loading = false;
        state.user = { ...state.user, ...action.payload };
      })
      .addCase(verifyPhone.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // login
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // logout
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
      });
  },
});

 export default authSlice.reducer;
// import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
// import {
//   createUserWithEmailAndPassword,
//   sendEmailVerification,
//   signInWithEmailAndPassword,
//   signOut,
// } from "firebase/auth";
// import { auth } from "../firebase";

// /**
//  * Sign up with email/password + send verification email
//  */
// export const signUp = createAsyncThunk(
//   "auth/signUp",
//   async ({ email, password }, { rejectWithValue }) => {
//     try {
//       const userCredential = await createUserWithEmailAndPassword(auth, email, password);
//       const user = userCredential.user;

//       // Send verification email
//       await sendEmailVerification(user);

//       // Return minimal user info
//       return { uid: user.uid, email: user.email };
//     } catch (error) {
//       return rejectWithValue(error.message);
//     }
//   }
// );

// /**
//  * Login with email/password
//  */
// export const login = createAsyncThunk(
//   "auth/login",
//   async ({ emailOrPhone, password }, { rejectWithValue }) => {
//     try {
//       // "emailOrPhone" is used but we treat it purely as an email in this code
//       const userCredential = await signInWithEmailAndPassword(auth, emailOrPhone, password);
//       const user = userCredential.user;

//       return { uid: user.uid, email: user.email };
//     } catch (error) {
//       return rejectWithValue(error.message);
//     }
//   }
// );

// /**
//  * Logout
//  */
// export const logout = createAsyncThunk("auth/logout", async (_, { rejectWithValue }) => {
//   try {
//     await signOut(auth);
//     return;
//   } catch (error) {
//     return rejectWithValue(error.message);
//   }
// });

// const authSlice = createSlice({
//   name: "auth",
//   initialState: {
//     user: null,          // { uid, email }
//     loading: false,
//     error: null,
//   },
//   reducers: {},
//   extraReducers: (builder) => {
//     builder
//       // signUp
//       .addCase(signUp.pending, (state) => {
//         state.loading = true;
//         state.error = null;
//       })
//       .addCase(signUp.fulfilled, (state, action) => {
//         state.loading = false;
//         state.user = action.payload; // { uid, email }
//       })
//       .addCase(signUp.rejected, (state, action) => {
//         state.loading = false;
//         state.error = action.payload;
//       })

//       // login
//       .addCase(login.pending, (state) => {
//         state.loading = true;
//         state.error = null;
//       })
//       .addCase(login.fulfilled, (state, action) => {
//         state.loading = false;
//         state.user = action.payload;
//       })
//       .addCase(login.rejected, (state, action) => {
//         state.loading = false;
//         state.error = action.payload;
//       })

//       // logout
//       .addCase(logout.fulfilled, (state) => {
//         state.user = null;
//       });
//   },
// });

// export default authSlice.reducer;
