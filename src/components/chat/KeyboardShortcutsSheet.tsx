import { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Keyboard, Eye, Code, History, Upload, RefreshCw, Command, Settings, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ShortcutConfig {
  id: string;
  label: string;
  description: string;
  defaultKey: string;
  icon: React.ReactNode;
  enabled: boolean;
  category: 'navigation' | 'actions' | 'deployment';
}

interface KeyboardShortcutsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SHORTCUTS_KEY = 'eternity_keyboard_shortcuts';

const defaultShortcuts: ShortcutConfig[] = [
  {
    id: 'preview',
    label: 'Preview Tab',
    description: 'Switch to live preview panel',
    defaultKey: 'Cmd+1',
    icon: <Eye className="w-4 h-4" />,
    enabled: true,
    category: 'navigation',
  },
  {
    id: 'code',
    label: 'Code Tab',
    description: 'Switch to code editor panel',
    defaultKey: 'Cmd+2',
    icon: <Code className="w-4 h-4" />,
    enabled: true,
    category: 'navigation',
  },
  {
    id: 'history',
    label: 'History Tab',
    description: 'Switch to version history panel',
    defaultKey: 'Cmd+3',
    icon: <History className="w-4 h-4" />,
    enabled: true,
    category: 'navigation',
  },
  {
    id: 'diff',
    label: 'Diff View',
    description: 'Toggle diff comparison view',
    defaultKey: 'Cmd+D',
    icon: <Zap className="w-4 h-4" />,
    enabled: true,
    category: 'navigation',
  },
  {
    id: 'refresh',
    label: 'Refresh Preview',
    description: 'Reload the live preview',
    defaultKey: 'Cmd+R',
    icon: <RefreshCw className="w-4 h-4" />,
    enabled: true,
    category: 'actions',
  },
  {
    id: 'deploy-vercel',
    label: 'Deploy to Vercel',
    description: 'Quick deploy current version to Vercel',
    defaultKey: 'Cmd+Shift+V',
    icon: <Upload className="w-4 h-4" />,
    enabled: true,
    category: 'deployment',
  },
  {
    id: 'deploy-netlify',
    label: 'Deploy to Netlify',
    description: 'Quick deploy current version to Netlify',
    defaultKey: 'Cmd+Shift+N',
    icon: <Upload className="w-4 h-4" />,
    enabled: true,
    category: 'deployment',
  },
  {
    id: 'export',
    label: 'Export Dialog',
    description: 'Open export/deploy dialog',
    defaultKey: 'Cmd+E',
    icon: <Settings className="w-4 h-4" />,
    enabled: true,
    category: 'actions',
  },
];

export function useKeyboardShortcuts(handlers: Record<string, () => void>) {
  const [shortcuts, setShortcuts] = useState<ShortcutConfig[]>(() => {
    const saved = localStorage.getItem(SHORTCUTS_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return defaultShortcuts;
      }
    }
    return defaultShortcuts;
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdKey = isMac ? e.metaKey : e.ctrlKey;
      
      if (!cmdKey) return;

      for (const shortcut of shortcuts) {
        if (!shortcut.enabled) continue;
        
        const key = shortcut.defaultKey
          .replace('Cmd+', '')
          .replace('Shift+', '')
          .toLowerCase();
        const needsShift = shortcut.defaultKey.includes('Shift+');
        
        if (
          e.key.toLowerCase() === key &&
          ((needsShift && e.shiftKey) || (!needsShift && !e.shiftKey))
        ) {
          e.preventDefault();
          handlers[shortcut.id]?.();
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts, handlers]);

  return { shortcuts, setShortcuts };
}

export function KeyboardShortcutsSheet({ open, onOpenChange }: KeyboardShortcutsSheetProps) {
  const [shortcuts, setShortcuts] = useState<ShortcutConfig[]>(() => {
    const saved = localStorage.getItem(SHORTCUTS_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return defaultShortcuts;
      }
    }
    return defaultShortcuts;
  });

  const toggleShortcut = (id: string) => {
    const updated = shortcuts.map(s => 
      s.id === id ? { ...s, enabled: !s.enabled } : s
    );
    setShortcuts(updated);
    localStorage.setItem(SHORTCUTS_KEY, JSON.stringify(updated));
  };

  const resetToDefaults = () => {
    setShortcuts(defaultShortcuts);
    localStorage.setItem(SHORTCUTS_KEY, JSON.stringify(defaultShortcuts));
  };

  const categories = [
    { id: 'navigation', label: 'Navigation', description: 'Switch between panels' },
    { id: 'actions', label: 'Actions', description: 'Common actions' },
    { id: 'deployment', label: 'Deployment', description: 'Deploy your project' },
  ];

  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const cmdSymbol = isMac ? '⌘' : 'Ctrl';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-primary" />
            Keyboard Shortcuts
          </SheetTitle>
          <SheetDescription>
            Customize your keyboard shortcuts for faster workflow
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-180px)] mt-6 pr-4">
          <div className="space-y-6">
            {categories.map(category => (
              <div key={category.id} className="space-y-3">
                <div>
                  <h3 className="text-sm font-semibold">{category.label}</h3>
                  <p className="text-xs text-muted-foreground">{category.description}</p>
                </div>
                
                <div className="space-y-2">
                  {shortcuts
                    .filter(s => s.category === category.id)
                    .map(shortcut => (
                      <div
                        key={shortcut.id}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-lg border transition-colors",
                          shortcut.enabled ? "bg-card" : "bg-muted/30 opacity-60"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "p-2 rounded-md",
                            shortcut.enabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                          )}>
                            {shortcut.icon}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{shortcut.label}</p>
                            <p className="text-xs text-muted-foreground">{shortcut.description}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <kbd className={cn(
                            "px-2 py-1 text-xs font-mono rounded border",
                            shortcut.enabled 
                              ? "bg-muted border-border" 
                              : "bg-muted/50 border-border/50 text-muted-foreground"
                          )}>
                            {shortcut.defaultKey.replace('Cmd', cmdSymbol)}
                          </kbd>
                          <Switch
                            checked={shortcut.enabled}
                            onCheckedChange={() => toggleShortcut(shortcut.id)}
                          />
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="mt-4 pt-4 border-t">
          <Button variant="outline" onClick={resetToDefaults} className="w-full">
            Reset to Defaults
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
