import React, { useState, useEffect } from 'react';
import { Search, Upload, FileText, Image, File, Download, Trash2, ArrowLeft, FolderOpen, Users, Database } from 'lucide-react';
import {
  getAllSchoolStudents,
  getStudentDocuments,
  getAllDocumentsCount,
  uploadDocument,
  deleteDocument,
  DriveDocument,
} from '../services/eduCareDriveService';

interface EduCareDriveProps {
  counselorName: string;
}

const EduCareDrive: React.FC<EduCareDriveProps> = ({ counselorName }) => {
  const [students, setStudents] = useState<string[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [documents, setDocuments] = useState<DriveDocument[]>([]);
  const [totalDocuments, setTotalDocuments] = useState(0);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    loadStudents();
    loadDocumentCount();
  }, [counselorName]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredStudents(students);
    } else {
      const filtered = students.filter(student =>
        student.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredStudents(filtered);
    }
  }, [searchQuery, students]);

  const loadStudents = async () => {
    try {
      setLoading(true);
      const studentList = await getAllSchoolStudents(counselorName);
      setStudents(studentList);
      setFilteredStudents(studentList);
    } catch (err) {
      setError('Failed to load students');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadDocumentCount = async () => {
    try {
      const count = await getAllDocumentsCount();
      setTotalDocuments(count);
    } catch (err) {
      console.error('Failed to load document count:', err);
    }
  };

  const loadStudentDocuments = async (studentName: string) => {
    try {
      setLoading(true);
      setSelectedStudent(studentName);
      const docs = await getStudentDocuments(studentName);
      setDocuments(docs);
    } catch (err) {
      setError('Failed to load documents');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedStudent) return;

    const validTypes = [
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/jpg',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];

    if (!validTypes.includes(file.type)) {
      setError('Please upload a valid document or image file (PDF, DOCX, XLSX, PNG, JPG)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    try {
      setUploading(true);
      setError(null);
      await uploadDocument(file, selectedStudent, counselorName);
      setSuccessMessage('Document uploaded successfully!');
      await loadStudentDocuments(selectedStudent);
      await loadDocumentCount();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to upload document';
      setError(`Upload failed: ${errorMessage}`);
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;

    try {
      await deleteDocument(documentId);
      setSuccessMessage('Document deleted successfully!');
      if (selectedStudent) {
        await loadStudentDocuments(selectedStudent);
        await loadDocumentCount();
      }
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError('Failed to delete document');
      console.error(err);
    }
  };

  const getFileIcon = (fileType: string) => {
    const type = fileType.toLowerCase();
    if (type === 'pdf') return <FileText className="w-5 h-5 text-red-500" />;
    if (['png', 'jpg', 'jpeg'].includes(type)) return <Image className="w-5 h-5 text-blue-500" />;
    return <File className="w-5 h-5 text-gray-500" />;
  };

  const handleBackToList = () => {
    setSelectedStudent(null);
    setDocuments([]);
    setError(null);
  };

  if (loading && students.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#04ADEE] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading EduCare Drive...</p>
        </div>
      </div>
    );
  }

  if (!selectedStudent) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">EduCare Drive</h1>
          <p className="text-gray-600">Manage and access student documents securely</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#04ADEE]/10 rounded-xl p-6 border border-[#04ADEE]/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#04ADEE] text-sm font-semibold mb-1">Total Students</p>
                <p className="text-4xl font-bold text-gray-900">{students.length}</p>
              </div>
              <div className="bg-[#04ADEE]/10 p-4 rounded-lg">
                <Users className="w-8 h-8 text-[#04ADEE]" />
              </div>
            </div>
          </div>

          <div className="bg-green-500/10 rounded-xl p-6 border border-green-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-600 text-sm font-semibold mb-1">Total Documents</p>
                <p className="text-4xl font-bold text-gray-900">{totalDocuments}</p>
              </div>
              <div className="bg-green-500/10 p-4 rounded-lg">
                <Database className="w-8 h-8 text-green-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search for a student..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#04ADEE] focus:border-transparent"
              />
            </div>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="space-y-2">
            {filteredStudents.length === 0 ? (
              <div className="text-center py-12">
                <FolderOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">
                  {searchQuery ? 'No students found matching your search' : 'No students available'}
                </p>
              </div>
            ) : (
              filteredStudents.map((student) => (
                <button
                  key={student}
                  onClick={() => loadStudentDocuments(student)}
                  className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200 hover:border-[#04ADEE]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#04ADEE] rounded-full flex items-center justify-center text-white font-semibold">
                      {student.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium text-gray-900">{student}</span>
                  </div>
                  <ArrowLeft className="w-5 h-5 text-gray-400 transform rotate-180" />
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={handleBackToList}
            className="flex items-center gap-2 text-[#04ADEE] hover:text-[#0396d5] mb-3 transition-colors font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Students
          </button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{selectedStudent}</h1>
          <p className="text-gray-600">Documents and Files</p>
        </div>

        <label className="cursor-pointer">
          <input
            type="file"
            onChange={handleFileUpload}
            disabled={uploading}
            className="hidden"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
          />
          <div className="flex items-center gap-2 px-6 py-3 bg-[#04ADEE] text-white rounded-lg hover:bg-[#0396d5] transition-colors disabled:opacity-50">
            <Upload className="w-5 h-5" />
            <span className="font-medium">{uploading ? 'Uploading...' : 'Upload Document'}</span>
          </div>
        </label>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-600">{successMessage}</p>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#04ADEE] mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading documents...</p>
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-12">
            <FolderOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Documents Yet</h3>
            <p className="text-gray-500 mb-6">
              There are no documents uploaded for {selectedStudent} yet.
            </p>
            <p className="text-sm text-gray-400">Click the "Upload Document" button above to add files.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Uploaded Documents ({documents.length})
            </h3>
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-[#04ADEE] transition-colors cursor-pointer group"
                onClick={() => window.open(doc.link, '_blank')}
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="flex-shrink-0">{getFileIcon(doc.fileType)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate group-hover:text-[#04ADEE] transition-colors">{doc.fileName}</p>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                      <span>Uploaded by: {doc.uploadedBy}</span>
                      <span>•</span>
                      <span>Date: {doc.uploadedOn}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={doc.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="p-2 text-[#04ADEE] hover:bg-blue-50 rounded-lg transition-colors"
                    title="Download"
                  >
                    <Download className="w-5 h-5" />
                  </a>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteDocument(doc.id);
                    }}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default EduCareDrive;
