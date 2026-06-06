import { GoogleGenAI, Type, Modality } from "@google/genai";
import { SYSTEM_INSTRUCTION } from "./constants";
import { HealthAnalysis, CarePlan } from "./types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Enhanced chat messaging with search and maps grounding
 */
export async function sendMessage(
  message: string, 
  history: { role: 'user' | 'model', parts: { text: string }[] }[],
  userLocation?: { lat: number, lng: number }
) {
  try {
    const config: any = {
      systemInstruction: SYSTEM_INSTRUCTION,
      tools: [{ googleMaps: {} }, { googleSearch: {} }],
    };

    if (userLocation) {
      config.toolConfig = {
        retrievalConfig: {
          latLng: {
            latitude: userLocation.lat,
            longitude: userLocation.lng
          }
        }
      };
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        ...history.map(h => ({ role: h.role, parts: h.parts })),
        { role: 'user', parts: [{ text: message }] }
      ],
      config: config,
    });

    const text = response.text || "I'm sorry, I couldn't generate a response. Please try again.";
    const groundingSources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    return { text, groundingSources };
  } catch (error) {
    console.error("Gemini API Error:", error);
    return { 
      text: "Sorry, I'm having trouble connecting right now. Please check your internet or try again later. In an emergency, call 117.",
      groundingSources: [] 
    };
  }
}

/**
 * Text-to-Speech specifically for health advice delivery
 */
export async function generateSpeech(text: string, voiceName: 'Kore' | 'Puck' | 'Charon' | 'Fenrir' | 'Zephyr' = 'Kore') {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text: `Read this health advice clearly: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("No audio data generated");
    
    return base64Audio;
  } catch (error) {
    console.error("TTS Error:", error);
    return null;
  }
}

export async function fetchHealthReportData(language: string, district?: string) {
  try {
    const districtContext = district && district !== 'all' ? `specifically for ${district} district` : "at a national level";
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Search for the latest official Sierra Leone National Public Health Agency (NPHA) epidemiological reports. Identify cases and trends ${districtContext} for Malaria and Lassa Fever. Respond in ${language}.`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            highlights: { type: Type.ARRAY, items: { type: Type.STRING } },
            metrics: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  disease: { type: Type.STRING },
                  value: { type: Type.NUMBER },
                  unit: { type: Type.STRING },
                  trend: { type: Type.STRING },
                  status: { type: Type.STRING }
                },
                required: ["disease", "value", "trend", "status"]
              }
            }
          },
          required: ["summary", "metrics", "highlights"]
        }
      },
    });

    const parsedData = JSON.parse(response.text || '{}');
    return {
      ...parsedData,
      sources: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
    };
  } catch (error) {
    console.error("Health Report Error:", error);
    throw error;
  }
}

export async function analyzeHealthTopic(topic: string, language: string): Promise<HealthAnalysis> {
  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: `Analyze the following health concern for a user in Sierra Leone. Provide conditions. Respond in ${language}. Topic: ${topic}`,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          conditions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                description: { type: Type.STRING },
                symptoms: { type: Type.ARRAY, items: { type: Type.STRING } },
                treatment: { type: Type.STRING },
                prevention: { type: Type.STRING },
                emergencySigns: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
              required: ["name", "description", "symptoms", "treatment", "prevention", "emergencySigns"]
            }
          },
          generalAdvice: { type: Type.STRING }
        },
        required: ["conditions", "generalAdvice"]
      }
    }
  });

  return JSON.parse(response.text || '{}');
}

export async function generateCarePlan(condition: string, language: string): Promise<CarePlan> {
  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: `Generate a care plan for: ${condition}. Respond in ${language}.`,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          lifestyle: { type: Type.ARRAY, items: { type: Type.STRING } },
          homeMonitoring: { type: Type.ARRAY, items: { type: Type.STRING } },
          whenToSeeDoctor: { type: Type.STRING },
          healthTip: { type: Type.STRING }
        },
        required: ["lifestyle", "homeMonitoring", "whenToSeeDoctor", "healthTip"]
      }
    }
  });

  return JSON.parse(response.text || '{}');
}

