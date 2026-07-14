import express, { Request, Response } from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

let currentFilename: string;
if (typeof __filename !== "undefined") {
  currentFilename = __filename;
} else {
  currentFilename = fileURLToPath(import.meta.url);
}
const currentDirname = typeof __dirname !== "undefined" ? __dirname : path.dirname(currentFilename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "10mb" }));

// Initialize Google GenAI on the server
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// API endpoint to generate the next adventure step
app.post("/api/adventure/step", async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      premise,
      character,
      inventory,
      currentQuest,
      storyHistory,
      choiceMade,
      stats,
    } = req.body;

    const historyPrompt = storyHistory && storyHistory.length > 0
      ? storyHistory.map((h: any, index: number) => `Шаг ${index + 1}:
История: ${h.storyText}
Выбор игрока: ${h.choiceMade}`).join("\n\n")
      : "История только начинается.";

    const systemInstruction = `Вы — ведущий бесконечной текстовой ролевой игры (Game Master) на русском языке.
Игрок находится в мире с завязкой: "${premise}".
Герой: ${character.name}, Класс: ${character.class}, Описание внешности: ${character.description}.
Текущий инвентарь: ${JSON.stringify(inventory)}.
Текущий квест: "${currentQuest}".
Текущие показатели игрока: Здоровье: ${stats?.health || 100}/${stats?.maxHealth || 100}, Золото: ${stats?.gold || 0}.

Ваша задача — продолжить историю на основе сделанного выбора игрока: "${choiceMade}".
Создайте захватывающее, неожиданное продолжение, которое логически вытекает из его действия. Выборы игрока ДОЛЖНЫ по-настоящему влиять на сюжет, а не вести по шаблонам!
Вам необходимо обновить статус квеста (начать новый, продвинуть текущий или завершить его) и при необходимости добавить/удалить вещи из инвентаря (например, если игрок нашел меч или выпил зелье). Также вы можете изменять здоровье или золото героя в зависимости от происходящего.

Ответьте СТРОГО в формате JSON, соответствующем схеме.`;

    const promptText = `История до этого момента:\n${historyPrompt}\n\nПоследнее действие игрока: "${choiceMade}"`;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite", // Low-latency response model as requested
      contents: promptText,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            storyText: {
              type: Type.STRING,
              description: "Продолжение истории на русском языке (1-2 абзаца). Опишите яркие детали, звуки и последствия действия.",
            },
            choices: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "3-4 интересных, логичных и разнообразных вариантов действий для игрока на русском языке.",
            },
            inventoryAdded: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Массив новых предметов, добавленных в инвентарь (на русском языке), или пустой массив.",
            },
            inventoryRemoved: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Массив предметов, которые игрок потерял или потратил из инвентаря (на русском языке), или пустой массив.",
            },
            questText: {
              type: Type.STRING,
              description: "Текущая формулировка квеста (на русском языке). Если квест завершен, сформулируйте новый или оставьте пустым.",
            },
            questStatus: {
              type: Type.STRING,
              enum: ["started", "updated", "completed", "none"],
              description: "Текущий статус квеста относительно предыдущего.",
            },
            imagePrompt: {
              type: Type.STRING,
              description: "A detailed visual description in English of the active scene for image generation. Describe the subject, composition, background scenery, colors, lighting, and mood. Avoid generic style buzzwords (e.g., do not say 'photorealistic' or 'beautiful'), just describe what is seen. Describe the protagonist matching: " + character.description,
            },
            healthChange: {
              type: Type.INTEGER,
              description: "Изменение здоровья игрока (например, -10 за ранение, +15 за лечебное зелье, 0 если нет изменений).",
            },
            goldChange: {
              type: Type.INTEGER,
              description: "Изменение золота игрока (например, +25 за найденный кошель, -5 за покупку, 0 если нет изменений).",
            },
          },
          required: [
            "storyText",
            "choices",
            "inventoryAdded",
            "inventoryRemoved",
            "questText",
            "questStatus",
            "imagePrompt",
            "healthChange",
            "goldChange",
          ],
        },
      },
    });

    const parsedResponse = JSON.parse(response.text || "{}");
    res.json(parsedResponse);
  } catch (error: any) {
    console.error("Error generating adventure step:", error);
    res.status(500).json({ error: error.message || "Ошибка генерации шага истории" });
  }
});

