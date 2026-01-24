import { database } from '../config/firebase';
import { ref, onValue, set, push, query, orderByKey, get, off } from 'firebase/database';

export interface ChatParticipant {
  name: string;
  role: 'student' | 'counselor';
  initials: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  recipientName: string;
  content: string;
  timestamp: number;
}

export interface ChatConversation {
  chatId: string;
  participantName: string;
  participantRole: 'student' | 'counselor';
  lastMessage: string;
  unreadCount: number;
}

const getInitials = (name: string): string => {
  let cleanName = name.trim();

  // Strip titles (Mr, Ms, Miss, Mrs) from the beginning
  const titles = ['Mr ', 'Ms ', 'Miss ', 'Mrs '];
  for (const title of titles) {
    if (cleanName.startsWith(title)) {
      cleanName = cleanName.substring(title.length);
      break;
    }
  }

  const parts = cleanName.trim().split(' ');
  if (parts.length >= 2) {
    return parts[0][0] + parts[parts.length - 1][0];
  }
  return cleanName.substring(0, 2);
};

export const getAvatarColor = (name: string): string => {
  // Generate consistent color based on name
  const colors = [
    '#04ADEE', // Blue
    '#10B981', // Green
    '#F59E0B', // Orange
    '#EF4444', // Red
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#14B8A6', // Teal
    '#F97316', // Dark Orange
    '#6366F1', // Indigo
    '#84CC16', // Lime
  ];

  // Hash the name to get a consistent index
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

export const isCounselor = async (userName: string): Promise<boolean> => {
  try {
    console.log('=== Checking if user is a counselor ===');
    console.log('User name:', userName);

    const namePrefixCheck = userName.startsWith('Mr ') ||
                           userName.startsWith('Ms ') ||
                           userName.startsWith('Miss ');
    console.log('Name starts with Mr/Ms/Miss:', namePrefixCheck);

    const paths = [
      'University Data/Data',
      'Schoolss'
    ];

    for (const basePath of paths) {
      console.log(`Checking path: ${basePath}`);
      const dataRef = ref(database, basePath);
      const dataSnapshot = await get(dataRef);

      if (!dataSnapshot.exists()) {
        console.log(`❌ Path not found: ${basePath}`);
        continue;
      }

      const schoolsData = dataSnapshot.val();
      const schoolNames = Object.keys(schoolsData);
      console.log(`Found ${schoolNames.length} schools in ${basePath}:`, schoolNames);

      for (const schoolName of schoolNames) {
        const counselorsPath = `${basePath}/${schoolName}/Counsellors`;
        const counselorsRef = ref(database, counselorsPath);
        const counselorsSnapshot = await get(counselorsRef);

        if (counselorsSnapshot.exists()) {
          const counselors = counselorsSnapshot.val();

          if (counselors[userName] === true) {
            console.log(`✓ Found "${userName}" as counselor in ${basePath}/${schoolName}`);
            return true;
          }
        }
      }
    }

    console.log(`❌ "${userName}" not found as counselor in any Firebase node`);
    console.log(`→ This user is a STUDENT`);
    return false;
  } catch (error) {
    console.error('Error checking if user is counselor:', error);
    console.log('→ Defaulting to STUDENT role');
    return false;
  }
};

const createChatId = (name1: string, name2: string): string => {
  return `${name1}${name2}`;
};

export const getChatParticipantsForCounselor = async (
  counselorName: string
): Promise<ChatParticipant[]> => {
  const participants: ChatParticipant[] = [];

  try {
    console.log('=== Getting chat participants for counselor ===');
    console.log('Counselor name:', counselorName);

    // Navigate to the Data node and search through all schools
    const dataPath = 'University Data/Data';
    console.log('Searching for counselor in:', dataPath);

    const dataRef = ref(database, dataPath);
    const dataSnapshot = await get(dataRef);

    if (!dataSnapshot.exists()) {
      console.error('❌ Data node not found at:', dataPath);
      return [];
    }

    const schoolsData = dataSnapshot.val();
    const schoolNames = Object.keys(schoolsData);
    console.log(`Found ${schoolNames.length} schools:`, schoolNames);

    let counselorSchool: string | null = null;

    // Search for the counselor in all schools
    for (const schoolName of schoolNames) {
      const counselorsPath = `${dataPath}/${schoolName}/Counsellors`;
      const counselorsRef = ref(database, counselorsPath);
      const counselorsSnapshot = await get(counselorsRef);

      if (counselorsSnapshot.exists()) {
        const counselors = counselorsSnapshot.val();

        // Check if this counselor exists in this school
        if (counselors[counselorName] === true) {
          counselorSchool = schoolName;
          console.log(`✓ Found counselor in school: ${schoolName}`);
          break;
        }
      }
    }

    if (!counselorSchool) {
      console.error(`❌ Counselor "${counselorName}" not found in any school under Data node`);
      console.log('Searched through schools:', schoolNames);
      return [];
    }

    // Get all counselors from this school
    const schoolCounselorsPath = `${dataPath}/${counselorSchool}/Counsellors`;
    const schoolCounselorsRef = ref(database, schoolCounselorsPath);
    const schoolCounselorsSnapshot = await get(schoolCounselorsRef);

    if (schoolCounselorsSnapshot.exists()) {
      const allSchoolCounselors = schoolCounselorsSnapshot.val();
      const counselorNames = Object.keys(allSchoolCounselors).filter(
        name => name !== counselorName
      );

      console.log(`Found ${counselorNames.length} other counselors in ${counselorSchool}:`, counselorNames);

      counselorNames.forEach((otherCounselorName) => {
        participants.push({
          name: otherCounselorName,
          role: 'counselor',
          initials: getInitials(otherCounselorName),
        });
      });
      console.log(`✓ Added ${counselorNames.length} counselors to chat participants`);
    }

    // Get all students from this school
    const schoolStudentsPath = `${dataPath}/${counselorSchool}/Students`;
    const schoolStudentsRef = ref(database, schoolStudentsPath);
    const schoolStudentsSnapshot = await get(schoolStudentsRef);

    if (schoolStudentsSnapshot.exists()) {
      const allSchoolStudents = schoolStudentsSnapshot.val();
      const studentNames = Object.keys(allSchoolStudents);

      console.log(`Found ${studentNames.length} students in ${counselorSchool}:`, studentNames);

      studentNames.forEach((studentName) => {
        participants.push({
          name: studentName,
          role: 'student',
          initials: getInitials(studentName),
        });
      });
      console.log(`✓ Added ${studentNames.length} students to chat participants`);
    } else {
      console.log('ℹ️ No students found in this school');
    }

    console.log('\n=== Summary ===');
    console.log(`School found: ${counselorSchool}`);
    console.log('Total participants found:', participants.length);
    console.log('- Students:', participants.filter(p => p.role === 'student').length);
    console.log('- Counselors:', participants.filter(p => p.role === 'counselor').length);
    console.log('All participants:', participants);
    return participants;
  } catch (error) {
    console.error('❌ Error getting chat participants for counselor:', error);
    return [];
  }
};

export const getChatParticipantsForStudent = async (
  studentName: string
): Promise<ChatParticipant[]> => {
  const participants: ChatParticipant[] = [];

  try {
    let assignedCounselor: string | null = null;
    let studentSchool: string | null = null;

    const caseloadsRef = ref(database, 'University Data/Caseloads');
    const caseloadsSnapshot = await get(caseloadsRef);

    if (caseloadsSnapshot.exists()) {
      const caseloads = caseloadsSnapshot.val();

      for (const counselorName in caseloads) {
        const students = caseloads[counselorName];
        if (students[studentName]) {
          assignedCounselor = counselorName;
          break;
        }
      }
    }

    if (assignedCounselor) {
      participants.push({
        name: assignedCounselor,
        role: 'counselor',
        initials: getInitials(assignedCounselor),
      });
    }

    const schoolCounselorsRef = ref(database, 'University Data/School Counsellors');
    const schoolCounselorsSnapshot = await get(schoolCounselorsRef);

    if (schoolCounselorsSnapshot.exists() && assignedCounselor) {
      const schools = schoolCounselorsSnapshot.val();

      for (const schoolName in schools) {
        const counselors = schools[schoolName];

        if (counselors[assignedCounselor]) {
          studentSchool = schoolName;

          Object.keys(counselors).forEach((counselorKey) => {
            if (counselorKey !== assignedCounselor) {
              participants.push({
                name: counselorKey,
                role: 'counselor',
                initials: getInitials(counselorKey),
              });
            }
          });
          break;
        }
      }
    }

    return participants;
  } catch (error) {
    console.error('Error getting chat participants for student:', error);
    return [];
  }
};

export const initializeChatCounts = async (
  userName: string,
  participants: ChatParticipant[]
): Promise<void> => {
  try {
    for (const participant of participants) {
      const chatId = createChatId(userName, participant.name);
      const countRef = ref(database, `University Data/Inboxes/Counts/${chatId}/${participant.name}`);

      const snapshot = await get(countRef);
      if (!snapshot.exists()) {
        await set(countRef, 0);
      }
    }
  } catch (error) {
    console.error('Error initializing chat counts:', error);
  }
};

export const sendMessage = async (
  senderName: string,
  recipientName: string,
  message: string
): Promise<void> => {
  try {
    const chatId = createChatId(senderName, recipientName);
    const timestamp = Date.now();

    const messageRef = ref(database, `University Data/Inboxes/${chatId}/${timestamp}`);
    await set(messageRef, {
      [recipientName]: '',
      [senderName]: message,
    });

    const otherChatId = createChatId(recipientName, senderName);
    const countRef = ref(database, `University Data/Inboxes/Counts/${otherChatId}/${senderName}`);

    const countSnapshot = await get(countRef);
    const currentCount = countSnapshot.exists() ? countSnapshot.val() : 0;
    await set(countRef, currentCount + 1);
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

export const getMessages = async (
  userName: string,
  otherUserName: string
): Promise<ChatMessage[]> => {
  try {
    const chatId1 = createChatId(userName, otherUserName);
    const chatId2 = createChatId(otherUserName, userName);

    const messages: ChatMessage[] = [];

    const messagesRef1 = ref(database, `University Data/Inboxes/${chatId1}`);
    const snapshot1 = await get(messagesRef1);

    if (snapshot1.exists()) {
      const data = snapshot1.val();
      for (const timestamp in data) {
        if (timestamp !== 'Counts') {
          const messageData = data[timestamp];
          const senderName = Object.keys(messageData).find(key => messageData[key] !== '');
          const recipientName = Object.keys(messageData).find(key => messageData[key] === '');

          if (senderName && recipientName) {
            messages.push({
              id: timestamp,
              senderId: senderName === userName ? 'me' : otherUserName,
              senderName: senderName,
              recipientName: recipientName,
              content: messageData[senderName],
              timestamp: parseInt(timestamp),
            });
          }
        }
      }
    }

    const messagesRef2 = ref(database, `University Data/Inboxes/${chatId2}`);
    const snapshot2 = await get(messagesRef2);

    if (snapshot2.exists()) {
      const data = snapshot2.val();
      for (const timestamp in data) {
        if (timestamp !== 'Counts') {
          const messageData = data[timestamp];
          const senderName = Object.keys(messageData).find(key => messageData[key] !== '');
          const recipientName = Object.keys(messageData).find(key => messageData[key] === '');

          if (senderName && recipientName) {
            messages.push({
              id: timestamp,
              senderId: senderName === userName ? 'me' : otherUserName,
              senderName: senderName,
              recipientName: recipientName,
              content: messageData[senderName],
              timestamp: parseInt(timestamp),
            });
          }
        }
      }
    }

    return messages.sort((a, b) => a.timestamp - b.timestamp);
  } catch (error) {
    console.error('Error getting messages:', error);
    return [];
  }
};

export const subscribeToMessages = (
  userName: string,
  otherUserName: string,
  callback: (messages: ChatMessage[]) => void
): (() => void) => {
  const chatId1 = createChatId(userName, otherUserName);
  const chatId2 = createChatId(otherUserName, userName);

  const messagesRef1 = ref(database, `University Data/Inboxes/${chatId1}`);
  const messagesRef2 = ref(database, `University Data/Inboxes/${chatId2}`);

  const processMessages = async () => {
    const messages = await getMessages(userName, otherUserName);
    callback(messages);
  };

  onValue(messagesRef1, processMessages);
  onValue(messagesRef2, processMessages);

  return () => {
    off(messagesRef1);
    off(messagesRef2);
  };
};

export const getUnreadCount = async (
  userName: string,
  otherUserName: string
): Promise<number> => {
  try {
    const chatId = createChatId(userName, otherUserName);
    const countRef = ref(database, `University Data/Inboxes/Counts/${chatId}/${userName}`);

    const snapshot = await get(countRef);
    return snapshot.exists() ? snapshot.val() : 0;
  } catch (error) {
    console.error('Error getting unread count:', error);
    return 0;
  }
};

export const resetUnreadCount = async (
  userName: string,
  otherUserName: string
): Promise<void> => {
  try {
    const chatId = createChatId(userName, otherUserName);
    const countRef = ref(database, `University Data/Inboxes/Counts/${chatId}/${userName}`);

    await set(countRef, 0);
  } catch (error) {
    console.error('Error resetting unread count:', error);
  }
};

export const subscribeToUnreadCounts = (
  userName: string,
  participants: ChatParticipant[],
  callback: (counts: { [participantName: string]: number }) => void
): (() => void) => {
  const unsubscribeFunctions: (() => void)[] = [];

  participants.forEach((participant) => {
    const chatId = createChatId(userName, participant.name);
    const countRef = ref(database, `University Data/Inboxes/Counts/${chatId}/${userName}`);

    const unsubscribe = onValue(countRef, (snapshot) => {
      const counts: { [participantName: string]: number } = {};
      participants.forEach((p) => {
        counts[p.name] = 0;
      });

      if (snapshot.exists()) {
        counts[participant.name] = snapshot.val();
      }

      callback(counts);
    });

    unsubscribeFunctions.push(() => off(countRef));
  });

  return () => {
    unsubscribeFunctions.forEach((unsubscribe) => unsubscribe());
  };
};

export const getLastMessage = async (
  userName: string,
  otherUserName: string
): Promise<string> => {
  try {
    const messages = await getMessages(userName, otherUserName);

    if (messages.length > 0) {
      return messages[messages.length - 1].content;
    }

    return 'Tap to start chatting';
  } catch (error) {
    console.error('Error getting last message:', error);
    return 'Tap to start chatting';
  }
};
