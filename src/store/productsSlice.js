import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { productsMock } from '../data/admin/products.mock.js'

const initialState = { items: [], status: 'idle', error: null }

export const fetchProducts = createAsyncThunk('products/fetch', async (_, { rejectWithValue }) => {
  try {
    return productsMock
  } catch (e) {
    return rejectWithValue('Failed to load products')
  }
})

export const patchProductStatus = createAsyncThunk(
  'products/patchStatus',
  async ({ id, status }, { rejectWithValue }) => {
    try {
      return { id, status }
    } catch {
      return rejectWithValue('Failed to update product')
    }
  }
)

export const deleteProductById = createAsyncThunk('products/delete', async (id, { rejectWithValue }) => {
  try {
    return id
  } catch {
    return rejectWithValue('Failed to delete product')
  }
})

const slice = createSlice({
  name: 'products',
  initialState,
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchProducts.pending, (s) => {
      s.status = 'loading'
      s.error = null
    })
      .addCase(fetchProducts.fulfilled, (s, a) => {
        s.status = 'succeeded'
        s.items = a.payload || []
      })
      .addCase(fetchProducts.rejected, (s, a) => {
        s.status = 'failed'
        s.error = a.payload || 'Failed'
      })
      .addCase(patchProductStatus.fulfilled, (s, a) => {
        const { id, status } = a.payload
        const i = s.items.findIndex((x) => x.id === id)
        if (i !== -1) s.items[i].status = status
      })
      .addCase(deleteProductById.fulfilled, (s, a) => {
        s.items = s.items.filter((x) => x.id !== a.payload)
      })
  },
})

export default slice.reducer

