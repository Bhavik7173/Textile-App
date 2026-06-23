import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Layers, Eye, EyeOff, AlertCircle, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const [form, setForm]    = useState({ email: '', password: '' });
  const [show, setShow]    = useState(false);
  const [error, setError]  = useState('');
  const { login, loading } = useAuth();
  const navigate           = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.email || !form.password) { setError('Please enter email and password.'); return; }
    try {
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Check your credentials.');
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      {/* Left — branding */}
      <div className="hidden lg:flex flex-1 flex-col justify-center px-16 text-white">
        <div className="flex items-center gap-3 mb-12">
          <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
            <Layers size={24} className="text-white" />
          </div>
          <span className="text-2xl font-bold">TextilePro</span>
        </div>
        <h1 className="text-5xl font-bold leading-tight mb-6">
          Smart billing<br />for textile<br />businesses
        </h1>
        <p className="text-white/70 text-lg max-w-sm leading-relaxed">
          GST-compliant invoicing, payment tracking, customer management — everything in one place.
        </p>
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[['500+','Invoices','created'],['100%','GST','compliant'],['24/7','Access','anywhere']].map(([n,l,s]) => (
            <div key={l} className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
              <p className="text-2xl font-bold">{n}</p>
              <p className="text-white/80 text-sm">{l}</p>
              <p className="text-white/50 text-xs">{s}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right — form */}
      <div className="flex-1 lg:max-w-md flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-3xl shadow-2xl p-8">
            {/* Logo mobile */}
            <div className="flex items-center gap-2 mb-8 lg:hidden">
              <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center">
                <Layers size={18} className="text-white" />
              </div>
              <span className="font-bold text-gray-900">TextilePro</span>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-1">Welcome back</h2>
            <p className="text-gray-400 text-sm mb-8">Sign in to your account</p>

            {error && (
              <div className="flex items-center gap-2.5 p-3.5 bg-red-50 border border-red-100 rounded-xl mb-5 text-sm text-red-600">
                <AlertCircle size={15} className="shrink-0" />{error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Email address</label>
                <input type="email" className="input" placeholder="you@company.com"
                  value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <input type={show ? 'text' : 'password'} className="input pr-11"
                    placeholder="Enter password"
                    value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
                  <button type="button" onClick={() => setShow(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1">
                    {show ? <EyeOff size={16}/> : <Eye size={16}/>}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full btn-primary justify-center py-3 mt-2 text-base shadow-lg shadow-indigo-200">
                {loading ? 'Signing in...' : <>Sign in <ArrowRight size={16}/></>}
              </button>
            </form>

            {/* Demo */}
            <div className="mt-6 p-4 bg-gray-50 rounded-2xl">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Demo accounts</p>
              <div className="space-y-1.5">
                {[
                  ['Admin','admin@company.com','Admin@1234'],
                  ['Agent','omtextile@company.com','Agent@1234'],
                  ['Agent','radheyshyam@company.com','Agent@1234'],
                  ['Agent','riyatextile@company.com','Agent@1234'],
                ].map(([role, email, pass]) => (
                  <button key={role} type="button"
                    onClick={() => setForm({ email, password: pass })}
                    className="w-full text-left flex items-center justify-between p-2.5 rounded-xl hover:bg-white transition-colors group">
                    <div>
                      <span className="text-xs font-semibold text-gray-700">{role}</span>
                      <p className="text-xs text-gray-400">{email}</p>
                    </div>
                    <span className="text-xs text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity">Use →</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
