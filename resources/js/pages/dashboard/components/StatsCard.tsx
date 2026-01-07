import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { useEffect, useState } from 'react';

interface StatsCardProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    description?: string;
}

function AnimatedNumber({ value, duration = 1000, isCurrency = false }: { value: number; duration?: number; isCurrency?: boolean }) {
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        const startValue = 0;
        const endValue = value;
        const startTime = Date.now();

        const animate = () => {
            const now = Date.now();
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Easing function (ease-out)
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const currentValue = startValue + (endValue - startValue) * easeOut;

            setDisplayValue(currentValue);

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                setDisplayValue(endValue);
            }
        };

        animate();
    }, [value, duration]);

    if (isCurrency) {
        return <>{displayValue.toFixed(2)}</>;
    }
    return <>{Math.round(displayValue)}</>;
}

export default function StatsCard({
    title,
    value,
    icon: Icon,
    description,
}: StatsCardProps) {
    // Check if value is a currency string (starts with "GHS")
    const isCurrency = typeof value === 'string' && value.includes('GHS');
    const numericValue = typeof value === 'string' 
        ? (isCurrency ? parseFloat(value.replace('GHS', '').trim()) : parseFloat(value))
        : value;

    return (
        <Card className="transition-all duration-300 hover:shadow-lg hover:scale-[1.02] hover:border-primary/20 animate-scale-in">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground transition-transform duration-300 hover:scale-110" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">
                    {isCurrency ? (
                        <>GHS <AnimatedNumber value={numericValue} isCurrency={true} /></>
                    ) : (
                        <AnimatedNumber value={numericValue} />
                    )}
                </div>
                {description && (
                    <p className="text-xs text-muted-foreground mt-1 animate-fade-in" style={{ animationDelay: '100ms' }}>
                        {description}
                    </p>
                )}
            </CardContent>
        </Card>
    );
}


