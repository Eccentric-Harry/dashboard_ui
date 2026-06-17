import {
  BookOpen, Code, Cpu, Layout, Server, GraduationCap, Compass, Settings,
  Database, Cloud, Shield, Smartphone, BarChart2, CheckSquare, Languages, Coins, Heart, PenTool
} from 'lucide-react'

export function isoDate(d = new Date()) {
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function parseIsoDate(dateValue?: string) {
  if (!dateValue) return new Date()
  const [year, month, day] = dateValue.split('-').map(Number)
  if (!year || !month || !day) {
    const d = new Date(dateValue)
    return d.toString() !== 'Invalid Date' ? d : new Date()
  }
  return new Date(year, month - 1, day)
}

export function formatHeaderDate(date: Date) {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export function extractNotionUrl(text: string): string | null {
  if (!text) return null
  // eslint-disable-next-line no-useless-escape
  const match = text.match(/(https?:\/\/(?:www\.)?notion\.so\/[^\s\)]+)/i)
  return match ? match[0] : null
}

export function getIconForCategory(category: string) {
  const cat = category.toLowerCase().trim()
  if (cat.includes('computer science') || cat.includes('cs') || cat.includes('algorithm')) {
    return GraduationCap
  }
  if (cat.includes('development') || cat.includes('programming') || cat.includes('coding') || cat.includes('code')) {
    return Code
  }
  if (cat.includes('architecture') || cat.includes('system') || cat.includes('design') || cat.includes('structure')) {
    return Compass
  }
  if (cat.includes('frontend') || cat.includes('ui') || cat.includes('react') || cat.includes('css') || cat.includes('html')) {
    return Layout
  }
  if (cat.includes('backend') || cat.includes('server') || cat.includes('spring') || cat.includes('api')) {
    return Server
  }
  if (cat.includes('git') || cat.includes('github') || cat.includes('devops') || cat.includes('ci/cd') || cat.includes('settings')) {
    return Settings
  }
  if (cat.includes('ai') || cat.includes('ml') || cat.includes('model') || cat.includes('artificial') || cat.includes('nlp')) {
    return Cpu
  }
  if (cat.includes('db') || cat.includes('database') || cat.includes('sql') || cat.includes('mongo') || cat.includes('redis') || cat.includes('postgres')) {
    return Database
  }
  if (cat.includes('cloud') || cat.includes('aws') || cat.includes('gcp') || cat.includes('azure') || cat.includes('docker') || cat.includes('kubernetes')) {
    return Cloud
  }
  if (cat.includes('security') || cat.includes('cryptography') || cat.includes('crypto') || cat.includes('auth') || cat.includes('jwt')) {
    return Shield
  }
  if (cat.includes('mobile') || cat.includes('ios') || cat.includes('android') || cat.includes('app') || cat.includes('react native') || cat.includes('flutter')) {
    return Smartphone
  }
  if (cat.includes('data') || cat.includes('analytics') || cat.includes('stats') || cat.includes('excel') || cat.includes('analysis')) {
    return BarChart2
  }
  if (cat.includes('test') || cat.includes('qa') || cat.includes('cypress') || cat.includes('jest') || cat.includes('verification')) {
    return CheckSquare
  }
  if (cat.includes('lang') || cat.includes('english') || cat.includes('spanish') || cat.includes('read') || cat.includes('write')) {
    return Languages
  }
  if (cat.includes('finance') || cat.includes('money') || cat.includes('coin') || cat.includes('invest') || cat.includes('budget')) {
    return Coins
  }
  if (cat.includes('health') || cat.includes('fitness') || cat.includes('gym') || cat.includes('nutrition') || cat.includes('personal') || cat.includes('self') || cat.includes('heart')) {
    return Heart
  }
  if (cat.includes('figma') || cat.includes('ux') || cat.includes('design') || cat.includes('sketch') || cat.includes('art')) {
    return PenTool
  }
  return BookOpen // Fallback for custom categories
}

export function getConsistentColor(category: string) {
  const cat = category.toLowerCase().trim()
  if (cat.includes('computer science') || cat.includes('cs')) return '#6366f1'
  if (cat.includes('development') || cat.includes('coding')) return '#2563eb'
  if (cat.includes('architecture') || cat.includes('system')) return '#8b5cf6'
  if (cat.includes('frontend') || cat.includes('ui')) return '#0ea5e9'
  if (cat.includes('backend') || cat.includes('server')) return '#f97316'
  if (cat.includes('git') || cat.includes('github')) return '#64748b'
  if (cat.includes('ai') || cat.includes('ml')) return '#4f46e5'
  if (cat.includes('personal')) return '#f43f5e'

  // Custom hash color for unknown custom categories!
  let hash = 0
  for (let i = 0; i < category.length; i++) {
    hash = category.charCodeAt(i) + ((hash << 5) - hash)
  }
  const colors = ['#0ea5e9', '#3b82f6', '#ef4444', '#f43f5e', '#ec4899', '#a855f7', '#d946ef', '#f97316']
  return colors[Math.abs(hash) % colors.length]
}

export function getCategoryStyle(category: string) {
  const tone = getConsistentColor(category)
  return {
    bg: `${tone}10`, // 10% opacity
    color: tone,
    border: `1px solid ${tone}24`, // 15% opacity
  }
}
