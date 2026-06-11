import {
  Apple,
  Bean,
  Coffee,
  Cookie,
  CupSoda,
  GlassWater,
  Milk,
  Pill,
  Pizza,
  Popcorn,
  Salad,
  Sandwich,
  Soup,
  Utensils,
  Wheat,
  Candy
} from 'lucide-react'

// Custom high-fidelity food icons designed to perfectly match the Lucide design language
interface IconProps {
  size?: number
  color?: string
  strokeWidth?: number
}

export const Cheese = ({ size = 24, color = 'currentColor', strokeWidth = 2 }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20 20v-5.8a1 1 0 0 0-.6-.9L4.9 6.5A1 1 0 0 0 3.5 7.4V20a2 2 0 0 0 2 2h13a2 2 0 0 0 1.5-.7z" />
    <circle cx="9" cy="17" r="1.2" fill={color} />
    <circle cx="14" cy="15" r="0.9" fill={color} />
    <circle cx="8" cy="12" r="0.9" fill={color} />
  </svg>
)

export const Banana = ({ size = 24, color = 'currentColor', strokeWidth = 2 }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 22c7.2-1.5 14-8 16-16 0-.8-.3-1.6-1-2.2-.6-.7-1.4-1-2.2-1C10.8 4.8 4.3 11.6 2.8 18.8c-.3 1.2.2 2.4 1.2 3.2z" />
    <path d="M18 4l2-2" />
  </svg>
)

export const Egg = ({ size = 24, color = 'currentColor', strokeWidth = 2 }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 2C7.5 2 4 7 4 12s3.5 10 8 10 8-5 8-10-3.5-10-8-10z" />
    <path d="M15 9a3 3 0 0 0-3-3" />
  </svg>
)

export const Fish = ({ size = 24, color = 'currentColor', strokeWidth = 2 }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M23 12c-4 3-9 3-13 1l-6 5v-12l6 5c4-2 9-2 13 1z" />
    <circle cx="17" cy="11" r="1" fill={color} />
    <path d="M4 6v12" />
  </svg>
)

export const Drumstick = ({ size = 24, color = 'currentColor', strokeWidth = 2 }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M15.4 9.5a6 6 0 1 0-7.9 7.9l-3 3a1.5 1.5 0 0 0 2.1 2.1l3-3a6 6 0 0 0 7.9-7.9z" />
    <path d="M3 21a1.5 1.5 0 0 1-2.1-2.1" />
  </svg>
)

export const Croissant = ({ size = 24, color = 'currentColor', strokeWidth = 2 }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M2.5 16.5c2-2.5 5.5-4.5 9.5-4.5s7.5 2 9.5 4.5" />
    <path d="M12 12a14.6 14.6 0 0 1 8-5.5" />
    <path d="M4 6.5A14.6 14.6 0 0 1 12 12" />
    <path d="M8 8.5C10 5.5 14 5.5 16 8.5" />
  </svg>
)

export const IceCream = ({ size = 24, color = 'currentColor', strokeWidth = 2 }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 22l5-12H7l5 12z" />
    <path d="M17 10c0-2.8-2.2-5-5-5s-5 2.2-5 5h10z" />
    <circle cx="12" cy="3" r="1.2" fill={color} />
  </svg>
)

export const Citrus = ({ size = 24, color = 'currentColor', strokeWidth = 2 }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="2" x2="12" y2="22" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <line x1="4.9" y1="4.9" x2="19.1" y2="19.1" />
    <line x1="4.9" y1="19.1" x2="19.1" y2="4.9" />
    <circle cx="12" cy="12" r="2.5" />
  </svg>
)

export const Grape = ({ size = 24, color = 'currentColor', strokeWidth = 2 }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="9" r="2.5" />
    <circle cx="9.5" cy="13" r="2.5" />
    <circle cx="14.5" cy="13" r="2.5" />
    <circle cx="12" cy="17" r="2.5" />
    <path d="M12 6.5V3c0-.6.4-1 1-1" />
  </svg>
)

