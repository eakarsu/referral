import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { get } from '../api';

const cards = [
  { key: 'contacts', label: 'Contacts', path: '/contacts', icon: '👥', color: 'from-blue-600 to-blue-800', desc: 'Manage relationships' },
  { key: 'referrals', label: 'Referrals', path: '/referrals', icon: '🔗', color: 'from-purple-600 to-purple-800', desc: 'Track referrals', showValue: true },
  { key: 'clients', label: 'Clients', path: '/clients', icon: '💼', color: 'from-emerald-600 to-emerald-800', desc: 'Client tiers (Best/Good/Rest)', showValue: true },
  { key: 'influencers', label: 'Influencers', path: '/influencers', icon: '⭐', color: 'from-amber-600 to-amber-800', desc: 'Centers of influence' },
  { key: 'chains', label: 'Referral Chains', path: '/chains', icon: '⛓️', color: 'from-rose-600 to-rose-800', desc: 'Track referral chains', showValue: true },
  { key: 'gifts', label: 'Gifts & Thanks', path: '/gifts', icon: '🎁', color: 'from-pink-600 to-pink-800', desc: 'Thoughtful gestures' },
  { key: 'stories', label: 'Client Stories', path: '/stories', icon: '📖', color: 'from-indigo-600 to-indigo-800', desc: 'Success stories' },
  { key: 'idealProfiles', label: 'Ideal Clients', path: '/ideal-clients', icon: '🎯', color: 'from-cyan-600 to-cyan-800', desc: 'Know your ideal client' },
  { key: 'testimonials', label: 'Testimonials', path: '/testimonials', icon: '💬', color: 'from-teal-600 to-teal-800', desc: 'Reviews & social proof' },
  { key: 'nurturing', label: 'Nurturing', path: '/nurturing', icon: '🌱', color: 'from-green-600 to-green-800', desc: 'Water relationships' },
  { key: 'expectations', label: 'Expectations', path: '/expectations', icon: '🤝', color: 'from-orange-600 to-orange-800', desc: 'Set expectations upfront' },
  { key: 'rewards', label: 'Rewards', path: '/rewards', icon: '🏆', color: 'from-yellow-600 to-yellow-800', desc: 'Reward referrers', showValue: true },
  { key: 'pipeline', label: 'Pipeline', path: '/pipeline', icon: '📈', color: 'from-violet-600 to-violet-800', desc: 'Sales pipeline', showValue: true },
];

function formatCurrency(v) {
  if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `$${(v / 1000).toFixed(0)}K`;
  return `$${v}`;
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    get('/dashboard/stats').then(setStats).catch(console.error);
  }, []);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold gradient-text">Dashboard</h1>
        <p className="text-slate-400 mt-1">Your referral mastery command center</p>
      </div>

      {/* Principle Banner */}
      <div className="glass-card rounded-xl p-6 mb-8 border-l-4 border-blue-500">
        <h2 className="text-lg font-semibold text-blue-400 mb-2">Patrick Bet-David's Referral Framework</h2>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="bg-slate-800/50 rounded-lg p-3">
            <span className="text-emerald-400 font-bold">Finders</span>
            <p className="text-slate-400 mt-1">Generate opportunities through networking and outreach</p>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-3">
            <span className="text-amber-400 font-bold">Closers</span>
            <p className="text-slate-400 mt-1">Convert opportunities into clients and revenue</p>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-3">
            <span className="text-purple-400 font-bold">Builders</span>
            <p className="text-slate-400 mt-1">Deepen relationships and create long-term value</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {cards.map((card) => {
          const stat = stats?.[card.key];
          return (
            <div
              key={card.key}
              onClick={() => navigate(card.path)}
              className="glass-card rounded-xl p-5 cursor-pointer hover-glow transition-all hover:scale-[1.02] hover:border-blue-500/50"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-3xl">{card.icon}</span>
                <span className={`px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r ${card.color} text-white`}>
                  {stat?.count ?? '—'}
                </span>
              </div>
              <h3 className="text-white font-semibold text-lg">{card.label}</h3>
              <p className="text-slate-400 text-sm mt-1">{card.desc}</p>
              {card.showValue && stat?.totalValue > 0 && (
                <p className="text-emerald-400 font-bold mt-2 text-lg">{formatCurrency(stat.totalValue)}</p>
              )}
              {card.showValue && stat?.totalCost > 0 && (
                <p className="text-pink-400 font-bold mt-2">{formatCurrency(stat.totalCost)} invested</p>
              )}
            </div>
          );
        })}
        {/* AI Coach Card */}
        <div
          onClick={() => navigate('/ai-coach')}
          className="glass-card rounded-xl p-5 cursor-pointer hover-glow transition-all hover:scale-[1.02] hover:border-purple-500/50 border-purple-500/30"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-3xl">🤖</span>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-purple-600 to-pink-600 text-white">
              AI
            </span>
          </div>
          <h3 className="text-white font-semibold text-lg">AI Referral Coach</h3>
          <p className="text-slate-400 text-sm mt-1">Get AI-powered referral advice, scripts, and strategies</p>
        </div>
      </div>
    </div>
  );
}