export async function generateDoctorBrief(
  topic: string,
  conditions: string[],
  timeline: string,
  severeSymptoms: string[],
  isPregnant: boolean,
  language: string
): Promise<{
  clinicalTriage: 'RED' | 'YELLOW' | 'GREEN';
  labDiagnosticTests: string[];
  researchGuidelineSummary: string;
  suggestedDoctorQuestions: string[];
}> {
  const pregnantContext = isPregnant ? "Patient is pregnant or recently gave birth. Strictly apply maternal/child care warning guidelines." : "";
  const prompt = `You are a medical research agent and senior clinical triager helping a patient in Sierra Leone communicate effectively with real doctors or nurses.
Generate an evidence-based, professional clinical briefing report based on the following patient symptoms.

Patient health concerns: ${topic}
Suspected conditions: ${conditions.join(', ')}
Symptom duration: ${timeline}
Overlapping severe flags: ${severeSymptoms.join(', ') || 'None reported'}
Obstetric status: ${pregnantContext}

Respond in ${language}. Ensure the "researchGuidelineSummary" includes exact global diagnostic standards (such as WHO malaria rapid diagnostics recommendations, WHO maternal care timelines, or UNICEF vaccine outlines) relevant to Sierra Leone.`;

  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: prompt,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION + "\nProvide rigorous, helpful, high-contrast triaging analysis based on peer-reviewed global medical guidelines. Always focus on exact diagnostic workflows rather than prescribing medicines.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          clinicalTriage: {
            type: Type.STRING,
            description: "The triage severity: RED (severe alert/emergency), YELLOW (moderate clinical, requires clinic review), GREEN (minor/general primary wellness)."
          },
          labDiagnosticTests: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Precise rapid tests or lab screens standard for Sierra Leone health clinics (e.g., malaria Rapid Diagnostic Test (mRDT), blood smear, typhoid blood culture, Widal test, cholera rapid card, hemoglobin test)."
          },
          researchGuidelineSummary: {
            type: Type.STRING,
            description: "Citations and guidelines based on global medical research (WHO, Sierra Leone Ministry of Health NPHA, Lancet, BMJ) for this presentation."
          },
          suggestedDoctorQuestions: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "3-4 direct questions the patient can ask their attending clinical nurse or doctor to protect their diagnostic journey."
          }
        },
        required: ["clinicalTriage", "labDiagnosticTests", "researchGuidelineSummary", "suggestedDoctorQuestions"]
      }
    }
  });

  return JSON.parse(response.text || '{}');
}

export async function lookupMedicationDetails(medName: string, language: string): Promise<{
  name: string;
  class: string;
  uses: string;
  usesKrio?: string;
  dosage: string;
  dosageKrio?: string;
  sideEffects: string[];
  warnings: string;
  warningsKrio?: string;
  clinicalGuidanceSL: string;
}> {
  const prompt = `You are an expert pharmaceutical consultant providing guidance on essential medicines standard in Sierra Leone.
Analyze the following medication: "${medName}".
Provide details including drug class, standard indications/uses, standard recommended adult/pediatric dosages, side effects, warnings (particularly maternal pregnancy warnings if any), and specific clinical availability or guidance in Sierra Leone clinics (e.g. part of Free Health Care Initiative for pregnant ladies/lactating moms/under-fives, or restricted prescription-only).

Respond in ${language}. Ensure the JSON strictly follows the schema.`;

  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: prompt,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION + "\nProvide rigorous, helpful, high-contrast pharmacological guidance. Focus heavily on safety, contraindications, and local Sierra Leone contexts (such as malaria co-administration or Lassa treatment cautions).",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          class: { type: Type.STRING },
          uses: { type: Type.STRING, description: "Indications in English" },
          usesKrio: { type: Type.STRING, description: "Indications translated to Krio" },
          dosage: { type: Type.STRING, description: "Adult/pediatric standard safe dosages in English" },
          dosageKrio: { type: Type.STRING, description: "Adult/pediatric standard safe dosages translated to Krio" },
          sideEffects: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of common side effects" },
          warnings: { type: Type.STRING, description: "Important warnings/contraindications in English" },
          warningsKrio: { type: Type.STRING, description: "Important warnings/contraindications translated to Krio" },
          clinicalGuidanceSL: { type: Type.STRING, description: "Sierra Leone specific clinic usage, Free Health Care Initiative status, or containment rules." }
        },
        required: ["name", "class", "uses", "dosage", "sideEffects", "warnings", "clinicalGuidanceSL"]
      }
    }
  });

  return JSON.parse(response.text || '{}');
}

