import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Users, Star, Edit, ChefHat } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";

interface RecipeDetailProps {
  recipeId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

interface RecipeDetailData {
  id: string;
  nombre: string;
  descripcion: string;
  imagen_url?: string;
  tiempo_min: number;
  porciones_base: number;
  tags: Array<{ id: string; nombre: string; color?: string; icono?: string }>;
  ingredientes: Array<{ id: string; nombre: string; cantidad: number; unidad_medida: string }>;
  rating?: number;
}

export default function RecipeDetail({ recipeId, isOpen, onClose }: RecipeDetailProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [userRating, setUserRating] = useState(0);
  
  const { data: recipe, isLoading, error } = useQuery({
    queryKey: ['/api/recetas', recipeId],
    queryFn: async () => {
      if (!recipeId) return null;
      const response = await fetch(`/api/recetas/${recipeId}`);
      if (!response.ok) throw new Error('Failed to fetch recipe details');
      return response.json();
    },
    enabled: !!recipeId && isOpen,
  });

  // Update local rating when recipe data changes
  useEffect(() => {
    if (recipe?.rating) {
      setUserRating(recipe.rating);
    }
  }, [recipe?.rating]);

  const rateRecipeMutation = useMutation({
    mutationFn: async (rating: number) => {
      if (!recipeId) return;
      const response = await fetch(`/api/recetas/${recipeId}/rate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ puntaje: rating }),
      });
      if (!response.ok) throw new Error('Failed to rate recipe');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/recetas'] });
      queryClient.invalidateQueries({ queryKey: ['/api/recetas', recipeId] });
      toast({
        title: "Receta calificada",
        description: `Has dado ${userRating} ${userRating === 1 ? 'estrella' : 'estrellas'}`,
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "No autorizado",
          description: "Has sido desconectado. Iniciando sesión nuevamente...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "No se pudo calificar la receta",
        variant: "destructive",
      });
    },
  });

  const handleRateRecipe = (rating: number) => {
    setUserRating(rating);
    rateRecipeMutation.mutate(rating);
  };



  if (!isOpen || !recipeId) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-500">Error al cargar la receta</p>
          </div>
        ) : recipe ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">{recipe.nombre}</DialogTitle>
              <DialogDescription className="text-gray-600">
                Detalles completos de la receta incluyendo ingredientes e información nutricional
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Recipe Info */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-1">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span className="text-sm">{recipe.tiempo_min} min</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Users className="w-4 h-4 text-gray-500" />
                    <span className="text-sm">{recipe.porciones_base} porciones</span>
                  </div>
                </div>

              </div>

              {/* Interactive Rating */}
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">Tu calificación:</span>
                <div className="flex items-center space-x-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => handleRateRecipe(i + 1)}
                      disabled={rateRecipeMutation.isPending}
                      className={`transition-colors ${
                        i < userRating ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-300'
                      } ${rateRecipeMutation.isPending ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <Star
                        className={`w-5 h-5 ${i < userRating ? 'fill-current' : ''}`}
                      />
                    </button>
                  ))}
                  {userRating > 0 && (
                    <span className="text-sm text-gray-600 ml-2">
                      ({userRating} {userRating === 1 ? 'estrella' : 'estrellas'})
                    </span>
                  )}
                </div>
                {rateRecipeMutation.isPending && (
                  <div className="w-4 h-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                )}
              </div>

              {/* Tags */}
              {recipe.tags && recipe.tags.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm">Categorías</h3>
                  <div className="flex flex-wrap gap-2">
                    {recipe.tags.map((tag: any) => (
                      <Badge key={tag.id} variant="secondary" className="text-xs">
                        {tag.icono && <span className="mr-1">{tag.icono}</span>}
                        {tag.nombre}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Ingredients */}
              {recipe.ingredientes && recipe.ingredientes.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm flex items-center">
                    <ChefHat className="w-4 h-4 mr-2" />
                    Ingredientes
                  </h3>
                  <div className="space-y-2">
                    {recipe.ingredientes.map((ingrediente: any) => (
                      <div key={ingrediente.id} className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded-lg">
                        <span className="font-medium">{ingrediente.nombre}</span>
                        <span className="text-sm text-gray-600">
                          {ingrediente.cantidad} {ingrediente.unidad}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Instructions */}
              {recipe.descripcion && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm">Instrucciones</h3>
                  <div className="prose prose-sm max-w-none">
                    <p className="text-gray-700 whitespace-pre-wrap">{recipe.descripcion}</p>
                  </div>
                </div>
              )}

              {/* Nutritional Information */}
              {(recipe.caloriasPorPorcion || recipe.proteinasG || recipe.grasasG || recipe.carbohidratosG) && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm">Información Nutricional</h3>
                  <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg">
                    {recipe.caloriasPorPorcion && (
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">~{recipe.caloriasPorPorcion}</div>
                        <div className="text-xs text-gray-600">Calorías</div>
                      </div>
                    )}
                    {recipe.proteinasG && (
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">~{recipe.proteinasG}g</div>
                        <div className="text-xs text-gray-600">Proteínas</div>
                      </div>
                    )}
                    {recipe.grasasG && (
                      <div className="text-center">
                        <div className="text-2xl font-bold text-yellow-600">~{recipe.grasasG}g</div>
                        <div className="text-xs text-gray-600">Grasas</div>
                      </div>
                    )}
                    {recipe.carbohidratosG && (
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">~{recipe.carbohidratosG}g</div>
                        <div className="text-xs text-gray-600">Carbohidratos</div>
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 text-center">*Valores aproximados por porción</div>
                </div>
              )}
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}