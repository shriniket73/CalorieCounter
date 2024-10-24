import React from 'react';
import { RefreshCw } from 'lucide-react';
import { Card } from './ui/card';  // Ensure Card is imported correctly
import type { AnalysisResult } from '../types';

interface ResultCardsProps {
  selectedImage: string;
  analysisResult: AnalysisResult;
  onReanalyze: () => void;
}

const ResultCards: React.FC<ResultCardsProps> = ({ selectedImage, analysisResult, onReanalyze }) => {
  return (
    <div className="p-6 max-w-md mx-auto space-y-4">
      {/* Image Preview Card */}
      <Card className="p-4">
        <div className="aspect-w-4 aspect-h-3 mb-4">
          <img
            src={selectedImage}
            alt="Detected Items"
            className="rounded-lg object-cover w-full h-64"
          />
        </div>
      </Card>

      {/* Nutritional Table Card */}
      <Card className="p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">Nutritional Table</h2>
          <button onClick={onReanalyze} className="text-blue-600 hover:text-blue-800">
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
        <table className="w-full border-collapse border border-gray-300 text-center">
          <thead>
            <tr>
              <th className="border border-gray-300 p-2 text-center">Item</th>
              <th className="border border-gray-300 p-2 text-center">Quantity</th>
              <th className="border border-gray-300 p-2 text-center">Calories</th>
              <th className="border border-gray-300 p-2 text-center">Protein</th>
            </tr>
          </thead>
          <tbody>
            {analysisResult.items.map((item, index) => (
              <tr key={index}>
                <td className="border border-gray-300 p-2 text-center">{item.name}</td>
                <td className="border border-gray-300 p-2 text-center">{item.quantity}</td>
                <td className="border border-gray-300 p-2 text-center">{item.calories}</td>
                <td className="border border-gray-300 p-2 text-center">{item.protein}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Total Count Card */}
      <Card className="p-4">
        <h3 className="text-lg font-bold">Total Count</h3>
        <p>Calories: {analysisResult.totalCalories} kcal</p>
        <p>Protein: {analysisResult.totalProtein} g</p>
      </Card>
    </div>
  );
};

export default ResultCards;