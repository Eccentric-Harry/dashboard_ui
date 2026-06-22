import { useEffect, useState } from 'react'
import { getAvatarImage } from '../../../views/profile-view'

function TopChip() {
  const [avatar, setAvatar] = useState(() => localStorage.getItem('avatarUrl') || 'luffy')
  const [displayName, setDisplayName] = useState(() => localStorage.getItem('displayName') || 'User')

  useEffect(() => {
    const handleUpdate = () => {
      setAvatar(localStorage.getItem('avatarUrl') || 'luffy')
      setDisplayName(localStorage.getItem('displayName') || 'User')
    }
    window.addEventListener('profile-updated', handleUpdate)
    return () => window.removeEventListener('profile-updated', handleUpdate)
  }, [])

  return (
    <div className="top-chip">
      <span>{displayName}</span>
      <img src={getAvatarImage(avatar)} alt="Profile" />
    </div>
  )
}

export { TopChip }
