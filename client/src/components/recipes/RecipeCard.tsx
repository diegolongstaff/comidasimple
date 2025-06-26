import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Users, Star, Edit } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";

interface RecipeCardProps {
  receta?: {
    id: string;
    nombre: string;
    descripcion?: string;
    imagen_url?: string;
    tiempo_min?: number;
    porciones_base?: number;
    tags?: Array<{ id: string; nombre: string; color?: string }>;
    rating?: number;
    usuario_id?: string;
    es_oficial?: boolean;
  };
  onRecipeClick?: (id: string) => void;
  onEditClick?: (id: string) => void;
  showEditButton?: boolean;
}

export default function RecipeCard({ receta, onRecipeClick, onEditClick, showEditButton = false }: RecipeCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [userRating, setUserRating] = useState(receta?.rating || 0);

  // Update local rating when recipe rating changes
  useEffect(() => {
    setUserRating(receta?.rating || 0);
  }, [receta?.rating]);

  const rateRecipeMutation = useMutation({
    mutationFn: async (rating: number) => {
      if (!receta?.id) return;
      const response = await fetch(`/api/recetas/${receta.id}/rate`, {
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
      toast({
        title: "Receta calificada",
        description: `Has dado ${userRating} ${userRating === 1 ? 'estrella' : 'estrellas'} a ${receta?.nombre}`,
      });
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
        description: "No se pudo calificar la receta",
        variant: "destructive",
      });
    },
  });

  // Fallback recipe for display when no data is provided
  const displayReceta = receta || {
    id: "placeholder",
    nombre: "Pasta con Albahaca",
    tiempo_min: 30,
    porciones_base: 4,
    rating: 4,
    imagen_url: "/api/placeholder/400/400",
  };

  const handleRateRecipe = (rating: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (receta?.id) {
      setUserRating(rating);
      rateRecipeMutation.mutate(rating);
    }
  };

  const handleViewRecipe = () => {
    if (onRecipeClick && receta?.id) {
      onRecipeClick(receta.id);
    } else {
      toast({
        title: "Ver receta",
        description: displayReceta.nombre,
      });
    }
  };

  const handleEditRecipe = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEditClick && displayReceta.id !== "placeholder") {
      onEditClick(displayReceta.id);
    }
  };

  return (
    <Card 
      className="shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
      onClick={handleViewRecipe}
    >
      <div className="aspect-square bg-gray-200 relative">
        <img
          src={displayReceta.imagen_url || "/api/placeholder/400/400"}
          alt={displayReceta.nombre}
          className="w-full h-full object-cover"
        />
        {showEditButton && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleEditRecipe}
            className="absolute top-2 right-2 w-8 h-8 bg-white/90 rounded-full hover:bg-white transition-all text-gray-600"
          >
            <Edit className="h-4 w-4" />
          </Button>
        )}
        <div className="absolute bottom-2 left-2 bg-white/90 rounded-full px-2 py-1 flex items-center space-x-1">
          <Clock className="w-3 h-3 text-dark-text" />
          <span className="text-xs font-medium text-dark-text">
            {displayReceta.tiempo_min || 30} min
          </span>
        </div>
      </div>
      <CardContent className="p-3">
        <h3 className="font-semibold text-sm text-dark-text mb-1 line-clamp-1">
          {displayReceta.nombre}
        </h3>
        <div className="flex items-center justify-between">
          <div className="flex space-x-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <button
                key={i}
                onClick={(e) => handleRateRecipe(i + 1, e)}
                className={`text-sm transition-colors ${
                  i < (userRating || displayReceta.rating || 0) ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-300'
                }`}
              >
                <Star className={`w-3 h-3 ${i < (userRating || displayReceta.rating || 0) ? 'fill-current' : ''}`} />
              </button>
            ))}
          </div>
          <div className="flex items-center space-x-1">
            <Users className="w-3 h-3 text-gray-500" />
            <span className="text-xs text-gray-500">
              {displayReceta.porciones_base || 4} porciones
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}