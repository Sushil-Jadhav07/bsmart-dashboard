import { configureStore } from '@reduxjs/toolkit'
import auth from './authSlice.js'
import posts from './postsSlice.js'
import users from './usersSlice.js'
import vendors from './vendorsSlice.js'
import ads from './adsSlice.js'
import products from './productsSlice.js'
import analytics from './analyticsSlice.js'
import notifications from './notificationsSlice.js'
import wallet from './walletSlice.js'
import sales from './salesSlice.js'
import vendorPackages from './vendorPackagesSlice.js'
import tweets from './tweetsSlice.js'
import inquiries from './inquiriesSlice.js'
import customerQueries from './customerQueriesSlice.js'
import faq from './faqSlice.js'
import policies from './policiesSlice.js'

const store = configureStore({
  reducer: { auth, posts, users, vendors, ads, products, analytics, notifications, wallet, sales, vendorPackages, tweets, inquiries, customerQueries, faq, policies },
})

export default store
