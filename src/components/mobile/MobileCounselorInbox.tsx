import React from 'react';
import { Counselor } from '../../services/counselorAuthService';
import Chat from '../Chat';

interface MobileCounselorInboxProps {
  counselor: Counselor;
}

const MobileCounselorInbox: React.FC<MobileCounselorInboxProps> = ({ counselor }) => {
  return (
    <div className="h-[calc(100vh-120px)] bg-slate-50">
      <Chat userRole="counselor" />
    </div>
  );
};

export default MobileCounselorInbox;
