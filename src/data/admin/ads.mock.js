export const adsMock = Array.from({ length: 60 }, (_, i) => {
  const id = `AD${5000 + i}`
  const statuses = ['Pending', 'Active', 'Rejected']
  return {
    id,
    vendor_name: `Vendor ${i + 1}`,
    title: `Ad ${i + 1}`,
    type: ['Image', 'Video', 'Banner'][i % 3],
    audience: ['All', '18-25', '25-40'][i % 3],
    budget: Math.floor(1000 + Math.random() * 50000),
    start: new Date(Date.now() - i * 86400000).toISOString(),
    end: new Date(Date.now() + i * 86400000).toISOString(),
    status: statuses[i % statuses.length],
  }
})

