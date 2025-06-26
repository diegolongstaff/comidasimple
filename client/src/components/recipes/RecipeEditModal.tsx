import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Save } from "lucide-react";

interface RecipeEditModalProps {
  recipeId: string;
  onClose: () => void;
  onSave?: () => void;
}

interface EditableRecipe {
  nombre: string;
  descripcion: string;
  tiempoMin: number;
  porcionesBase: number;
}

export default function RecipeEditModal({ recipeId, onClose, onSave }: RecipeEditModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [recipe, setRecipe] = useState<EditableRecipe>({
    nombre: "",
    descripcion: "",
    tiempoMin: 30,
    porcionesBase: 4
  });

  // Get recipe details
  const { data: recipeData, isLoading } = useQuery({
    queryKey: ['/api/recetas', recipeId],
    queryFn: async () => {
      const response = await fetch(`/api/recetas/${recipeId}`);
      if (!response.ok) throw new Error('Failed to fetch recipe');
      return response.json();
    },
    enabled: !!recipeId,
  });

  // Load recipe data when available
  useEffect(() => {
    if (recipeData) {
      setRecipe({
        nombre: recipeData.nombre || "",
        descripcion: recipeData.descripcion || "",
        tiempoMin: recipeData.tiempo_min || 30,
        porcionesBase: recipeData.porciones_base || 4
      });
    }
  }, [recipeData]);

  // Save edited recipe mutation
  const saveRecipeMutation = useMutation({
    mutationFn: async (editedRecipe: EditableRecipe) => {
      const payload = {
        nombre: editedRecipe.nombre,
        descripcion: editedRecipe.descripcion,
        tiempo_min: editedRecipe.tiempoMin,
        porciones_base: editedRecipe.porcionesBase,
        copiada_de_id: recipeId, // Reference to original recipe
        es_oficial: false,
        es_publica: false
      };

      const response = await fetch('/api/recetas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save recipe');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "¡Receta guardada!",
        description: "Tu versión personalizada ha sido creada exitosamente",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/recetas/mis-recetas'] });
      onSave?.();
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo guardar la receta",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    if (!recipe.nombre.trim()) {
      toast({
        title: "Error",
        description: "El nombre de la receta es obligatorio",
        variant: "destructive",
      });
      return;
    }

    saveRecipeMutation.mutate(recipe);
  };

  if (isLoading) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            Editar Receta
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Recipe Name */}
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre de la receta</Label>
            <Input
              id="nombre"
              value={recipe.nombre}
              onChange={(e) => setRecipe(prev => ({ ...prev, nombre: e.target.value }))}
              placeholder="Ej: Mi versión de Pasta Carbonara"
            />
          </div>

          {/* Time and Portions */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tiempo">Tiempo (min)</Label>
              <Input
                id="tiempo"
                type="number"
                value={recipe.tiempoMin}
                onChange={(e) => setRecipe(prev => ({ ...prev, tiempoMin: parseInt(e.target.value) || 0 }))}
                min="1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="porciones">Porciones</Label>
              <Input
                id="porciones"
                type="number"
                value={recipe.porcionesBase}
                onChange={(e) => setRecipe(prev => ({ ...prev, porcionesBase: parseInt(e.target.value) || 1 }))}
                min="1"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="descripcion">Descripción</Label>
            <Textarea
              id="descripcion"
              value={recipe.descripcion}
              onChange={(e) => setRecipe(prev => ({ ...prev, descripcion: e.target.value }))}
              placeholder="Describe tu versión de la receta..."
              rows={8}
              className="resize-none"
            />
          </div>

          {/* Info Badge */}
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              Se creará como tu receta personal
            </Badge>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSave}
            disabled={saveRecipeMutation.isPending}
            className="bg-primary hover:bg-primary/90"
          >
            {saveRecipeMutation.isPending ? (
              <>
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                Guardando...
              </>
            ) : (
              <>
                <Save className="h-3 w-3 mr-2" />
                Guardar Receta
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}