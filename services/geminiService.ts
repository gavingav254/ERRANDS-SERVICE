
import { GoogleGenAI, Type } from "@google/genai";
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

Your Task: Analyze student requests to extract logistics data. Place approxDestinationCoords at or near the closest landmark. For example, if they mention 'Mount Kenya Hostel', place it near 'Hostel Ngiri' or 'Hostel Simba' (-0.5100, 37.4620).`;

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    item: {
      type: Type.STRING,
      description: "The primary item or object requested."
    },
    source: {
      type: Type.STRING,
      description: "The source, shop, or vendor (e.g., The Mess, Gate, town, etc.)."
    },
    location: {
      type: Type.STRING,
      description: "The drop-off destination (e.g., New Library, Hostel Simba, etc.)."
    },
    zone: {
      type: Type.STRING,
      description: "The category/zone of destination.",
      enum: ["Academic", "Hostels", "Admin", "Gate", "Mess", "Unknown"]
    },
    isInternal: {
      type: Type.BOOLEAN,
      description: "True if both source and destination are fully within the University of Embu campus."
    },
    isCrossCampus: {
      type: Type.BOOLEAN,
      description: "True if the distance in between is significant (e.g. Hostels to Academic, or Gate to Hostels)."
    },
    notes: {
      type: Type.STRING,
      description: "Brief, helpful tip or context for delivery."
    },
    approxDestinationCoords: {
      type: Type.OBJECT,
      properties: {
        lat: {
          type: Type.NUMBER,
          description: "Latitude coordinate of the destination location."
        },
        lng: {
          type: Type.NUMBER,
          description: "Longitude coordinate of the destination location."
        }
      },
      required: ["lat", "lng"],
      description: "Estimated lat/lng coordinates of the destination at University of Embu."
    }
  },
  required: ["item", "source", "location", "zone", "isInternal", "isCrossCampus", "notes", "approxDestinationCoords"]
};

export const parseErrandRequest = async (userInput: string, userLocation?: Coords): Promise<AIResponse> => {
  const ai = new GoogleGenAI({ 
    apiKey: process.env.API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: userInput,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        maxOutputTokens: 1024,
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      }
    });

    const rawText = response.text ? response.text.trim() : "";
    if (!rawText) throw new Error("Model returned an empty response.");

    const parsed = JSON.parse(rawText) as AIResponse;

    if (parsed.approxDestinationCoords) {
      parsed.approxDestinationCoords.lat = Number(parsed.approxDestinationCoords.lat);
      parsed.approxDestinationCoords.lng = Number(parsed.approxDestinationCoords.lng);
    }

    return { ...parsed, groundingLinks: [] };
  } catch (error) {
    console.error("Gemini parse error:", error);
    // Dynamic fallback matching based on keywords to guard against missing API key or other network errors
    const lowerInput = (userInput || "").toLowerCase();
    
    let lat = -0.5050;
    let lng = 37.4580;
    let zone: 'Academic' | 'Hostels' | 'Admin' | 'Gate' | 'Mess' | 'Unknown' = 'Unknown';
    let location = 'The Gate';

    if (lowerInput.includes('library')) {
      lat = -0.5065; lng = 37.4595; zone = 'Academic'; location = 'New Library';
    } else if (lowerInput.includes('square') || lowerInput.includes('graduation')) {
      lat = -0.5070; lng = 37.4590; zone = 'Academic'; location = 'Graduation Square';
    } else if (lowerInput.includes('agriculture')) {
      lat = -0.5080; lng = 37.4610; zone = 'Academic'; location = 'School of Agriculture';
    } else if (lowerInput.includes('ngiri')) {
      lat = -0.5100; lng = 37.4620; zone = 'Hostels'; location = 'Hostel Ngiri';
    } else if (lowerInput.includes('simba')) {
      lat = -0.5110; lng = 37.4625; zone = 'Hostels'; location = 'Hostel Simba';
    } else if (lowerInput.includes('mess') || lowerInput.includes('canteen')) {
      lat = -0.5075; lng = 37.4600; zone = 'Mess'; location = 'The Mess';
    } else if (lowerInput.includes('labs') || lowerInput.includes('science')) {
      lat = -0.5060; lng = 37.4590; zone = 'Academic'; location = 'Science Labs';
    } else if (lowerInput.includes('nursing')) {
      lat = -0.5085; lng = 37.4615; zone = 'Academic'; location = 'School of Nursing';
    } else if (lowerInput.includes('admin') || lowerInput.includes('office')) {
      lat = -0.5055; lng = 37.4585; zone = 'Admin'; location = 'Old Admin Block';
    } else if (lowerInput.includes('hostel') || lowerInput.includes('mount kenya')) {
      lat = -0.5105; lng = 37.4622; zone = 'Hostels'; location = 'Mount Kenya Hostel';
    }

    let item = 'Package';
    if (lowerInput.includes('soda') || lowerInput.includes('drink') || lowerInput.includes('water')) {
      item = 'Soda';
    } else if (lowerInput.includes('fries') || lowerInput.includes('chips') || lowerInput.includes('food')) {
      item = 'Fries';
    } else if (lowerInput.includes('book') || lowerInput.includes('assignment') || lowerInput.includes('paper')) {
      item = 'Documents';
    }

    return {
      item,
      source: lowerInput.includes('mess') ? 'The Mess' : 'Main Gate',
      location,
      zone,
      isInternal: true,
      isCrossCampus: true,
      notes: "Campus delivery dispatcher automatic routing.",
      approxDestinationCoords: { lat, lng },
      groundingLinks: []
    };
  }
};
