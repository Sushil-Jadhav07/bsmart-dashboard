export const postsMock = Array.from({ length: 150 }, (_, i) => {
  const id = `P${3000 + i}`
  const types = ['Video', 'Image', 'Text']
  const statuses = ['Active', 'Flagged', 'Removed']
  return {
    id,
    user_name: `User ${i + 1}`,
    type: types[i % types.length],
    caption: `Sample caption ${i + 1}`,
    upload_date: new Date(Date.now() - i * 7200000).toISOString(),
    views: Math.floor(100 + Math.random() * 50000),
    likes: Math.floor(10 + Math.random() * 10000),
    comments: Math.floor(0 + Math.random() * 1000),
    reports: Math.floor(Math.random() * 10),
    status: statuses[i % statuses.length],
  }
})

