import { useMemo, type CSSProperties } from 'react'
import { ShoppingBag, Globe } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MarketplaceBadgeProps {
  store: string | null
  className?: string
}

interface StoreConfig {
  name: string
  bg: string
  textColor: string
  borderColor: string
  accentColor?: string
  icon?: React.ReactNode
}

export function MarketplaceBadge({ store, className }: MarketplaceBadgeProps) {
  const storeKey = (store ?? '').toLowerCase().trim()

  const config = useMemo<StoreConfig>(() => {
    switch (storeKey) {
      case 'amazon':
        return {
          name: 'Amazon',
          bg: '#131921',
          textColor: '#ffffff',
          borderColor: 'rgba(255, 153, 0, 0.4)',
          accentColor: '#FF9900',
          icon: (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M19.2 15.6C15 18.2 9 19.5 3.6 17.5c-.7-.3-1.4-.8-.7-1.4.7-.5 1.4-.3 2.2 0 4.6 1.7 9.8.6 13.3-1.4.6-.3 1.2.3.2 1 0-.1.5-.1.6-.1z"
                fill="#FF9900"
              />
              <path
                d="M20.7 13.8c-.4-.5-2.6-.3-3.6 0-.3.1-.3-.2 0-.4 1.1-.9 3-.8 3.3-.3.4.6.3 2.4-.9 3.3-.3.2-.5 0-.3-.3.5-.7 1.3-1.7 1.5-2.3z"
                fill="#FF9900"
              />
              <path
                d="M13.2 4.2c-2.4 0-4.3 1.6-4.5 3.8h2.3c.2-1.1 1.1-1.9 2.2-1.9 1.2 0 2.2.8 2.2 2v.8c-.8 0-1.8.1-2.9.2-2.5.2-4.2 1.4-4.2 3.3 0 1.8 1.4 3 3.4 3 1.6 0 2.8-.7 3.4-1.8v1.6h2.2V8.9c0-2.8-1.8-4.7-5.1-4.7zm.7 8.8c-.4.6-1.2 1-2.1 1-1.1 0-1.8-.6-1.8-1.5 0-1.1.9-1.6 2.4-1.8.7-.1 1.2-.1 1.5-.1v2.4z"
                fill="#FFFFFF"
              />
            </svg>
          ),
        }

      case 'flipkart':
        return {
          name: 'Flipkart',
          bg: '#2874F0',
          textColor: '#ffffff',
          borderColor: 'rgba(255, 230, 0, 0.4)',
          accentColor: '#FFE600',
          icon: (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 4h16v16H4z" rx="4" fill="#2874F0" />
              <path
                d="M7 6h6.5c1.4 0 2.5 1.1 2.5 2.5s-1.1 2.5-2.5 2.5H9.5v2.5H13v3H9.5V21H6.5V6H7z"
                fill="#FFE500"
              />
            </svg>
          ),
        }

      case 'apple':
        return {
          name: 'Apple',
          bg: '#000000',
          textColor: '#ffffff',
          borderColor: 'rgba(255, 255, 255, 0.2)',
          accentColor: '#ffffff',
          icon: (
            <svg width="12" height="14" viewBox="0 0 170 170" fill="currentColor" aria-hidden="true">
              <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.04-7.67-7.81-11.96-14.34-6.41-9.78-11.48-20.91-15.19-33.37-3.72-12.47-5.58-24.16-5.58-35.08 0-14.99 3.69-27.46 11.08-37.38 7.38-9.93 16.73-14.99 28.05-15.19 4.35 0 9.4 1.25 15.15 3.75 5.76 2.5 9.77 3.75 12.04 3.75 1.83 0 5.8-1.27 11.89-3.82 6.09-2.55 11.39-3.7 15.9-3.46 12.01.62 21.6 4.96 28.77 13.02-10.49 6.36-15.62 15.16-15.39 26.4.22 8.79 3.62 16.14 10.19 22.05 6.58 5.92 14.38 9.38 23.41 10.38-2.3 7.37-5.33 14.86-9.1 22.46zM119.22 31.86c0-6.9 2.44-13.43 7.31-19.59 4.88-6.17 10.89-10.38 18.04-12.63.22 1.34.33 2.57.33 3.69 0 6.81-2.43 13.39-7.29 19.74-4.86 6.35-11 10.43-18.39 12.24-.1-1.12-.15-2.28-.15-3.45z" />
            </svg>
          ),
        }

      case 'decathlon':
        return {
          name: 'Decathlon',
          bg: '#0082C3',
          textColor: '#ffffff',
          borderColor: 'rgba(255, 255, 255, 0.3)',
          accentColor: '#ffffff',
          icon: (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M4 7h6.5c3.6 0 6.5 2.2 6.5 5s-2.9 5-6.5 5H4V7zm3.2 2.4v5.2h3.3c1.8 0 3.3-1.2 3.3-2.6s-1.5-2.6-3.3-2.6H7.2z"
                fill="#FFFFFF"
              />
            </svg>
          ),
        }

      case 'croma':
        return {
          name: 'Croma',
          bg: '#00B594',
          textColor: '#ffffff',
          borderColor: 'rgba(255, 255, 255, 0.3)',
          accentColor: '#002D3A',
          icon: (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="8" stroke="#FFFFFF" strokeWidth="2.5" strokeDasharray="38 12" />
            </svg>
          ),
        }

      case 'myntra':
        return {
          name: 'Myntra',
          bg: 'linear-gradient(135deg, #EE5F73 0%, #FF3E6C 100%)',
          textColor: '#ffffff',
          borderColor: 'rgba(255, 255, 255, 0.35)',
          accentColor: '#FFFFFF',
          icon: (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M5 18L9 7l3 8 3-8 4 11"
                stroke="#FFFFFF"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ),
        }

      case 'ajio':
        return {
          name: 'AJIO',
          bg: '#1C2430',
          textColor: '#ffffff',
          borderColor: 'rgba(255, 255, 255, 0.25)',
          accentColor: '#E4A853',
          icon: (
            <span style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '0.05em' }}>A</span>
          ),
        }

      case 'nike':
        return {
          name: 'Nike',
          bg: '#000000',
          textColor: '#ffffff',
          borderColor: 'rgba(255, 255, 255, 0.2)',
          accentColor: '#ffffff',
          icon: (
            <svg width="15" height="10" viewBox="0 0 24 16" fill="currentColor" aria-hidden="true">
              <path d="M23 2C15.8 7 10 11.2 5.5 14.5c-2.4 1.7-4.5 1.5-5.2-.2-.5-1.1 0-2.8 1.8-4.7C6.8 4.7 13.5 1.5 21 .2c1.2-.2 2.1-.1 2.4.4.2.4-.1.9-.4 1.4z" />
            </svg>
          ),
        }

      case 'ikea':
        return {
          name: 'IKEA',
          bg: '#0058A3',
          textColor: '#FFDA1A',
          borderColor: 'rgba(255, 218, 26, 0.4)',
          accentColor: '#FFDA1A',
          icon: (
            <span style={{ fontSize: '9px', fontWeight: 900, letterSpacing: '-0.02em', color: '#FFDA1A' }}>IK</span>
          ),
        }

      case 'blinkit':
        return {
          name: 'Blinkit',
          bg: '#F8CB46',
          textColor: '#0C831F',
          borderColor: 'rgba(12, 131, 31, 0.25)',
          accentColor: '#0C831F',
          icon: (
            <span style={{ fontSize: '10px', fontWeight: 900, color: '#0C831F' }}>b</span>
          ),
        }

      case 'zepto':
        return {
          name: 'Zepto',
          bg: '#8224E3',
          textColor: '#ffffff',
          borderColor: 'rgba(255, 255, 255, 0.3)',
          accentColor: '#ffffff',
          icon: (
            <span style={{ fontSize: '10px', fontWeight: 900 }}>Z</span>
          ),
        }

      case 'tatacliq':
      case 'tata cliq':
        return {
          name: 'Tata CLiQ',
          bg: '#9E1B32',
          textColor: '#ffffff',
          borderColor: 'rgba(255, 255, 255, 0.25)',
          accentColor: '#ffffff',
          icon: (
            <span style={{ fontSize: '9.5px', fontWeight: 800 }}>TC</span>
          ),
        }

      case 'samsung':
        return {
          name: 'Samsung',
          bg: '#1428A0',
          textColor: '#ffffff',
          borderColor: 'rgba(255, 255, 255, 0.25)',
          accentColor: '#ffffff',
          icon: (
            <span style={{ fontSize: '9.5px', fontWeight: 800 }}>S</span>
          ),
        }

      case 'boat':
        return {
          name: 'boAt',
          bg: '#E31E24',
          textColor: '#ffffff',
          borderColor: 'rgba(255, 255, 255, 0.3)',
          accentColor: '#ffffff',
          icon: (
            <span style={{ fontSize: '9.5px', fontWeight: 800 }}>⛵</span>
          ),
        }

      default:
        return {
          name: store ? store : 'Online Store',
          bg: 'rgba(255, 255, 255, 0.92)',
          textColor: '#101312',
          borderColor: 'rgba(16, 19, 18, 0.1)',
          accentColor: '#526057',
          icon: store ? <Globe size={11} strokeWidth={2.4} /> : <ShoppingBag size={11} strokeWidth={2.4} />,
        }
    }
  }, [store, storeKey])

  const style: CSSProperties = {
    background: config.bg,
    color: config.textColor,
    borderColor: config.borderColor,
  }

  return (
    <span className={cn('wish-marketplace-badge', className)} style={style}>
      <span className="wish-marketplace-icon" aria-hidden="true">
        {config.icon}
      </span>
      <span className="wish-marketplace-name">{config.name}</span>
    </span>
  )
}
