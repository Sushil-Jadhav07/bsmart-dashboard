import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Wallet, TrendingUp, TrendingDown, ArrowRightLeft,
  Heart, MessageCircle, Bookmark, Download, Eye, Star,
  Loader2, AlertCircle, RefreshCw
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts';
import Card, { CardHeader, CardTitle, CardDescription } from '../components/Card.jsx';
import Button from '../components/Button.jsx';
import Badge from '../components/Badge.jsx';
import Table from '../components/Table.jsx';
import Select from '../components/Select.jsx';
import { fetchAllWallets } from '../store/walletSlice.js';
import { formatNumber, formatCompactNumber, formatDateTime } from '../utils/helpers.jsx';

const StatCard = ({ title, value, icon: Icon, color, subtitle }) => (
  <Card>
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm text-neutral-500 mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-neutral-800">{value}</h3>
        {subtitle && <p className="text-xs text-neutral-400 mt-1">{subtitle}</p>}
      </div>
      <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
    </div>
  </Card>
);

const TYPE_CONFIG = {
  LIKE:                { icon: Heart,           color: 'text-red-500 bg-red-50',       label: 'Like'           },
  COMMENT:             { icon: MessageCircle,   color: 'text-blue-500 bg-blue-50',     label: 'Comment'        },
  REPLY:               { icon: MessageCircle,   color: 'text-indigo-500 bg-indigo-50', label: 'Reply'          },
  SAVE:                { icon: Bookmark,        color: 'text-yellow-500 bg-yellow-50', label: 'Save'           },
  REEL_VIEW_REWARD:    { icon: Eye,             color: 'text-purple-500 bg-purple-50', label: 'Reel View'      },
  AD_REWARD:           { icon: Star,            color: 'text-green-500 bg-green-50',   label: 'Ad Reward'      },
  AD_BUDGET_DEDUCTION: { icon: TrendingDown,    color: 'text-orange-500 bg-orange-50', label: 'Ad Deduction'   },
};

const normalizeType = (value) =>
  String(value || '')
    .trim()
    .replace(/[\s-]+/g, '_')
    .toUpperCase();

const getTypeConfig = (type) =>
  TYPE_CONFIG[normalizeType(type)] || {
    icon: ArrowRightLeft,
    color: 'text-neutral-500 bg-neutral-100',
    label: String(type || 'Unknown'),
  };

const buildChartData = (transactions) => {
  const map = {};
  transactions.forEach((tx) => {
    const d = new Date(tx.createdAt || tx.transactionDate);
    if (isNaN(d)) return;
    const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    map[key] = (map[key] || 0) + (tx.amount || 0);
  });
  return Object.entries(map).slice(-30).map(([date, transferred]) => ({ date, transferred }));
};

const TYPE_OPTIONS = [
  { value: 'all',                label: 'All Types'         },
  { value: 'LIKE',               label: 'Like'              },
  { value: 'COMMENT',            label: 'Comment'           },
  { value: 'REPLY',              label: 'Reply'             },
  { value: 'SAVE',               label: 'Save'              },
  { value: 'REEL_VIEW_REWARD',   label: 'Reel View Reward'  },
  { value: 'AD_REWARD',          label: 'Ad Reward'         },
  { value: 'AD_BUDGET_DEDUCTION',label: 'Ad Deduction'      },
];

