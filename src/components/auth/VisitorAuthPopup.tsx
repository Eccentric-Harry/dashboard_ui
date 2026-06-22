import { useState } from 'react';
import { Lock, ArrowRight, Loader2, User, ArrowLeft, LogIn, UserPlus, Globe, AlertCircle } from 'lucide-react';
import { loginUser, signupUser } from '../../lib/api';
import toast from 'react-hot-toast';
import './visitor-auth-popup.css';

export function VisitorAuthPopup() {
  const [step, setStep] = useState<2 | 3>(2);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPasscode, setLoginPasscode] = useState('');

  const [signupUsername, setSignupUsername] = useState('');
  const [signupPasscode, setSignupPasscode] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGuest = () => {
    localStorage.setItem('isGuest', 'true');
    localStorage.removeItem('authToken');
    localStorage.removeItem('username');
    localStorage.removeItem('displayName');
    toast.success('Logged in as Guest');
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
        localStorage.setItem('avatarUrl', res.data.avatarUrl || 'luffy');
        localStorage.removeItem('isGuest');
        toast.success('Unlock successful!');
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
      const res = await signupUser(signupUsername, signupUsername, signupPasscode);
      if (res?.data?.token) {
        localStorage.setItem('authToken', res.data.token);
        localStorage.setItem('username', res.data.username);
        localStorage.setItem('displayName', res.data.displayName);
        localStorage.setItem('avatarUrl', res.data.avatarUrl || 'luffy');
        localStorage.removeItem('isGuest');
        toast.success('Account created successfully!');
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

  const handleDemoAlert = (provider: string) => {
    toast.error(`${provider} login is for demo only. Please use Username/Passcode or Guest mode.`);
  };

  const navigateToStep = (nextStep: 2 | 3) => {
    setErrorMsg('');
    setStep(nextStep);
  };

  return (
    <div className="visitor-auth-overlay">
      <div className="visitor-auth-container glass-panel">

        {/* Dynamic sliding forms */}
        <div className="visitor-auth-slider-wrapper">
          <div className={`visitor-auth-slider step-${step}`}>

            {/* Step 2: Login Panel */}
            <div className="visitor-auth-pane">
              <div className="visitor-auth-top-card">
                <LogIn size={20} className="visitor-auth-top-icon" />
              </div>

              <h2 className="visitor-auth-title">Sign in to Life OS</h2>
              <p className="visitor-auth-subtitle">Unlock your isolated metrics vault.</p>

              {errorMsg && (
                <div className="visitor-auth-error-msg">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleLoginSubmit} className="visitor-auth-form">
                <div className="visitor-auth-input-container">
                  <span className="input-prefix-icon"><User size={15} /></span>
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
                  <span className="input-prefix-icon"><Lock size={15} /></span>
                  <input
                    type="password"
                    className={`visitor-auth-input-field ${errorMsg ? 'error' : ''}`}
                    value={loginPasscode}
                    onChange={(e) => setLoginPasscode(e.target.value)}
                    placeholder="Passcode"
                    disabled={loading}
                  />
                </div>

                <div className="forgot-password-container">
                  <button type="button" className="forgot-password-btn" onClick={() => toast.error('Check your local config file if you forgot your password.')}>
                    Forgot passcode?
                  </button>
                </div>

                <div className="visitor-auth-buttons-vertical">
                  <button type="submit" className="visitor-auth-btn dark-gradient-btn full-width font-semibold" disabled={loading}>
                    {loading ? <Loader2 size={18} className="animate-spin" /> : <span>Sign In</span>}
                  </button>
                  <button type="button" className="visitor-auth-btn secondary-glass-btn full-width font-semibold" onClick={handleGuest}>
                    <Globe size={16} />
                    <span>Explore as Guest</span>
                  </button>
                </div>
              </form>

              <div className="visitor-auth-divider">
                <span>Or sign in with</span>
              </div>

              <div className="visitor-auth-social-row two-columns">
                <button type="button" className="social-circle-btn" onClick={() => handleDemoAlert('Google')} title="Sign in with Google">
                  <svg viewBox="0 0 24 24" width="18" height="18">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.77c-.98.66-2.23 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.62-.63-1.04-1.42-1.18-2.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                </button>
                <button type="button" className="social-circle-btn" onClick={() => handleDemoAlert('Apple')} title="Sign in with Apple">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-.96.04-2.13.64-2.82 1.45-.6.69-1.13 1.83-.99 2.94.99.08 2.16-.52 2.82-1.33z" />
                  </svg>
                </button>
              </div>

              <p className="visitor-auth-toggle-link font-semibold" onClick={() => navigateToStep(3)}>
                New user? Create an account
              </p>
            </div>

            {/* Step 3: Create Account Panel */}
            <div className="visitor-auth-pane">
              <button type="button" className="visitor-auth-back-arrow" onClick={() => navigateToStep(2)}>
                <ArrowLeft size={16} />
              </button>

              <div className="visitor-auth-top-card">
                <UserPlus size={20} className="visitor-auth-top-icon" />
              </div>

              <h2 className="visitor-auth-title">Create Account</h2>
              <p className="visitor-auth-subtitle">Get started with a username and passcode.</p>

              {errorMsg && (
                <div className="visitor-auth-error-msg">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleSignupSubmit} className="visitor-auth-form">
                <div className="visitor-auth-input-container">
                  <span className="input-prefix-icon"><User size={15} /></span>
                  <input
                    type="text"
                    className={`visitor-auth-input-field ${errorMsg ? 'error' : ''}`}
                    value={signupUsername}
                    onChange={(e) => setSignupUsername(e.target.value)}
                    placeholder="Choose Username"
                    autoFocus={step === 3}
                    disabled={loading}
                  />
                </div>
                <div className="visitor-auth-input-container">
                  <span className="input-prefix-icon"><Lock size={15} /></span>
                  <input
                    type="password"
                    className={`visitor-auth-input-field ${errorMsg ? 'error' : ''}`}
                    value={signupPasscode}
                    onChange={(e) => setSignupPasscode(e.target.value)}
                    placeholder="Set Passcode (min 4 chars)"
                    disabled={loading}
                  />
                </div>

                <button type="submit" className="visitor-auth-btn dark-gradient-btn full-width font-semibold" disabled={loading}>
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <><span>Register Account</span> <ArrowRight size={16} /></>}
                </button>
              </form>
              <p className="visitor-auth-toggle-link font-semibold" onClick={() => navigateToStep(2)}>
                Already have an account? Sign In
              </p>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
