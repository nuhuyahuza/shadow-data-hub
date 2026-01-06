import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarGroup,
    SidebarGroupLabel,
} from '@/components/ui/sidebar';
import { dashboard } from '@/routes';
import { type NavItem } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import {
    LayoutGrid,
    ShoppingCart,
    Package,
    Wallet,
    History,
    Shield,
    Users,
    FileText,
} from 'lucide-react';
import AppLogo from './app-logo';
import { type SharedData } from '@/types';
import { resolveUrl } from '@/lib/utils';

export function AppSidebar() {
    const page = usePage<SharedData>();
    const { auth } = page.props;
    const user = auth.user;
    const isAdmin = user?.role === 'admin';
    const isAgent = user?.role === 'agent';
    const isAdminRoute = page.url.startsWith('/admin');
    const isAgentRoute = page.url.startsWith('/agent');

    const mainNavItems: NavItem[] = [
        {
            title: 'Dashboard',
            href: dashboard(),
            icon: LayoutGrid,
        },
        {
            title: 'Buy Data',
            href: '/buy-data',
            icon: ShoppingCart,
        },
        {
            title: 'Wallet',
            href: '/wallet',
            icon: Wallet,
        },
        {
            title: 'Transactions',
            href: '/transactions',
            icon: History,
        },
    ];

    const adminNavItems: NavItem[] = [
        {
            title: 'Users',
            href: '/admin/users',
            icon: Users,
        },
        {
            title: 'Agents',
            href: '/admin/agents',
            icon: Users,
        },
        {
            title: 'Packages',
            href: '/admin/packages',
            icon: Package,
        },
        {
            title: 'Transactions',
            href: '/admin/transactions',
            icon: History,
        },
        {
            title: 'Purchases',
            href: '/admin/purchases',
            icon: ShoppingCart,
        },
        {
            title: 'Vendor Logs',
            href: '/admin/vendor-logs',
            icon: FileText,
        },
    ];

    const agentNavItems: NavItem[] = [
        {
            title: 'Transactions',
            href: '/agent/transactions',
            icon: History,
        },
        {
            title: 'Purchases',
            href: '/agent/purchases',
            icon: ShoppingCart,
        },
        {
            title: 'Users',
            href: '/agent/users',
            icon: Users,
        },
        {
            title: 'Packages',
            href: '/agent/packages',
            icon: Package,
        },
    ];

    // Determine which navigation to show based on current route
    const showAdminNav = isAdmin && isAdminRoute;
    const showAgentNav = (isAgent || isAdmin) && isAgentRoute;
    const showUserNav = !isAdminRoute && !isAgentRoute;

    return (
        <Sidebar collapsible="icon" variant="floating">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link
                                href={
                                    isAdminRoute
                                        ? '/admin/dashboard'
                                        : isAgentRoute
                                          ? '/agent/transactions'
                                          : dashboard()
                                }
                                prefetch
                            >
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                {showUserNav && <NavMain items={mainNavItems} />}
                {showAdminNav && (
                    <SidebarGroup className="px-2 py-0">
                        <SidebarGroupLabel className="flex items-center gap-2">
                            <Shield className="h-4 w-4" />
                            Admin
                        </SidebarGroupLabel>
                        <SidebarMenu>
                            {adminNavItems.map((item) => (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton
                                        asChild
                                        isActive={page.url.startsWith(
                                            resolveUrl(item.href)
                                        )}
                                        tooltip={{ children: item.title }}
                                    >
                                        <Link href={item.href} prefetch>
                                            {item.icon && <item.icon />}
                                            <span>{item.title}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroup>
                )}
                {showAgentNav && (
                    <SidebarGroup className="px-2 py-0">
                        <SidebarGroupLabel className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Agent
                        </SidebarGroupLabel>
                        <SidebarMenu>
                            {agentNavItems.map((item) => (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton
                                        asChild
                                        isActive={page.url.startsWith(
                                            resolveUrl(item.href)
                                        )}
                                        tooltip={{ children: item.title }}
                                    >
                                        <Link href={item.href} prefetch>
                                            {item.icon && <item.icon />}
                                            <span>{item.title}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroup>
                )}
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
