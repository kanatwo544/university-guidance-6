import React, { useState, useEffect } from 'react';
import { Menu, X, Bell, GraduationCap, Users, UserCheck, FileText, Award, BookOpen, Calendar, MessageSquare, FolderOpen, LogOut, Settings } from 'lucide-react';
import { Counselor } from '../../services/counselorAuthService';
import { useNotificationCounts } from '../../hooks/useNotificationCounts';
import MobileAcademicTracking from './MobileAcademicTracking';
import MobileCounselorActivePool from './MobileCounselorActivePool';
import MobileCounselorAssignedStudents from './MobileCounselorAssignedStudents';
import MobileEssayReview from './MobileEssayReview';
import MobileCounselorScholarships from './MobileCounselorScholarships';
import MobileCounselorResources from './MobileCounselorResources';
import MobileMeetingRequests from './MobileMeetingRequests';
import MobileCounselorInbox from './MobileCounselorInbox';
import MobileCounselorStudentProfiles from './MobileCounselorStudentProfiles';
import MobileCounselorEduCareDrive from './MobileCounselorEduCareDrive';

type TabType = 'academic' | 'active' | 'assigned' | 'essays' | 'scholarships' | 'resources' | 'meetings' | 'inbox' | 'student_profiles' | 'educare-drive';

interface MobileCounselorDashboardProps {
  counselor: Counselor;
  onLogout: () => void;
}

