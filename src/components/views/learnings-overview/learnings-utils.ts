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
  const match = text.match(/(https?:\/\/(?:www\.)?notion\.so\/[^\s\)]+)/i)
  return match ? match[0] : null
}

export function getCategoryStyle(category: string) {
  const cat = category.toLowerCase()
  if (['github', 'development', 'ai', 'devops', 'tech'].includes(cat)) {
    return {
      bg: 'rgba(26, 122, 74, 0.08)',
      color: '#1a7a4a',
      border: '1px solid rgba(26, 122, 74, 0.15)',
    }
  }
  if (cat === 'personal') {
    return {
      bg: 'rgba(99, 102, 241, 0.08)',
      color: '#4f46e5',
      border: '1px solid rgba(99, 102, 241, 0.15)',
    }
  }
  return {
    bg: 'rgba(13, 148, 136, 0.08)',
    color: '#0d9488',
    border: '1px solid rgba(13, 148, 136, 0.15)',
  }
}
