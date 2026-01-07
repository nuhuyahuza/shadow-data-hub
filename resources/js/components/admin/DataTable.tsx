import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { ArrowUpDown, ArrowUp, ArrowDown, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ColumnDef<T> {
    key: string;
    header: string;
    accessor: (row: T) => React.ReactNode;
    sortable?: boolean;
    className?: string;
}

interface DataTableProps<T> {
    data: T[];
    columns: ColumnDef<T>[];
    searchable?: boolean;
    searchPlaceholder?: string;
    searchKeys?: string[];
    pagination?: boolean;
    pageSize?: number;
    actions?: (row: T) => React.ReactNode;
    loading?: boolean;
    emptyMessage?: string;
    title?: string;
    titleIcon?: React.ReactNode;
}

export default function DataTable<T extends Record<string, unknown> = Record<string, unknown>>({
    data,
    columns,
    searchable = true,
    searchPlaceholder = 'Search...',
    searchKeys = [],
    pagination = true,
    pageSize = 15,
    actions,
    loading = false,
    emptyMessage = 'No data available',
    title,
    titleIcon,
}: DataTableProps<T>) {
    const [searchQuery, setSearchQuery] = useState('');
    const [sortColumn, setSortColumn] = useState<string | null>(null);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const [currentPage, setCurrentPage] = useState(1);

    // Filter data based on search query
    const filteredData = useMemo(() => {
        if (!searchQuery || searchKeys.length === 0) {
            return data;
        }

        const query = searchQuery.toLowerCase();
        return data.filter((row) => {
            return searchKeys.some((key) => {
                const value = row[key];
                if (value === null || value === undefined) {
                    return false;
                }
                return String(value).toLowerCase().includes(query);
            });
        });
    }, [data, searchQuery, searchKeys]);

    // Sort data
    const sortedData = useMemo(() => {
        if (!sortColumn) {
            return filteredData;
        }

        const column = columns.find((col) => col.key === sortColumn);
        if (!column || !column.sortable) {
            return filteredData;
        }

        return [...filteredData].sort((a, b) => {
            const aValue = String(column.accessor(a) || '');
            const bValue = String(column.accessor(b) || '');

            if (sortDirection === 'asc') {
                return aValue.localeCompare(bValue);
            }
            return bValue.localeCompare(aValue);
        });
    }, [filteredData, sortColumn, sortDirection, columns]);

    // Paginate data
    const paginatedData = useMemo(() => {
        if (!pagination) {
            return sortedData;
        }

        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        return sortedData.slice(startIndex, endIndex);
    }, [sortedData, currentPage, pageSize, pagination]);

    const totalPages = Math.ceil(sortedData.length / pageSize);

    const handleSort = (columnKey: string) => {
        if (sortColumn === columnKey) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(columnKey);
            setSortDirection('asc');
        }
    };

    const getSortIcon = (columnKey: string) => {
        if (sortColumn !== columnKey) {
            return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />;
        }
        return sortDirection === 'asc' ? (
            <ArrowUp className="h-4 w-4 ml-1" />
        ) : (
            <ArrowDown className="h-4 w-4 ml-1" />
        );
    };

    return (
        <Card>
            {(title || searchable) && (
                <CardHeader>
                    <div className="flex items-center justify-between">
                        {title && (
                            <CardTitle className="flex items-center gap-2">
                                {titleIcon}
                                {title}
                            </CardTitle>
                        )}
                        {searchable && (
                            <div className="relative w-full max-w-sm">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors duration-200" />
                                <Input
                                    placeholder={searchPlaceholder}
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    className="pl-9 transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                                />
                            </div>
                        )}
                    </div>
                </CardHeader>
            )}
            <CardContent>
                {loading ? (
                    <div className="flex items-center justify-center py-12 animate-fade-in">
                        <Spinner />
                        <span className="ml-2 text-muted-foreground">Loading...</span>
                    </div>
                ) : paginatedData.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground animate-fade-in">
                        {emptyMessage}
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="border-b">
                                        {columns.map((column) => (
                                            <th
                                                key={column.key}
                                                className={cn(
                                                    'px-4 py-3 text-left text-sm font-medium text-muted-foreground transition-colors duration-200',
                                                    column.sortable && 'cursor-pointer hover:bg-muted/50',
                                                    column.className
                                                )}
                                                onClick={() => column.sortable && handleSort(column.key)}
                                            >
                                                <div className="flex items-center">
                                                    {column.header}
                                                    {column.sortable && getSortIcon(column.key)}
                                                </div>
                                            </th>
                                        ))}
                                        {actions && (
                                            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                                                Actions
                                            </th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedData.map((row, index) => (
                                        <tr
                                            key={index}
                                            className="border-b hover:bg-muted/50 transition-all duration-200 hover:shadow-sm animate-slide-up"
                                            style={{ animationDelay: `${index * 30}ms` }}
                                        >
                                            {columns.map((column) => (
                                                <td
                                                    key={column.key}
                                                    className={cn('px-4 py-3', column.className)}
                                                >
                                                    {column.accessor(row)}
                                                </td>
                                            ))}
                                            {actions && (
                                                <td className="px-4 py-3">
                                                    {actions(row)}
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {pagination && sortedData.length > 0 && (
                            <div className="flex items-center justify-between mt-4 pt-4 border-t animate-fade-in">
                                <div className="text-sm text-muted-foreground">
                                    Showing {(currentPage - 1) * pageSize + 1} to{' '}
                                    {Math.min(currentPage * pageSize, sortedData.length)} of{' '}
                                    {sortedData.length} result{sortedData.length !== 1 ? 's' : ''}
                                </div>
                                {totalPages > 1 && (
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                            disabled={currentPage === 1}
                                            className="transition-all duration-200 hover:scale-105"
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                            Previous
                                        </Button>
                                        <div className="text-sm text-muted-foreground">
                                            Page {currentPage} of {totalPages}
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                            disabled={currentPage === totalPages}
                                            className="transition-all duration-200 hover:scale-105"
                                        >
                                            Next
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    );
}

