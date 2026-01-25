import { database } from '../config/firebase';
import { ref, get, set, push, onValue, off, query, orderByKey, update } from 'firebase/database';

export type MessageType = 'text' | 'image' | 'video' | 'file';
export type MessageStatus = 'sent' | 'delivered' | 'seen';

export interface ChatMessage {
  messageId: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  receiverName: string;
  type: MessageType;
  content: string;
  timestamp: number;
  status: MessageStatus;
  fileName?: string;
  fileSize?: number;
}

export interface ChatParticipant {
  uid: string;
  name: string;
  role: 'counsellor' | 'student';
  initials: string;
}

export interface ChatListItem {
  chatId: string;
  participant: ChatParticipant;
  lastMessage: {
    content: string;
    type: MessageType;
    timestamp: number;
  } | null;
  unreadCount: number;
}

const createChatId = (uid1: string, uid2: string): string => {
  const sorted = [uid1, uid2].sort();
  return `chat_${sorted[0]}_${sorted[1]}`;
};

const getUserId = (userName: string): string => {
  return userName.replace(/\s+/g, '_').toLowerCase();
};

export const getAvatarColor = (name: string): string => {
  const colors = [
    '#04ADEE',
    '#10B981',
    '#F59E0B',
    '#EF4444',
    '#8B5CF6',
    '#EC4899',
    '#14B8A6',
    '#F97316',
    '#6366F1',
    '#84CC16',
  ];

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

export const sendMessage = async (
  senderName: string,
  receiverName: string,
  content: string,
  type: MessageType = 'text',
  fileName?: string,
  fileSize?: number
): Promise<void> => {
  try {
    const senderId = getUserId(senderName);
    const receiverId = getUserId(receiverName);
    const chatId = createChatId(senderId, receiverId);

    const messageId = push(ref(database, `University Data/Inbox/${chatId}/messages`)).key;
    if (!messageId) throw new Error('Failed to generate message ID');

    const timestamp = Date.now();
    const messageData: Omit<ChatMessage, 'messageId'> = {
      senderId,
      senderName,
      receiverId,
      receiverName,
      type,
      content,
      timestamp,
      status: 'sent',
      ...(fileName && { fileName }),
      ...(fileSize && { fileSize }),
    };

    const updates: { [key: string]: any } = {};
    updates[`University Data/Inbox/${chatId}/participants/${senderId}`] = true;
    updates[`University Data/Inbox/${chatId}/participants/${receiverId}`] = true;
    updates[`University Data/Inbox/${chatId}/messages/${messageId}`] = messageData;
    updates[`University Data/Inbox/${chatId}/lastMessage`] = {
      content: type === 'text' ? content : `Sent a ${type}`,
      type,
      timestamp,
    };
    updates[`University Data/Inbox/${chatId}/unreadCount/${receiverId}`] = await getUnreadCount(chatId, receiverId) + 1;

    await update(ref(database), updates);

    console.log('✅ Message sent successfully');
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

export const getMessages = async (
  userName1: string,
  userName2: string
): Promise<ChatMessage[]> => {
  try {
    const uid1 = getUserId(userName1);
    const uid2 = getUserId(userName2);
    const chatId = createChatId(uid1, uid2);

    const messagesRef = ref(database, `University Data/Inbox/${chatId}/messages`);
    const snapshot = await get(messagesRef);

    if (!snapshot.exists()) {
      return [];
    }

    const messagesData = snapshot.val();
    const messages: ChatMessage[] = [];

    Object.keys(messagesData).forEach((messageId) => {
      const messageData = messagesData[messageId];
      messages.push({
        messageId,
        ...messageData,
      });
    });

    return messages.sort((a, b) => a.timestamp - b.timestamp);
  } catch (error) {
    console.error('Error getting messages:', error);
    return [];
  }
};

export const subscribeToMessages = (
  userName1: string,
  userName2: string,
  callback: (messages: ChatMessage[]) => void
): (() => void) => {
  const uid1 = getUserId(userName1);
  const uid2 = getUserId(userName2);
  const chatId = createChatId(uid1, uid2);

  const messagesRef = ref(database, `University Data/Inbox/${chatId}/messages`);

  const listener = onValue(messagesRef, async (snapshot) => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }

    const messagesData = snapshot.val();
    const messages: ChatMessage[] = [];

    Object.keys(messagesData).forEach((messageId) => {
      const messageData = messagesData[messageId];
      messages.push({
        messageId,
        ...messageData,
      });
    });

    const sortedMessages = messages.sort((a, b) => a.timestamp - b.timestamp);
    callback(sortedMessages);

    await markMessagesAsDelivered(chatId, uid1);
  });

  return () => {
    off(messagesRef);
  };
};

const markMessagesAsDelivered = async (chatId: string, userId: string): Promise<void> => {
  try {
    const messagesRef = ref(database, `University Data/Inbox/${chatId}/messages`);
    const snapshot = await get(messagesRef);

    if (!snapshot.exists()) return;

    const messagesData = snapshot.val();
    const updates: { [key: string]: any } = {};

    Object.keys(messagesData).forEach((messageId) => {
      const message = messagesData[messageId];
      if (message.receiverId === userId && message.status === 'sent') {
        updates[`University Data/Inbox/${chatId}/messages/${messageId}/status`] = 'delivered';
      }
    });

    if (Object.keys(updates).length > 0) {
      await update(ref(database), updates);
    }
  } catch (error) {
    console.error('Error marking messages as delivered:', error);
  }
};

export const markMessagesAsSeen = async (
  userName1: string,
  userName2: string
): Promise<void> => {
  try {
    const uid1 = getUserId(userName1);
    const uid2 = getUserId(userName2);
    const chatId = createChatId(uid1, uid2);

    const messagesRef = ref(database, `University Data/Inbox/${chatId}/messages`);
    const snapshot = await get(messagesRef);

    if (!snapshot.exists()) return;

    const messagesData = snapshot.val();
    const updates: { [key: string]: any } = {};

    Object.keys(messagesData).forEach((messageId) => {
      const message = messagesData[messageId];
      if (message.receiverId === uid1 && message.status !== 'seen') {
        updates[`University Data/Inbox/${chatId}/messages/${messageId}/status`] = 'seen';
      }
    });

    updates[`University Data/Inbox/${chatId}/unreadCount/${uid1}`] = 0;

    if (Object.keys(updates).length > 0) {
      await update(ref(database), updates);
    }
  } catch (error) {
    console.error('Error marking messages as seen:', error);
  }
};

const getUnreadCount = async (chatId: string, userId: string): Promise<number> => {
  try {
    const countRef = ref(database, `University Data/Inbox/${chatId}/unreadCount/${userId}`);
    const snapshot = await get(countRef);
    return snapshot.exists() ? snapshot.val() : 0;
  } catch (error) {
    console.error('Error getting unread count:', error);
    return 0;
  }
};

export const getChatList = async (
  currentUserName: string,
  participants: ChatParticipant[]
): Promise<ChatListItem[]> => {
  try {
    const currentUserId = getUserId(currentUserName);
    const chatListItems: ChatListItem[] = [];

    for (const participant of participants) {
      const participantId = getUserId(participant.name);
      const chatId = createChatId(currentUserId, participantId);

      const lastMessageRef = ref(database, `University Data/Inbox/${chatId}/lastMessage`);
      const lastMessageSnapshot = await get(lastMessageRef);

      const unreadCount = await getUnreadCount(chatId, currentUserId);

      chatListItems.push({
        chatId,
        participant,
        lastMessage: lastMessageSnapshot.exists() ? lastMessageSnapshot.val() : null,
        unreadCount,
      });
    }

    return chatListItems.sort((a, b) => {
      const timeA = a.lastMessage?.timestamp || 0;
      const timeB = b.lastMessage?.timestamp || 0;
      return timeB - timeA;
    });
  } catch (error) {
    console.error('Error getting chat list:', error);
    return [];
  }
};

export const subscribeToChat = (
  chatId: string,
  currentUserId: string,
  callback: (chatItem: { lastMessage: any; unreadCount: number }) => void
): (() => void) => {
  const lastMessageRef = ref(database, `University Data/Inbox/${chatId}/lastMessage`);
  const unreadCountRef = ref(database, `University Data/Inbox/${chatId}/unreadCount/${currentUserId}`);

  const lastMessageListener = onValue(lastMessageRef, async (snapshot) => {
    const lastMessage = snapshot.exists() ? snapshot.val() : null;
    const unreadCount = await getUnreadCount(chatId, currentUserId);

    callback({
      lastMessage,
      unreadCount,
    });
  });

  const unreadCountListener = onValue(unreadCountRef, async (snapshot) => {
    const unreadCount = snapshot.exists() ? snapshot.val() : 0;
    const lastMessageSnapshot = await get(lastMessageRef);
    const lastMessage = lastMessageSnapshot.exists() ? lastMessageSnapshot.val() : null;

    callback({
      lastMessage,
      unreadCount,
    });
  });

  return () => {
    off(lastMessageRef);
    off(unreadCountRef);
  };
};
