import React, { useState, useEffect } from 'react';
import { Search, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { Counselor } from '../../services/counselorAuthService';
import { getAssignedStudentsFromFirebase, FirebaseAssignedStudent } from '../../services/assignedStudentsService';

interface MobileCounselorAssignedStudentsProps {
  counselor: Counselor;
}

const MobileCounselorAssignedStudents: React.FC<MobileCounselorAssignedStudentsProps> = ({ counselor }) => {
  const [students, setStudents] = useState<FirebaseAssignedStudent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedStudents, setExpandedStudents] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchAssignedStudents();
  }, [counselor.name]);

  const fetchAssignedStudents = async () => {
    if (counselor.role === 'pool_management') {
      setIsLoading(true);
      try {
        const assigned = await getAssignedStudentsFromFirebase(counselor.name);
        setStudents(assigned);
      } catch (error) {
        console.error('Error fetching assigned students:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const filteredStudents = students.filter(student => {
    if (!searchTerm.trim()) return true;
    const searchLower = searchTerm.toLowerCase();
    const studentNameMatch = student.name.toLowerCase().includes(searchLower);
    const universityMatch = student.universities.some(uni =>
      uni.name.toLowerCase().includes(searchLower)
    );
    return studentNameMatch || universityMatch;
  });

  const toggleExpanded = (studentId: string) => {
    setExpandedStudents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(studentId)) {
        newSet.delete(studentId);
      } else {
        newSet.add(studentId);
      }
      return newSet;
    });
  };

  if (isLoading) {
    return (
      <div className="p-6 text-center">
        <div className="w-12 h-12 border-4 border-[#04ADEE] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-sm text-slate-600">Loading assigned students...</p>
      </div>
    );
  }

  return (
    <div className="pb-4">
      {/* Search */}
      <div className="px-4 py-3 bg-white border-b border-slate-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search students or universities..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm"
          />
        </div>
      </div>

      {/* Student List */}
      <div className="px-4 py-3 space-y-3">
        {filteredStudents.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-slate-500 text-sm">
              {searchTerm ? 'No students found' : 'No assigned students yet'}
            </p>
          </div>
        ) : (
          filteredStudents.map(student => {
            const isExpanded = expandedStudents.has(student.id);
            return (
              <div key={student.id} className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                <div className="p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900 text-sm">{student.name}</h3>
                      <p className="text-xs text-slate-600">{student.email}</p>
                    </div>
                    <div className="px-2 py-1 bg-[#04ADEE]/10 text-[#04ADEE] rounded text-xs font-medium">
                      {student.universities.length} unis
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-3">
                      <p className="text-xs text-slate-600">{student.description}</p>

                      <div>
                        <p className="text-xs font-medium text-slate-700 mb-1.5">Career Interests:</p>
                        <div className="flex flex-wrap gap-1">
                          {student.careerInterests.map((interest, idx) => (
                            <span key={idx} className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-xs">
                              {interest}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div>
                        <p className="text-xs font-medium text-slate-700 mb-1.5">Assigned Universities:</p>
                        <div className="space-y-2">
                          {student.universities.map((uni, idx) => (
                            <div key={idx} className="p-2 bg-slate-50 rounded border border-slate-200">
                              <p className="font-medium text-sm text-slate-900">{uni.name}</p>
                              <p className="text-xs text-slate-500 mt-0.5">{uni.deadline}</p>
                              {uni.requirements && (
                                <p className="text-xs text-slate-600 mt-1">{uni.requirements}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="text-xs text-slate-500">
                        Assigned on: {new Date(student.assignedDate).toLocaleDateString()}
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => toggleExpanded(student.id)}
                  className="w-full px-3 py-2 bg-slate-50 border-t border-slate-200 flex items-center justify-center gap-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
                >
                  {isExpanded ? (
                    <>Show Less <ChevronUp className="w-4 h-4" /></>
                  ) : (
                    <>Show More <ChevronDown className="w-4 h-4" /></>
                  )}
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default MobileCounselorAssignedStudents;
