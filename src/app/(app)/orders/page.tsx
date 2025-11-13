import Link from 'next/link';
import { orders, type OrderStatus } from '@/lib/data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowRight, MoreVertical } from 'lucide-react';

const getStatusVariant = (status: OrderStatus): "default" | "secondary" | "destructive" | "outline" => {
    switch(status) {
        case 'Delivered':
            return 'default';
        case 'Out for Delivery':
            return 'secondary';
        case 'Cancelled':
            return 'destructive';
        default:
            return 'outline';
    }
}

export default function OrdersPage() {
  return (
    <div className="container py-12 px-4 sm:px-8">
      <div className="mb-8">
        <h1 className="font-headline text-4xl font-bold">My Orders</h1>
        <p className="text-muted-foreground mt-2">View your order history and track current orders.</p>
      </div>
      <Card className="hidden sm:block">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Restaurant</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.id}</TableCell>
                  <TableCell>{order.restaurantName}</TableCell>
                  <TableCell>{order.date}</TableCell>
                  <TableCell>R{order.total.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(order.status)}>{order.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/orders/${order.id}`}>
                        View Details <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="sm:hidden space-y-4">
        {orders.map((order) => (
          <Card key={order.id}>
            <CardHeader>
              <CardTitle className='text-lg'>{order.restaurantName}</CardTitle>
              <CardDescription>#{order.id} - {order.date}</CardDescription>
            </CardHeader>
            <CardContent className='flex items-center justify-between'>
                <div>
                    <p className='text-lg font-bold'>R{order.total.toFixed(2)}</p>
                    <Badge variant={getStatusVariant(order.status)} className='mt-1'>{order.status}</Badge>
                </div>
                <Button asChild variant="default" size="sm">
                    <Link href={`/orders/${order.id}`}>
                        View
                    </Link>
                </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