// API endpoint to generate the character and starting premise
app.post("/api/adventure/init", async (req: Request, res: Response): Promise<void> => {
  try {
    const { premise, artStyle, characterClass, characterName } = req.body;

    const systemInstruction = `Вы — создатель текстовой ролевой игры на русском языке.
Игрок хочет начать игру со следующими параметрами:
- Завязка/Тема: ${premise}
- Имя персонажа: ${characterName}
- Класс: ${characterClass}
- Визуальный стиль: ${artStyle}

Сгенерируйте вводную часть игры. 
Также составьте подробное английское описание внешности главного героя (characterDescription) для генератора изображений. Описание должно быть в стиле фэнтези, фантастики или реализма (в зависимости от завязки), детальным и описывать лицо, одежду и ключевые атрибуты, чтобы мы могли использовать его для стабильного отображения героя.
Сформулируйте первый квест и стартовый инвентарь персонажа.

Ответьте СТРОГО в формате JSON, соответствующем схеме.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite", // Low-latency response model as requested
      contents: "Начните приключение!",
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            storyText: {
              type: Type.STRING,
              description: "Вводный художественный текст начала приключения на русском языке (1-2 абзаца).",
            },
            choices: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "3-4 начальных варианта действий на русском языке.",
            },
            characterDescription: {
              type: Type.STRING,
              description: "A detailed physical appearance description of the protagonist in English (e.g. 'A rugged warrior with short black hair, green eyes, wearing scuffed leather armor, holding a iron shield'). This description will be reused for all image prompts to keep style and look consistent.",
            },
            startingInventory: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "2-3 начальных предмета в инвентаре, подходящие под класс героя.",
            },
            startingQuest: {
              type: Type.STRING,
              description: "Начальный квест (на русском языке), например, 'Выбраться из темницы' или 'Найти таинственного нанимателя'.",
            },
            imagePrompt: {
              type: Type.STRING,
              description: "A detailed visual description in English of the starting scene. Focus on environment, character position, lighting, and mood.",
            },
          },
          required: [
            "storyText",
            "choices",
            "characterDescription",
            "startingInventory",
            "startingQuest",
            "imagePrompt",
          ],
        },
      },
    });

    const parsedResponse = JSON.parse(response.text || "{}");
    res.json(parsedResponse);
  } catch (error: any) {
    console.error("Error initializing adventure:", error);
    res.status(500).json({ error: error.message || "Ошибка инициализации игры" });
  }
});

// API endpoint to generate illustrations
app.post("/api/adventure/image", async (req: Request, res: Response): Promise<void> => {
  try {
    const { imagePrompt, artStyle, imageSize } = req.body;

    // Define visual style suffix based on selected art style to guarantee visual consistency
    let styleSuffix = "";
    switch (artStyle) {
      case "watercolor":
        styleSuffix = ", epic fantasy watercolor illustration, soft pastels, detailed pencil outlines, mystical light";
        break;
      case "cyberpunk":
        styleSuffix = ", high-tech cyberpunk digital art, vivid neon glow, rain-slicked futuristic streets, atmospheric synthwave aesthetics, highly detailed";
        break;
      case "gothic":
        styleSuffix = ", dark gothic oil painting style, dramatic chiaroscuro lighting, deep shadows, moody romanticism, rich texture";
        break;
      case "comic":
        styleSuffix = ", retro hand-drawn ink and color-washed comic book sketch, bold outlines, vintage halftone coloring, dramatic action framing";
        break;
      case "pixel":
        styleSuffix = ", 16-bit retro pixel art game style, vibrant colors, detailed pixel patterns, nostalgic arcade console visual";
        break;
      default:
        styleSuffix = ", digital illustration, clean composition, vibrant colors";
    }

    const fullPrompt = `${imagePrompt}${styleSuffix}. Consistent character representation and clear environmental storytelling.`;

    console.log(`Generating image for prompt: "${fullPrompt}" with size: "${imageSize || "1K"}"`);

    // Using gemini-3-pro-image-preview as requested
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-image-preview",
      contents: {
        parts: [
          {
            text: fullPrompt,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1",
          imageSize: imageSize || "1K", // Provide 1K, 2K, 4K affordance
        },
      },
    });

    let b64Data = "";
    if (response.candidates && response.candidates[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          b64Data = part.inlineData.data;
          break;
        }
      }
    }

    if (!b64Data) {
      throw new Error("No image data found in Gemini response");
    }

    res.json({ imageUrl: `data:image/png;base64,${b64Data}` });
  } catch (error: any) {
    console.error("Error generating image:", error);
    res.status(500).json({ error: error.message || "Ошибка генерации иллюстрации" });
  }
});

// API endpoint for companion chatbot
app.post("/api/companion/chat", async (req: Request, res: Response): Promise<void> => {
  try {
    const { messages, gameState } = req.body;

    const chatHistory = messages && messages.length > 0
      ? messages.map((m: any) => `${m.sender === "user" ? "Игрок" : "Спутник"}: ${m.text}`).join("\n")
      : "История диалога пуста.";

    const systemInstruction = `Вы — Лира, остроумная, веселая и преданная фея-спутница, сопровождающая игрока в его текстовом приключении.
Ваша задача — общаться с игроком в чате. Отвечайте всегда в образе (умная, заботливая, иногда поддразнивающая фея), пишите исключительно по-русски.
Используйте детали текущей игровой ситуации, чтобы ваши ответы были максимально живыми и контекстными.

Текущая игровая ситуация:
- Мир: "${gameState.premise}"
- Имя героя: ${gameState.character.name}, Класс: ${gameState.character.class}
- Текущий квест: "${gameState.currentQuest || "Нет активного квеста"}"
- Инвентарь: ${gameState.inventory.join(", ") || "Пусто"}
- Здоровье: ${gameState.stats.health}/${gameState.stats.maxHealth}, Золото: ${gameState.stats.gold}
- Текущая сцена в истории: "${gameState.currentStoryText}"

Важные правила:
1. Будьте эмоциональной и живой. Пишите относительно коротко (2-4 предложения).
2. Вы можете давать легкие подсказки к загадкам или советовать, какой предмет из инвентаря применить.
3. Относитесь к герою тепло, но с юмором. Регулярно упоминайте вещи из его инвентаря или текущий квест.
4. Отвечайте только обычным текстом, без разметки markdown или кодов.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash", // Use general flash model for conversation
      contents: `История предыдущего диалога:\n${chatHistory}\n\nНовое сообщение от Игрока: "${messages[messages.length - 1]?.text}"\nЛира:`,
      config: {
        systemInstruction,
        temperature: 0.8,
      },
    });

    res.json({ text: response.text || "Я задумалась, мой друг. Что ты сказал?" });
  } catch (error: any) {
    console.error("Error in companion chat:", error);
    res.status(500).json({ error: error.message || "Ошибка чата со спутником" });
  }
});

// Integrate Vite middleware for development
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
