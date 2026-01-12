import { Check, ChevronDown, Zap, Gauge, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { AI_MODELS, AIModel, getModelById } from '@/lib/models';
import { cn } from '@/lib/utils';

interface ModelSelectorProps {
  value: string;
  onChange: (modelId: string) => void;
  disabled?: boolean;
}

function QualityBadge({ quality }: { quality: AIModel['quality'] }) {
  if (quality === 'premium') {
    return (
      <span className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary">
        <Crown className="w-2.5 h-2.5" />
        Pro
      </span>
    );
  }
  return null;
}

function SpeedIcon({ speed }: { speed: AIModel['speed'] }) {
  if (speed === 'fast') return <Zap className="w-3 h-3 text-success" />;
  if (speed === 'balanced') return <Gauge className="w-3 h-3 text-warning" />;
  return <Crown className="w-3 h-3 text-primary" />;
}

export function ModelSelector({ value, onChange, disabled }: ModelSelectorProps) {
  const selectedModel = getModelById(value);

  const googleModels = AI_MODELS.filter(m => m.provider === 'google');
  const openaiModels = AI_MODELS.filter(m => m.provider === 'openai');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          className="h-8 gap-2 text-xs bg-secondary/50 border-border hover:bg-secondary"
        >
          <SpeedIcon speed={selectedModel?.speed ?? 'fast'} />
          <span className="max-w-[100px] truncate">{selectedModel?.name ?? 'Select Model'}</span>
          <ChevronDown className="w-3 h-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="text-xs text-muted-foreground">Google Models</DropdownMenuLabel>
        {googleModels.map((model) => (
          <DropdownMenuItem
            key={model.id}
            onClick={() => onChange(model.id)}
            className="flex items-start gap-3 py-2"
          >
            <SpeedIcon speed={model.speed} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{model.name}</span>
                <QualityBadge quality={model.quality} />
              </div>
              <p className="text-xs text-muted-foreground truncate">{model.description}</p>
            </div>
            {value === model.id && <Check className="w-4 h-4 text-primary" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs text-muted-foreground">OpenAI Models</DropdownMenuLabel>
        {openaiModels.map((model) => (
          <DropdownMenuItem
            key={model.id}
            onClick={() => onChange(model.id)}
            className="flex items-start gap-3 py-2"
          >
            <SpeedIcon speed={model.speed} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{model.name}</span>
                <QualityBadge quality={model.quality} />
              </div>
              <p className="text-xs text-muted-foreground truncate">{model.description}</p>
            </div>
            {value === model.id && <Check className="w-4 h-4 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
