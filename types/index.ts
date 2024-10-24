export interface FoodItem {
  name: string;
  quantity: string;
  calories: string;
  protein: string;
}

export interface AnalysisResult {
  items: FoodItem[];
  totalCalories: number;
  totalProtein: number;
}