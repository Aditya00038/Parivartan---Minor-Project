'use client';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUser, useDoc, useMemoFirebase, useFirestore } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import type { User as UserType } from '@/lib/types';
import { NotificationToggleRow } from '@/components/push-notification-prompt';

const profileSchema = z.object({
    displayName: z.string().min(2, "Name must be at least 2 characters."),
});

type ProfileForm = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const { user, isUserLoading: isAuthLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);

  const userDocRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserType>(userDocRef);

  const form = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
        displayName: '',
    }
  });

  useEffect(() => {
      if (userProfile) {
          form.reset({
              displayName: userProfile.name ?? user?.displayName ?? ''
          });
      }
  }, [userProfile, user, form]);

  async function onSubmit(values: ProfileForm) {
    if (!userDocRef) return;
    setIsUpdating(true);
    try {
        await updateDoc(userDocRef, { name: values.displayName });
        toast({
            title: "Profile Updated",
            description: "Your display name has been successfully changed."
        });
    } catch(error) {
        console.error("Profile update failed:", error);
        toast({
            variant: "destructive",
            title: "Update Failed",
            description: "Could not update your profile. Please try again."
        });
    } finally {
        setIsUpdating(false);
    }
  }

  const isLoading = isAuthLoading || isProfileLoading;

  if (isLoading) {
    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <Skeleton className="h-24 w-full" />
            <div className="grid gap-8 md:grid-cols-4">
                <div className="md:col-span-1"><Skeleton className="h-64 w-full" /></div>
                <div className="md:col-span-3"><Skeleton className="h-96 w-full" /></div>
            </div>
        </div>
    )
  }

  if (!user) {
    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <Card className="text-center p-8">
                <CardTitle>Please log in</CardTitle>
                <CardDescription>You need to be logged in to view your profile.</CardDescription>
            </Card>
        </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
       <div className="bg-gradient-to-r from-primary to-accent text-white p-6 md:p-8 rounded-lg shadow-lg mb-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-2 text-primary-foreground">Profile & Settings</h1>
        <p className="text-base md:text-lg text-primary-foreground/80">Manage Your Civic Identity</p>
      </div>
      
      <div className="grid gap-8 md:grid-cols-4">
        <div className="md:col-span-1">
          <Card>
            <CardContent className="pt-6 flex flex-col items-center text-center">
              <Avatar className="h-20 w-20 md:h-24 md:w-24 mb-4">
                <AvatarImage src={user.photoURL ?? ''} alt={user.displayName ?? 'User'} />
                <AvatarFallback>{userProfile?.name?.charAt(0).toUpperCase() ?? 'U'}</AvatarFallback>
              </Avatar>
              <h2 className="text-xl font-bold">{userProfile?.name ?? user.displayName}</h2>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <Separator className="my-4" />
              <div className="text-center">
                <p className="text-2xl font-bold">{userProfile?.points ?? 0}</p>
                <p className="text-sm text-muted-foreground">Total Points</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-3">
          <Tabs defaultValue="profile" className="w-full">
            <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
              <TabsList className="inline-flex w-max md:grid md:w-full md:grid-cols-3 mb-4">
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="security">Security</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="profile">
              <Card>
                 <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)}>
                        <CardHeader>
                        <CardTitle>Public Profile</CardTitle>
                        <CardDescription>This is how others will see you on the site.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <FormField
                                control={form.control}
                                name="displayName"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Display Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Your display name" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="space-y-2">
                                <Label htmlFor="email">Email Address</Label>
                                <Input id="email" defaultValue={user.email ?? ''} disabled />
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button type="submit" disabled={isUpdating}>{isUpdating ? "Saving..." : "Update Profile"}</Button>
                        </CardFooter>
                    </form>
                </Form>
              </Card>
            </TabsContent>

            <TabsContent value="security">
              <Card>
                <CardHeader>
                  <CardTitle>Security</CardTitle>
                  <CardDescription>Account security settings.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                   <p className="text-sm text-muted-foreground p-4 border rounded-lg">
                       You are logged in with Google. Your account security is managed by your Google account.
                    </p>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="settings">
              <Card>
                <CardHeader>
                  <CardTitle>Notifications</CardTitle>
                  <CardDescription>Manage how you receive notifications.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between space-x-2 p-4 border rounded-lg">
                    <Label htmlFor="email-notifications" className="flex flex-col space-y-1">
                      <span>Email Notifications</span>
                      <span className="font-normal leading-snug text-muted-foreground">
                        Receive updates about your reports via email.
                      </span>
                    </Label>
                    <Switch id="email-notifications" defaultChecked />
                  </div>
                  <NotificationToggleRow />
                </CardContent>
              </Card>
            </TabsContent>

          </Tabs>
        </div>
      </div>
    </div>
  );
}
