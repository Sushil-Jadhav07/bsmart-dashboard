import { configureStore } from '@reduxjs/toolkit'
import auth from './authSlice.js'
import posts from './postsSlice.js'
import users from './usersSlice.js'

const store = configureStore({
  reducer: { auth, posts, users },
})

export default store
