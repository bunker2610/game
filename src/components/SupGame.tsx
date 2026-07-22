import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Waves, 
  Heart, 
  Play, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  Zap, 
  Shield, 
  Coins, 
  Award, 
  AlertTriangle,
  Flame,
  ArrowLeft,
  ArrowRight,
  ShoppingBag,
  Sparkles,
  Compass,
  X,
  Skull,
  BookOpen,
  CheckCircle,
  XCircle,
  Users,
  Check,
  Copy
} from "lucide-react";

// Synthesized audio engine for retro sound effects
class GameAudio {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;

  private init() {
    if (!this.ctx && typeof window !== "undefined") {
      try {
        this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (e) {
        console.error("Failed to initialize AudioContext", e);
      }
    }
  }

  playCoin() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, this.ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.08); // A5
    gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }

  playHit() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(180, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(40, this.ctx.currentTime + 0.25);
    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);
  }

  playShield() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(300, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(900, this.ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.4);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.4);
  }

  playSplash() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(200, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.06, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.25);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.25);
  }

  playJumpscare(type: string) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    if (type === "capybara") {
      // Funny deep robotic grunt
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(60, now);
      osc.frequency.linearRampToValueAtTime(30, now + 0.6);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(now + 0.7);
    } else {
      // Horror screech and boom
      for (let i = 0; i < 3; i++) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = i === 0 ? "sawtooth" : i === 1 ? "square" : "sine";
        osc.frequency.setValueAtTime(100 + i * 40, now);
        osc.frequency.exponentialRampToValueAtTime(1500 + Math.random() * 500, now + 0.6);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.8);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(now + 0.8);
      }
    }
  }
}

const audio = new GameAudio();

// Types for Game Entities
interface GameObject {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  type: "log" | "duck" | "ban" | "coin" | "shield" | "coffee";
  speedY: number;
  angle: number;
  pulse?: number;
}

interface Skin {
  id: string;
  name: string;
  emoji: string;
  price: number;
  description: string;
  color: string;
}

interface LeaderboardEntry {
  score: number;
  date: string;
  emoji: string;
  skinName: string;
  playerName?: string;
}

interface Fisherman {
  id: number;
  x: number;
  y: number;
  side: "left" | "right";
  state: "entering" | "laughing" | "leaving";
  slideX: number; // 0 to 1 progress
  laughTimer: number;
  phrase: string;
  emoji: string;
}

const BOARD_COLORS = [
  { name: "Пурпурный Неон", hex: "#bf94ff" },
  { name: "Изумрудный Прилив", hex: "#10b981" },
  { name: "Лавовый Закат", hex: "#ef4444" },
  { name: "Солнечный Песок", hex: "#f59e0b" },
  { name: "Голубая Волна", hex: "#06b6d4" },
  { name: "Розовый Фламинго", hex: "#ec4899" },
  { name: "Ультрамарин", hex: "#3b82f6" },
  { name: "Зеленый Лайм", hex: "#84cc16" },
];

const CHARACTER_COLORS = [
  { name: "Коралловый Костюм", hex: "#ff5555" },
  { name: "Мятный Жилет", hex: "#34d399" },
  { name: "Желтый Солнечный", hex: "#fbbf24" },
  { name: "Небесно-Голубой", hex: "#60a5fa" },
  { name: "Пурпурный Маг", hex: "#c084fc" },
  { name: "Фуксия", hex: "#f472b6" },
  { name: "Яркий Оранж", hex: "#fb923c" },
  { name: "Кислотно-Салатовый", hex: "#a3e635" },
];

const SKINS: Skin[] = [
  { id: "surfer", name: "Классик Сёрфер", emoji: "🏄", price: 0, description: "Обычный парень в ярких шортах.", color: "#915eff" },
  { id: "capybara", name: "Мистер Капибара", emoji: "🦦", price: 40, description: "Главный чилловый эксперт по сап-бордингу.", color: "#f59e0b" },
  { id: "mod", name: "Twitch Модератор", emoji: "⚔️", price: 80, description: "С пламенным веслом и мечом бана на плече.", color: "#10b981" },
  { id: "duck_king", name: "Утиный Король", emoji: "👑🦆", price: 120, description: "Плывёт гордо, распугивая обычных уток.", color: "#3b82f6" },
  { id: "cyber_surfer", name: "Кибер Сёрфер 2077", emoji: "🤖⚡", price: 180, description: "Неоновый киборг со сверхпроводящим веслом.", color: "#06b6d4" },
  { id: "alien", name: "Пришелец Полл", emoji: "👽🛸", price: 250, description: "Осваивает земные реки на межгалактическом сапе.", color: "#84cc16" },
  { id: "ninja", name: "Теневой Синоби", emoji: "🥷⚔️", price: 320, description: "Невидимый воин скрытого весла и туманных кустов.", color: "#ec4899" },
  { id: "gold_champ", name: "Золотой Чемпион", emoji: "🏆👑", price: 500, description: "Легендарный сёрфер в чистом золоте побед.", color: "#fbbf24" },
];

interface Perk {
  id: string;
  name: string;
  description: string;
  price: number;
  emoji: string;
}

const PERKS: Perk[] = [
  { id: "magnet_board", name: "Магнитный Сап 🧲", description: "Притягивает звезды (монетки) в радиусе 130px.", price: 60, emoji: "🧲" },
  { id: "shield_start", name: "Броня на старте 🛡️", description: "Каждый заплыв начинается с уже готовым щитом!", price: 90, emoji: "🛡️" },
  { id: "coffee_gourmet", name: "Кофейный Гурман ☕", description: "Увеличивает Nitro-ускорение от синей воды до 9 секунд.", price: 50, emoji: "☕" },
  { id: "double_gold", name: "Золотой Прииск 💎", description: "Каждая звезда дает по 2 монеты вместо 1!", price: 120, emoji: "💎" },
  { id: "heavy_deck", name: "Крепкая Корма 🧱", description: "Сокращает время реверса управления от молота в два раза.", price: 70, emoji: "🧱" },
];

interface Companion {
  id: string;
  name: string;
  description: string;
  price: number;
  emoji: string;
  detail: string;
}

const COMPANIONS: Companion[] = [
  { id: "capybara_bro", name: "Капибара Бро 🦦", description: "Плывет рядом и бросает монетки каждые 12 сек.", price: 100, emoji: "🦦", detail: "Лови ништяк! 🌟" },
  { id: "royal_duck", name: "Утка-Бро 👑🦆", description: "Плывет рядом и спавнит вам щиты каждые 20 сек.", price: 150, emoji: "👑🦆", detail: "Держи щит, бро! 🛡️" },
  { id: "cyber_bot", name: "Дрон Кибер-Бот 🤖", description: "Каждые 15 сек аннигилирует ближайшее бревно лазером.", price: 200, emoji: "🤖", detail: "Мишень уничтожена! ⚡" },
];

