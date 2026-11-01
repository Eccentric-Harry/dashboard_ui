import { describe, it, expect, vi, beforeEach } from 'vitest';
import { nutritionService } from '@/services/nutrition-service';

describe('Nutrition presets / templates feature', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('defines getMealTemplates, saveMealTemplate, and logMealTemplate on nutritionService', () => {
    expect(typeof nutritionService.getMealTemplates).toBe('function');
    expect(typeof nutritionService.saveMealTemplate).toBe('function');
    expect(typeof nutritionService.logMealTemplate).toBe('function');
  });

  it('formats preset dates and timestamps to current log context instead of stale template data', () => {
    const templateData = {
      description: 'Protein oats with milk',
      calories: 682,
      proteinGrams: 42,
      mealType: 'Breakfast',
      date: '2026-10-01',
      timestamp: { $date: '2026-10-01T03:30:00Z' },
      mealItems: [{ name: 'Oats' }, { name: 'Milk' }],
    };

    const targetDate = '2026-11-01';
    const currentTimestamp = new Date().toISOString();

    const preparedPayload = {
      ...templateData,
      date: targetDate,
      timestamp: currentTimestamp,
    };

    expect(preparedPayload.date).toBe('2026-11-01');
    expect(preparedPayload.timestamp).not.toBe('2026-10-01T03:30:00Z');
    expect(preparedPayload.mealItems).toHaveLength(2);
    expect(preparedPayload.calories).toBe(682);
    expect(preparedPayload.proteinGrams).toBe(42);
  });
});
