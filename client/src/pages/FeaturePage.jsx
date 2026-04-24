import React, { useState, useEffect } from 'react';
import { get, post, put, del } from '../api';

const featureConfig = {
  contacts: {
    endpoint: '/contacts',
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'email', label: 'Email', type: 'email' },
      { key: 'phone', label: 'Phone', type: 'text' },
      { key: 'company', label: 'Company', type: 'text' },
      { key: 'role', label: 'Role', type: 'text' },
      { key: 'relationship_level', label: 'Relationship Level', type: 'select', options: ['cold', 'warm', 'hot'] },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ],
    columns: ['name', 'company', 'role', 'relationship_level'],
    badge: 'relationship_level',
    badgeColors: { cold: 'bg-blue-500/20 text-blue-400', warm: 'bg-amber-500/20 text-amber-400', hot: 'bg-red-500/20 text-red-400' },
  },
  referrals: {
    endpoint: '/referrals',
    fields: [
      { key: 'referrer_id', label: 'Referrer ID', type: 'number' },
      { key: 'referred_id', label: 'Referred ID', type: 'number' },
      { key: 'status', label: 'Status', type: 'select', options: ['pending', 'in_progress', 'closed', 'lost'] },
      { key: 'value', label: 'Value ($)', type: 'number' },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ],
    columns: ['referrer_name', 'referred_name', 'status', 'value'],
    badge: 'status',
    badgeColors: { pending: 'bg-yellow-500/20 text-yellow-400', in_progress: 'bg-blue-500/20 text-blue-400', closed: 'bg-green-500/20 text-green-400', lost: 'bg-red-500/20 text-red-400' },
    formatters: { value: (v) => v ? `$${Number(v).toLocaleString()}` : '$0' },
  },
  clients: {
    endpoint: '/clients',
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'email', label: 'Email', type: 'email' },
      { key: 'phone', label: 'Phone', type: 'text' },
      { key: 'company', label: 'Company', type: 'text' },
      { key: 'tier', label: 'Tier', type: 'select', options: ['best', 'good', 'rest'] },
      { key: 'lifetime_value', label: 'Lifetime Value ($)', type: 'number' },
      { key: 'last_contact', label: 'Last Contact', type: 'date' },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ],
    columns: ['name', 'company', 'tier', 'lifetime_value'],
    badge: 'tier',
    badgeColors: { best: 'bg-emerald-500/20 text-emerald-400', good: 'bg-blue-500/20 text-blue-400', rest: 'bg-slate-500/20 text-slate-400' },
    formatters: { lifetime_value: (v) => v ? `$${Number(v).toLocaleString()}` : '$0' },
  },
  influencers: {
    endpoint: '/influencers',
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'email', label: 'Email', type: 'email' },
      { key: 'phone', label: 'Phone', type: 'text' },
      { key: 'company', label: 'Company', type: 'text' },
      { key: 'industry', label: 'Industry', type: 'text' },
      { key: 'influence_score', label: 'Influence Score (1-10)', type: 'number' },
      { key: 'network_size', label: 'Network Size', type: 'number' },
      { key: 'relationship_status', label: 'Status', type: 'select', options: ['cold', 'warm', 'hot'] },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ],
    columns: ['name', 'company', 'industry', 'influence_score', 'relationship_status'],
    badge: 'relationship_status',
    badgeColors: { cold: 'bg-blue-500/20 text-blue-400', warm: 'bg-amber-500/20 text-amber-400', hot: 'bg-red-500/20 text-red-400' },
  },
  chains: {
    endpoint: '/chains',
    fields: [
      { key: 'chain_name', label: 'Chain Name', type: 'text', required: true },
      { key: 'origin_contact', label: 'Origin Contact', type: 'text' },
      { key: 'chain_links', label: 'Chain Links', type: 'textarea' },
      { key: 'total_value', label: 'Total Value ($)', type: 'number' },
      { key: 'total_referrals', label: 'Total Referrals', type: 'number' },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ],
    columns: ['chain_name', 'origin_contact', 'total_value', 'total_referrals'],
    formatters: { total_value: (v) => v ? `$${Number(v).toLocaleString()}` : '$0' },
  },
  gifts: {
    endpoint: '/gifts',
    fields: [
      { key: 'recipient_name', label: 'Recipient', type: 'text', required: true },
      { key: 'gift_type', label: 'Gift Type', type: 'text' },
      { key: 'description', label: 'Description', type: 'textarea' },
      { key: 'cost', label: 'Cost ($)', type: 'number' },
      { key: 'date_sent', label: 'Date Sent', type: 'date' },
      { key: 'occasion', label: 'Occasion', type: 'text' },
      { key: 'response_received', label: 'Response Received', type: 'checkbox' },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ],
    columns: ['recipient_name', 'gift_type', 'occasion', 'cost'],
    formatters: { cost: (v) => v ? `$${Number(v).toLocaleString()}` : '$0' },
  },
  stories: {
    endpoint: '/stories',
    fields: [
      { key: 'client_name', label: 'Client Name', type: 'text', required: true },
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'story', label: 'Story', type: 'textarea' },
      { key: 'outcome', label: 'Outcome', type: 'textarea' },
      { key: 'referrals_generated', label: 'Referrals Generated', type: 'number' },
      { key: 'category', label: 'Category', type: 'text' },
      { key: 'is_featured', label: 'Featured', type: 'checkbox' },
    ],
    columns: ['client_name', 'title', 'category', 'referrals_generated'],
  },
  'ideal-clients': {
    endpoint: '/ideal-clients',
    fields: [
      { key: 'profile_name', label: 'Profile Name', type: 'text', required: true },
      { key: 'industry', label: 'Industry', type: 'text' },
      { key: 'company_size', label: 'Company Size', type: 'text' },
      { key: 'revenue_range', label: 'Revenue Range', type: 'text' },
      { key: 'job_titles', label: 'Job Titles', type: 'textarea' },
      { key: 'pain_points', label: 'Pain Points', type: 'textarea' },
      { key: 'ideal_outcome', label: 'Ideal Outcome', type: 'textarea' },
      { key: 'priority', label: 'Priority (1-5)', type: 'number' },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ],
    columns: ['profile_name', 'industry', 'company_size', 'priority'],
  },
  testimonials: {
    endpoint: '/testimonials',
    fields: [
      { key: 'client_name', label: 'Client Name', type: 'text', required: true },
      { key: 'company', label: 'Company', type: 'text' },
      { key: 'testimonial_text', label: 'Testimonial', type: 'textarea' },
      { key: 'rating', label: 'Rating (1-5)', type: 'number' },
      { key: 'type', label: 'Type', type: 'select', options: ['written', 'video', 'audio'] },
      { key: 'is_public', label: 'Public', type: 'checkbox' },
      { key: 'date_received', label: 'Date Received', type: 'date' },
    ],
    columns: ['client_name', 'company', 'rating', 'type'],
    badge: 'type',
    badgeColors: { written: 'bg-blue-500/20 text-blue-400', video: 'bg-purple-500/20 text-purple-400', audio: 'bg-green-500/20 text-green-400' },
  },
  nurturing: {
    endpoint: '/nurturing',
    fields: [
      { key: 'contact_name', label: 'Contact Name', type: 'text', required: true },
      { key: 'activity_type', label: 'Activity Type', type: 'text' },
      { key: 'description', label: 'Description', type: 'textarea' },
      { key: 'last_interaction', label: 'Last Interaction', type: 'date' },
      { key: 'next_action_date', label: 'Next Action Date', type: 'date' },
      { key: 'frequency', label: 'Frequency', type: 'select', options: ['weekly', 'biweekly', 'monthly', 'quarterly', 'semi-annual', 'annual'] },
      { key: 'status', label: 'Status', type: 'select', options: ['active', 'paused', 'overdue', 'completed'] },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ],
    columns: ['contact_name', 'activity_type', 'frequency', 'status'],
    badge: 'status',
    badgeColors: { active: 'bg-green-500/20 text-green-400', paused: 'bg-yellow-500/20 text-yellow-400', overdue: 'bg-red-500/20 text-red-400', completed: 'bg-blue-500/20 text-blue-400' },
  },
  expectations: {
    endpoint: '/expectations',
    fields: [
      { key: 'client_name', label: 'Client Name', type: 'text', required: true },
      { key: 'expectation_set', label: 'Expectation Set', type: 'textarea' },
      { key: 'date_set', label: 'Date Set', type: 'date' },
      { key: 'response', label: 'Client Response', type: 'textarea' },
      { key: 'follow_up_date', label: 'Follow Up Date', type: 'date' },
      { key: 'status', label: 'Status', type: 'select', options: ['set', 'in_progress', 'fulfilled', 'expired'] },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ],
    columns: ['client_name', 'status', 'date_set', 'follow_up_date'],
    badge: 'status',
    badgeColors: { set: 'bg-blue-500/20 text-blue-400', in_progress: 'bg-yellow-500/20 text-yellow-400', fulfilled: 'bg-green-500/20 text-green-400', expired: 'bg-red-500/20 text-red-400' },
  },
  rewards: {
    endpoint: '/rewards',
    fields: [
      { key: 'referrer_name', label: 'Referrer Name', type: 'text', required: true },
      { key: 'reward_type', label: 'Reward Type', type: 'text' },
      { key: 'description', label: 'Description', type: 'textarea' },
      { key: 'value', label: 'Value ($)', type: 'number' },
      { key: 'date_given', label: 'Date Given', type: 'date' },
      { key: 'referral_source', label: 'Referral Source', type: 'text' },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ],
    columns: ['referrer_name', 'reward_type', 'value', 'date_given'],
    formatters: { value: (v) => v ? `$${Number(v).toLocaleString()}` : '$0' },
  },
  pipeline: {
    endpoint: '/pipeline',
    fields: [
      { key: 'prospect_name', label: 'Prospect Name', type: 'text', required: true },
      { key: 'company', label: 'Company', type: 'text' },
      { key: 'source', label: 'Source', type: 'text' },
      { key: 'stage', label: 'Stage', type: 'select', options: ['lead', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost'] },
      { key: 'estimated_value', label: 'Estimated Value ($)', type: 'number' },
      { key: 'probability', label: 'Probability (%)', type: 'number' },
      { key: 'expected_close', label: 'Expected Close', type: 'date' },
      { key: 'assigned_to', label: 'Assigned To', type: 'text' },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ],
    columns: ['prospect_name', 'company', 'stage', 'estimated_value'],
    badge: 'stage',
    badgeColors: { lead: 'bg-slate-500/20 text-slate-400', qualified: 'bg-blue-500/20 text-blue-400', proposal: 'bg-purple-500/20 text-purple-400', negotiation: 'bg-amber-500/20 text-amber-400', closed_won: 'bg-green-500/20 text-green-400', closed_lost: 'bg-red-500/20 text-red-400' },
    formatters: { estimated_value: (v) => v ? `$${Number(v).toLocaleString()}` : '$0' },
  },
};

function formatLabel(key) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function FeaturePage({ feature, title }) {
  const config = featureConfig[feature];
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadItems();
  }, [feature]);

  const loadItems = async () => {
    setLoading(true);
    setSelected(null);
    setShowForm(false);
    try {
      const data = await get(config.endpoint);
      setItems(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRowClick = async (item) => {
    try {
      const detail = await get(`${config.endpoint}/${item.id}`);
      setSelected(detail);
      setShowForm(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleNew = () => {
    setFormData({});
    setEditItem(null);
    setShowForm(true);
    setSelected(null);
  };

  const handleEdit = (item) => {
    const data = {};
    config.fields.forEach((f) => {
      let val = item[f.key];
      if (f.type === 'date' && val) val = val.split('T')[0];
      if (f.type === 'checkbox') val = !!val;
      data[f.key] = val ?? '';
    });
    setFormData(data);
    setEditItem(item);
    setShowForm(true);
    setSelected(null);
  };

  const handleDelete = async (item) => {
    if (!confirm(`Delete this item?`)) return;
    try {
      await del(`${config.endpoint}/${item.id}`);
      loadItems();
      setSelected(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editItem) {
        await put(`${config.endpoint}/${editItem.id}`, formData);
      } else {
        await post(config.endpoint, formData);
      }
      loadItems();
    } catch (err) {
      alert(err.message);
    }
  };

  const renderValue = (item, col) => {
    const val = item[col];
    if (config.formatters?.[col]) return config.formatters[col](val);
    if (config.badge === col && val) {
      const colorClass = config.badgeColors?.[val] || 'bg-slate-500/20 text-slate-400';
      return <span className={`px-2 py-1 rounded-full text-xs font-medium ${colorClass}`}>{val}</span>;
    }
    if (val === true) return <span className="text-green-400">Yes</span>;
    if (val === false) return <span className="text-slate-500">No</span>;
    if (val === null || val === undefined) return <span className="text-slate-600">—</span>;
    return String(val).length > 50 ? String(val).slice(0, 50) + '...' : String(val);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold gradient-text">{title}</h1>
          <p className="text-slate-400 mt-1">{items.length} items</p>
        </div>
        <button
          onClick={handleNew}
          className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-500 hover:to-purple-500 transition-all"
        >
          + New Item
        </button>
      </div>

      {/* Detail Panel */}
      {selected && (
        <div className="glass-card rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Item Details</h2>
            <div className="flex gap-2">
              <button onClick={() => handleEdit(selected)} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm transition">Edit</button>
              <button onClick={() => handleDelete(selected)} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm transition">Delete</button>
              <button onClick={() => setSelected(null)} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition">Close</button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {config.fields.map((field) => (
              <div key={field.key} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
                <label className="text-sm text-slate-400 font-medium">{field.label}</label>
                <div className="mt-1 text-white bg-slate-800/50 rounded-lg p-3 min-h-[40px]">
                  {field.type === 'checkbox'
                    ? (selected[field.key] ? 'Yes' : 'No')
                    : (field.type === 'date' && selected[field.key]
                      ? new Date(selected[field.key]).toLocaleDateString()
                      : (config.formatters?.[field.key]
                        ? config.formatters[field.key](selected[field.key])
                        : selected[field.key] || '—'))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="glass-card rounded-xl p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-4">{editItem ? 'Edit Item' : 'New Item'}</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {config.fields.map((field) => (
              <div key={field.key} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
                <label className="block text-sm text-slate-400 mb-1">{field.label}</label>
                {field.type === 'textarea' ? (
                  <textarea
                    value={formData[field.key] || ''}
                    onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500 transition"
                    rows={3}
                  />
                ) : field.type === 'select' ? (
                  <select
                    value={formData[field.key] || ''}
                    onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500 transition"
                  >
                    <option value="">Select...</option>
                    {field.options.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : field.type === 'checkbox' ? (
                  <input
                    type="checkbox"
                    checked={!!formData[field.key]}
                    onChange={(e) => setFormData({ ...formData, [field.key]: e.target.checked })}
                    className="mt-2 h-5 w-5 rounded bg-slate-800 border-slate-600 text-blue-500 focus:ring-blue-500"
                  />
                ) : (
                  <input
                    type={field.type}
                    value={formData[field.key] || ''}
                    onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                    required={field.required}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500 transition"
                  />
                )}
              </div>
            ))}
            <div className="md:col-span-2 flex gap-3 mt-2">
              <button type="submit" className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-500 hover:to-purple-500 transition-all">
                {editItem ? 'Update' : 'Create'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-slate-400 text-lg">No items yet</p>
          <button onClick={handleNew} className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition">
            Add your first item
          </button>
        </div>
      ) : (
        <div className="glass-card rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                {config.columns.map((col) => (
                  <th key={col} className="px-4 py-3 text-left text-sm font-medium text-slate-400 uppercase tracking-wider">
                    {formatLabel(col)}
                  </th>
                ))}
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => handleRowClick(item)}
                  className="border-b border-slate-800 hover:bg-slate-800/50 cursor-pointer transition-colors"
                >
                  {config.columns.map((col) => (
                    <td key={col} className="px-4 py-3 text-sm text-slate-300">
                      {renderValue(item, col)}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-right">
                    <div className="flex gap-2 justify-end" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => handleEdit(item)} className="px-3 py-1 bg-blue-600/20 text-blue-400 rounded text-xs hover:bg-blue-600/30 transition">Edit</button>
                      <button onClick={() => handleDelete(item)} className="px-3 py-1 bg-red-600/20 text-red-400 rounded text-xs hover:bg-red-600/30 transition">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
