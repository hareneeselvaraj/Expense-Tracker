import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './components/Toast';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Accounts from './pages/Accounts';
import Budgets from './pages/Budgets';
import Investments from './pages/Investments';
import Portfolio from './pages/Portfolio';
import Categories from './pages/Categories';
import Tags from './pages/Tags';
import AIInsights from './pages/AIInsights';
import MileageTracker from './pages/MileageTracker';
import Goals from './pages/Goals';
import UpcomingReminders from './pages/UpcomingReminders';
import History from './pages/History';
import AIChat from './components/AI/AIChat';

export default function App() {
    return (
        <ThemeProvider>
            <AuthProvider>
                <ToastProvider>
                    <BrowserRouter>
                        <Routes>
                            <Route path="/login" element={<Login />} />
                            <Route path="/register" element={<Register />} />
                            <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                                <Route path="/" element={<Dashboard />} />
                                <Route path="/transactions" element={<Transactions />} />
                                <Route path="/accounts" element={<Accounts />} />
                                <Route path="/categories" element={<Categories />} />
                                <Route path="/tags" element={<Tags />} />
                                <Route path="/budgets" element={<Budgets />} />
                                <Route path="/investments" element={<Investments />} />
                                <Route path="/portfolio" element={<Portfolio />} />
                                <Route path="/mileage" element={<MileageTracker />} />
                                <Route path="/ai-insights" element={<AIInsights />} />
                                <Route path="/goals" element={<Goals />} />
                                <Route path="/reminders" element={<UpcomingReminders />} />
                                <Route path="/history" element={<History />} />
                                <Route path="/ai-chat" element={<AIChat />} />
                            </Route>
                        </Routes>
                    </BrowserRouter>
                </ToastProvider>
            </AuthProvider>
        </ThemeProvider>
    );
}
