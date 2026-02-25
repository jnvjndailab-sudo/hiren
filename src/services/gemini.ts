import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface Message {
  role: "user" | "model";
  text: string;
  files?: Array<{
    mimeType: string;
    data: string;
    name: string;
  }>;
  groundingMetadata?: any;
}

export async function sendMessage(
  history: Message[],
  message: string,
  files: Array<{ mimeType: string; data: string; name: string }> = []
) {
  const model = "gemini-3-flash-preview";
  
  const contents = history.map(m => ({
    role: m.role,
    parts: [
      { text: m.text },
      ...(m.files?.map(f => ({
        inlineData: {
          mimeType: f.mimeType,
          data: f.data
        }
      })) || [])
    ]
  }));

  // Add the current message
  contents.push({
    role: "user",
    parts: [
      { text: message },
      ...files.map(f => ({
        inlineData: {
          mimeType: f.mimeType,
          data: f.data
        }
      }))
    ]
  });

  const response = await genAI.models.generateContent({
    model,
    contents,
    config: {
      systemInstruction: "You are JNV Junagadh AI, a helpful assistant for students of Jawahar Navodaya Vidyalaya, Junagadh. You help with academics, school information, and general queries. You are polite, encouraging, and knowledgeable about the JNV system.",
      tools: [{ googleSearch: {} }],
    },
  });

  return response;
}
