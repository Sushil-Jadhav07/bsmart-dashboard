import { API_BASE_WITH_PATH } from './apiBase.js'
import { logout } from '../store/authSlice.js'

let interceptorInstalled = false
let handlingUnauthorized = false

const isApiRequest = (input) => {
  const url = typeof input === 'string' ? input : input?.url
  return typeof url === 'string' && url.startsWith(API_BASE_WITH_PATH)
}

const shouldIgnoreUnauthorized = (input) => {
  const url = typeof input === 'string' ? input : input?.url || ''
  return (
    url.includes('/auth/login') ||
    url.includes('/auth/register')
  )
}

export const installAuthSessionInterceptor = (store) => {
  if (interceptorInstalled || typeof window === 'undefined') return

  const originalFetch = window.fetch.bind(window)

  window.fetch = async (...args) => {
    const response = await originalFetch(...args)

    if (
      response?.status === 401 &&
      isApiRequest(args[0]) &&
      !shouldIgnoreUnauthorized(args[0]) &&
      !handlingUnauthorized
    ) {
      handlingUnauthorized = true

      try {
        store.dispatch(logout())
        if (window.location.pathname !== '/login') {
          window.location.assign('/login')
        }
      } finally {
        window.setTimeout(() => {
          handlingUnauthorized = false
        }, 250)
      }
    }

    return response
  }

  interceptorInstalled = true
}
