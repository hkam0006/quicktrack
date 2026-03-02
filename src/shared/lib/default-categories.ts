import type { CategoryDraft } from '@/src/features/categories/categories.types';
import { categoryColorDefaults } from '@/src/shared/theme/tokens';

export const defaultCategoryDrafts: CategoryDraft[] = [
  { name: 'Food', color: categoryColorDefaults.Food, icon: 'fork.knife' },
  { name: 'Transport', color: categoryColorDefaults.Transport, icon: 'car.fill' },
  { name: 'Bills', color: categoryColorDefaults.Bills, icon: 'doc.text.fill' },
  { name: 'Rent', color: categoryColorDefaults.Rent, icon: 'house.fill' },
  { name: 'Fun', color: categoryColorDefaults.Fun, icon: 'gamecontroller.fill' },
];
