
import { GoogleGenAI } from "@google/genai";
import { AIResponse, Coords, GroundingLink } from "../types";

const SYSTEM_INSTRUCTION = `You are the logistics coordinator for 'ERRANDS SERVICE.' You know the University of Embu layout perfectly.
Main Landmarks: 
- The Gate (-0.5050, 37.4580)
- New Library (-0.5065, 37.4595)
- Graduation Square (-0.5070, 37.4590)
- School of Agriculture (-0.5080, 37.4610)
- Hostel Ngiri (-0.5100, 37.4620)
- Hostel Simba (-0.5110, 37.4625)
- The Mess (-0.5075, 37.4600)
- Science Labs (-0.5060, 37.4590)
- School of Nursing (-0.5085, 37.4615)
- Old Admin Block (-0.5055, 37.4585)

Your Task: Analyze student requests to extract logistics data. Use Google Maps to verify specific locations and context.

Return your answer ONLY as a single VALID JSON object. 
IMPORTANT: Do not include markdown code blocks (e.g., \`\`\`json), do not include trailing text, and do not provide any conversational response. 

Fields required:
- item (string): The primary object requested.
- source (string): The pickup point or vendor.
- location (string): The drop-off destination.
- zone (enum: Academic, Hostels, Admin, Gate, Mess, Unknown)
- isInternal (boolean): True if both source and location are within campus.
- isCrossCampus (boolean): True if the distance is significant (e.g. Hostels to Academic).
- notes (string): Helpful delivery tips.
- approxDestinationCoords ({lat: number, lng: number}): Best guess for destination location.

Example response structure:
{"item":"Fries","source":"The Mess","location":"Library","zone":"Academic","isInternal":true,"isCrossCampus":false,"notes":"Met at the entrance.","approxDestinationCoords":{"lat":-0.5065,"lng":37.4595}}`;

/**
 * Robustly extracts the FIRST JSON object found in the text.
 */
function extractJson(text: string): string {
  const firstBrace = text.indexOf('{');
  if (firstBrace === -1) throw new Error("No JSON found (no opening brace).");
  
  let braceCount = 0;
  let lastBrace = -1;
  
  for (let i = firstBrace; i < text.length; i++) {
    if (text[i] === '{') braceCount++;
    if (text[i] === '}') braceCount--;
    
    if (braceCount === 0) {
      lastBrace = i;
      break;
    }
  }
  
  if (lastBrace === -1) throw new Error("JSON object is incomplete or malformed.");
  return text.substring(firstBrace, lastBrace + 1);
}

export const parseErrandRequest = async (userInput: string, userLocation?: Coords): Promise<AIResponse> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: userInput,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      tools: [{ googleMaps: {} }],
      maxOutputTokens: 1024, // Prevent truncation
      toolConfig: userLocation ? {
        retrievalConfig: {
          latLng: {
            latitude: userLocation.lat,
            longitude: userLocation.lng
          }
        }
      } : undefined
    }
  });

  const rawText = response.text || "";
  try {
    if (!rawText) throw new Error("Model returned an empty response.");

    const jsonStr = extractJson(rawText);
    const parsed = JSON.parse(jsonStr) as AIResponse;

    const groundingLinks: GroundingLink[] = [];
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks) {
      chunks.forEach((chunk: any) => {
        if (chunk.maps) {
          groundingLinks.push({
            title: chunk.maps.title || "View on Maps",
            uri: chunk.maps.uri
          });
        }
      });
    }

    if (parsed.approxDestinationCoords) {
      parsed.approxDestinationCoords.lat = Number(parsed.approxDestinationCoords.lat);
      parsed.approxDestinationCoords.lng = Number(parsed.approxDestinationCoords.lng);
    }

    return { ...parsed, groundingLinks };
  } catch (error) {
    console.error("Gemini Error:", error, "Raw text:", rawText);
    throw new Error("Could not parse campus logistics. Please be more specific (e.g., 'Bring soda from Mess to Library').");
  }
};
