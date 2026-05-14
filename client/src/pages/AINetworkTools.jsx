import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { post } from '../api';

const tools = [
  {
    id: 'contact-sync',
    label: 'Contact Sync Assistant',
    icon: '🔗',
    desc: 'Get AI guidance on importing and de-duping contacts from CRM/email exports',
    endpoint: '/ai/contact-sync-assistant',
    fields: [
      { key: 'sourceSystem', label: 'Source System', type: 'text', placeholder: 'e.g., Gmail Contacts, HubSpot, LinkedIn export' },
      { key: 'rawSample', label: 'Raw Sample (paste a few rows)', type: 'textarea', placeholder: 'name,email,company,phone\\nJane Doe,jane@acme.com,Acme,555-1212' },
      { key: 'goal', label: 'Goal', type: 'textarea', placeholder: 'e.g., merge into Best/Good/Rest tiers, dedupe by email...' },
    ],
    sampleData: [
      { label: 'Gmail Import', data: { sourceSystem: 'Gmail Contacts CSV export', rawSample: 'name,email,company\nJohn Smith,john@acme.io,Acme Corp\nJ. Smith,john.smith@acme.io,Acme', goal: 'Dedupe contacts that look like the same person and tag champions.' } },
    ],
  },
  {
    id: 'network-health',
    label: 'Network Health Analyzer',
    icon: '❤️',
    desc: 'Analyze the overall health of your referral network',
    endpoint: '/ai/network-health-analyzer',
    fields: [
      { key: 'metrics', label: 'Network Metrics', type: 'textarea', placeholder: 'e.g., 320 contacts total, 35 active in last 90 days, 12 referrers, last touch dates...' },
      { key: 'concerns', label: 'Specific Concerns (optional)', type: 'textarea', placeholder: 'e.g., declining response rates, only a few champions...' },
    ],
    sampleData: [
      {
        label: 'Mid-size Network',
        data: {
          metrics: 'Total contacts: 412. Active in last 90 days: 58. Top 5 contacts contributed 80% of referrals. 22 contacts have not been touched in 12+ months.',
          concerns: 'Concentration risk and dormant accounts.',
        },
      },
    ],
  },
  {
    id: 'attribution',
    label: 'Referral Source Attribution',
    icon: '📊',
    desc: 'Attribute revenue and ROI to specific referral sources',
    endpoint: '/ai/referral-source-attribution',
    fields: [
      { key: 'sources', label: 'Referral Sources & Activity', type: 'textarea', placeholder: 'e.g., List sources with referrals sent, conversions, and revenue' },
      { key: 'period', label: 'Period', type: 'text', placeholder: 'e.g., Q1 2026' },
    ],
    sampleData: [
      {
        label: 'Quarterly ROI',
        data: {
          sources:
            'Rachel (CPA): 8 referrals, 3 closed, $42K revenue. Mark (broker): 5 referrals, 2 closed, $18K. Past clients: 12 referrals, 7 closed, $61K.',
          period: 'Q1 2026',
        },
      },
    ],
  },
];

export default function AINetworkTools() {
  const [activeId, setActiveId] = useState(tools[0].id);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const tool = tools.find((t) => t.id === activeId);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const data = await post(tool.endpoint, formData);
      setResult(data);
    } catch (err) {
      setError(err.message || 'Failed to get AI response');
    } finally {
      setLoading(false);
    }
  };

  const loadSample = (sampleObj) => {
    setFormData(sampleObj.data);
    setResult(null);
    setError('');
  };

  const getAIContent = () => {
    if (!result) return null;
    if (result.choices?.[0]?.message?.content) return result.choices[0].message.content;
    if (result.error) return `Error: ${result.error.message || JSON.stringify(result.error)}`;
    return JSON.stringify(result, null, 2);
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold gradient-text">AI Network Tools</h1>
        <p className="text-slate-400 mt-1">
          Sync contacts, analyze network health, and attribute referral ROI.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8">
        {tools.map((t) => (
          <div
            key={t.id}
            onClick={() => { setActiveId(t.id); setFormData({}); setResult(null); setError(''); }}
            className={`glass-card rounded-xl p-4 cursor-pointer transition-all hover:scale-[1.02] ${
              activeId === t.id ? 'border-purple-500 shadow-lg shadow-purple-500/10' : 'hover-glow'
            }`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xl">{t.icon}</span>
              <h3 className="text-white font-semibold text-sm">{t.label}</h3>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">{t.desc}</p>
          </div>
        ))}
      </div>

      <div className="glass-card rounded-xl p-6 mb-6 border-purple-500/20">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">{tool.icon}</span>
          <div>
            <h2 className="text-xl font-bold text-white">{tool.label}</h2>
            <p className="text-xs text-slate-500">{tool.desc}</p>
          </div>
        </div>

        {tool.sampleData && tool.sampleData.length > 0 && (
          <div className="mb-5 p-4 bg-slate-800/60 rounded-lg border border-slate-700">
            <p className="text-xs text-slate-400 mb-2.5 font-medium uppercase tracking-wide">
              Quick Fill with Sample Data
            </p>
            <div className="flex flex-wrap gap-2">
              {tool.sampleData.map((sample, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => loadSample(sample)}
                  className="px-3.5 py-2 bg-gradient-to-r from-indigo-600/30 to-purple-600/30 hover:from-indigo-600/50 hover:to-purple-600/50 text-indigo-300 hover:text-white rounded-lg text-xs font-medium transition-all border border-indigo-500/30 hover:border-indigo-400/50"
                >
                  {sample.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {tool.fields.map((field) => (
            <div key={field.key}>
              <label className="block text-sm text-slate-400 mb-1">{field.label}</label>
              {field.type === 'textarea' ? (
                <textarea
                  value={formData[field.key] || ''}
                  onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                  placeholder={field.placeholder}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-purple-500 transition placeholder-slate-500"
                  rows={4}
                />
              ) : (
                <input
                  type={field.type}
                  value={formData[field.key] || ''}
                  onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                  placeholder={field.placeholder}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-purple-500 transition placeholder-slate-500"
                />
              )}
            </div>
          ))}
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-lg hover:from-purple-500 hover:to-pink-500 transition-all disabled:opacity-50"
            >
              {loading ? 'AI is thinking...' : 'Run Analysis'}
            </button>
            <button
              type="button"
              onClick={() => setFormData({})}
              className="px-5 py-3 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm transition"
            >
              Clear Form
            </button>
          </div>
        </form>
      </div>

      {error && (
        <div className="glass-card rounded-xl p-4 mb-6 border-red-500/40 text-red-400 text-sm">
          {error}
        </div>
      )}

      {result && (
        <div className="glass-card rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-3">Result</h3>
          <div className="prose prose-invert max-w-none text-sm">
            <ReactMarkdown>{getAIContent() || ''}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}
