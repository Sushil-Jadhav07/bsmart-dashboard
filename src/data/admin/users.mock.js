export const usersMock = Array.from({ length: 120 }, (_, i) => {
  const id = `U${1000 + i}`
  const statuses = ['Active', 'Suspended', 'Banned']
  const status = statuses[i % statuses.length]
  return {
    id,
    full_name: `User ${i + 1}`,
    email: `user${i + 1}@example.com`,
    phone: `+91-98${String(1000000 + i).slice(0, 7)}`,
    avatar_url: '',
    registration_date: new Date(Date.now() - i * 86400000).toISOString(),
    last_login: new Date(Date.now() - i * 3600000).toISOString(),
    status,
    total_posts: Math.floor(Math.random() * 300),
    total_reports: Math.floor(Math.random() * 20),
  }
})

