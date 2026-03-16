// Wallet Summary Data
export const walletSummary = {
  totalCoinsMinted: 50000000,
  totalCoinsDeducted: 12500000,
  averageCoinsPerUser: 2847,
  coinsMintedGrowth: 15.3,
  coinsDeductedGrowth: 8.7,
  avgCoinsGrowth: 5.2
};

// Coins Transferred Per Day (30 days)
export const coinsTransferredData = [
  { date: 'Jan 1', transferred: 45000 },
  { date: 'Jan 2', transferred: 52000 },
  { date: 'Jan 3', transferred: 48000 },
  { date: 'Jan 4', transferred: 61000 },
  { date: 'Jan 5', transferred: 58000 },
  { date: 'Jan 6', transferred: 72000 },
  { date: 'Jan 7', transferred: 69000 },
  { date: 'Jan 8', transferred: 75000 },
  { date: 'Jan 9', transferred: 82000 },
  { date: 'Jan 10', transferred: 78000 },
  { date: 'Jan 11', transferred: 85000 },
  { date: 'Jan 12', transferred: 91000 },
  { date: 'Jan 13', transferred: 87000 },
  { date: 'Jan 14', transferred: 94000 },
  { date: 'Jan 15', transferred: 98000 },
  { date: 'Jan 16', transferred: 92000 },
  { date: 'Jan 17', transferred: 105000 },
  { date: 'Jan 18', transferred: 110000 },
  { date: 'Jan 19', transferred: 108000 },
  { date: 'Jan 20', transferred: 115000 },
  { date: 'Jan 21', transferred: 112000 },
  { date: 'Jan 22', transferred: 120000 },
  { date: 'Jan 23', transferred: 125000 },
  { date: 'Jan 24', transferred: 118000 },
  { date: 'Jan 25', transferred: 130000 },
  { date: 'Jan 26', transferred: 135000 },
  { date: 'Jan 27', transferred: 128000 },
  { date: 'Jan 28', transferred: 142000 },
  { date: 'Jan 29', transferred: 145000 },
  { date: 'Jan 30', transferred: 150000 }
];

// Transactions Data
export const transactionsData = [
  { id: 1, fromUser: 'Sarah Johnson', toUser: 'Mike Chen', actionType: 'like', coins: 5, date: '2024-01-15T10:30:00' },
  { id: 2, fromUser: 'Emma Wilson', toUser: 'James Brown', actionType: 'comment', coins: 10, date: '2024-01-15T09:15:00' },
  { id: 3, fromUser: 'Lisa Davis', toUser: 'Tom Anderson', actionType: 'save', coins: 15, date: '2024-01-15T08:45:00' },
  { id: 4, fromUser: 'Anna White', toUser: 'David Lee', actionType: 'like', coins: 5, date: '2024-01-15T07:20:00' },
  { id: 5, fromUser: 'Jessica Taylor', toUser: 'Ryan Martinez', actionType: 'comment', coins: 10, date: '2024-01-15T06:00:00' },
  { id: 6, fromUser: 'Sophie Clark', toUser: 'Chris Wright', actionType: 'like', coins: 5, date: '2024-01-14T18:30:00' },
  { id: 7, fromUser: 'Olivia Green', toUser: 'Daniel Kim', actionType: 'save', coins: 15, date: '2024-01-14T16:45:00' },
  { id: 8, fromUser: 'Mia Thompson', toUser: 'Sarah Johnson', actionType: 'comment', coins: 10, date: '2024-01-14T14:20:00' },
  { id: 9, fromUser: 'Mike Chen', toUser: 'Emma Wilson', actionType: 'like', coins: 5, date: '2024-01-14T12:00:00' },
  { id: 10, fromUser: 'James Brown', toUser: 'Lisa Davis', actionType: 'save', coins: 15, date: '2024-01-14T10:30:00' },
  { id: 11, fromUser: 'Tom Anderson', toUser: 'Anna White', actionType: 'comment', coins: 10, date: '2024-01-14T08:15:00' },
  { id: 12, fromUser: 'David Lee', toUser: 'Jessica Taylor', actionType: 'like', coins: 5, date: '2024-01-14T06:00:00' }
];

export const actionTypeOptions = [
  { value: 'all', label: 'All Actions' },
  { value: 'like', label: 'Like' },
  { value: 'comment', label: 'Comment' },
  { value: 'save', label: 'Save' }
];
