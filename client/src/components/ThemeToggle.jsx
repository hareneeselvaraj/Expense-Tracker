import { useTheme } from '../context/ThemeContext';
import { FiSun, FiMoon } from 'react-icons/fi';

export default function ThemeToggle() {
    const { isDark, toggleTheme } = useTheme();

    return (
        <div className="theme-toggle-wrapper">
            <FiSun className={`theme-icon ${!isDark ? 'theme-icon-active' : ''}`} />
            <button
                className={`theme-switch ${isDark ? 'theme-switch-on' : ''}`}
                onClick={toggleTheme}
                aria-label="Toggle dark mode"
                title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
                <span className="theme-switch-knob" />
            </button>
            <FiMoon className={`theme-icon ${isDark ? 'theme-icon-active' : ''}`} />
        </div>
    );
}
