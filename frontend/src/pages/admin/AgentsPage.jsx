import { useState, useEffect, useCallback } from 'react';
import { Users, UserPlus, ToggleLeft, ToggleRight } from 'lucide-react';
import { agentsAPI, authAPI } from '../../services/api';
import { Spinner, Modal, EmptyState } from '../../components/ui';
import { formatCurrency } from '../../utils/formatters';

const INIT_FORM = { name: '', email: '', password: '', phone: '', role: 'agent' };

// ── AgentFormField OUTSIDE the page — prevents remount on every keystroke ─────
function AgentFormField({ label, value, onChange, type = 'text', required }) {
  return (
    <div>
      <label className="label">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        className="input"
        value={value}
        onChange={onChange}
        autoComplete={type === 'password' ? 'new-password' : 'off'}
      />
    </div>
  );
}

export default function AgentsPage() {
  const [agents, setAgents]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [addModal, setAddModal]   = useState(false);
  const [form, setForm]           = useState(INIT_FORM);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await agentsAPI.list();
      setAgents(data.agents);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  // Stable per-key handler
  const updateForm = useCallback((key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
  }, []);

  const makeHandler = (key) => (e) => updateForm(key, e.target.value);

  const handleToggle = async (id) => {
    try {
      const { data } = await agentsAPI.toggle(id);
      setAgents(a => a.map(ag => ag._id === id ? { ...ag, isActive: data.agent.isActive } : ag));
    } catch {}
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name || !form.email || !form.password) {
      setError('Name, email and password required');
      return;
    }
    setSaving(true);
    try {
      await authAPI.register(form);
      setAddModal(false);
      setForm(INIT_FORM);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally { setSaving(false); }
  };

  const openAdd = () => { setError(''); setForm(INIT_FORM); setAddModal(true); };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agents</h1>
          <p className="text-gray-500 text-sm">{agents.length} registered agents</p>
        </div>
        <button onClick={openAdd} className="btn-primary">
          <UserPlus size={16} /> Add agent
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : agents.length === 0 ? (
        <EmptyState icon={Users} title="No agents yet"
          subtitle="Add your first agent to get started"
          action="Add agent" onAction={openAdd} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map(agent => (
            <div key={agent._id} className="card p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-lg">
                    {agent.name[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{agent.name}</p>
                    <p className="text-xs text-gray-500">{agent.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleToggle(agent._id)}
                  className="text-gray-400 hover:text-blue-600 transition-colors"
                  title={agent.isActive ? 'Deactivate' : 'Activate'}
                >
                  {agent.isActive
                    ? <ToggleRight size={24} className="text-green-500" />
                    : <ToggleLeft size={24} />
                  }
                </button>
              </div>

              {agent.phone && (
                <p className="text-sm text-gray-500 mb-3">📞 {agent.phone}</p>
              )}

              <div className="flex justify-between text-sm border-t pt-3">
                <div className="text-center">
                  <p className="font-bold text-gray-900">{agent.invoiceCount || 0}</p>
                  <p className="text-gray-400 text-xs">Invoices</p>
                </div>
                <div className="text-center">
                  <p className="font-bold text-blue-700">{formatCurrency(agent.totalAmount || 0)}</p>
                  <p className="text-gray-400 text-xs">Revenue</p>
                </div>
                <div className="text-center">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    agent.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {agent.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add agent modal */}
      <Modal open={addModal} onClose={() => setAddModal(false)} title="Add new agent" size="sm">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}
        <form onSubmit={handleAdd} className="space-y-4">
          <AgentFormField label="Name"     value={form.name}     onChange={makeHandler('name')}     type="text"     required />
          <AgentFormField label="Email"    value={form.email}    onChange={makeHandler('email')}    type="email"    required />
          <AgentFormField label="Password" value={form.password} onChange={makeHandler('password')} type="password" required />
          <AgentFormField label="Phone"    value={form.phone}    onChange={makeHandler('phone')}    type="tel" />
          <div>
            <label className="label">Role</label>
            <select className="input" value={form.role} onChange={makeHandler('role')}>
              <option value="agent">Agent</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <button type="submit" disabled={saving} className="btn-primary w-full justify-center">
            {saving ? 'Adding...' : 'Add agent'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
