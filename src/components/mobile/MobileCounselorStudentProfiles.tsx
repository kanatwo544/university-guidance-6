import React, { useState } from 'react';
import { Counselor } from '../../services/counselorAuthService';
import StudentProfiles from '../StudentProfiles';
import StudentProfileDetails from '../StudentProfileDetails';

interface MobileCounselorStudentProfilesProps {
  counselor: Counselor;
}

const MobileCounselorStudentProfiles: React.FC<MobileCounselorStudentProfilesProps> = ({ counselor }) => {
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  if (selectedStudentId) {
    return (
      <div className="min-h-screen bg-slate-50">
        <StudentProfileDetails
          studentId={selectedStudentId}
          onBack={() => setSelectedStudentId(null)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <StudentProfiles onSelectStudent={setSelectedStudentId} />
    </div>
  );
};

export default MobileCounselorStudentProfiles;
