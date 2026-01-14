import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Package, UserPlus, RefreshCw, Download } from 'lucide-react';
import { router } from '@inertiajs/react';

export default function QuickActions() {
    const actions = [
        {
            title: 'Create Package',
            description: 'Add a new data package',
            icon: Package,
            href: '/admin/packages?create=true',
            variant: 'default' as const,
        },
        {
            title: 'Add User',
            description: 'Create a new user account',
            icon: UserPlus,
            href: '/admin/users?create=true',
            variant: 'outline' as const,
        },
        {
            title: 'Refresh Data',
            description: 'Reload dashboard data',
            icon: RefreshCw,
            onClick: () => window.location.reload(),
            variant: 'outline' as const,
        },
    ];

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Plus className="h-5 w-5" />
                    Quick Actions
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {actions.map((action) => (
                        <Button
                            key={action.title}
                            variant={action.variant}
                            className="w-full justify-start"
                            onClick={() => {
                                if (action.onClick) {
                                    action.onClick();
                                } else if (action.href) {
                                    router.visit(action.href);
                                }
                            }}
                        >
                            <action.icon className="h-4 w-4 mr-2" />
                            <div className="flex flex-col items-start">
                                <span className="font-medium">{action.title}</span>
                                <span className="text-xs opacity-70">{action.description}</span>
                            </div>
                        </Button>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

