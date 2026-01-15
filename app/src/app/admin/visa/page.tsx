import { requireAuth, getTenantId } from '@/lib/auth/utils';
import { db } from '@/db';
import { users, students } from '@/db/schema/core';
import { eq, and, sql } from 'drizzle-orm';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, Clock } from 'lucide-react';

interface VisaStudent {
  id: string;
  studentId: string;
  studentNumber: string | null;
  name: string;
  email: string;
  nationality: string | null;
  visaType: string | null;
  visaExpiryDate: string | null;
  status: string;
}

interface VisaStats {
  total: number;
  valid: number;
  expiringSoon: number;
  urgent: number;
  expired: number;
}

function calculateDaysUntilExpiry(expiryDate: string | null): number | null {
  if (!expiryDate) return null;
  const today = new Date();
  const expiry = new Date(expiryDate);
  const diffTime = expiry.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

function getVisaStatus(daysUntilExpiry: number | null): {
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  icon?: React.ReactNode;
} {
  if (daysUntilExpiry === null) {
    return { label: 'Unknown', variant: 'outline' };
  }
  if (daysUntilExpiry < 0) {
    return {
      label: 'Expired',
      variant: 'destructive',
      icon: <AlertTriangle className="h-3 w-3" />,
    };
  }
  if (daysUntilExpiry < 30) {
    return {
      label: 'Urgent',
      variant: 'destructive',
      icon: <AlertTriangle className="h-3 w-3" />,
    };
  }
  if (daysUntilExpiry < 90) {
    return {
      label: 'Expiring Soon',
      variant: 'secondary',
      icon: <Clock className="h-3 w-3" />,
    };
  }
  return {
    label: 'Valid',
    variant: 'default',
    icon: <CheckCircle className="h-3 w-3" />,
  };
}

async function getVisaStudents(): Promise<VisaStudent[]> {
  try {
    const tenantId = await getTenantId();
    if (!tenantId) {
      console.error('No tenant ID available');
      return [];
    }

    // Set RLS context
    await db.execute(sql.raw(`SET app.user_email = 'eoinmaleoin@gmail.com'`));
    await db.execute(sql.raw(`SET app.tenant_id = '${tenantId}'`));

    // Query students with is_visa_student = true
    const result = await db
      .select({
        id: users.id,
        studentId: students.id,
        studentNumber: students.studentNumber,
        name: users.name,
        email: users.email,
        nationality: users.nationality,
        visaType: students.visaType,
        visaExpiryDate: students.visaExpiryDate,
        status: students.status,
      })
      .from(students)
      .leftJoin(users, eq(students.userId, users.id))
      .where(and(eq(students.tenantId, tenantId), eq(students.isVisaStudent, true)))
      .orderBy(sql`${students.visaExpiryDate} ASC NULLS LAST`);

    return result as VisaStudent[];
  } catch (error) {
    console.error('Error fetching visa students:', error);
    return [];
  }
}

function calculateStats(students: VisaStudent[]): VisaStats {
  const stats: VisaStats = {
    total: students.length,
    valid: 0,
    expiringSoon: 0,
    urgent: 0,
    expired: 0,
  };

  students.forEach(student => {
    const days = calculateDaysUntilExpiry(student.visaExpiryDate);
    if (days === null) return;

    if (days < 0) {
      stats.expired++;
    } else if (days < 30) {
      stats.urgent++;
    } else if (days < 90) {
      stats.expiringSoon++;
    } else {
      stats.valid++;
    }
  });

  return stats;
}

function StatsCards({ stats }: { stats: VisaStats }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Visa Students</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Valid</CardTitle>
          <CheckCircle className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.valid}</div>
          <p className="text-xs text-muted-foreground">&gt; 90 days</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
          <Clock className="h-4 w-4 text-amber-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.expiringSoon}</div>
          <p className="text-xs text-muted-foreground">30-90 days</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Urgent</CardTitle>
          <AlertTriangle className="h-4 w-4 text-red-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.urgent}</div>
          <p className="text-xs text-muted-foreground">&lt; 30 days</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Expired</CardTitle>
          <AlertTriangle className="h-4 w-4 text-red-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.expired}</div>
          <p className="text-xs text-muted-foreground">Immediate action</p>
        </CardContent>
      </Card>
    </div>
  );
}

function VisaStudentsTable({ students }: { students: VisaStudent[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Visa Students</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Student Number</TableHead>
              <TableHead>Nationality</TableHead>
              <TableHead>Visa Type</TableHead>
              <TableHead>Expiry Date</TableHead>
              <TableHead>Days Remaining</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  No visa students found
                </TableCell>
              </TableRow>
            ) : (
              students.map(student => {
                const daysRemaining = calculateDaysUntilExpiry(student.visaExpiryDate);
                const statusInfo = getVisaStatus(daysRemaining);

                return (
                  <TableRow key={student.studentId}>
                    <TableCell>
                      <Link
                        href={`/admin/students/${student.id}`}
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {student.name}
                      </Link>
                    </TableCell>
                    <TableCell>{student.studentNumber || '-'}</TableCell>
                    <TableCell>{student.nationality || '-'}</TableCell>
                    <TableCell>{student.visaType || '-'}</TableCell>
                    <TableCell>
                      {student.visaExpiryDate
                        ? new Date(student.visaExpiryDate).toLocaleDateString('en-IE', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {daysRemaining !== null ? (
                        daysRemaining < 0 ? (
                          <span className="text-red-600 font-medium">
                            {Math.abs(daysRemaining)} days ago
                          </span>
                        ) : (
                          <span>{daysRemaining} days</span>
                        )
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusInfo.variant} className="flex items-center gap-1 w-fit">
                        {statusInfo.icon}
                        {statusInfo.label}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export default async function VisaTrackingPage() {
  await requireAuth();

  const students = await getVisaStudents();
  const stats = calculateStats(students);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Visa Tracking</h1>
        <p className="text-muted-foreground">Monitor visa expiry dates and compliance status</p>
      </div>

      <StatsCards stats={stats} />

      <VisaStudentsTable students={students} />
    </div>
  );
}
