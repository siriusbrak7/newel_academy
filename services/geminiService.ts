// services/geminiService.ts - Debug version
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';

export const getAITutorResponse = async (prompt: string, context: string = '', isJson: boolean = false): Promise<string> => {
  if (!apiKey) {
    console.warn("No API key configured");
    return "AI service is not configured.";
  }

  try {
    console.log("Initializing GoogleGenerativeAI with API key");
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Log the genAI object to see available methods
    console.log("genAI object:", Object.keys(genAI));
    
    const systemInstruction = `You are Newel, An AI Science Tutor. Be encouraging, use concise analogies suitable for grades 9-12 students. Context: ${context}`;
    
    console.log("Creating model with system instruction");
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",  // Corrected to standard model name; adjust if needed
      systemInstruction  // Pass as string directly
    });
    
    console.log("Generating content");
    const generationConfig = isJson ? { responseMimeType: "application/json" } : {};
    
    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }]
        }
      ],
      generationConfig
    });

    console.log("API Response structure:", result);
    
    const text = result.response.text();
    
    if (!text) {
      console.warn("No text in response:", JSON.stringify(result, null, 2));
      return "No response from AI.";
    }
    
    console.log("Successfully got AI response");
    return text;

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    console.error("Error details:", JSON.stringify(error, null, 2));
    
    return isJson 
      ? JSON.stringify({ 
          score: 0, 
          feedback: "AI service error: " + (error.message || "Unknown error") 
        })
      : "Error: " + (error.message || "Failed to get AI response");
  }
};