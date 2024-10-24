import React, { useState, useEffect } from 'react';
import { Camera, Upload, ArrowLeft } from 'lucide-react';
import { Card } from './ui/card';
import { LoadingOverlay } from './LoadingOverlay';
import ResultCards from './ResultCards';
import type { AnalysisResult } from '../types';
import { useRef } from 'react';

const CalorieCalculator: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<'upload' | 'preview' | 'result'>('upload');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null); // Audio ref for controlling playback


  useEffect(() => {
    // Push current state to history when it changes
    if (currentStep !== 'upload') {
      window.history.pushState({ step: currentStep }, '');
    }

    const handlePopState = (event: PopStateEvent) => {
      if (event.state && event.state.step) {
        // Navigate based on the stored step in the history state
        setCurrentStep(event.state.step);
      } else {
        // If no state, fallback to the home page (upload step)
        setCurrentStep('upload');
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [currentStep]);

    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        // Create a preview URL
        const imageUrl = URL.createObjectURL(file);
        setSelectedImage(imageUrl);
        setCurrentStep('preview');

        // Convert to Base64
        try {
          const base64Image = await convertToBase64(file);
          console.log("Base64 Image:", base64Image); // Log the base64 image to verify it
        } catch (error) {
          console.error("Error converting file to base64:", error);
        }
      }
    };





    const convertToBase64 = (file: File): Promise<string | ArrayBuffer | null> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        
        reader.onload = () => resolve(reader.result);
        reader.onerror = (error) => {
          // Handle the error properly here
          reject(new Error("FileReader error: " + (error?.target?.error?.message || "Unknown error")));
        };
      });
    };





  const handleAnalyze = async () => {
    if (!selectedImage) return;

    setIsLoading(true);

    try {
      // Play the audio when analysis starts, with error handling
      if (audioRef.current) {
        audioRef.current.play().catch(error => {
          console.warn('Audio play was prevented by the browser:', error);
        });
      }

    // Convert image URL to base64 string
    const response = await fetch(selectedImage);
    const blob = await response.blob();
    const base64Image = await convertToBase64(blob);

    // Remove the data URI prefix
    const base64ImageWithoutPrefix = base64Image.split(",")[1];

    // Log the base64 string without the prefix
    console.log("Base64 Image without prefix:", base64ImageWithoutPrefix);


      // Send the base64 image to the GPT-4o API
      const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;

      const headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`

      };
      

      const payload = {
        "model": "gpt-4o-mini",
        "messages": [
          {
            "role": "user",
            "content": [
              {
                "type": "text",
                "text": "Please provide a list of food items detected in the image along with their approximate quantities. Only include the food items and their quantities, and avoid any introduction, conclusion, or bullet points. Format as 'Item: Quantity'."
              },
              {
                "type": "image_url",
                "image_url": {
                  "url": `data:image/jpeg;base64,${base64ImageWithoutPrefix}`
                }
              }
            ]
          }
        ],
        "max_tokens": 300
      };

      const apiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: headers,
        body: JSON.stringify(payload)
      });

      const responseData = await apiResponse.json();

      if (apiResponse.status !== 200) {
        throw new Error(responseData.error?.message || 'Error analyzing image');
      }

      // Parse the response and gather nutritional information
      const description = responseData.choices[0].message.content;
      const descriptionList = description.split('\n').map(item => item.trim()).filter(item => item);

      // Initialize nutritional summary
      let nutritionalSummary = [];
      let totalCalories = 0;
      let totalProtein = 0;

      for (const item of descriptionList) {
        const [itemName, quantity] = item.split(':').map(part => part.trim());

        // Generate a prompt to get the calories and protein for each item
        const prompt = `Provide the estimated calorie and protein content for the following item: '${itemName}'. Include calories and protein in a concise format (e.g., 'Calories: 100 kcal, Protein: 5 g').`;

        const nutritionResponse = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: headers,
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }]
          })
        });
        const nutritionData = await nutritionResponse.json();

        if (nutritionResponse.status !== 200) {
          throw new Error(nutritionData.error?.message || 'Error fetching nutritional info');
        }

        const nutritionalInfo = nutritionData.choices[0].message.content;

        let calories = "N/A";
        let protein = "N/A";

        for (const line of nutritionalInfo.split(', ')) {
          const [key, value] = line.split(':').map(part => part.trim().toLowerCase());
          if (key.includes('calories')) {
            calories = value;
          } else if (key.includes('protein')) {
            protein = value;
          }
        }

        nutritionalSummary.push({ name: itemName, quantity, calories, protein });

        // Calculate total calories and protein
        try {
          if (calories !== "N/A" && calories.toLowerCase().includes('kcal')) {
            totalCalories += parseInt(calories);
          }
          if (protein !== "N/A" && protein.toLowerCase().includes('g')) {
            totalProtein += parseInt(protein);
          }
        } catch (error) {
          console.error('Error parsing nutritional values:', error);
        }
      }

      const { prompt_tokens, completion_tokens, total_tokens } = responseData.usage;
      const inputCost = (prompt_tokens / 1_000_000) * 0.150;
      const outputCost = (completion_tokens / 1_000_000) * 0.600;
      const visionCost = 0.002125; // per image
      const totalCost = inputCost + outputCost + visionCost;
      console.log(`input tokens: ${prompt_tokens}`);
      console.log(`ouput tokens: ${completion_tokens}`);
      console.log(`Total Tokens Used: ${total_tokens}`);
      console.log(`Estimated Cost: $${totalCost.toFixed(4)}`);


      // Stop the audio after analysis is complete
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }

      setAnalysisResult({
        items: nutritionalSummary,
        totalCalories,
        totalProtein
      });

      setCurrentStep('result');
    } catch (error) {
      console.error('Error analyzing image:', error);
      alert('Failed to analyze image. Please try again.');
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    } finally {
      setIsLoading(false);
    }
  };



  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <audio ref={audioRef} src="/lift_music.mp3" />
      {currentStep !== 'upload' && (
        <button
          onClick={() => {
            // Manually set state to handle "Back" navigation
            if (currentStep === 'preview') {
              setCurrentStep('upload');
            } else if (currentStep === 'result') {
              setCurrentStep('preview');
            }
          }}
          className="mb-4 flex items-center text-blue-600"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back
        </button>
      )}

      {currentStep === 'upload' && (
        <Card className="p-6 max-w-md mx-auto">
          <h1 className="text-2xl font-bold text-center mb-6">
            Calorie & Nutrient Calculator
          </h1>
          <div className="space-y-4">
            <label className="w-full flex items-center justify-center space-x-2 bg-blue-600 text-white p-4 rounded-lg cursor-pointer">
              <Camera className="w-5 h-5" />
              <span>Capture Photo</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>
            <label className="w-full flex items-center justify-center space-x-2 bg-white border-2 border-blue-600 text-blue-600 p-4 rounded-lg cursor-pointer">
              <Upload className="w-5 h-5" />
              <span>Upload Photo</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>
          </div>
        </Card>
      )}

      {currentStep === 'preview' && selectedImage && (
        <Card className="p-6 max-w-md mx-auto">
          <div className="aspect-w-4 aspect-h-3 mb-4">
            <img
              src={selectedImage}
              alt="Preview"
              className="rounded-lg object-cover w-full h-64"
            />
          </div>
          <button
            onClick={handleAnalyze}
            className="w-full bg-blue-600 text-white p-4 rounded-lg"
          >
            Continue
          </button>
        </Card>
      )}

      {isLoading && <LoadingOverlay />}

      {currentStep === 'result' && analysisResult && selectedImage && (
        <ResultCards
          selectedImage={selectedImage}
          analysisResult={analysisResult}
          onReanalyze={handleAnalyze}
        />
      )}



    </div>
  );
};

export default CalorieCalculator;
