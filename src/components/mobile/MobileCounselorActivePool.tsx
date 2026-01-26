import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, Users, UserCheck, Settings, ChevronDown, ChevronUp } from 'lucide-react';
import { Counselor } from '../../services/counselorAuthService';
import { getCounselorPoolData } from '../../services/poolManagementService';
import AnimatedCounter from '../AnimatedCounter';
import CircularProgress from '../CircularProgress';
import AssignmentModal from '../AssignmentModal';
import WeightingModal from '../WeightingModal';

type CompositeFilter = 'all' | '90-100' | '80-89' | '70-79' | 'below-70';

interface Student {
  id: string;
  name: string;
  email: string;
  description: string;
  careerInterests: string[];
  essayActivities: number;
  academicPerformance: number;
  academicTrend: number;
  compositeStrength: number;
  strengthLabel: 'Strong' | 'Competitive' | 'Developing';
  composite_score: number;
  academic_performance: number;
  essay_activities_rating: number;
  academic_trend: number;
}

interface MobileCounselorActivePoolProps {
  counselor: Counselor;
}

const MobileCounselorActivePool: React.FC<MobileCounselorActivePoolProps> = ({ counselor }) => {
  const [activeStudents, setActiveStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [compositeFilter, setCompositeFilter] = useState<CompositeFilter>('all');
  const [expandedStudents, setExpandedStudents] = useState<Set<string>>(new Set());
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showWeightingModal, setShowWeightingModal] = useState(false);
  const [poolManagementData, setPoolManagementData] = useState<any>(null);

  useEffect(() => {
    fetchPoolData();
  }, [counselor.name]);

  const fetchPoolData = async () => {
    if (counselor.role === 'pool_management') {
      setIsLoading(true);
      try {
        const poolData = await getCounselorPoolData(counselor.name);
        setActiveStudents(poolData.activeStudents as Student[]);
        setPoolManagementData({
          totalCaseload: poolData.totalCaseload,
          totalAssigned: poolData.totalAssigned,
          averageStrength: poolData.averageStrength,
          progress: poolData.progress
        });
      } catch (error) {
        console.error('Error fetching pool data:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const filteredAndSortedStudents = useMemo(() => {
    let filtered = [...activeStudents];
    if (compositeFilter !== 'all') {
      filtered = filtered.filter(student => {
        const score = student.compositeStrength;
        switch (compositeFilter) {
          case '90-100': return score >= 90 && score <= 100;
          case '80-89': return score >= 80 && score < 90;
          case '70-79': return score >= 70 && score < 80;
          case 'below-70': return score < 70;
          default: return true;
        }
      });
    }
    return filtered.sort((a, b) => b.compositeStrength - a.compositeStrength);
  }, [activeStudents, compositeFilter]);

  const avgStrength = poolManagementData?.averageStrength || 0;
  const totalAssigned = poolManagementData?.totalAssigned || 0;
  const totalOriginal = poolManagementData?.totalCaseload || 0;

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

  const getStrengthColor = (label: string) => {
    switch (label) {
      case 'Strong': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
      case 'Competitive': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'Developing': return 'text-amber-600 bg-amber-50 border-amber-200';
      default: return 'text-slate-600 bg-slate-50 border-slate-200';
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 text-center">
        <div className="w-12 h-12 border-4 border-[#04ADEE] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-sm text-slate-600">Loading pool data...</p>
      </div>
    );
  }

  return (
    <div className="pb-4">
      {/* Stats Section */}
      <div className="bg-gradient-to-r from-[#04ADEE]/10 via-emerald-50 to-[#04ADEE]/10 px-4 py-4 border-b border-[#04ADEE]/20">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-slate-900">Pool Dashboard</h2>
          <button
            onClick={() => setShowWeightingModal(true)}
            className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold"
          >
            <Settings className="w-3.5 h-3.5" />
            Weighting
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-lg border border-slate-200 p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Users className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-xs font-medium text-slate-600">Active Pool</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-slate-900">
                <AnimatedCounter end={filteredAndSortedStudents.length} duration={1500} />
              </span>
              <span className="text-xs text-slate-600">students</span>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <UserCheck className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-xs font-medium text-slate-600">Assigned</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-slate-900">
                <AnimatedCounter end={totalAssigned} duration={1500} />
              </span>
              <span className="text-xs text-slate-600">students</span>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-xs font-medium text-slate-600">Avg Strength</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-[#04ADEE]">
                <AnimatedCounter end={avgStrength} duration={1500} decimals={1} />
              </span>
              <span className="text-xs text-slate-600">%</span>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-3">
            <span className="text-xs font-medium text-slate-600 block mb-1">Progress</span>
            <div className="mb-1.5">
              <span className="text-lg font-bold text-slate-900">
                <AnimatedCounter end={totalAssigned} duration={1500} /> / <AnimatedCounter end={totalOriginal} duration={1500} />
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${(totalAssigned / totalOriginal) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="px-4 py-3 bg-white border-b border-slate-200">
        <label className="text-xs font-medium text-slate-600 block mb-1.5">Filter by Composite Score</label>
        <select
          value={compositeFilter}
          onChange={(e) => setCompositeFilter(e.target.value as CompositeFilter)}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
        >
          <option value="all">All Students</option>
          <option value="90-100">90-100 (Strong)</option>
          <option value="80-89">80-89 (Competitive)</option>
          <option value="70-79">70-79 (Developing)</option>
          <option value="below-70">Below 70</option>
        </select>
      </div>

      {/* Student List */}
      <div className="px-4 py-3 space-y-3">
        {filteredAndSortedStudents.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-slate-500 text-sm">No students in active pool</p>
          </div>
        ) : (
          filteredAndSortedStudents.map(student => {
            const isExpanded = expandedStudents.has(student.id);
            return (
              <div key={student.id} className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                <div className="p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900 text-sm">{student.name}</h3>
                      <p className="text-xs text-slate-600">{student.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <CircularProgress percentage={student.compositeStrength} size={40} />
                    </div>
                  </div>

                  <div className={`inline-block px-2 py-1 rounded-md border text-xs font-medium ${getStrengthColor(student.strengthLabel)}`}>
                    {student.strengthLabel}
                  </div>

                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                      <p className="text-xs text-slate-600">{student.description}</p>

                      <div>
                        <p className="text-xs font-medium text-slate-700 mb-1">Career Interests:</p>
                        <div className="flex flex-wrap gap-1">
                          {student.careerInterests.map((interest, idx) => (
                            <span key={idx} className="px-2 py-0.5 bg-[#04ADEE]/10 text-[#04ADEE] rounded text-xs">
                              {interest}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2">
                        <div>
                          <p className="text-xs text-slate-500">Academic</p>
                          <p className="text-lg font-bold text-slate-900">{student.academicPerformance}%</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Essay/Activities</p>
                          <p className="text-lg font-bold text-slate-900">{student.essayActivities}%</p>
                        </div>
                      </div>

                      <button
                        onClick={() => setSelectedStudent(student)}
                        className="w-full mt-2 px-3 py-2 bg-[#04ADEE] text-white rounded-lg text-sm font-medium"
                      >
                        Assign Universities
                      </button>
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

      {/* Assignment Modal */}
      {selectedStudent && (
        <AssignmentModal
          student={selectedStudent}
          counselorName={counselor.name}
          onClose={() => setSelectedStudent(null)}
          onAssignmentComplete={() => {
            setSelectedStudent(null);
            fetchPoolData();
          }}
        />
      )}

      {/* Weighting Modal */}
      {showWeightingModal && (
        <WeightingModal
          counselorName={counselor.name}
          onClose={() => setShowWeightingModal(false)}
          onSave={() => {
            setShowWeightingModal(false);
            fetchPoolData();
          }}
        />
      )}
    </div>
  );
};

export default MobileCounselorActivePool;
