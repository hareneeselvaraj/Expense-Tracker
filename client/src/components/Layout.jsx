import { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { FiMenu, FiHome, FiCreditCard, FiPieChart, FiTrendingUp, FiCpu, FiX } from 'react-icons/fi';
import Sidebar from './Sidebar';

export default function Layout() {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();

    // Close mobile menu when route changes
    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [location.pathname]);

    return (
        <div className="app-layout">
            {/* Mobile Top Header */}
            <header className="mobile-header">
                <button className="mobile-menu-btn" onClick={() => setIsMobileMenuOpen(true)}>
                    <FiMenu size={24} />
                </button>
                <div className="mobile-brand">
                    <span className="brand-icon">💰</span>
                    <span className="brand-text">ExpenseTracker</span>
                </div>
                <div className="mobile-header-spacer"></div>
            </header>

            {/* Mobile Sidebar Overlay */}
            {isMobileMenuOpen && (
                <div className="mobile-overlay" onClick={() => setIsMobileMenuOpen(false)}></div>
            )}

            <div className={`sidebar-container ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
                {isMobileMenuOpen && (
                    <button className="mobile-close-btn" onClick={() => setIsMobileMenuOpen(false)}>
                        <FiX size={24} />
                    </button>
                )}
                <Sidebar />
            </div>

            <main className="main-content">
                <Outlet />
            </main>

            {/* Mobile Bottom Navigation Bar */}
            <nav className="bottom-nav">
                <button className={`b-nav-item ${location.pathname === '/' ? 'active' : ''}`} onClick={() => navigate('/')}>
                    <FiHome />
                    <span>Home</span>
                </button>
                <button className={`b-nav-item ${location.pathname === '/transactions' ? 'active' : ''}`} onClick={() => navigate('/transactions')}>
                    <FiCreditCard />
                    <span>Txns</span>
                </button>
                <button className={`b-nav-item ${location.pathname === '/budgets' ? 'active' : ''}`} onClick={() => navigate('/budgets')}>
                    <FiPieChart />
                    <span>Budgets</span>
                </button>
                <button className={`b-nav-item ${location.pathname === '/investments' ? 'active' : ''}`} onClick={() => navigate('/investments')}>
                    <FiTrendingUp />
                    <span>Invests</span>
                </button>
                <button className={`b-nav-item ${location.pathname === '/ai-insights' ? 'active' : ''}`} onClick={() => navigate('/ai-insights')}>
                    <FiCpu />
                    <span>AI</span>
                </button>
            </nav>
        </div>
    );
}
