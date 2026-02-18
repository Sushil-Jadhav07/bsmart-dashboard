import React, { useState } from 'react';
import { Wallet, TrendingUp, TrendingDown, ArrowRightLeft, Heart, MessageCircle, Bookmark, Download } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import Card, { CardHeader, CardTitle, CardDescription } from '../components/Card.jsx';
import Button from '../components/Button.jsx';
import Badge from '../components/Badge.jsx';
import Table from '../components/Table.jsx';
import Select from '../components/Select.jsx';
import { walletSummary, coinsTransferredData, transactionsData, actionTypeOptions } from '../data/walletsData.jsx';
import { formatNumber, formatCompactNumber, formatDateTime } from '../utils/helpers.jsx';

const StatCard = ({ title, value, trend, trendValue, icon: Icon, color }) => (
  <Card>
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm text-neutral-500 mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-neutral-800">{value}</h3>
        {trend && (
          <div className={`flex items-center gap-1 mt-2 text-sm ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
            {trend === 'up' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            <span>{trendValue}</span>
          </div>
        )}
      </div>
      <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
    </div>
  </Card>
);

const Wallets = () => {
  const [actionFilter, setActionFilter] = useState('all');

  // Filter transactions
  const filteredTransactions = actionFilter === 'all' 
    ? transactionsData 
    : transactionsData.filter(t => t.actionType === actionFilter);

  const getActionIcon = (actionType) => {
    const icons = {
      like: Heart,
      comment: MessageCircle,
      save: Bookmark
    };
    return icons[actionType] || ArrowRightLeft;
  };

  const getActionColor = (actionType) => {
    const colors = {
      like: 'text-red-500 bg-red-50',
      comment: 'text-blue-500 bg-blue-50',
      save: 'text-yellow-500 bg-yellow-50'
    };
    return colors[actionType] || 'text-neutral-500 bg-neutral-100';
  };

  const columns = [
    {
      key: 'actionType',
      title: 'Action',
      render: (value) => {
        const Icon = getActionIcon(value);
        return (
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg ${getActionColor(value)} flex items-center justify-center`}>
              <Icon className="w-4 h-4" />
            </div>
            <span className="capitalize text-neutral-700">{value}</span>
          </div>
        );
      }
    },
    {
      key: 'fromUser',
      title: 'From',
      render: (value) => <span className="text-neutral-700">{value}</span>
    },
    {
      key: 'toUser',
      title: 'To',
      render: (value) => <span className="text-neutral-700">{value}</span>
    },
    {
      key: 'coins',
      title: 'Coins',
      render: (value) => (
        <span className="font-medium text-primary">+{formatNumber(value)}</span>
      )
    },
    {
      key: 'date',
      title: 'Date',
      render: (value) => formatDateTime(value)
    }
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-800">Wallets</h1>
          <p className="text-neutral-500 mt-1">Manage coins and transactions</p>
        </div>
        <Button variant="primary" icon={Download}>Export Report</Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Total Coins Minted"
          value={formatCompactNumber(walletSummary.totalCoinsMinted)}
          icon={Wallet}
          trend="up"
          trendValue={`+${walletSummary.coinsMintedGrowth}%`}
          color="bg-gradient-brand"
        />
        <StatCard
          title="Total Coins Deducted"
          value={formatCompactNumber(walletSummary.totalCoinsDeducted)}
          icon={TrendingDown}
          trend="up"
          trendValue={`+${walletSummary.coinsDeductedGrowth}%`}
          color="bg-orange-500"
        />
        <StatCard
          title="Avg. Coins Per User"
          value={formatNumber(walletSummary.averageCoinsPerUser)}
          icon={TrendingUp}
          trend="up"
          trendValue={`+${walletSummary.avgCoinsGrowth}%`}
          color="bg-green-500"
        />
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Coins Transferred Per Day</CardTitle>
          <CardDescription>Daily volume of coins transferred across the platform</CardDescription>
        </CardHeader>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={coinsTransferredData}>
              <defs>
                <linearGradient id="colorTransferred" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#833AB4" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#833AB4" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis 
                dataKey="date" 
                stroke="#9CA3AF"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                stroke="#9CA3AF"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => formatCompactNumber(value)}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
                formatter={(value) => formatNumber(value)}
              />
              <Area 
                type="monotone" 
                dataKey="transferred" 
                stroke="#833AB4" 
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorTransferred)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Transactions Table */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <h3 className="text-lg font-semibold text-neutral-800">Recent Transactions</h3>
            <p className="text-sm text-neutral-500">Latest coin transfers on the platform</p>
          </div>
          <Select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            options={actionTypeOptions}
            className="w-40"
          />
        </div>
        <Table
          columns={columns}
          data={filteredTransactions}
          searchable={false}
          pagination={true}
          pageSize={10}
          emptyMessage="No transactions found"
        />
      </Card>
    </div>
  );
};

export default Wallets;
