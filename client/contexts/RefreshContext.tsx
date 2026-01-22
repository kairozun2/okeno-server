import React, { createContext, useContext, useState, useCallback } from "react";

interface RefreshContextType {
  feedRefreshing: boolean;
  setFeedRefreshing: (value: boolean) => void;
  chatsRefreshing: boolean;
  setChatsRefreshing: (value: boolean) => void;
  profileRefreshing: boolean;
  setProfileRefreshing: (value: boolean) => void;
}

const RefreshContext = createContext<RefreshContextType>({
  feedRefreshing: false,
  setFeedRefreshing: () => {},
  chatsRefreshing: false,
  setChatsRefreshing: () => {},
  profileRefreshing: false,
  setProfileRefreshing: () => {},
});

export function RefreshProvider({ children }: { children: React.ReactNode }) {
  const [feedRefreshing, setFeedRefreshing] = useState(false);
  const [chatsRefreshing, setChatsRefreshing] = useState(false);
  const [profileRefreshing, setProfileRefreshing] = useState(false);

  return (
    <RefreshContext.Provider
      value={{
        feedRefreshing,
        setFeedRefreshing,
        chatsRefreshing,
        setChatsRefreshing,
        profileRefreshing,
        setProfileRefreshing,
      }}
    >
      {children}
    </RefreshContext.Provider>
  );
}

export function useRefresh() {
  return useContext(RefreshContext);
}
