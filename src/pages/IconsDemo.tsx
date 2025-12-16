import { Wrench, Settings, Settings2, Cog, SlidersHorizontal, Hammer, Gauge, CircleDot, MoreHorizontal, MoreVertical, Menu, Grid3X3, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";

const IconsDemo = () => {
  const icons = [
    { name: "Wrench", icon: Wrench, label: "מפתח ברגים" },
    { name: "Settings", icon: Settings, label: "הגדרות" },
    { name: "Settings2", icon: Settings2, label: "הגדרות 2" },
    { name: "Cog", icon: Cog, label: "גלגל שיניים" },
    { name: "SlidersHorizontal", icon: SlidersHorizontal, label: "סליידרים" },
    { name: "Hammer", icon: Hammer, label: "פטיש" },
    { name: "Gauge", icon: Gauge, label: "מד" },
    { name: "MoreHorizontal", icon: MoreHorizontal, label: "נקודות אופקיות" },
    { name: "MoreVertical", icon: MoreVertical, label: "נקודות אנכיות" },
    { name: "Menu", icon: Menu, label: "תפריט" },
    { name: "Grid3X3", icon: Grid3X3, label: "רשת" },
    { name: "LayoutGrid", icon: LayoutGrid, label: "פריסה" },
  ];

  return (
    <div className="min-h-screen bg-background p-8" dir="rtl">
      <h1 className="text-2xl font-bold text-center mb-8">בחר אייקון לכפתור פעולות</h1>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 max-w-4xl mx-auto">
        {icons.map(({ name, icon: Icon, label }) => (
          <div key={name} className="flex flex-col items-center gap-4 p-6 border rounded-xl hover:bg-muted/50 transition-colors">
            <div className="p-4 bg-muted rounded-full">
              <Icon className="h-8 w-8" />
            </div>
            <div className="text-center">
              <p className="font-medium">{label}</p>
              <p className="text-xs text-muted-foreground">{name}</p>
            </div>
            <Button variant="outline" size="sm" className="gap-2">
              <Icon className="h-4 w-4" />
              <span>פעולות</span>
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default IconsDemo;