const Wallets = () => {
  const dispatch = useDispatch();
  const walletState = useSelector((s) => s.wallet) || {};
  const {
    transactions = [],
    summary = null,
    total = 0,
    status = 'idle',
    error = null,
  } = walletState;
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    if (status === 'idle') dispatch(fetchAllWallets());
  }, [dispatch, status]);

  const handleRefresh = () => dispatch(fetchAllWallets());

  const filteredTransactions = useMemo(() => {
    if (typeFilter === 'all') return transactions;
    return transactions.filter((t) => normalizeType(t.type) === normalizeType(typeFilter));
  }, [transactions, typeFilter]);

  const chartData = useMemo(() => buildChartData(transactions), [transactions]);

  const totalCoinsMinted  = summary?.total_coins_minted    ?? 0;
  const totalCoinsFromAds = summary?.total_coins_from_ads  ?? 0;
  const totalCoinsFromReels = summary?.total_coins_from_reels ?? 0;
  const totalTxCount      = summary?.total_transactions    ?? total ?? 0;

  const columns = [
    {
      key: 'type',
      title: 'Type',
      render: (value) => {
        const cfg = getTypeConfig(value);
        const Icon = cfg.icon;
        return (
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg ${cfg.color} flex items-center justify-center`}>
              <Icon className="w-4 h-4" />
            </div>
            <span className="text-neutral-700 text-sm">{cfg.label}</span>
          </div>
        );
      },
    },
    {
      key: 'user_id',
      title: 'User',
      render: (value) => {
        if (!value) return <span className="text-neutral-400">—</span>;
        const name = value.full_name || value.username || '—';
        return (
          <div className="flex items-center gap-2">
            {value.avatar_url ? (
              <img src={value.avatar_url} alt={name} className="w-7 h-7 rounded-full object-cover" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-xs font-bold">
                {String(name)[0]?.toUpperCase() || '?'}
              </div>
            )}
            <span className="text-neutral-700 text-sm">{name}</span>
          </div>
        );
      },
    },
    {
      key: 'ad_id',
      title: 'Ad / Post',
      render: (adVal, row) => {
        if (adVal?.title) return <span className="text-neutral-600 text-sm truncate max-w-[140px] block">{adVal.title}</span>;
        if (row.post_id?.type) return <Badge variant="secondary">{row.post_id.type}</Badge>;
        return <span className="text-neutral-400 text-sm">—</span>;
      },
    },
    {
      key: 'amount',
      title: 'Coins',
      render: (value, row) => {
        const isDeduction = normalizeType(row.type) === 'AD_BUDGET_DEDUCTION';
        return (
          <span className={`font-semibold ${isDeduction ? 'text-red-500' : 'text-green-600'}`}>
            {isDeduction ? '-' : '+'}{formatNumber(value ?? 0)}
          </span>
        );
      },
    },
    {
      key: 'status',
      title: 'Status',
      render: (value) => (
        <Badge variant={value === 'SUCCESS' ? 'success' : 'danger'}>{value}</Badge>
      ),
    },
    {
      key: 'createdAt',
      title: 'Date',
      render: (value, row) => formatDateTime(value || row.transactionDate),
    },
  ];

  if (status === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-neutral-500 text-sm">Loading wallet data…</p>
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertCircle className="w-10 h-10 text-red-500" />
        <p className="text-neutral-600 font-medium">Failed to load wallet data</p>
        <p className="text-neutral-400 text-sm">{error}</p>
        <Button variant="primary" icon={RefreshCw} onClick={handleRefresh}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-800">Wallets</h1>
          <p className="text-neutral-500 mt-1">Platform-wide coins &amp; transaction overview</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" icon={RefreshCw} onClick={handleRefresh}>Refresh</Button>
          <Button variant="primary" icon={Download}>Export Report</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Coins Minted"   value={formatCompactNumber(totalCoinsMinted)}    icon={Wallet}          color="bg-gradient-brand" subtitle="AD_REWARD + REEL_VIEW_REWARD" />
        <StatCard title="Coins from Ads"        value={formatCompactNumber(totalCoinsFromAds)}   icon={Star}            color="bg-green-500"      subtitle="AD_REWARD transactions" />
        <StatCard title="Coins from Reels"      value={formatCompactNumber(totalCoinsFromReels)} icon={Eye}             color="bg-purple-500"     subtitle="REEL_VIEW_REWARD transactions" />
        <StatCard title="Total Transactions"    value={formatCompactNumber(totalTxCount)}         icon={ArrowRightLeft}  color="bg-orange-500"     subtitle="All time" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coins Transferred Per Day</CardTitle>
          <CardDescription>Daily volume of coins across the platform</CardDescription>
        </CardHeader>
        {chartData.length === 0 ? (
          <div className="h-80 flex items-center justify-center text-neutral-400 text-sm">No chart data available yet</div>
        ) : (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorTransferred" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#833AB4" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#833AB4" stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => formatCompactNumber(v)} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'white', border: '1px solid #E5E7EB', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                  formatter={(v) => [formatNumber(v), 'Coins']}
                />
                <Area type="monotone" dataKey="transferred" stroke="#833AB4" strokeWidth={2} fillOpacity={1} fill="url(#colorTransferred)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <h3 className="text-lg font-semibold text-neutral-800">All Transactions</h3>
            <p className="text-sm text-neutral-500">{filteredTransactions.length} of {transactions.length} transactions</p>
          </div>
          <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} options={TYPE_OPTIONS} className="w-48" />
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
