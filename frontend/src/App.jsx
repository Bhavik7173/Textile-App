import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { FirmProvider } from './context/FirmContext';
import Layout from './components/layout/Layout';

import LoginPage          from './pages/auth/LoginPage';
import DashboardPage      from './pages/agent/DashboardPage';
import InvoiceListPage    from './pages/agent/InvoiceListPage';
import CreateInvoicePage  from './pages/agent/CreateInvoicePage';
import InvoiceDetailPage  from './pages/agent/InvoiceDetailPage';
import PrintPreviewPage   from './pages/agent/PrintPreviewPage';
import AgentsPage         from './pages/admin/AgentsPage';
import SettingsPage       from './pages/admin/SettingsPage';
import CustomersPage      from './pages/customers/CustomersPage';
import LedgerPage         from './pages/ledger/LedgerPage';
import AnalyticsPage      from './pages/analytics/AnalyticsPage';
import ChallanPage        from './pages/agent/CreateChallanPage';
import ChallanListPage    from './pages/agent/ChallanListPage';
import ReportsPage        from './pages/reports/ReportsPage';
import StockPage          from './pages/stock/StockPage';
import ExpensesPage       from './pages/expenses/ExpensesPage';
import CustomerLedgerPage from './pages/ledger2/CustomerLedgerPage';

function PrivateRoute({ children, adminOnly = false, noLayout = false }) {
  const { user, isAdmin } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/dashboard" replace />;
  if (noLayout) return children;
  return <Layout>{children}</Layout>;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard"/> : <LoginPage/>}/>

      <Route path="/dashboard"          element={<PrivateRoute><DashboardPage/></PrivateRoute>}/>
      <Route path="/invoices"           element={<PrivateRoute><InvoiceListPage/></PrivateRoute>}/>
      <Route path="/invoices/new"       element={<PrivateRoute><CreateInvoicePage/></PrivateRoute>}/>
      <Route path="/invoices/:id"       element={<PrivateRoute><InvoiceDetailPage/></PrivateRoute>}/>
      <Route path="/invoices/:id/print" element={<PrivateRoute noLayout><PrintPreviewPage/></PrivateRoute>}/>

      <Route path="/challans"           element={<PrivateRoute><ChallanListPage/></PrivateRoute>}/>
      <Route path="/challans/new"       element={<PrivateRoute><ChallanPage/></PrivateRoute>}/>
      <Route path="/reports"            element={<PrivateRoute><ReportsPage/></PrivateRoute>}/>
      <Route path="/stock"              element={<PrivateRoute><StockPage/></PrivateRoute>}/>
      <Route path="/expenses"           element={<PrivateRoute><ExpensesPage/></PrivateRoute>}/>
      <Route path="/customer-ledger"    element={<PrivateRoute><CustomerLedgerPage/></PrivateRoute>}/>
      <Route path="/customers"          element={<PrivateRoute><CustomersPage/></PrivateRoute>}/>
      <Route path="/ledger"             element={<PrivateRoute><LedgerPage/></PrivateRoute>}/>
      <Route path="/analytics"          element={<PrivateRoute><AnalyticsPage/></PrivateRoute>}/>

      <Route path="/agents"             element={<PrivateRoute adminOnly><AgentsPage/></PrivateRoute>}/>
      <Route path="/settings"           element={<PrivateRoute adminOnly><SettingsPage/></PrivateRoute>}/>

      <Route path="*" element={<Navigate to={user ? '/dashboard' : '/login'}/>}/>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <FirmProvider>
            <AppRoutes/>
          </FirmProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
