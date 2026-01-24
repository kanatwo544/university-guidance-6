import { ref, get, set, push } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { database, storage } from '../config/firebase';

export interface DriveDocument {
  id: string;
  studentName: string;
  fileName: string;
  fileType: string;
  link: string;
  uploadedBy: string;
  uploadedOn: string;
}

export const getAllSchoolStudents = async (counselorName: string): Promise<string[]> => {
  try {
    const schoolCounselorsRef = ref(database, 'University Data/School Counsellors');
    const snapshot = await get(schoolCounselorsRef);

    if (!snapshot.exists()) {
      return [];
    }

    let schoolCounselors: string[] = [];
    let foundSchool = '';

    const schools = snapshot.val();
    for (const schoolName in schools) {
      const counselors = schools[schoolName];
      if (counselors && counselors[counselorName] === true) {
        foundSchool = schoolName;
        schoolCounselors = Object.keys(counselors);
        break;
      }
    }

    if (!foundSchool || schoolCounselors.length === 0) {
      return [];
    }

    const allStudents = new Set<string>();
    const caseloadsRef = ref(database, 'University Data/Caseloads');
    const caseloadsSnapshot = await get(caseloadsRef);

    if (!caseloadsSnapshot.exists()) {
      return [];
    }

    const caseloads = caseloadsSnapshot.val();
    for (const counselor of schoolCounselors) {
      if (caseloads[counselor]) {
        const students = Object.keys(caseloads[counselor]);
        students.forEach(student => allStudents.add(student));
      }
    }

    return Array.from(allStudents).sort();
  } catch (error) {
    console.error('Error fetching school students:', error);
    throw error;
  }
};

export const getStudentDocuments = async (studentName: string): Promise<DriveDocument[]> => {
  try {
    const driveRef = ref(database, 'University Data/EduCare Drive');
    const snapshot = await get(driveRef);

    if (!snapshot.exists()) {
      return [];
    }

    const documents: DriveDocument[] = [];
    const allDocs = snapshot.val();

    for (const docId in allDocs) {
      const doc = allDocs[docId];
      if (doc.studentName === studentName) {
        documents.push({
          id: docId,
          studentName: doc.studentName,
          fileName: doc.fileName || 'Untitled Document',
          fileType: doc.fileType || 'unknown',
          link: doc.link,
          uploadedBy: doc['Uploaded by'] || doc.uploadedBy || 'Unknown',
          uploadedOn: doc['Uploaded on'] || doc.uploadedOn || 'Unknown',
        });
      }
    }

    return documents.sort((a, b) => {
      const dateA = new Date(a.uploadedOn);
      const dateB = new Date(b.uploadedOn);
      return dateB.getTime() - dateA.getTime();
    });
  } catch (error) {
    console.error('Error fetching student documents:', error);
    throw error;
  }
};

export const getAllDocumentsCount = async (): Promise<number> => {
  try {
    const driveRef = ref(database, 'University Data/EduCare Drive');
    const snapshot = await get(driveRef);

    if (!snapshot.exists()) {
      return 0;
    }

    return Object.keys(snapshot.val()).length;
  } catch (error) {
    console.error('Error counting documents:', error);
    return 0;
  }
};

export const uploadDocument = async (
  file: File,
  studentName: string,
  counselorName: string
): Promise<void> => {
  try {
    if (!storage) {
      throw new Error('Firebase Storage is not initialized. Please check your Firebase configuration.');
    }

    const timestamp = new Date();
    const formattedDate = `${String(timestamp.getDate()).padStart(2, '0')}/${String(timestamp.getMonth() + 1).padStart(2, '0')}/${timestamp.getFullYear()}`;

    const fileExtension = file.name.split('.').pop();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storageFileName = `educare_drive/${studentName}/${Date.now()}_${sanitizedFileName}`;

    console.log('Uploading file to Firebase Storage:', storageFileName);

    const fileRef = storageRef(storage, storageFileName);
    const uploadResult = await uploadBytes(fileRef, file);
    console.log('File uploaded successfully:', uploadResult);

    const downloadURL = await getDownloadURL(fileRef);
    console.log('Download URL obtained:', downloadURL);

    const driveRef = ref(database, 'University Data/EduCare Drive');
    const newDocRef = push(driveRef);

    await set(newDocRef, {
      studentName,
      fileName: file.name,
      fileType: fileExtension || 'unknown',
      link: downloadURL,
      'Uploaded by': counselorName,
      'Uploaded on': formattedDate,
      uploadedAt: timestamp.toISOString(),
    });

    console.log('Document metadata saved to database');
  } catch (error: any) {
    console.error('Error uploading document:', error);
    if (error?.code === 'storage/unauthorized') {
      throw new Error('Permission denied. Please check Firebase Storage security rules.');
    } else if (error?.code === 'storage/canceled') {
      throw new Error('Upload was canceled.');
    } else if (error?.code === 'storage/unknown') {
      throw new Error('An unknown error occurred. Please check your Firebase configuration.');
    } else if (error?.message) {
      throw new Error(error.message);
    } else {
      throw new Error('Failed to upload document. Please check your internet connection and try again.');
    }
  }
};

export const deleteDocument = async (documentId: string): Promise<void> => {
  try {
    const docRef = ref(database, `University Data/EduCare Drive/${documentId}`);
    await set(docRef, null);
  } catch (error) {
    console.error('Error deleting document:', error);
    throw error;
  }
};
