import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    FiHome, FiCreditCard, FiGrid, FiDollarSign, FiTarget,
    FiClock, FiBell, FiList, FiLogOut, FiTrendingUp, FiBarChart2, FiCpu, FiTruck, FiChevronLeft, FiChevronRight, FiTag, FiZap, FiUsers
} from 'react-icons/fi';
import ThemeToggle from './ThemeToggle';
import { CoupleContext } from '../context/CoupleContext';
import { useContext } from 'react';

export default function Sidebar() {
    const { user, logout } = useAuth();
    const { isCouple } = useContext(CoupleContext);
    const navigate = useNavigate();
    const [isCollapsed, setIsCollapsed] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const toggleSidebar = () => {
        setIsCollapsed(!isCollapsed);
        // Dispatch event to app layout to adjust main content margin if needed
        document.body.classList.toggle('sidebar-collapsed', !isCollapsed);
    };

    const mainLinks = [
        { to: '/', icon: <FiHome />, label: 'Dashboard' },
        { to: '/transactions', icon: <FiCreditCard />, label: 'Transactions' },
        { to: '/categories', icon: <FiGrid />, label: 'Categories' },
        { to: '/accounts', icon: <FiDollarSign />, label: 'Balance' },
        { to: '/goals', icon: <FiTarget />, label: 'Goals' },
    ];

    const secondaryLinks = [
        { to: '/tags', icon: <FiTag />, label: 'Tags' },
        { to: '/reminders', icon: <FiBell />, label: 'Reminders' },
        { to: '/history', icon: <FiList />, label: 'History' },
    ];

    const moreLinks = [
        { to: '/investments', icon: <FiTrendingUp />, label: 'Investments' },
        { to: '/budgets', icon: <FiBarChart2 />, label: 'Budgets' },
        { to: '/couple', icon: <FiUsers />, label: 'Shared Finance', badge: isCouple },
        { to: '/mileage', icon: <FiTruck />, label: 'Mileage' },
        { to: '/ai-insights', icon: <FiCpu />, label: 'AI Insights' },
        { to: '/ai-chat', icon: <FiZap />, label: 'Ask AI' },
    ];

    return (
        <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
            {/* Brand */}
            <div className="sidebar-brand">
                <div className="sidebar-logo">
                    <span className="sidebar-logo-icon">💰</span>
                </div>
                <h2>ExpenseTracker</h2>
                <button className="sidebar-toggle-btn" onClick={toggleSidebar}>
                    {isCollapsed ? <FiChevronRight /> : <FiChevronLeft />}
                </button>
            </div>

            {/* User Profile */}
            <div className="sidebar-profile">
                <div className="sidebar-avatar">
                    {user?.name?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="sidebar-profile-info">
                    <p className="sidebar-profile-name">{user?.name || 'User'}</p>
                    <p className="sidebar-profile-role">{isCouple ? 'Couple Mode' : 'Personal'}</p>
                </div>
            </div>

            {/* Main Nav */}
            <nav className="sidebar-nav">
                {mainLinks.map((link) => (
                    <NavLink
                        key={link.to}
                        to={link.to}
                        end={link.to === '/'}
                        className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                        title={isCollapsed ? link.label : undefined}
                    >
                        {link.icon}
                        <span>{link.label}</span>
                    </NavLink>
                ))}

                <div className="sidebar-divider" />

                {secondaryLinks.map((link) => (
                    <NavLink
                        key={link.to}
                        to={link.to}
                        className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                        title={isCollapsed ? link.label : undefined}
                    >
                        {link.icon}
                        <span>{link.label}</span>
                    </NavLink>
                ))}

                <div className="sidebar-divider" />

                {moreLinks.map((link) => (
                    <NavLink
                        key={link.to}
                        to={link.to}
                        className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                        title={isCollapsed ? link.label : undefined}
                    >
                        {link.icon}
                        <span>
                            {link.label}
                            {link.badge && <span className="couple-badge"></span>}
                        </span>
                    </NavLink>
                ))}
            </nav>

            {/* Footer */}
            <div className="sidebar-footer">
                <ThemeToggle />
                <button className="logout-btn" onClick={handleLogout} title={isCollapsed ? "Log Out" : undefined}>
                    <FiLogOut /> <span>Log Out</span>
                </button>
            </div>
        </aside>
    );
}
