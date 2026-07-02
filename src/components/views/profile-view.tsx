import React, { useEffect, useState } from 'react';
import { 
  Loader2, X, Clock, Pencil, LogOut, Mail, Globe, Bell, ChevronRight,
  Activity, Target, ShieldAlert, Heart, Plus
} from 'lucide-react';
import { getUserProfile, updateUserProfile, type UserProfile } from '../../lib/api';
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
            {/* Route Header — matches workouts header design pattern */}
            <header className="profile-header">
              <div>
                <p>Your account</p>
                <h1>Profile</h1>
              </div>
            </header>

            {loading ? (
              <div className="profile-loading-panel glass-panel">
                <Loader2 className="animate-spin text-[#18181b]" size={36} />
                <p>Loading your profile details...</p>
              </div>
            ) : (
              <div className="profile-content-layout">
                {/* Unified Porsche Card containing both Identity and Health Stats */}
                <div className="profile-porsche-card">
                  <div className="profile-porsche-card-split">
                    
                    {/* Left Panel: Identity & Actions */}
                    <div className="profile-porsche-identity-section">
                      {/* Card Image Cover Header */}
                      <div className="profile-porsche-img-container">
                        <img
                          src={getAvatarImage(avatarUrl)}
                          alt="Profile Banner"
                          className="profile-porsche-img"
                        />
                      </div>

                      {/* Attributes Badges Row */}
                      <div className="profile-porsche-badges">
                        <div className="profile-porsche-pill">
                          <span className={`profile-porsche-dot status-${(status || 'Online').toLowerCase().replace(/\s+/g, '-')}`}></span>
                          <span>{status || 'Online'}</span>
                        </div>
                        <div className="profile-porsche-pill">
                          <Globe size={12} strokeWidth={2.5} />
                          <span>{timezone || 'GMT+5:30'}</span>
                        </div>
                        <div className="profile-porsche-pill">
                          <Clock size={12} strokeWidth={2.5} />
                          <span>{workingHours || '10 AM - 6 PM'}</span>
                        </div>
                      </div>

                      {/* Main Information Block */}
                      <div className="profile-porsche-content">
                        <h2 className="profile-porsche-name">{displayName || 'Your Name'}</h2>
                        <h3 className="profile-porsche-title">{title || 'Intern'}</h3>
                        <p className="profile-porsche-description">
                          {bio || 'Ready to learn, design, and develop premium dashboard systems.'}
                        </p>
                        {email && (
                          <a href={`mailto:${email}`} className="profile-porsche-email-link">
                            <Mail size={13} />
                            <span>{email}</span>
                          </a>
                        )}
                      </div>

                      {/* Actions & Timestamps Footer */}
                      <div className="profile-porsche-footer">
                        <span className="profile-porsche-last-updated">
                          {formatLastUpdated(profile?.updatedAt || profile?.createdAt)}
                        </span>
                        <div className="profile-porsche-actions">
                          <button
                            type="button"
                            className="profile-porsche-logout-btn"
                            onClick={handleLogout}
                          >
                            <LogOut size={14} />
                            <span>Log Out</span>
                          </button>
                          <button
                            type="button"
                            className="profile-porsche-edit-btn"
                            onClick={() => setIsEditing(true)}
                          >
                            <Pencil size={14} />
                            <span>Edit Profile</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Right Panel: Health & Performance Bento Grid */}
                    <div className="profile-porsche-health-section">
                      <div className="profile-quotes-header">
                        <p>Health & Performance</p>
                        <h2>Biometrics & TDEE</h2>
                      </div>
                      
                      <div className="profile-bento-grid">
                        {/* Card A: Biometrics Overview */}
                        <div className="profile-health-card card-biometrics">
                          <div className="card-header-icon">
                            <Heart className="text-gray-500" size={16} style={{ color: '#4b5563' }} />
                            <span className="card-tag">Biometrics</span>
                          </div>
                          <div className="biometrics-grid">
                            <div className="biometrics-item">
                              <span className="biometrics-label">Age</span>
                              <span className="biometrics-value">
                                {profile?.physicalMetrics?.age ?? '—'} <span className="unit">yrs</span>
                              </span>
                            </div>
                            <div className="biometrics-item">
                              <span className="biometrics-label">Gender</span>
                              <span className="biometrics-value capitalize">
                                {profile?.physicalMetrics?.gender?.toLowerCase() ?? '—'}
                              </span>
                            </div>
                            <div className="biometrics-item">
                              <span className="biometrics-label">Height</span>
                              <span className="biometrics-value">
                                {profile?.physicalMetrics?.height ?? '—'} <span className="unit">cm</span>
                              </span>
                            </div>
                            <div className="biometrics-item">
                              <span className="biometrics-label">Weight</span>
                              <span className="biometrics-value">
                                {profile?.physicalMetrics?.weight ?? '—'} <span className="unit">kg</span>
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Card B: The Metric Ring / Status */}
                        <div className="profile-health-card card-status">
                          <div className="card-header-icon">
                            <Activity className="text-gray-500" size={16} style={{ color: '#4b5563' }} />
                            <span className="card-tag">BMI & BMR Status</span>
                          </div>
                          <div className="status-metrics-wrapper">
                            <div className="bmi-circle-container">
                              <div className="bmi-circle">
                                <span className="bmi-number">{profile?.bmi ?? '—'}</span>
                                <span className="bmi-label">BMI</span>
                              </div>
                              <div className="bmi-status-indicator">
                                <span className={`bmi-badge status-${getBmiStatusClass(profile?.bmi)}`}>
                                  {getBmiStatus(profile?.bmi)}
                                </span>
                              </div>
                            </div>
                            <div className="tdee-container">
                              <div className="tdee-block">
                                <span className="tdee-label">TDEE</span>
                                <span className="tdee-value">
                                  {profile?.tdee ? Math.round(profile.tdee).toLocaleString() : '—'} <span className="unit">kcal</span>
                                </span>
                              </div>
                              <div className="bmr-block">
                                <span className="bmr-label">BMR</span>
                                <span className="bmr-value">
                                  {profile?.bmr ? Math.round(profile.bmr).toLocaleString() : '—'} <span className="unit">kcal</span>
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Card C: Daily Nutrition Targets */}
                        <div className="profile-health-card card-nutrition-targets">
                          <div className="card-header-icon">
                            <Target className="text-[#4b5563]" size={16} />
                            <span className="card-tag">Nutrition Targets</span>
                          </div>
                          <div className="nutrition-target-main">
                            <span className="nutr-kcal-val">
                              {profile?.dynamicTargets?.calculatedCalories ? Math.round(profile.dynamicTargets.calculatedCalories).toLocaleString() : '—'} <span className="unit">kcal</span>
                            </span>
                            <span className="nutr-kcal-lbl">Target Calorie Intake</span>
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
                            );
                          })()}
                        </div>

                        {/* Card D: Medical & Dietary Flags */}
                        <div className="profile-health-card card-medical">
                          <div className="card-header-icon">
                            <ShieldAlert className="text-gray-500" size={16} style={{ color: '#4b5563' }} />
                            <span className="card-tag">Conditions & Flags</span>
                          </div>
                          <div className="medical-conditions-container">
                            {profile?.medicalConditions && profile.medicalConditions.length > 0 ? (
                              <div className="medical-pills-list">
                                {profile.medicalConditions.map((condition, idx) => (
                                  <span key={idx} className="medical-pill">
                                    {condition}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <div className="no-conditions-text">
                                No conditions flagged
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                  </div>
                </div>

                {/* Notifications Options */}
                <button
                  type="button"
                  className="profile-notifications-option-card"
                  onClick={() => setIsOpen(true)}
                >
                  <div className="profile-notif-option-content">
                    <div className="profile-notif-icon-wrapper">
                      <Bell size={18} />
                      {unreadCount > 0 && (
                        <span className="profile-notif-badge">{unreadCount}</span>
                      )}
                    </div>
                    <div className="profile-notif-text">
                      <h3>Notifications</h3>
                      <p>
                        {unreadCount > 0
                          ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`
                          : 'All caught up'}
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="profile-notif-chevron" />
                </button>
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