const MobileCounselorDashboard: React.FC<MobileCounselorDashboardProps> = ({ counselor, onLogout }) => {
  const [activeTab, setActiveTab] = useState<TabType>('active');
  const [menuOpen, setMenuOpen] = useState(false);
  const counts = useNotificationCounts(counselor);

  const getTabTitle = () => {
    const titles: Record<TabType, string> = {
      'academic': 'Student Profiles',
      'active': 'Active Pool',
      'assigned': 'Assigned Students',
      'essays': 'Essay Review',
      'scholarships': 'Scholarships',
      'resources': 'Resources',
      'meetings': 'Meeting Requests',
      'inbox': 'Inbox',
      'student_profiles': 'All Student Profiles',
      'educare-drive': 'EduCare Drive'
    };
    return titles[activeTab];
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'academic':
        return <MobileAcademicTracking counselor={counselor} />;
      case 'active':
        return <MobileCounselorActivePool counselor={counselor} />;
      case 'assigned':
        return <MobileCounselorAssignedStudents counselor={counselor} />;
      case 'essays':
        return <MobileEssayReview counselor={counselor} />;
      case 'scholarships':
        return <MobileCounselorScholarships />;
      case 'resources':
        return <MobileCounselorResources />;
      case 'meetings':
        return <MobileMeetingRequests counselor={counselor} counts={counts} />;
      case 'inbox':
        return <MobileCounselorInbox counselor={counselor} />;
      case 'student_profiles':
        return <MobileCounselorStudentProfiles counselor={counselor} />;
      case 'educare-drive':
        return <MobileCounselorEduCareDrive counselor={counselor} />;
      default:
        return <MobileCounselorActivePool counselor={counselor} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <button onClick={() => setMenuOpen(true)} className="p-2 hover:bg-slate-100 rounded-lg">
          <Menu className="w-6 h-6 text-slate-700" />
        </button>
        <h1 className="text-lg font-semibold text-slate-800">{getTabTitle()}</h1>
        <div className="w-10" />
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto pb-16">
        {renderContent()}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-2 py-2 flex items-center justify-around z-40">
        <button
          onClick={() => { setActiveTab('active'); setMenuOpen(false); }}
          className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg relative ${
            activeTab === 'active' ? 'text-[#04ADEE]' : 'text-slate-600'
          }`}
        >
          <Users className="w-5 h-5" />
          <span className="text-xs font-medium">Pool</span>
        </button>
        <button
          onClick={() => { setActiveTab('assigned'); setMenuOpen(false); }}
          className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg relative ${
            activeTab === 'assigned' ? 'text-[#04ADEE]' : 'text-slate-600'
          }`}
        >
          <UserCheck className="w-5 h-5" />
          <span className="text-xs font-medium">Assigned</span>
        </button>
        <button
          onClick={() => { setActiveTab('essays'); setMenuOpen(false); }}
          className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg relative ${
            activeTab === 'essays' ? 'text-[#04ADEE]' : 'text-slate-600'
          }`}
        >
          <FileText className="w-5 h-5" />
          <span className="text-xs font-medium">Essays</span>
          {counts.unreviewedEssays > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-semibold">
              {counts.unreviewedEssays}
            </span>
          )}
        </button>
        <button
          onClick={() => { setActiveTab('inbox'); setMenuOpen(false); }}
          className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg relative ${
            activeTab === 'inbox' ? 'text-[#04ADEE]' : 'text-slate-600'
          }`}
        >
          <MessageSquare className="w-5 h-5" />
          <span className="text-xs font-medium">Inbox</span>
          {counts.unreadMessages > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-semibold">
              {counts.unreadMessages}
            </span>
          )}
        </button>
        <button
          onClick={() => { setActiveTab('meetings'); setMenuOpen(false); }}
          className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg relative ${
            activeTab === 'meetings' ? 'text-[#04ADEE]' : 'text-slate-600'
          }`}
        >
          <Calendar className="w-5 h-5" />
          <span className="text-xs font-medium">Meet</span>
          {counts.pendingMeetings > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-semibold">
              {counts.pendingMeetings}
            </span>
          )}
        </button>
      </div>

      {/* Side Menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMenuOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-white shadow-xl flex flex-col">
            {/* Menu Header */}
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <img src="/white_logo.png" alt="EduCare" className="w-10 h-10 object-contain" />
                  <div className="flex flex-col">
                    <p className="text-xl font-bold text-[#04ADEE] leading-tight">EduCare</p>
                    <p className="text-xs text-slate-500">Counselor Portal</p>
                  </div>
                </div>
                <button onClick={() => setMenuOpen(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                  <X className="w-5 h-5 text-slate-600" />
                </button>
              </div>
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <div className="w-10 h-10 rounded-full bg-[#04ADEE] flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">{counselor.name.charAt(0)}</span>
                </div>
                <div>
                  <p className="font-medium text-slate-800">{counselor.name}</p>
                  <p className="text-xs text-slate-500 capitalize">{counselor.role.replace('_', ' ')}</p>
                </div>
              </div>
            </div>

            {/* Menu Items */}
            <nav className="flex-1 overflow-y-auto p-4 space-y-1">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 mb-2">Profiles</p>
              <button
                onClick={() => { setActiveTab('academic'); setMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                  activeTab === 'academic' ? 'bg-[#04ADEE] text-white' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <GraduationCap className="w-5 h-5" />
                <span>Student Profiles</span>
              </button>

              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 mb-2 mt-4">Pool Management</p>
              <button
                onClick={() => { setActiveTab('active'); setMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                  activeTab === 'active' ? 'bg-[#04ADEE] text-white' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Users className="w-5 h-5" />
                <span>Active Pool</span>
              </button>
              <button
                onClick={() => { setActiveTab('assigned'); setMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                  activeTab === 'assigned' ? 'bg-[#04ADEE] text-white' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <UserCheck className="w-5 h-5" />
                <span>Assigned Students</span>
              </button>

              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 mb-2 mt-4">Review</p>
              <button
                onClick={() => { setActiveTab('essays'); setMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                  activeTab === 'essays' ? 'bg-[#04ADEE] text-white' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <FileText className="w-5 h-5" />
                <span>Essay Review</span>
                {counts.unreviewedEssays > 0 && (
                  <span className={`ml-auto px-2 py-0.5 rounded-full text-xs font-semibold ${
                    activeTab === 'essays' ? 'bg-white/20 text-white' : 'bg-red-500 text-white'
                  }`}>
                    {counts.unreviewedEssays}
                  </span>
                )}
              </button>

              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 mb-2 mt-4">Communication</p>
              <button
                onClick={() => { setActiveTab('inbox'); setMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                  activeTab === 'inbox' ? 'bg-[#04ADEE] text-white' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <MessageSquare className="w-5 h-5" />
                <span>Inbox</span>
                {counts.unreadMessages > 0 && (
                  <span className={`ml-auto px-2 py-0.5 rounded-full text-xs font-semibold ${
                    activeTab === 'inbox' ? 'bg-white/20 text-white' : 'bg-red-500 text-white'
                  }`}>
                    {counts.unreadMessages}
                  </span>
                )}
              </button>
              <button
                onClick={() => { setActiveTab('meetings'); setMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                  activeTab === 'meetings' ? 'bg-[#04ADEE] text-white' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Calendar className="w-5 h-5" />
                <span>Meeting Requests</span>
                {counts.pendingMeetings > 0 && (
                  <span className={`ml-auto px-2 py-0.5 rounded-full text-xs font-semibold ${
                    activeTab === 'meetings' ? 'bg-white/20 text-white' : 'bg-red-500 text-white'
                  }`}>
                    {counts.pendingMeetings}
                  </span>
                )}
              </button>

              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 mb-2 mt-4">Resources</p>
              <button
                onClick={() => { setActiveTab('scholarships'); setMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                  activeTab === 'scholarships' ? 'bg-[#04ADEE] text-white' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Award className="w-5 h-5" />
                <span>Scholarships</span>
              </button>
              <button
                onClick={() => { setActiveTab('resources'); setMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                  activeTab === 'resources' ? 'bg-[#04ADEE] text-white' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <BookOpen className="w-5 h-5" />
                <span>Resources</span>
              </button>
              <button
                onClick={() => { setActiveTab('educare-drive'); setMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                  activeTab === 'educare-drive' ? 'bg-[#04ADEE] text-white' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <FolderOpen className="w-5 h-5" />
                <span>EduCare Drive</span>
              </button>

              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 mb-2 mt-4">More</p>
              <button
                onClick={() => { setActiveTab('student_profiles'); setMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                  activeTab === 'student_profiles' ? 'bg-[#04ADEE] text-white' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <GraduationCap className="w-5 h-5" />
                <span>All Student Profiles</span>
              </button>
            </nav>

            {/* Logout Button */}
            <div className="p-4 border-t border-slate-200">
              <button
                onClick={onLogout}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors font-medium"
              >
                <LogOut className="w-5 h-5" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileCounselorDashboard;
