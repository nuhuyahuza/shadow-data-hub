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
            title: 'Packages',
            href: '/packages',
            icon: Package,
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

    const adminNavItems: NavItem[] = isAdmin
        ? [
              {
                  title: 'Admin Dashboard',
                  href: '/admin/dashboard',
                  icon: Shield,
              },
              {
                  title: 'Users',
                  href: '/admin/users',
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
                  title: 'Vendor Logs',
                  href: '/admin/vendor-logs',
                  icon: FileText,
              },
          ]
        : [];

    return (
        <Sidebar collapsible="icon" variant="floating">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} />
                {isAdmin && adminNavItems.length > 0 && (
                    <SidebarGroup className="px-2 py-0">
                        <SidebarGroupLabel>Admin</SidebarGroupLabel>
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
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
