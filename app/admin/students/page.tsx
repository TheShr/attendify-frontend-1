'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { User, Users, GraduationCap } from 'lucide-react'

export default function AdminStudentsPage() {
  const navigation = [
    { name: 'Dashboard', href: '/admin', icon: <User className="h-5 w-5" /> },
    { name: 'Users', href: '/admin/users', icon: <Users className="h-5 w-5" /> },
    { name: 'Teachers', href: '/admin/teachers', icon: <GraduationCap className="h-5 w-5" /> },
    { name: 'Students', href: '/admin/students', icon: <Users className="h-5 w-5" />, current: true },
  ]

  const students = [
    { id: 'S001', name: 'Alice Johnson', course: 'B.Tech CSE, 3rd Year' },
    { id: 'S002', name: 'Bob Singh', course: 'B.Sc Physics, 2nd Year' },
  ]

  return (
    <DashboardLayout title="Students" userType="admin" navigation={navigation}>
      <Card>
        <CardHeader><CardTitle>Student Directory</CardTitle></CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {students.map(s => (
              <li key={s.id} className="border rounded-md p-3">
                <div className="font-medium">{s.name}</div>
                <div className="text-sm text-muted-foreground">{s.course}</div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </DashboardLayout>
  )
}
