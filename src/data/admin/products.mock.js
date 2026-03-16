export const productsMock = Array.from({ length: 120 }, (_, i) => {
  const id = `PR${4000 + i}`
  const statuses = ['Pending', 'Active', 'Disabled']
  return {
    id,
    vendor_name: `Vendor ${i + 1}`,
    title: `Product ${i + 1}`,
    category: ['Electronics', 'Fashion', 'Services'][i % 3],
    price: Math.round((10 + Math.random() * 990) * 100) / 100,
    description: `Description for product ${i + 1}`,
    media: [],
    availability: i % 2 === 0 ? 'In Stock' : 'Out of Stock',
    status: statuses[i % statuses.length],
  }
})

