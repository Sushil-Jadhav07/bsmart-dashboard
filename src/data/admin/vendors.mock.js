export const vendorsMock = Array.from({ length: 80 }, (_, i) => {
  const id = `V${2000 + i}`
  const statuses = ['Pending', 'Approved', 'Suspended']
  const status = statuses[i % statuses.length]
  return {
    id,
    business_name: `Business ${i + 1}`,
    owner_name: `Owner ${i + 1}`,
    email: `vendor${i + 1}@business.com`,
    phone: `+91-90${String(2000000 + i).slice(0, 7)}`,
    category: ['Retail', 'Services', 'Food'][i % 3],
    address: `City ${i + 1}, Country`,
    documents: ['GST', 'PAN'].slice(0, (i % 2) + 1),
    rating: Math.round((3 + Math.random() * 2) * 10) / 10,
    sales: Math.floor(1000 + Math.random() * 50000),
    status,
  }
})

