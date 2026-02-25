import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { FiHome, FiCreditCard, FiDollarSign, FiPieChart, FiTrendingUp, FiLogOut, FiGrid, FiTag, FiCpu, FiChevronDown, FiBarChart2, FiList, FiTruck } from 'react-icons/fi';
import ThemeToggle from './ThemeToggle';

export default function Sidebar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // Expand investment sub-menu if on either investment page
    const isInvestmentPage = location.pathname === '/investments' || location.pathname === '/portfolio';
    const [investOpen, setInvestOpen] = useState(isInvestmentPage);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const links = [
        { to: '/', icon: <FiHome />, label: 'Dashboard' },
        { to: '/transactions', icon: <FiCreditCard />, label: 'Transactions' },
        { to: '/accounts', icon: <FiDollarSign />, label: 'Accounts' },
        { to: '/categories', icon: <FiGrid />, label: 'Categories' },
        { to: '/tags', icon: <FiTag />, label: 'Tags' },
        { to: '/budgets', icon: <FiPieChart />, label: 'Budgets' },
    ];

    const investmentLinks = [
        { to: '/portfolio', icon: <FiBarChart2 />, label: 'Portfolio' },
        { to: '/investments', icon: <FiList />, label: 'Investment Transactions' },
    ];

    return (
        <aside className="sidebar">
            <div className="sidebar-brand">
                <span className="brand-icon">💰</span>
                <h2>ExpenseTracker</h2>
            </div>
            <nav className="sidebar-nav">
                {links.map((link) => (
                    <NavLink
                        key={link.to}
                        to={link.to}
                        className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                    >
                        {link.icon}
                        <span>{link.label}</span>
                    </NavLink>
                ))}

                {/* ── Investments Sub-menu ── */}
                <button
                    className={`nav-link nav-parent ${isInvestmentPage ? 'active' : ''}`}
                    onClick={() => setInvestOpen(!investOpen)}
                >
                    <FiTrendingUp />
                    <span>Investments</span>
                    <FiChevronDown className={`nav-chevron ${investOpen ? 'nav-chevron-open' : ''}`} />
                </button>
                <div className={`nav-submenu ${investOpen ? 'nav-submenu-open' : ''}`}>
                    {investmentLinks.map((link) => (
                        <NavLink
                            key={link.to}
                            to={link.to}
                            className={({ isActive }) => `nav-link nav-sub-link ${isActive ? 'active' : ''}`}
                        >
                            {link.icon}
                            <span>{link.label}</span>
                        </NavLink>
                    ))}
                </div>

                <NavLink
                    to="/mileage"
                    className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                >
                    <FiTruck />
                    <span>Mileage Tracker</span>
                </NavLink>

                <NavLink
                    to="/ai-insights"
                    className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                >
                    <FiCpu />
                    <span>AI Insights</span>
                </NavLink>
            </nav>
            <div className="sidebar-footer">
                <ThemeToggle />
                <div className="user-info">
                    <div className="user-avatar">{user?.name?.[0]?.toUpperCase() || 'U'}</div>
                    <span className="user-name">{user?.name || 'User'}</span>
                </div>
                <button className="logout-btn" onClick={handleLogout}>
                    <FiLogOut /> Logout
                </button>
            </div>
        </aside>
    );
}
