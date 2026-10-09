import { LayoutDashboard, Car, Wrench, ScanSearch, FolderOpen, Receipt, FileBarChart, Sparkles, Bell, User, Settings } from 'lucide-react'

export const mainNav = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/vehicles', label: 'My Vehicles', icon: Car },
  { to: '/service', label: 'Service & Maintenance', short: 'Service', icon: Wrench },
  { to: '/analyzer', label: 'Analyzer', icon: ScanSearch },
  { to: '/documents', label: 'Documents', icon: FolderOpen },
  { to: '/expenses', label: 'Expenses', icon: Receipt },
  { to: '/reports', label: 'Reports', icon: FileBarChart },
  { to: '/assistant', label: 'AI Assistant', short: 'Assistant', icon: Sparkles },
]

export const accountNav = [
  { to: '/notifications', label: 'Notifications', icon: Bell },
  { to: '/profile', label: 'Profile', icon: User },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export const mobileTabs = ['/dashboard', '/vehicles', '/service', '/assistant']
