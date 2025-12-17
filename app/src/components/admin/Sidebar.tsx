
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, ComponentType } from 'react';

type NavItem = {
    name: string;
    href: string;
    icon?: ComponentType<any>;
};

type NavGroup = {
    name: string;
    items: NavItem[];
    icon?: ComponentType<any>;
};

const navigation: (NavItem | NavGroup)[] = [
    { name: 'Dashboard', href: '/admin', icon: HomeIcon },
    {
        name: 'Registry',
        icon: UsersIcon,
        items: [
            { name: 'Users', href: '/admin/users' },
            { name: 'Students', href: '/admin/students' },
            { name: 'Teachers', href: '/admin/teachers' },
            { name: 'Classes', href: '/admin/classes' },
        ],
    },
    {
        name: 'Academic',
        icon: AcademicCapIcon,
        items: [
            { name: 'Timetable', href: '/admin/timetable' },
            { name: 'Attendance', href: '/admin/attendance' },
            { name: 'Progress', href: '/admin/progress' },
        ],
    },
    {
        name: 'Compliance',
        icon: ClipboardCheckIcon,
        items: [
            { name: 'Visa & Immigration', href: '/admin/compliance/visa' },
            { name: 'Regulatory Reporting', href: '/admin/compliance/regulatory' },
            { name: 'Audit Log', href: '/admin/audit-log' },
        ],
    },
    {
        name: 'System',
        icon: CogIcon,
        items: [
            { name: 'Notifications', href: '/admin/communications/notifications' },
            { name: 'Email Logs', href: '/admin/communications/email-logs' },
            { name: 'Bulk Uploads', href: '/admin/data/bulk-upload' },
            { name: 'Exports', href: '/admin/data/exports' },
            { name: 'Settings', href: '/admin/settings' },
        ],
    },
    { name: 'Help', href: '/admin/help', icon: QuestionMarkCircleIcon },
];

export default function Sidebar() {
    const pathname = usePathname();

    return (
        <div className="flex flex-col flex-grow border-r border-gray-200 pt-5 pb-4 bg-white overflow-y-auto">
            <div className="flex-grow flex flex-col">
                <nav className="flex-1 px-2 space-y-1 bg-white" aria-label="Sidebar">
                    {navigation.map((item) => (
                        'items' in item ? (
                            <NavGroup key={item.name} group={item} pathname={pathname} />
                        ) : (
                            <NavLink key={item.name} item={item} pathname={pathname} />
                        )
                    ))}
                </nav>
            </div>
        </div>
    );
}

function NavLink({ item, pathname }: { item: NavItem, pathname: string }) {
    const isActive = pathname === item.href;
    const Icon = item.icon;
    return (
        <Link
            href={item.href}
            className={`${isActive ? 'bg-indigo-50 text-indigo-600' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                } group flex items-center px-2 py-2 text-sm font-medium rounded-md`}
        >
            {Icon && (
                <Icon
                    className={`${isActive ? 'text-indigo-500' : 'text-gray-400 group-hover:text-gray-500'
                        } mr-3 flex-shrink-0 h-6 w-6`}
                    aria-hidden="true"
                />
            )}
            {item.name}
        </Link>
    );
}

function NavGroup({ group, pathname }: { group: NavGroup, pathname: string }) {
    // Auto-expand if child is active
    const hasActiveChild = group.items.some(i => pathname.startsWith(i.href));
    const [isOpen, setIsOpen] = useState(hasActiveChild);
    const Icon = group.icon;

    return (
        <div className="space-y-1">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`${hasActiveChild ? 'text-gray-900' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    } group w-full flex items-center justify-between px-2 py-2 text-sm font-medium rounded-md focus:outline-none`}
            >
                <div className="flex items-center">
                    {Icon && (
                        <Icon
                            className={`${hasActiveChild ? 'text-gray-500' : 'text-gray-400 group-hover:text-gray-500'
                                } mr-3 flex-shrink-0 h-6 w-6`}
                        />
                    )}
                    {group.name}
                </div>
                <svg
                    className={`${isOpen ? 'text-gray-400 rotate-90' : 'text-gray-300'
                        } ml-2 flex-shrink-0 h-5 w-5 transform group-hover:text-gray-400 transition-colors ease-in-out duration-150`}
                    viewBox="0 0 20 20"
                    aria-hidden="true"
                >
                    <path d="M6 6L14 10L6 14V6Z" fill="currentColor" />
                </svg>
            </button>
            {isOpen && (
                <div className="space-y-1">
                    {group.items.map((subItem) => (
                        <Link
                            key={subItem.name}
                            href={subItem.href}
                            className={`${pathname === subItem.href
                                    ? 'bg-indigo-50 text-indigo-600'
                                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                } group flex items-center pl-11 pr-2 py-2 text-sm font-medium rounded-md`}
                        >
                            {subItem.name}
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}

// Icons
function HomeIcon(props: any) {
    return <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>;
}
function UsersIcon(props: any) {
    return <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>;
}
function AcademicCapIcon(props: any) {
    return <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" /></svg>;
}
function ClipboardCheckIcon(props: any) {
    return <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>;
}
function CogIcon(props: any) {
    return <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
}
function QuestionMarkCircleIcon(props: any) {
    return <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
}
