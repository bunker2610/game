import React, { useState, useEffect, useRef } from 'react';
import { 
  Heart, 
  Coins, 
  Compass, 
  Backpack, 
  MessageSquare, 
  ChevronRight, 
  Sparkles, 
  RefreshCw, 
  Download, 
  User, 
  LogOut, 
  ChevronDown, 
  ChevronUp, 
  Send 
} from 'lucide-react';
import { AdventureState, ChatMessage } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface GameScreenProps {
  gameState: AdventureState;
  onMakeChoice: (choice: string) => Promise<void>;
  onRegenerateImage: () => Promise<void>;
  onRestart: () => void;
  isStepLoading: boolean;
  isImageLoading: boolean;
}

export const GameScreen: React.FC<GameScreenProps> = ({
  gameState,
  onMakeChoice,
  onRegenerateImage,
  onRestart,
  isStepLoading,
  isImageLoading,
}) => {
  const [customAction, setCustomAction] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const storyEndRef = useRef<HTMLDivElement>(null);

  // Initialize companion chat welcome message
  useEffect(() => {
    if (chatMessages.length === 0) {
      setChatMessages([
        {
          id: 'welcome',
          sender: 'companion',
          text: `Приветствую тебя, отважный ${gameState.character.name}! 🌟 Я твоя спутница Лира. Я буду фиксировать твои успехи в дневнике, следить за нашими вещами в рюкзаке и, конечно, всегда готова поболтать или дать мудрый совет. Куда направимся?`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }
      ]);
    }
  }, [gameState.character.name]);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isChatOpen]);

  // Scroll story to bottom when step loads
  useEffect(() => {
    storyEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [gameState.currentStoryText]);

  const handleCustomActionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customAction.trim() || isStepLoading) return;
    onMakeChoice(customAction.trim());
    setCustomAction('');
  };

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: chatInput.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const response = await fetch('/api/companion/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...chatMessages, userMsg],
          gameState,
        }),
      });

      if (!response.ok) throw new Error('Failed to fetch companion response');
      const data = await response.json();

      const companionMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'companion',
        text: data.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setChatMessages(prev => [...prev, companionMsg]);
    } catch (err) {
      console.error(err);
      setChatMessages(prev => [
        ...prev,
        {
          id: 'error',
          sender: 'companion',
          text: 'Ой-ёй, кажется, связь со мной на мгновение прервалась! Но я всё ещё здесь, рядышком. Давай попробуем ещё разок?',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Extract icon representation for items
  const getItemIcon = (item: string) => {
    const itemLower = item.toLowerCase();
    if (itemLower.includes('меч') || itemLower.includes('кинжал') || itemLower.includes('оружие') || itemLower.includes('лазер')) return '⚔️';
    if (itemLower.includes('зелье') || itemLower.includes('напиток') || itemLower.includes('эликсир') || itemLower.includes('колба')) return '🧪';
    if (itemLower.includes('ключ') || itemLower.includes('отмычка')) return '🔑';
    if (itemLower.includes('монет') || itemLower.includes('кошелек') || itemLower.includes('золото')) return '🪙';
    if (itemLower.includes('карта') || itemLower.includes('свиток') || itemLower.includes('книга')) return '📜';
    if (itemLower.includes('щит') || itemLower.includes('броня') || itemLower.includes('доспех')) return '🛡️';
    if (itemLower.includes('фонарь') || itemLower.includes('факел') || itemLower.includes('свеч')) return '🔦';
    return '📦';
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row" id="game-screen-wrapper">
      
      {/* LEFT & CENTER PANEL: Story and Choices */}
      <div className="flex-1 flex flex-col p-4 md:p-6 lg:p-8 overflow-y-auto space-y-6" id="story-panel">
        
        {/* Header */}
        <div className="flex justify-between items-center bg-slate-900/60 border border-slate-800/80 rounded-xl px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <div>
              <div className="text-xs text-slate-400">Сюжетный движок</div>
              <div className="text-sm font-bold text-slate-200 tracking-wide truncate max-w-[200px] md:max-w-xs">
                {gameState.premise.slice(0, 50)}...
              </div>
            </div>
          </div>
          <button
            onClick={onRestart}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-red-950/60 hover:text-red-300 rounded-lg text-xs text-slate-300 border border-slate-700 hover:border-red-900 transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Начать заново</span>
          </button>
        </div>

        {/* Dynamic Scene Illustration */}
        <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 shadow-2xl group flex items-center justify-center">
          {isImageLoading ? (
            <div className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center space-y-3 z-10">
              <div className="relative">
                <div className="w-12 h-12 rounded-full border-4 border-amber-500/20 border-t-amber-500 animate-spin" />
                <Sparkles className="w-5 h-5 text-amber-500 absolute top-3.5 left-3.5 animate-pulse" />
              </div>
              <div className="text-center">
                <span className="text-amber-500 font-medium text-sm animate-pulse block">
                  Генерация иллюстрации...
                </span>
                <span className="text-xs text-slate-500 mt-1 block max-w-xs px-4">
                  Отрисовка сцены в качестве {gameState.imageSize} ({gameState.artStyle})
                </span>
              </div>
            </div>
          ) : gameState.currentImageUrl ? (
            <>
              <img 
                src={gameState.currentImageUrl} 
                alt="Иллюстрация приключения" 
                className="w-full h-full object-cover transition-all duration-700"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity flex justify-between items-end">
                <span className="text-xs text-slate-300 italic max-w-[70%] line-clamp-1 bg-slate-950/80 px-2.5 py-1 rounded-lg">
                  Стиль: {gameState.artStyle} • {gameState.imageSize}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={onRegenerateImage}
                    title="Перерисовать иллюстрацию"
                    className="p-1.5 bg-slate-900/90 hover:bg-amber-600 hover:text-white rounded-lg border border-slate-700 text-slate-300 transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                  <a
                    href={gameState.currentImageUrl}
                    download={`adventure-scene-${Date.now()}.png`}
                    title="Скачать изображение"
                    className="p-1.5 bg-slate-900/90 hover:bg-slate-700 rounded-lg border border-slate-700 text-slate-300 transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center p-8 text-slate-500 space-y-2">
              <Sparkles className="w-8 h-8 mx-auto text-slate-600 animate-pulse" />
              <p className="text-xs">Иллюстрация пока не создана.</p>
              <button
                onClick={onRegenerateImage}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs transition-all cursor-pointer"
              >
                Сгенерировать
              </button>
            </div>
          )}
        </div>

        {/* Story Text Box */}
        <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-5 md:p-6 lg:p-7 shadow-lg space-y-4">
          
          <div className="prose prose-invert max-w-none">
            <AnimatePresence mode="wait">
              <motion.div
                key={gameState.currentStoryText}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="text-slate-200 text-base md:text-lg leading-relaxed font-serif whitespace-pre-wrap"
              >
                {gameState.currentStoryText}
              </motion.div>
            </AnimatePresence>
          </div>
          
          <div ref={storyEndRef} />
        </div>

        {/* Dynamic Actions & Custom Input */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Ваши возможные действия:</h3>
          
          {isStepLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-14 bg-slate-900/60 animate-pulse rounded-xl border border-slate-800" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              <AnimatePresence mode="wait">
                {gameState.currentChoices.map((choice, index) => (
                  <motion.button
                    key={`${choice}-${index}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => onMakeChoice(choice)}
                    className="w-full text-left p-4 rounded-xl border border-slate-800 bg-slate-900/30 hover:bg-amber-950/20 hover:border-amber-900/80 hover:text-amber-200 transition-all cursor-pointer group flex items-start gap-3"
                  >
                    <span className="w-5 h-5 rounded-full bg-slate-800 group-hover:bg-amber-900/50 flex items-center justify-center text-xs text-slate-400 group-hover:text-amber-300 font-bold shrink-0 mt-0.5">
                      {index + 1}
                    </span>
                    <span className="text-sm md:text-base font-medium">{choice}</span>
                    <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-amber-500 ml-auto shrink-0 self-center opacity-0 group-hover:opacity-100 transition-all transform translate-x-[-4px] group-hover:translate-x-0" />
                  </motion.button>
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* Custom Action Input (Genuine freedom of choice) */}
          {!isStepLoading && (
            <form onSubmit={handleCustomActionSubmit} className="mt-4">
              <div className="relative flex items-center bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl focus-within:border-amber-600 focus-within:ring-1 focus-within:ring-amber-600 p-1.5 transition-all">
                <input
                  type="text"
                  placeholder="Свой вариант... (Например: Обшарить карманы разбойника в поисках ключа)"
                  value={customAction}
                  onChange={(e) => setCustomAction(e.target.value)}
                  className="flex-1 bg-transparent border-0 outline-none focus:ring-0 text-sm md:text-base text-slate-100 px-3 py-2 placeholder-slate-500"
                />
                <button
                  type="submit"
                  disabled={!customAction.trim()}
                  className="bg-amber-600 hover:bg-amber-700 disabled:bg-slate-800 text-white px-4 py-2 rounded-lg font-bold text-xs md:text-sm tracking-wide transition-all shrink-0 flex items-center gap-1 disabled:text-slate-500 cursor-pointer"
                >
                  <span>Ход</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}
        </div>

      </div>

      {/* RIGHT SIDEBAR: Character Info, Inventory, Quests & Companion Chat */}
      <div className="w-full md:w-80 lg:w-96 bg-slate-900 border-t md:border-t-0 md:border-l border-slate-800 flex flex-col h-auto md:h-screen shrink-0" id="sidebar">
        
        {/* CHARACTER STATS PANEL */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/80 sticky top-0 z-20 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-600/20 border border-amber-500/40 flex items-center justify-center text-amber-500">
              <User className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-slate-100 text-base truncate">{gameState.character.name}</div>
              <div className="text-xs text-amber-500 font-semibold uppercase tracking-wider">{gameState.character.class}</div>
            </div>
            
            {/* Visual style badge */}
            <span className="text-[10px] bg-slate-800 border border-slate-700 px-2 py-0.5 rounded-full text-slate-400 font-mono capitalize">
              {gameState.artStyle}
            </span>
          </div>

          {/* Health & Gold Progress Bars */}
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="space-y-1 bg-slate-950/60 p-2 rounded-lg border border-slate-800">
              <div className="flex justify-between items-center text-[11px] text-red-400">
                <span className="flex items-center gap-1 font-bold">
                  <Heart className="w-3 h-3 fill-red-500 text-red-500" />
                  ЗДОРОВЬЕ
                </span>
                <span className="font-mono">{gameState.stats.health}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-red-600 rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(0, Math.min(100, gameState.stats.health))}%` }}
                />
              </div>
            </div>

            <div className="space-y-1 bg-slate-950/60 p-2 rounded-lg border border-slate-800">
              <div className="flex justify-between items-center text-[11px] text-amber-400">
                <span className="flex items-center gap-1 font-bold">
                  <Coins className="w-3 h-3 fill-amber-500 text-amber-500" />
                  ЗОЛОТО
                </span>
                <span className="font-mono font-bold">{gameState.stats.gold}</span>
              </div>
              <div className="text-[10px] text-slate-500 text-right font-mono">монет</div>
            </div>
          </div>
        </div>

        {/* INTERACTIVE INVENTORY & QUEST */}
        <div className="p-4 space-y-4 border-b border-slate-800 max-h-[35%] overflow-y-auto bg-slate-900/40">
          
          {/* Active Quest (Automatic updates tracking) */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-amber-500" />
              Активный Квест
            </h4>
            <div className="bg-slate-950/80 border border-slate-850 rounded-xl p-3 text-sm text-slate-200">
              {gameState.currentQuest ? (
                <div className="flex items-start gap-2">
                  <span className="text-amber-500 shrink-0 font-bold">⚔️</span>
                  <span>{gameState.currentQuest}</span>
                </div>
              ) : (
                <span className="text-slate-500 italic text-xs">Нет активного квеста... Осмотритесь вокруг!</span>
              )}
            </div>
          </div>

          {/* Inventory (Automatic updates tracking) */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Backpack className="w-3.5 h-3.5 text-amber-500" />
              Инвентарь ({gameState.inventory.length})
            </h4>
            
            {gameState.inventory.length > 0 ? (
              <div className="grid grid-cols-1 gap-1.5">
                {gameState.inventory.map((item, idx) => (
                  <div 
                    key={`${item}-${idx}`}
                    className="flex items-center gap-2 bg-slate-950/50 border border-slate-850 hover:border-slate-800 p-2 rounded-lg text-xs font-medium text-slate-300 transition-colors"
                  >
                    <span className="text-base shrink-0 select-none">
                      {getItemIcon(item)}
                    </span>
                    <span className="truncate">{item}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-slate-950/40 border border-dashed border-slate-800 rounded-xl p-4 text-center">
                <span className="text-slate-500 italic text-xs block">Рюкзак совершенно пуст.</span>
              </div>
            )}
          </div>

        </div>

        {/* CHAT WITH COMPANION (LIRA THE FAIRY) */}
        <div className="flex-1 flex flex-col min-h-[300px] bg-slate-950/30 overflow-hidden" id="companion-chat">
          
          {/* Chat Header Toggle */}
          <button 
            onClick={() => setIsChatOpen(!isChatOpen)}
            className="w-full flex items-center justify-between p-3.5 bg-slate-900 border-b border-slate-800 hover:bg-slate-850 transition-colors shrink-0 cursor-pointer text-left"
          >
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Чат со спутником (Лира)</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
            </div>
            {isChatOpen ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronUp className="w-4 h-4 text-slate-500" />}
          </button>

          {/* Chat Body */}
          <AnimatePresence initial={false}>
            {isChatOpen && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: '100%', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="flex-1 flex flex-col overflow-hidden"
              >
                
                {/* Messages Container */}
                <div className="flex-1 p-3.5 overflow-y-auto space-y-3 scrollbar-thin">
                  {chatMessages.map((msg) => (
                    <div 
                      key={msg.id} 
                      className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed shadow-sm ${
                        msg.sender === 'user' 
                          ? 'bg-amber-600 text-white rounded-tr-none' 
                          : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none'
                      }`}>
                        {msg.sender === 'companion' && (
                          <div className="font-bold text-[10px] text-amber-500 mb-0.5 tracking-wider uppercase">Лира</div>
                        )}
                        <p>{msg.text}</p>
                        <span className={`block text-[9px] mt-1 text-right ${msg.sender === 'user' ? 'text-amber-200' : 'text-slate-500'}`}>
                          {msg.timestamp}
                        </span>
                      </div>
                    </div>
                  ))}
                  
                  {isChatLoading && (
                    <div className="flex justify-start">
                      <div className="bg-slate-900 border border-slate-800 rounded-2xl rounded-tl-none px-3.5 py-2.5 space-y-1 max-w-[85%] shadow-sm">
                        <div className="font-bold text-[10px] text-amber-500 tracking-wider uppercase">Лира</div>
                        <div className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce" />
                          <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                          <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Chat Input Field */}
                <form onSubmit={handleSendChatMessage} className="p-2 border-t border-slate-850 bg-slate-950/80">
                  <div className="flex items-center bg-slate-900 border border-slate-800 focus-within:border-amber-600 rounded-xl p-1 transition-all">
                    <input
                      type="text"
                      placeholder="Спросить Лиру о квесте или просто поговорить..."
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      className="flex-1 bg-transparent border-0 outline-none focus:ring-0 text-xs text-slate-100 px-2 py-1.5 placeholder-slate-500"
                    />
                    <button
                      type="submit"
                      disabled={!chatInput.trim() || isChatLoading}
                      className="p-1.5 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-800 text-white rounded-lg transition-all shrink-0 cursor-pointer disabled:text-slate-500"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </form>

              </motion.div>
            )}
          </AnimatePresence>

        </div>

      </div>

    </div>
  );
};
