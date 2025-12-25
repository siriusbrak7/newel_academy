import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';

export const getAITutorResponse = async (prompt: string, context: string = '', isJson: boolean = false): Promise<string> => {
  if (!apiKey) return "AI service is not configured.";

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      systemInstruction: `You are Newel Academy's AI Science Tutor. Encouraging, concise analogies for grades 9-12. Context: ${context}`
    });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Gemini Error:", error);
    return isJson ? '{"score": 0, "feedback": "AI Error"}' : "Connection error.";
  }
};