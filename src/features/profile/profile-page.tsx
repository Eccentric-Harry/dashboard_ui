import React, { useEffect, useState } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import { X, Clock, Pencil, LogOut, Mail, Globe, Activity, Target, Plus, Calendar, RefreshCw, Cake, PersonStanding, Ruler, Weight, Footprints, HeartPulse, CalendarDays, Sparkle, Leaf, ShieldAlert, Zap } from 'lucide-react';
import type { UserProfile, GoogleSyncStatus } from '@/lib/api';
import { userService } from '@/services/user-service';
import { calendarService } from '@/services/calendar-service';
import { SideRail } from '@/components/layout/side-rail';
import { TopChip } from '@/components/layout/top-chip';
import type { AppPath } from '@/app/routes';
import toast from 'react-hot-toast';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { getAvatarImage, avatarPresets } from '@/lib/avatar';
import { confirmCloseIfDirty } from '@/lib/modal-utils';
import './profile-page.css';

type ProfileOverviewProps = {
  activePath: AppPath;
  onNavigate: (pathname: AppPath) => void;
};

const timezonePresets = [
  'GMT-12', 'GMT-11', 'GMT-10', 'GMT-9', 'GMT-8', 'GMT-7', 'GMT-6', 'GMT-5',
  'GMT-4', 'GMT-3', 'GMT-2', 'GMT-1', 'GMT+0', 'GMT+1', 'GMT+2', 'GMT+3',
  'GMT+4', 'GMT+5', 'GMT+5:30', 'GMT+6', 'GMT+7', 'GMT+8', 'GMT+9', 'GMT+10',
  'GMT+11', 'GMT+12'
];

const PRESET_CONDITIONS = [
  "Hypertension",
  "Lactose Intolerance",
  "Gluten Free",
  "Vegetarian",
  "Vegan",
  "Nut Allergy",
  "Diabetes",
  "Keto",
  "Low Carb"
];

const getConditionIcon = (condition: string) => {
  const norm = condition.toLowerCase().trim();
  if (norm.includes('acne')) {
    return <Sparkle size={11} strokeWidth={2.4} />;
  }
  if (norm.includes('hypertension') || norm.includes('heart') || norm.includes('blood pressure')) {
    return <HeartPulse size={11} strokeWidth={2.4} />;
  }
  if (
    norm.includes('vegetarian') ||
    norm.includes('vegan') ||
    norm.includes('gluten free') ||
    norm.includes('leaf') ||
    norm.includes('keto') ||
    norm.includes('low carb')
  ) {
    return <Leaf size={11} strokeWidth={2.4} />;
  }
  if (norm.includes('allergy') || norm.includes('intolerance')) {
    return <ShieldAlert size={11} strokeWidth={2.4} />;
  }
  if (norm.includes('diabetes') || norm.includes('insulin') || norm.includes('sugar')) {
    return <Activity size={11} strokeWidth={2.4} />;
  }
  return <HeartPulse size={11} strokeWidth={2.4} />;
};

const ACTIVITY_LABELS: Record<string, string> = {
  SEDENTARY: 'Sedentary',
  LIGHTLY_ACTIVE: 'Lightly Active',
  MODERATELY_ACTIVE: 'Moderately Active',
  ACTIVE: 'Active',
  VERY_ACTIVE: 'Very Active',
  EXTRA_ACTIVE: 'Extra Active',
};

const GOAL_LABELS: Record<string, { label: string; delta: string }> = {
  LOSE_WEIGHT: { label: 'Lose Weight', delta: '−500 kcal/day' },
  MAINTAIN_WEIGHT: { label: 'Maintain', delta: 'TDEE balance' },
  GAIN_MUSCLE: { label: 'Gain Muscle', delta: '+300 kcal/day' },
};

/**
 * BMI band with a soft zone either side of the healthy range. A 25.3 is about a
 * kilo past the ceiling — "Slightly above" in a neutral tone, not an amber
 * "Overweight" alarm. The label escalates only once the value is meaningfully
 * outside the range (≥27 or <17).
 */
function bmiStatus(bmi?: number): { label: string; cls: string } {
  if (!bmi || bmi <= 0) return { label: '—', cls: 'none' };
  if (bmi < 17) return { label: 'Underweight', cls: 'underweight' };
  if (bmi < 18.5) return { label: 'Slightly under', cls: 'near' };
  if (bmi < 25) return { label: 'Healthy', cls: 'normal' };
  if (bmi < 27) return { label: 'Slightly above', cls: 'near' };
  if (bmi < 30) return { label: 'Overweight', cls: 'overweight' };
  return { label: 'Obese', cls: 'obese' };
}

