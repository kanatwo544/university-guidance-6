import React from 'react';
import { Counselor } from '../../services/counselorAuthService';
import MeetingRequests from '../MeetingRequests';

interface MobileMeetingRequestsProps {
  counselor: Counselor;
  counts: any;
}

const MobileMeetingRequests: React.FC<MobileMeetingRequestsProps> = ({ counselor, counts }) => {
  return (
    <div className="min-h-screen bg-slate-50">
      <MeetingRequests counselorId={counselor.id} counselorName={counselor.name} />
    </div>
  );
};

export default MobileMeetingRequests;
