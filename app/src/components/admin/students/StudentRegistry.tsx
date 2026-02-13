'use client';

import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { StudentFilters } from './StudentFilters';
import { StudentList, type StudentWithMetadata } from './StudentList';
import { StudentDetailDrawer } from './StudentDetailDrawer';
import { approveLevelStatus } from '@/app/admin/students/_actions/studentActions';

interface StudentRegistryProps {
  students: StudentWithMetadata[];
  currentUserRole?: string;
}

export function StudentRegistry({ students, currentUserRole = 'admin' }: StudentRegistryProps) {
  const searchParams = useSearchParams();
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Get current filters from URL
  const currentView = searchParams.get('view') || 'all';
  const currentStatus = searchParams.get('status') || '';
  const currentLevel = searchParams.get('level') || '';
  const searchQuery = searchParams.get('search') || '';

  // Filter students based on URL params
  const filteredStudents = useMemo(() => {
    let filtered = [...students];

    // Apply saved view filters
    switch (currentView) {
      case 'active':
        filtered = filtered.filter(s => s.status === 'active');
        break;
      case 'visa-expiring':
        filtered = filtered.filter(s => {
          if (!s.visa_expiry) return false;
          const expiryDate = new Date(s.visa_expiry);
          const today = new Date();
          const daysUntilExpiry = Math.floor(
            (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
          );
          return daysUntilExpiry >= 0 && daysUntilExpiry <= 30;
        });
        break;
      case 'new-this-week':
        filtered = filtered.filter(s => {
          const createdDate = new Date(s.createdAt || s.created_at || 0);
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          return createdDate >= weekAgo;
        });
        break;
      case 'at-risk':
        filtered = filtered.filter(s => {
          return (
            s.attendance_rate !== null && s.attendance_rate !== undefined && s.attendance_rate < 80
          );
        });
        break;
      // 'all' - no additional filtering
    }

    // Apply status filter
    if (currentStatus) {
      filtered = filtered.filter(s => s.status === currentStatus);
    }

    // Apply level filter
    if (currentLevel) {
      filtered = filtered.filter(s => s.currentLevel === currentLevel || s.current_level === currentLevel);
    }

    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        s => s.name.toLowerCase().includes(query) || s.email.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [students, currentView, currentStatus, currentLevel, searchQuery]);

  // Get selected student
  const selectedStudent = useMemo(() => {
    if (!selectedStudentId) return null;
    return students.find(s => s.id === selectedStudentId) || null;
  }, [selectedStudentId, students]);

  // Handlers
  const handleStudentClick = (studentId: string) => {
    setSelectedStudentId(studentId);
    setIsDrawerOpen(true);
  };

  const handleDrawerClose = () => {
    setIsDrawerOpen(false);
    // Small delay before clearing selected student for smooth animation
    setTimeout(() => setSelectedStudentId(null), 300);
  };

  const handleApproveLevel = async (studentId: string) => {
    const result = await approveLevelStatus(studentId);
    if (!result.success) {
      throw new Error(result.error || 'Failed to approve level');
    }
    // The page will revalidate automatically via server action
  };

  // Permission checks
  const canApproveLevel = currentUserRole === 'admin' || currentUserRole === 'dos';
  const canViewSensitiveNotes = currentUserRole === 'admin' || currentUserRole === 'dos';

  return (
    <div className="space-y-6">
      {/* Filters Section */}
      <StudentFilters />

      {/* Results Count */}
      <div className="text-sm text-gray-600">
        Showing <span className="font-semibold text-gray-900">{filteredStudents.length}</span> of{' '}
        <span className="font-semibold text-gray-900">{students.length}</span> students
      </div>

      {/* Student List */}
      <StudentList students={filteredStudents} onStudentClick={handleStudentClick} />

      {/* Student Detail Drawer */}
      <StudentDetailDrawer
        student={selectedStudent}
        isOpen={isDrawerOpen}
        onClose={handleDrawerClose}
        onApproveLevel={handleApproveLevel}
        canApproveLevel={canApproveLevel}
        canViewSensitiveNotes={canViewSensitiveNotes}
      />
    </div>
  );
}
