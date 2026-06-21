import { useState } from 'react';
import { ShieldCheck, User, Lock, ArrowRight, Loader2, UserPlus, HelpCircle } from 'lucide-react';
import { loginUser, signupUser } from '../../lib/api';
import avatarImage from '../../assets/reference-crops/avatar_luffy.png';
import './visitor-auth-popup.css';

export function VisitorAuthPopup() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPasscode, setLoginPasscode] = useState('');
  
  const [signupUsername, setSignupUsername] = useState('');
  const [signupDisplayName, setSignupDisplayName] = useState('');
  const [signupPasscode, setSignupPasscode] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGuest = () => {
    localStorage.setItem('isGuest', 'true');
    localStorage.removeItem('authToken');
    localStorage.removeItem('username');
    localStorage.removeItem('displayName');
    window.location.href = '/nutrition';
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginUsername || !loginPasscode) {
      setErrorMsg('Please enter both username and passcode');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await loginUser(loginUsername, loginPasscode);
      if (res?.data?.token) {
        localStorage.setItem('authToken', res.data.token);
        localStorage.setItem('username', res.data.username);
        localStorage.setItem('displayName', res.data.displayName);
        localStorage.removeItem('isGuest');
        window.location.reload();
      } else {
        setErrorMsg('Invalid response from server');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid username or passcode');
    } finally {
      setLoading(false);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupUsername || !signupPasscode) {
      setErrorMsg('Username and passcode are required');
      return;
    }
    if (signupPasscode.length < 4) {
      setErrorMsg('Passcode must be at least 4 characters');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await signupUser(signupUsername, signupDisplayName, signupPasscode);
      if (res?.data?.token) {
        localStorage.setItem('authToken', res.data.token);
        localStorage.setItem('username', res.data.username);
        localStorage.setItem('displayName', res.data.displayName);
        localStorage.removeItem('isGuest');
        window.location.reload();
      } else {
        setErrorMsg('Invalid response from server');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Signup failed. Username might be taken.');
    } finally {
      setLoading(false);
    }
  };

  const navigateToStep = (nextStep: 1 | 2 | 3) => {
    setErrorMsg('');
    setStep(nextStep);
  };

  return (
    <div className="visitor-auth-overlay">
      <div className="visitor-auth-modal">
        <div className="visitor-auth-modal-bg-decor"></div>
        <div className={`visitor-auth-slider step-${step}`}>
          {/* Step 1: Welcome Panel */}
          <div className="visitor-auth-pane">
            <div className="visitor-auth-avatar-wrap">
              <img src={avatarImage} alt="User" className="visitor-auth-avatar" />
              <div className="visitor-auth-badge"><ShieldCheck size={16} /></div>
            </div>
            <h2 className="visitor-auth-title">Welcome to Life OS</h2>
            <p className="visitor-auth-subtitle">Access your personalized health, finance, and task dashboard.</p>
            <div className="visitor-auth-buttons-vertical">
              <button className="visitor-auth-btn primary full-width" onClick={() => navigateToStep(2)}>
                <User size={18} />
                Sign In
              </button>
              <button className="visitor-auth-btn primary-outline full-width" onClick={() => navigateToStep(3)}>
                <UserPlus size={18} />
                Create Account
              </button>
              <button className="visitor-auth-btn secondary full-width" onClick={handleGuest}>
                <HelpCircle size={18} />
                Explore as Guest
              </button>
            </div>
          </div>

          {/* Step 2: Login Panel */}
          <div className="visitor-auth-pane">
            <div className="visitor-auth-icon-wrap">
              <Lock size={32} className="visitor-auth-lock-icon" />
            </div>
            <h2 className="visitor-auth-title">Sign In</h2>
            <p className="visitor-auth-subtitle">Enter your credentials to unlock your dashboard.</p>
            
            {errorMsg && <p className="visitor-auth-error-msg">{errorMsg}</p>}

            <form onSubmit={handleLoginSubmit} className="visitor-auth-form">
              <div className="visitor-auth-input-container">
                <input
                  type="text"
                  className={`visitor-auth-input-field ${errorMsg ? 'error' : ''}`}
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  placeholder="Username"
                  autoFocus={step === 2}
                  disabled={loading}
                />
              </div>
              <div className="visitor-auth-input-container">
                <input
                  type="password"
                  className={`visitor-auth-input-field ${errorMsg ? 'error' : ''}`}
                  value={loginPasscode}
                  onChange={(e) => setLoginPasscode(e.target.value)}
                  placeholder="Passcode"
                  disabled={loading}
                />
              </div>
              <div className="visitor-auth-buttons">
                <button type="button" className="visitor-auth-btn secondary" onClick={() => navigateToStep(1)} disabled={loading}>
                  Back
                </button>
                <button type="submit" className="visitor-auth-btn primary" disabled={loading}>
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <><span>Unlock</span> <ArrowRight size={18} /></>}
                </button>
              </div>
            </form>
            <p className="visitor-auth-toggle-link" onClick={() => navigateToStep(3)}>
              New user? Create an account
            </p>
          </div>

          {/* Step 3: Signup Panel */}
          <div className="visitor-auth-pane">
            <div className="visitor-auth-icon-wrap">
              <UserPlus size={32} className="visitor-auth-lock-icon" />
            </div>
            <h2 className="visitor-auth-title">Create Account</h2>
            <p className="visitor-auth-subtitle">Join the dashboard for isolated tracking.</p>

            {errorMsg && <p className="visitor-auth-error-msg">{errorMsg}</p>}

            <form onSubmit={handleSignupSubmit} className="visitor-auth-form">
              <div className="visitor-auth-input-container">
                <input
                  type="text"
                  className={`visitor-auth-input-field ${errorMsg ? 'error' : ''}`}
                  value={signupUsername}
                  onChange={(e) => setSignupUsername(e.target.value)}
                  placeholder="Username (e.g., alice)"
                  autoFocus={step === 3}
                  disabled={loading}
                />
              </div>
              <div className="visitor-auth-input-container">
                <input
                  type="text"
                  className={`visitor-auth-input-field ${errorMsg ? 'error' : ''}`}
                  value={signupDisplayName}
                  onChange={(e) => setSignupDisplayName(e.target.value)}
                  placeholder="Display Name (e.g., Alice)"
                  disabled={loading}
                />
              </div>
              <div className="visitor-auth-input-container">
                <input
                  type="password"
                  className={`visitor-auth-input-field ${errorMsg ? 'error' : ''}`}
                  value={signupPasscode}
                  onChange={(e) => setSignupPasscode(e.target.value)}
                  placeholder="Passcode (min 4 chars)"
                  disabled={loading}
                />
              </div>
              <div className="visitor-auth-buttons">
                <button type="button" className="visitor-auth-btn secondary" onClick={() => navigateToStep(1)} disabled={loading}>
                  Back
                </button>
                <button type="submit" className="visitor-auth-btn primary" disabled={loading}>
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <><span>Register</span> <ArrowRight size={18} /></>}
                </button>
              </div>
            </form>
            <p className="visitor-auth-toggle-link" onClick={() => navigateToStep(2)}>
              Already have an account? Sign In
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
