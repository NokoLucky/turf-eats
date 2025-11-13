'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const recentOrders = [
  { id: 'ORD-001', customer: 'John Doe', total: 17.49, status: 'Preparing' },
  { id: 'ORD-006', customer: 'Jane Smith', total: 9.99, status: 'New' },
  { id: 'ORD-007', customer: 'Sam Wilson', total: 25.48, status: 'New' },
];

export default function OwnerOrdersPage() {
  return (
    <div className="container py-12">
        <div className="mb-8">
            <h1 className="font-headline text-4xl font-bold">Incoming Orders</h1>
            <p className="text-muted-foreground mt-2">Manage and track all orders for your restaurant.</p>
        </div>
        <Card>
            <CardHeader>
            <CardTitle>All Orders</CardTitle>
            <CardDescription>A list of all incoming orders.</CardDescription>
            </CardHeader>
            <CardContent>
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {recentOrders.map((order) => (
                    <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.id}</TableCell>
                    <TableCell>{order.customer}</TableCell>
                    <TableCell>R{order.total.toFixed(2)}</TableCell>
                    <TableCell>
                        <Badge variant={order.status === 'New' ? 'destructive' : 'outline'}>{order.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                        <Button variant="outline" size="sm">
                        View Order
                        </Button>
                    </TableCell>
                    </TableRow>
                ))}
                </TableBody>
            </Table>
            </CardContent>
        </Card>
    </div>
  );
}
