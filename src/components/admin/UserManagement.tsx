import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Shield, ShieldOff, Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
  roles: string[];
}

export function UserManagement() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [actionType, setActionType] = useState<'grant' | 'revoke'>('grant');
  const { toast } = useToast();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      const usersWithRoles = profiles?.map(profile => ({
        ...profile,
        roles: roles?.filter(r => r.user_id === profile.id).map(r => r.role) || [],
      })) || [];

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error loading users:', error);
      toast({
        title: 'Error',
        description: 'Failed to load users',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const openDialog = (user: UserProfile, type: 'grant' | 'revoke') => {
    setSelectedUser(user);
    setActionType(type);
    setDialogOpen(true);
  };

  const logActivity = async (actionType: string, targetUser: UserProfile) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      await supabase.functions.invoke('log-admin-activity', {
        body: {
          action_type: actionType,
          target_user_id: targetUser.id,
          target_user_email: targetUser.email,
          details: {
            target_name: targetUser.full_name,
            action_timestamp: new Date().toISOString(),
          },
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
    } catch (error) {
      console.error('Failed to log activity:', error);
      // Don't throw - logging failure shouldn't block the action
    }
  };

  const handleRoleAction = async () => {
    if (!selectedUser) return;

    setActionLoading(selectedUser.id);
    try {
      if (actionType === 'grant') {
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: selectedUser.id, role: 'admin' });

        if (error) {
          if (error.code === '23505') {
            toast({
              title: 'Info',
              description: 'User already has admin role',
            });
          } else {
            throw error;
          }
        } else {
          // Log the activity
          await logActivity('admin_role_granted', selectedUser);
          
          toast({
            title: 'Success',
            description: `Admin role granted to ${selectedUser.email}`,
          });
        }
      } else {
        const { error } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', selectedUser.id)
          .eq('role', 'admin');

        if (error) throw error;

        // Log the activity
        await logActivity('admin_role_revoked', selectedUser);

        toast({
          title: 'Success',
          description: `Admin role revoked from ${selectedUser.email}`,
        });
      }

      await loadUsers();
    } catch (error) {
      console.error('Error updating role:', error);
      toast({
        title: 'Error',
        description: 'Failed to update user role',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
      setDialogOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {users.map((user) => {
          const isAdmin = user.roles.includes('admin');
          const isLoading = actionLoading === user.id;

          return (
            <Card key={user.id}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{user.full_name || 'No name'}</p>
                      {isAdmin && (
                        <Badge variant="default">
                          <Shield className="h-3 w-3 mr-1" />
                          Admin
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    <p className="text-xs text-muted-foreground">
                      Joined {new Date(user.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    {isAdmin ? (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => openDialog(user, 'revoke')}
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <ShieldOff className="h-4 w-4 mr-2" />
                            Revoke Admin
                          </>
                        )}
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openDialog(user, 'grant')}
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Shield className="h-4 w-4 mr-2" />
                            Grant Admin
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {users.length === 0 && (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              No users found
            </CardContent>
          </Card>
        )}
      </div>

      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionType === 'grant' ? 'Grant Admin Role' : 'Revoke Admin Role'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionType === 'grant'
                ? `Are you sure you want to grant admin privileges to ${selectedUser?.email}? They will have full access to the admin dashboard and user management.`
                : `Are you sure you want to revoke admin privileges from ${selectedUser?.email}? They will lose access to the admin dashboard.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRoleAction}>
              {actionType === 'grant' ? 'Grant Admin' : 'Revoke Admin'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
