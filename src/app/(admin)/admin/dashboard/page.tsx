'use client';

import { useMemo } from 'react';
import { collectionGroup, query } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { ExternalLink, CheckCircle, ShieldAlert, Store, Bike, AlertCircle } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function AdminDashboard() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();

  // We query the entire group and filter client-side to avoid index/permission complexities during setup
  const driversQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collectionGroup(firestore, 'drivers');
  }, [firestore, user?.uid]);

  const ownersQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collectionGroup(firestore, 'storeOwners');
  }, [firestore, user?.uid]);

  const { data: allDrivers, isLoading: loadingDrivers, error: driversError } = useCollection(driversQuery);
  const { data: allOwners, isLoading: loadingOwners, error: ownersError } = useCollection(ownersQuery);

  // Client-side filtering for "pending" status
  const pendingDrivers = useMemo(() => {
    return allDrivers?.filter(d => d.status === 'pending') || [];
  }, [allDrivers]);

  const pendingOwners = useMemo(() => {
    return allOwners?.filter(o => o.status === 'pending') || [];
  }, [allOwners]);

  const handleApprove = (collectionName: 'drivers' | 'storeOwners', userId: string) => {
    if (!firestore) return;

    const docPath = `users/${userId}/${collectionName}/${userId}`;
    const docRef = doc(firestore, docPath);
    const updateData = { status: 'active' };
    
    updateDoc(docRef, updateData)
      .then(() => {
        toast({
          title: "Approval Successful",
          description: `The ${collectionName === 'drivers' ? 'driver' : 'store owner'} has been activated.`,
        });
      })
      .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
          path: docRef.path,
          operation: 'update',
          requestResourceData: updateData,
        });
        errorEmitter.emit('permission-error', permissionError);
      });
  };

  const TableSkeleton = () => (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  );

  const isGlobalLoading = isUserLoading || (loadingDrivers && !allDrivers) || (loadingOwners && !allOwners);

  if (driversError || ownersError) {
    return (
      <div className="container py-12">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Access Error</AlertTitle>
          <AlertDescription>
            The system encountered a permission issue. Please ensure your account is correctly set as an admin in the database and refresh.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container py-12">
      <div className="mb-8 flex items-center gap-4">
        <div className="p-3 bg-primary/10 rounded-lg">
          <ShieldAlert className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h1 className="font-headline text-4xl font-bold">Admin Approval Dashboard</h1>
          <p className="text-muted-foreground mt-1">Review and activate pending driver and store owner applications.</p>
        </div>
      </div>

      <Tabs defaultValue="drivers" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="drivers" className="flex items-center gap-2">
            <Bike className="h-4 w-4" />
            Pending Drivers
            {pendingDrivers.length > 0 && (
              <Badge variant="destructive" className="ml-2 px-1.5 py-0 min-w-[1.25rem] text-center">
                {pendingDrivers.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="owners" className="flex items-center gap-2">
            <Store className="h-4 w-4" />
            Pending Owners
            {pendingOwners.length > 0 && (
              <Badge variant="destructive" className="ml-2 px-1.5 py-0 min-w-[1.25rem] text-center">
                {pendingOwners.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="drivers">
          <Card>
            <CardHeader>
              <CardTitle>Driver Applications</CardTitle>
              <CardDescription>Review driver licenses and vehicle information before activating.</CardDescription>
            </CardHeader>
            <CardContent>
              {isGlobalLoading ? (
                <TableSkeleton />
              ) : pendingDrivers.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No pending driver applications.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Driver Name</TableHead>
                      <TableHead>Vehicle Details</TableHead>
                      <TableHead>License</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingDrivers.map((driver) => (
                      <TableRow key={driver.id}>
                        <TableCell className="font-medium">
                          {driver.name}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p>{driver.vehicleType || 'Not specified'}</p>
                            <p className="text-muted-foreground">{driver.vehicleRegistration}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {driver.licenseUrl ? (
                            <Button variant="link" size="sm" asChild className="p-0 h-auto">
                              <a href={driver.licenseUrl} target="_blank" rel="noopener noreferrer">
                                View License <ExternalLink className="ml-1 h-3 w-3" />
                              </a>
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">No license provided</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            size="sm" 
                            onClick={() => handleApprove('drivers', driver.userId)}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Approve
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="owners">
          <Card>
            <CardHeader>
              <CardTitle>Store Owner Applications</CardTitle>
              <CardDescription>Verify store owner details to grant them access to the owner portal.</CardDescription>
            </CardHeader>
            <CardContent>
              {isGlobalLoading ? (
                <TableSkeleton />
              ) : pendingOwners.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No pending store owner applications.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Owner Name</TableHead>
                      <TableHead>Contact Info</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingOwners.map((owner) => (
                      <TableRow key={owner.id}>
                        <TableCell className="font-medium">
                          {owner.name}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p>{owner.email}</p>
                            <p className="text-muted-foreground">{owner.phoneNumber}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            size="sm" 
                            onClick={() => handleApprove('storeOwners', owner.userId)}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Approve
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}