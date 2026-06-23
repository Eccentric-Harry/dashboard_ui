import React, { useEffect, useState, useRef } from 'react';
import { Check, Loader2, X, Clock, Pencil, LogOut, Mail, Globe, Bell, ChevronRight } from 'lucide-react';
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

export function ProfileOverview({ activePath, onNavigate }: ProfileOverviewProps) {
  const { unreadCount, setIsOpen } = useNotifications();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Form states
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('luffy');
  const [email, setEmail] = useState('');
  const [timezone, setTimezone] = useState('GMT+0');
  const [workingHours, setWorkingHours] = useState('9 AM - 5 PM');
  const [title, setTitle] = useState('');
  const [bio, setBio] = useState('');
  const [status, setStatus] = useState('Online');

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
          setBio(data.bio || '');
          setStatus(data.status || 'Online');
          
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
        bio: bio.trim(),
        status,
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
    <><main className="dashboard-shell">
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
            <>
              {isEditing ? (
                /* EDIT VIEW FORM */
                <div className="profile-porsche-card profile-porsche-card-edit">
                  <div className="profile-card-header">
                    <h2>Edit profile</h2>
                    <button
                      type="button"
                      className="profile-close-btn"
                      onClick={handleCancel}
                      aria-label="Close"
                    >
                      <X size={18} />
                    </button>
                  </div>
                  <form onSubmit={handleSave}>
                    <div className="profile-card-body">
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
                        </div>

                        <div className="profile-input-row-split">
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

                      <div className="profile-dashed-divider"></div>

                      <div className="profile-preview-panel">
                        <span className="preview-label">Avatar</span>

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
                      </div>
                    </div>

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
                </div>
              ) : (
                /* ═══════════════════════════════════════════ */
                /* READ-ONLY — Premium Porsche Card Layout    */
                /* ═══════════════════════════════════════════ */
                <div className="profile-porsche-card">
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
              )}

              {!isEditing && (
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
              )}
            </>
          )}
        </div>
      </div>
    </main>

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
