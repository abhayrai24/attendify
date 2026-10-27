import {
  BarChart3,
  Bell,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  NotebookPen,
  Settings,
  Target,
} from "lucide-react";

export const NAV_SECTIONS = [
  {
    title: "Main",
    items: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "calendar", label: "Calendar", icon: CalendarDays },
      { id: "attendance", label: "Attendance", icon: ClipboardCheck },
      { id: "subjects", label: "Subjects", icon: BookOpen },
    ],
  },
  {
    title: "Analytics",
    items: [
      { id: "statistics", label: "Statistics", icon: BarChart3 },
      { id: "planner", label: "Planner", icon: Target },
    ],
  },
  {
    title: "Productivity",
    items: [
      { id: "study", label: "Study Planner", icon: GraduationCap },
      { id: "assignments", label: "Assignments", icon: ClipboardList },
      { id: "reminders", label: "Reminders", icon: Bell },
    ],
  },
];

export const BOTTOM_ITEMS = [{ id: "settings", label: "Settings", icon: Settings }];

export const ALL_ROUTES = [...NAV_SECTIONS.flatMap((s) => s.items), ...BOTTOM_ITEMS].map((i) => i.id);

export const LOGO_ICON = NotebookPen;
