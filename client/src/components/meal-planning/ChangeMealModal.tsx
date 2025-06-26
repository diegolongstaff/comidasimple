import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, Search } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";

interface ChangeMealModalProps {
  isOpen: boolean;
  onClose: () => void;
  mealId: string;
  fecha: string;
  momento: string;
  currentRecipeId: string;
}

export default function ChangeMealModal({ 
  isOpen, 
  onClose, 
  mealId, 
  fecha, 
  momento, 
  currentRecipeId 
}: ChangeMealModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRecipeId, setSelectedRecipeId] = useState(currentRecipeId);

  const { data: recipes = [], isLoading } = useQuery({
    queryKey: ['/api/recetas', searchTerm],
    queryFn: async () => {
      const params = searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : '';
      const response = await fetch(`/api/recetas${params}`);
      if (!response.ok) throw new Error('Failed to fetch recipes');
      return response.json();
    },
    enabled: isOpen,
  });

  const changeMealMutation = useMutation({
    mutationFn: async (recipeId: string) => {
      return await apiRequest('PUT', `/api/comidas-semana/${mealId}`, {
        recetaId: recipeId
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/comidas-semana'] });
      toast({
        title: "Comida actualizada",
        description: "La receta ha sido cambiada exitosamente",
      });
      onClose();
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "No se pudo cambiar la receta",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    if (selectedRecipeId && selectedRecipeId !== currentRecipeId) {
      changeMealMutation.mutate(selectedRecipeId);
    } else {
      onClose();
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long' 
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cambiar Receta</DialogTitle>
          <p className="text-sm text-gray-500">
            {formatDate(fecha)} - {momento}
          </p>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar recetas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Recipe List */}
          <div className="max-h-96 overflow-y-auto space-y-2">
            {isLoading ? (
              <p className="text-center text-gray-500">Cargando recetas...</p>
            ) : recipes.length === 0 ? (
              <p className="text-center text-gray-500">No se encontraron recetas</p>
            ) : (
              recipes.map((recipe: any) => (
                <Card 
                  key={recipe.id} 
                  className={`cursor-pointer transition-colors ${
                    selectedRecipeId === recipe.id 
                      ? 'ring-2 ring-primary bg-primary-light/20' 
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedRecipeId(recipe.id)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                        <img
                          src={recipe.imagen_url || "/api/placeholder/48/48"}
                          alt={recipe.nombre}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate">{recipe.nombre}</h4>
                        <p className="text-xs text-gray-500 line-clamp-2">{recipe.descripcion}</p>
                        <div className="flex items-center space-x-3 mt-1">
                          <div className="flex items-center space-x-1 text-xs text-gray-500">
                            <Clock className="h-3 w-3" />
                            <span>{recipe.tiempo_min || 30} min</span>
                          </div>
                          <div className="flex items-center space-x-1 text-xs text-gray-500">
                            <Users className="h-3 w-3" />
                            <span>{recipe.porciones_base || 4} porciones</span>
                          </div>
                        </div>
                        {/* Tags */}
                        {recipe.tags && recipe.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {recipe.tags.slice(0, 3).map((tag: any) => (
                              <Badge key={tag.id} variant="secondary" className="text-xs">
                                {tag.nombre}
                              </Badge>
                            ))}
                            {recipe.tags.length > 3 && (
                              <Badge variant="secondary" className="text-xs">
                                +{recipe.tags.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSave}
              disabled={changeMealMutation.isPending || selectedRecipeId === currentRecipeId}
            >
              {changeMealMutation.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}