import { GoogleGenAI, Type } from "@google/genai";
import { AIRecommendation } from "../src/types";

let aiInstance: GoogleGenAI | null = null;

export function getGemini(): GoogleGenAI | null {
  if (!aiInstance) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.warn("GEMINI_API_KEY is not defined. Utilizing offline rule-based generator.");
      return null;
    }
    aiInstance = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiInstance;
}

// Curated top-tier fallback database for offline/fallback mode
export function getCuratedOfflineRecommendation(skillName: string, category: string): Omit<AIRecommendation, 'id' | 'skillId' | 'createdAt'> {
  const normName = skillName.toLowerCase();
  
  let steps: string[] = [];

  if (normName.includes('react') || normName.includes('web') || normName.includes('typescript') || normName.includes('javascript') || normName.includes('frontend')) {
    steps = [
      "Set up your local environment with Node.js, Vite, and VS Code.",
      "Master modern ES6+ concepts: Arrow functions, Destructuring, Promises, and Modules.",
      "Learn React fundamentals: JSX, Components, Props, and state management via useState/useEffect.",
      "Implement client-side routing using React Router and handle simple forms.",
      "Deep dive into TypeScript strict modes and generic types for component typing.",
      "Build a real-world mini project like a responsive personal dashboard or task manager.",
      "Explore advanced state management using Context API or lightweight libraries like Zustand."
    ];
  } else if (normName.includes('python') || normName.includes('backend') || normName.includes('node') || normName.includes('database') || normName.includes('sql') || normName.includes('api')) {
    steps = [
      "Install the runtime environment and set up a basic script execution pathway.",
      "Learn variables, condition controllers, collections, and basic object-oriented principles.",
      "Understand RESTful API design principles and set up an Express or FastAPI server.",
      "Connect and interact with a database (SQL or NoSQL) using migrations and basic queries.",
      "Implement authentication routes using JWT (JSON Web Tokens) and bcrypt password hashing.",
      "Add secure route protections, input validation middlewares, and error-handling pipelines.",
      "Package your backend with a multi-stage Dockerfile and configure initial server hosting."
    ];
  } else {
    steps = [
      `Define your core learning objectives for ${skillName} and gather trusted reference materials.`,
      `Set up a dedicated practice space or environment to start practical execution daily.`,
      `Dedicate 20-30 minutes of deep focus intervals on standard guides or introductory exercises.`,
      `Attempt a small, self-contained starter project to apply the basics and troubleshoot blocks.`,
      `Track your milestones systematically, documenting what works and what requires practice.`,
      `Transition to intermediate workflows, seeking community feedback or peer reviews to level up.`
    ];
  }

  return {
    steps,
    topics: [],
    projects: [],
    exercises: [],
    roadmap: [],
    interviewPrep: [],
    advanced: []
  };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function isQuotaOrTransientError(err: any): boolean {
  if (!err) return false;
  const msg = typeof err === "string" ? err : (err.message || JSON.stringify(err) || "");
  const lowerMsg = msg.toLowerCase();
  return (
    lowerMsg.includes("429") ||
    lowerMsg.includes("quota") ||
    lowerMsg.includes("resource_exhausted") ||
    lowerMsg.includes("503") ||
    lowerMsg.includes("unavailable") ||
    lowerMsg.includes("high demand")
  );
}

async function callGeminiWithSchema(
  ai: NonNullable<ReturnType<typeof getGemini>>,
  modelName: string,
  contents: string,
  category: string,
  difficultyStr: string
) {
  return await ai.models.generateContent({
    model: modelName,
    contents,
    config: {
      systemInstruction: "You are an elite, highly professional learning path architect. You specialize in designing laser-focused SaaS learning paths and actionable sequential startup steps. Deliver concise, concrete, actionable sequential bullet points, focusing on how a beginner or intermediate student should practically start learning and master this specific skill.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          steps: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Step-by-step progressive instructions on how to start learning and step-by-step master this skill from scratch. No extra intro/outro lines or fluff."
          }
        },
        required: ["steps"]
      }
    }
  });
}

async function generateRecommendationsWithModel(
  ai: NonNullable<ReturnType<typeof getGemini>>,
  skillName: string,
  category: string,
  difficultyStr: string,
  modelName: string,
  maxAttempts: number = 2
): Promise<string> {
  const prompt = `Generate a sequential list of clear, concrete, highly actionable steps on how to start learning and step-by-step master the skill "${skillName}" (Category: "${category}", Difficulty: "${difficultyStr}"). Provide exactly 5 to 7 logical sequence steps representing a clear, straightforward startup plan. No extra categories, descriptions, or fluff.`;

  let attempt = 0;
  while (attempt < maxAttempts) {
    attempt++;
    try {
      const response = await callGeminiWithSchema(ai, modelName, prompt, category, difficultyStr);
      const text = response.text ? response.text.trim() : "";
      if (text) {
        return text;
      }
    } catch (err: any) {
      if (isQuotaOrTransientError(err)) {
        throw err; // bubble up immediately to trigger fast offline fallback without frustrating lag
      }
      const waitTime = 1200 * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 500);
      console.log(
        `[Gemini Auto-Scale] Attentively retrying '${modelName}' (attempt ${attempt}/${maxAttempts}) in ${waitTime}ms...`
      );
      if (attempt < maxAttempts) {
        await sleep(waitTime);
      } else {
        throw err;
      }
    }
  }
  throw new Error(`Model '${modelName}' completed execution attempts.`);
}

export async function generateRecommendations(skillName: string, category: string, difficultyStr: string): Promise<Omit<AIRecommendation, 'id' | 'skillId' | 'createdAt'>> {
  const ai = getGemini();
  if (!ai) {
    console.log("[Gemini Status] Offline fallback active.");
    return getCuratedOfflineRecommendation(skillName, category);
  }

  const modelsToTry = ["gemini-3.5-flash", "gemini-3.1-flash-lite"];
  let bodyText = "";
  let lastErrorMsg = "";

  for (const model of modelsToTry) {
    try {
      bodyText = await generateRecommendationsWithModel(ai, skillName, category, difficultyStr, model, 2);
      if (bodyText) {
        break; // Found working model!
      }
    } catch (err: any) {
      lastErrorMsg = err?.message || JSON.stringify(err) || "Service Busy";
      console.log(`[Gemini Auto-Scale] '${model}' is currently in high demand/busy. Shifting dynamically to alternative pathways...`);
    }
  }

  if (!bodyText) {
    console.log(`[Gemini Status] All active models in high demand. Reverting seamlessly to the built-in learning path template: ${lastErrorMsg}`);
    return getCuratedOfflineRecommendation(skillName, category);
  }

  try {
    const recs = JSON.parse(bodyText);
    return {
      steps: Array.isArray(recs.steps) ? recs.steps : [],
      topics: [],
      projects: [],
      exercises: [],
      roadmap: [],
      interviewPrep: [],
      advanced: []
    };
  } catch (parseErr) {
    console.log("[Gemini Status] Parsing sequence formatted, falling back seamlessly to built-in path template.");
    return getCuratedOfflineRecommendation(skillName, category);
  }
}
