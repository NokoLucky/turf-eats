import Link from 'next/link';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Moped, Store } from 'lucide-react';
import Logo from '@/components/logo';

const roles = [
  {
    name: 'Customer',
    description: 'Order delicious food from local restaurants.',
    icon: <User className="h-12 w-12 text-primary" />,
    href: '/app',
  },
  {
    name: 'Driver',
    description: 'Earn money by delivering food in your town.',
    icon: <Moped className="h-12 w-12 text-primary" />,
    href: '/driver/dashboard',
  },
  {
    name: 'Store Owner',
    description: 'Manage your restaurant and reach more customers.',
    icon: <Store className="h-12 w-12 text-primary" />,
    href: '/owner/dashboard',
  },
];

export default function RoleSelectionPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="mb-8 text-center">
        <Logo />
        <h1 className="mt-4 font-headline text-3xl font-bold tracking-tight">
          How will you use Turf Eats?
        </h1>
        <p className="mt-2 text-muted-foreground">
          Choose your role to get started. You can change this later.
        </p>
      </div>
      <div className="grid w-full max-w-4xl grid-cols-1 gap-6 md:grid-cols-3">
        {roles.map((role) => (
          <Link href={role.href} key={role.name}>
            <Card className="h-full transform transition-transform duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-primary/20">
              <CardHeader className="flex flex-col items-center justify-center text-center">
                <div className="mb-4 rounded-full bg-primary/10 p-4">
                  {role.icon}
                </div>
                <CardTitle className="font-headline text-xl font-bold">{role.name}</CardTitle>
                <CardDescription className="mt-1">{role.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
