import React from 'react';
import CounselorScholarshipsPage from '../CounselorScholarshipsPage';

const MobileCounselorScholarships: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50">
      <CounselorScholarshipsPage onBack={() => {}} onLogout={() => {}} />
    </div>
  );
};

export default MobileCounselorScholarships;
