import React, { useEffect, useState, useRef } from 'react';
import { Check, Loader2, X, Clock, Pencil, LogOut } from 'lucide-react';
import { getUserProfile, updateUserProfile, type UserProfile } from '../../lib/api';
import { SideRail } from '../dashboard/quantified-self-dashboard/components/side-rail';
import { TopChip } from '../dashboard/quantified-self-dashboard/components/top-chip';
import type { AppPath } from '../dashboard/quantified-self-dashboard/data';
import toast from 'react-hot-toast';

import avatar1 from '../../assets/avatars/avatar1.png';
import avatar2 from '../../assets/avatars/avatar2.png';
import avatar3 from '../../assets/avatars/avatar3.png';
import avatar4 from '../../assets/avatars/avatar4.png';
import avatarLuffy from '../../assets/reference-crops/avatar_luffy.png';
import './profile-view.css';

type ProfileOverviewProps = {
  activePath: AppPath;
  onNavigate: (pathname: AppPath) => void;
};

export const getAvatarImage = (avatarUrl?: string) => {
  if (avatarUrl === 'avatar1') return avatar1;
  if (avatarUrl === 'avatar2') return avatar2;
  if (avatarUrl === 'avatar3') return avatar3;
  if (avatarUrl === 'avatar4') return avatar4;
  return avatarLuffy;
};

const avatarPresets = [
  { id: 'luffy', name: 'Luffy (Default)', img: avatarLuffy },
  { id: 'avatar1', name: 'Ninja', img: avatar1 },
  { id: 'avatar2', name: 'Hacker', img: avatar2 },
  { id: 'avatar3', name: 'Explorer', img: avatar3 },
  { id: 'avatar4', name: 'Cyberpunk', img: avatar4 },
];

const timezonePresets = [
  'GMT-12', 'GMT-11', 'GMT-10', 'GMT-9', 'GMT-8', 'GMT-7', 'GMT-6', 'GMT-5',
  'GMT-4', 'GMT-3', 'GMT-2', 'GMT-1', 'GMT+0', 'GMT+1', 'GMT+2', 'GMT+3',
  'GMT+4', 'GMT+5', 'GMT+5:30', 'GMT+6', 'GMT+7', 'GMT+8', 'GMT+9', 'GMT+10',
  'GMT+11', 'GMT+12'
];

