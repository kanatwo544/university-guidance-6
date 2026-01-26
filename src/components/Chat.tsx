import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Paperclip,
  Image as ImageIcon,
  FileText,
  Video,
  Download,
  Search,
  MoreVertical,
  X,
  ArrowLeft,
  Loader2,
} from 'lucide-react';
import { getUserFromStorage } from '../services/userStorage';
import { detectUserRole, getSchoolMembers, UserRoleInfo, SchoolMember } from '../services/roleDetectionService';
import {
  sendMessage,
  subscribeToMessages,
  markMessagesAsSeen,
  getChatList,
  subscribeToChat,
  getAvatarColor,
  ChatMessage,
  ChatListItem,
  MessageType,
  ChatParticipant,
} from '../services/newChatService';
import { uploadMedia, getMediaTypeFromFile, formatFileSize, UploadProgress } from '../services/mediaUploadService';
import { subscribeToPresence, PresenceData, formatLastActive } from '../services/presenceService';

interface ChatProps {
  userRole?: 'student' | 'counselor';
}

const Chat: React.FC<ChatProps> = () => {
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState<UserRoleInfo | null>(null);
  const [chatList, setChatList] = useState<ChatListItem[]>([]);
  const [selectedChat, setSelectedChat] = useState<ChatListItem | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showMobileConversations, setShowMobileConversations] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploadingFile, setUploadingFile] = useState<UploadProgress | null>(null);
  const [presenceMap, setPresenceMap] = useState<Map<string, PresenceData>>(new Map());

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const unsubscribeMessagesRef = useRef<(() => void) | null>(null);
  const chatSubscriptionsRef = useRef<Map<string, () => void>>(new Map());
  const presenceSubscriptionsRef = useRef<Map<string, () => void>>(new Map());

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const initializeChat = async () => {
      try {
        const user = getUserFromStorage();
        if (!user?.name) {
          console.error('No user found in storage');
          setLoading(false);
          return;
        }

        console.log('🔄 Initializing chat for user:', user.name);

        const roleInfo = await detectUserRole(user.name);
        if (!roleInfo) {
          console.error('Could not detect user role');
          setLoading(false);
          return;
        }

        console.log('✅ User role detected:', roleInfo);
        setUserInfo(roleInfo);

        const members = await getSchoolMembers(
          roleInfo.schoolName,
          roleInfo.userName,
          roleInfo.role
        );

        console.log('✅ School members loaded:', members.length);

        const participants: ChatParticipant[] = members.map((member) => ({
          uid: member.name.replace(/\s+/g, '_').toLowerCase(),
          name: member.name,
          role: member.role,
          initials: member.initials,
        }));

        const chatListData = await getChatList(user.name, participants);
        setChatList(chatListData);

        chatListData.forEach((chat) => {
          if (!chatSubscriptionsRef.current.has(chat.chatId)) {
            const currentUserId = user.name.replace(/\s+/g, '_').toLowerCase();
            const unsubscribe = subscribeToChat(chat.chatId, currentUserId, (updates) => {
              setChatList((prev) => {
                const updated = prev.map((item) =>
                  item.chatId === chat.chatId
                    ? {
                        ...item,
                        lastMessage: updates.lastMessage,
                        unreadCount: updates.unreadCount,
                      }
                    : item
                );
                return updated.sort((a, b) => {
                  const timeA = a.lastMessage?.timestamp || 0;
                  const timeB = b.lastMessage?.timestamp || 0;
                  return timeB - timeA;
                });
              });
            });

            chatSubscriptionsRef.current.set(chat.chatId, unsubscribe);
          }

          if (!presenceSubscriptionsRef.current.has(chat.participant.name)) {
            const unsubscribePresence = subscribeToPresence(chat.participant.name, (presence) => {
              if (presence) {
                setPresenceMap((prev) => {
                  const newMap = new Map(prev);
                  newMap.set(chat.participant.name, presence);
                  return newMap;
                });
              }
            });

            presenceSubscriptionsRef.current.set(chat.participant.name, unsubscribePresence);
          }
        });

        setLoading(false);
      } catch (error) {
        console.error('Error initializing chat:', error);
        setLoading(false);
      }
    };

    initializeChat();

    return () => {
      if (unsubscribeMessagesRef.current) {
        unsubscribeMessagesRef.current();
      }
      chatSubscriptionsRef.current.forEach((unsubscribe) => unsubscribe());
      chatSubscriptionsRef.current.clear();
      presenceSubscriptionsRef.current.forEach((unsubscribe) => unsubscribe());
      presenceSubscriptionsRef.current.clear();
    };
  }, []);

  useEffect(() => {
    if (selectedChat && userInfo) {
      if (unsubscribeMessagesRef.current) {
        unsubscribeMessagesRef.current();
      }

      const unsubscribe = subscribeToMessages(
        userInfo.userName,
        selectedChat.participant.name,
        (newMessages) => {
          setMessages(newMessages);
          // Scroll to bottom after messages load
          setTimeout(() => scrollToBottom(), 100);
        }
      );

      unsubscribeMessagesRef.current = unsubscribe;

      markMessagesAsSeen(userInfo.userName, selectedChat.participant.name);

      return () => {
        if (unsubscribeMessagesRef.current) {
          unsubscribeMessagesRef.current();
        }
      };
    }
  }, [selectedChat, userInfo]);

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedChat || !userInfo) return;

    try {
      setSending(true);
      await sendMessage(
        userInfo.userName,
        selectedChat.participant.name,
        messageInput.trim(),
        'text'
      );
      setMessageInput('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>,
    type: 'image' | 'video' | 'file'
  ) => {
    const file = event.target.files?.[0];
    if (!file || !selectedChat || !userInfo) return;

    try {
      setUploadingFile({ progress: 0, status: 'uploading' });

      const mediaType = getMediaTypeFromFile(file);
      const url = await uploadMedia(file, mediaType, (progress) => {
        setUploadingFile(progress);
      });

      await sendMessage(
        userInfo.userName,
        selectedChat.participant.name,
        url,
        mediaType,
        file.name,
        file.size
      );

      setUploadingFile(null);
      event.target.value = '';
    } catch (error) {
      console.error('Error uploading file:', error);
      setUploadingFile(null);
    }
  };

  const handleAttachClick = (type: 'image' | 'video' | 'file') => {
    setShowAttachMenu(false);
    if (type === 'image') {
      imageInputRef.current?.click();
    } else if (type === 'video') {
      videoInputRef.current?.click();
    } else {
      fileInputRef.current?.click();
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const formatMessageTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const formatMessageDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  };

  const getStatusText = (status: string, isMe: boolean) => {
    if (!isMe) return null;

    if (status === 'seen') {
      return <span className="text-xs text-blue-500 font-medium">seen</span>;
    } else {
      return <span className="text-xs text-gray-500">sent</span>;
    }
  };

  const renderMediaContent = (message: ChatMessage) => {
    const isMe = userInfo && message.senderId === userInfo.userName.replace(/\s+/g, '_').toLowerCase();

    if (message.type === 'image') {
      return (
        <div className="mb-1">
          <img
            src={message.content}
            alt="Shared image"
            className="max-w-xs rounded-lg cursor-pointer"
            onClick={() => window.open(message.content, '_blank')}
          />
        </div>
      );
    } else if (message.type === 'video') {
      return (
        <div className="mb-1">
          <video
            src={message.content}
            controls
            className="max-w-xs rounded-lg"
          />
        </div>
      );
    } else if (message.type === 'file') {
      return (
        <a
          href={message.content}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center space-x-2 p-3 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-colors"
        >
          <FileText className="w-5 h-5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{message.fileName || 'File'}</p>
            {message.fileSize && (
              <p className="text-xs opacity-75">{formatFileSize(message.fileSize)}</p>
            )}
          </div>
          <Download className="w-4 h-4" />
        </a>
      );
    }

    return <p className="text-sm">{message.content}</p>;
  };

  const renderMessage = (message: ChatMessage, index: number) => {
    const isMe = userInfo && message.senderId === userInfo.userName.replace(/\s+/g, '_').toLowerCase();
    const showDateSeparator =
      index === 0 ||
      formatMessageDate(messages[index - 1].timestamp) !== formatMessageDate(message.timestamp);

    return (
      <React.Fragment key={message.messageId}>
        {showDateSeparator && (
          <div className="flex justify-center my-4">
            <div className="px-3 py-1 bg-gray-200 rounded-full text-xs text-gray-600">
              {formatMessageDate(message.timestamp)}
            </div>
          </div>
        )}

        <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-4`}>
          <div className={`flex ${isMe ? 'flex-row-reverse' : 'flex-row'} items-end max-w-[70%]`}>
            {!isMe && (
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm mr-2 flex-shrink-0"
                style={{ backgroundColor: getAvatarColor(selectedChat?.participant.name || '') }}
              >
                {selectedChat?.participant.initials || 'U'}
              </div>
            )}

            <div>
              <div
                className={`px-4 py-2 rounded-2xl ${
                  isMe
                    ? 'bg-[#04ADEE] text-white rounded-br-sm'
                    : 'bg-gray-200 text-gray-900 rounded-bl-sm'
                }`}
              >
                {renderMediaContent(message)}
              </div>

              <div className={`flex items-center space-x-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                <span className="text-xs text-gray-500">{formatMessageTime(message.timestamp)}</span>
                {getStatusText(message.status, isMe)}
              </div>
            </div>
          </div>
        </div>
      </React.Fragment>
    );
  };

  const filteredChatList = chatList.filter((chat) =>
    chat.participant.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#04ADEE] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden bg-white">
      <div
        className={`${
          showMobileConversations ? 'block' : 'hidden'
        } lg:block w-full lg:w-80 bg-white border-r border-gray-200 flex flex-col`}
      >
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Messages</h2>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-100 border-none rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#04ADEE]"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredChatList.length === 0 ? (
            <div className="text-center py-12 px-4">
              <p className="text-gray-500">No conversations found</p>
            </div>
          ) : (
            filteredChatList.map((chat) => (
              <button
                key={chat.chatId}
                onClick={() => {
                  setSelectedChat(chat);
                  setShowMobileConversations(false);
                }}
                className={`w-full p-4 flex items-start space-x-3 hover:bg-gray-50 transition-colors border-b border-gray-100 ${
                  selectedChat?.chatId === chat.chatId ? 'bg-blue-50' : ''
                }`}
              >
                <div className="relative">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold"
                    style={{ backgroundColor: getAvatarColor(chat.participant.name) }}
                  >
                    {chat.participant.initials}
                  </div>
                </div>

                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 text-sm truncate">
                        {chat.participant.name}
                      </h3>
                      {presenceMap.has(chat.participant.name) && (
                        <p className="text-xs text-gray-500">
                          {presenceMap.get(chat.participant.name)?.status === 'online' ? (
                            <span className="text-green-600">Active now</span>
                          ) : (
                            formatLastActive(presenceMap.get(chat.participant.name)!.lastActive)
                          )}
                        </p>
                      )}
                    </div>
                    {chat.lastMessage && (
                      <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                        {formatTime(chat.lastMessage.timestamp)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600 truncate">
                      {chat.lastMessage?.content || 'Start chatting'}
                    </p>
                    {chat.unreadCount > 0 && (
                      <span className="ml-2 px-2 py-0.5 bg-[#04ADEE] text-white text-xs rounded-full flex-shrink-0">
                        {chat.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {selectedChat ? (
        <div className={`${showMobileConversations ? 'hidden' : 'flex'} lg:flex flex-1 flex-col`}>
          <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              <button
                onClick={() => setShowMobileConversations(true)}
                className="lg:hidden p-2 hover:bg-gray-100 rounded-lg flex-shrink-0"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="relative flex-shrink-0">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
                  style={{ backgroundColor: getAvatarColor(selectedChat.participant.name) }}
                >
                  {selectedChat.participant.initials}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 truncate">{selectedChat.participant.name}</h3>
                {presenceMap.has(selectedChat.participant.name) ? (
                  <p className="text-xs text-gray-500">
                    {presenceMap.get(selectedChat.participant.name)?.status === 'online' ? (
                      <span className="text-green-600">Active now</span>
                    ) : (
                      formatLastActive(presenceMap.get(selectedChat.participant.name)!.lastActive)
                    )}
                  </p>
                ) : (
                  <p className="text-xs text-gray-500 capitalize">{selectedChat.participant.role}</p>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2 flex-shrink-0">
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <MoreVertical className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Send className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No messages yet. Start the conversation!</p>
                </div>
              </div>
            ) : (
              messages.map(renderMessage)
            )}
            {uploadingFile && uploadingFile.status === 'uploading' && (
              <div className="flex justify-end mb-4">
                <div className="bg-[#04ADEE] text-white px-4 py-2 rounded-2xl rounded-br-sm">
                  <div className="flex items-center space-x-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Uploading... {Math.round(uploadingFile.progress)}%</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="bg-white border-t border-gray-200 px-6 py-4">
            <div className="flex items-end space-x-3">
              <div className="relative">
                <button
                  onClick={() => setShowAttachMenu(!showAttachMenu)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Paperclip className="w-5 h-5 text-gray-600" />
                </button>

                {showAttachMenu && (
                  <div className="absolute bottom-full mb-2 left-0 bg-white rounded-lg shadow-lg border border-gray-200 py-2 w-48 z-10">
                    <button
                      onClick={() => handleAttachClick('image')}
                      className="w-full px-4 py-2 flex items-center space-x-3 hover:bg-gray-50 transition-colors text-left"
                    >
                      <ImageIcon className="w-5 h-5 text-blue-600" />
                      <span className="text-sm text-gray-700">Image</span>
                    </button>
                    <button
                      onClick={() => handleAttachClick('video')}
                      className="w-full px-4 py-2 flex items-center space-x-3 hover:bg-gray-50 transition-colors text-left"
                    >
                      <Video className="w-5 h-5 text-purple-600" />
                      <span className="text-sm text-gray-700">Video</span>
                    </button>
                    <button
                      onClick={() => handleAttachClick('file')}
                      className="w-full px-4 py-2 flex items-center space-x-3 hover:bg-gray-50 transition-colors text-left"
                    >
                      <FileText className="w-5 h-5 text-green-600" />
                      <span className="text-sm text-gray-700">File</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="flex-1 relative">
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !sending && messageInput.trim()) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Type a message..."
                  className="w-full px-4 py-3 bg-gray-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#04ADEE]"
                  disabled={uploadingFile !== null}
                />
              </div>

              <button
                onClick={handleSendMessage}
                disabled={!messageInput.trim() || sending || uploadingFile !== null}
                className="p-3 bg-[#04ADEE] hover:bg-[#0396d5] disabled:bg-gray-300 disabled:cursor-not-allowed rounded-full transition-colors"
              >
                {sending ? <Loader2 className="w-5 h-5 text-white animate-spin" /> : <Send className="w-5 h-5 text-white" />}
              </button>
            </div>

            <input
              ref={imageInputRef}
              type="file"
              className="hidden"
              accept="image/*"
              onChange={(e) => handleFileSelect(e, 'image')}
            />
            <input
              ref={videoInputRef}
              type="file"
              className="hidden"
              accept="video/*"
              onChange={(e) => handleFileSelect(e, 'video')}
            />
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx,.txt,.xlsx,.xls,.ppt,.pptx"
              onChange={(e) => handleFileSelect(e, 'file')}
            />
          </div>
        </div>
      ) : (
        <div className="hidden lg:flex flex-1 items-center justify-center bg-white">
          <div className="text-center">
            <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <Send className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Select a conversation</h3>
            <p className="text-gray-500">Choose a conversation from the list to start messaging</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;
