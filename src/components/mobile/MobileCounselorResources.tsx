import React from 'react';
import CounselorResourcesPage from '../CounselorResourcesPage';

const MobileCounselorResources: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50">
      <CounselorResourcesPage onBack={() => {}} onLogout={() => {}} />
    </div>
  );
};

export default MobileCounselorResources;