export const Mango = ({ size = 24, color = 'currentColor', strokeWidth = 2 }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 3a8 8 0 0 0-8 8c0 4.5 3.5 9 8 10 4 1 8-2 8-8V10a7 7 0 0 0-7-7z" />
    <path d="M12 3V1" />
    <path d="M12 2c2 0 3.5 1.5 4 3-.5 1.5-2 2-4 1" />
  </svg>
)

export const DragonFruit = ({ size = 24, color = 'currentColor', strokeWidth = 2 }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 21.5c-4.5 0-7.5-3.5-7.5-8.5C4.5 7.5 8 3 12 2.5c4 .5 7.5 5 7.5 10.5 0 5-3 8.5-7.5 8.5z" />
    <path d="M12 7.5a6 6 0 0 0-4 4.5M12 7.5a6 6 0 0 1 4 4.5" />
    <path d="M12 12a5 5 0 0 0-5 4M12 12a5 5 0 0 1 5 4" />
    <path d="M12 16.5v3" />
    <path d="M12 2.5V1" />
  </svg>
)

export const Avocado = ({ size = 24, color = 'currentColor', strokeWidth = 2 }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 2c-3 0-5 4-5 8.5 0 5 2.5 8.5 7 8.5s7-3.5 7-8.5c0-4.5-2-8.5-5-8.5z" />
    <circle cx="12" cy="13.5" r="3" />
    <path d="M12 2V1" />
  </svg>
)

export const Strawberry = ({ size = 24, color = 'currentColor', strokeWidth = 2 }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 22C8 22 5.5 18 5.5 12.5 5.5 8 8 5 12 5s6.5 3 6.5 7.5c0 5.5-2.5 9.5-6.5 9.5z" />
    <path d="M12 5c-1-2-3-2.5-4-2.5 1 2 2 2.5 4 2.5z" />
    <path d="M12 5c1-2 3-2.5 4-2.5-1 2-2 2.5-4 2.5z" />
    <path d="M12 5V2" />
    <circle cx="9" cy="9" r="0.5" fill={color} />
    <circle cx="15" cy="9" r="0.5" fill={color} />
    <circle cx="12" cy="12" r="0.5" fill={color} />
    <circle cx="9" cy="15" r="0.5" fill={color} />
    <circle cx="15" cy="15" r="0.5" fill={color} />
    <circle cx="12" cy="18" r="0.5" fill={color} />
  </svg>
)

export const Watermelon = ({ size = 24, color = 'currentColor', strokeWidth = 2 }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 11c0 5 4 9 9 9s9-4 9-9" />
    <path d="M3 11h18" />
    <path d="M5 11c0 3.8 3.2 7 7 7s7-3.2 7-7" />
    <circle cx="9" cy="13.5" r="0.5" fill={color} />
    <circle cx="12" cy="15" r="0.5" fill={color} />
    <circle cx="15" cy="13.5" r="0.5" fill={color} />
  </svg>
)

export const Pineapple = ({ size = 24, color = 'currentColor', strokeWidth = 2 }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="7" y="10" width="10" height="12" rx="4" />
    <path d="M12 10l4 4M8 14l4 4M8 11l7 7M16 11L9 18" />
    <path d="M12 10c0-3 .5-5 1.5-8-2 2-2.5 4-1.5 8zm-2 0c-1-3-.5-5.5.5-8.5-1.5 2.5-1.5 5 1 8.5zm4 0c1-3 .5-5.5-.5-8.5 1.5 2.5 1.5 5-1 8.5z" />
  </svg>
)

export const Coconut = ({ size = 24, color = 'currentColor', strokeWidth = 2 }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4.5 10c0 4.1 3.4 7.5 7.5 7.5s7.5-3.4 7.5-7.5c0-1.5-.5-3-1.5-4" />
    <ellipse cx="12.5" cy="6" rx="5.5" ry="2" />
    <ellipse cx="12.5" cy="6" rx="4" ry="1.2" />
    <circle cx="10.5" cy="12" r="0.8" fill={color} />
    <circle cx="14.5" cy="12" r="0.8" fill={color} />
    <circle cx="12.5" cy="14" r="0.8" fill={color} />
  </svg>
)

