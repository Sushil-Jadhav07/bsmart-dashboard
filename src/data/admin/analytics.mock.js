export const analyticsMock = {
  totals: {
    users: 31240,
    vendors: 1240,
    activeUsers: 5420,
    activeVendors: 420,
    posts: 98213,
    ads: 312,
    revenue: 1284300,
    pendingVendors: 32,
    reportedPosts: 118,
    tickets: 42,
    alerts: 5,
  },
  userGrowth: Array.from({ length: 12 }, (_, i) => ({
    name: `M${i + 1}`,
    count: Math.floor(1000 + Math.random() * 5000),
  })),
  vendorGrowth: Array.from({ length: 12 }, (_, i) => ({
    name: `M${i + 1}`,
    count: Math.floor(50 + Math.random() * 300),
  })),
  revenue: Array.from({ length: 12 }, (_, i) => ({
    name: `M${i + 1}`,
    value: Math.floor(50000 + Math.random() * 120000),
  })),
  engagement: Array.from({ length: 12 }, (_, i) => ({
    name: `M${i + 1}`,
    likes: Math.floor(800 + Math.random() * 5000),
    comments: Math.floor(200 + Math.random() * 2000),
    views: Math.floor(10000 + Math.random() * 50000),
  })),
  ads: {
    impressions: 1240000,
    clicks: 48200,
    conversionRate: 3.1,
    spend: 482340,
    performance: Array.from({ length: 8 }, (_, i) => ({
      name: `C${i + 1}`,
      impressions: Math.floor(10000 + Math.random() * 60000),
      clicks: Math.floor(500 + Math.random() * 4000),
      revenue: Math.floor(1000 + Math.random() * 8000),
    })),
  },
}

