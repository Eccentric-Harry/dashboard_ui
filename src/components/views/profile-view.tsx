import React, { useEffect, useState } from 'react';
import {
  X, Clock, Pencil, LogOut, Mail, Globe, Bell,
  Activity, Target, Plus, Calendar, RefreshCw,
  Cake, PersonStanding, Ruler, Weight, Footprints,
  HeartPulse, Sparkles
} from 'lucide-react';
import {
  getUserProfile,
  updateUserProfile,
  fetchGoogleSyncStatus,
  fetchGoogleAuthUrl,
  disconnectGoogleCalendar,
  triggerGoogleSync,
  type UserProfile,
  type GoogleSyncStatus
} from '../../lib/api';
import { SideRail } from '../dashboard/quantified-self-dashboard/components/side-rail';
import { TopChip } from '../dashboard/quantified-self-dashboard/components/top-chip';
import type { AppPath } from '../dashboard/quantified-self-dashboard/data';
import toast from 'react-hot-toast';
import { useNotifications } from '../../contexts/NotificationContext';
import { ConfirmDialog } from '../ui/confirm-dialog';
import { getAvatarImage, avatarPresets } from '../../lib/avatar';
import './profile-view.css';

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

function getBmiStatus(bmi?: number): string {
  if (!bmi || bmi <= 0) return '—';
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25.0) return 'Normal';
  if (bmi < 30.0) return 'Overweight';
  return 'Obese';
}

function getBmiStatusClass(bmi?: number): string {
  if (!bmi || bmi <= 0) return 'none';
  if (bmi < 18.5) return 'underweight';
  if (bmi < 25.0) return 'normal';
  if (bmi < 30.0) return 'overweight';
  return 'obese';
}

