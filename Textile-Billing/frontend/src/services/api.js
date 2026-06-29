import axios from 'axios';

// In the browser (served by Nginx) this stays '/api'.
// In the Capacitor .apk build, set VITE_API_URL to the full server URL,
// e.g. https://yourdomain.com/api  (or http://13.62.231.10/api)
export const API_BASE = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(r => r, err => {
  if (err.response?.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  }
  return Promise.reject(err);
});

export const authAPI = {
  login:    (d) => api.post('/auth/login', d),
  register: (d) => api.post('/auth/register', d),
  me:       ()  => api.get('/auth/me'),
};

export const invoiceAPI = {
  create:       (d)         => api.post('/invoices', d),
  list:         (p)         => api.get('/invoices', { params: p }),
  getById:      (id)        => api.get(`/invoices/${id}`),
  updateStatus: (id, s)     => api.put(`/invoices/${id}/status`, { status: s }),
  delete:       (id)        => api.delete(`/invoices/${id}`),
  sendEmail:    (id, email) => api.post(`/invoices/${id}/send-email`, { email }),
  whatsapp:     (id, phone) => api.post(`/invoices/${id}/whatsapp`, { phone }),
  duplicate:    (id)        => api.post(`/invoices/${id}/duplicate`),
};

export const customerAPI = {
  list:   (p)  => api.get('/customers', { params: p }),
  getById:(id) => api.get(`/customers/${id}`),
  invoices:(id)=> api.get(`/customers/${id}/invoices`),
  create: (d)  => api.post('/customers', d),
  update: (id, d) => api.put(`/customers/${id}`, d),
  delete: (id) => api.delete(`/customers/${id}`),
};

export const paymentAPI = {
  list:   (p)  => api.get('/payments', { params: p }),
  create: (d)  => api.post('/payments', d),
  delete: (id) => api.delete(`/payments/${id}`),
};

export const statsAPI   = { get: () => api.get('/stats') };

export const agentsAPI  = {
  list:   ()   => api.get('/agents'),
  toggle: (id) => api.put(`/agents/${id}/toggle`),
};

export const companyAPI = {
  get:    ()  => api.get('/company'),
  update: (d) => api.put('/company', d),
};

export const utilAPI = {
  nextInvoiceNo: ()       => api.get('/util/next-invoice-no'),
  exportExcel:   (params) => {
    const token = localStorage.getItem('token');
    const qs = new URLSearchParams(params).toString();
    window.open(`${API_BASE}/util/export/excel?${qs}&token=${token}`, '_blank');
  },
};

export const ledgerAPI = { get: () => api.get('/ledger') };

export const stockAPI = {
  list:       (p)      => api.get('/stock', { params: p }),
  create:     (d)      => api.post('/stock', d),
  update:     (id, d)  => api.put(`/stock/${id}`, d),
  delete:     (id)     => api.delete(`/stock/${id}`),
  addEntry:   (id, d)  => api.post(`/stock/${id}/entry`, d),
  entries:    (id)     => api.get(`/stock/${id}/entries`),
};

export const expenseAPI = {
  list:   (p)      => api.get('/expenses', { params: p }),
  create: (d)      => api.post('/expenses', d),
  update: (id, d)  => api.put(`/expenses/${id}`, d),
  delete: (id)     => api.delete(`/expenses/${id}`),
};

export const reportAPI = {
  firmSummary:    (p) => api.get('/reports/firm-summary', { params: p }),
  dueAlerts:      (p) => api.get('/reports/due-alerts', { params: p }),
  customerLedger: (p) => api.get('/reports/customer-ledger', { params: p }),
  gstr1Export: (firmId, month, year) => {
    const token = localStorage.getItem('token');
    window.open(`${API_BASE}/reports/gstr1?firmId=${firmId}&month=${month}&year=${year}&token=${token}`, '_blank');
  },
};

export const firmAPI = {
  list:    ()        => api.get('/firms'),
  getById: (id)      => api.get(`/firms/${id}`),
  create:  (d)       => api.post('/firms', d),
  update:  (id, d)   => api.put(`/firms/${id}`, d),
  delete:  (id)      => api.delete(`/firms/${id}`),
};

export const challanAPI = {
  create:  (d)  => api.post('/challans', d),
  list:    (p)  => api.get('/challans', { params: p }),
  getById: (id) => api.get(`/challans/${id}`),
  delete:  (id) => api.delete(`/challans/${id}`),
  downloadPDF: async (id, filename) => {
    const token = localStorage.getItem('token');
    const res   = await fetch(`${API_BASE}/challans/${id}/pdf`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to generate challan PDF');
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = filename || 'Challan.pdf';
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  },
};

export default api;

export const analyticsAPI = {
  revenueTrend:    (p) => api.get('/analytics/revenue-trend', { params: p }),
  topCustomers:    ()  => api.get('/analytics/top-customers'),
  statusBreakdown: ()  => api.get('/analytics/status-breakdown'),
  agentPerformance:()  => api.get('/analytics/agent-performance'),
  gstBreakdown:    ()  => api.get('/analytics/gst-breakdown'),
  itemSales:       ()  => api.get('/analytics/item-sales'),
  collectionRate:  ()  => api.get('/analytics/collection-rate'),
  aging:           ()  => api.get('/analytics/aging'),
  activity:        (p) => api.get('/analytics/activity', { params: p }),
  notifications:   ()  => api.get('/analytics/notifications'),
  reminders:       ()  => api.get('/analytics/reminders'),
  createReminder:  (d) => api.post('/analytics/reminders', d),
  doneReminder:    (id)=> api.put(`/analytics/reminders/${id}/done`),
  deleteReminder:  (id)=> api.delete(`/analytics/reminders/${id}`),
};

export const invoiceBulkAPI = {
  bulkStatus: (ids, status) => api.put('/invoices/bulk-status', { ids, status }),
  updateNotes:(id, notes)   => api.put(`/invoices/${id}/notes`, { notes }),
};
