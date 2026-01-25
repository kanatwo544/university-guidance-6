import { database } from '../config/firebase';
import { ref, get } from 'firebase/database';

export interface UserRoleInfo {
  schoolName: string;
  role: 'counsellor' | 'student';
  userName: string;
}

export const detectUserRole = async (userName: string): Promise<UserRoleInfo | null> => {
  try {
    console.log('=== ROLE DETECTION STARTING ===');
    console.log('User name:', userName);

    const dataRef = ref(database, 'University Data/Data');
    const snapshot = await get(dataRef);

    if (!snapshot.exists()) {
      console.error('❌ No data found at: University Data/Data');
      return null;
    }

    const allSchools = snapshot.val();
    const schoolNames = Object.keys(allSchools);
    console.log(`Found ${schoolNames.length} schools to search:`, schoolNames);

    for (const schoolName of schoolNames) {
      console.log(`\n🔍 Checking school: ${schoolName}`);

      const counsellorsPath = `University Data/Data/${schoolName}/Counsellors`;
      const counsellorsRef = ref(database, counsellorsPath);
      const counsellorsSnapshot = await get(counsellorsRef);

      if (counsellorsSnapshot.exists()) {
        const counsellors = counsellorsSnapshot.val();
        if (counsellors[userName] === true) {
          console.log(`✅ MATCH FOUND: ${userName} is a COUNSELLOR in ${schoolName}`);
          return {
            schoolName,
            role: 'counsellor',
            userName,
          };
        }
      }

      const studentsPath = `University Data/Data/${schoolName}/Students`;
      const studentsRef = ref(database, studentsPath);
      const studentsSnapshot = await get(studentsRef);

      if (studentsSnapshot.exists()) {
        const students = studentsSnapshot.val();
        if (students[userName] === true) {
          console.log(`✅ MATCH FOUND: ${userName} is a STUDENT in ${schoolName}`);
          return {
            schoolName,
            role: 'student',
            userName,
          };
        }
      }
    }

    console.log(`❌ No match found for user: ${userName}`);
    return null;
  } catch (error) {
    console.error('Error detecting user role:', error);
    return null;
  }
};

export interface SchoolMember {
  name: string;
  role: 'counsellor' | 'student';
  initials: string;
}

const getInitials = (name: string): string => {
  const cleanName = name.trim().replace(/^(Mr |Ms |Miss |Mrs )/i, '');
  const parts = cleanName.trim().split(' ');

  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return cleanName.substring(0, 2).toUpperCase();
};

export const getSchoolMembers = async (
  schoolName: string,
  currentUserName: string,
  userRole: 'counsellor' | 'student'
): Promise<SchoolMember[]> => {
  try {
    console.log('=== GETTING SCHOOL MEMBERS ===');
    console.log('School:', schoolName);
    console.log('Current user:', currentUserName);
    console.log('User role:', userRole);

    const members: SchoolMember[] = [];

    const counsellorsPath = `University Data/Data/${schoolName}/Counsellors`;
    const counsellorsRef = ref(database, counsellorsPath);
    const counsellorsSnapshot = await get(counsellorsRef);

    if (counsellorsSnapshot.exists()) {
      const counsellors = counsellorsSnapshot.val();
      const counsellorNames = Object.keys(counsellors);

      counsellorNames.forEach((name) => {
        if (name !== currentUserName) {
          members.push({
            name,
            role: 'counsellor',
            initials: getInitials(name),
          });
        }
      });

      console.log(`✓ Found ${counsellorNames.length} counsellors (excluding current user)`);
    }

    if (userRole === 'counsellor') {
      const studentsPath = `University Data/Data/${schoolName}/Students`;
      const studentsRef = ref(database, studentsPath);
      const studentsSnapshot = await get(studentsRef);

      if (studentsSnapshot.exists()) {
        const students = studentsSnapshot.val();
        const studentNames = Object.keys(students);

        studentNames.forEach((name) => {
          members.push({
            name,
            role: 'student',
            initials: getInitials(name),
          });
        });

        console.log(`✓ Found ${studentNames.length} students`);
      }
    }

    console.log(`Total members: ${members.length}`);
    return members;
  } catch (error) {
    console.error('Error getting school members:', error);
    return [];
  }
};
