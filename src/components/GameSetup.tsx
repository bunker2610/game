import React, { useState } from 'react';
import { Sparkles, Swords, Compass, Wand2, Shield, User, ArrowRight } from 'lucide-react';
import { ArtStyle } from '../types';
import { motion } from 'motion/react';

interface GameSetupProps {
  onStartGame: (setupData: {
    premise: string;
    artStyle: ArtStyle;
    characterClass: string;
    characterName: string;
    imageSize: '1K' | '2K' | '4K';
  }) => void;
  isLoading: boolean;
}

const PRESET_PREMISES = [
  {
    id: 'fantasy',
    title: 'Тайны заброшенного замка',
    icon: Compass,
    text: 'Старинный каменный замок, окутанный вечным туманом, хранит древний артефакт. Местные жители говорят, что по ночам оттуда доносятся таинственные звуки и мерцание магического света.',
    style: 'watercolor' as ArtStyle,
    className: 'Воин',
  },
  {
    id: 'cyberpunk',
    title: 'Киберпанк: Взлом сети',
    icon: Shield,
    text: 'Неоновые улицы футуристического мегаполиса погрязли во власти корпораций. Легендарный хакер нанимает вас для проникновения в защищенный дата-центр компании «Арасака».',
    style: 'cyberpunk' as ArtStyle,
    className: 'Хакер',
  },
  {
    id: 'gothic',
    title: 'Обитель проклятых душ',
    icon: Swords,
    text: 'Викторианское поместье на холме, известное темной историей исчезновения его владельцев. Вы — детектив оккультных наук, прибывший расследовать мистическое проклятие.',
    style: 'gothic' as ArtStyle,
    className: 'Оккультист',
  },
  {
    id: 'space',
    title: 'Космический рубеж',
    icon: Wand2,
    text: 'Заброшенная научно-исследовательская станция на орбите далекой черной дыры посылает сигналы бедствия. Вы прибываете на челноке, чтобы раскрыть тайну застывшего во времени экипажа.',
    style: 'pixel' as ArtStyle,
    className: 'Инженер',
  },
];

const ART_STYLES = [
  { value: 'watercolor', label: 'Фэнтези Акварель', desc: 'Мягкие переходы, пастельные тона' },
  { value: 'cyberpunk', label: 'Киберпанк Неон', desc: 'Яркие цвета, неоновое свечение' },
  { value: 'gothic', label: 'Готическая Живопись', desc: 'Мрачные тени, глубокое масло' },
  { value: 'comic', label: 'Ретро Комикс', desc: 'Ручные чернила, винтажная штриховка' },
  { value: 'pixel', label: 'Пиксель-Арт', desc: 'Ностальгический 16-битный ретро-стиль' },
];

const CHARACTER_CLASSES = [
  { name: 'Воин', icon: Swords, desc: 'Силен в бою, полагается на доспехи и оружие' },
  { name: 'Маг', icon: Wand2, desc: 'Владеет стихийными заклинаниями и свитками' },
  { name: 'Пройдоха', icon: Compass, desc: 'Ловок, искусен в скрытности и поиске ловушек' },
  { name: 'Инженер', icon: Shield, desc: 'Разбирается в механизмах и технологиях' },
];

