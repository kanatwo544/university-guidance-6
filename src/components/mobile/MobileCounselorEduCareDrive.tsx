import React from 'react';
import { Counselor } from '../../services/counselorAuthService';
import EduCareDrive from '../EduCareDrive';

interface MobileCounselorEduCareDriveProps {
  counselor: Counselor;
}

const MobileCounselorEduCareDrive: React.FC<MobileCounselorEduCareDriveProps> = ({ counselor }) => {
  return (
    <div className="min-h-screen bg-slate-50">
      <EduCareDrive counselorName={counselor.name} />
    </div>
  );
};

export default MobileCounselorEduCareDrive;
