import { database } from '../config/firebase';
import { ref, set, onValue, onDisconnect, serverTimestamp, off, get } from 'firebase/database';

export interface PresenceData {
  status: 'online' | 'offline';
  lastActive: number;
}

const getUserId = (userName: string): string => {
  return userName.replace(/\s+/g, '_').toLowerCase();
};

export const initializePresence = (userName: string): (() => void) => {
  const userId = getUserId(userName);
  const presenceRef = ref(database, `University Data/Presence/${userId}`);

  const presenceData = {
    status: 'online',
    lastActive: Date.now(),
  };

  set(presenceRef, presenceData);

  const disconnectRef = onDisconnect(presenceRef);
  disconnectRef.set({
    status: 'offline',
    lastActive: Date.now(),
  });

  const intervalId = setInterval(() => {
    set(presenceRef, {
      status: 'online',
      lastActive: Date.now(),
    });
  }, 60000);

  return () => {
    clearInterval(intervalId);
    set(presenceRef, {
      status: 'offline',
      lastActive: Date.now(),
    });
  };
};

export const subscribeToPresence = (
  userName: string,
  callback: (presence: PresenceData | null) => void
): (() => void) => {
  const userId = getUserId(userName);
  const presenceRef = ref(database, `University Data/Presence/${userId}`);

  const listener = onValue(presenceRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.val() as PresenceData);
    } else {
      callback(null);
    }
  });

  return () => {
    off(presenceRef);
  };
};

export const getPresenceStatus = async (userName: string): Promise<PresenceData | null> => {
  const userId = getUserId(userName);
  const presenceRef = ref(database, `University Data/Presence/${userId}`);

  try {
    const snapshot = await get(presenceRef);
    if (snapshot.exists()) {
      return snapshot.val() as PresenceData;
    }
    return null;
  } catch (error) {
    console.error('Error getting presence status:', error);
    return null;
  }
};

export const formatLastActive = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) {
    return 'Active now';
  } else if (minutes < 60) {
    return `Active ${minutes}m ago`;
  } else if (hours < 24) {
    return `Active ${hours}h ago`;
  } else if (days === 1) {
    return 'Active yesterday';
  } else if (days < 7) {
    return `Active ${days}d ago`;
  } else {
    const date = new Date(timestamp);
    return `Active ${date.toLocaleDateString()}`;
  }
};