export const Pomegranate = ({ size = 24, color = 'currentColor', strokeWidth = 2 }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 21.5c-4.7 0-8.5-3.8-8.5-8.5 0-4 2.8-7.3 6.5-8.2V3.5l1-1.5 1 1.5 1-1.5 1 1.5v1.3c3.7.9 6.5 4.2 6.5 8.2 0 4.7-3.8 8.5-8.5 8.5z" />
    <path d="M12 18c-3 0-5.5-2.5-5.5-5.5 0-1.5.6-2.8 1.6-3.8" />
    <circle cx="10" cy="12" r="0.5" fill={color} />
    <circle cx="12" cy="11" r="0.5" fill={color} />
    <circle cx="11" cy="14" r="0.5" fill={color} />
    <circle cx="13" cy="13" r="0.5" fill={color} />
  </svg>
)

export const Kiwi = ({ size = 24, color = 'currentColor', strokeWidth = 2 }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <ellipse cx="12" cy="12" rx="3.5" ry="3" />
    <line x1="12" y1="2" x2="12" y2="4.5" />
    <line x1="12" y1="19.5" x2="12" y2="22" />
    <line x1="2" y1="12" x2="4.5" y2="12" />
    <line x1="19.5" y1="12" x2="22" y2="12" />
    <line x1="4.9" y1="4.9" x2="7" y2="7" />
    <line x1="17" y1="17" x2="19.1" y2="19.1" />
    <line x1="4.9" y1="19.1" x2="7" y2="17" />
    <line x1="17" y1="7" x2="19.1" y2="4.9" />
    <circle cx="8.5" cy="8.5" r="0.5" fill={color} />
    <circle cx="15.5" cy="8.5" r="0.5" fill={color} />
    <circle cx="15.5" cy="15.5" r="0.5" fill={color} />
    <circle cx="8.5" cy="15.5" r="0.5" fill={color} />
  </svg>
)

export const Papaya = ({ size = 24, color = 'currentColor', strokeWidth = 2 }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 21.5c-4.5 0-7.5-3.5-7.5-8.5 0-3 1.5-6.5 3-8s3.5-3 4.5-3 3 1.5 4.5 3 3 5 3 8c0 5-3 8.5-7.5 8.5z" />
    <path d="M12 16c-1.5 0-2.5-1.5-2.5-3.5s1-3.5 2.5-3.5 2.5 1.5 2.5 3.5-1 3.5-2.5 3.5z" />
    <circle cx="11.5" cy="11.5" r="0.5" fill={color} />
    <circle cx="12.5" cy="12.5" r="0.5" fill={color} />
    <circle cx="12" cy="10.5" r="0.5" fill={color} />
    <circle cx="12" cy="14.5" r="0.5" fill={color} />
  </svg>
)

export const Pear = ({ size = 24, color = 'currentColor', strokeWidth = 2 }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 21.5c-4 0-7-3-7-7 0-3 1.5-5 3-7 1-1.3 2-3.5 4-3.5s3 2.2 4 3.5c1.5 2 3 4 3 7 0 4-3 7-7 7z" />
    <path d="M12 4c0-1-1-1.5-1.5-2" />
  </svg>
)

export const Dosa = ({ size = 24, color = 'currentColor', strokeWidth = 2 }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 18L18 5c1-.8 2.2-.5 2.8.5.5.8.5 2-.5 2.8L5.5 21" />
    <ellipse cx="4.2" cy="19.5" rx="1.5" ry="1.5" transform="rotate(-40 4.2 19.5)" />
    <ellipse cx="19" cy="6.2" rx="1.5" ry="1.5" transform="rotate(-40 19 6.2)" />
    <path d="M8 14.5l2-1.5M12 11.5l2-1.5M15 9l1.5-1.2" />
  </svg>
)