export default function SupGame({ onClose }: { onClose?: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Custom Colors & Settings
  const [boardColor, setBoardColor] = useState(() => {
    return localStorage.getItem("sup_board_color") || BOARD_COLORS[0].hex;
  });
  const [characterColor, setCharacterColor] = useState(() => {
    return localStorage.getItem("sup_character_color") || CHARACTER_COLORS[0].hex;
  });
  const [isCopied, setIsCopied] = useState(false);
  const [isLobbyJoin, setIsLobbyJoin] = useState(false);

  const copyLobbyLink = () => {
    const link = window.location.origin + window.location.pathname + "?lobby=true";
    navigator.clipboard.writeText(link).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }).catch((err) => {
      console.error("Could not copy link to clipboard: ", err);
    });
  };

  // Game States
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem("sup_high_score") || "0", 10);
  });
  const [coins, setCoins] = useState(() => {
    return parseInt(localStorage.getItem("sup_coins") || "0", 10);
  });
  const [lives, setLives] = useState(3);
  const [shieldCount, setShieldCount] = useState(0);
  const hasShield = shieldCount > 0;
  const [shieldAnimActive, setShieldAnimActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentSkin, setCurrentSkin] = useState<Skin>(SKINS[0]);
  const [unlockedSkinIds, setUnlockedSkinIds] = useState<string[]>(() => {
    return JSON.parse(localStorage.getItem("sup_unlocked_skins") || '["surfer"]');
  });
  const [showShop, setShowShop] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [isGlitchedReact, setIsGlitchedReact] = useState(false);
  const [playerName, setPlayerName] = useState(() => {
    return localStorage.getItem("sup_player_name") || "Сёрфер";
  });
  const [gameLevel, setGameLevel] = useState(1);
  const [levelUpPopup, setLevelUpPopup] = useState<number | null>(null);
  const [isLiveLeaderboardOpen, setIsLiveLeaderboardOpen] = useState(true);

  // --- RPG PROGRESSION & ACTIVE/PASSIVE MECHANICS STATES ---
  const [playerLevel, setPlayerLevel] = useState(() => {
    return parseInt(localStorage.getItem("sup_player_level") || "1", 10);
  });
  const [playerXp, setPlayerXp] = useState(() => {
    return parseInt(localStorage.getItem("sup_player_xp") || "0", 10);
  });
  const [lastXpEarned, setLastXpEarned] = useState<number | null>(null);
  const [levelUpOccurred, setLevelUpOccurred] = useState(false);

  const [unlockedPerkIds, setUnlockedPerkIds] = useState<string[]>(() => {
    return JSON.parse(localStorage.getItem("sup_unlocked_perks") || "[]");
  });
  const [equippedPerkId, setEquippedPerkId] = useState(() => {
    return localStorage.getItem("sup_equipped_perk") || "none";
  });

  const [unlockedCompanionIds, setUnlockedCompanionIds] = useState<string[]>(() => {
    return JSON.parse(localStorage.getItem("sup_unlocked_companions") || "[]");
  });
  const [equippedCompanionId, setEquippedCompanionId] = useState(() => {
    return localStorage.getItem("sup_equipped_companion") || "none";
  });

  const [shopTab, setShopTab] = useState<"skins" | "perks" | "companions">("skins");

  // Gameplay Live Cooldowns (for HUD rendering)
  const [dashCd, setDashCd] = useState(0);
  const [strikeCd, setStrikeCd] = useState(0);
  const [jumpTimeState, setJumpTimeState] = useState(0);
  const [activeWeatherEvent, setActiveWeatherEvent] = useState<string | null>(null);
  const [eventTimeState, setEventTimeState] = useState(0);

  // Multiplayer WebSocket States
  const [gameMode, setGameMode] = useState<"solo" | "multiplayer">("solo");
  const wsRef = useRef<WebSocket | null>(null);
  const myIdRef = useRef<string | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [wsLobbyPlayers, setWsLobbyPlayers] = useState<any[]>([]);
  const [wsLobbyState, setWsLobbyState] = useState<"lobby" | "countdown" | "playing">("lobby");
  const [wsCountdown, setWsCountdown] = useState<number | null>(null);
  const [myId, setMyId] = useState<string | null>(null);
  interface MultiplayerPlayer {
    id: string;
    name: string;
    skinEmoji: string;
    skinColor: string; // Used for boardColor
    characterColor?: string; // Custom character color
    meters: number;
    isDead: boolean;
    hasShield: boolean;
    isSpeedBoosted: boolean;
    xPos: number;
  }
  const otherPlayersRef = useRef<Map<string, MultiplayerPlayer>>(new Map());

  const connectWebSocket = useCallback(() => {
    if (wsRef.current) return;

    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${wsProtocol}//${window.location.host}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsConnected(true);
      ws.send(JSON.stringify({
        type: "join",
        name: playerName,
        skinEmoji: currentSkin.emoji,
        skinColor: boardColor,
        characterColor: characterColor
      }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        switch (msg.type) {
          case "welcome":
            setMyId(msg.id);
            myIdRef.current = msg.id;
            setWsLobbyState(msg.lobbyState);
            break;

          case "lobby_update":
            setWsLobbyPlayers(msg.players);
            setWsLobbyState(msg.lobbyState);
            break;

          case "countdown_start":
            setWsLobbyState("countdown");
            setWsCountdown(msg.value);
            audio.playShield(); // beep sound
            break;

          case "countdown_tick":
            setWsCountdown(msg.value);
            audio.playShield(); // beep sound
            break;

          case "game_start":
            setWsLobbyState("playing");
            setWsCountdown(null);
            otherPlayersRef.current.clear();
            msg.players.forEach((p: any) => {
              if (p.id !== myIdRef.current) {
                otherPlayersRef.current.set(p.id, {
                  id: p.id,
                  name: p.name,
                  skinEmoji: p.skinEmoji,
                  skinColor: p.skinColor || p.boardColor || "#bf94ff",
                  characterColor: p.characterColor || "#ff5555",
                  meters: p.meters,
                  isDead: p.isDead,
                  hasShield: p.hasShield,
                  isSpeedBoosted: p.isSpeedBoosted,
                  xPos: p.xPos
                });
              }
            });
            resetGame();
            break;

          case "player_updated":
            // Filter our own updates, only record other players
            if (msg.player.id !== myIdRef.current) {
              const p = msg.player;
              otherPlayersRef.current.set(p.id, {
                id: p.id,
                name: p.name,
                skinEmoji: p.skinEmoji,
                skinColor: p.skinColor || p.boardColor || "#bf94ff",
                characterColor: p.characterColor || "#ff5555",
                meters: p.meters,
                isDead: p.isDead,
                hasShield: p.hasShield,
                isSpeedBoosted: p.isSpeedBoosted,
                xPos: p.xPos
              });
            }
            break;

          case "lobby_reset":
            setWsLobbyState("lobby");
            setIsPlaying(false);
            otherPlayersRef.current.clear();
            break;
        }
      } catch (e) {
        console.error("Error processing message:", e);
      }
    };

    ws.onclose = () => {
      setWsConnected(false);
      wsRef.current = null;
      setMyId(null);
      myIdRef.current = null;
    };
  }, [playerName, currentSkin, myId, boardColor, characterColor]);

  const disconnectWebSocket = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setWsConnected(false);
    setMyId(null);
    myIdRef.current = null;
  }, []);

  // Update server on name/skin changes
  useEffect(() => {
    if (wsConnected && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "join",
        name: playerName,
        skinEmoji: currentSkin.emoji,
        skinColor: currentSkin.color
      }));
    }
  }, [playerName, currentSkin, wsConnected]);

  // Cleanup socket on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // Check URL query parameters for lobby join
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("lobby") === "true") {
      setIsLobbyJoin(true);
      setGameMode("multiplayer");
    }
  }, []);

  // Auto-connect if joining via lobby link
  useEffect(() => {
    if (isLobbyJoin && !wsConnected && !wsRef.current) {
      connectWebSocket();
    }
  }, [isLobbyJoin, connectWebSocket, wsConnected]);

  // Manage Leaderboard
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(() => {
    try {
      const stored = localStorage.getItem("sup_leaderboard_list");
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error("Failed to load leaderboard", e);
    }
    return [];
  });

  // Jump Scare States
  const [activeScare, setActiveScare] = useState<{
    type: "monkas" | "wutface" | "capybara_god" | "ban_hammer" | "screamer_pepe";
    text: string;
  } | null>(null);
  const [isScreenShaking, setIsScreenShaking] = useState(false);

  // References for Loop state
  const stateRef = useRef({
    playerX: 0,
    playerY: 0,
    playerWidth: 45,
    playerHeight: 80,
    targetPlayerX: 0,
    objects: [] as GameObject[],
    nextObjectId: 0,
    lastSpawnTime: 0,
    lastScareTime: 0,
    isGlitched: false,
    glitchTimeLeft: 0,
    isSpeedBoosted: false,
    boostTimeLeft: 0,
    waveOffset: 0,
    gameSpeed: 1.8,
    meters: 0,
    frameCount: 0,
    fishermen: [] as Fisherman[],
    nextFishermanId: 0,
    lastFishermanSpawnTime: 0,
    level: 1,
    isLevelUpPaused: false,
    levelUpPauseTimer: 0,
    shieldCount: 0,
    playerZ: 0,
    jumpTimeLeft: 0,
    dashCooldown: 0,
    strikeCooldown: 0,
    activeEvent: null as string | null,
    eventTimeLeft: 0,
    eventSpawnTimer: 12.0,
    companionObj: null as {
      x: number;
      y: number;
      emoji: string;
      boardColor: string;
      lastActionTime: number;
      actionText: string;
      actionTextTime: number;
    } | null,
    laserLine: null as { startX: number; startY: number; endX: number; endY: number; duration: number } | null,
    shockwaveEffect: null as { x: number; y: number; r: number; maxR: number; duration: number } | null,
    dashEffect: null as { x: number; y: number; duration: number } | null,
  });

  // Synchronized shield update function
  const changeShieldCount = (updater: number | ((prev: number) => number)) => {
    setShieldCount((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      stateRef.current.shieldCount = next;
      return next;
    });
  };

  const updateLeaderboard = (newScore: number, skin: Skin) => {
    if (newScore <= 0) return;
    const entry: LeaderboardEntry = {
      score: newScore,
      date: new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }),
      emoji: skin.emoji,
      skinName: skin.name,
      playerName: playerName
    };

    setLeaderboard((prev) => {
      const existing = prev.find((e) => e.playerName === playerName);
      if (existing && existing.score >= newScore) {
        return prev;
      }
      const withoutSelf = prev.filter((e) => e.playerName !== playerName);
      const updated = [...withoutSelf, entry]
        .sort((a, b) => b.score - a.score)
        .slice(0, 10); // keep top 10
      localStorage.setItem("sup_leaderboard_list", JSON.stringify(updated));
      return updated;
    });
  };

  // Track keystrokes
  const keysRef = useRef<{ [key: string]: boolean }>({});

  // Synchronize audio mute state
  useEffect(() => {
    audio.enabled = !isMuted;
  }, [isMuted]);

  // Handle high score updates
  const updateHighScore = (newScore: number) => {
    if (newScore > highScore) {
      setHighScore(newScore);
      localStorage.setItem("sup_high_score", newScore.toString());
    }
  };

  // RPG XP and level progression helper
  const processXpProgression = (meters: number) => {
    if (meters <= 0) return;
    const baseNewXp = Math.floor(meters * 1.25) + 15;
    setLastXpEarned(baseNewXp);
    setLevelUpOccurred(false);

    setPlayerXp((prevXp) => {
      let nextXp = prevXp + baseNewXp;
      let nextLvl = playerLevel;
      
      let xpRequired = nextLvl * 250;
      let leveledUp = false;
      while (nextXp >= xpRequired) {
        nextXp -= xpRequired;
        nextLvl += 1;
        xpRequired = nextLvl * 250;
        leveledUp = true;
      }

      if (leveledUp) {
        setPlayerLevel(nextLvl);
        localStorage.setItem("sup_player_level", nextLvl.toString());
        setLevelUpOccurred(true);
      }
      localStorage.setItem("sup_player_xp", nextXp.toString());
      return nextXp;
    });
  };

  // Buy Skin helper
  const buySkin = (skin: Skin) => {
    if (unlockedSkinIds.includes(skin.id)) {
      setCurrentSkin(skin);
      return;
    }
    if (coins >= skin.price) {
      const updated = [...unlockedSkinIds, skin.id];
      const newCoins = coins - skin.price;
      setCoins(newCoins);
      setUnlockedSkinIds(updated);
      setCurrentSkin(skin);
      localStorage.setItem("sup_coins", newCoins.toString());
      localStorage.setItem("sup_unlocked_skins", JSON.stringify(updated));
      audio.playShield();
    }
  };

  // Trigger Jumpscare
  const triggerJumpscare = useCallback(() => {
    const scares: Array<{ type: typeof activeScare; text: string }> = [
      { 
        type: { type: "monkas", text: "МОНКА ЭС ПОД ВОДОЙ!!! ОН СЛЕДИТ ЗА ТОБОЙ!" },
        text: "МОНКА ЭС ПОД ВОДОЙ!!! ОН СЛЕДИТ ЗА ТОБОЙ!" 
      },
      { 
        type: { type: "wutface", text: "АААААА!!! ПОЙМАН СТРИМЕРНЫЙ СКРИМЕР!" },
        text: "АААААА!!! ПОЙМАН СТРИМЕРНЫЙ СКРИМЕР!"
      },
      { 
        type: { type: "capybara_god", text: "БОГ КАПИБАР ЯВИЛСЯ ТЕБЕ: 'ГРЕБИ КРАСИВО!'" },
        text: "БОГ КАПИБАР ЯВИЛСЯ ТЕБЕ: 'ГРЕБИ КРАСИВО!'"
      },
      { 
        type: { type: "ban_hammer", text: "МОДЕРАТОР С ВЕСЛОМ ВЫЛЕЗ ИЗ БОЛОТА! ОПАСНОСТЬ БАНА!" },
        text: "МОДЕРАТОР С ВЕСЛОМ ВЫЛЕЗ ИЗ БОЛОТА! ОПАСНОСТЬ БАНА!"
      },
      { 
        type: { type: "screamer_pepe", text: "РЕАКТИВНЫЙ ПЕПЕ КВАКАЕТ ИЗ ПУЧИНЫ!" },
        text: "РЕАКТИВНЫЙ ПЕПЕ КВАКАЕТ ИЗ ПУЧИНЫ!"
      }
    ];

    const chosen = scares[Math.floor(Math.random() * scares.length)];
    setActiveScare(chosen.type);
    setIsScreenShaking(true);
    audio.playJumpscare(chosen.type.type === "capybara_god" ? "capybara" : "horror");

    setTimeout(() => {
      setIsScreenShaking(false);
    }, 800);

    setTimeout(() => {
      setActiveScare(null);
    }, 2800);
  }, []);

  // Set up Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.code] = true;
      if (e.code === "ArrowLeft" || e.code === "ArrowRight" || e.code === "Space") {
        e.preventDefault();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.code] = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // Reset Game
  const resetGame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const hasShieldStart = equippedPerkId === "shield_start";
    const initialShieldCount = hasShieldStart ? 1 : 0;

    stateRef.current = {
      playerX: canvas.width / 2,
      playerY: canvas.height - 120,
      playerWidth: 45,
      playerHeight: 85,
      targetPlayerX: canvas.width / 2,
      objects: [],
      nextObjectId: 0,
      lastSpawnTime: Date.now(),
      lastScareTime: Date.now(),
      isGlitched: false,
      glitchTimeLeft: 0,
      isSpeedBoosted: false,
      boostTimeLeft: 0,
      waveOffset: 0,
      gameSpeed: 1.8,
      meters: 0,
      frameCount: 0,
      fishermen: [],
      nextFishermanId: 0,
      lastFishermanSpawnTime: Date.now(),
      level: 1,
      isLevelUpPaused: false,
      levelUpPauseTimer: 0,
      shieldCount: initialShieldCount,
      playerZ: 0,
      jumpTimeLeft: 0,
      dashCooldown: 0,
      strikeCooldown: 0,
      activeEvent: null as string | null,
      eventTimeLeft: 0,
      eventSpawnTimer: 12.0, // trigger first weather event at 12s
      companionObj: null as {
        x: number;
        y: number;
        emoji: string;
        boardColor: string;
        lastActionTime: number;
        actionText: string;
        actionTextTime: number;
      } | null,
      laserLine: null as { startX: number; startY: number; endX: number; endY: number; duration: number } | null,
      shockwaveEffect: null as { x: number; y: number; r: number; maxR: number; duration: number } | null,
      dashEffect: null as { x: number; y: number; duration: number } | null,
    };

    setLives(3);
    setScore(0);
    changeShieldCount(initialShieldCount);
    setIsPlaying(true);
    setActiveScare(null);
    setIsGlitchedReact(false);
    setGameLevel(1);
    setLevelUpPopup(null);
    setShowRules(false);
    setShowShop(false);
    setShowLeaderboard(false);
    setDashCd(0);
    setStrikeCd(0);
    setJumpTimeState(0);
    setActiveWeatherEvent(null);
    setEventTimeState(0);
    setLevelUpOccurred(false);
  };

  // Trigger Jump manually (for mobile buttons and keystroke fallback)
  const triggerJump = () => {
    const state = stateRef.current;
    if (state.jumpTimeLeft <= 0 && isPlaying && !state.isLevelUpPaused) {
      state.jumpTimeLeft = 0.8;
      audio.playSplash();
    }
  };

  // Trigger Dash manually (for mobile buttons)
  const triggerDash = () => {
    const state = stateRef.current;
    if (state.dashCooldown <= 0 && isPlaying && !state.isLevelUpPaused) {
      state.dashCooldown = 3.0;
      const dashDist = 80;
      const dirSign = Math.random() > 0.5 ? 1 : -1;
      state.dashEffect = { x: state.playerX, y: state.playerY, duration: 0.3 };
      state.targetPlayerX = Math.min((canvasRef.current?.width || 400) - 30, Math.max(30, state.playerX + dashDist * dirSign));
      audio.playSplash();
    }
  };

  // Trigger Oar Strike manually (for mobile buttons)
  const triggerStrike = () => {
    const state = stateRef.current;
    if (state.strikeCooldown <= 0 && isPlaying && !state.isLevelUpPaused) {
      state.strikeCooldown = 8.0;
      audio.playHit();
      const shockRadius = 130;
      state.shockwaveEffect = { x: state.playerX, y: state.playerY, r: 10, maxR: shockRadius, duration: 0.4 };
      state.objects = state.objects.filter((obj) => {
        if (obj.type === "log" || obj.type === "duck" || obj.type === "ban") {
          const dx = (obj.x + obj.width / 2) - state.playerX;
          const dy = (obj.y + obj.height / 2) - state.playerY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < shockRadius) {
            return false;
          }
        }
        return true;
      });
    }
  };

  // Paddle manually (Left/Right actions)
  const paddleLeft = () => {
    const levelMultiplier = 1 + (stateRef.current.level - 1) * 0.12;
    const step = 100 * levelMultiplier;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const limit = 40;
    if (stateRef.current.isGlitched) {
      const rightLimit = canvas.width - 40;
      stateRef.current.targetPlayerX = Math.min(rightLimit, stateRef.current.playerX + step);
    } else {
      stateRef.current.targetPlayerX = Math.max(limit, stateRef.current.playerX - step);
    }
  };

  const paddleRight = () => {
    const levelMultiplier = 1 + (stateRef.current.level - 1) * 0.12;
    const step = 100 * levelMultiplier;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const limit = canvas.width - 40;
    if (stateRef.current.isGlitched) {
      const leftLimit = 40;
      stateRef.current.targetPlayerX = Math.max(leftLimit, stateRef.current.playerX - step);
    } else {
      stateRef.current.targetPlayerX = Math.min(limit, stateRef.current.playerX + step);
    }
  };

  // Main Loop Game Ref
  useEffect(() => {
    if (!isPlaying) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Responsive Canvas Resize logic
    const updateCanvasSize = () => {
      if (containerRef.current) {
        canvas.width = Math.min(containerRef.current.clientWidth, 720);
        canvas.height = 600;
        if (!stateRef.current.playerX || stateRef.current.playerX === 0) {
          stateRef.current.playerX = canvas.width / 2;
        }
        if (!stateRef.current.targetPlayerX || stateRef.current.targetPlayerX === 0) {
          stateRef.current.targetPlayerX = canvas.width / 2;
        }
        stateRef.current.playerY = canvas.height - 110;
      }
    };
    updateCanvasSize();

    let animationId: number;
    let lastTime = performance.now();

    const loop = (time: number) => {
      const delta = (time - lastTime) / 1000;
      lastTime = time;

      const state = stateRef.current;

      // Check level-up pause
      if (state.isLevelUpPaused) {
        state.levelUpPauseTimer -= delta;
        if (state.levelUpPauseTimer <= 0) {
          state.isLevelUpPaused = false;
          setLevelUpPopup(null);
        }
      }

      // Update meters paddled
      if (!state.isLevelUpPaused) {
        state.meters += delta * (state.isSpeedBoosted ? 12 : 5);
      }
      const currentMeters = Math.floor(state.meters);
      setScore(currentMeters);

      // Level progression check
      const oldLevel = Math.floor(state.level || 1);
      let newLevel = 1;
      if (currentMeters >= 800) {
        newLevel = 5;
      } else if (currentMeters >= 500) {
        newLevel = 4;
      } else if (currentMeters >= 250) {
        newLevel = 3;
      } else if (currentMeters >= 100) {
        newLevel = 2;
      }

      if (!state.isLevelUpPaused && newLevel > oldLevel) {
        state.level = newLevel;
        setGameLevel(newLevel);
        setLevelUpPopup(oldLevel); // completed old level
        audio.playShield();
        changeShieldCount(0); // Reset shield count on each new level
        
        // Reward SubPoints
        const rewards: { [key: number]: number } = {
          1: 25,
          2: 50,
          3: 100,
          4: 200,
        };
        const bonus = rewards[oldLevel] || 30;
        setCoins((c) => {
          const updated = c + bonus;
          localStorage.setItem("sup_coins", updated.toString());
          return updated;
        });

        state.isLevelUpPaused = true;
        state.levelUpPauseTimer = 2.8; // pause for celebration
      }

      // Sync multiplayer telemetry
      if (gameMode === "multiplayer" && wsRef.current?.readyState === WebSocket.OPEN) {
        state.frameCount++;
        if (state.frameCount % 3 === 0) {
          wsRef.current.send(JSON.stringify({
            type: "game_update",
            meters: currentMeters,
            isDead: false,
            hasShield: hasShield,
            isSpeedBoosted: state.isSpeedBoosted,
            xPos: state.playerX / canvas.width,
            boardColor: boardColor,
            characterColor: characterColor
          }));
        }
      }

      // Background Speed up - smoothly and gradually increases to the end of the level,
      // carrying over and increasing with each new level.
      // Higher levels have higher end speeds and take longer to traverse (more meters).
      let levelStartMeters = 0;
      let levelEndMeters = 100;
      let startSpeed = 1.8;
      let endSpeed = 2.6;

      if (newLevel === 1) {
        levelStartMeters = 0;
        levelEndMeters = 100;
        startSpeed = 1.8;
        endSpeed = 2.6;
      } else if (newLevel === 2) {
        levelStartMeters = 100;
        levelEndMeters = 250;
        startSpeed = 2.6;
        endSpeed = 3.5;
      } else if (newLevel === 3) {
        levelStartMeters = 250;
        levelEndMeters = 500;
        startSpeed = 3.5;
        endSpeed = 4.5;
      } else if (newLevel === 4) {
        levelStartMeters = 500;
        levelEndMeters = 800;
        startSpeed = 4.5;
        endSpeed = 5.6;
      } else {
        levelStartMeters = 800;
        levelEndMeters = 1200;
        startSpeed = 5.6;
        endSpeed = 7.0;
      }

      const levelProgress = Math.min(1.0, Math.max(0.0, (state.meters - levelStartMeters) / (levelEndMeters - levelStartMeters)));
      state.gameSpeed = startSpeed + levelProgress * (endSpeed - startSpeed);

      // Spawning obstacles & bonuses
      const now = Date.now();
      const baseSpawnInterval = Math.max(800, 1800 - (currentMeters * 3.5));
      let spawnInterval = state.isSpeedBoosted ? 550 : baseSpawnInterval;
      if (state.activeEvent === "beaver_frenzy") {
        spawnInterval = Math.max(380, spawnInterval * 0.45);
      }
      if (!state.isLevelUpPaused && now - state.lastSpawnTime > spawnInterval) {
        state.lastSpawnTime = now;
        const types: GameObject["type"][] = ["log", "duck", "ban", "coin", "shield", "coffee"];
        
        // Custom probability weighting: coins/obstacles are common, shields/coffee are rare
        const rand = Math.random();
        let chosenType: GameObject["type"] = "log";
        if (rand < 0.35) {
          chosenType = "coin";
        } else if (rand < 0.60) {
          chosenType = Math.random() > 0.5 ? "log" : "duck";
        } else if (rand < 0.82) {
          chosenType = "ban";
        } else if (rand < 0.91) {
          chosenType = "shield";
        } else {
          chosenType = "coffee";
        }

        const objectWidth = chosenType === "log" ? 60 : chosenType === "duck" ? 35 : chosenType === "ban" ? 40 : 25;
        const objectHeight = chosenType === "log" ? 25 : chosenType === "duck" ? 35 : chosenType === "ban" ? 40 : 25;

        state.objects.push({
          id: state.nextObjectId++,
          x: Math.random() * (canvas.width - 60 - objectWidth) + 30,
          y: -40,
          width: objectWidth,
          height: objectHeight,
          type: chosenType,
          speedY: (state.gameSpeed * (0.8 + Math.random() * 0.4)),
          angle: Math.random() * Math.PI * 2,
          pulse: 0
        });
      }



      // Handle glitch state / reversed controls
      if (state.isGlitched) {
        state.glitchTimeLeft -= delta;
        if (state.glitchTimeLeft <= 0) {
          state.isGlitched = false;
          setIsGlitchedReact(false);
        }
      }

      // Handle speed boost state
      if (state.isSpeedBoosted) {
        state.boostTimeLeft -= delta;
        if (state.boostTimeLeft <= 0) {
          state.isSpeedBoosted = false;
        }
      }

      // --- RPG CUSTOM SKILLS & COOLDOWNS ---
      if (state.dashCooldown > 0) {
        state.dashCooldown = Math.max(0, state.dashCooldown - delta);
      }
      if (state.strikeCooldown > 0) {
        state.strikeCooldown = Math.max(0, state.strikeCooldown - delta);
      }

      // 1. JUMP (Spacebar) Trigger
      if (keysRef.current["Space"] && state.jumpTimeLeft <= 0 && !state.isLevelUpPaused) {
        state.jumpTimeLeft = 0.8; // 0.8 seconds air time
        audio.playSplash(); // play jumping splash sound
      }

      // Jump Physics update
      if (state.jumpTimeLeft > 0) {
        state.jumpTimeLeft -= delta;
        state.playerZ = Math.sin((state.jumpTimeLeft / 0.8) * Math.PI) * 25; // max height of 25px
        if (state.jumpTimeLeft <= 0) {
          state.playerZ = 0;
        }
      }

      // 2. DASH (Q Key) Trigger
      if (keysRef.current["KeyQ"] && state.dashCooldown <= 0 && !state.isLevelUpPaused) {
        state.dashCooldown = 3.0; // 3 seconds CD
        const dashDist = 80;
        // Dash direction based on where the player is heading, or default to left/right
        const isHeadingLeft = keysRef.current["ArrowLeft"] || keysRef.current["KeyA"];
        const dirSign = isHeadingLeft ? -1 : 1;
        state.dashEffect = { x: state.playerX, y: state.playerY, duration: 0.3 };
        state.targetPlayerX = Math.min(canvas.width - 30, Math.max(30, state.playerX + dashDist * dirSign));
        audio.playSplash();
      }

      // 3. OAR STRIKE (E Key) Trigger
      if (keysRef.current["KeyE"] && state.strikeCooldown <= 0 && !state.isLevelUpPaused) {
        state.strikeCooldown = 8.0; // 8 seconds CD
        audio.playHit();
        const shockRadius = 130;
        state.shockwaveEffect = { x: state.playerX, y: state.playerY, r: 10, maxR: shockRadius, duration: 0.4 };
        // Clear obstacles within shockwave range
        state.objects = state.objects.filter((obj) => {
          if (obj.type === "log" || obj.type === "duck" || obj.type === "ban") {
            const dx = (obj.x + obj.width / 2) - state.playerX;
            const dy = (obj.y + obj.height / 2) - state.playerY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < shockRadius) {
              return false; // destroy
            }
          }
          return true;
        });
      }

      // --- RANDOM RIVER MODIFIER WEATHER EVENTS ---
      state.eventSpawnTimer -= delta;
      if (state.eventSpawnTimer <= 0) {
        if (!state.activeEvent) {
          const possibleEvents = ["beaver_frenzy", "thunderstorm", "whirlpool"];
          state.activeEvent = possibleEvents[Math.floor(Math.random() * possibleEvents.length)];
          state.eventTimeLeft = 10.0; // last 10s
          state.eventSpawnTimer = 25.0; // Next weather alert in 25s
          audio.playShield();
        }
      }

      if (state.activeEvent) {
        state.eventTimeLeft -= delta;
        if (state.eventTimeLeft <= 0) {
          state.activeEvent = null;
        } else {
          // Storm event logic
          if (state.activeEvent === "thunderstorm") {
            const windForce = Math.sin(time * 0.003) * 75 * delta;
            state.targetPlayerX = Math.min(canvas.width - 30, Math.max(30, state.targetPlayerX + windForce));
          } else if (state.activeEvent === "whirlpool") {
            // Whirlpool pull logic
            const centerPull = (canvas.width / 2 - state.playerX) * 0.45 * delta;
            state.targetPlayerX += centerPull;
          }
        }
      }

      // --- COMPANION BOT SYSTEM ---
      if (equippedCompanionId !== "none" && !state.isLevelUpPaused) {
        if (!state.companionObj) {
          state.companionObj = {
            x: state.playerX - 52,
            y: state.playerY,
            emoji: equippedCompanionId === "capybara_bro" ? "🦦" : equippedCompanionId === "royal_duck" ? "👑🦆" : "🤖",
            boardColor: equippedCompanionId === "capybara_bro" ? "#d97706" : equippedCompanionId === "royal_duck" ? "#eab308" : "#06b6d4",
            lastActionTime: Date.now(),
            actionText: "",
            actionTextTime: 0
          };
        }

        const comp = state.companionObj;
        // Smoothly follow behind / to the side of the surfboard
        const compTargetX = state.playerX - 52;
        comp.x += (compTargetX - comp.x) * 0.15;
        comp.y += (state.playerY - comp.y) * 0.15;

        // Decrease active text display bubble timer
        if (comp.actionTextTime > 0) {
          comp.actionTextTime -= delta;
        }

        const compNow = Date.now();
        const actionCd = equippedCompanionId === "capybara_bro" ? 12000 : equippedCompanionId === "royal_duck" ? 20000 : 15000;
        if (compNow - comp.lastActionTime > actionCd) {
          comp.lastActionTime = compNow;
          
          if (equippedCompanionId === "capybara_bro") {
            state.objects.push({
              id: state.nextObjectId++,
              x: comp.x,
              y: comp.y - 15,
              width: 25,
              height: 25,
              type: "coin",
              speedY: -2.0,
              angle: 0,
              pulse: 0
            });
            comp.actionText = "Лови монетку! 🌟";
            comp.actionTextTime = 2.0;
            audio.playCoin();
          } else if (equippedCompanionId === "royal_duck") {
            state.objects.push({
              id: state.nextObjectId++,
              x: comp.x,
              y: comp.y - 15,
              width: 25,
              height: 25,
              type: "shield",
              speedY: -1.8,
              angle: 0,
              pulse: 0
            });
            comp.actionText = "Держи щит, бро! 🛡️";
            comp.actionTextTime = 2.0;
            audio.playShield();
          } else if (equippedCompanionId === "cyber_bot") {
            // Shoots laser and destroys the closest oncoming obstacle
            let closestObs: any = null;
            let minDist = 9999;
            state.objects.forEach((obj) => {
              if (obj.type === "log" || obj.type === "duck" || obj.type === "ban") {
                const dy = state.playerY - obj.y;
                if (dy > 30 && dy < minDist) {
                  minDist = dy;
                  closestObs = obj;
                }
              }
            });
            if (closestObs) {
              const oIdx = state.objects.indexOf(closestObs);
              if (oIdx > -1) {
                state.objects.splice(oIdx, 1);
                comp.actionText = "Мишень устранена! ⚡";
                comp.actionTextTime = 2.0;
                audio.playHit();
                // Spawn laser effect lines
                state.laserLine = {
                  startX: comp.x,
                  startY: comp.y,
                  endX: closestObs.x + closestObs.width / 2,
                  endY: closestObs.y + closestObs.height / 2,
                  duration: 0.25
                };
              }
            }
          }
        }
      }

      // Throttled React state updater (prevents excessive re-renders)
      if (state.frameCount % 4 === 0) {
        setDashCd(Math.ceil(state.dashCooldown));
        setStrikeCd(Math.ceil(state.strikeCooldown));
        setActiveWeatherEvent(state.activeEvent);
        setEventTimeState(Math.ceil(state.eventTimeLeft));
      }

      // Smooth keyboard movement controls (snappier speed! increases with level)
      const levelMultiplier = 1 + (state.level - 1) * 0.12;
      const moveSpeed = 750 * levelMultiplier * delta;
      let leftPressed = keysRef.current["ArrowLeft"] || keysRef.current["KeyA"];
      let rightPressed = keysRef.current["ArrowRight"] || keysRef.current["KeyD"];

      if (state.isGlitched) {
        // Reverse controls!
        const temp = leftPressed;
        leftPressed = rightPressed;
        rightPressed = temp;
      }

      if (leftPressed) {
        state.targetPlayerX = Math.max(30, state.playerX - moveSpeed);
      }
      if (rightPressed) {
        state.targetPlayerX = Math.min(canvas.width - 30, state.playerX + moveSpeed);
      }

      // Interpolate player position with snappy responsive factor
      state.playerX += (state.targetPlayerX - state.playerX) * 0.35;

      // Update waves animation offset (river speed scales with level!)
      const waveSpeedMultiplier = 1 + (state.level - 1) * 0.15;
      state.waveOffset = (state.waveOffset + delta * (state.isSpeedBoosted ? 12 : 5) * waveSpeedMultiplier) % canvas.height;

      // Physics, collision checks, rendering
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 1. Draw River Neon Waves
      ctx.strokeStyle = "rgba(145, 94, 255, 0.15)";
      ctx.lineWidth = 2;
      for (let i = 0; i < canvas.height + 40; i += 40) {
        ctx.beginPath();
        const yPos = (i + state.waveOffset) % (canvas.height + 40) - 20;
        ctx.moveTo(0, yPos);
        for (let x = 0; x <= canvas.width; x += 20) {
          const waveHeight = Math.sin((x + state.waveOffset * 10) * 0.02) * 5;
          ctx.lineTo(x, yPos + waveHeight);
        }
        ctx.stroke();
      }

      // 2. Draw Side River Margins (glowing shores with lush green bushes)
      ctx.fillStyle = "#162e1c"; // moss green
      ctx.fillRect(0, 0, 25, canvas.height);
      ctx.fillRect(canvas.width - 25, 0, 25, canvas.height);

      // Neon shore borders
      ctx.strokeStyle = "#2e7d32";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(25, 0);
      ctx.lineTo(25, canvas.height);
      ctx.moveTo(canvas.width - 25, 0);
      ctx.lineTo(canvas.width - 25, canvas.height);
      ctx.stroke();

      // Draw bush circles along the shores to make them look fluffy and green
      ctx.fillStyle = "#1b4d22"; // darker dense foliage
      for (let y = 0; y < canvas.height + 60; y += 60) {
        const offset = Math.sin((y + state.waveOffset) * 0.05) * 4;
        
        // Left bush
        ctx.beginPath();
        ctx.arc(8 + offset, y, 18, 0, Math.PI * 2);
        ctx.fill();

        // Right bush
        ctx.beginPath();
        ctx.arc(canvas.width - 8 - offset, y, 18, 0, Math.PI * 2);
        ctx.fill();
      }

      // Add small leaf details occasionally
      ctx.fillStyle = "#388e3c"; // lighter bright green highlight
      for (let y = 30; y < canvas.height + 60; y += 60) {
        const offset = Math.cos((y + state.waveOffset) * 0.05) * 3;
        ctx.beginPath();
        ctx.arc(4 + offset, y, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(canvas.width - 4 - offset, y, 12, 0, Math.PI * 2);
        ctx.fill();
      }

      // 2.5 Update and Draw Fishermen from bushes
      const nowMs = Date.now();
      // Try to spawn a fisherman if none are active and enough time has passed
      if (!state.isLevelUpPaused && (state.fishermen || []).length === 0 && nowMs - state.lastFishermanSpawnTime > 7000 + Math.random() * 8000) {
        state.lastFishermanSpawnTime = nowMs;
        const side = Math.random() > 0.5 ? "left" : "right";
        const yCoord = 120 + Math.random() * 220; // safe play area
        const phrases = [
          "Ха-ха, ну ты даёшь! 🎣",
          "Где весло потерял? 😂",
          "Чайник на доске! 🌊",
          "Рыбу мне распугал! 🐟",
          "Лови леща! 🎣",
          "Упадешь сейчас! 🏄‍♂️",
          "Ха-ха-ха! Чилл окончен!",
          "Греби быстрее, акула сзади! 🦈",
          "Эй, сап-сёрфер, права-то купил? 👮‍♂️",
          "Куда прёшь на моё прикормленное место?! 😡",
          "Мой дед на бревне быстрее плавал! 👴",
          "Греби сильнее, пузико спадёт! 🧘‍♂️",
          "Смотри не улети в камыши! 🌾",
          "Красиво гребёшь, прямо как топор! 🪓",
          "Осторожно, впереди бобры-рейдеры! 🦫",
          "Весло не для красоты, маши им! 🚣‍♂️",
          "Чат, смотрите, новый нуб плывёт! 💬",
          "Это тебе не ванна, тут волны! 🌊",
          "Баланс держи, ё-моё! ⚖️",
          "Опа, спонсор брёвен приплыл! 🪵",
          "Эй, снимите его на телефон, ща упадёт! 📱",
          "Опять туристы всю реку заняли! 😤",
          "Давай трюк с веслом! 🪄",
          "Капибара плывёт лучше тебя! 🦦",
          "Стримлер, лови бан от бревна! 🚫",
          "На доске стоишь, а ума не нажил! 🤪",
          "Карасей мне не топчи! 🐡",
          "Эй, попутного ветра в горб! 💨",
          "Греби усерднее, золото близко! 🏆",
          "Эпично идёшь! Завидую молча... 😎",
          "Вот это скилл! (Нет) 🤡"
        ];
        const emojis = ["👴", "🧔", "🤠", "🧙‍♂️", "👮‍♂️"];
        const chosenPhrase = phrases[Math.floor(Math.random() * phrases.length)];
        const chosenEmoji = emojis[Math.floor(Math.random() * emojis.length)];

        if (!state.fishermen) {
          state.fishermen = [];
        }

        state.fishermen.push({
          id: state.nextFishermanId++,
          x: side === "left" ? -40 : canvas.width + 40,
          y: yCoord,
          side: side,
          state: "entering",
          slideX: 0,
          laughTimer: 0,
          phrase: chosenPhrase,
          emoji: chosenEmoji
        });
      }

      // Update and draw fishermen
      const currentFishermen = state.fishermen || [];
      for (let fIdx = currentFishermen.length - 1; fIdx >= 0; fIdx--) {
        const f = currentFishermen[fIdx];
        
        // State updates
        if (f.state === "entering") {
          f.slideX += delta * 3; // fast entry
          if (f.slideX >= 1) {
            f.slideX = 1;
            f.state = "laughing";
            f.laughTimer = 0;
            audio.playSplash(); // play splash effect for entry
          }
        } else if (f.state === "laughing") {
          f.laughTimer += delta;
          if (f.laughTimer >= 3.2) { // laugh for 3.2s
            f.state = "leaving";
          }
        } else if (f.state === "leaving") {
          f.slideX -= delta * 2.5; // leaving back into bushes
          if (f.slideX <= 0) {
            f.slideX = 0;
            currentFishermen.splice(fIdx, 1);
            continue;
          }
        }

        // Calculate actual draw X coordinate based on slideX
        const hiddenX = f.side === "left" ? -25 : canvas.width + 25;
        const visibleX = f.side === "left" ? 18 : canvas.width - 18;
        f.x = hiddenX + (visibleX - hiddenX) * f.slideX;

        // Draw the Fisherman
        ctx.save();
        ctx.translate(f.x, f.y);

        // Add a funny bouncing / shaking animation when laughing!
        let bounceY = 0;
        let rotation = 0;
        if (f.state === "laughing") {
          bounceY = Math.abs(Math.sin(f.laughTimer * 15)) * -6;
          rotation = Math.sin(f.laughTimer * 20) * 0.12;
        }
        ctx.translate(0, bounceY);
        ctx.rotate(rotation);

        // Draw Fisherman Emoji
        ctx.font = "32px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(f.emoji, 0, 0);

        // Draw his fishing rod!
        ctx.strokeStyle = "#eab308";
        ctx.lineWidth = 2;
        ctx.beginPath();
        if (f.side === "left") {
          ctx.moveTo(5, -5);
          ctx.lineTo(28, -25);
          ctx.stroke();
          // thin fishing line
          ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(28, -25);
          ctx.lineTo(40, 20);
          ctx.stroke();
        } else {
          ctx.moveTo(-5, -5);
          ctx.lineTo(-28, -25);
          ctx.stroke();
          // thin fishing line
          ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(-28, -25);
          ctx.lineTo(-40, 20);
          ctx.stroke();
        }

        ctx.restore();

        // Draw the speech bubble for his laugh phrase!
        if (f.state === "laughing" || f.state === "entering") {
          ctx.save();
          // Draw speech bubble slightly above and offset
          let bubbleX = f.side === "left" ? f.x + 48 : f.x - 48;
          const bubbleY = f.y - 32;

          ctx.font = "bold 13px sans-serif";
          const textWidth = ctx.measureText(f.phrase).width;
          const paddingX = 12;
          const paddingY = 8;
          const textHeight = 16;
          const halfWidth = textWidth / 2 + paddingX;

          // Clamp bubbleX so it is always completely within the game screen width (leaving small safety margins)
          const minX = halfWidth + 8;
          const maxX = canvas.width - halfWidth - 8;
          if (bubbleX < minX) {
            bubbleX = minX;
          }
          if (bubbleX > maxX) {
            bubbleX = maxX;
          }

          // Draw speech bubble background
          ctx.fillStyle = "rgba(13, 7, 24, 0.96)";
          ctx.strokeStyle = "#a78bfa";
          ctx.lineWidth = 1.8;
          ctx.shadowColor = "#915eff";
          ctx.shadowBlur = 6;
          
          ctx.beginPath();
          // Round rect
          ctx.roundRect(
            bubbleX - halfWidth,
            bubbleY - textHeight / 2 - paddingY,
            textWidth + paddingX * 2,
            textHeight + paddingY * 2,
            8
          );
          ctx.fill();
          ctx.stroke();

          // Small triangle connector pointing to the fisherman's head center (f.x, f.y)
          ctx.fillStyle = "rgba(13, 7, 24, 0.96)";
          ctx.beginPath();
          const bubbleBottom = bubbleY + textHeight / 2 + paddingY;
          // Place base on bubble bottom edge, nearest to fisherman's X position
          const baseCenter = Math.min(bubbleX + halfWidth - 10, Math.max(bubbleX - halfWidth + 10, f.x));
          ctx.moveTo(baseCenter - 6, bubbleBottom);
          ctx.lineTo(f.x, f.y - 12); // point directly at fisherman's head
          ctx.lineTo(baseCenter + 6, bubbleBottom);
          ctx.closePath();
          ctx.fill();

          // Draw seamless border for the triangle connector
          ctx.strokeStyle = "#a78bfa";
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.moveTo(baseCenter - 6, bubbleBottom);
          ctx.lineTo(f.x, f.y - 12);
          ctx.lineTo(baseCenter + 6, bubbleBottom);
          ctx.stroke();

          // Clean overlapping filled triangle background to conceal the original border line
          ctx.fillStyle = "rgba(13, 7, 24, 1)";
          ctx.beginPath();
          ctx.moveTo(baseCenter - 5, bubbleBottom - 1);
          ctx.lineTo(f.x, f.y - 11);
          ctx.lineTo(baseCenter + 5, bubbleBottom - 1);
          ctx.closePath();
          ctx.fill();

          // Draw the phrase text
          ctx.fillStyle = "#ffffff";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(f.phrase, bubbleX, bubbleY);
          ctx.restore();
        }
      }

      // 3. Process game objects (move & collision check)
      for (let i = state.objects.length - 1; i >= 0; i--) {
        const obj = state.objects[i];
        
        // Move downwards
        if (!state.isLevelUpPaused) {
          obj.y += obj.speedY * (state.isSpeedBoosted ? 1.8 : 1.0);
          obj.angle += delta * 1.5;
          if (obj.pulse !== undefined) {
            obj.pulse += delta * 6;
          }
        }

        // Draw Object with helper glow auras (green for bonuses, red for hazards)
        const isBonus = obj.type === "coin" || obj.type === "shield" || obj.type === "coffee";
        
        ctx.save();
        ctx.translate(obj.x + obj.width / 2, obj.y + obj.height / 2);
        
        // 1. Draw Ground/Water Glowing Indicator
        if (isBonus) {
          // Green glowing aura under bonus items
          const bonusGlow = ctx.createRadialGradient(0, 0, 1, 0, 0, obj.width * 1.1);
          bonusGlow.addColorStop(0, "rgba(52, 211, 153, 0.5)"); // Emerald green
          bonusGlow.addColorStop(0.5, "rgba(52, 211, 153, 0.2)");
          bonusGlow.addColorStop(1, "rgba(52, 211, 153, 0)");
          ctx.fillStyle = bonusGlow;
          ctx.beginPath();
          ctx.arc(0, 0, obj.width * 1.1, 0, Math.PI * 2);
          ctx.fill();

          // Green rotating/pulsing dashed circle
          ctx.strokeStyle = "rgba(52, 211, 153, 0.85)";
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.arc(0, 0, obj.width * 0.9 + Math.sin((obj.pulse || 0) * 3) * 2, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        } else {
          // Red glowing aura under danger/obstacle items
          const dangerGlow = ctx.createRadialGradient(0, 0, 1, 0, 0, obj.width * 1.1);
          dangerGlow.addColorStop(0, "rgba(239, 68, 68, 0.4)"); // Danger Red
          dangerGlow.addColorStop(0.5, "rgba(239, 68, 68, 0.15)");
          dangerGlow.addColorStop(1, "rgba(239, 68, 68, 0)");
          ctx.fillStyle = dangerGlow;
          ctx.beginPath();
          ctx.arc(0, 0, obj.width * 1.1, 0, Math.PI * 2);
          ctx.fill();

          // Red dashed warning circle
          ctx.strokeStyle = "rgba(239, 68, 68, 0.8)";
          ctx.lineWidth = 1.5;
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.arc(0, 0, obj.width * 0.85, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        ctx.rotate(obj.type === "log" ? Math.sin(obj.angle) * 0.1 : obj.angle * 0.2);

        if (obj.type === "log") {
          // Beautiful 3D wood log with gradient, end rings, and bark crevices
          const logGrad = ctx.createLinearGradient(0, -obj.height / 2, 0, obj.height / 2);
          logGrad.addColorStop(0, "#a05e32"); // light top
          logGrad.addColorStop(0.4, "#7a431d"); // mid bark
          logGrad.addColorStop(1, "#44210a"); // dark shadow under
          ctx.fillStyle = logGrad;
          ctx.strokeStyle = "#291305";
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.roundRect(-obj.width / 2, -obj.height / 2, obj.width, obj.height, 6);
          ctx.fill();
          ctx.stroke();

          // End cross-section cut wood rings (left and right)
          ctx.fillStyle = "#ddb892";
          ctx.beginPath();
          ctx.ellipse(-obj.width / 2 + 3, 0, 4, obj.height / 2 - 3, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#7a431d";
          ctx.lineWidth = 1;
          ctx.stroke();

          ctx.fillStyle = "#ddb892";
          ctx.beginPath();
          ctx.ellipse(obj.width / 2 - 3, 0, 4, obj.height / 2 - 3, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#7a431d";
          ctx.lineWidth = 1;
          ctx.stroke();

          // Organic wood lines/bark texture
          ctx.strokeStyle = "rgba(40, 18, 5, 0.45)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(-obj.width / 3, -6);
          ctx.lineTo(obj.width / 4, -6);
          ctx.moveTo(-obj.width / 4, 4);
          ctx.lineTo(obj.width / 3, 4);
          ctx.stroke();
        } else if (obj.type === "duck") {
          // Custom beautiful stylized vector rubber ducky (no emoji!)
          // Golden yellow body and head with soft 3D shading
          ctx.save();
          
          // Outer subtle body shadow
          ctx.fillStyle = "rgba(0,0,0,0.1)";
          ctx.beginPath();
          ctx.ellipse(0, 8, 14, 6, 0, 0, Math.PI * 2);
          ctx.fill();

          // Yellow duck body gradient
          const duckBodyGrad = ctx.createRadialGradient(-4, -2, 2, 0, 0, 15);
          duckBodyGrad.addColorStop(0, "#fff5ad"); // highlights
          duckBodyGrad.addColorStop(0.3, "#facc15"); // yellow base
          duckBodyGrad.addColorStop(1, "#ca8a04"); // shadow
          ctx.fillStyle = duckBodyGrad;
          
          // Body
          ctx.beginPath();
          ctx.ellipse(2, 2, 14, 10, 0, 0, Math.PI * 2);
          ctx.fill();

          // Wing shape
          ctx.fillStyle = "#facc15";
          ctx.beginPath();
          ctx.ellipse(-2, 0, 7, 5, -0.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#b45309";
          ctx.lineWidth = 1;
          ctx.stroke();

          // Head (slightly offset to the right/front)
          ctx.fillStyle = duckBodyGrad;
          ctx.beginPath();
          ctx.arc(8, -8, 7.5, 0, Math.PI * 2);
          ctx.fill();

          // Beak (bright orange glossy bill)
          const beakGrad = ctx.createLinearGradient(12, -8, 20, -6);
          beakGrad.addColorStop(0, "#fb923c");
          beakGrad.addColorStop(1, "#ea580c");
          ctx.fillStyle = beakGrad;
          ctx.beginPath();
          ctx.moveTo(14, -10);
          ctx.quadraticCurveTo(20, -10, 19, -7);
          ctx.quadraticCurveTo(14, -6, 14, -6);
          ctx.closePath();
          ctx.fill();

          // Cute glossy eye
          ctx.fillStyle = "#0f172a";
          ctx.beginPath();
          ctx.arc(7, -10, 1.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(6.5, -11, 0.6, 0, Math.PI * 2);
          ctx.fill();

          ctx.restore();
        } else if (obj.type === "ban") {
          // Cyberpunk/Arcade Glowing Ban Hammer of Justice!
          ctx.save();
          // Draw Handle
          ctx.strokeStyle = "#64748b";
          ctx.lineWidth = 3.5;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(-12, 12);
          ctx.lineTo(6, -6);
          ctx.stroke();
          
          // Draw metallic grip tape bands on the handle
          ctx.strokeStyle = "#e2e8f0";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(-8, 8);
          ctx.lineTo(-6, 6);
          ctx.moveTo(-4, 4);
          ctx.lineTo(-2, 2);
          ctx.stroke();

          // Draw Hammer Head (Double Sided Cyber Sledge)
          ctx.translate(6, -6);
          ctx.rotate(Math.PI / 4);

          // Head Base Gradient (Metallic charcoal with red warning indicators)
          const headGrad = ctx.createLinearGradient(-14, -8, 14, 8);
          headGrad.addColorStop(0, "#334155");
          headGrad.addColorStop(0.5, "#1e293b");
          headGrad.addColorStop(1, "#0f172a");
          ctx.fillStyle = headGrad;
          ctx.strokeStyle = "#ef4444";
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.roundRect(-14, -7, 28, 14, 3);
          ctx.fill();
          ctx.stroke();

          // Glowing Red Warning core stripe
          ctx.fillStyle = "#f87171";
          ctx.shadowColor = "#ef4444";
          ctx.shadowBlur = 6;
          ctx.fillRect(-2, -7, 4, 14);
          ctx.shadowBlur = 0;

          // Side caps
          ctx.fillStyle = "#94a3b8";
          ctx.fillRect(-15, -5, 1, 10);
          ctx.fillRect(14, -5, 1, 10);

          // Draw small "BAN" tag on the hammer head
          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 7px monospace";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("BAN", 0, 0);

          ctx.restore();
        } else if (obj.type === "coin") {
          // Golden sub points coin with 3D layers and shiny reflections
          const pulseScale = 1 + Math.sin(obj.pulse || 0) * 0.15;
          ctx.scale(pulseScale, pulseScale);

          // Golden outer border linear gradient
          const goldGrad = ctx.createLinearGradient(-obj.width / 2, -obj.height / 2, obj.width / 2, obj.height / 2);
          goldGrad.addColorStop(0, "#fbbf24"); // Light sparkling gold
          goldGrad.addColorStop(0.4, "#f59e0b"); // Warm amber gold
          goldGrad.addColorStop(1, "#b45309"); // Deep bronze gold

          ctx.fillStyle = goldGrad;
          ctx.strokeStyle = "#78350f";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(0, 0, obj.width / 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Inner gold face inset circle
          ctx.fillStyle = "#f59e0b";
          ctx.beginPath();
          ctx.arc(0, 0, obj.width / 2 - 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#b45309";
          ctx.lineWidth = 1;
          ctx.stroke();

          // Star logo inside
          ctx.fillStyle = "#ffffff";
          ctx.shadowColor = "#fffbeb";
          ctx.shadowBlur = 4;
          ctx.font = "bold 11px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("★", 0, 0);
          ctx.shadowBlur = 0;

          // Shiny bright specular gloss arc overlay
          ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
          ctx.lineWidth = 1.5;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.arc(0, 0, obj.width / 2 - 1.5, Math.PI * 1.25, Math.PI * 1.75);
          ctx.stroke();
        } else if (obj.type === "shield") {
          // Glassy emerald holographic shield bubble orb
          const orbGrad = ctx.createRadialGradient(-3, -3, 2, 0, 0, obj.width / 2);
          orbGrad.addColorStop(0, "rgba(52, 211, 153, 0.6)"); // light green inner
          orbGrad.addColorStop(0.7, "rgba(16, 185, 129, 0.3)"); // rich emerald
          orbGrad.addColorStop(1, "rgba(4, 120, 87, 0.75)"); // deep green outer boundary

          ctx.fillStyle = orbGrad;
          ctx.strokeStyle = "#34d399";
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.arc(0, 0, obj.width / 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Glowing vector shield emblem inside
          ctx.fillStyle = "#ffffff";
          ctx.shadowColor = "#34d399";
          ctx.shadowBlur = 6;
          ctx.beginPath();
          // Shield shape drawn with smooth curves
          ctx.moveTo(0, -7);
          ctx.lineTo(5, -4);
          ctx.lineTo(5, 1);
          ctx.quadraticCurveTo(5, 5, 0, 8);
          ctx.quadraticCurveTo(-5, 5, -5, 1);
          ctx.lineTo(-5, -4);
          ctx.closePath();
          ctx.fill();
          ctx.shadowBlur = 0;

          // Inner shield detail lines
          ctx.strokeStyle = "#059669";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(0, -5);
          ctx.lineTo(0, 6);
          ctx.moveTo(-3, -1);
          ctx.lineTo(3, -1);
          ctx.stroke();

          // Reflective white glossy highlight on top left
          ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
          ctx.beginPath();
          ctx.ellipse(-4, -4, 4, 2, Math.PI / 4, 0, Math.PI * 2);
          ctx.fill();
        } else if (obj.type === "coffee") {
          // Speed boost energy drink can with glossy metal caps and electric neon theme
          ctx.save();
          // Shiny can base gradient
          const canGrad = ctx.createLinearGradient(-obj.width / 3, 0, obj.width / 3, 0);
          canGrad.addColorStop(0, "#06b6d4"); // electric blue-green cyan
          canGrad.addColorStop(0.3, "#22d3ee"); // cyan highlight
          canGrad.addColorStop(0.7, "#0891b2"); // rich ocean blue
          canGrad.addColorStop(1, "#0e7490"); // dark shadow edge

          ctx.fillStyle = canGrad;
          ctx.strokeStyle = "#155e75";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.roundRect(-obj.width / 3, -obj.height / 2, (obj.width / 3) * 2, obj.height, 4);
          ctx.fill();
          ctx.stroke();

          // Metal Top and Bottom Rim Rings
          ctx.fillStyle = "#cbd5e1";
          ctx.strokeStyle = "#64748b";
          ctx.lineWidth = 1;
          
          ctx.beginPath();
          ctx.ellipse(0, -obj.height / 2, obj.width / 3, 2, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          ctx.beginPath();
          ctx.ellipse(0, obj.height / 2, obj.width / 3, 2, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Neon lightning bolt emblem on the can
          ctx.fillStyle = "#fbbf24";
          ctx.shadowColor = "#f59e0b";
          ctx.shadowBlur = 6;
          ctx.beginPath();
          ctx.moveTo(1, -6);
          ctx.lineTo(-4, 0);
          ctx.lineTo(-1, 0);
          ctx.lineTo(-1.5, 6);
          ctx.lineTo(4, -1);
          ctx.lineTo(1, -1);
          ctx.closePath();
          ctx.fill();
          ctx.shadowBlur = 0;

          // Glossy sheen reflection overlay
          ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
          ctx.fillRect(-obj.width / 3, -obj.height / 2 + 1, 2, obj.height - 2);

          ctx.restore();
        }

        ctx.restore();

        // Screen boundary clearance
        if (obj.y > canvas.height + 50) {
          state.objects.splice(i, 1);
          continue;
        }

        // AABB Collision check with Player
        const pLeft = state.playerX - state.playerWidth / 2 + 5;
        const pRight = state.playerX + state.playerWidth / 2 - 5;
        const pTop = state.playerY - state.playerHeight / 2 + 10;
        const pBottom = state.playerY + state.playerHeight / 2 - 5;

        const oLeft = obj.x;
        const oRight = obj.x + obj.width;
        const oTop = obj.y;
        const oBottom = obj.y + obj.height;

        let isColliding = !state.isLevelUpPaused && pLeft < oRight && pRight > oLeft && pTop < oBottom && pBottom > oTop;

        // JUMP OVER OBSTACLES: Skip logs and bans if player is in the air
        if (isColliding && state.playerZ > 0 && (obj.type === "log" || obj.type === "ban")) {
          isColliding = false;
        }

        if (isColliding) {
          // Handle collision types
          if (obj.type === "coin") {
            audio.playCoin();
            const coinAmount = equippedPerkId === "double_gold" ? 2 : 1;
            setCoins((c) => {
              const updated = c + coinAmount;
              localStorage.setItem("sup_coins", updated.toString());
              return updated;
            });
          } else if (obj.type === "shield") {
            audio.playShield();
            changeShieldCount((prev) => Math.min(2, prev + 1));
          } else if (obj.type === "coffee") {
            audio.playShield();
            state.isSpeedBoosted = true;
            const boostDuration = equippedPerkId === "coffee_gourmet" ? 9.0 : 6.0;
            state.boostTimeLeft = boostDuration;
          } else {
            // Collision with hazards (log, ban, duck)
            if (state.shieldCount > 0) {
              // Absorbed by shield
              audio.playShield();
              changeShieldCount((prev) => prev - 1);
            } else {
              // Deduct life
              audio.playHit();
              setLives((l) => {
                const nextLives = l - 1;
                if (nextLives <= 0) {
                  // Game Over
                  setIsPlaying(false);
                  updateHighScore(currentMeters);
                  updateLeaderboard(currentMeters, currentSkin);
                  processXpProgression(currentMeters); // Process RPG Levels & XP

                  if (gameMode === "multiplayer" && wsRef.current?.readyState === WebSocket.OPEN) {
                    wsRef.current.send(JSON.stringify({
                      type: "game_update",
                      meters: currentMeters,
                      isDead: true,
                      hasShield: false,
                      isSpeedBoosted: false
                    }));
                  }
                }
                return nextLives;
              });

              // Apply control glitch if hitting duck/glitchy objects
              if (obj.type === "duck") {
                state.isGlitched = true;
                const glitchDuration = equippedPerkId === "heavy_deck" ? 1.75 : 3.5;
                state.glitchTimeLeft = glitchDuration;
                setIsGlitchedReact(true);
              }
            }
          }

          // Remove collided object
          state.objects.splice(i, 1);
        }
      }

      // 3.5 Draw other multiplayer players (ghosts)
      if (gameMode === "multiplayer") {
        otherPlayersRef.current.forEach((p) => {
          if (p.isDead) return;
          
          ctx.save();
          // Draw relative position based on meters paddled
          const relativeY = state.playerY - (p.meters - currentMeters) * 4;
          
          if (relativeY > -100 && relativeY < canvas.height + 100) {
            ctx.translate(p.xPos * canvas.width, relativeY);
            
            // Draw wave ripples under ghost board
            ctx.strokeStyle = "rgba(145, 94, 255, 0.12)";
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(0, state.playerHeight / 2, 10 + Math.sin(time * 0.005) * 2, 0, Math.PI, false);
            ctx.stroke();
            
            // Draw their surfboard (oval, semi-transparent ghost style)
            ctx.fillStyle = p.skinColor || "#bf94ff";
            ctx.globalAlpha = 0.5;
            ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.ellipse(0, 0, state.playerWidth / 2, state.playerHeight / 2, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            
            // Draw stripes on their board
            ctx.strokeStyle = "rgba(0,0,0,0.12)";
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(0, -state.playerHeight / 2);
            ctx.lineTo(0, state.playerHeight / 2);
            ctx.stroke();
            
            // Draw active shield on ghost
            if (p.hasShield) {
              ctx.strokeStyle = "rgba(16, 185, 129, 0.6)";
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.arc(0, 0, state.playerHeight / 2 + 8, 0, Math.PI * 2);
              ctx.stroke();
            }
            
            // Draw glowing suit / character aura behind them
            ctx.save();
            ctx.shadowColor = p.characterColor || "#ff5555";
            ctx.shadowBlur = 8;
            ctx.fillStyle = p.characterColor || "#ff5555";
            ctx.globalAlpha = 0.6;
            ctx.beginPath();
            ctx.arc(0, -10, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            // Draw their skin emoji
            ctx.globalAlpha = 0.75;
            ctx.font = "26px sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(p.skinEmoji || "🏄", 0, -8);
            
            // Draw ghost paddle
            ctx.strokeStyle = "#5a3418";
            ctx.lineWidth = 1.5;
            const ghostPaddleSide = Math.sin(time * 0.01 + p.meters) > 0 ? 1 : -1;
            ctx.beginPath();
            ctx.moveTo(0, -5);
            ctx.lineTo(18 * ghostPaddleSide, 10);
            ctx.stroke();

            ctx.fillStyle = p.characterColor || "#ff5555";
            ctx.beginPath();
            ctx.ellipse(18 * ghostPaddleSide, 10, 3, 6, Math.PI / 4, 0, Math.PI * 2);
            ctx.fill();

            // Draw Name above board
            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 9px monospace";
            ctx.fillText(p.name, 0, -state.playerHeight / 2 - 8);
          }
          ctx.restore();
        });
      }

      // --- DRAW RPG SPECIAL EFFECTS & COMPANIONS ---
      // 3.6 Draw Whirlpool Event Visual
      if (state.activeEvent === "whirlpool") {
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(time * 0.004);
        ctx.strokeStyle = "rgba(6, 182, 212, 0.22)";
        ctx.lineWidth = 3;
        ctx.shadowColor = "#06b6d4";
        ctx.shadowBlur = 10;
        for (let r = 20; r < 140; r += 25) {
          ctx.beginPath();
          ctx.arc(0, 0, r, 0, Math.PI * 1.5);
          ctx.stroke();
        }
        ctx.restore();
      }

      // 3.7 Draw Laser beams
      if (state.laserLine && state.laserLine.duration > 0) {
        state.laserLine.duration -= delta;
        ctx.save();
        ctx.strokeStyle = "#22d3ee";
        ctx.lineWidth = 3;
        ctx.shadowColor = "#06b6d4";
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.moveTo(state.laserLine.startX, state.laserLine.startY);
        ctx.lineTo(state.laserLine.endX, state.laserLine.endY);
        ctx.stroke();
        ctx.restore();
        if (state.laserLine.duration <= 0) {
          state.laserLine = null;
        }
      }

      // 3.8 Draw Shockwaves
      if (state.shockwaveEffect && state.shockwaveEffect.duration > 0) {
        state.shockwaveEffect.duration -= delta;
        state.shockwaveEffect.r += (state.shockwaveEffect.maxR - state.shockwaveEffect.r) * 0.22;
        ctx.save();
        ctx.strokeStyle = "rgba(168, 85, 247, " + (state.shockwaveEffect.duration / 0.4) + ")";
        ctx.lineWidth = 4;
        ctx.shadowColor = "#c084fc";
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(state.shockwaveEffect.x, state.shockwaveEffect.y, state.shockwaveEffect.r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        if (state.shockwaveEffect.duration <= 0) {
          state.shockwaveEffect = null;
        }
      }

      // 3.9 Draw Dash Trail Ghost
      if (state.dashEffect && state.dashEffect.duration > 0) {
        state.dashEffect.duration -= delta;
        ctx.save();
        ctx.globalAlpha = (state.dashEffect.duration / 0.3) * 0.45;
        ctx.font = "28px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(currentSkin.emoji, state.dashEffect.x, state.dashEffect.y - 10);
        ctx.restore();
        if (state.dashEffect.duration <= 0) {
          state.dashEffect = null;
        }
      }

      // 3.95 Draw Companion Bot on its own surfboard
      if (equippedCompanionId !== "none" && state.companionObj) {
        const comp = state.companionObj;
        ctx.save();
        ctx.translate(comp.x, comp.y);

        // Draw mini board
        ctx.fillStyle = comp.boardColor;
        ctx.beginPath();
        ctx.ellipse(0, 0, 16, 28, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.7)";
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // mini grip mat
        ctx.fillStyle = "rgba(255,255,255,0.2)";
        ctx.beginPath();
        ctx.ellipse(0, 2, 12, 18, 0, 0, Math.PI * 2);
        ctx.fill();

        // Bounce companion slightly
        const compBounce = Math.sin(time * 0.006) * 1.5;
        ctx.translate(0, compBounce);

        // emoji
        ctx.font = "18px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(comp.emoji, 0, -3);

        ctx.restore();

        // Draw chat bubble
        if (comp.actionText && comp.actionTextTime > 0) {
          ctx.save();
          ctx.font = "bold 9px monospace";
          const txtW = ctx.measureText(comp.actionText).width;
          const bx = comp.x;
          const by = comp.y - 36;

          // round rect
          ctx.fillStyle = "rgba(10, 5, 20, 0.9)";
          ctx.strokeStyle = "#38bdf8";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.roundRect(bx - txtW / 2 - 5, by - 6, txtW + 10, 13, 4);
          ctx.fill();
          ctx.stroke();

          // text
          ctx.fillStyle = "#e0f2fe";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(comp.actionText, bx, by + 1);
          ctx.restore();
        }
      }

      // 4. Draw Player on SUP Board
      if (state.playerZ > 0) {
        ctx.save();
        ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
        ctx.beginPath();
        const shadowScale = Math.max(0.65, 1 - state.playerZ / 80);
        ctx.ellipse(state.playerX, state.playerY, (state.playerWidth / 2) * shadowScale, (state.playerHeight / 2) * shadowScale, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      ctx.save();
      ctx.translate(state.playerX, state.playerY - (state.playerZ || 0));

      // Scale board slightly when jumping to enhance depth perspective
      if (state.playerZ > 0) {
        const jumpScale = 1 + (state.playerZ / 120);
        ctx.scale(jumpScale, jumpScale);
      }

      // Subtle breathing floating board animation
      const floatOffset = state.playerZ > 0 ? 0 : Math.sin(time * 0.005) * 2;
      ctx.translate(0, floatOffset);

      // Draw a highly polished, realistic 3D fiberglass SUP board (pointed racing board shape!)
      ctx.save();
      // Outer board glow
      ctx.shadowColor = boardColor;
      ctx.shadowBlur = 12;
      
      // Pointed SUP Board path (nose is top/negative Y, tail is bottom/positive Y)
      ctx.beginPath();
      const hw = state.playerWidth / 2;
      const hh = state.playerHeight / 2;
      
      // Draw sleek streamlined outline
      ctx.moveTo(0, -hh); // Nose
      ctx.quadraticCurveTo(hw + 2, -hh / 2, hw, 0); // Right shoulder
      ctx.lineTo(hw - 1.5, hh / 2); // Right middle
      ctx.quadraticCurveTo(hw - 3, hh - 1, 0, hh); // Tail right
      ctx.quadraticCurveTo(-hw + 3, hh - 1, -hw + 1.5, hh / 2); // Tail left
      ctx.lineTo(-hw, 0); // Left middle
      ctx.quadraticCurveTo(-hw - 2, -hh / 2, 0, -hh); // Left shoulder
      ctx.closePath();

      // Board gradient (gorgeous gelcoat shading)
      const boardGrad = ctx.createLinearGradient(-hw, 0, hw, 0);
      boardGrad.addColorStop(0, boardColor);
      boardGrad.addColorStop(0.3, "rgba(255, 255, 255, 0.25)"); // reflection Highlight
      boardGrad.addColorStop(0.5, boardColor);
      boardGrad.addColorStop(1, "rgba(0, 0, 0, 0.25)"); // side shadow
      
      ctx.fillStyle = boardColor;
      ctx.fill();

      // Apply the glossy gelcoat shading layer
      ctx.fillStyle = boardGrad;
      ctx.fill();

      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();

      // Reset shadows
      ctx.shadowBlur = 0;

      // Draw custom rubberized deck pad (grip mat) on the board
      ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
      ctx.beginPath();
      ctx.ellipse(0, 2, hw - 3.5, hh - 10, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw deck pad horizontal traction grooves
      ctx.strokeStyle = "rgba(0,0,0,0.12)";
      ctx.lineWidth = 1;
      for (let gy = -hh + 12; gy < hh - 10; gy += 4) {
        ctx.beginPath();
        const ratio = gy / (hh - 10);
        const factor = 1 - ratio * ratio;
        const gw = (hw - 3.5) * (factor > 0 ? Math.sqrt(factor) : 0);
        ctx.moveTo(-gw, gy);
        ctx.lineTo(gw, gy);
        ctx.stroke();
      }

      // Draw sporty racing double-stripe (stringer) down the center
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, -hh + 2);
      ctx.lineTo(0, hh - 2);
      ctx.stroke();

      ctx.strokeStyle = "rgba(0, 0, 0, 0.2)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(2, -hh + 4);
      ctx.lineTo(2, hh - 4);
      ctx.stroke();

      // Draw high-quality water spray particles/wake trails from sides/tail
      ctx.fillStyle = "rgba(255, 255, 255, 0.65)";
      for (let s = 0; s < 4; s++) {
        const splashSide = Math.random() > 0.5 ? 1 : -1;
        const sx = (hw - 1) * splashSide + (Math.random() - 0.5) * 4;
        const sy = hh / 2 + Math.random() * (hh / 2);
        const sr = 1 + Math.random() * 2.5;
        ctx.beginPath();
        ctx.arc(sx, sy, sr, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw rear foaming wake bubblers
      ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
      for (let w = 0; w < 3; w++) {
        const wx = (Math.random() - 0.5) * 12;
        const wy = hh + 3 + Math.random() * 12;
        const wr = 1.5 + Math.random() * 3;
        ctx.beginPath();
        ctx.arc(wx, wy, wr, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw active shield bubble
      if (state.shieldCount > 0) {
        ctx.strokeStyle = "#10b981";
        ctx.fillStyle = "rgba(16, 185, 129, 0.15)";
        ctx.lineWidth = 1.5 + state.shieldCount * 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, state.playerHeight / 2 + 10, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fill();

        // Draw multiple ring effects if they have 2+ shields
        if (state.shieldCount >= 2) {
          ctx.strokeStyle = "rgba(16, 185, 129, 0.4)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(0, 0, state.playerHeight / 2 + 16, 0, Math.PI * 2);
          ctx.stroke();
        }
        if (state.shieldCount >= 3) {
          ctx.strokeStyle = "rgba(16, 185, 129, 0.2)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(0, 0, state.playerHeight / 2 + 22, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Draw shield count text over the player
        if (state.shieldCount > 1) {
          ctx.save();
          ctx.font = "bold 11px monospace";
          ctx.fillStyle = "#10b981";
          ctx.shadowColor = "#000000";
          ctx.shadowBlur = 3;
          ctx.textAlign = "center";
          ctx.fillText(`x${state.shieldCount}`, 0, -state.playerHeight / 2 - 15);
          ctx.restore();
        }
      }

      // Draw Nitro particles if boosted
      if (state.isSpeedBoosted) {
        ctx.fillStyle = "#ff5500";
        for (let p = 0; p < 5; p++) {
          const px = (Math.random() - 0.5) * 30;
          const py = state.playerHeight / 2 + Math.random() * 15;
          ctx.fillRect(px, py, 4, 4);
        }
      }

      // Draw active Glitch visual cues
      if (state.isGlitched) {
        ctx.font = "11px monospace";
        ctx.fillStyle = "#00ff00";
        ctx.fillText("!?РЕВЕРС?!", -30, -50);
      }

      // Draw glowing suit / character aura behind local player
      ctx.save();
      ctx.shadowColor = characterColor || "#fff";
      ctx.shadowBlur = 12;
      ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
      ctx.beginPath();
      ctx.arc(0, -8, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Top-down Premium Stylized Character Renderer
      ctx.save();
      const skinId = currentSkin.id;
      const paddleSide = Math.sin(time * 0.01) > 0 ? 1 : -1;

      // Draw hands & paddle connection lines (shoulders to hands)
      ctx.strokeStyle = "rgba(0,0,0,0.3)";
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-6, -6);
      ctx.lineTo(10 * paddleSide, 0);
      ctx.moveTo(6, -6);
      ctx.lineTo(10 * paddleSide, 0);
      ctx.stroke();

      if (skinId === "surfer") {
        // --- 1. CLASSIK SURFER (Beach Guy in Board Shorts) ---
        ctx.fillStyle = "#ff6b81"; // pink base shorts
        ctx.beginPath();
        ctx.roundRect(-7, -10, 14, 12, 4);
        ctx.fill();
        ctx.fillStyle = "#2ed573"; // cyan detail stripe
        ctx.fillRect(-7, -4, 14, 3);

        // Shoulders / Chest (tanned skin)
        ctx.fillStyle = "#f5bc96";
        ctx.beginPath();
        ctx.ellipse(0, -8, 8, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Head
        ctx.beginPath();
        ctx.arc(0, -17, 6, 0, Math.PI * 2);
        ctx.fill();

        // Blonde surfer hair
        ctx.fillStyle = "#fed330";
        ctx.beginPath();
        ctx.arc(-2, -19, 3, 0, Math.PI * 2);
        ctx.arc(2, -19, 3, 0, Math.PI * 2);
        ctx.arc(0, -21, 4, 0, Math.PI * 2);
        ctx.fill();

        // Cool black shades
        ctx.fillStyle = "#1e272e";
        ctx.fillRect(-4, -18, 8, 2.5);
      } else if (skinId === "capybara") {
        // --- 2. MR CAPYBARA (Ultimate Chill Furry Animal) ---
        ctx.fillStyle = "#8a5a36"; // Capybara brown fur
        ctx.beginPath();
        ctx.roundRect(-9, -12, 18, 15, 8);
        ctx.fill();

        // Soft cream colored belly pad
        ctx.fillStyle = "#dfb48c";
        ctx.beginPath();
        ctx.ellipse(0, -6, 5, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Cute capybara head
        ctx.fillStyle = "#704829";
        ctx.beginPath();
        ctx.roundRect(-6, -21, 12, 10, 5);
        ctx.fill();

        // Sleepy chill eyes
        ctx.strokeStyle = "#2f1a0c";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(-3, -17);
        ctx.quadraticCurveTo(-2, -16, -1, -17);
        ctx.moveTo(1, -17);
        ctx.quadraticCurveTo(2, -16, 3, -17);
        ctx.stroke();

        // Cute tropical flower on ears
        ctx.fillStyle = "#eb3b5a";
        ctx.beginPath();
        ctx.arc(4, -20, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#fed330";
        ctx.beginPath();
        ctx.arc(4, -20, 0.8, 0, Math.PI * 2);
        ctx.fill();
      } else if (skinId === "mod") {
        // --- 3. TWITCH MODERATOR (Cyber Hooded Warrior) ---
        ctx.fillStyle = "#6441a5"; // Twitch purple
        ctx.beginPath();
        ctx.roundRect(-8, -11, 16, 14, 5);
        ctx.fill();

        // Glowing green moderation badge on back
        ctx.fillStyle = "#10b981";
        ctx.shadowColor = "#10b981";
        ctx.shadowBlur = 5;
        ctx.fillRect(-2, -7, 4, 4);
        ctx.shadowBlur = 0;

        // Hood
        ctx.fillStyle = "#432874";
        ctx.beginPath();
        ctx.ellipse(0, -17, 7, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        // Dark face cavity
        ctx.fillStyle = "#1a0f30";
        ctx.beginPath();
        ctx.ellipse(0, -16, 4, 3.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Glowing green gamer headset
        ctx.strokeStyle = "#10b981";
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.arc(0, -17, 6.5, Math.PI, 0);
        ctx.stroke();
        ctx.fillStyle = "#10b981";
        ctx.beginPath();
        ctx.arc(-6.5, -17, 2, 0, Math.PI * 2);
        ctx.arc(6.5, -17, 2, 0, Math.PI * 2);
        ctx.fill();
      } else if (skinId === "duck_king") {
        // --- 4. DUCK KING (Royal Ducky in Crown) ---
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.ellipse(0, -7, 9, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        // Royal velvet red mantle cape on shoulders
        ctx.fillStyle = "#dc2626";
        ctx.beginPath();
        ctx.moveTo(-9, -8);
        ctx.quadraticCurveTo(0, -3, 9, -8);
        ctx.lineTo(6, -2);
        ctx.lineTo(-6, -2);
        ctx.closePath();
        ctx.fill();

        // Gold trim
        ctx.strokeStyle = "#fbbf24";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Duck Head
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(0, -16, 6, 0, Math.PI * 2);
        ctx.fill();

        // Orange Beak
        ctx.fillStyle = "#f97316";
        ctx.beginPath();
        ctx.ellipse(0, -19, 4, 2, 0, 0, Math.PI * 2);
        ctx.fill();

        // Golden Royal Crown with rubies
        ctx.fillStyle = "#f59e0b";
        ctx.beginPath();
        ctx.moveTo(-4, -20);
        ctx.lineTo(-5, -24);
        ctx.lineTo(-2, -22);
        ctx.lineTo(0, -26); // Center spire
        ctx.lineTo(2, -22);
        ctx.lineTo(5, -24);
        ctx.lineTo(4, -20);
        ctx.closePath();
        ctx.fill();

        // Tiny ruby on center spire
        ctx.fillStyle = "#ef4444";
        ctx.beginPath();
        ctx.arc(0, -26, 0.8, 0, Math.PI * 2);
        ctx.fill();
      } else if (skinId === "cyber_surfer") {
        // --- 5. CYBER SURFER 2077 (Neon Sci-fi Cyborg) ---
        ctx.fillStyle = "#1e293b";
        ctx.beginPath();
        ctx.roundRect(-8, -11, 16, 13, 4);
        ctx.fill();

        // Glowing neon cyan circuitry traces
        ctx.strokeStyle = "#06b6d4";
        ctx.lineWidth = 1.5;
        ctx.shadowColor = "#06b6d4";
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.moveTo(-5, -8);
        ctx.lineTo(-5, -4);
        ctx.moveTo(5, -8);
        ctx.lineTo(5, -4);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Cybernetic sleek helmet
        ctx.fillStyle = "#334155";
        ctx.beginPath();
        ctx.ellipse(0, -17, 6.5, 5.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Bright neon cyan glowing cyber visor
        ctx.fillStyle = "#22d3ee";
        ctx.shadowColor = "#22d3ee";
        ctx.shadowBlur = 5;
        ctx.beginPath();
        ctx.ellipse(0, -18, 5, 1.8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      } else if (skinId === "alien") {
        // --- 6. ALIEN POLL (Lime Green Extraterrestrial tourist) ---
        ctx.fillStyle = "#84cc16";
        ctx.beginPath();
        ctx.ellipse(0, -8, 7.5, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        // Retro red Hawaiian tourist shirt!
        ctx.fillStyle = "#ef4444";
        ctx.beginPath();
        ctx.roundRect(-6.5, -9, 13, 9, 2);
        ctx.fill();
        // Yellow hibiscus print details
        ctx.fillStyle = "#facc15";
        ctx.beginPath();
        ctx.arc(-3, -7, 1, 0, Math.PI * 2);
        ctx.arc(3, -5, 1, 0, Math.PI * 2);
        ctx.fill();

        // Bulbous alien head
        ctx.fillStyle = "#84cc16";
        ctx.beginPath();
        ctx.ellipse(0, -17, 8, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        // Huge glossy black bug eyes
        ctx.fillStyle = "#020617";
        ctx.beginPath();
        ctx.ellipse(-3.5, -18, 2.5, 4, Math.PI / 10, 0, Math.PI * 2);
        ctx.ellipse(3.5, -18, 2.5, 4, -Math.PI / 10, 0, Math.PI * 2);
        ctx.fill();
        // Sparkle in alien eyes
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(-2.5, -19, 0.6, 0, Math.PI * 2);
        ctx.arc(4.5, -19, 0.6, 0, Math.PI * 2);
        ctx.fill();
      } else if (skinId === "ninja") {
        // --- 7. SHADOW NINJA (Stealth Shinobi) ---
        ctx.fillStyle = "#1e1b4b"; // very dark blue-black
        ctx.beginPath();
        ctx.roundRect(-8, -11, 16, 14, 4);
        ctx.fill();

        // Crimson red flowing sash blowing behind
        ctx.fillStyle = "#ef4444";
        ctx.beginPath();
        ctx.moveTo(-3, -2);
        ctx.quadraticCurveTo(-8 + Math.sin(time * 0.08) * 3, 4, -5, 8);
        ctx.quadraticCurveTo(-11 + Math.sin(time * 0.08) * 3, 4, -1, -2);
        ctx.closePath();
        ctx.fill();

        // Head wrapped in full hood
        ctx.fillStyle = "#0f172a";
        ctx.beginPath();
        ctx.ellipse(0, -17, 6.5, 5.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Headband tie knot
        ctx.fillStyle = "#ef4444";
        ctx.beginPath();
        ctx.ellipse(-6, -18, 1.5, 2.5, Math.PI / 4, 0, Math.PI * 2);
        ctx.fill();

        // Glowing white slits representing focused ninja eyes
        ctx.fillStyle = "#ffffff";
        ctx.shadowColor = "#ffffff";
        ctx.shadowBlur = 4;
        ctx.fillRect(-3.5, -17.5, 2, 0.8);
        ctx.fillRect(1.5, -17.5, 2, 0.8);
        ctx.shadowBlur = 0;
      } else if (skinId === "gold_champ") {
        // --- 8. GOLD CHAMPION (Solid Gold Luxury Surfer) ---
        ctx.shadowColor = "#fbbf24";
        ctx.shadowBlur = 15;

        // High gloss shining gold body
        const goldBodyGrad = ctx.createRadialGradient(-3, -11, 2, 0, -8, 12);
        goldBodyGrad.addColorStop(0, "#fffbeb"); // highlight reflection
        goldBodyGrad.addColorStop(0.3, "#facc15"); // gold center
        goldBodyGrad.addColorStop(1, "#9a3412"); // deep gold copper shadow
        ctx.fillStyle = goldBodyGrad;

        ctx.beginPath();
        ctx.roundRect(-8, -11, 16, 14, 5);
        ctx.fill();

        // Golden head
        ctx.beginPath();
        ctx.arc(0, -17, 6.5, 0, Math.PI * 2);
        ctx.fill();

        // Gold star crown
        ctx.fillStyle = "#fbbf24";
        ctx.beginPath();
        ctx.moveTo(-4, -21);
        ctx.lineTo(-2, -24);
        ctx.lineTo(0, -21);
        ctx.lineTo(2, -24);
        ctx.lineTo(4, -21);
        ctx.closePath();
        ctx.fill();

        // Sparkly white diamond on his chest
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.moveTo(0, -8);
        ctx.lineTo(2, -6);
        ctx.lineTo(0, -4);
        ctx.lineTo(-2, -6);
        ctx.closePath();
        ctx.fill();

        ctx.shadowBlur = 0;
      } else {
        // Fallback default classy surfer
        ctx.fillStyle = characterColor;
        ctx.beginPath();
        ctx.arc(0, -10, 8, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();

      // Draw custom themed paddle
      ctx.save();
      let paddleShaftColor = "#5a3418"; // default wooden
      let paddleBladeColor = characterColor;
      let paddleGlowColor = "transparent";

      if (skinId === "cyber_surfer") {
        paddleShaftColor = "#475569";
        paddleBladeColor = "#22d3ee";
        paddleGlowColor = "#06b6d4";
      } else if (skinId === "ninja") {
        paddleShaftColor = "#1e1b4b";
        paddleBladeColor = "#ef4444";
      } else if (skinId === "mod") {
        paddleShaftColor = "#432874";
        paddleBladeColor = "#10b981";
        paddleGlowColor = "#10b981";
      } else if (skinId === "gold_champ") {
        paddleShaftColor = "#d97706";
        paddleBladeColor = "#fbbf24";
        paddleGlowColor = "#fbbf24";
      } else if (skinId === "alien") {
        paddleShaftColor = "#334155";
        paddleBladeColor = "#a3e635";
        paddleGlowColor = "#84cc16";
      }

      if (paddleGlowColor !== "transparent") {
        ctx.shadowColor = paddleGlowColor;
        ctx.shadowBlur = 8;
      }

      // Draw paddle shaft
      ctx.strokeStyle = paddleShaftColor;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(0, -5);
      ctx.lineTo(24 * paddleSide, 15);
      ctx.stroke();

      // Draw paddle blade
      ctx.fillStyle = paddleBladeColor;
      ctx.beginPath();
      ctx.ellipse(24 * paddleSide, 15, 4.5, 9, Math.PI / 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.restore();

      // Request next frame
      animationId = requestAnimationFrame(loop);
    };

    animationId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [isPlaying, currentSkin, boardColor, characterColor]);

  return (
    <div className="relative flex flex-col lg:flex-row items-stretch justify-center gap-6 lg:gap-8 max-w-[1100px] w-full mx-auto" id="sup_game_wrapper_outer">
      {/* Lobby link side panel on desktop */}
      {gameMode === "multiplayer" && !isPlaying && (
        <div className="hidden lg:flex flex-col bg-[#0e0a1b]/95 border border-[#281b4e] rounded-2xl p-5 w-[260px] shrink-0 font-mono text-left space-y-4 shadow-2xl animate-fade-in" id="desktop_lobby_invite_panel">
          <div className="flex items-center gap-2 text-[#10b981] border-b border-[#21173d] pb-2">
            <Users className="w-5 h-5" />
            <h5 className="font-extrabold text-xs uppercase tracking-wider">Пригласить друзей</h5>
          </div>
          <p className="text-[10px] text-gray-400 leading-relaxed">
            Скопируйте ссылку и отправьте её друзьям. Они сразу зайдут в ваше лобби заплыва!
          </p>
          <div className="bg-[#05030a] border border-[#23153c] rounded-lg p-2.5 relative group">
            <span className="text-[10px] text-purple-300 break-all select-all font-bold">
              {window.location.origin + window.location.pathname}
            </span>
          </div>
          <button
            onClick={copyLobbyLink}
            className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_2px_8px_rgba(16,185,129,0.3)] active:scale-95"
            id="desktop_copy_btn"
          >
            {isCopied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-200" />
                <span>Скопировано! 📋</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Скопировать ссылку</span>
              </>
            )}
          </button>
          <div className="pt-2 border-t border-[#1e1338] text-center">
            <span className="text-[9px] text-amber-400 font-bold uppercase tracking-wider animate-pulse">
              🌊 Ждем подключения...
            </span>
          </div>
        </div>
      )}

      {/* Live race leaderboard sidebar on desktop */}
      {gameMode === "multiplayer" && isPlaying && (
        <div className="hidden lg:flex flex-col bg-[#0e0a1b]/95 border border-[#2e1d52]/80 rounded-2xl p-5 w-[260px] shrink-0 font-mono text-left space-y-4 shadow-2xl animate-fade-in" id="desktop_live_leaderboard_panel">
          <div className="flex items-center gap-2 text-amber-400 border-b border-[#21173d] pb-2">
            <Award className="w-5 h-5 text-amber-400" />
            <h5 className="font-extrabold text-xs uppercase tracking-wider">Лидеры заплыва</h5>
          </div>
          <div className="space-y-2.5 mt-1.5">
            {(() => {
              const sorted: any[] = [
                { name: playerName, meters: score, skinEmoji: currentSkin.emoji, id: myId || "me", isDead: false },
                ...Array.from(otherPlayersRef.current.values())
              ].sort((a: any, b: any) => b.meters - a.meters);

              return sorted.map((p: any, idx: number) => (
                <div key={p.id} className="flex items-center justify-between gap-2 text-xs border-b border-[#1b1235] pb-2 last:border-0">
                  <span className="flex items-center gap-2 text-gray-300 truncate max-w-[160px]">
                    <span className="font-extrabold text-gray-500 w-4">{idx + 1}</span>
                    <span className="text-sm select-none">{p.skinEmoji}</span>
                    <span className={p.id === myId || p.id === "me" ? "text-[#bf94ff] font-extrabold" : "text-white truncate"}>
                      {p.name}
                    </span>
                  </span>
                  <span className={`font-black ${p.isDead ? "text-red-500 line-through text-[10px]" : "text-emerald-400"}`}>
                    {p.isDead ? "выбыл" : `${Math.floor(p.meters)}м`}
                  </span>
                </div>
              ));
            })()}
          </div>
        </div>
      )}

      {/* Main Game Container */}
      <div className="relative flex flex-col bg-[#07050d] border border-[#21173c] rounded-2xl overflow-hidden max-w-[640px] w-full shadow-2xl" id="sup_game_container" ref={containerRef}>
      {/* Top Banner Jumpscare Notification */}
      <AnimatePresence>
        {activeScare && (
          <motion.div
            initial={{ opacity: 0, y: -100, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -100, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="absolute top-16 left-3 right-3 z-50 bg-[#2d0f1b]/95 border-2 border-red-500 rounded-2xl p-4 shadow-[0_12px_40px_rgba(239,68,68,0.8)] flex items-center gap-3.5 overflow-hidden"
            id="jumpscare_banner"
          >
            {/* Pulsing red warning light underlay */}
            <div className="absolute inset-0 bg-red-600/10 animate-pulse pointer-events-none" />
            
            {/* Animated emoji symbol */}
            <div className="text-4xl select-none z-10 shrink-0 animate-bounce">
              {activeScare.type === "monkas" && "😰🐸"}
              {activeScare.type === "wutface" && "😱👹"}
              {activeScare.type === "capybara_god" && "🦦👑"}
              {activeScare.type === "ban_hammer" && "🔨💀"}
              {activeScare.type === "screamer_pepe" && "🐸🔊"}
            </div>
            
            {/* Text notifications */}
            <div className="text-left z-10 min-w-0 flex-1">
              <span className="inline-flex items-center gap-1 text-[10px] text-red-400 font-mono font-extrabold uppercase tracking-widest animate-pulse">
                🚨 РЕЧНОЙ ПРИЗРАК:
              </span>
              <h4 className="text-white font-sans font-black text-xs md:text-sm leading-tight mt-0.5">
                {activeScare.text}
              </h4>
              <p className="text-[9px] text-gray-400 font-mono mt-0.5">
                [ Это речной прикол! Держите равновесие! 🏄‍♂️ ]
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Panel */}
      <div className="p-4 bg-[#0d0a15] border-b border-[#21173c] flex items-center justify-between" id="game_header">
        <div className="flex items-center gap-2" id="header_title_wrapper">
          <Waves className="w-5 h-5 text-[#915eff]" />
          <h3 className="font-extrabold text-white text-sm tracking-wide font-sans uppercase">
            SUP_game
          </h3>
        </div>
        
        <div className="flex items-center gap-2" id="header_utility_buttons">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-1.5 rounded bg-[#1b152b] border border-[#30234a] text-gray-300 hover:text-white hover:bg-[#281f3d] transition-all cursor-pointer"
            title={isMuted ? "Включить звук" : "Выключить звук"}
            id="mute_toggle_btn"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-[#10b981]" />}
          </button>

          {!isPlaying && (
            <>
              <button
                onClick={() => {
                  setShowLeaderboard(true);
                  setShowShop(false);
                }}
                className="px-2.5 py-1.5 rounded-lg bg-[#181d3a] border border-[#2c3976] text-[#7ea1ff] hover:bg-[#202753] hover:text-[#a2bcff] transition-all text-xs font-bold font-mono flex items-center gap-1 cursor-pointer"
                id="leaderboard_toggle_btn"
              >
                <Award className="w-3.5 h-3.5" />
                <span>Рекорды</span>
              </button>

              <button
                onClick={() => {
                  setShowShop(!showShop);
                  setShowLeaderboard(false);
                }}
                className="px-2.5 py-1.5 rounded-lg bg-[#271b3e] border border-[#482c76] text-amber-400 hover:bg-[#342453] hover:text-amber-300 transition-all text-xs font-bold font-mono flex items-center gap-1 cursor-pointer"
                id="shop_toggle_btn"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Магазин</span>
              </button>
            </>
          )}

          {onClose && (
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-white rounded hover:bg-gray-800 transition-all cursor-pointer"
              id="close_game_btn"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Canvas / Screen Content */}
      <div className="relative" id="arcade_screen">
        {/* Shield Pick Up Animation Overlay */}
        <AnimatePresence>
          {shieldAnimActive && (
            <motion.div
              initial={{ opacity: 0, scale: 0.3, y: 150 }}
              animate={{ 
                opacity: [0, 1, 1, 1, 0],
                scale: [0.3, 1.2, 1, 1.1, 0.5],
                y: [150, -10, 0, 5, -80]
              }}
              exit={{ opacity: 0, scale: 0.2 }}
              transition={{ 
                duration: 1.8, 
                times: [0, 0.25, 0.45, 0.85, 1],
                ease: "easeInOut"
              }}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-40 pointer-events-none flex flex-col items-center justify-center w-full max-w-[280px]"
              id="shield_pickup_animation_popup"
            >
              {/* Outer glowing ripple effects */}
              <div className="absolute w-40 h-40 rounded-full bg-emerald-500/20 animate-ping" />
              <div className="absolute w-28 h-28 rounded-full border-2 border-emerald-500/40 animate-pulse" />
              
              {/* Shield Icon Badge container */}
              <div className="relative bg-[#0d0a15]/95 border-2 border-emerald-400 p-5 rounded-2xl shadow-[0_0_30px_rgba(16,185,129,0.8)] flex flex-col items-center gap-2">
                <div className="w-16 h-16 rounded-full bg-emerald-950/90 border border-emerald-500/50 flex items-center justify-center relative overflow-hidden">
                  {/* Glowing background inside shield */}
                  <div className="absolute inset-0 bg-emerald-500/20 animate-pulse" />
                  <Shield className="w-10 h-10 text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.8)] fill-emerald-500/30 animate-bounce" />
                </div>
                
                {/* Text inside badge */}
                <span className="text-[11px] font-mono text-emerald-400 font-extrabold uppercase tracking-widest text-center">
                  🛡️ ЩИТ АКТИВИРОВАН 🛡️
                </span>
                <span className="text-[9px] font-sans text-gray-300 font-semibold text-center leading-snug">
                  Вы защищены от одного столкновения с препятствием!
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Game Stats Bar */}
        <div className="absolute top-2 left-3 right-3 flex items-center justify-between z-10 text-white pointer-events-none" id="game_score_overlay">
          {/* Health */}
          <div className="flex items-center gap-1 bg-black/50 px-2 py-1 rounded-lg backdrop-blur-sm" id="lives_bar">
            {[...Array(3)].map((_, i) => (
              <Heart 
                key={i} 
                className={`w-4 h-4 ${i < lives ? "text-red-500 fill-red-500" : "text-gray-600"}`} 
              />
            ))}
          </div>

          {/* Shields or Speed Indicators */}
          <div className="flex gap-1.5" id="boosts_bar">
            {shieldCount > 0 && (
              <span className="flex items-center gap-1 bg-emerald-950/80 border border-emerald-500/30 px-2.5 py-0.5 rounded text-[9px] text-emerald-400 font-bold uppercase font-mono">
                <Shield className="w-3 h-3 fill-emerald-500/30" /> Щит {shieldCount > 1 && `x${shieldCount}`}
              </span>
            )}
            {stateRef.current.isSpeedBoosted && (
              <span className="flex items-center gap-0.5 bg-orange-950/80 border border-orange-500/30 px-2 py-0.5 rounded text-[9px] text-orange-400 font-bold uppercase font-mono animate-pulse">
                <Flame className="w-3 h-3 text-orange-400 fill-orange-400" /> Nitro
              </span>
            )}
          </div>

          {/* Meters & Coin Wallet */}
          <div className="flex items-center gap-3 bg-black/50 px-3 py-1 rounded-lg backdrop-blur-sm font-mono text-xs" id="coins_score_panel">
            <span className="text-[#a3a0b3]">
              Проплыл: <strong className="text-white">{score}м</strong>
            </span>
            <span className="text-amber-400 flex items-center gap-0.5">
              <Coins className="w-3.5 h-3.5 fill-amber-400/20" /> {coins}
            </span>
          </div>
        </div>

        {/* LEADERBOARD SCREEN MODAL */}
        <AnimatePresence>
          {showLeaderboard && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute inset-0 bg-[#07050d]/95 z-30 p-4 overflow-y-auto flex flex-col justify-between"
              id="leaderboard_screen_overlay"
            >
              <div>
                <div className="flex items-center justify-between border-b border-[#25173e] pb-2 mb-3" id="leaderboard_header">
                  <h4 className="font-extrabold text-[#7ea1ff] flex items-center gap-1.5 text-sm uppercase tracking-wider font-sans">
                    <Award className="w-4 h-4 text-[#7ea1ff]" /> Таблица лидеров
                  </h4>
                  <button
                    onClick={() => setShowLeaderboard(false)}
                    className="p-1 bg-[#1a1230] border border-[#35205e] rounded hover:text-white text-gray-300 transition-all cursor-pointer"
                    id="close_leaderboard_btn"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-2 mt-4" id="leaderboard_list">
                  {leaderboard.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 font-mono text-xs" id="leaderboard_empty">
                      <p>Рекордов пока нет! 🏄‍♂️</p>
                      <p className="mt-2 text-[10px] text-gray-600">Начните заплыв и преодолейте первую дистанцию, чтобы войти в историю!</p>
                    </div>
                  ) : (
                    leaderboard.map((entry, index) => {
                      const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "🎖️";
                      
                      return (
                        <div 
                          key={index}
                          className="flex items-center justify-between p-3 bg-[#110a22] border border-[#23163e] rounded-xl hover:border-[#3c2466] transition-all"
                          id={`leaderboard_item_${index}`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="text-lg select-none w-6 text-center">{medal}</span>
                            <span className="text-xl select-none" role="img" aria-label={entry.skinName}>{entry.emoji}</span>
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-bold text-white font-sans">{entry.playerName || "Сёрфер"}</span>
                                <span className="text-[10px] text-gray-400 font-sans font-medium">({entry.skinName})</span>
                              </div>
                              <p className="text-[9px] text-gray-500 font-mono">{entry.date}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-black font-mono text-amber-400">{entry.score}м</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {leaderboard.length > 0 && (
                <div className="mt-6 border-t border-[#1d1333] pt-4 flex justify-center" id="leaderboard_footer">
                  <button
                    onClick={() => {
                      localStorage.removeItem("sup_leaderboard_list");
                      setLeaderboard([]);
                      audio.playHit();
                    }}
                    className="px-3 py-1.5 rounded bg-red-950/40 hover:bg-red-900/40 text-red-400 border border-red-900/30 text-[10px] font-mono uppercase tracking-wider font-bold transition-all cursor-pointer"
                    id="clear_leaderboard_btn"
                  >
                    Очистить таблицу
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* RULES SCREEN MODAL */}
        <AnimatePresence>
          {showRules && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute inset-0 bg-[#0d091a]/97 z-45 p-4 overflow-y-auto flex flex-col justify-between"
              id="rules_screen_overlay"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-[#25173e] pb-2 mb-1" id="rules_header">
                  <h4 className="font-extrabold text-[#915eff] flex items-center gap-1.5 text-xs uppercase tracking-wider font-sans">
                    <BookOpen className="w-4 h-4" /> Школа Сёрфинга: Правила
                  </h4>
                  <button
                    onClick={() => setShowRules(false)}
                    className="p-1 bg-[#1a1230] border border-[#35205e] rounded hover:text-white text-gray-300 transition-all cursor-pointer"
                    id="close_rules_btn"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-4 text-sm leading-relaxed text-gray-300" id="rules_body">
                  {/* Levels and Milestones */}
                  <div className="bg-[#1b1236]/90 border border-[#3b2774]/50 rounded-xl p-3.5 space-y-2">
                    <p className="font-bold text-amber-400 flex items-center gap-1.5 text-xs md:text-sm uppercase tracking-wide">
                      <Award className="w-4 h-4 text-amber-400" /> СИСТЕМА УРОВНЕЙ И НАГРАДЫ:
                    </p>
                    <p className="text-gray-300 text-xs leading-tight">
                      Продвигайтесь по реке, чтобы открывать новые этапы! Каждый уровень увеличивает скорость течения и приносит жирные бонусы звёздочек:
                    </p>
                    <ul className="space-y-1.5 text-xs text-gray-200 font-mono">
                      <li>🥇 <strong className="text-amber-400">Ур. 2 (100м)</strong>: «Штормовой Прилив» <span className="text-emerald-400 font-bold">+25 ★</span></li>
                      <li>💎 <strong className="text-amber-400">Ур. 3 (250м)</strong>: «Кибер-Течение» <span className="text-emerald-400 font-bold">+50 ★</span></li>
                      <li>👑 <strong className="text-amber-400">Ур. 4 (500м)</strong>: «Омут Модераторов» <span className="text-emerald-400 font-bold">+100 ★</span></li>
                      <li>🌀 <strong className="text-amber-400">Ур. 5 (800м)</strong>: «Легенда Реки» <span className="text-emerald-400 font-bold">+200 ★</span></li>
                    </ul>
                  </div>

                  {/* Multiplayer Rules */}
                  <div className="bg-[#10142b]/90 border border-[#1f2858]/50 rounded-xl p-3.5 space-y-1.5">
                    <p className="font-bold text-[#7ea1ff] flex items-center gap-1.5 text-xs md:text-sm uppercase tracking-wide">
                      <Play className="w-4 h-4 text-[#7ea1ff]" /> КОМАНДНАЯ ИГРА (Race mode):
                    </p>
                    <p className="text-gray-300 text-xs">
                      Соревнуйтесь с другими сёрферами в реальном времени! Правило простое: <strong>кто последний останется на воде (дольше всех выживет) — тот и выиграл заплыв!</strong> Снизу выводится живая таблица лидеров заплыва.
                    </p>
                  </div>

                  {/* Mechanics: what to pick up */}
                  <div className="bg-[#101b15]/60 border border-emerald-900/30 rounded-xl p-3.5 space-y-2">
                    <p className="font-bold text-emerald-400 flex items-center gap-1.5 text-xs md:text-sm uppercase tracking-wide">
                      <CheckCircle className="w-4 h-4" /> Что нужно ПОДБИРАТЬ (Бонусы):
                    </p>
                    <ul className="space-y-1.5 text-xs text-gray-300 list-disc list-inside">
                      <li><strong className="text-emerald-300">★ (SupPoints)</strong>: Добавляют +1 на баланс.</li>
                      <li><strong className="text-emerald-300">🛡️ Зелёный щит (Shield)</strong>: Спасает от ОДНОГО удара препятствием.</li>
                      <li><strong className="text-emerald-300">🥤 Синяя вода (Boost)</strong>: На 5 секунд включает Nitro-ускорение (с бессмертием!).</li>
                    </ul>
                  </div>

                  {/* Mechanics: what to avoid */}
                  <div className="bg-[#1c0e12]/60 border border-red-900/30 rounded-xl p-3.5 space-y-2">
                    <p className="font-bold text-red-400 flex items-center gap-1.5 text-xs md:text-sm uppercase tracking-wide">
                      <XCircle className="w-4 h-4" /> Чего нужно ИЗБЕГАТЬ (Опасность):
                    </p>
                    <ul className="space-y-1.5 text-xs text-gray-300 list-disc list-inside">
                      <li><strong className="text-red-300">🪵 Брёвна и 🦆 Уточки</strong>: Отнимают 1 жизнь. Если жизней 0 — заплыв завершён!</li>
                      <li><strong className="text-red-300">🔨 Бан-молот (Ban)</strong>: Разворачивает управление (Реверс клавиш) на 3.5 сек!</li>
                      <li><strong className="text-red-300">🚨 Водные пугалки (Jumpscares)</strong>: Резко вылетают на экран, сбивая с толку!</li>
                      <li><strong className="text-red-300">🎣 Рыбаки в кустах</strong>: Случайно выглядывают из зарослей по краям и громко смеются над вами!</li>
                    </ul>
                  </div>

                  {/* How to shop */}
                  <div className="bg-[#120a1c] border border-[#291740] rounded-xl p-3 space-y-1">
                    <p className="font-bold text-[#bf94ff] flex items-center gap-1 text-[11px] uppercase tracking-wide">
                      <ShoppingBag className="w-3.5 h-3.5" /> Как покупать скины?
                    </p>
                    <p className="text-gray-400 text-[10px]">
                      Копите SupPoints, нажимайте кнопку <strong>«Магазин»</strong> в меню и разблокируйте уникальных персонажей, например, 🦦 Мистера Капибару, у каждого из которых свой стильный эмодзи и дизайн доски!
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-[#1d1333]">
                <button
                  onClick={() => setShowRules(false)}
                  className="w-full py-2.5 bg-[#915eff] hover:bg-[#7b46f0] text-white font-extrabold text-xs rounded-xl shadow-[0_4px_12px_rgba(145,94,255,0.3)] transition-all flex items-center justify-center gap-1 cursor-pointer"
                  id="rules_confirm_btn"
                >
                  <span>Всё понятно, на воду!</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* SHOP SCREEN MODAL */}
        <AnimatePresence>
          {showShop && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute inset-0 bg-[#0d091a]/95 z-30 p-4 overflow-y-auto"
              id="shop_screen_overlay"
            >
              <div className="flex items-center justify-between border-b border-[#25173e] pb-2 mb-3" id="shop_header">
                <h4 className="font-extrabold text-[#f59e0b] flex items-center gap-1.5 text-sm uppercase tracking-wider font-sans">
                  <Sparkles className="w-4 h-4" /> Водный Бутик Сапов
                </h4>
                <button
                  onClick={() => setShowShop(false)}
                  className="p-1 bg-[#1a1230] border border-[#35205e] rounded hover:text-white text-gray-300 transition-all cursor-pointer"
                  id="close_shop_btn"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="mb-4 bg-[#140f25] border border-[#23183b] rounded-xl p-3 flex items-center justify-between" id="shop_wallet_status">
                <span className="text-xs text-[#a49bb8] font-semibold">Ваш баланс:</span>
                <span className="text-base font-mono font-bold text-amber-400 flex items-center gap-1">
                  <Coins className="w-4 h-4 fill-amber-400/20" /> {coins} SubPoints
                </span>
              </div>

              <div className="space-y-2.5" id="skins_list">
                {SKINS.map((skin) => {
                  const isUnlocked = unlockedSkinIds.includes(skin.id);
                  const isEquipped = currentSkin.id === skin.id;

                  return (
                    <div 
                      key={skin.id}
                      className={`p-3 rounded-xl border transition-all flex items-center justify-between ${
                        isEquipped 
                          ? "bg-[#211739] border-[#915eff]" 
                          : "bg-[#0d0917] border-[#201535] hover:border-[#38225c]"
                      }`}
                      id={`skin_item_${skin.id}`}
                    >
                      <div className="flex items-center gap-3" id={`skin_info_${skin.id}`}>
                        <span className="text-3xl select-none" role="img" aria-label={skin.name}>{skin.emoji}</span>
                        <div className="space-y-0.5">
                          <p className="text-xs font-bold text-white flex items-center gap-1.5">
                            <span>{skin.name}</span>
                            {isEquipped && (
                              <span className="text-[9px] bg-[#915eff]/30 border border-[#915eff] text-[#bf94ff] px-1.5 py-0.2 rounded font-mono font-bold uppercase">Активен</span>
                            )}
                          </p>
                          <p className="text-[10px] text-gray-400 leading-tight">{skin.description}</p>
                        </div>
                      </div>

                      <button
                        onClick={() => buySkin(skin)}
                        disabled={!isUnlocked && coins < skin.price}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          isEquipped
                            ? "bg-gray-800 text-gray-400 cursor-default"
                            : isUnlocked
                            ? "bg-[#251d3a] hover:bg-[#342751] text-[#bf94ff] border border-[#4d3283]"
                            : "bg-amber-500 hover:bg-amber-400 text-black shadow-md"
                        }`}
                        id={`skin_action_btn_${skin.id}`}
                      >
                        {isUnlocked ? "Выбрать" : `${skin.price} ★`}
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="mt-5 p-3 bg-[#110a20] border border-[#251740] rounded-xl text-center" id="shop_tip_box">
                <p className="text-[10px] text-gray-400 leading-relaxed">
                  ★ Собирайте жёлтые звёздочки во время заплыва на SUP-е по Twitch реке, чтобы накопить валюту на покупку Капибары или Админа!
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* GAME SCREEN CANVAS */}
        <div className="flex items-center justify-center bg-[#07050d] relative" id="canvas_viewport">
          <canvas 
            ref={canvasRef}
            className="block max-w-full h-[600px]"
            id="game_board_canvas"
          />

          {/* Level Up Celebration Popup */}
          <AnimatePresence>
            {isPlaying && levelUpPopup !== null && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 50 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: -50 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="absolute inset-0 flex items-center justify-center bg-black/75 backdrop-blur-md z-40 p-4 select-none"
                id="level_up_celebration_overlay"
              >
                <div className="relative bg-[#0d071a]/95 border-2 border-amber-400 p-6 rounded-3xl shadow-[0_0_50px_rgba(245,158,11,0.5)] flex flex-col items-center gap-4 max-w-[280px] text-center overflow-hidden">
                  {/* Glowing background rays */}
                  <div className="absolute inset-0 bg-gradient-to-b from-amber-500/10 to-purple-500/10" />
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-amber-400 to-purple-500 animate-pulse" />
                  
                  {/* Big level badge icon representation (The 'картинка'!) */}
                  <div className="relative w-24 h-24 rounded-full bg-[#1b1035] border-4 border-amber-400 flex items-center justify-center shadow-[0_0_25px_rgba(245,158,11,0.6)] animate-bounce mt-2">
                    <div className="absolute inset-1 rounded-full border-2 border-dashed border-amber-400/40 animate-spin" style={{ animationDuration: "12s" }} />
                    <span className="text-5xl select-none" role="img" aria-label="Level Medal">
                      {levelUpPopup === 1 && "🥈"}
                      {levelUpPopup === 2 && "💎"}
                      {levelUpPopup === 3 && "👑"}
                      {levelUpPopup === 4 && "🌀"}
                    </span>
                    <span className="absolute -bottom-2 bg-amber-500 text-black text-[10px] font-black px-3 py-0.5 rounded-full uppercase tracking-wider shadow">
                      УРОВЕНЬ {levelUpPopup + 1}
                    </span>
                  </div>

                  {/* Level details text */}
                  <div className="space-y-1 z-10 mt-2">
                    <span className="text-[10px] text-[#bf94ff] font-mono font-extrabold uppercase tracking-widest block animate-pulse">
                      🚀 УРОВЕНЬ ПОВЫШЕН!
                    </span>
                    <h4 className="text-white font-sans font-black text-sm tracking-tight leading-tight uppercase">
                      {levelUpPopup === 1 && "Штормовой Прилив"}
                      {levelUpPopup === 2 && "Кибер-Течение"}
                      {levelUpPopup === 3 && "Омут Модераторов"}
                      {levelUpPopup === 4 && "Легенда Реки"}
                    </h4>
                    <p className="text-[9px] text-gray-300 font-semibold leading-relaxed mt-1">
                      {levelUpPopup === 1 && "Пройдено 100 метров! Течение реки ускоряется, будьте начеку!"}
                      {levelUpPopup === 2 && "Пройдено 250 метров! Плотность препятствий увеличена!"}
                      {levelUpPopup === 3 && "Пройдено 500 метров! Порог реакции достигает пика!"}
                      {levelUpPopup === 4 && "Пройдено 800 метров! Вы стали истинной легендой реки!"}
                    </p>
                  </div>

                  {/* Coins reward badge */}
                  <div className="z-10 bg-amber-950/80 border border-amber-500/30 rounded-xl px-4 py-2 w-full flex items-center justify-between gap-1 shadow-inner">
                    <span className="text-[9px] text-amber-300 font-bold uppercase tracking-wider font-sans">Бонус за заплыв:</span>
                    <span className="text-sm font-black font-mono text-amber-400 flex items-center gap-1">
                      ★ +{levelUpPopup === 1 ? 25 : levelUpPopup === 2 ? 50 : levelUpPopup === 3 ? 100 : 200}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {isPlaying && isGlitchedReact && (
            <div className="absolute top-16 left-1/2 transform -translate-x-1/2 bg-red-600/90 border border-red-500 text-white font-mono font-black text-[11px] md:text-xs py-1.5 px-3 rounded-full shadow-[0_0_15px_rgba(239,68,68,0.7)] animate-bounce flex items-center gap-1.5 z-15 select-none pointer-events-none">
              <AlertTriangle className="w-4 h-4 text-white animate-pulse" />
              <span>⚠️ РЕВЕРС УПРАВЛЕНИЯ! (ЭФФЕКТ УТОЧКИ) 🦆</span>
            </div>
          )}

          {/* Active Weather Event Banner */}
          {isPlaying && activeWeatherEvent && (
            <div className="absolute top-16 left-1/2 transform -translate-x-1/2 bg-[#081f2d]/95 border-2 border-cyan-400 text-cyan-200 font-mono font-black text-[10px] md:text-xs py-1.5 px-3.5 rounded-xl shadow-[0_0_20px_rgba(34,211,238,0.45)] animate-pulse flex flex-col items-center gap-0.5 z-15 select-none pointer-events-none text-center">
              <span className="text-[9px] text-cyan-400 tracking-widest uppercase font-bold">⚠️ Аномалия реки:</span>
              <span className="uppercase text-[11px]">
                {activeWeatherEvent === "beaver_frenzy" && "💥 НАШЕСТВИЕ БОБРОВ! Лавина брёвен!"}
                {activeWeatherEvent === "thunderstorm" && "⛈️ ГРОЗА! Штормовой ветер!"}
                {activeWeatherEvent === "whirlpool" && "🌀 ВОДОВОРОТ! Тяга в центр реки!"}
              </span>
              <span className="text-[8px] opacity-75 font-semibold">Осталось: {eventTimeState} сек</span>
            </div>
          )}

          {/* Floating RPG Active Skills HUD Panel */}
          {isPlaying && (
            <div className="absolute bottom-5 left-1/2 transform -translate-x-1/2 flex items-center gap-3.5 z-15 bg-[#090514]/80 border border-[#2b174a]/65 px-4 py-2.5 rounded-2xl backdrop-blur-md shadow-2xl select-none" id="rpg_active_skills_hud">
              {/* JUMP SKILL BUTTON */}
              <button
                onClick={triggerJump}
                type="button"
                className="relative flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-[#1d1136] hover:bg-[#2e1c54] border border-[#4d2a8a] active:scale-95 transition-all text-white cursor-pointer shadow-md group"
                id="hud_btn_jump"
              >
                <span className="text-lg">🦘</span>
                <span className="text-[8px] font-mono font-bold text-purple-300">Space</span>
                <span className="absolute -top-1.5 -right-1.5 bg-[#4c1d95] text-[7px] text-white font-extrabold px-1 rounded border border-[#6d28d9]">Прыжок</span>
              </button>

              {/* DASH SKILL BUTTON */}
              <button
                onClick={triggerDash}
                disabled={dashCd > 0}
                type="button"
                className={`relative flex flex-col items-center justify-center w-12 h-12 rounded-xl border transition-all text-white cursor-pointer shadow-md group ${
                  dashCd > 0
                    ? "bg-[#11081f] border-red-950/60 opacity-60 cursor-not-allowed"
                    : "bg-[#1d1136] hover:bg-[#2e1c54] border-[#4d2a8a] active:scale-95"
                }`}
                id="hud_btn_dash"
              >
                {dashCd > 0 ? (
                  <span className="text-xs font-black font-mono text-red-400">{dashCd}s</span>
                ) : (
                  <span className="text-lg">⚡</span>
                )}
                <span className="text-[8px] font-mono font-bold text-purple-300">Key Q</span>
                <span className="absolute -top-1.5 -right-1.5 bg-[#9d174d] text-[7px] text-white font-extrabold px-1 rounded border border-[#be185d]">Рывок</span>
              </button>

              {/* OAR SHOCKWAVE SKILL BUTTON */}
              <button
                onClick={triggerStrike}
                disabled={strikeCd > 0}
                type="button"
                className={`relative flex flex-col items-center justify-center w-12 h-12 rounded-xl border transition-all text-white cursor-pointer shadow-md group ${
                  strikeCd > 0
                    ? "bg-[#11081f] border-red-950/60 opacity-60 cursor-not-allowed"
                    : "bg-[#1d1136] hover:bg-[#2e1c54] border-[#4d2a8a] active:scale-95"
                }`}
                id="hud_btn_strike"
              >
                {strikeCd > 0 ? (
                  <span className="text-xs font-black font-mono text-red-400">{strikeCd}s</span>
                ) : (
                  <span className="text-lg">🌀</span>
                )}
                <span className="text-[8px] font-mono font-bold text-purple-300">Key E</span>
                <span className="absolute -top-1.5 -right-1.5 bg-[#0369a1] text-[7px] text-white font-extrabold px-1 rounded border border-[#0369a1]">Волна</span>
              </button>
            </div>
          )}

          {/* START/GAMEOVER INTERACTIVE SCREEN OVERLAY */}
          {!isPlaying && (
            <div className="absolute inset-0 bg-black/85 backdrop-blur-sm overflow-y-auto p-4 md:p-6 text-center z-20 animate-fade-in scrollbar-thin" id="arcade_intro_screen">
              <div className="min-h-full flex flex-col items-center justify-center w-full py-2" id="arcade_intro_content_wrapper">
              {/* Synchronized Multiplayer Countdown Overlay */}
              {wsCountdown !== null ? (
                <div className="space-y-4 font-mono select-none" id="ws_countdown_panel">
                  <motion.div
                    key={wsCountdown}
                    initial={{ scale: 2.2, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.6, opacity: 0 }}
                    transition={{ duration: 0.4 }}
                    className="text-8xl font-black text-amber-400 drop-shadow-[0_0_25px_rgba(245,158,11,0.6)]"
                  >
                    {wsCountdown}
                  </motion.div>
                  <p className="text-xs font-black text-[#bf94ff] uppercase tracking-widest animate-pulse">
                    ПРИГОТОВИТЬСЯ К СТАРТУ! 🏄‍♂️
                  </p>
                </div>
              ) : score > 0 ? (
                // Game Over State
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-4 w-full max-w-sm"
                  id="game_over_panel"
                >
                  <div className="inline-flex p-2.5 bg-red-950/40 border border-red-500/20 rounded-full text-red-400 mb-1 animate-pulse">
                    <Skull className="w-9 h-9" />
                  </div>
                  
                  <div className="space-y-1">
                    <h4 className="text-red-500 font-extrabold text-xl tracking-wide uppercase font-mono">
                      Упал с сап-борда!
                    </h4>
                    <p className="text-gray-400 text-[11px]">
                      {gameMode === "multiplayer" 
                        ? "Заплыв завершён! Посмотрите ваши результаты с друзьями."
                        : "Логические приколы и монстры утащили вас под воду."}
                    </p>
                  </div>

                  <div className="bg-[#140e24] border border-[#2c1d4d] rounded-xl p-3 max-w-xs mx-auto" id="game_over_stats">
                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div className="border-r border-[#2c1d4d] py-1">
                        <p className="text-[9px] text-gray-400 uppercase font-mono font-bold">Вы проплыли</p>
                        <p className="text-base font-black text-white font-mono">{score}м</p>
                      </div>
                      <div className="py-1">
                        <p className="text-[9px] text-amber-400 uppercase font-mono font-bold flex items-center justify-center gap-0.5">
                          <Award className="w-3 h-3 text-amber-400" /> Рекорд
                        </p>
                        <p className="text-base font-black text-amber-400 font-mono">{Math.max(highScore, score)}м</p>
                      </div>
                    </div>

                    {/* Live Leaderboard Display for Multiplayer Race */}
                    {gameMode === "multiplayer" && wsLobbyPlayers.length > 0 && (
                      <div className="mt-3 border-t border-[#2c1d4d] pt-2 text-left" id="game_over_multiplayer_ranks">
                        <p className="text-[10px] text-amber-500 font-bold font-mono uppercase tracking-wider mb-1.5 text-center">🏁 Результаты заплыва:</p>
                        <div className="space-y-1 text-xs">
                          {(() => {
                            const results: any[] = [
                              { name: playerName, meters: score, skinEmoji: currentSkin.emoji, id: myId || "me", isDead: true },
                              ...Array.from(otherPlayersRef.current.values())
                            ].sort((a: any, b: any) => b.meters - a.meters);

                            return results.map((p: any, idx: number) => (
                              <div key={p.id} className="flex items-center justify-between text-[11px] font-mono">
                                <span className="flex items-center gap-1 text-gray-300 truncate max-w-[150px]">
                                  <span className="text-amber-500 font-bold">{idx + 1}.</span>
                                  <span>{p.skinEmoji}</span>
                                  <span className={p.id === myId ? "text-[#bf94ff] font-bold" : "text-white"}>{p.name}</span>
                                </span>
                                <span className="text-emerald-400 font-bold">{Math.floor(p.meters)}м</span>
                              </div>
                            ));
                          })()}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* RPG Leveling progress on game over */}
                  <div className="bg-[#0e071c] border border-[#2b1b4d] rounded-xl p-3 max-w-xs mx-auto text-left space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-purple-300 font-extrabold uppercase font-mono tracking-widest">Профиль сёрфера</span>
                      <span className="text-[10px] bg-[#915eff]/20 border border-[#915eff]/50 text-[#bf94ff] px-2 py-0.5 rounded font-bold font-mono">
                        УРОВЕНЬ {playerLevel}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-gray-400 font-mono">
                        <span>Заработано опыта:</span>
                        <span className="text-emerald-400 font-bold">+{lastXpEarned} XP</span>
                      </div>

                      {/* XP Progress Bar */}
                      <div className="w-full bg-purple-950/40 border border-purple-900/50 h-3 rounded-full overflow-hidden relative shadow-inner">
                        <div 
                          className="bg-gradient-to-r from-[#915eff] to-[#bf94ff] h-full rounded-full transition-all duration-1000"
                          style={{ width: `${Math.min(100, (playerXp / (playerLevel * 250)) * 100)}%` }}
                        />
                        <span className="absolute inset-0 flex items-center justify-center text-[8px] font-black font-mono text-white tracking-widest uppercase">
                          {playerXp} / {playerLevel * 250} XP
                        </span>
                      </div>
                    </div>

                    {levelUpOccurred && (
                      <div className="bg-amber-950/50 border border-amber-500/30 rounded-lg p-2 text-center animate-pulse">
                        <p className="text-[10px] text-amber-400 font-extrabold uppercase font-mono tracking-wider flex items-center justify-center gap-1.5">
                          <span>🎉 УРОВЕНЬ ПОВЫШЕН! 🎉</span>
                        </p>
                        <p className="text-[9px] text-gray-300 font-medium">Вы открыли новые перки и награды в лобби!</p>
                      </div>
                    )}
                  </div>

                  {gameMode !== "multiplayer" && (
                    <button
                      onClick={() => setShowLeaderboard(true)}
                      className="text-[10px] text-[#7ea1ff] hover:underline font-mono uppercase tracking-wide cursor-pointer block mx-auto text-center"
                    >
                      🏆 Таблица Лидеров
                    </button>
                  )}

                  <div className="flex flex-col gap-2 pt-1 max-w-xs mx-auto" id="game_over_actions">
                    {gameMode === "multiplayer" ? (
                      <>
                        <button
                          onClick={() => {
                            if (wsRef.current?.readyState === WebSocket.OPEN) {
                              wsRef.current.send(JSON.stringify({ type: "return_to_lobby" }));
                            }
                          }}
                          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                          id="lobby_return_btn"
                        >
                          <RotateCcw className="w-4 h-4" />
                          <span>Вернуться в Лобби</span>
                        </button>
                        <button
                          onClick={() => {
                            disconnectWebSocket();
                            setGameMode("solo");
                            setScore(0);
                          }}
                          className="w-full py-2 bg-[#120a1c] border border-[#291740] text-gray-400 hover:text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                          id="leave_mp_btn"
                        >
                          <span>Выйти в соло режим</span>
                        </button>
                      </>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={resetGame}
                            className="px-5 py-2.5 bg-[#915eff] hover:bg-[#7b46f0] text-white font-bold text-sm rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer flex-1 justify-center"
                            id="retry_btn"
                          >
                            <RotateCcw className="w-4 h-4" />
                            <span>Плыть Снова</span>
                          </button>
                          <button
                            onClick={() => setShowShop(true)}
                            className="px-4 py-2.5 bg-[#1f1633] border border-[#3f276b] text-amber-400 hover:text-amber-300 font-bold text-sm rounded-xl transition-all flex items-center gap-1.5 cursor-pointer flex-1 justify-center"
                            id="game_over_shop_btn"
                          >
                            <ShoppingBag className="w-4 h-4" />
                            <span>В Магазин</span>
                          </button>
                        </div>
                        
                        <div className="flex items-center justify-center gap-2 pt-1">
                          <button
                            onClick={() => setShowRules(true)}
                            className="flex-1 py-2 bg-[#120a1c]/90 border border-[#291740] hover:border-[#bf94ff] text-gray-300 hover:text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1"
                            id="game_over_rules_btn"
                          >
                            <BookOpen className="w-3.5 h-3.5 text-[#bf94ff]" />
                            <span>Правила</span>
                          </button>
                          <button
                            onClick={() => {
                              setScore(0);
                            }}
                            className="flex-1 py-2 bg-[#120a1c]/90 border border-[#291740] hover:border-gray-500 text-gray-400 hover:text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center"
                            id="game_over_menu_btn"
                          >
                            <span>В главное меню</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              ) : (
                // Welcome / New Game State
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-4 w-full max-w-sm"
                  id="start_screen_panel"
                >
                  <div className="relative inline-block mb-1">
                    <span className="text-5xl select-none block animate-bounce" id="capy_bounce_emoji">🏄‍♂️</span>
                    <span className="absolute -bottom-1 -right-1 text-xl select-none">🦦</span>
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-white font-black text-base md:text-lg uppercase tracking-wider font-sans">
                      SUP-Борд Водный Чилл
                    </h4>
                    <p className="text-gray-300 text-xs md:text-sm leading-relaxed px-1">
                      Управляйте доской, собирайте звёзды и бонусы. Остерегайтесь брёвен, банов и <strong className="text-red-400">пугалок</strong>!
                    </p>
                  </div>

                  {/* Level milestones & goals card before start */}
                  <div className="bg-[#17102e]/80 border border-[#3c256b]/50 rounded-xl p-3 space-y-2.5 text-left" id="start_screen_goals">
                    <p className="font-extrabold text-amber-400 flex items-center gap-1 text-xs md:text-sm uppercase tracking-wide">
                      <Award className="w-4 h-4 text-amber-400 animate-pulse" /> 🎯 Цели и уровни заплыва:
                    </p>
                    <p className="text-gray-300 text-xs leading-normal">
                      Плывите вперёд, уворачиваясь от брёвен и зарабатывая бонусы на каждом этапе:
                    </p>
                    <div className="grid grid-cols-2 gap-2 mt-1.5 font-mono text-xs">
                      <div className="bg-[#0b0518]/90 border border-[#2b194d] rounded-lg p-1.5 flex flex-col justify-center">
                        <span className="text-amber-400 font-bold">🥈 Ур. 2 (100м)</span>
                        <span className="text-[10px] text-gray-400">Шторм (+25 ★)</span>
                      </div>
                      <div className="bg-[#0b0518]/90 border border-[#2b194d] rounded-lg p-1.5 flex flex-col justify-center">
                        <span className="text-[#7ea1ff] font-bold">💎 Ур. 3 (250м)</span>
                        <span className="text-[10px] text-gray-400">Кибер (+50 ★)</span>
                      </div>
                      <div className="bg-[#0b0518]/90 border border-[#2b194d] rounded-lg p-1.5 flex flex-col justify-center">
                        <span className="text-purple-400 font-bold">👑 Ур. 4 (500м)</span>
                        <span className="text-[10px] text-gray-400">Модеры (+100 ★)</span>
                      </div>
                      <div className="bg-[#0b0518]/90 border border-[#2b194d] rounded-lg p-1.5 flex flex-col justify-center">
                        <span className="text-emerald-400 font-bold">🌀 Ур. 5 (800м)</span>
                        <span className="text-[10px] text-gray-400">Легенда (+200 ★)</span>
                      </div>
                    </div>
                  </div>

                  {highScore > 0 && gameMode !== "multiplayer" && (
                    <div className="flex flex-col items-center gap-1.5">
                      <div className="bg-[#120a1c] border border-[#291740] rounded-xl py-1 px-3 inline-flex items-center gap-1.5 text-xs text-amber-400 font-bold font-mono">
                        <Award className="w-4 h-4 text-amber-400" />
                        <span>Ваш Рекорд: {highScore} метров</span>
                      </div>
                      <button
                        onClick={() => setShowLeaderboard(true)}
                        className="text-xs text-[#7ea1ff] hover:underline font-mono uppercase tracking-wide cursor-pointer"
                      >
                        🏆 Таблица рекордов
                      </button>
                    </div>
                  )}

                  {/* Player Name Input */}
                  <div className="space-y-1.5 w-full bg-[#120a1c]/90 border border-[#291740] rounded-xl p-3 text-left">
                    <label className="text-xs text-gray-400 font-bold uppercase font-mono tracking-wider flex items-center gap-1 select-none">
                      🏄‍♂️ Имя Сёрфера:
                    </label>
                    <input
                      type="text"
                      value={playerName}
                      onChange={(e) => {
                        const newName = e.target.value.slice(0, 12) || "Сёрфер";
                        setPlayerName(newName);
                        localStorage.setItem("sup_player_name", newName);
                      }}
                      placeholder="Введите имя..."
                      className="w-full bg-[#0d0714]/85 text-white border border-[#482c76] rounded-lg px-2.5 py-1.5 text-sm font-mono focus:outline-none focus:border-[#915eff] transition-all"
                      id="playerName_input"
                    />
                  </div>

                  {/* Customization: Board & Character Colors */}
                  <div className="space-y-3 w-full bg-[#120a1c]/90 border border-[#291740] rounded-xl p-3 text-left" id="color_customizer_box">
                    <div className="space-y-1">
                      <label className="text-xs text-gray-300 font-bold uppercase font-mono tracking-wider flex items-center gap-1.5 select-none">
                        🎨 Цвет SUP-борда:
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {BOARD_COLORS.map((color) => {
                          const isSelected = boardColor === color.hex;
                          return (
                            <button
                              key={color.hex}
                              type="button"
                              onClick={() => {
                                setBoardColor(color.hex);
                                localStorage.setItem("sup_board_color", color.hex);
                              }}
                              className={`w-5.5 h-5.5 rounded-full border transition-all relative cursor-pointer active:scale-90 ${
                                isSelected 
                                  ? "border-white scale-110 shadow-[0_0_8px_rgba(255,255,255,0.6)]" 
                                  : "border-transparent hover:scale-105"
                              }`}
                              style={{ backgroundColor: color.hex }}
                              title={color.name}
                            />
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-1 pt-1.5 border-t border-[#201538]">
                      <label className="text-xs text-gray-300 font-bold uppercase font-mono tracking-wider flex items-center gap-1.5 select-none">
                        🏄‍♂️ Цвет Человечка:
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {CHARACTER_COLORS.map((color) => {
                          const isSelected = characterColor === color.hex;
                          return (
                            <button
                              key={color.hex}
                              type="button"
                              onClick={() => {
                                setCharacterColor(color.hex);
                                localStorage.setItem("sup_character_color", color.hex);
                              }}
                              className={`w-5.5 h-5.5 rounded-full border transition-all relative cursor-pointer active:scale-90 ${
                                isSelected 
                                  ? "border-white scale-110 shadow-[0_0_8px_rgba(255,255,255,0.6)]" 
                                  : "border-transparent hover:scale-105"
                              }`}
                              style={{ backgroundColor: color.hex }}
                              title={color.name}
                            />
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Game Mode Selector */}
                  {isLobbyJoin ? (
                    <div className="w-full bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-3 text-center text-xs font-bold text-emerald-400 select-none">
                      🔒 Вы вошли по приглашению в лобби заплыва!
                    </div>
                  ) : gameMode === "solo" ? (
                    <div className="space-y-1 w-full bg-[#120a1c]/90 border border-[#291740] rounded-xl p-3 text-left">
                      <label className="text-xs text-gray-300 font-bold uppercase font-mono tracking-wider flex items-center gap-1 select-none">
                        🎮 Режим Заплыва:
                      </label>
                      <div className="grid grid-cols-2 gap-2 mt-1.5">
                        <button
                          onClick={() => {
                            setGameMode("solo");
                            disconnectWebSocket();
                          }}
                          className={`py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer border ${
                            gameMode === "solo"
                              ? "bg-[#915eff] text-white border-[#915eff] shadow-[0_2px_8px_rgba(145,94,255,0.3)]"
                              : "bg-[#0d0714] text-gray-400 border-[#2a1745] hover:text-white"
                          }`}
                          id="select_solo_mode"
                        >
                          <span>Одиночный</span>
                        </button>
                        <button
                          onClick={() => {
                            setGameMode("multiplayer");
                            connectWebSocket();
                          }}
                          className={`py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer border ${
                            gameMode === "multiplayer"
                              ? "bg-[#10b981] text-white border-[#10b981] shadow-[0_2px_8px_rgba(16,185,129,0.3)]"
                              : "bg-[#0d0714] text-gray-400 border-[#2a1745] hover:text-white"
                          }`}
                          id="select_multi_mode"
                        >
                          <span>Командный</span>
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {/* Dynamic Action Panel based on Game Mode */}
                  {gameMode === "multiplayer" ? (
                    <div className="w-full bg-[#0e0a1b] border border-[#271d47] rounded-xl p-3 space-y-2 text-left" id="multiplayer_lobby_panel">
                      {!wsConnected ? (
                        <div className="py-5 text-center space-y-3">
                          <div className="w-5 h-5 border-2 border-[#10b981] border-t-transparent rounded-full animate-spin mx-auto" />
                          <p className="text-xs text-gray-400 font-mono">Подключение к реке заплывов... 🌊</p>
                          <button
                            onClick={() => {
                              setGameMode("solo");
                              disconnectWebSocket();
                              audio.playHit();
                            }}
                            className="px-4 py-1.5 bg-[#251d3a] hover:bg-[#342751] text-[#bf94ff] border border-[#4d3283] text-xs font-bold rounded-xl transition-all cursor-pointer inline-flex items-center gap-1 mt-1"
                            id="lobby_cancel_connection_btn"
                          >
                            <span>Вернуться назад</span>
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center justify-between border-b border-[#21173d] pb-1.5">
                            <span className="text-[10px] text-emerald-400 font-bold font-mono uppercase tracking-wider">👥 Активные сёрферы ({wsLobbyPlayers.length}):</span>
                            <span className="text-[8px] bg-[#10b981]/20 border border-[#10b981] text-emerald-400 px-1.5 rounded font-mono font-bold">ОНЛАЙН</span>
                          </div>
 
                          {/* Lobby player list */}
                          <div className="max-h-[85px] overflow-y-auto space-y-1.5 pr-1 text-xs font-mono" id="lobby_players_scroller">
                            {wsLobbyPlayers.map((p, idx) => {
                              const isPlayerHost = idx === 0;
                              const isMe = p.id === myId;
                              return (
                                <div key={p.id} className="flex items-center justify-between bg-[#140e29] border border-[#281b4e] rounded-lg p-1.5">
                                  <span className="flex items-center gap-1.5 truncate max-w-[180px]">
                                    <span className="text-base select-none">{p.skinEmoji}</span>
                                    <span className={isMe ? "text-[#bf94ff] font-extrabold" : "text-gray-200"}>{p.name}</span>
                                    {isMe && <span className="text-[8px] bg-purple-950 text-purple-300 border border-purple-800 px-1 rounded">вы</span>}
                                  </span>
                                  {isPlayerHost && (
                                    <span className="text-[9px] text-amber-400 font-bold flex items-center gap-0.5 bg-amber-950/40 border border-amber-900/30 px-1.5 py-0.2 rounded-full">
                                      👑 Хост
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
 
                          {/* Mobile/Lobby Copy Link Row */}
                          <div className="bg-[#140e29] border border-[#281b4e] rounded-lg p-2 space-y-1.5 lg:hidden" id="mobile_invite_widget">
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] text-gray-400 font-bold uppercase">🔗 Ссылка для друзей:</span>
                              {isCopied && <span className="text-[9px] text-emerald-400 font-bold animate-pulse">Скопировано!</span>}
                            </div>
                            <div className="flex gap-1.5">
                              <input
                                type="text"
                                readOnly
                                value={window.location.origin + window.location.pathname}
                                className="bg-[#05030a] text-purple-300 border border-[#23153c] rounded px-2 py-1 text-[10px] flex-1 font-mono focus:outline-none select-all"
                              />
                              <button
                                onClick={copyLobbyLink}
                                type="button"
                                className="p-1.5 bg-emerald-600 hover:bg-emerald-500 rounded text-white cursor-pointer active:scale-95 flex items-center justify-center shrink-0"
                                title="Скопировать"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
 
                          {/* Race Lobby Actions */}
                          <div className="pt-1.5 space-y-2">
                            {wsLobbyPlayers[0]?.id === myId ? (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    if (wsRef.current?.readyState === WebSocket.OPEN) {
                                      wsRef.current.send(JSON.stringify({ type: "start_countdown" }));
                                    }
                                  }}
                                  className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-emerald-600 hover:from-amber-400 hover:to-emerald-500 active:scale-[0.98] text-white font-black text-xs rounded-xl shadow-[0_4px_12px_rgba(16,185,129,0.35)] transition-all flex items-center justify-center gap-1.5 cursor-pointer uppercase tracking-wider"
                                  id="start_countdown_btn"
                                >
                                  <Play className="w-3.5 h-3.5 fill-white" />
                                  <span>Запустить отсчёт</span>
                                </button>
                                <button
                                  onClick={() => {
                                    setGameMode("solo");
                                    disconnectWebSocket();
                                    audio.playHit();
                                  }}
                                  className="px-4 py-2.5 bg-[#251d3a] hover:bg-[#342751] text-[#bf94ff] border border-[#4d3283] font-bold text-xs rounded-xl transition-all cursor-pointer"
                                  title="Покинуть лобби"
                                  id="leave_lobby_btn"
                                >
                                  Покинуть
                                </button>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <div className="bg-[#120a22] border border-[#2c1d4e] rounded-xl p-2 text-center">
                                  <p className="text-[10px] text-gray-400 animate-pulse font-mono font-semibold flex items-center justify-center gap-1.5">
                                    <span>⏳ Ожидание запуска от хоста:</span>
                                    <strong className="text-amber-400 font-bold">{wsLobbyPlayers[0]?.name || "Лидер"}</strong>
                                  </p>
                                </div>
                                <button
                                  onClick={() => {
                                    setGameMode("solo");
                                    disconnectWebSocket();
                                    audio.playHit();
                                  }}
                                  className="w-full py-2 bg-[#251d3a] hover:bg-[#342751] text-[#bf94ff] border border-[#4d3283] font-bold text-xs rounded-xl transition-all cursor-pointer text-center"
                                  id="leave_lobby_non_host_btn"
                                >
                                  Покинуть лобби
                                </button>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    // Solo Game Mode Action Block
                    <div className="pt-1.5 space-y-2" id="start_screen_actions">
                      <button
                        onClick={resetGame}
                        className="w-full py-3 bg-[#915eff] hover:bg-[#7b46f0] active:scale-[0.98] text-white font-black text-sm rounded-xl shadow-[0_4px_14px_rgba(145,94,255,0.4)] transition-all flex items-center justify-center gap-2 cursor-pointer"
                        id="start_playing_btn"
                      >
                        <Play className="w-4 h-4 fill-white" />
                        <span>НАЧАТЬ ЗАПЛЫВ</span>
                      </button>

                      <button
                        onClick={() => setShowRules(true)}
                        className="w-full py-2.5 bg-[#120a1c] border border-[#291740] text-gray-300 hover:text-white hover:bg-[#1b1029] active:scale-[0.98] font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        id="rules_open_btn"
                      >
                        <BookOpen className="w-4 h-4 text-[#bf94ff]" />
                        <span>Правила и Справочник</span>
                      </button>
                    </div>
                  )}

                  <div className="text-xs text-gray-400 font-mono mt-4 space-y-1 text-left border-t border-[#231842] pt-3" id="controls_tips">
                    <p className="text-center font-bold text-gray-300 mb-1 uppercase tracking-wide text-xs">Управление в заплыве:</p>
                    <p>⌨️ Клавиатура: Стрелочки <strong className="text-white">← / →</strong> или клавиши <strong className="text-white">A / D</strong>.</p>
                    <p>📱 Смартфоны: Тапайте кнопки «Грести Влево» и «Грести Вправо».</p>
                  </div>
                </motion.div>
              )}
              </div>
            </div>
          )}
        </div>

        {/* Live Leaderboard under the canvas (visible on all screens during multiplayer active play) */}
        {isPlaying && gameMode === "multiplayer" && (
          <div className="block bg-[#0c081a] border-t border-[#1d1434] p-4 text-left font-mono" id="mobile_live_leaderboard">
            <div className="flex items-center justify-between border-b border-[#21173d] pb-1.5 mb-2">
              <span className="text-xs text-amber-400 font-extrabold uppercase tracking-wider flex items-center gap-1">
                🏆 Таблица Лидеров Заплыва:
              </span>
              <span className="text-xs text-gray-400">Обновляется в реальном времени</span>
            </div>
            <div className="flex flex-row gap-3 overflow-x-auto pb-1.5 text-sm whitespace-nowrap scrollbar-thin" id="mobile_live_list">
              {(() => {
                const sorted: any[] = [
                  { name: playerName, meters: score, skinEmoji: currentSkin.emoji, id: myId || "me", isDead: false },
                  ...Array.from(otherPlayersRef.current.values())
                ].sort((a: any, b: any) => b.meters - a.meters);

                return sorted.map((p: any, idx: number) => (
                  <div key={p.id} className="flex items-center gap-2 bg-[#140e29] border border-[#2b194d] rounded-xl px-3.5 py-1.5 shrink-0 shadow-sm">
                    <span className="font-extrabold text-[#915eff] text-xs">{idx + 1}</span>
                    <span className="text-sm select-none">{p.skinEmoji}</span>
                    <span className={p.id === myId || p.id === "me" ? "text-amber-300 font-black" : "text-gray-100 font-medium"}>
                      {p.name}
                    </span>
                    <span className={`font-black ml-1 ${p.isDead ? "text-red-500 line-through text-xs" : "text-emerald-400"}`}>
                      {p.isDead ? "выбыл" : `${Math.floor(p.meters)}м`}
                    </span>
                  </div>
                ));
              })()}
            </div>
          </div>
        )}
      </div>

      {/* Footer Mobile Controls Row */}
      {isPlaying && (
        <div className="p-3 bg-[#0a0711] border-t border-[#1d1433] flex items-center justify-between gap-4" id="mobile_paddle_controls">
          <button
            onMouseDown={paddleLeft}
            onTouchStart={paddleLeft}
            className="flex-1 py-3 bg-[#171128] hover:bg-[#251a42] border border-[#2d1e50] active:scale-[0.97] rounded-xl text-white text-xs font-bold font-mono transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            id="mobile_btn_left"
          >
            <ArrowLeft className="w-4 h-4 text-[#bf94ff]" />
            <span>Грести Влево</span>
          </button>
          
          <button
            onMouseDown={paddleRight}
            onTouchStart={paddleRight}
            className="flex-1 py-3 bg-[#171128] hover:bg-[#251a42] border border-[#2d1e50] active:scale-[0.97] rounded-xl text-white text-xs font-bold font-mono transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            id="mobile_btn_right"
          >
            <span>Грести Вправо</span>
            <ArrowRight className="w-4 h-4 text-[#bf94ff]" />
          </button>
        </div>
      )}
    </div>
    </div>
  );
}
