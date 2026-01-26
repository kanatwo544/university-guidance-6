import React from 'react';
import { Counselor } from '../../services/counselorAuthService';
import EssayReview from '../EssayReview';

interface MobileEssayReviewProps {
  counselor: Counselor;
}

const MobileEssayReview: React.FC<MobileEssayReviewProps> = ({ counselor }) => {
  return (
    <div className="min-h-screen bg-slate-50">
      <EssayReview />
    </div>
  );
};

export default MobileEssayReview;
