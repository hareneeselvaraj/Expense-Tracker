import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiHome, FiCreditCard, FiDollarSign, FiPieChart, FiTrendingUp, FiLogOut, FiGrid, FiTag } from 'react-icons/fi';

export default function Sidebar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

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
        { to: '/investments', icon: <FiTrendingUp />, label: 'Investments' },
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
            </nav>
            <div className="sidebar-footer">
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
