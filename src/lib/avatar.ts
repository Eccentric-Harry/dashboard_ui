import avatar1 from '../assets/avatars/avatar1.png'
import avatar2 from '../assets/avatars/avatar2.png'
import avatar3 from '../assets/avatars/avatar3.png'
import avatar4 from '../assets/avatars/avatar4.png'
import avatarLuffy from '../assets/reference-crops/avatar_luffy.png'

export const getAvatarImage = (avatarUrl?: string) => {
  if (avatarUrl === 'avatar1') return avatar1
  if (avatarUrl === 'avatar2') return avatar2
  if (avatarUrl === 'avatar3') return avatar3
  if (avatarUrl === 'avatar4') return avatar4
  return avatarLuffy
}

export const avatarPresets = [
  { id: 'luffy', name: 'Luffy (Default)', img: avatarLuffy },
  { id: 'avatar1', name: 'Ninja', img: avatar1 },
  { id: 'avatar2', name: 'Hacker', img: avatar2 },
  { id: 'avatar3', name: 'Explorer', img: avatar3 },
  { id: 'avatar4', name: 'Cyberpunk', img: avatar4 },
]
