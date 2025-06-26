import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, startOfWeek, addDays } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

interface GroceryListPreviewProps {
  expanded?: boolean;
}

export default function GroceryListPreview({ expanded = false }: GroceryListPreviewProps) {
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  
  const currentWeek = new Date();
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, 6);
  
  const { data: groceryList = [], isLoading } = useQuery({
    queryKey: ['/api/grocery-list', format(weekStart, 'yyyy-MM-dd'), format(weekEnd, 'yyyy-MM-dd')],
  });

  const toggleItem = (itemId: string) => {
    const newCheckedItems = new Set(checkedItems);
    if (newCheckedItems.has(itemId)) {
      newCheckedItems.delete(itemId);
    } else {
      newCheckedItems.add(itemId);
    }
    setCheckedItems(newCheckedItems);
  };

  // Fallback data for preview
  const displayItems = groceryList.length > 0 ? groceryList : [
    { id: "1", ingrediente: { nombre: "Pollo" }, cantidadTotal: 1, unidadMedida: "kg" },
    { id: "2", ingrediente: { nombre: "Tomates" }, cantidadTotal: 500, unidadMedida: "g" },
    { id: "3", ingrediente: { nombre: "Pasta" }, cantidadTotal: 2, unidadMedida: "paquetes" },
    { id: "4", ingrediente: { nombre: "Cebolla" }, cantidadTotal: 3, unidadMedida: "unidades" },
    { id: "5", ingrediente: { nombre: "Aceite de oliva" }, cantidadTotal: 1, unidadMedida: "botella" },
  ];

  const previewItems = expanded ? displayItems : displayItems.slice(0, 3);
  const totalItems = displayItems.length;
  const estimatedTotal = "45.300"; // This would be calculated from actual prices

  return (
    <section className="px-4 py-6 border-t border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-dark-text">Lista de Compras</h2>
        {!expanded && (
          <Button variant="ghost" className="text-primary text-sm font-medium">
            Ver completa →
          </Button>
        )}
      </div>

      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-600">Para esta semana</p>
            <Badge variant="secondary" className="bg-accent text-white">
              {totalItems} items
            </Badge>
          </div>
          
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-3">
                  <div className="w-5 h-5 bg-gray-200 rounded animate-pulse"></div>
                  <div className="flex-1 h-4 bg-gray-200 rounded animate-pulse"></div>
                  <div className="w-12 h-4 bg-gray-200 rounded animate-pulse"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {previewItems.map((item: any) => {
                const isChecked = checkedItems.has(item.id);
                const itemKey = `${item.ingrediente.nombre}-${item.id}`;
                
                return (
                  <div key={itemKey} className="flex items-center space-x-3">
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={() => toggleItem(item.id)}
                      className="w-5 h-5 border-gray-300 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                    <span 
                      className={`flex-1 text-sm ${
                        isChecked 
                          ? 'text-gray-400 line-through' 
                          : 'text-dark-text'
                      }`}
                    >
                      {item.ingrediente.nombre} ({item.cantidadTotal} {item.unidadMedida})
                    </span>
                    <span 
                      className={`text-xs ${
                        isChecked ? 'text-gray-400' : 'text-gray-500'
                      }`}
                    >
                      ${(Math.random() * 10 + 1).toFixed(3)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-sm font-medium text-dark-text">Total estimado</span>
            <span className="text-lg font-bold text-primary">${estimatedTotal}</span>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
