// User/profile domain types — single source of truth.

export interface PhysicalMetrics {
  age?: number;
  gender?: string;
  height?: number;
  weight?: number;
}

export interface DynamicTargets {
  calculatedCalories?: number;
  calculatedProtein?: number;
  calculatedCarbs?: number;
  calculatedFat?: number;
}

export const ACTIVITY_LEVELS = [
  'SEDENTARY',
  'LIGHTLY_ACTIVE',
  'MODERATELY_ACTIVE',
  'ACTIVE',
  'VERY_ACTIVE',
] as const;
export type ActivityLevel = (typeof ACTIVITY_LEVELS)[number];

export const FITNESS_GOALS = ['LOSE_WEIGHT', 'MAINTAIN_WEIGHT', 'GAIN_MUSCLE'] as const;
export type FitnessGoal = (typeof FITNESS_GOALS)[number];

export interface UserProfile {
  id: string;
  displayName: string;
  avatarUrl?: string;
  email?: string;
  bio?: string;
  phoneNumber?: string;
  age?: number;
  weight?: number;
  height?: number;
  targetCalories?: number;
  targetProtein?: number;
  timezone?: string;
  workingHours?: string;
  title?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;

  physicalMetrics?: PhysicalMetrics;
  activityLevel?: ActivityLevel;
  fitnessGoal?: FitnessGoal;
  medicalConditions?: string[];
  dynamicTargets?: DynamicTargets;
  bmi?: number;
  bmr?: number;
  tdee?: number;
}
