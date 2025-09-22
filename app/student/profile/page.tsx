'use client'

import React from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Calendar, CheckCircle, Clock, AlertCircle } from 'lucide-react'

export default function StudentProfilePage() {
  // In a real app, fetch this from /api/profile using the logged-in user.
  // For now, read minimal info from localStorage and fill the rest with placeholders.
  const user = typeof window !== 'undefined'
    ? JSON.parse(localStorage.getItem('user') || '{"name":"John Doe","email":"john@example.com","role":"STUDENT"}')
    : { name: 'John Doe', email: 'john@example.com' }

  const profile = {
    photoUrl: '',
    name: user.name || 'John Doe',
    email: user.email || 'john@example.com',
    phone: '+91-00000-00000',
    enrollment: 'ENR-2024-00123',
    username: (user.name || 'john').toLowerCase().replace(/\s+/g, ''),
    course: 'B.Tech Computer Science',
    year: '3rd Year',
  }

  const navigation = [
    { name: 'Dashboard', href: '/student', icon: <Calendar className="h-5 w-5" /> },
    { name: 'Attendance', href: '/student/attendance', icon: <CheckCircle className="h-5 w-5" /> },
    { name: 'Schedule', href: '/student/schedule', icon: <Clock className="h-5 w-5" /> },
    { name: 'Profile', href: '/student/profile', icon: <AlertCircle className="h-5 w-5" />, current: true },
  ]

  return (
    <DashboardLayout title="Profile" userType="student" navigation={navigation}>
      <Card>
        <CardHeader>
          <CardTitle>Student Profile</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Header row with photo + name/email */}
          <div className="flex items-center gap-4 mb-6">
            <Avatar className="h-16 w-16">
              <AvatarImage src={profile.photoUrl} alt={profile.name} />
              <AvatarFallback>
                {profile.name
                  .split(' ')
                  .map((n: string) => n[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()
                }
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="text-lg font-semibold">{profile.name}</div>
              <div className="text-sm text-muted-foreground">{profile.email}</div>
            </div>
          </div>

          {/* Read-only details grid */}
          <div className="grid gap-4 md:grid-cols-2">
            <ReadonlyField label="Phone" value={profile.phone} />
            <ReadonlyField label="Enrollment" value={profile.enrollment} />
            <ReadonlyField label="Username" value={profile.username} />
            <ReadonlyField label="Course" value={profile.course} />
            <ReadonlyField label="Year" value={profile.year} />
          </div>

          {/* No Save button  profile is read-only for students */}
          <p className="mt-6 text-xs text-muted-foreground">
            This profile is view-only. Updates can be made by the Admin from the Admin Panel.
          </p>
        </CardContent>
      </Card>
    </DashboardLayout>
  )
}

function ReadonlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">{value}</div>
    </div>
  )
}
