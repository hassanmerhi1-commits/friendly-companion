import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useLanguage } from '@/lib/i18n';
import { useAuthStore, type AppUser, type UserRole } from '@/stores/auth-store';
import { UserPlus, Users, Shield, Pencil, Trash2 } from 'lucide-react';
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

const UsersPage = () => {
  const { t, language } = useLanguage();
  const { users, currentUser, addUser, updateUser, deleteUser } = useAuthStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editUser, setEditUser] = useState<AppUser | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<AppUser | null>(null);

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    name: '',
    role: 'user' as UserRole,
    isActive: true,
  });

  const isAdmin = currentUser?.role === 'admin';

  if (!isAdmin) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">
            {language === 'pt' ? 'Acesso restrito a administradores' : 'Admin access only'}
          </p>
        </div>
      </MainLayout>
    );
  }

  const handleOpenDialog = (user?: AppUser) => {
    if (user) {
      setEditUser(user);
      setFormData({
        username: user.username,
        password: '',
        name: user.name,
        role: user.role,
        isActive: user.isActive,
      });
    } else {
      setEditUser(null);
      setFormData({
        username: '',
        password: '',
        name: '',
        role: 'user',
        isActive: true,
      });
    }
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editUser) {
      const updateData: Partial<AppUser> = {
        username: formData.username,
        name: formData.name,
        role: formData.role,
        isActive: formData.isActive,
      };
      if (formData.password) {
        updateData.password = formData.password;
      }
      updateUser(editUser.id, updateData);
      toast.success(language === 'pt' ? 'Utilizador atualizado!' : 'User updated!');
    } else {
      addUser({
        username: formData.username,
        password: formData.password,
        name: formData.name,
        role: formData.role,
        isActive: formData.isActive,
      });
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

  return (
    <MainLayout>
      <div className="flex items-center justify-between mb-8 animate-fade-in">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">
            {language === 'pt' ? 'Utilizadores' : 'Users'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {language === 'pt' ? 'Gerir utilizadores do sistema' : 'Manage system users'}
          </p>
        </div>
        <Button variant="accent" onClick={() => handleOpenDialog()}>
          <UserPlus className="h-5 w-5 mr-2" />
          {language === 'pt' ? 'Adicionar Utilizador' : 'Add User'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.map((user) => (
          <Card key={user.id} className={!user.isActive ? 'opacity-50' : ''}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-medium flex items-center gap-2">
                {user.role === 'admin' ? (
                  <Shield className="h-4 w-4 text-primary" />
                ) : (
                  <Users className="h-4 w-4 text-muted-foreground" />
                )}
                {user.name}
              </CardTitle>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(user)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                {user.id !== currentUser?.id && (
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(user)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">@{user.username}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className={`text-xs px-2 py-1 rounded ${
                  user.role === 'admin' 
                    ? 'bg-primary/20 text-primary' 
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {user.role === 'admin' 
                    ? (language === 'pt' ? 'Administrador' : 'Admin')
                    : (language === 'pt' ? 'Utilizador' : 'User')
                  }
                </span>
                <span className={`text-xs px-2 py-1 rounded ${
                  user.isActive 
                    ? 'bg-green-500/20 text-green-600' 
                    : 'bg-red-500/20 text-red-600'
                }`}>
                  {user.isActive 
                    ? (language === 'pt' ? 'Ativo' : 'Active')
                    : (language === 'pt' ? 'Inativo' : 'Inactive')
                  }
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editUser 
                ? (language === 'pt' ? 'Editar Utilizador' : 'Edit User')
                : (language === 'pt' ? 'Novo Utilizador' : 'New User')
              }
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
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
            <div className="space-y-2">
              <Label>{language === 'pt' ? 'Perfil' : 'Role'}</Label>
              <Select
                value={formData.role}
                onValueChange={(v) => setFormData(prev => ({ ...prev, role: v as UserRole }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">
                    {language === 'pt' ? 'Administrador' : 'Admin'}
                  </SelectItem>
                  <SelectItem value="user">
                    {language === 'pt' ? 'Utilizador' : 'User'}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.isActive}
                onCheckedChange={(v) => setFormData(prev => ({ ...prev, isActive: v }))}
              />
              <Label>{language === 'pt' ? 'Ativo' : 'Active'}</Label>
            </div>
            <div className="flex justify-end gap-2 pt-4">
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
    </MainLayout>
  );
};

export default UsersPage;
