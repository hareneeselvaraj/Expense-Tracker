import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login, loading } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            await login(email, password);
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.error || 'Login failed');
        }
    };

    return (
        <div className="auth-page-lavender">
            <div className="auth-card-glass fade-in-up">
                <div className="auth-header">
                    <h1 style={{ fontSize: '2.8rem', fontWeight: '800', marginBottom: '30px', color: 'white' }}>Login</h1>
                </div>
                
                {error && <div className="alert alert-error" style={{ marginBottom: '20px' }}>{error}</div>}
                
                <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
                    <div className="form-group" style={{ marginBottom: '30px' }}>
                        <label style={{ color: 'white', textTransform: 'none', fontSize: '1.2rem', fontWeight: '500', marginBottom: '8px', display: 'block' }}>Email</label>
                        <input 
                            type="email" 
                            className="input-underlined"
                            value={email} 
                            onChange={(e) => setEmail(e.target.value)} 
                            placeholder="" 
                            required 
                        />
                    </div>
                    
                    <div className="form-group" style={{ marginBottom: '30px' }}>
                        <label style={{ color: 'white', textTransform: 'none', fontSize: '1.2rem', fontWeight: '500', marginBottom: '8px', display: 'block' }}>Password</label>
                        <input 
                            type="password" 
                            className="input-underlined"
                            value={password} 
                            onChange={(e) => setPassword(e.target.value)} 
                            placeholder="" 
                            required 
                        />
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', color: 'white', fontSize: '1rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <input type="checkbox" style={{ accentColor: 'white' }} /> Remember Me
                        </label>
                        <Link to="/forgot-password" style={{ color: 'white', fontWeight: '600' }}>Forget Password</Link>
                    </div>
                    
                    <button type="submit" className="btn-pill" disabled={loading}>
                        {loading ? 'Logging in…' : 'Log in'}
                    </button>
                </form>
                
                <p className="auth-switch" style={{ marginTop: '30px', color: 'white', fontSize: '1.1rem' }}>
                    Don't have an account? <Link to="/register" style={{ color: 'white', fontWeight: '700', marginLeft: '5px' }}>Register</Link>
                </p>
            </div>
        </div>
    );
}