export function ProfileOverview({ activePath, onNavigate }: ProfileOverviewProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  // Recharts needs a real layout pass before it can measure its container —
  // rendering the Pie on the very first frame produces a 0×0 chart on some
  // browsers. Same guard the nutrition/finance intelligence cards use.
  const [isMounted, setIsMounted] = useState(false);

  // Google Calendar Sync States
  const [syncStatus, setSyncStatus] = useState<GoogleSyncStatus | null>(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [authUrlLoading, setAuthUrlLoading] = useState(false);

  // General profile form states
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('luffy');
  const [email, setEmail] = useState('');
  const [timezone, setTimezone] = useState('GMT+0');
  const [workingHours, setWorkingHours] = useState('9 AM - 5 PM');
  const [title, setTitle] = useState('');
  const [bio, setBio] = useState('');
  const [status, setStatus] = useState('Online');

  // Health and biometrics states
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('MALE');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [activityLevel, setActivityLevel] = useState('SEDENTARY');
  const [fitnessGoal, setFitnessGoal] = useState('MAINTAIN_WEIGHT');
  const [medicalConditions, setMedicalConditions] = useState<string[]>([]);
  const [customConditionInput, setCustomConditionInput] = useState('');



  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true);
  }, []);

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await userService.getProfile();
        if (res.error) throw new Error(res.error.message);
        if (res?.data) {
          const data = res.data;
          setProfile(data);
          setDisplayName(data.displayName || '');
          setAvatarUrl(data.avatarUrl || 'luffy');
          setEmail(data.email || '');
          setTimezone(data.timezone || 'GMT-8');
          setWorkingHours(data.workingHours || '10 AM - 6 PM');
          setTitle(data.title || '');
          setBio(data.bio || '');
          setStatus(data.status || 'Online');

          // Initialize health metrics states
          const pm = data.physicalMetrics || {};
          setAge(pm.age?.toString() || '');
          setGender(pm.gender || 'MALE');
          setHeight(pm.height?.toString() || '');
          setWeight(pm.weight?.toString() || '');
          setActivityLevel(data.activityLevel || 'SEDENTARY');
          setFitnessGoal(data.fitnessGoal || 'MAINTAIN_WEIGHT');
          setMedicalConditions(data.medicalConditions || []);

          localStorage.setItem('avatarUrl', data.avatarUrl || 'luffy');
          localStorage.setItem('displayName', data.displayName || '');
          window.dispatchEvent(new Event('profile-updated'));
        }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (err) {
        toast.error('Failed to load profile data');
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  const loadSyncStatus = async () => {
    try {
      const res = await calendarService.getGoogleStatus();
      if (res.error) throw new Error(res.error.message);
      if (res?.data) {
        setSyncStatus(res.data);
      }
    } catch (err) {
      console.error('Failed to load Google sync status:', err);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadSyncStatus();
  }, []);

  useEffect(() => {
    const handleOAuthMessage = (event: MessageEvent) => {
      if (event.data?.type === 'GOOGLE_CALENDAR_CONNECTED') {
        toast.success('Successfully connected to Google Calendar!');
        loadSyncStatus();
      }
    };
    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, []);

  const handleConnectGoogle = async () => {
    setAuthUrlLoading(true);
    try {
      const res = await calendarService.getGoogleAuthUrl();
      if (res.error) throw new Error(res.error.message);
      if (res?.data?.url) {
        const width = 600;
        const height = 700;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;
        window.open(
          res.data.url,
          'google-calendar-auth',
          `width=${width},height=${height},left=${left},top=${top}`
        );
      } else {
        toast.error('Failed to get Google authorization URL');
      }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err) {
      toast.error('Failed to initiate Google Calendar connection');
    } finally {
      setAuthUrlLoading(false);
    }
  };

  const handleDisconnectGoogle = async () => {
    if (!window.confirm('Are you sure you want to disconnect from Google Calendar? This will stop all synchronization.')) {
      return;
    }
    try {
      const res = await calendarService.disconnectGoogle();
      if (res.error) throw new Error(res.error.message);
      toast.success('Disconnected from Google Calendar');
      setSyncStatus({ connected: false, accounts: [] });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err) {
      toast.error('Failed to disconnect from Google Calendar');
    }
  };

  const handleSyncNow = async () => {
    setSyncLoading(true);
    try {
      const res = await calendarService.syncGoogle();
      if (res.error) throw new Error(res.error.message);
      toast.success('Calendar synchronization triggered');
      setTimeout(loadSyncStatus, 2000);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err) {
      toast.error('Failed to trigger calendar sync');
    } finally {
      setSyncLoading(false);
    }
  };


  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: Partial<UserProfile> = {
        displayName: displayName.trim(),
        avatarUrl,
        email: email.trim(),
        timezone,
        workingHours: workingHours.trim(),
        title: title.trim(),
        bio: bio.trim(),
        status,
        physicalMetrics: {
          age: age ? parseInt(age) : undefined,
          gender,
          height: height ? parseFloat(height) : undefined,
          weight: weight ? parseFloat(weight) : undefined,
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        activityLevel: activityLevel as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        fitnessGoal: fitnessGoal as any,
        medicalConditions,
      };

      const res = await userService.updateProfile(payload);
      if (res.error) throw new Error(res.error.message);
      if (res?.data) {
        toast.success('Profile updated successfully!');
        localStorage.setItem('displayName', res.data.displayName);
        localStorage.setItem('avatarUrl', res.data.avatarUrl || 'luffy');
        setProfile(res.data);
        window.dispatchEvent(new Event('profile-updated'));
        setIsEditing(false);
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      toast.error(err.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    setShowLogoutDialog(true);
  };

  const confirmLogout = () => {
    localStorage.clear();
    window.location.reload();
  };

  const handleCancel = () => {
    if (profile) {
      setDisplayName(profile.displayName || '');
      setAvatarUrl(profile.avatarUrl || 'luffy');
      setEmail(profile.email || '');
      setTimezone(profile.timezone || 'GMT-8');
      setWorkingHours(profile.workingHours || '10 AM - 6 PM');
      setTitle(profile.title || '');
      setBio(profile.bio || '');
      setStatus(profile.status || 'Online');

      const pm = profile.physicalMetrics || {};
      setAge(pm.age?.toString() || '');
      setGender(pm.gender || 'MALE');
      setHeight(pm.height?.toString() || '');
      setWeight(pm.weight?.toString() || '');
      setActivityLevel(profile.activityLevel || 'SEDENTARY');
      setFitnessGoal(profile.fitnessGoal || 'MAINTAIN_WEIGHT');
      setMedicalConditions(profile.medicalConditions || []);
    }
    setIsEditing(false);
  };

  const isProfileDirty = Boolean(
    profile && (
      displayName !== (profile.displayName || '') ||
      title !== (profile.title || '') ||
      bio !== (profile.bio || '') ||
      email !== (profile.email || '') ||
      height !== (profile.physicalMetrics?.height?.toString() || '') ||
      weight !== (profile.physicalMetrics?.weight?.toString() || '') ||
      age !== (profile.physicalMetrics?.age?.toString() || '')
    )
  );

  const handleGuardedCancel = () => {
    confirmCloseIfDirty(isProfileDirty, handleCancel);
  };

  const handleToggleCondition = (cond: string) => {
    if (medicalConditions.includes(cond)) {
      setMedicalConditions(medicalConditions.filter(c => c !== cond));
    } else {
      setMedicalConditions([...medicalConditions, cond]);
    }
  };

  const handleAddCustomCondition = () => {
    const trimmed = customConditionInput.trim();
    if (trimmed && !medicalConditions.includes(trimmed)) {
      setMedicalConditions([...medicalConditions, trimmed]);
      setCustomConditionInput('');
    }
  };

  const handleRemoveCustomCondition = (cond: string) => {
    setMedicalConditions(medicalConditions.filter((c) => c !== cond));
  };

  const formatLastUpdated = (dateStr?: string) => {
    if (!dateStr) return 'Last updated: Just now';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'Last updated: Just now';
    return `Last updated: ${date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })}`;
  };

  return (
    <>
      <main className="dashboard-shell">
        <div className="dashboard-stage profile-stage" aria-label="User Profile">
          <SideRail activePath={activePath} onNavigate={onNavigate} />
          <TopChip />

          <div className="profile-container">
            {loading ? (
              <div className="profile-shell-card">
                <div className="profile-shell-split">
                  {/* Left identity rail skeleton */}
                  <div className="profile-identity">
                    <div className="identity-header">
                      <div className="skeleton-avatar skeleton-pulse"></div>
                      <div className="identity-titles">
                        <div className="skeleton-name skeleton-pulse"></div>
                        <div className="skeleton-role skeleton-pulse"></div>
                        <div className="skeleton-email skeleton-pulse"></div>
                      </div>
                    </div>
                    <div className="identity-badges">
                      <div className="skeleton-pill skeleton-pulse"></div>
                      <div className="skeleton-pill skeleton-pulse"></div>
                      <div className="skeleton-pill skeleton-pulse"></div>
                    </div>
                    <div className="identity-section">
                      <div className="skeleton-section-title skeleton-pulse"></div>
                      <div className="identity-biometrics">
                        <div className="skeleton-bio-tile skeleton-pulse"></div>
                        <div className="skeleton-bio-tile skeleton-pulse"></div>
                        <div className="skeleton-bio-tile skeleton-pulse"></div>
                        <div className="skeleton-bio-tile skeleton-pulse"></div>
                      </div>
                    </div>
                    <div className="identity-section">
                      <div className="skeleton-section-title skeleton-pulse"></div>
                      <div className="identity-conditions">
                        <div className="skeleton-condition-pill skeleton-pulse"></div>
                        <div className="skeleton-condition-pill skeleton-pulse"></div>
                      </div>
                    </div>
                    <div className="identity-spacer"></div>
                    <div className="identity-footer">
                      <div className="skeleton-footer-text skeleton-pulse"></div>
                      <div className="skeleton-footer-buttons">
                        <div className="skeleton-button skeleton-pulse"></div>
                        <div className="skeleton-button skeleton-pulse"></div>
                      </div>
                    </div>
                  </div>

                  {/* Right metrics skeleton */}
                  <div className="profile-metrics">
                    <div className="metrics-header">
                      <div className="skeleton-section-sub skeleton-pulse"></div>
                      <div className="skeleton-section-title skeleton-pulse"></div>
                    </div>
                    <div className="metrics-grid">
                      <div className="metric-card skeleton-card">
                        <div className="skeleton-card-header skeleton-pulse"></div>
                        <div className="skeleton-circle skeleton-pulse"></div>
                      </div>
                      <div className="metric-card skeleton-card">
                        <div className="skeleton-card-header skeleton-pulse"></div>
                        <div className="skeleton-stats skeleton-pulse"></div>
                      </div>
                      <div className="metric-card card-sync skeleton-card-wide">
                        <div className="skeleton-card-header skeleton-pulse"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="profile-shell-card">
                <div className="profile-shell-split">

                  {/* ── Left: Identity Rail ── */}
                  <aside className="profile-identity">
                    <div className="identity-header">
                      <div className="identity-avatar-wrap">
                        <img
                          src={getAvatarImage(avatarUrl)}
                          alt={displayName || 'Profile avatar'}
                          className="identity-avatar"
                        />
                      </div>
                      <div className="identity-titles">
                        <h2 className="identity-name">{displayName || 'Your Name'}</h2>
                        <h3 className="identity-role">{title || 'Intern'}</h3>
                        {email && (
                          <a href={`mailto:${email}`} className="identity-email">
                            <Mail size={12} />
                            <span>{email}</span>
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="identity-badges">
                      <span className="identity-pill">
                        <span className={`identity-dot status-${(status || 'Online').toLowerCase().replace(/\s+/g, '-')}`}></span>
                        <span>{status || 'Online'}</span>
                      </span>
                      <span className="identity-pill">
                        <Globe size={11} strokeWidth={2.5} />
                        <span>{timezone || 'GMT+5:30'}</span>
                      </span>
                      <span className="identity-pill">
                        <Clock size={11} strokeWidth={2.5} />
                        <span>{workingHours || '10 AM - 6 PM'}</span>
                      </span>
                    </div>

                    {bio && (
                      <div className="identity-bio-block">
                        <h4 className="identity-section-title">About</h4>
                        <p className="identity-bio">{bio}</p>
                      </div>
                    )}

                    <div className="identity-section">
                      <h4 className="identity-section-title">Biometrics</h4>
                      <div className="identity-biometrics">
                        <div className="bio-tile">
                          <span className="bio-tile-icon tint-honey"><Cake size={13} strokeWidth={2.2} /></span>
                          <div className="bio-tile-text">
                            <span className="lbl">Age</span>
                            <span className="val">
                              {profile?.physicalMetrics?.age ?? '—'} <span className="unit">yrs</span>
                            </span>
                          </div>
                        </div>
                        <div className="bio-tile">
                          <span className="bio-tile-icon tint-sky"><PersonStanding size={13} strokeWidth={2.2} /></span>
                          <div className="bio-tile-text">
                            <span className="lbl">Gender</span>
                            <span className="val capitalize">
                              {profile?.physicalMetrics?.gender?.toLowerCase() ?? '—'}
                            </span>
                          </div>
                        </div>
                        <div className="bio-tile">
                          <span className="bio-tile-icon tint-sage"><Ruler size={13} strokeWidth={2.2} /></span>
                          <div className="bio-tile-text">
                            <span className="lbl">Height</span>
                            <span className="val">
                              {profile?.physicalMetrics?.height ?? '—'} <span className="unit">cm</span>
                            </span>
                          </div>
                        </div>
                        <div className="bio-tile">
                          <span className="bio-tile-icon tint-coral"><Weight size={13} strokeWidth={2.2} /></span>
                          <div className="bio-tile-text">
                            <span className="lbl">Weight</span>
                            <span className="val">
                              {profile?.physicalMetrics?.weight ?? '—'} <span className="unit">kg</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="identity-section">
                      <h4 className="identity-section-title">Fitness Profile</h4>
                      <div className="identity-fitness">
                        <div className="fitness-row">
                          <span className="bio-tile-icon tint-sage"><Footprints size={13} strokeWidth={2.2} /></span>
                          <span className="lbl">Activity</span>
                          <span className="val">
                            {ACTIVITY_LABELS[profile?.activityLevel ?? ''] ?? '—'}
                          </span>
                        </div>
                        <div className="fitness-row">
                          <span className="bio-tile-icon tint-honey"><Target size={13} strokeWidth={2.2} /></span>
                          <span className="lbl">Goal</span>
                          <span className="val goal-val">
                            <span className="goal-label">{GOAL_LABELS[profile?.fitnessGoal ?? '']?.label ?? '—'}</span>
                            <span className="unit goal-delta">{GOAL_LABELS[profile?.fitnessGoal ?? '']?.delta ?? ''}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="identity-section">
                      <h4 className="identity-section-title">Conditions & Flags</h4>
                      {profile?.medicalConditions && profile.medicalConditions.length > 0 ? (
                        <div className="identity-conditions">
                          {profile.medicalConditions.map((condition, idx) => (
                            <span key={idx} className="condition-pill">
                              {getConditionIcon(condition)}
                              {condition}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="identity-empty">No conditions flagged</span>
                      )}
                    </div>

                    <div className="identity-spacer"></div>

                    {profile?.createdAt && (
                      <div className="identity-since">
                        <span className="bio-tile-icon tint-sky"><CalendarDays size={13} strokeWidth={2.2} /></span>
                        <div className="bio-tile-text">
                          <span className="lbl">Member Since</span>
                          <span className="val">
                            {new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="identity-footer">
                      <span className="identity-updated">
                        {formatLastUpdated(profile?.updatedAt || profile?.createdAt)}
                      </span>
                      <div className="identity-actions">
                        <button
                          type="button"
                          className="identity-logout-btn"
                          onClick={handleLogout}
                        >
                          <LogOut size={13} />
                          <span>Log Out</span>
                        </button>
                        <button
                          type="button"
                          className="identity-edit-btn"
                          onClick={() => setIsEditing(true)}
                        >
                          <Pencil size={13} />
                          <span>Edit Profile</span>
                        </button>
                      </div>
                    </div>
                  </aside>

                  {/* ── Right: Health & Performance Bento ── */}
                  <section className="profile-metrics">
                    <header className="metrics-header">
                      <p>Health & Performance</p>
                      <h2>Calculated Targets & Metrics</h2>
                      {(profile?.updatedAt || profile?.createdAt) && (
                        <span className="metrics-updated">
                          Recalculated from the biometrics you saved on{' '}
                          {new Date(profile?.updatedAt || profile?.createdAt || '').toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      )}
                    </header>

                    <div className="metrics-grid">
                      {/* BMI & Energy card */}
                      <div className="metric-card card-status">
                        <div className="metric-card-head">
                          <Activity size={15} />
                          <span>BMI & BMR Status</span>
                        </div>
                        {(() => {
                          // One BMI read: the number and its label sit on the scale they
                          // came from. A separate ring restated the same value in a
                          // second shape directly above it.
                          const bmi = profile?.bmi;
                          const status = bmiStatus(bmi);
                          const pct = bmi && bmi > 0 ? Math.min(100, Math.max(0, ((bmi - 14) / (40 - 14)) * 100)) : null;
                          const heightCm = profile?.physicalMetrics?.height;
                          const hM = heightCm ? heightCm / 100 : 0;
                          const idealLow = hM ? Math.round(18.5 * hM * hM) : 0;
                          const idealHigh = hM ? Math.round(24.9 * hM * hM) : 0;
                          return (
                            <div className="bmi-gauge bmi-summary">
                              <div className="bmi-summary-top">
                                <span className="bmi-number">{bmi ?? '—'}</span>
                                <span className="bmi-caption">BMI</span>
                                <span className={`bmi-badge status-${status.cls}`}>{status.label}</span>
                              </div>
                              {pct !== null && (
                                <>
                                  <div className="bmi-gauge-track">
                                    <span className="bmi-gauge-zone zone-under" />
                                    <span className="bmi-gauge-zone zone-normal" />
                                    <span className="bmi-gauge-zone zone-over" />
                                    <span className="bmi-gauge-zone zone-obese" />
                                    <span className="bmi-gauge-marker" style={{ left: `${pct}%` }} />
                                  </div>
                                  <div className="bmi-gauge-labels">
                                    <span>18.5</span>
                                    <span>25</span>
                                    <span>30</span>
                                  </div>
                                </>
                              )}
                              {idealLow > 0 && (
                                <p className="bmi-gauge-hint">
                                  Healthy weight range for your height: <strong>{idealLow}–{idealHigh} kg</strong>
                                </p>
                              )}
                            </div>
                          );
                        })()}
                        {(!profile?.bmr || !profile?.tdee) && (
                          <div className="energy-stats">
                            <div className="energy-row">
                              <span className="lbl">TDEE</span>
                              <span className="val">—</span>
                            </div>
                            <div className="energy-row">
                              <span className="lbl">BMR</span>
                              <span className="val">—</span>
                            </div>
                          </div>
                        )}
                        {(() => {
                          const bmr = profile?.bmr;
                          const tdee = profile?.tdee;
                          if (!bmr || !tdee || tdee <= bmr) return null;
                          const activity = tdee - bmr;
                          const bmrPct = Math.round((bmr / tdee) * 100);
                          const activityPct = 100 - bmrPct;
                          return (
                            <div className="energy-balance">
                              <div className="energy-balance-head">
                                <Zap size={12} strokeWidth={2.4} />
                                <span>Energy balance</span>
                                <span className="energy-balance-total">{Math.round(tdee).toLocaleString()} kcal/day</span>
                              </div>
                              <div className="energy-balance-track">
                                <span className="energy-balance-seg seg-bmr" style={{ width: `${bmrPct}%` }} />
                                <span className="energy-balance-seg seg-activity" style={{ width: `${activityPct}%` }} />
                              </div>
                              <div className="energy-balance-legend">
                                <span><i className="seg-bmr" />Resting (BMR) · {Math.round(bmr).toLocaleString()} kcal ({bmrPct}%)</span>
                                <span><i className="seg-activity" />Activity · {Math.round(activity).toLocaleString()} kcal ({activityPct}%)</span>
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Nutrition targets card */}
                      <div className="metric-card card-nutrition">
                        <div className="metric-card-head">
                          <Target size={15} />
                          <span>Nutrition Targets</span>
                        </div>
                        <div className="nutrition-kcal">
                          <span className="kcal-val">
                            {profile?.dynamicTargets?.calculatedCalories ? Math.round(profile.dynamicTargets.calculatedCalories).toLocaleString() : '—'} <span className="unit">kcal</span>
                          </span>
                          <span className="kcal-lbl">Target Calorie Intake</span>
                        </div>
                        {(() => {
                          const calcCal = profile?.dynamicTargets?.calculatedCalories || 0;
                          const calcProt = profile?.dynamicTargets?.calculatedProtein || 0;
                          const calcCarb = profile?.dynamicTargets?.calculatedCarbs || 0;
                          const calcFat = profile?.dynamicTargets?.calculatedFat || 0;

                          const protPct = calcCal > 0 ? Math.round((calcProt * 4 / calcCal) * 100) : 0;
                          const carbPct = calcCal > 0 ? Math.round((calcCarb * 4 / calcCal) * 100) : 0;
                          const fatPct = calcCal > 0 ? Math.max(0, 100 - protPct - carbPct) : 0;

                          if (calcCal <= 0) {
                            return <p className="profile-metric-empty">No nutrition targets calculated yet</p>;
                          }

                          const macroRingData = [
                            { name: 'Protein', grams: calcProt, pct: protPct, color: '#e08b8b' },
                            { name: 'Carbs', grams: calcCarb, pct: carbPct, color: '#7fa8c9' },
                            { name: 'Fats', grams: calcFat, pct: fatPct, color: '#dcc27a' },
                          ];

                          return (
                            <div className="profile-macro-ring">
                              <div className="profile-macro-ring-chart">
                                {isMounted && (
                                  <ResponsiveContainer width="99%" height="100%" minWidth={0} minHeight={0}>
                                    <PieChart>
                                      <Pie
                                        data={macroRingData}
                                        dataKey="pct"
                                        nameKey="name"
                                        cx="50%"
                                        cy="50%"
                                        innerRadius="64%"
                                        outerRadius="92%"
                                        stroke="none"
                                        isAnimationActive={false}
                                      >
                                        {macroRingData.map((seg) => (
                                          <Cell key={seg.name} fill={seg.color} />
                                        ))}
                                      </Pie>
                                    </PieChart>
                                  </ResponsiveContainer>
                                )}
                                <div className="profile-macro-ring-center">
                                  <b>{protPct}%</b>
                                  <span>protein</span>
                                </div>
                              </div>
                              <ul className="profile-macro-ring-legend">
                                {macroRingData.map((seg) => (
                                  <li key={seg.name}>
                                    <i style={{ background: seg.color }} />
                                    <span>{seg.name}</span>
                                    <b>{seg.grams}g <em>({seg.pct}%)</em></b>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          );
                        })()}
                      </div>

                    </div>

                    {/* Integrations sit apart from the health metrics they have nothing to do with. */}
                    <section className="profile-integrations" aria-label="Integrations">
                      <header className="metrics-header">
                        <p>Settings</p>
                        <h2>Integrations</h2>
                      </header>
                      {/* Google Calendar sync */}
                      <div className="metric-card card-sync">
                        <div className="metric-card-head">
                          <Calendar size={15} />
                          <span>Google Calendar Sync</span>
                        </div>
                        {syncStatus?.connected ? (
                          <div className="sync-card-content">
                            <div className="sync-status-row">
                              <div className="sync-badge connected">
                                <span className="dot"></span>
                                <span>Sync Active</span>
                              </div>
                              <div className="sync-actions">
                                <button
                                  className="sync-btn-now"
                                  onClick={handleSyncNow}
                                  disabled={syncLoading}
                                >
                                  <RefreshCw size={12} className={syncLoading ? 'animate-spin' : ''} />
                                  <span>{syncLoading ? 'Syncing...' : 'Sync Now'}</span>
                                </button>
                                <button
                                  className="sync-btn-disconnect"
                                  onClick={handleDisconnectGoogle}
                                  disabled={syncLoading}
                                >
                                  Disconnect
                                </button>
                              </div>
                            </div>
                            <div className="sync-details-panel">
                              <div className="sync-detail-item">
                                <span className="lbl">Account</span>
                                <span className="val truncate-email" title={syncStatus.email}>{syncStatus.email}</span>
                              </div>
                              <div className="sync-divider" />
                              <div className="sync-detail-item align-right">
                                <span className="lbl">Last Synced</span>
                                <span className="val">
                                  {syncStatus.accounts?.[0]?.lastSyncedAt && syncStatus.accounts[0].lastSyncedAt !== ''
                                    ? new Date(syncStatus.accounts[0].lastSyncedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
                                    : 'Waiting for Sync'}
                                </span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="sync-card-content">
                            <div className="sync-status-row">
                              <div className="sync-badge disconnected">
                                <span className="dot"></span>
                                <span>Not Connected</span>
                              </div>
                              <div className="sync-actions">
                                <button
                                  className="sync-btn-connect"
                                  onClick={handleConnectGoogle}
                                  disabled={authUrlLoading}
                                >
                                  {authUrlLoading ? 'Redirecting...' : 'Link Calendar'}
                                </button>
                              </div>
                            </div>
                            <p className="sync-copy">
                              Synchronize your calendar events and dashboard tasks bidirectionally in real-time.
                            </p>
                          </div>
                        )}
                      </div>
                    </section>
                  </section>

                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* EDIT PROFILE MODAL DIALOG */}
      {isEditing && (
        <div className="profile-modal-overlay" onClick={handleGuardedCancel}>
          <div className="profile-modal-card glass-panel animate-modal-in" onClick={(e) => e.stopPropagation()}>
            <div className="profile-modal-header">
              <h2>Edit Profile Details</h2>
              <button
                type="button"
                className="profile-modal-close-btn"
                onClick={handleGuardedCancel}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div className="profile-modal-body">
                <div className="profile-modal-tabs-content">
                  {/* Left Column: General Fields */}
                  <div className="modal-form-section">
                    <h3 className="section-title">Identity & Account</h3>

                    <div className="profile-input-group">
                      <label htmlFor="displayName">Full name</label>
                      <input
                        id="displayName"
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="e.g. James Carter"
                        required
                      />
                    </div>

                    <div className="profile-input-group">
                      <label htmlFor="email">Email</label>
                      <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="e.g. jamescarter1930@gmail.com"
                      />
                    </div>

                    <div className="profile-input-row-split">
                      <div className="profile-input-group">
                        <label htmlFor="title">Title</label>
                        <input
                          id="title"
                          type="text"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="e.g. Project manager"
                        />
                      </div>
                      <div className="profile-input-group">
                        <label htmlFor="status">Status</label>
                        <div className="profile-select-wrapper">
                          <select
                            id="status"
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                          >
                            <option value="Online">Online</option>
                            <option value="Offline">Offline</option>
                            <option value="Away">Away</option>
                            <option value="Do Not Disturb">Do Not Disturb</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="profile-input-row-split">
                      <div className="profile-input-group">
                        <label htmlFor="timezone">Timezone</label>
                        <div className="profile-select-wrapper">
                          <select
                            id="timezone"
                            value={timezone}
                            onChange={(e) => setTimezone(e.target.value)}
                          >
                            {timezonePresets.map((tz) => (
                              <option key={tz} value={tz}>
                                {tz}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="profile-input-group">
                        <label htmlFor="workingHours">Working hours</label>
                        <div className="profile-input-with-icon">
                          <input
                            id="workingHours"
                            type="text"
                            value={workingHours}
                            onChange={(e) => setWorkingHours(e.target.value)}
                            placeholder="e.g. 10 AM - 6 PM"
                          />
                          <Clock size={16} className="input-icon-right" />
                        </div>
                      </div>
                    </div>

                    <div className="profile-input-group">
                      <label htmlFor="bio">Bio</label>
                      <textarea
                        id="bio"
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder="e.g. Timeless, iconic, and unapologetically analog..."
                        rows={3}
                        className="profile-textarea"
                      />
                    </div>
                  </div>

                  {/* Right Column: Health Biometrics & Goals */}
                  <div className="modal-form-section">
                    <h3 className="section-title">Health Biometrics & Target Engine</h3>

                    <div className="profile-input-row-split">
                      <div className="profile-input-group">
                        <label htmlFor="age">Age (years)</label>
                        <input
                          id="age"
                          type="number"
                          value={age}
                          onChange={(e) => setAge(e.target.value)}
                          placeholder="e.g. 28"
                          min="1"
                          required
                        />
                      </div>
                      <div className="profile-input-group">
                        <label htmlFor="gender">Gender</label>
                        <div className="profile-select-wrapper">
                          <select
                            id="gender"
                            value={gender}
                            onChange={(e) => setGender(e.target.value)}
                          >
                            <option value="MALE">Male</option>
                            <option value="FEMALE">Female</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="profile-input-row-split">
                      <div className="profile-input-group">
                        <label htmlFor="height">Height (cm)</label>
                        <input
                          id="height"
                          type="number"
                          value={height}
                          onChange={(e) => setHeight(e.target.value)}
                          placeholder="e.g. 180"
                          min="1"
                          step="0.1"
                          required
                        />
                      </div>
                      <div className="profile-input-group">
                        <label htmlFor="weight">Weight (kg)</label>
                        <input
                          id="weight"
                          type="number"
                          value={weight}
                          onChange={(e) => setWeight(e.target.value)}
                          placeholder="e.g. 75"
                          min="1"
                          step="0.1"
                          required
                        />
                      </div>
                    </div>

                    <div className="profile-input-group">
                      <label htmlFor="activityLevel">Activity Level</label>
                      <div className="profile-select-wrapper">
                        <select
                          id="activityLevel"
                          value={activityLevel}
                          onChange={(e) => setActivityLevel(e.target.value)}
                        >
                          <option value="SEDENTARY">Sedentary (Little or no exercise)</option>
                          <option value="LIGHTLY_ACTIVE">Lightly Active (Light exercise 1-3 days/wk)</option>
                          <option value="MODERATELY_ACTIVE">Moderately Active (Moderate exercise 3-5 days/wk)</option>
                          <option value="ACTIVE">Active (Hard exercise 6-7 days/wk)</option>
                          <option value="VERY_ACTIVE">Very Active (Very hard exercise, physical job)</option>
                        </select>
                      </div>
                    </div>

                    <div className="profile-input-group">
                      <label htmlFor="fitnessGoal">Fitness Goal</label>
                      <div className="profile-select-wrapper">
                        <select
                          id="fitnessGoal"
                          value={fitnessGoal}
                          onChange={(e) => setFitnessGoal(e.target.value)}
                        >
                          <option value="LOSE_WEIGHT">Lose Weight (-500 kcal deficit)</option>
                          <option value="MAINTAIN_WEIGHT">Maintain Weight (TDEE balance)</option>
                          <option value="GAIN_MUSCLE">Gain Muscle (+300 kcal surplus)</option>
                        </select>
                      </div>
                    </div>

                    <div className="profile-input-group">
                      <label>Medical Conditions & Dietary Flags</label>
                      <div className="medical-conditions-selector">
                        <div className="medical-checkbox-grid">
                          {PRESET_CONDITIONS.map((cond) => {
                            const isChecked = medicalConditions.includes(cond);
                            return (
                              <button
                                type="button"
                                key={cond}
                                className={`medical-pill-select ${isChecked ? 'selected' : ''}`}
                                onClick={() => handleToggleCondition(cond)}
                              >
                                {cond}
                              </button>
                            );
                          })}
                        </div>

                        {medicalConditions.filter((cond) => !PRESET_CONDITIONS.includes(cond)).length > 0 && (
                          <div className="medical-checkbox-grid">
                            {medicalConditions
                              .filter((cond) => !PRESET_CONDITIONS.includes(cond))
                              .map((cond) => (
                                <button
                                  type="button"
                                  key={cond}
                                  className="medical-pill-select selected medical-pill-select--custom"
                                  onClick={() => handleRemoveCustomCondition(cond)}
                                  title="Remove"
                                >
                                  {cond}
                                  <X size={11} />
                                </button>
                              ))}
                          </div>
                        )}

                        <div className="custom-condition-add">
                          <input
                            type="text"
                            placeholder="Add custom flag (e.g. Celiac)..."
                            value={customConditionInput}
                            onChange={(e) => setCustomConditionInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddCustomCondition();
                              }
                            }}
                          />
                          <button
                            type="button"
                            className="add-custom-cond-btn"
                            onClick={handleAddCustomCondition}
                          >
                            <Plus size={14} />
                            <span>Add</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Avatar Selection Row */}
                <div className="profile-modal-avatar-section">
                  <div className="profile-dashed-divider h-divider"></div>
                  <div className="avatar-picker-row">
                    <span className="preview-label">Avatar Preset</span>
                    <div className="avatar-scroll-list">
                      {avatarPresets.map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          className={`avatar-picker-pill ${avatarUrl === preset.id ? 'selected' : ''}`}
                          onClick={() => setAvatarUrl(preset.id)}
                        >
                          <img src={preset.img} alt={preset.name} className="avatar-img-thumb" />
                          <span>{preset.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="profile-modal-footer">
                <span className="profile-last-updated">
                  {formatLastUpdated(profile?.updatedAt || profile?.createdAt)}
                </span>
                <div className="profile-footer-buttons">
                  <button
                    type="button"
                    className="profile-cancel-btn"
                    onClick={handleGuardedCancel}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="profile-submit-btn"
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : 'Save changes'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={showLogoutDialog}
        title="Log out"
        message="Do you want to log out of your session?"
        confirmLabel="Log Out"
        cancelLabel="Cancel"
        onConfirm={confirmLogout}
        onCancel={() => setShowLogoutDialog(false)}
      />
    </>
  );
}
