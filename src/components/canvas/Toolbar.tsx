import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { 
  Pencil, 
  Eraser, 
  MousePointer2, 
  Undo2, 
  Trash2,
  Minus,
  Plus
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ToolbarProps {
  tool: 'brush' | 'eraser' | 'select';
  setTool: (tool: 'brush' | 'eraser' | 'select') => void;
  brushColor: string;
  setBrushColor: (color: string) => void;
  brushWidth: number;
  setBrushWidth: (width: number) => void;
  onUndo: () => void;
  onClear: () => void;
}

const COLORS = [
  '#2D2926', // Charcoal
  '#8B7355', // Taupe
  '#D4A574', // Rose gold
  '#C9B896', // Gold
  '#6B8E8E', // Teal
  '#8B4D5A', // Burgundy
  '#4A5568', // Slate
  '#9B8B7A', // Warm gray
];

const Toolbar = ({
  tool,
  setTool,
  brushColor,
  setBrushColor,
  brushWidth,
  setBrushWidth,
  onUndo,
  onClear,
}: ToolbarProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-3 bg-card border border-border rounded-2xl shadow-elevated"
    >
      {/* Drawing Tools */}
      <div className="flex items-center gap-1 pr-3 border-r border-border">
        <Button
          variant="canvas"
          size="icon-sm"
          className={cn(
            "transition-all",
            tool === 'select' && "bg-primary text-primary-foreground"
          )}
          onClick={() => setTool('select')}
        >
          <MousePointer2 className="w-4 h-4" />
        </Button>
        <Button
          variant="canvas"
          size="icon-sm"
          className={cn(
            "transition-all",
            tool === 'brush' && "bg-primary text-primary-foreground"
          )}
          onClick={() => setTool('brush')}
        >
          <Pencil className="w-4 h-4" />
        </Button>
        <Button
          variant="canvas"
          size="icon-sm"
          className={cn(
            "transition-all",
            tool === 'eraser' && "bg-primary text-primary-foreground"
          )}
          onClick={() => setTool('eraser')}
        >
          <Eraser className="w-4 h-4" />
        </Button>
      </div>

      {/* Color Picker */}
      <div className="flex items-center gap-1.5 px-2">
        {COLORS.map(color => (
          <button
            key={color}
            className={cn(
              "w-6 h-6 rounded-full transition-all hover:scale-110",
              brushColor === color && "ring-2 ring-offset-2 ring-foreground/50"
            )}
            style={{ backgroundColor: color }}
            onClick={() => setBrushColor(color)}
          />
        ))}
      </div>

      {/* Brush Size */}
      <div className="flex items-center gap-1 px-2 border-l border-border">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setBrushWidth(Math.max(1, brushWidth - 1))}
        >
          <Minus className="w-3 h-3" />
        </Button>
        <span className="w-8 text-center text-sm font-medium">{brushWidth}</span>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setBrushWidth(Math.min(20, brushWidth + 1))}
        >
          <Plus className="w-3 h-3" />
        </Button>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 pl-2 border-l border-border">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onUndo}
        >
          <Undo2 className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={onClear}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </motion.div>
  );
};

export default Toolbar;
