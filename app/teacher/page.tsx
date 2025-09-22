"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import AttendanceHistory from "@/components/teacher/attendance-history";
import ClassManagement from "@/components/teacher/class-management";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Calendar, Clock, CheckCircle } from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/teacher", icon: <Users className="h-5 w-5" />, current: true },
  { name: "Attendance", href: "/teacher/attendance", icon: <CheckCircle className="h-5 w-5" /> },
  { name: "Classes", href: "/teacher/classes", icon: <Calendar className="h-5 w-5" /> },
  { name: "Reports", href: "/teacher/reports", icon: <Clock className="h-5 w-5" /> },
];

export default function TeacherDashboard() {
  return (
    <DashboardLayout title="Teacher Dashboard" userType="teacher" navigation={navigation}>
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Classes</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">12</div>
              <p className="text-xs text-muted-foreground">+2 from last month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Students</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">245</div>
              <p className="text-xs text-muted-foreground">+12 from last month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">3</div>
              <p className="text-xs text-muted-foreground">Currently running</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Attendance</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">87%</div>
              <p className="text-xs text-muted-foreground">+5% from last month</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 gap-6">
          <ClassManagement />
        </div>

        <AttendanceHistory />
      </div>
    </DashboardLayout>
  );
}
