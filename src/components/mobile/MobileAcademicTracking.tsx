import React from 'react';
import { GraduationCap } from 'lucide-react';
import { Counselor } from '../../services/counselorAuthService';
import AcademicTracking from '../AcademicTracking';

interface MobileAcademicTrackingProps {
  counselor: Counselor;
}

const MobileAcademicTracking: React.FC<MobileAcademicTrackingProps> = ({ counselor }) => {
  return (
    <div className="min-h-screen bg-slate-50">
      <AcademicTracking />
    </div>
  );
};

export default MobileAcademicTracking;