export function ProfileOverview({ activePath, onNavigate }: ProfileOverviewProps) {
  const { unreadCount, setIsOpen } = useNotifications();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

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
    async function loadProfile() {
      try {
        const res = await getUserProfile();
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
      const res = await fetchGoogleSyncStatus();
      if (res?.data) {
        setSyncStatus(res.data);
      }
    } catch (err) {
      console.error('Failed to load Google sync status:', err);
    }
  };

  useEffect(() => {
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
      const res = await fetchGoogleAuthUrl();
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
      await disconnectGoogleCalendar();
      toast.success('Disconnected from Google Calendar');
      setSyncStatus({ connected: false, accounts: [] });
    } catch (err) {
      toast.error('Failed to disconnect from Google Calendar');
    }
  };

  const handleSyncNow = async () => {
    setSyncLoading(true);
    try {
      await triggerGoogleSync();
      toast.success('Calendar synchronization triggered');
      setTimeout(loadSyncStatus, 2000);
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
        activityLevel: activityLevel as any,
        fitnessGoal: fitnessGoal as any,
        medicalConditions,
      };

      const res = await updateUserProfile(payload);
      if (res?.data) {
        toast.success('Profile updated successfully!');
        localStorage.setItem('displayName', res.data.displayName);
        localStorage.setItem('avatarUrl', res.data.avatarUrl || 'luffy');
        setProfile(res.data);
        window.dispatchEvent(new Event('profile-updated'));
        setIsEditing(false);
      }
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
        <div className="dashboard-stage" aria-label="User Profile">
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
                        <button
                          type="button"
                          className="identity-notif-btn"
                          onClick={() => setIsOpen(true)}
                          aria-label="Open notifications"
                        >
                          <Bell size={13} />
                          {unreadCount > 0 && (
                            <span className="identity-notif-badge">{unreadCount}</span>
                          )}
                        </button>
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

                    {bio && <p className="identity-bio">{bio}</p>}

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
                          <span className="val">
                            {GOAL_LABELS[profile?.fitnessGoal ?? '']?.label ?? '—'}{' '}
                            <span className="unit">{GOAL_LABELS[profile?.fitnessGoal ?? '']?.delta ?? ''}</span>
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
                              <HeartPulse size={11} strokeWidth={2.4} />
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
                        <span className="bio-tile-icon tint-yellow"><Sparkles size={13} strokeWidth={2.2} /></span>
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
                    </header>

                    <div className="metrics-grid">
                      {/* BMI & Energy card */}
                      <div className="metric-card card-status">
                        <div className="metric-card-head">
                          <Activity size={15} />
                          <span>BMI & BMR Status</span>
                        </div>
                        <div className="status-body">
                          <div className="bmi-ring-wrap">
                            <div className={`bmi-ring status-${getBmiStatusClass(profile?.bmi)}`}>
                              <span className="bmi-number">{profile?.bmi ?? '—'}</span>
                              <span className="bmi-caption">BMI</span>
                            </div>
                            <span className={`bmi-badge status-${getBmiStatusClass(profile?.bmi)}`}>
                              {getBmiStatus(profile?.bmi)}
                            </span>
                          </div>
                          <div className="energy-stats">
                            <div className="energy-row">
                              <span className="lbl">TDEE</span>
                              <span className="val">
                                {profile?.tdee ? Math.round(profile.tdee).toLocaleString() : '—'} <span className="unit">kcal</span>
                              </span>
                            </div>
                            <div className="energy-row">
                              <span className="lbl">BMR</span>
                              <span className="val">
                                {profile?.bmr ? Math.round(profile.bmr).toLocaleString() : '—'} <span className="unit">kcal</span>
                              </span>
                            </div>
                          </div>
                        </div>
                        {(() => {
                          const bmi = profile?.bmi;
                          if (!bmi || bmi <= 0) return null;
                          const pct = Math.min(100, Math.max(0, ((bmi - 14) / (40 - 14)) * 100));
                          const heightCm = profile?.physicalMetrics?.height;
                          const hM = heightCm ? heightCm / 100 : 0;
                          const idealLow = hM ? Math.round(18.5 * hM * hM) : 0;
                          const idealHigh = hM ? Math.round(24.9 * hM * hM) : 0;
                          return (
                            <div className="bmi-gauge">
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
                              {idealLow > 0 && (
                                <p className="bmi-gauge-hint">
                                  Healthy weight range for your height: <strong>{idealLow}–{idealHigh} kg</strong>
                                </p>
                              )}
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

                          return (
                            <>
                              <div className="macro-split-bar" aria-hidden="true">
                                <span className="split protein" style={{ width: `${protPct}%` }} />
                                <span className="split carbs" style={{ width: `${carbPct}%` }} />
                                <span className="split fat" style={{ width: `${fatPct}%` }} />
                              </div>
                            <div className="nutrition-macros-grid">
                              <div className="macro-bar-item protein">
                                <div className="macro-info">
                                  <span className="macro-name">Protein</span>
                                  <span className="macro-gram">
                                    {calcProt ?? '—'}g <span className="pct-label">({protPct}%)</span>
                                  </span>
                                </div>
                                <div className="macro-progress-track">
                                  <div className="macro-progress-fill" style={{ width: `${protPct}%` }}></div>
                                </div>
                              </div>
                              <div className="macro-bar-item carbs">
                                <div className="macro-info">
                                  <span className="macro-name">Carbs</span>
                                  <span className="macro-gram">
                                    {calcCarb ?? '—'}g <span className="pct-label">({carbPct}%)</span>
                                  </span>
                                </div>
                                <div className="macro-progress-track">
                                  <div className="macro-progress-fill" style={{ width: `${carbPct}%` }}></div>
                                </div>
                              </div>
                              <div className="macro-bar-item fat">
                                <div className="macro-info">
                                  <span className="macro-name">Fats</span>
                                  <span className="macro-gram">
                                    {calcFat ?? '—'}g <span className="pct-label">({fatPct}%)</span>
                                  </span>
                                </div>
                                <div className="macro-progress-track">
                                  <div className="macro-progress-fill" style={{ width: `${fatPct}%` }}></div>
                                </div>
                              </div>
                            </div>
                            </>
                          );
                        })()}
                      </div>

                      {/* Google Calendar sync — horizontal strip */}
                      <div className="metric-card card-sync">
                        <div className="metric-card-head">
                          <Calendar size={15} />
                          <span>Google Calendar Sync</span>
                        </div>
                        {syncStatus?.connected ? (
                          <div className="sync-body">
                            <div className="sync-info">
                              <div className="sync-badge connected">
                                <span className="dot"></span>
                                <span>Sync Active</span>
                              </div>
                              <div className="sync-meta">
                                <span className="sync-meta-item">
                                  <span className="lbl">Account</span>
                                  <span className="val truncate-email" title={syncStatus.email}>{syncStatus.email}</span>
                                </span>
                                <span className="sync-meta-item">
                                  <span className="lbl">Last Synced</span>
                                  <span className="val">
                                    {syncStatus.accounts?.[0]?.lastSyncedAt && syncStatus.accounts[0].lastSyncedAt !== ''
                                      ? new Date(syncStatus.accounts[0].lastSyncedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
                                      : 'Waiting for Sync'}
                                  </span>
                                </span>
                              </div>
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
                              >
                                Disconnect
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="sync-body">
                            <div className="sync-info">
                              <div className="sync-badge disconnected">
                                <span className="dot"></span>
                                <span>Not Connected</span>
                              </div>
                              <p className="sync-copy">
                                Synchronize your calendar events and dashboard tasks bidirectionally in real-time.
                              </p>
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
                        )}
                      </div>
                    </div>
                  </section>

                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* EDIT PROFILE MODAL DIALOG */}
      {isEditing && (
        <div className="profile-modal-overlay" onClick={handleCancel}>
          <div className="profile-modal-card glass-panel animate-modal-in" onClick={(e) => e.stopPropagation()}>
            <div className="profile-modal-header">
              <h2>Edit Profile Details</h2>
              <button
                type="button"
                className="profile-modal-close-btn"
                onClick={handleCancel}
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
                    onClick={handleCancel}
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