export const Idli = ({ size = 24, color = 'currentColor', strokeWidth = 2 }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 19c0 2 4 3 9 3s9-1 9-3" />
    <ellipse cx="8.5" cy="15" rx="4.5" ry="2.2" />
    <ellipse cx="15.5" cy="15" rx="4.5" ry="2.2" />
    <ellipse cx="12" cy="10" rx="5" ry="2.5" />
    <path d="M9 5V3M12 4V2M15 5V3" />
  </svg>
)

export const Samosa = ({ size = 24, color = 'currentColor', strokeWidth = 2 }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 3L3 18c0 2 2.5 3 9 3s9-1 9-3L12 3z" />
    <path d="M12 3v18" />
  </svg>
)

export const Chai = ({ size = 24, color = 'currentColor', strokeWidth = 2 }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M6 5l2.2 14.3c.1.9.9 1.7 1.8 1.7h4c.9 0 1.7-.8 1.8-1.7L18 5H6z" />
    <ellipse cx="12" cy="5" rx="6" ry="1.5" />
    <path d="M6.7 10c3.5 1 7.1 1 10.6 0" />
    <path d="M9.5 7.5l1.5 11.5M14.5 7.5l-1.5 11.5" />
    <path d="M10 2c0-1 1-.5 1 0s-1 1-1 2M13 2c0-1 1-.5 1 0s-1 1-1 2" />
  </svg>
)

export const Laddu = ({ size = 24, color = 'currentColor', strokeWidth = 2 }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 14c0 3.9 3.6 7 8 7h2c4.4 0 8-3.1 8-7H3z" />
    <path d="M7 21v1h10v-1" />
    <circle cx="8.5" cy="11.5" r="3.2" />
    <circle cx="15.5" cy="11.5" r="3.2" />
    <circle cx="12" cy="8.2" r="3.5" />
    <circle cx="12" cy="12.5" r="2.8" />
  </svg>
)

export const Jar = ({ size = 24, color = 'currentColor', strokeWidth = 2 }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="8" y="2" width="8" height="3" rx="1" />
    <path d="M6 7v13c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6z" />
    <path d="M6 7c0-1.1.9-2 2-2h8c1.1 0 2 .9 2 2" />
    <rect x="9" y="11" width="6" height="6" rx="1" />
    <path d="M11 14h2" />
  </svg>
)

export const Rice = ({ size = 24, color = 'currentColor', strokeWidth = 2 }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 12h18" />
    <path d="M4 12a8 8 0 0 0 16 0" />
    <path d="M5 12c0-3.5 3-6 7-6s7 2.5 7 6" />
    <path d="M9 3c.5-.5.5-1 0-1.5" />
    <path d="M12 3c.5-.5.5-1 0-1.5" />
    <path d="M15 3c.5-.5.5-1 0-1.5" />
  </svg>
)

// Map of meal type colors for consistent decorative borders
export const mealDotColors: Record<string, string> = {
  Breakfast: '#f97316', // Premium Orange
  Lunch: '#059669', // Premium Emerald Green
  Dinner: '#38bdf8', // Sky Blue
  Snack: '#a78bfa', // Lavender
  Midnight: '#6366f1', // Indigo
  'Post Workout': '#f87171', // Coral Red
  'Mid-Morning': '#c2410c', // Deep Burnt Orange
}

