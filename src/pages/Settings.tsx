import { Header } from '@/components/layout/Header';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { Loader2, User, Shield, Key, Palette } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CustomApiSettings } from '@/components/settings/CustomApiSettings';

export default function Settings() {
  const { user, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container py-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold mb-2 text-gradient">Settings</h1>
          <p className="text-muted-foreground mb-8">Manage your account and AI preferences</p>

          <Tabs defaultValue="account" className="space-y-6">
            <TabsList className="bg-secondary/50">
              <TabsTrigger value="account" className="gap-2">
                <User className="w-4 h-4" />
                Account
              </TabsTrigger>
              <TabsTrigger value="ai" className="gap-2">
                <Key className="w-4 h-4" />
                AI Settings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="account" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5 text-primary" />
                    Account Information
                  </CardTitle>
                  <CardDescription>Your account details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input value={user.email || ''} disabled className="bg-secondary/30" />
                  </div>
                  <div className="space-y-2">
                    <Label>User ID</Label>
                    <Input value={user.id} disabled className="font-mono text-xs bg-secondary/30" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-destructive/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-destructive">
                    <Shield className="w-5 h-5" />
                    Danger Zone
                  </CardTitle>
                  <CardDescription>Irreversible actions</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="destructive" onClick={signOut}>
                    Sign Out
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="ai" className="space-y-6">
              <CustomApiSettings />
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="w-5 h-5 text-primary" />
                    Built-in AI Models
                  </CardTitle>
                  <CardDescription>
                    Eternity Code includes access to multiple AI models at no additional cost.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                      <div>
                        <p className="font-medium">Gemini 3 Flash</p>
                        <p className="text-xs text-muted-foreground">Fast & efficient</p>
                      </div>
                      <span className="text-xs bg-green-500/20 text-green-600 px-2 py-1 rounded">Available</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                      <div>
                        <p className="font-medium">Gemini 2.5 Pro</p>
                        <p className="text-xs text-muted-foreground">Complex reasoning</p>
                      </div>
                      <span className="text-xs bg-green-500/20 text-green-600 px-2 py-1 rounded">Available</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                      <div>
                        <p className="font-medium">GPT-5</p>
                        <p className="text-xs text-muted-foreground">Premium quality</p>
                      </div>
                      <span className="text-xs bg-green-500/20 text-green-600 px-2 py-1 rounded">Available</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
