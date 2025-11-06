import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin } from 'lucide-react';

const deliveries = [
  { id: 'ORD-001', restaurant: 'The Golden Spatula', destination: '123 Main St', status: 'Pending' },
  { id: 'ORD-004', restaurant: 'Pizza Palace', destination: '456 Oak Ave', status: 'Picked Up' },
  { id: 'ORD-005', restaurant: 'Sushi Central', destination: '789 Pine Ln', status: 'Pending' },
];

export default function DriverDashboard() {
  return (
    <div className="container py-12">
      <div className="mb-8">
        <h1 className="font-headline text-4xl font-bold">Delivery Dashboard</h1>
        <p className="text-muted-foreground mt-2">Here are your current delivery tasks.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Active Deliveries</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Pickup</TableHead>
                <TableHead>Destination</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deliveries.map((delivery) => (
                <TableRow key={delivery.id}>
                  <TableCell className="font-medium">{delivery.id}</TableCell>
                  <TableCell>{delivery.restaurant}</TableCell>
                  <TableCell>{delivery.destination}</TableCell>
                  <TableCell>
                    <Badge variant={delivery.status === 'Picked Up' ? 'secondary' : 'outline'}>{delivery.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm">
                      <MapPin className="mr-2 h-4 w-4" />
                      Navigate
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