export const getFoodIconDetails = (description: string = '', mealType: string = '') => {
  const desc = description.toLowerCase().trim()
  const meal = mealType.toLowerCase().trim()

  const matchRule = (text: string) => {
    // 1. Supplements
    if (/\b(creatine|protein powder|whey|pill|vitamin|capsule|tablet|supplement|omega-3|fish oil)\b/.test(text)) {
      return { icon: Pill, color: '#2563eb', bg: '#eff6ff' }
    }
    // 2. Chai & Coffee
    if (/\b(tea|chai)\b/.test(text)) {
      return { icon: Chai, color: '#854d0e', bg: '#fffbeb' }
    }
    if (/\b(coffee|latte|cappuccino|espresso|macchiato)\b/.test(text)) {
      return { icon: Coffee, color: '#854d0e', bg: '#fef9c3' }
    }
    // 3. Water & Hydration
    if (/\b(water|hydrate|hydration|coconut water|nariyal pani|mineral water)\b/.test(text)) {
      return { icon: GlassWater, color: '#0284c7', bg: '#e0f2fe' }
    }
    // 4. Soda & Juices
    if (/\b(shake|smoothie|juice|drink|soda|cola|pepsi|sprite|fizz)\b/.test(text)) {
      return { icon: CupSoda, color: '#059669', bg: '#d1fae5' }
    }
    // 5. Alcohol & Spirits
    if (/\b(bacardi|alcohol|cocktail|wine|beer|whiskey|vodka|rum|gin|liqour)\b/.test(text)) {
      return { icon: GlassWater, color: '#dc2626', bg: '#fee2e2' }
    }
    // 6. Indian Snacks & Savories
    if (/\b(samosa|samosas|kachori|kachoris|pakora|pakoras|pakoda|pakodas|bhajia|bhajiya|vada pav|vadapav)\b/.test(text)) {
      return { icon: Samosa, color: '#ea580c', bg: '#ffedd5' }
    }
    // 7. Dosa & Idli & South Indian Breakfast
    if (/\b(dosa|uttapam|appam|appe)\b/.test(text)) {
      return { icon: Dosa, color: '#b45309', bg: '#fef3c7' }
    }
    if (/\b(idli|vada|appe|dhokla|khaman)\b/.test(text)) {
      return { icon: Idli, color: '#d97706', bg: '#fffbeb' }
    }
    // 8. Indian Flatbreads (Roti, Chapati, Paratha, etc.)
    if (/\b(roti|chapati|chapatti|paratha|parantha|naan|phulka|thepla|puri|poori|flatbread|kulcha|parotta)\b/.test(text)) {
      return { icon: Wheat, color: '#854d0e', bg: '#fffbeb' }
    }
    // 9. Rice staples
    if (/\b(rice|biryani|pulao|pulav|khichdi|jeera rice|fried rice|risotto|basmati|curd rice|lemon rice)\b/.test(text)) {
      return { icon: Rice, color: '#b45309', bg: '#fef3c7' }
    }
    // 10. Lentils & Curries
    if (/\b(dal|dhal|sambar|sambhar|rasam|curry|chole|rajma|korma|gravy|kadhi|masala|paneer masala|kadhai paneer|butter chicken|chicken tikka masala|kofta)\b/.test(text)) {
      return { icon: Soup, color: '#ea580c', bg: '#ffedd5' }
    }
    // 11. Oats & Porridge
    if (/\b(oats|oatmeal|porridge|muesli|granola|cereal|cornflakes|upma|poha)\b/.test(text)) {
      return { icon: Soup, color: '#d97706', bg: '#fffbeb' }
    }
    // 12. Proteins: Paneer, Tofu & Soya
    if (/\b(paneer|tofu|cottage cheese|chena|soya chunks|soy chunks)\b/.test(text)) {
      return { icon: Cheese, color: '#0d9488', bg: '#ccfbf1' }
    }
    // 13. Eggs
    if (/\b(egg|eggs|omelet|omlet|scrambled|boiled egg|bhurji|egg white|egg whites)\b/.test(text)) {
      return { icon: Egg, color: '#d97706', bg: '#fffbeb' }
    }
    // 14. Meat & Chicken
    if (/\b(chicken|meat|beef|mutton|pork|kebab|tikka|steak|lamb|bacon|ham|turkey)\b/.test(text)) {
      return { icon: Drumstick, color: '#b45309', bg: '#fef3c7' }
    }
    // 15. Fish & Seafood
    if (/\b(fish|salmon|tuna|shrimp|prawn|seafood|crab|lobster|prawns|cod|squid)\b/.test(text)) {
      return { icon: Fish, color: '#0891b2', bg: '#ecfeff' }
    }
    // 16. Fruits (Specific)
    if (/\b(banana|bananas|kela)\b/.test(text)) {
      return { icon: Banana, color: '#ca8a04', bg: '#fef9c3' }
    }
    if (/\b(orange|citrus|lemon|lime|grapefruit|mosambi|sweet lime|narangi|nimbu)\b/.test(text)) {
      return { icon: Citrus, color: '#f97316', bg: '#ffedd5' }
    }
    if (/\b(grape|grapes|raisin|raisins|kishmish|angoor)\b/.test(text)) {
      return { icon: Grape, color: '#7c3aed', bg: '#f3e8ff' }
    }
    if (/\b(mango|mangoes|aam)\b/.test(text)) {
      return { icon: Mango, color: '#f59e0b', bg: '#fef3c7' }
    }
    if (/\b(dragon fruit|dragonfruit|pitaya)\b/.test(text)) {
      return { icon: DragonFruit, color: '#db2777', bg: '#fdf2f8' }
    }
    if (/\b(avocado|avacado)\b/.test(text)) {
      return { icon: Avocado, color: '#15803d', bg: '#f0fdf4' }
    }
    if (/\b(strawberry|strawberries|blueberry|blueberries|blackberry|blackberries|raspberry|raspberries|berry|berries|cherry|cherries|jamun)\b/.test(text)) {
      return { icon: Strawberry, color: '#e11d48', bg: '#fff1f2' }
    }
    if (/\b(watermelon|tarbooj|melon|muskmelon|cantaloupe|kharbuza)\b/.test(text)) {
      return { icon: Watermelon, color: '#ef4444', bg: '#fef2f2' }
    }
    if (/\b(pineapple|ananas)\b/.test(text)) {
      return { icon: Pineapple, color: '#ca8a04', bg: '#fef9c3' }
    }
    if (/\b(coconut|nariyal)\b/.test(text)) {
      return { icon: Coconut, color: '#b45309', bg: '#fef3c7' }
    }
    if (/\b(pomegranate|anar)\b/.test(text)) {
      return { icon: Pomegranate, color: '#991b1b', bg: '#fef2f2' }
    }
    if (/\b(kiwi|kiwis)\b/.test(text)) {
      return { icon: Kiwi, color: '#65a30d', bg: '#f7fee7' }
    }
    if (/\b(papaya|papayas|papita)\b/.test(text)) {
      return { icon: Papaya, color: '#f97316', bg: '#ffedd5' }
    }
    if (/\b(pear|pears|nashpati)\b/.test(text)) {
      return { icon: Pear, color: '#84cc16', bg: '#f7fee7' }
    }
    if (/\b(lychee|lychees|litchi|litchis)\b/.test(text)) {
      return { icon: Strawberry, color: '#f43f5e', bg: '#fff1f2' }
    }
    if (/\b(apple|apples|fruit|fruits|seb|guava|amrud|fig|figs|date|dates|khajur|peach|peaches|apricot|plum|plums)\b/.test(text)) {
      return { icon: Apple, color: '#e11d48', bg: '#fff1f2' }
    }
    // 17. Chutneys, Pickles & Condiments
    if (/\b(pickle|achar|chutney|sauce|dip|ketchup|spread)\b/.test(text)) {
      return { icon: Jar, color: '#b45309', bg: '#fef3c7' }
    }
    // 18. Dairy & Curd (Chaas, Lassi, Curd, Yogurt)
    if (/\b(curd|yogurt|dahi|buttermilk|lassi|raita|milk|dairy|yakult|greek yogurt|butter|ghee|cream)\b/.test(text)) {
      return { icon: Milk, color: '#4f46e5', bg: '#e0e7ff' }
    }
    // 19. Fast Food & Pizza
    if (/\b(pizza|pizzas)\b/.test(text)) {
      return { icon: Pizza, color: '#ea580c', bg: '#ffedd5' }
    }
    if (/\b(sandwich|sandwiches|burger|burgers|wrap|wraps|bread|toast|taco|tacos|burrito|burritos|shawarma|subway|pav)\b/.test(text)) {
      return { icon: Sandwich, color: '#ca8a04', bg: '#fef9c3' }
    }
    if (/\b(croissant|croissants|bun|buns|pastry|pastries|bagel|bagels|muffin|muffins|donut|donuts)\b/.test(text)) {
      return { icon: Croissant, color: '#c2410c', bg: '#ffedd5' }
    }
    // 20. Sweets & Desserts (Indian Sweets & Bakery)
    if (/\b(laddu|ladoo|gulab jamun|jalebi|halwa|kheer|barfi|pedha|rasgulla|mithai|sweets)\b/.test(text)) {
      return { icon: Laddu, color: '#f59e0b', bg: '#fef3c7' }
    }
    if (/\b(candy|candies)\b/.test(text)) {
      return { icon: Candy, color: '#ec4899', bg: '#fce7f3' }
    }
    if (/\b(ice cream|icecream|gelato|kulfi|sundae|sorbet|froyo|frozen yogurt)\b/.test(text)) {
      return { icon: IceCream, color: '#db2777', bg: '#fdf2f8' }
    }
    if (/\b(cookie|cookies|biscuit|biscuits|chocolate|chocolates|brownie|brownies|waffle|waffles|pancake|pancakes|cake|cakes|crepe|crepes|sweet)\b/.test(text)) {
      return { icon: Cookie, color: '#78350f', bg: '#fef3c7' }
    }
    // 21. Savory Crunchy Snacks
    if (/\b(chips|crisps|popcorn|nachos|namkeen|bhujia|puff|puffs|snack|snacks|sev)\b/.test(text)) {
      return { icon: Popcorn, color: '#eab308', bg: '#fef9c3' }
    }
    // 22. Veggies & Greens
    if (/\b(salad|salads|vegetable|vegetables|veg|veggie|veggies|green|greens|lettuce|spinach|broccoli|cucumber|bhindi|gobi|sabzi|sabji|aloo|palak|tomato|onion|garlic|ginger|potato|potatoes|carrot|carrots|peas|matar|cabbage|cauliflower|pumpkin|okra|eggplant|baingan|beans|capsicum|peppers|corn|maize|bottlegourd|lauki|ghiya)\b/.test(text)) {
      return { icon: Salad, color: '#16a34a', bg: '#f0fdf4' }
    }
    // 23. Beans, Seeds & Nuts
    if (/\b(bean|beans|lentil|lentils|chickpea|chickpeas|peanut|peanuts|nut|nuts|almond|almonds|seed|seeds|kaju|badam|walnut|walnuts|cashew|cashews|pistachio|pistachios|chia|flax|sunflower|pumpkin seeds)\b/.test(text)) {
      return { icon: Bean, color: '#7c2d12', bg: '#ffedd5' }
    }

    return null
  }

  // 1. Try to match the primary (first) item in a list of food items
  const parts = description.split(/,|\band\b|\bwith\b/i)
  if (parts.length > 0) {
    const primary = parts[0].trim().toLowerCase()
    if (primary) {
      const match = matchRule(primary)
      if (match) return match
    }
  }

  // 2. Fall back to matching the full description string
  const match = matchRule(desc)
  if (match) return match

  // Fallbacks by meal type
  if (meal.includes('breakfast')) {
    return { icon: Wheat, color: '#854d0e', bg: '#fef9c3' }
  }
  if (meal.includes('snack')) {
    return { icon: Popcorn, color: '#eab308', bg: '#fef9c3' }
  }
  if (meal.includes('workout')) {
    return { icon: CupSoda, color: '#059669', bg: '#d1fae5' }
  }

  // Absolute fallback
  return { icon: Utensils, color: '#4b5563', bg: '#f3f4f6' }
}

const mealOrder = [
  'breakfast',
  'mid-morning',
  'lunch',
  'snack',
  'post workout',
  'dinner',
  'midnight'
]

export const sortFoodEntries = <T extends { mealType?: string }>(entries: T[]): T[] => {
  return [...entries].sort((a, b) => {
    const mealA = (a.mealType || 'Snack').toLowerCase()
    const mealB = (b.mealType || 'Snack').toLowerCase()
    
    let indexA = mealOrder.indexOf(mealA)
    let indexB = mealOrder.indexOf(mealB)
    
    if (indexA === -1) indexA = 99
    if (indexB === -1) indexB = 99
    
    return indexA - indexB
  })
}
