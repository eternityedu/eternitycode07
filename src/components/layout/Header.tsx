import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { LogOut, Settings, Sparkles } from 'lucide-react';
import logo from '@/assets/logo.png';

export function Header() {
  const { user, signOut } = useAuth();

  return (
    <header className="border-b border-border/50 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 font-semibold group">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/30 blur-lg rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" />
            <img src={logo} alt="Eternity Code" className="relative w-8 h-8 rounded-lg" />
          </div>
          <span className="text-lg tracking-tight">Eternity Code</span>
        </Link>

        <nav className="flex items-center gap-3">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full ring-1 ring-border hover:ring-primary/50 transition-all">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-primary/20 text-primary font-semibold">
                      {user.email?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <div className="flex items-center gap-3 p-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/20 text-primary font-semibold">
                      {user.email?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <p className="text-sm font-medium truncate">{user.email}</p>
                    <p className="text-xs text-muted-foreground">Free plan</p>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/settings" className="cursor-pointer gap-2">
                    <Settings className="w-4 h-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="cursor-pointer text-destructive gap-2">
                  <LogOut className="w-4 h-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex gap-2">
              <Button variant="ghost" asChild className="text-muted-foreground hover:text-foreground">
                <Link to="/auth">Sign in</Link>
              </Button>
              <Button asChild className="gap-2 glow-primary">
                <Link to="/auth?mode=signup">
                  <Sparkles className="w-4 h-4" />
                  Get Started
                </Link>
              </Button>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
