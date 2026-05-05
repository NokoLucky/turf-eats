'use client';

import { useState } from 'react';
import { collectionGroup, query, where, doc, updateDoc } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { ExternalLink, CheckCircle, ShieldAlert, Store, Bike } from 'lucide-react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export default function AdminDashboard() {
  const firestore = useFirestore();
  const { toast } = useToast();

  // Query pending drivers
  const driversQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collectionGroup(firestore, 'drivers'), where('status', '==', 'pending'));
  }, [firestore]);

  // Query pending store owners
  const ownersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collectionGroup(firestore, 'storeOwners'), where('status', '==', 'pending'));
  }, [firestore]);

  const { data: pendingDrivers, isLoading: loadingDrivers } = useCollection(driversQuery);
  const { data: pendingOwners, isLoading: loadingOwners } = useCollection(ownersQuery);

  const handleApprove = (collectionName: 'drivers' | 'storeOwners', userId: string) => {
    if (!firestore) return;

    const docPath = `users/${userId}/${collectionName}/${userId}`;
    const docRef = doc(firestore, docPath);
    const updateData = { status: 'active' };
    
    // Using non-blocking update pattern with proper error handling
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
            {pendingDrivers && pendingDrivers.length > 0 && (
              <Badge variant="destructive" className="ml-2 px-1.5 py-0 min-w-[1.25rem] text-center">
                {pendingDrivers.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="owners" className="flex items-center gap-2">
            <Store className="h-4 w-4" />
            Pending Owners
            {pendingOwners && pendingOwners.length > 0 && (
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
              {loadingDrivers ? (
                <TableSkeleton />
              ) : !pendingDrivers || pendingDrivers.length === 0 ? (
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
                            className="bg-green-600 hover:bg-green-700"
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
              {loadingOwners ? (
                <TableSkeleton />
              ) : !pendingOwners || pendingOwners.length === 0 ? (
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
                            className="bg-green-600 hover:bg-green-700"
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
