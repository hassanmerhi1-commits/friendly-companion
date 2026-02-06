import { useState, useEffect } from 'react';
import { TopNavLayout } from '@/components/layout/TopNavLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLanguage } from '@/lib/i18n';
import { useAuthStore, type AppUser, type UserRole, roleLabels, rolePermissions, type Permission } from '@/stores/auth-store';
import { PermissionGrid } from '@/components/users/PermissionGrid';
import { UserPlus, Users, Shield, Pencil, Trash2, Briefcase, Calculator, Eye, Key } from 'lucide-react';
import { toast } from 'sonner';
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

const roleIcons: Record<UserRole, React.ReactNode> = {
  admin: <Shield className="h-4 w-4" />,
  manager: <Briefcase className="h-4 w-4" />,
  hr: <Users className="h-4 w-4" />,
  accountant: <Calculator className="h-4 w-4" />,
  viewer: <Eye className="h-4 w-4" />,
};

const UsersPage = () => {
  const { t, language } = useLanguage();
  const { users, currentUser, addUser, updateUser, deleteUser, hasPermission } = useAuthStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editUser, setEditUser] = useState<AppUser | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<AppUser | null>(null);

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    name: '',
    role: 'viewer' as UserRole,
    isActive: true,
    customPermissions: [] as Permission[],
    useCustomPermissions: false,
  });
  const [activeTab, setActiveTab] = useState<string>('info');

  const canManageUsers = hasPermission('users.view');

  if (!canManageUsers) {
    return (
      <TopNavLayout>
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">
            {language === 'pt' ? 'Acesso restrito' : 'Access restricted'}
          </p>
        </div>
      </TopNavLayout>
    );
  }

  const handleOpenDialog = (user?: AppUser) => {
    if (user) {
      setEditUser(user);
      const hasCustom = Boolean(user.customPermissions && user.customPermissions.length > 0);
      setFormData({
        username: user.username,
        password: '',
        name: user.name,
        role: user.role,
        isActive: user.isActive,
        customPermissions: user.customPermissions || rolePermissions[user.role] || [],
        useCustomPermissions: hasCustom,
      });
    } else {
      setEditUser(null);
      setFormData({
        username: '',
        password: '',
        name: '',
        role: 'viewer',
        isActive: true,
        customPermissions: rolePermissions.viewer || [],
        useCustomPermissions: false,
      });
    }
    setActiveTab('info');
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editUser) {
      const updateData: Partial<AppUser> = {
        username: formData.username,
        name: formData.name,
        role: formData.role,
        isActive: formData.isActive,
        customPermissions: formData.useCustomPermissions ? formData.customPermissions : undefined,
      };
      if (formData.password) {
        updateData.password = formData.password;
      }
      const result = await updateUser(editUser.id, updateData);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(language === 'pt' ? 'Utilizador atualizado!' : 'User updated!');
    } else {
      const result = await addUser({
        username: formData.username,
        password: formData.password,
        name: formData.name,
        role: formData.role,
        isActive: formData.isActive,
        customPermissions: formData.useCustomPermissions ? formData.customPermissions : undefined,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(language === 'pt' ? 'Utilizador criado!' : 'User created!');
    }
    
    setDialogOpen(false);
  };

  const handleDeleteClick = (user: AppUser) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (userToDelete) {
      deleteUser(userToDelete.id);
      toast.success(language === 'pt' ? 'Utilizador eliminado!' : 'User deleted!');
    }
    setDeleteDialogOpen(false);
    setUserToDelete(null);
  };

  const getRoleLabel = (role: UserRole) => {
    return language === 'pt' ? roleLabels[role].pt : roleLabels[role].en;
  };

  const getPermissionCount = (user: AppUser) => {
    if (user.customPermissions && user.customPermissions.length > 0) {
      return user.customPermissions.length;
    }
    return rolePermissions[user.role]?.length || 0;
  };

  return (
    <TopNavLayout>
      <div className="flex items-center justify-between mb-8 animate-fade-in">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">
            {language === 'pt' ? 'Utilizadores' : 'Users'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {language === 'pt' ? 'Gerir utilizadores e permissões' : 'Manage users and permissions'}
          </p>
        </div>
        {hasPermission('users.create') && (
          <Button variant="accent" onClick={() => handleOpenDialog()}>
            <UserPlus className="h-5 w-5 mr-2" />
            {language === 'pt' ? 'Adicionar Utilizador' : 'Add User'}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.map((user) => (
          <Card key={user.id} className={!user.isActive ? 'opacity-50' : ''}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-medium flex items-center gap-2">
                <span className="text-primary">{roleIcons[user.role]}</span>
                {user.name}
              </CardTitle>
              <div className="flex gap-1">
                {hasPermission('users.edit') && (
                  <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(user)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
                {user.id !== currentUser?.id && hasPermission('users.delete') && (
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(user)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">@{user.username}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                  {getRoleLabel(user.role)}
                </Badge>
                <Badge variant="outline" className="text-xs flex items-center gap-1">
                  {user.customPermissions && user.customPermissions.length > 0 && (
                    <Key className="h-3 w-3" />
                  )}
                  {getPermissionCount(user)} {language === 'pt' ? 'permissões' : 'permissions'}
                </Badge>
                <Badge variant={user.isActive ? 'default' : 'destructive'} className={user.isActive ? 'bg-green-600' : ''}>
                  {user.isActive 
                    ? (language === 'pt' ? 'Ativo' : 'Active')
                    : (language === 'pt' ? 'Inativo' : 'Inactive')
                  }
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editUser 
                ? (language === 'pt' ? 'Editar Utilizador' : 'Edit User')
                : (language === 'pt' ? 'Novo Utilizador' : 'New User')
              }
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="info">
                  {language === 'pt' ? 'Informações' : 'Information'}
                </TabsTrigger>
                <TabsTrigger value="permissions">
                  {language === 'pt' ? 'Permissões' : 'Permissions'}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>{language === 'pt' ? 'Nome' : 'Name'}</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>{language === 'pt' ? 'Utilizador' : 'Username'}</Label>
                  <Input
                    value={formData.username}
                    onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>
                    {language === 'pt' ? 'Palavra-passe' : 'Password'}
                    {editUser && <span className="text-muted-foreground text-xs ml-1">
                      ({language === 'pt' ? 'deixe vazio para manter' : 'leave empty to keep'})
                    </span>}
                  </Label>
                  <Input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    required={!editUser}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formData.isActive}
                    onCheckedChange={(v) => setFormData(prev => ({ ...prev, isActive: v }))}
                  />
                  <Label>{language === 'pt' ? 'Ativo' : 'Active'}</Label>
                </div>
              </TabsContent>

              <TabsContent value="permissions" className="space-y-4 mt-4">
                {/* Use custom permissions toggle */}
                <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/50">
                  <div>
                    <Label className="font-medium">
                      {language === 'pt' ? 'Permissões Personalizadas' : 'Custom Permissions'}
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      {language === 'pt' 
                        ? 'Activar para definir permissões individuais para este utilizador'
                        : 'Enable to set individual permissions for this user'}
                    </p>
                  </div>
                  <Switch
                    checked={formData.useCustomPermissions}
                    onCheckedChange={(v) => {
                      if (v) {
                        // When enabling custom, start with the role's default permissions
                        setFormData(prev => ({
                          ...prev,
                          useCustomPermissions: true,
                          customPermissions: rolePermissions[prev.role] || [],
                        }));
                      } else {
                        setFormData(prev => ({
                          ...prev,
                          useCustomPermissions: false,
                          customPermissions: [],
                        }));
                      }
                    }}
                  />
                </div>

                {formData.useCustomPermissions ? (
                  <PermissionGrid
                    selectedPermissions={formData.customPermissions}
                    onChange={(perms) => setFormData(prev => ({ ...prev, customPermissions: perms }))}
                  />
                ) : (
                  <div className="p-4 rounded-lg border text-center">
                    <p className="text-muted-foreground">
                      {language === 'pt' 
                        ? `Utilizando permissões do perfil "${getRoleLabel(formData.role)}" (${rolePermissions[formData.role]?.length || 0} permissões)`
                        : `Using "${getRoleLabel(formData.role)}" role permissions (${rolePermissions[formData.role]?.length || 0} permissions)`}
                    </p>
                  </div>
                )}
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-2 pt-6 border-t mt-6">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                {t.common.cancel}
              </Button>
              <Button type="submit">{t.common.save}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.common.delete}?</AlertDialogTitle>
            <AlertDialogDescription>
              {userToDelete?.name}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t.common.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TopNavLayout>
  );
};

export default UsersPage;
