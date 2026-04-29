import React, { createContext, useState, useCallback, ReactNode } from 'react';

export interface BotCreationState {
  id: string;
  name: string;
  progress: number;
  type: 'creating' | 'editing';
  timestamp: number;
}

export interface NewlyCreatedBot {
  id: string;
  name: string;
  description: string;
  websiteUrl: string;
  voiceEnabled: boolean;
  languages: string[];
  primaryPurpose: string;
  conversationalTone: string;
  isVideoBot: boolean;
  videoBotImageUrl?: string;
  videoBotImagePublicId?: string;
  voiceId?: string;
  humanHandoffEnabled: boolean;
  requireVisitorAuth0Identity: boolean;
  [key: string]: any;
}

interface BotCreationContextType {
  botsInProgress: BotCreationState[];
  newlyCreatedBots: NewlyCreatedBot[];
  startBotCreation: (botId: string, botName: string, type?: 'creating' | 'editing') => void;
  updateBotProgress: (botId: string, progress: number) => void;
  completeBotCreation: (botId: string, botData?: NewlyCreatedBot) => void;
  getBotProgress: (botId: string) => BotCreationState | undefined;
  clearNewlyCreatedBots: () => void;
}

export const BotCreationContext = createContext<BotCreationContextType>({
  botsInProgress: [],
  newlyCreatedBots: [],
  startBotCreation: () => {},
  updateBotProgress: () => {},
  completeBotCreation: () => {},
  getBotProgress: () => undefined,
  clearNewlyCreatedBots: () => {},
});

export const BotCreationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [botsInProgress, setBotsInProgress] = useState<BotCreationState[]>([]);
  const [newlyCreatedBots, setNewlyCreatedBots] = useState<NewlyCreatedBot[]>([]);

  const startBotCreation = useCallback((botId: string, botName: string, type: 'creating' | 'editing' = 'creating') => {
    setBotsInProgress(prev => {
      const exists = prev.some(bot => bot.id === botId);
      if (exists) return prev;
      return [...prev, {
        id: botId,
        name: botName,
        progress: 5,
        type,
        timestamp: Date.now(),
      }];
    });
  }, []);

  const updateBotProgress = useCallback((botId: string, progress: number) => {
    setBotsInProgress(prev =>
      prev.map(bot =>
        bot.id === botId ? { ...bot, progress: Math.min(progress, 99) } : bot
      )
    );
  }, []);

  const completeBotCreation = useCallback((botId: string, botData?: NewlyCreatedBot) => {
    if (botData) {
      setNewlyCreatedBots(prev => [...prev, botData]);
    }
    setTimeout(() => {
      setBotsInProgress(prev => prev.filter(bot => bot.id !== botId));
    }, 500);
  }, []);

  const getBotProgress = useCallback((botId: string) => {
    return botsInProgress.find(bot => bot.id === botId);
  }, [botsInProgress]);

  const clearNewlyCreatedBots = useCallback(() => {
    setNewlyCreatedBots([]);
  }, []);

  return (
    <BotCreationContext.Provider value={{
      botsInProgress,
      newlyCreatedBots,
      startBotCreation,
      updateBotProgress,
      completeBotCreation,
      getBotProgress,
      clearNewlyCreatedBots,
    }}>
      {children}
    </BotCreationContext.Provider>
  );
};

export const useBotCreation = () => {
  const context = React.useContext(BotCreationContext);
  if (!context) {
    throw new Error('useBotCreation must be used within BotCreationProvider');
  }
  return context;
};
