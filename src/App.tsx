import { useState } from 'react';
import { GameSetup } from './components/GameSetup';
import { GameScreen } from './components/GameScreen';
import { AdventureState, ArtStyle } from './types';
import { Sparkles, Compass } from 'lucide-react';

export default function App() {
  const [gameState, setGameState] = useState<AdventureState | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isStepLoading, setIsStepLoading] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize a new adventure game
  const handleStartGame = async (setupData: {
    premise: string;
    artStyle: ArtStyle;
    characterClass: string;
    characterName: string;
    imageSize: '1K' | '2K' | '4K';
  }) => {
    setIsInitializing(true);
    setError(null);

    try {
      // 1. Fetch initial story, starting quest and inventory from Gemini-powered server
      const initResponse = await fetch('/api/adventure/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          premise: setupData.premise,
          artStyle: setupData.artStyle,
          characterClass: setupData.characterClass,
          characterName: setupData.characterName,
        }),
      });

      if (!initResponse.ok) throw new Error('Ошибка инициализации приключения на сервере.');
      const initData = await initResponse.json();

      // Create local game state
      const initialGameState: AdventureState = {
        premise: setupData.premise,
        artStyle: setupData.artStyle,
        character: {
          name: setupData.characterName,
          class: setupData.characterClass,
          description: initData.characterDescription,
        },
        stats: {
          health: 100,
          maxHealth: 100,
          gold: 25, // Starting gold
          experience: 0,
        },
        inventory: initData.startingInventory || [],
        currentQuest: initData.startingQuest || '',
        storyHistory: [],
        currentStoryText: initData.storyText,
        currentChoices: initData.choices || [],
        currentImageUrl: null,
        imageSize: setupData.imageSize,
      };

      setGameState(initialGameState);
      setIsInitializing(false);

      // 2. Fire-and-forget image generation right after so the user gets a visual quickly
      generateSceneImage(initData.imagePrompt, setupData.artStyle, setupData.imageSize, initialGameState);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Произошла непредвиденная ошибка при создании игры.');
      setIsInitializing(false);
    }
  };

  // Helper to generate image and update state
  const generateSceneImage = async (
    imagePrompt: string, 
    artStyle: ArtStyle, 
    imageSize: '1K' | '2K' | '4K',
    currentState: AdventureState
  ) => {
    setIsImageLoading(true);
    try {
      const imgResponse = await fetch('/api/adventure/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imagePrompt,
          artStyle,
          imageSize,
        }),
      });

      if (!imgResponse.ok) throw new Error('Failed to generate image');
      const imgData = await imgResponse.json();

      setGameState(prev => {
        if (!prev) return null;
        // Make sure we only update if we are still on the same story or if we want to update the active image
        return {
          ...prev,
          currentImageUrl: imgData.imageUrl,
        };
      });
    } catch (err) {
      console.error('Image generation error:', err);
    } finally {
      setIsImageLoading(false);
    }
  };

  // Make a narrative choice (genuine plot branch)
  const handleMakeChoice = async (choice: string) => {
    if (!gameState || isStepLoading) return;

    setIsStepLoading(true);
    setError(null);

    // Save current scene to history before transition
    const updatedHistory = [
      ...gameState.storyHistory,
      {
        storyText: gameState.currentStoryText,
        choiceMade: choice,
        imageUrl: gameState.currentImageUrl || undefined,
      }
    ];

    try {
      const response = await fetch('/api/adventure/step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          premise: gameState.premise,
          character: gameState.character,
          inventory: gameState.inventory,
          currentQuest: gameState.currentQuest,
          storyHistory: updatedHistory,
          choiceMade: choice,
          stats: gameState.stats,
        }),
      });

      if (!response.ok) throw new Error('Ошибка обработки вашего выбора сервером.');
      const data = await response.json();

      // Update inventory (add new items, remove spent ones)
      let finalInventory = [...gameState.inventory];
      if (data.inventoryAdded && data.inventoryAdded.length > 0) {
        finalInventory = [...finalInventory, ...data.inventoryAdded];
      }
      if (data.inventoryRemoved && data.inventoryRemoved.length > 0) {
        finalInventory = finalInventory.filter(
          item => !data.inventoryRemoved.some((rem: string) => rem.toLowerCase() === item.toLowerCase())
        );
      }

      // Update player health and gold dynamically
      const finalHealth = Math.max(0, Math.min(100, gameState.stats.health + (data.healthChange || 0)));
      const finalGold = Math.max(0, gameState.stats.gold + (data.goldChange || 0));

      const nextGameState: AdventureState = {
        ...gameState,
        stats: {
          ...gameState.stats,
          health: finalHealth,
          gold: finalGold,
        },
        inventory: finalInventory,
        currentQuest: data.questText || gameState.currentQuest,
        storyHistory: updatedHistory,
        currentStoryText: data.storyText,
        currentChoices: data.choices || [],
        currentImageUrl: null, // Clear out previous image while we load new one
      };

      setGameState(nextGameState);
      setIsStepLoading(false);

      // Trigger the next illustration rendering in background
      generateSceneImage(data.imagePrompt, gameState.artStyle, gameState.imageSize, nextGameState);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Ошибка генерации продолжения истории.');
      setIsStepLoading(false);
    }
  };

  // Trigger manual regeneration of illustration (e.g. if failed or user wants a fresh roll)
  const handleRegenerateImage = async () => {
    if (!gameState || isImageLoading) return;
    
    // Formulate a quick prompt based on current story state
    const currentPrompt = `A scene representing: ${gameState.currentStoryText.slice(0, 200)}. Protagonist: ${gameState.character.description}`;
    await generateSceneImage(currentPrompt, gameState.artStyle, gameState.imageSize, gameState);
  };

  // Reset the game to start from setup screen
  const handleRestart = () => {
    if (window.confirm('Вы уверены, что хотите завершить текущую игру и начать заново? Ваш текущий прогресс будет утерян.')) {
      setGameState(null);
      setError(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 selection:bg-amber-100 selection:text-amber-900" id="app-root">
      
      {/* Top Banner Branding / Aesthetic Margin */}
      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-600 flex items-center justify-center text-white shadow-sm">
            <Compass className="w-4 h-4 animate-spin-slow" />
          </div>
          <div>
            <span className="font-extrabold text-slate-900 tracking-tight block text-sm sm:text-base leading-none">
              CHOOSE YOUR OWN ADVENTURE
            </span>
            <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
              ИИ-Движок Бесконечных Историй • Powered by Gemini
            </span>
          </div>
        </div>
        
        {gameState && (
          <div className="hidden sm:flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-full text-xs font-semibold text-slate-600">
            <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
            <span>Стиль: <strong className="text-slate-850 capitalize">{gameState.artStyle}</strong></span>
          </div>
        )}
      </header>

      {/* Main Container */}
      <main className="relative">
        
        {/* Error notification */}
        {error && (
          <div className="max-w-4xl mx-auto mt-4 px-4">
            <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-4 text-sm flex items-center justify-between">
              <div>
                <strong className="font-semibold">Произошла ошибка: </strong>
                <span>{error}</span>
              </div>
              <button 
                onClick={() => setError(null)}
                className="text-red-500 hover:text-red-700 font-bold ml-2 text-xs"
              >
                Закрыть
              </button>
            </div>
          </div>
        )}

        {!gameState ? (
          <GameSetup 
            onStartGame={handleStartGame} 
            isLoading={isInitializing} 
          />
        ) : (
          <GameScreen
            gameState={gameState}
            onMakeChoice={handleMakeChoice}
            onRegenerateImage={handleRegenerateImage}
            onRestart={handleRestart}
            isStepLoading={isStepLoading}
            isImageLoading={isImageLoading}
          />
        )}
      </main>

    </div>
  );
}
