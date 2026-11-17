import { BrowserRouter, Route, Routes } from 'react-router-dom';
import AccountGate from './components/AccountGate';
import AppLayout from './layouts/AppLayout';
import Dashboard from './pages/Dashboard';
import Chat from './pages/Chat';

export default function App() {
  return (
    <BrowserRouter>
      <AccountGate>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/chat/:sessionId" element={<Chat />} />
          </Route>
        </Routes>
      </AccountGate>
    </BrowserRouter>
  );
}
