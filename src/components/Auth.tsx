
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { GodVortex } from './GodVortex';
import './Auth.css';

const Auth: React.FC = () => {
    const { signIn, signUp } = useAuth();
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [shake, setShake] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');

        if (!isLogin && password !== confirmPassword) {
            setError("Passwords do not match, novice!");
            setShake(true);
            setLoading(false);
            return;
        }

        try {
            if (isLogin) {
                await signIn(email, password);
            } else {
                await signUp(email, password, {
                    nickname: email.split('@')[0],
                    level: 1,
                    xp: 0,
                    hp: 100,
                    mana: 100
                });
                setMessage('The path is open. Check your email to confirm your initiation!');
            }
        } catch (err: any) {
            setError(err.message || 'An error occurred in the vortex');
            setShake(true);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (shake) {
            const timer = setTimeout(() => setShake(false), 500);
            return () => clearTimeout(timer);
        }
    }, [shake]);

    return (
        <div className="auth-portal-container">
            {/* Background Atmosphere */}
            <div className="portal-atmosphere">
                <div className="glow-orb orb-1"></div>
                <div className="glow-orb orb-2"></div>
                <div className="grid-overlay"></div>
            </div>

            <div className={`auth-card-container ${shake ? 'animate-shake' : ''}`}>
                <div className="auth-card-vortex">
                    <GodVortex size="lg" auraColor={isLogin ? "gold" : "cyan"} intensity="high">
                        <img src="/guru_real.png" alt="Guruji" className="vortex-character-img" />
                    </GodVortex>
                </div>

                <div className="auth-glass-card">
                    <div className="card-header">
                        <h1 className="portal-title">{isLogin ? 'RESUME SADHANA' : 'BEGIN INITIATION'}</h1>
                        <p className="portal-subtitle">
                            {isLogin ? 'Return to your path of discipline' : 'Step into the world of quantified trading'}
                        </p>
                    </div>

                    <div className="auth-tabs">
                        <button
                            className={`auth-tab ${isLogin ? 'active' : ''}`}
                            onClick={() => { setIsLogin(true); setError(''); setMessage(''); }}
                        >
                            LOGIN
                        </button>
                        <button
                            className={`auth-tab ${!isLogin ? 'active' : ''}`}
                            onClick={() => { setIsLogin(false); setError(''); setMessage(''); }}
                        >
                            SIGN UP
                        </button>
                        <div className="tab-indicator" style={{ left: isLogin ? '0%' : '50%' }}></div>
                    </div>

                    <form onSubmit={handleSubmit} className="auth-form">
                        <div className="input-group">
                            <label>TRADER EMAIL</label>
                            <div className="input-wrapper">
                                <i className="fa-solid fa-envelope"></i>
                                <input
                                    type="email"
                                    required
                                    placeholder="Enter your address..."
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="input-group">
                            <label>SECRET KEY (PASSWORD)</label>
                            <div className="input-wrapper">
                                <i className="fa-solid fa-lock"></i>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                <button
                                    type="button"
                                    className="password-toggle-btn"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'} animate-eye`}></i>
                                </button>
                            </div>
                        </div>

                        {!isLogin && (
                            <div className="input-group animate-slide-down">
                                <label>CONFIRM KEY</label>
                                <div className="input-wrapper">
                                    <i className="fa-solid fa-shield-halved"></i>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        placeholder="••••••••"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        className="password-toggle-btn"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'} animate-eye`}></i>
                                    </button>
                                </div>
                            </div>
                        )}

                        {error && <div className="portal-error"><i className="fa-solid fa-triangle-exclamation"></i> {error}</div>}
                        {message && <div className="portal-success"><i className="fa-solid fa-circle-check"></i> {message}</div>}

                        <button type="submit" className="portal-submit-btn" disabled={loading}>
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <i className="fa-solid fa-spinner fa-spin"></i> PROCESSING...
                                </span>
                            ) : (
                                <span>{isLogin ? 'ENTER THE VORTEX' : 'COMMENCE TRAINING'}</span>
                            )}
                            <div className="btn-glow"></div>
                        </button>

                        {isLogin && (
                            <button
                                type="button"
                                className="fast-entry-btn"
                                onClick={async () => {
                                    setEmail('akzgodff102105@gmail.com');
                                    setPassword('052110ffgodakz');
                                    setLoading(true);
                                    try {
                                        await signIn('akzgodff102105@gmail.com', '052110ffgodakz');
                                    } catch (err: any) {
                                        setError(err.message || 'Fast Entry failed');
                                        setShake(true);
                                    } finally {
                                        setLoading(false);
                                    }
                                }}
                                disabled={loading}
                            >
                                <i className="fa-solid fa-bolt"></i> FAST ENTRY (AKZ)
                            </button>
                        )}
                    </form>

                    <div className="card-footer">
                        <p>Need help? <a href="#">Consult the Guru</a></p>
                    </div>
                </div>
            </div>

            {/* Floating Energy Particles */}
            <div className="energy-particles">
                {[...Array(12)].map((_, i) => (
                    <div key={i} className={`particle p-${i + 1}`}></div>
                ))}
            </div>
        </div>
    );
};

export default Auth;
