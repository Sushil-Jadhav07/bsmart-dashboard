import { configureStore } from '@reduxjs/toolkit'
import auth from './authSlice.js'
import posts from './postsSlice.js'
import users from './usersSlice.js'
import vendors from './vendorsSlice.js'

const store = configureStore({
  reducer: { auth, posts, users, vendors },
})

export default store
