import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Paperclip,
  Image as ImageIcon,
  FileText,
  Download,
  Check,
  CheckCheck,
  Search,
  MoreVertical,
  Smile,
  X,
  ArrowLeft
} from 'lucide-react';
import {
  ChatParticipant,
  ChatMessage,
  getChatParticipantsForCounselor,
  getChatParticipantsForStudent,
  initializeChatCounts,
  sendMessage,
  subscribeToMessages,
  resetUnreadCount,
  getUnreadCount,
  getLastMessage,
  isCounselor,
  getAvatarColor,
} from '../services/chatService';
import { getUserFromStorage } from '../services/userStorage';

interface Conversation {
  participantName: string;
  participantRole: 'counselor' | 'student';
  initials: string;
  avatarColor: string;
  lastMessage: string;
  unreadCount: number;
}

interface ChatProps {
  userRole?: 'student' | 'counselor';
}

const Chat: React.FC<ChatProps> = ({ userRole: propUserRole }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showMobileConversations, setShowMobileConversations] = useState(true);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [userName, setUserName] = useState<string>('');
  const [userRole, setUserRole] = useState<'student' | 'counselor'>('student');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const unsubscribeMessagesRef = useRef<(() => void) | null>(null);

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
        console.log('Retrieved user from storage:', user);

        if (!user) {
          console.error('No user found in storage');
          setLoading(false);
          return;
        }

        const name = user.name;
        console.log('User name:', name);

        const isUserCounselor = await isCounselor(name);
        const role = isUserCounselor ? 'counselor' : 'student';

        console.log('Determined user role from Firebase:', role);

        setUserRole(role);
        setUserName(name);

        let participants: ChatParticipant[] = [];

        if (role === 'counselor') {
          console.log('Fetching participants for counselor...');
          participants = await getChatParticipantsForCounselor(name);
          console.log('Counselor participants received:', participants);
        } else {
          console.log('Fetching participants for student...');
          participants = await getChatParticipantsForStudent(name);
          console.log('Student participants received:', participants);
        }

        console.log('Initializing chat counts...');
        await initializeChatCounts(name, participants);

        console.log('Getting conversation details...');
        const conversationsWithDetails = await Promise.all(
          participants.map(async (participant) => {
            const lastMessage = await getLastMessage(name, participant.name);
            const unreadCount = await getUnreadCount(name, participant.name);

            return {
              participantName: participant.name,
              participantRole: participant.role,
              initials: participant.initials,
              avatarColor: getAvatarColor(participant.name),
              lastMessage,
              unreadCount,
            };
          })
        );

        console.log('Conversations with details:', conversationsWithDetails);
        setConversations(conversationsWithDetails);
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
    };
  }, []);

  useEffect(() => {
    if (selectedConversation && userName) {
      if (unsubscribeMessagesRef.current) {
        unsubscribeMessagesRef.current();
      }

      const unsubscribe = subscribeToMessages(
        userName,
        selectedConversation.participantName,
        (newMessages) => {
          setMessages(newMessages);
        }
      );

      unsubscribeMessagesRef.current = unsubscribe;

      resetUnreadCount(userName, selectedConversation.participantName);

      setConversations((prev) =>
        prev.map((conv) =>
          conv.participantName === selectedConversation.participantName
            ? { ...conv, unreadCount: 0 }
            : conv
        )
      );

      return () => {
        if (unsubscribeMessagesRef.current) {
          unsubscribeMessagesRef.current();
        }
      };
    }
  }, [selectedConversation, userName]);

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedConversation || !userName) return;

    try {
      setSending(true);
      await sendMessage(userName, selectedConversation.participantName, messageInput.trim());
      setMessageInput('');

      const lastMessage = messageInput.trim();
      setConversations((prev) =>
        prev.map((conv) =>
          conv.participantName === selectedConversation.participantName
            ? { ...conv, lastMessage }
            : conv
        )
      );
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleConversationClick = async (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setShowMobileConversations(false);
  };

  const handleFileAttach = (type: 'image' | 'document') => {
    setShowAttachMenu(false);
    fileInputRef.current?.click();
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

  const getStatusIcon = (isMe: boolean) => {
    if (!isMe) return null;
    return <CheckCheck className="w-4 h-4 text-blue-500" />;
  };

  const renderMessage = (message: ChatMessage) => {
    const isMe = message.senderId === 'me';

    return (
      <div key={message.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-4`}>
        <div className={`flex ${isMe ? 'flex-row-reverse' : 'flex-row'} items-end max-w-[70%]`}>
          {!isMe && (
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm mr-2"
              style={{ backgroundColor: selectedConversation?.avatarColor || '#04ADEE' }}
            >
              {selectedConversation?.initials || 'U'}
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
              <p className="text-sm">{message.content}</p>
            </div>

            <div className={`flex items-center space-x-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
              <span className="text-xs text-gray-500">{formatMessageTime(message.timestamp)}</span>
              {getStatusIcon(isMe)}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const filteredConversations = conversations.filter((conv) =>
    conv.participantName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#04ADEE] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      <div className={`${showMobileConversations ? 'block' : 'hidden'} lg:block w-full lg:w-80 bg-white border-r border-gray-200 flex flex-col`}>
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
          {filteredConversations.length === 0 ? (
            <div className="text-center py-12 px-4">
              <p className="text-gray-500">No conversations found</p>
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <button
                key={conv.participantName}
                onClick={() => handleConversationClick(conv)}
                className={`w-full p-4 flex items-start space-x-3 hover:bg-gray-50 transition-colors border-b border-gray-100 ${
                  selectedConversation?.participantName === conv.participantName ? 'bg-blue-50' : ''
                }`}
              >
                <div className="relative">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold"
                    style={{ backgroundColor: conv.avatarColor }}
                  >
                    {conv.initials}
                  </div>
                </div>

                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-gray-900 text-sm truncate">
                      {conv.participantName}
                    </h3>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600 truncate">
                      {conv.lastMessage}
                    </p>
                    {conv.unreadCount > 0 && (
                      <span className="ml-2 px-2 py-0.5 bg-[#04ADEE] text-white text-xs rounded-full">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {selectedConversation ? (
        <div className={`${showMobileConversations ? 'hidden' : 'flex'} lg:flex flex-1 flex-col`}>
          <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowMobileConversations(true)}
                className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="relative">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
                  style={{ backgroundColor: selectedConversation.avatarColor }}
                >
                  {selectedConversation.initials}
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{selectedConversation.participantName}</h3>
                <p className="text-xs text-gray-500 capitalize">{selectedConversation.participantRole}</p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <MoreVertical className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
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
                  <div className="absolute bottom-full mb-2 left-0 bg-white rounded-lg shadow-lg border border-gray-200 py-2 w-48">
                    <button
                      onClick={() => handleFileAttach('image')}
                      className="w-full px-4 py-2 flex items-center space-x-3 hover:bg-gray-50 transition-colors text-left"
                    >
                      <ImageIcon className="w-5 h-5 text-blue-600" />
                      <span className="text-sm text-gray-700">Upload Image</span>
                    </button>
                    <button
                      onClick={() => handleFileAttach('document')}
                      className="w-full px-4 py-2 flex items-center space-x-3 hover:bg-gray-50 transition-colors text-left"
                    >
                      <FileText className="w-5 h-5 text-green-600" />
                      <span className="text-sm text-gray-700">Upload Document</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="flex-1 relative">
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !sending && handleSendMessage()}
                  placeholder="Type a message..."
                  className="w-full px-4 py-3 bg-gray-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#04ADEE] pr-10"
                />
                <button className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-200 rounded transition-colors">
                  <Smile className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              <button
                onClick={handleSendMessage}
                disabled={!messageInput.trim() || sending}
                className="p-3 bg-[#04ADEE] hover:bg-[#0396d5] disabled:bg-gray-300 disabled:cursor-not-allowed rounded-full transition-colors"
              >
                <Send className="w-5 h-5 text-white" />
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept="image/*,.pdf,.doc,.docx"
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
