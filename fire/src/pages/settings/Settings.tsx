import React, { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  User, 
  Palette, 
  ShieldAlert, 
  FileText, 
  Import, 
  Trash2,
  Edit,
  Lock,
  Mail,
  Tags,
  CreditCard
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ThemeToggle } from '@/components/ThemeToggle';
import CategoryManagement from '@/components/settings/CategoryManagement';
import { ref, set, onValue, remove } from 'firebase/database';
import { database } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';

const Settings = () => {
  // User profile state
  const [user, setUser] = useState({
    name: "Ana Silva",
    nickname: "anasilva",
    email: "ana.silva@exemplo.com"
  });

  // Dialog states
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Theme state
  const [theme, setTheme] = useState<'light' | 'dark'>(() => 
    (localStorage.getItem('theme') as 'light' | 'dark') || 'light'
  );

  // Category management state
  const [showCategories, setShowCategories] = useState(false);
  const [categoryType, setCategoryType] = useState<'expense' | 'income' | 'shopping'>('shopping');

  // Cartão de crédito
  const { user: authUser } = useAuth();
  const [creditEnabled, setCreditEnabled] = useState(false);
  const [closingDay, setClosingDay] = useState('6');
  const [paymentDay, setPaymentDay] = useState('10');

  const { toast } = useToast();

  // Carregar config do cartão
  useEffect(() => {
    if (!authUser) return;
    const refSettings = ref(database, `creditCardSettings/${authUser.uid}`);
    const unsub = onValue(refSettings, (snap) => {
      const data = snap.val();
      if (data) {
        setCreditEnabled(!!data.enabled);
        setClosingDay(data.closingDay?.toString() || '6');
        setPaymentDay(data.paymentDay?.toString() || '10');
      }
    });
    return () => unsub();
  }, [authUser]);

  // Salvar config do cartão
  const handleSaveCreditSettings = async () => {
    if (!authUser) return;
    try {
      await set(ref(database, `creditCardSettings/${authUser.uid}`), {
        enabled: creditEnabled,
        closingDay: closingDay,
        paymentDay: paymentDay,
      });
      toast({
        title: 'Configuração salva!',
        description: 'As configurações do cartão de crédito foram salvas com sucesso.',
        variant: 'success',
      });
    } catch (err) {
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar as configurações do cartão.',
        variant: 'destructive',
      });
    }
  };

  const handleThemeChange = (value: string) => {
    const newTheme = value as 'light' | 'dark';
    setTheme(newTheme);
    
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const handleProfileUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    // Logic to update profile
    setProfileDialogOpen(false);
  };

  const handlePasswordUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    // Logic to update password
    setPasswordDialogOpen(false);
  };

  const handleEmailUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    // Logic to update email
    setEmailDialogOpen(false);
  };

  const handleExportData = async () => {
    if (!authUser) return;
    try {
      // Buscar dados reais do Firebase
      const [catSnap, shopSnap, transSnap] = await Promise.all([
        import('firebase/database').then(({ get, ref }) => get(ref(database, `categories/${authUser.uid}`))),
        import('firebase/database').then(({ get, ref }) => get(ref(database, `shoppingLists/${authUser.uid}`))),
        import('firebase/database').then(({ get, ref }) => get(ref(database, `transactions/${authUser.uid}`))),
      ]);
    const exportData = {
        categories: catSnap?.val() || {},
        shoppingLists: shopSnap?.val() || {},
        transactions: transSnap?.val() || {},
      };
    const dataStr = JSON.stringify(exportData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = 'tucano-data.json';
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    } catch (error) {
      toast({
        title: 'Erro ao exportar',
        description: 'Não foi possível exportar seus dados.',
        variant: 'destructive',
      });
    }
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !authUser) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const jsonData = JSON.parse(event.target?.result as string);
        // Importar dados para o Firebase
        const updates: any = {};
        if (jsonData.categories) updates[`categories/${authUser.uid}`] = jsonData.categories;
        if (jsonData.shoppingLists) updates[`shoppingLists/${authUser.uid}`] = jsonData.shoppingLists;
        if (jsonData.transactions) updates[`transactions/${authUser.uid}`] = jsonData.transactions;
        await Promise.all(Object.entries(updates).map(([path, value]) => set(ref(database, path), value)));
        toast({
          title: 'Importação concluída!',
          description: 'Os dados foram importados com sucesso.',
          variant: 'default',
        });
      } catch (error) {
        toast({
          title: 'Erro ao importar',
          description: 'O arquivo não pôde ser importado. Verifique o formato.',
          variant: 'destructive',
        });
      }
    };
    reader.readAsText(file);
  };

  const handleDeleteData = async () => {
    if (!authUser) return;
    try {
      await Promise.all([
        remove(ref(database, `categories/${authUser.uid}`)),
        remove(ref(database, `shoppingLists/${authUser.uid}`)),
        remove(ref(database, `transactions/${authUser.uid}`)),
        remove(ref(database, `creditCardSettings/${authUser.uid}`)),
      ]);
      toast({
        title: 'Dados excluídos!',
        description: 'Todos os seus dados foram removidos com sucesso.',
        variant: 'default',
      });
    } catch (error) {
      toast({
        title: 'Erro ao excluir',
        description: 'Não foi possível excluir seus dados.',
        variant: 'destructive',
      });
    }
    setDeleteDialogOpen(false);
  };

  return (
    <MainLayout title="Configurações">
      <div className="space-y-6 overflow-x-hidden max-w-full">
        <div className="grid gap-6 max-w-full">
          
          {/* Theme Card */}
          <Card className="card-hover max-w-full">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <Palette className="h-5 w-5 text-primary" />
                <CardTitle>Aparência</CardTitle>
              </div>
              <CardDescription>
                Personalize a aparência do aplicativo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-w-full">
                <Label htmlFor="theme">Tema</Label>
                <ToggleGroup 
                  type="single" 
                  className="justify-start" 
                  value={theme}
                  onValueChange={(value) => value && handleThemeChange(value)}
                >
                  <ToggleGroupItem value="light">Claro</ToggleGroupItem>
                  <ToggleGroupItem value="dark">Escuro</ToggleGroupItem>
                </ToggleGroup>
              </div>
            </CardContent>
          </Card>
          
          {/* Categories Card */}
          <Card className="card-hover max-w-full">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <Tags className="h-5 w-5 text-primary" />
                <CardTitle>Categorias</CardTitle>
              </div>
              <CardDescription>
                Gerencie suas categorias para despesas, receitas e compras
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-w-full">
                <div>
                  <Label htmlFor="categoryType">Tipo de categoria</Label>
                  <Select 
                    value={categoryType}
                    onValueChange={(value) => setCategoryType(value as 'expense' | 'income' | 'shopping')}
                  >
                    <SelectTrigger className="mt-1 max-w-full">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="shopping">Categorias de Compras</SelectItem>
                      <SelectItem value="expense">Categorias de Despesas</SelectItem>
                      <SelectItem value="income">Categorias de Receitas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={() => setShowCategories(true)}>Gerenciar Categorias</Button>
            </CardFooter>
          </Card>
          
          {/* Cartão de Crédito Card */}
          <Card className="card-hover max-w-full">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <CreditCard className="h-5 w-5 text-primary" />
                <CardTitle>Cartão de Crédito</CardTitle>
              </div>
              <CardDescription>
                Configure o uso do cartão de crédito para agendamento automático de parcelas.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-4">
                  <Label htmlFor="credit-enabled">Habilitar cartão de crédito</Label>
                  <Switch
                    id="credit-enabled"
                    checked={creditEnabled}
                    onCheckedChange={setCreditEnabled}
                    title="Habilitar cartão de crédito"
                  />
                </div>
                {creditEnabled && (
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex flex-col flex-1 min-w-[120px]">
                      <Label htmlFor="closing-day">Dia de fechamento</Label>
                      <Input
                        id="closing-day"
                        type="number"
                        min={1}
                        max={31}
                        value={closingDay}
                        onChange={e => setClosingDay(e.target.value)}
                        className="w-full"
                        placeholder="Ex: 6"
                        title="Dia de fechamento da fatura"
                      />
                    </div>
                    <div className="flex flex-col flex-1 min-w-[120px]">
                      <Label htmlFor="payment-day">Dia de pagamento</Label>
                      <Input
                        id="payment-day"
                        type="number"
                        min={1}
                        max={31}
                        value={paymentDay}
                        onChange={e => setPaymentDay(e.target.value)}
                        className="w-full"
                        placeholder="Ex: 10"
                        title="Dia de pagamento da fatura"
                      />
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSaveCreditSettings} className="w-full sm:w-auto">Salvar Configuração</Button>
            </CardFooter>
          </Card>
          
          {/* Danger Zone Card */}
          <Card className="card-hover border-destructive/20 max-w-full">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <ShieldAlert className="h-5 w-5 text-destructive" />
                <CardTitle className="text-destructive">Zona de Perigo</CardTitle>
              </div>
              <CardDescription>
                Ações que podem resultar em perda permanente de dados
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 max-w-full">
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                <strong>Atenção:</strong> As ações abaixo são potencialmente perigosas e podem resultar em perda permanente de dados. 
                Prossiga com cautela.
              </div>
            </CardContent>
            <CardFooter className="flex flex-wrap gap-2 max-w-full">
              <Button 
                variant="outline" 
                onClick={handleExportData}
                className="flex items-center"
              >
                <FileText className="h-4 w-4 mr-2" />
                Exportar Dados
              </Button>
              
              <div className="relative">
                <Button 
                  variant="outline"
                  className="flex items-center"
                  onClick={() => document.getElementById('import-file')?.click()}
                >
                  <Import className="h-4 w-4 mr-2" />
                  Importar Dados
                </Button>
                <input 
                  type="file" 
                  id="import-file" 
                  accept=".json" 
                  className="hidden"
                  onChange={handleImportData}
                  title="Importar arquivo JSON"
                />
              </div>
              
              <Button 
                variant="outline" 
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir Dados
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Profile Dialog */}
        <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Perfil</DialogTitle>
              <DialogDescription>
                Atualize suas informações pessoais.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleProfileUpdate}>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome</Label>
                  <Input 
                    id="name" 
                    value={user.name} 
                    onChange={(e) => setUser({...user, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nickname">Nome de Usuário</Label>
                  <Input 
                    id="nickname" 
                    value={user.nickname} 
                    onChange={(e) => setUser({...user, nickname: e.target.value})}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setProfileDialogOpen(false)}>Cancelar</Button>
                <Button type="submit">Salvar Alterações</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Password Dialog */}
        <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Atualizar Senha</DialogTitle>
              <DialogDescription>
                Insira sua senha atual e uma nova senha.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handlePasswordUpdate}>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Senha Atual</Label>
                  <Input id="currentPassword" type="password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">Nova Senha</Label>
                  <Input id="newPassword" type="password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                  <Input id="confirmPassword" type="password" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setPasswordDialogOpen(false)}>Cancelar</Button>
                <Button type="submit">Atualizar Senha</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Email Dialog */}
        <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Atualizar Email</DialogTitle>
              <DialogDescription>
                Insira seu novo endereço de email.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEmailUpdate}>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="currentEmail">Email Atual</Label>
                  <Input id="currentEmail" type="email" value={user.email} disabled />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newEmail">Novo Email</Label>
                  <Input id="newEmail" type="email" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input id="password" type="password" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setEmailDialogOpen(false)}>Cancelar</Button>
                <Button type="submit">Atualizar Email</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Data Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. Todos os seus dados serão permanentemente excluídos.
                Seus dados de usuário (nome, email) serão mantidos, mas todas as listas, transações e configurações serão removidas.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteData} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Sim, Excluir Dados
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Categories Management Dialog */}
        <Dialog open={showCategories} onOpenChange={setShowCategories}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {categoryType === 'shopping' && "Categorias de Compras"}
                {categoryType === 'expense' && "Categorias de Despesas"}
                {categoryType === 'income' && "Categorias de Receitas"}
              </DialogTitle>
              <DialogDescription>
                Gerencie suas categorias para melhor organização.
              </DialogDescription>
            </DialogHeader>
            <CategoryManagement type={categoryType} />
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default Settings;