export function ProfileOverview({ activePath, onNavigate }: ProfileOverviewProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Form states
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('luffy');
  const [email, setEmail] = useState('');
  const [timezone, setTimezone] = useState('GMT+0');
  const [workingHours, setWorkingHours] = useState('9 AM - 5 PM');
  const [title, setTitle] = useState('');

  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

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
        }
      } catch (err) {
        toast.error('Failed to load profile data');
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  // Close avatar picker when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setShowAvatarPicker(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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
    if (window.confirm('Do you want to log out of your session?')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const handleCancel = () => {
    // Reset form states to current profile values
    if (profile) {
      setDisplayName(profile.displayName || '');
      setAvatarUrl(profile.avatarUrl || 'luffy');
      setEmail(profile.email || '');
      setTimezone(profile.timezone || 'GMT-8');
      setWorkingHours(profile.workingHours || '10 AM - 6 PM');
      setTitle(profile.title || '');
    }
    setIsEditing(false);
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
    <main className="dashboard-shell">
      <div className="dashboard-stage" aria-label="User Profile">
        <SideRail activePath={activePath} onNavigate={onNavigate} />
        <TopChip />

        <div className="profile-container">
          {loading ? (
            <div className="profile-loading-panel glass-panel">
              <Loader2 className="animate-spin text-[#18181b]" size={36} />
              <p>Loading your profile details...</p>
            </div>
          ) : (
            <div className="profile-edit-card">
              {/* Header */}
              <div className="profile-card-header">
                <h2>{isEditing ? 'Edit your profile' : 'Profile'}</h2>
                <button
                  type="button"
                  className="profile-close-btn"
                  onClick={() => onNavigate('/nutrition')}
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>

              {isEditing ? (
                /* EDIT VIEW FORM */
                <form onSubmit={handleSave}>
                  <div className="profile-card-body">
                    {/* Left Form Panel */}
                    <div className="profile-form-panel">
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
                        <label htmlFor="title">Title</label>
                        <input
                          id="title"
                          type="text"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="e.g. Project manager"
                        />
                      </div>
                    </div>

                    {/* Dashed Separator */}
                    <div className="profile-dashed-divider"></div>

                    {/* Right Preview Panel */}
                    <div className="profile-preview-panel">
                      <span className="preview-label">Preview</span>

                      <div className="preview-avatar-wrapper" ref={pickerRef}>
                        <img
                          src={getAvatarImage(avatarUrl)}
                          alt="Preview Avatar"
                          className="preview-avatar"
                        />
                        <button
                          type="button"
                          className="avatar-edit-overlay"
                          onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                          aria-label="Edit avatar"
                        >
                          <Pencil size={12} />
                        </button>

                        {showAvatarPicker && (
                          <div className="avatar-picker-popover">
                            <span className="avatar-picker-title">Select Avatar</span>
                            <div className="avatar-picker-grid">
                              {avatarPresets.map((preset) => (
                                <button
                                  key={preset.id}
                                  type="button"
                                  className={`avatar-picker-option ${avatarUrl === preset.id ? 'selected' : ''}`}
                                  onClick={() => {
                                    setAvatarUrl(preset.id);
                                    setShowAvatarPicker(false);
                                  }}
                                >
                                  <img src={preset.img} alt={preset.name} />
                                  {avatarUrl === preset.id && (
                                    <div className="avatar-picker-check">
                                      <Check size={8} strokeWidth={3} />
                                    </div>
                                  )}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <h3 className="preview-name">{displayName || 'Your Name'}</h3>
                      <p className="preview-title">{title || 'Your Title'}</p>

                      <div className="preview-schedule">
                        <Clock size={14} />
                        <span>{workingHours || '10 AM - 6 PM'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Edit View Footer */}
                  <div className="profile-card-footer">
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
              ) : (
                /* DEFAULT READ-ONLY VIEW */
                <div>
                  <div className="profile-card-body">
                    {/* Left Read Info Panel */}
                    <div className="profile-form-panel">
                      <div className="profile-info-group">
                        <span className="profile-info-label">Full name</span>
                        <span className="profile-info-value">{displayName || 'Not set'}</span>
                      </div>

                      <div className="profile-info-group">
                        <span className="profile-info-label">Email</span>
                        <span className="profile-info-value">{email || 'Not set'}</span>
                      </div>

                      <div className="profile-input-row-split">
                        <div className="profile-info-group">
                          <span className="profile-info-label">Timezone</span>
                          <span className="profile-info-value">{timezone || 'Not set'}</span>
                        </div>

                        <div className="profile-info-group">
                          <span className="profile-info-label">Working hours</span>
                          <span className="profile-info-value">{workingHours || 'Not set'}</span>
                        </div>
                      </div>

                      <div className="profile-info-group">
                        <span className="profile-info-label">Title</span>
                        <span className="profile-info-value">{title || 'Not set'}</span>
                      </div>
                    </div>

                    {/* Dashed Separator */}
                    <div className="profile-dashed-divider"></div>

                    {/* Right Preview Panel */}
                    <div className="profile-preview-panel">
                      <span className="preview-label">Preview</span>

                      <div className="preview-avatar-wrapper">
                        <img
                          src={getAvatarImage(avatarUrl)}
                          alt="Preview Avatar"
                          className="preview-avatar"
                        />
                        <button
                          type="button"
                          className="avatar-edit-overlay"
                          onClick={() => {
                            setIsEditing(true);
                            setShowAvatarPicker(true);
                          }}
                          aria-label="Edit avatar"
                        >
                          <Pencil size={12} />
                        </button>
                      </div>

                      <h3 className="preview-name">{displayName || 'Your Name'}</h3>
                      <p className="preview-title">{title || 'Your Title'}</p>

                      <div className="preview-schedule">
                        <Clock size={14} />
                        <span>{workingHours || '10 AM - 6 PM'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Read View Footer */}
                  <div className="profile-card-footer">
                    <span className="profile-last-updated">
                      {formatLastUpdated(profile?.updatedAt || profile?.createdAt)}
                    </span>
                    <div className="profile-footer-buttons">
                      <button
                        type="button"
                        className="profile-logout-btn"
                        onClick={handleLogout}
                      >
                        <LogOut size={14} />
                        <span>Log Out</span>
                      </button>
                      <button
                        type="button"
                        className="profile-edit-toggle-btn"
                        onClick={() => setIsEditing(true)}
                      >
                        Edit Profile
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
