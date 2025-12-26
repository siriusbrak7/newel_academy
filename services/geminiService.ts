import { GoogleGenAI } from "@google/genai";

// Use Vite environment variable
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';

let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({ apiKey });
}

export const getAITutorResponse = async (prompt: string, context: string = ''): Promise<string> => {
  if (!ai) {
    return "AI service is not configured. Please check your VITE_GEMINI_API_KEY environment variable.";
  }

  try {
    const systemInstruction = `You are an enthusiastic and helpful AI Science Tutor for Newel Academy. 
    Your goal is to help students (grades 9-12) master scientific concepts. 
    Be encouraging, concise, and use analogies suitable for teenagers. 
    If the user asks about non-science topics, politely steer them back to science.
    Current Context: ${context}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
      }
    });

    return response.text || "I'm having trouble thinking right now. Try again?";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Sorry, I encountered an error connecting to the science database.";
  }
};