export const GameSetup: React.FC<GameSetupProps> = ({ onStartGame, isLoading }) => {
  const [selectedPreset, setSelectedPreset] = useState<string>('fantasy');
  const [customPremise, setCustomPremise] = useState<string>('');
  const [artStyle, setArtStyle] = useState<ArtStyle>('watercolor');
  const [characterClass, setCharacterClass] = useState<string>('Воин');
  const [characterName, setCharacterName] = useState<string>('Алистер');
  const [imageSize, setImageSize] = useState<'1K' | '2K' | '4K'>('1K');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalPremise = customPremise.trim() || 
      (PRESET_PREMISES.find(p => p.id === selectedPreset)?.text || PRESET_PREMISES[0].text);
    
    onStartGame({
      premise: finalPremise,
      artStyle,
      characterClass,
      characterName: characterName.trim() || 'Безымянный герой',
      imageSize,
    });
  };

  const handleSelectPreset = (preset: typeof PRESET_PREMISES[0]) => {
    setSelectedPreset(preset.id);
    setCustomPremise('');
    setArtStyle(preset.style);
    setCharacterClass(preset.className);
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4" id="game-setup-container">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-10"
      >
        <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-semibold rounded-full uppercase tracking-wider">
          Генератор бесконечных приключений
        </span>
        <h1 className="text-4xl font-extrabold text-slate-900 mt-2 tracking-tight">
          Создайте Свою Судьбу
        </h1>
        <p className="text-slate-600 mt-2 max-w-2xl mx-auto text-base">
          Интеллектуальная ролевая игра на базе искусственного интеллекта. Каждый ваш выбор меняет ткань повествования, создавая абсолютно уникальную историю и живые иллюстрации.
        </p>
      </motion.div>

      <form onSubmit={handleSubmit} className="space-y-8 bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-sm">
        
        {/* Step 1: Premise Selection */}
        <div className="space-y-4">
          <label className="text-lg font-semibold text-slate-800 block">
            1. Выберите или напишите мир и завязку приключения
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {PRESET_PREMISES.map((preset) => {
              const Icon = preset.icon;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className={`text-left p-4 rounded-xl border transition-all flex gap-3 ${
                    selectedPreset === preset.id && !customPremise
                      ? 'border-amber-500 bg-amber-50/50 ring-1 ring-amber-500'
                      : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                  }`}
                >
                  <div className={`p-2 rounded-lg shrink-0 ${selectedPreset === preset.id && !customPremise ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-600'}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-medium text-slate-900 text-sm">{preset.title}</h3>
                    <p className="text-slate-500 text-xs mt-1 line-clamp-2">{preset.text}</p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="pt-2">
            <span className="text-xs text-slate-400 block mb-2">— Или введите собственную идею приключения —</span>
            <textarea
              placeholder="Например: Я выживший на необитаемом острове, населенном механическими динозаврами..."
              value={customPremise}
              onChange={(e) => {
                setCustomPremise(e.target.value);
                setSelectedPreset('');
              }}
              className="w-full h-24 p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm"
            />
          </div>
        </div>

        <hr className="border-slate-100" />

        {/* Step 2: Character Info */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-800">2. Ваш Персонаж</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600 block">Имя героя</label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={characterName}
                  onChange={(e) => setCharacterName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm"
                />
              </div>
            </div>

            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-medium text-slate-600 block">Класс персонажа</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {CHARACTER_CLASSES.map((cls) => {
                  const Icon = cls.icon;
                  return (
                    <button
                      key={cls.name}
                      type="button"
                      onClick={() => setCharacterClass(cls.name)}
                      className={`py-2 px-3 border rounded-xl text-center flex flex-col items-center justify-center gap-1 transition-all ${
                        characterClass === cls.name
                          ? 'border-amber-500 bg-amber-50/50 text-amber-900 font-medium'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <Icon className="w-4 h-4 text-amber-600" />
                      <span className="text-xs">{cls.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <hr className="border-slate-100" />

        {/* Step 3: Visual Settings */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-800">3. Оформление и Качество</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600 block">Визуальный художественный стиль</label>
              <div className="space-y-2">
                {ART_STYLES.map((style) => (
                  <button
                    key={style.value}
                    type="button"
                    onClick={() => setArtStyle(style.value as ArtStyle)}
                    className={`w-full text-left p-2.5 border rounded-xl flex items-center justify-between transition-all ${
                      artStyle === style.value
                        ? 'border-amber-500 bg-amber-50/50 font-medium'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="text-sm text-slate-800">{style.label}</div>
                      <div className="text-xs text-slate-400 font-normal">{style.desc}</div>
                    </div>
                    {artStyle === style.value && (
                      <div className="w-2 h-2 rounded-full bg-amber-600" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3 bg-amber-50/30 border border-amber-100 rounded-xl p-4 flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  Разрешение Иллюстраций (gemini-3-pro-image)
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Наш движок генерирует уникальные изображения в реальном времени. Выберите размер кадра. Высокие разрешения (2K и 4K) требуют больше времени для рендеринга.
                </p>
                
                <div className="grid grid-cols-3 gap-2 mt-4">
                  {(['1K', '2K', '4K'] as const).map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setImageSize(size)}
                      className={`py-2.5 border rounded-xl text-center font-bold text-sm transition-all ${
                        imageSize === size
                          ? 'border-amber-500 bg-amber-100/50 text-amber-900 shadow-sm'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {size}
                      <span className="block text-[10px] font-normal text-slate-400 mt-0.5">
                        {size === '1K' ? '1024x1024' : size === '2K' ? '2048x2048' : '4096x4096'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-amber-100/60 text-[11px] text-amber-800 rounded-lg p-2.5 mt-2">
                Обратите внимание: генерация изображений высокого качества производится через модель Google Gemini 3 Image Pro.
              </div>
            </div>

          </div>
        </div>

        {/* Start Button */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Инициализация волшебного мира...</span>
              </>
            ) : (
              <>
                <span>Начать Приключение</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  );
};
