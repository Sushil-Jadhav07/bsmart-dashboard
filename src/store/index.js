import { configureStore } from '@reduxjs/toolkit'
import auth from './authSlice.js'
import posts from './postsSlice.js'
import users from './usersSlice.js'
import vendors from './vendorsSlice.js'
import ads from './adsSlice.js'
import products from './productsSlice.js'
import analytics from './analyticsSlice.js'

const store = configureStore({
  reducer: { auth, posts, users, vendors, ads, products, analytics },
})

export default store
