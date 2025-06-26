import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, startOfWeek, addDays } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, ChevronRight, Sparkles, Calendar, Plus, Edit2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import RecipeDetail from "@/components/recipes/RecipeDetail";
import ChangeMealModal from "@/components/meal-planning/ChangeMealModal";

export default function WeeklyPlanner() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedMeals, setSelectedMeals] = useState<Set<string>>(new Set());
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [editMeal, setEditMeal] = useState<{ id: string; fecha: string; momento: string; currentRecipeId: string } | null>(null);
  
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 }); // Monday
  const weekEnd = addDays(weekStart, 6);
  
  const { data: meals, isLoading } = useQuery({
    queryKey: ['/api/comidas-semana', format(weekStart, 'yyyy-MM-dd'), format(weekEnd, 'yyyy-MM-dd')],
    queryFn: async () => {
      const response = await fetch(`/api/comidas-semana?fechaInicio=${format(weekStart, 'yyyy-MM-dd')}&fechaFin=${format(weekEnd, 'yyyy-MM-dd')}`);
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
  });

  const generatePlanMutation = useMutation({
    mutationFn: async () => {
      const selectedDays = Array.from(selectedMeals).map(mealKey => {
        const parts = mealKey.split('-');
        const fecha = `${parts[0]}-${parts[1]}-${parts[2]}`;
        const momento = parts[3];
        return { fecha, momento };
      });
      
      return await apiRequest('POST', '/api/generar-plan-semanal', {
        fechaInicio: format(weekStart, 'yyyy-MM-dd'),
        fechaFin: format(weekEnd, 'yyyy-MM-dd'),
        diasSeleccionados: selectedDays
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/comidas-semana'] });
      setSelectedMeals(new Set());
      toast({
        title: "¡Plan generado!",
        description: "Tu plan semanal ha sido creado exitosamente",
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
        description: "No se pudo generar el plan semanal",
        variant: "destructive",
      });
    },
  });

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStart, i);
    const dayMeals = meals?.filter((meal: any) => meal.fecha === format(date, 'yyyy-MM-dd')) || [];
    const lunch = dayMeals.find((meal: any) => meal.momento === 'Almuerzo');
    const dinner = dayMeals.find((meal: any) => meal.momento === 'Cena');
    
    return {
      date,
      dayNumber: format(date, 'd'),
      dayName: format(date, 'EEEE', { locale: es }),
      lunch,
      dinner,
    };
  });

  const handleGeneratePlan = () => {
    if (selectedMeals.size === 0) {
      toast({
        title: "Selecciona comidas",
        description: "Debes seleccionar al menos una comida para generar el plan",
        variant: "destructive",
      });
      return;
    }
    generatePlanMutation.mutate();
  };

  const handleMealSelection = (fecha: string, momento: string, checked: boolean) => {
    const mealKey = `${fecha}-${momento}`;
    const newSelection = new Set(selectedMeals);
    
    if (checked) {
      newSelection.add(mealKey);
    } else {
      newSelection.delete(mealKey);
    }
    
    setSelectedMeals(newSelection);
  };

  return (
    <section className="px-4 py-6">
      <h2 className="text-xl font-semibold text-dark-text mb-4">Planificación Semanal</h2>
      
      <Tabs defaultValue="mi-planificacion" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="mi-planificacion" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Mi Planificación
          </TabsTrigger>
          <TabsTrigger value="generar-plan" className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Generar Plan
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mi-planificacion" className="mt-4">
          {/* Week Navigator */}
          <div className="flex items-center justify-between mb-4 bg-white rounded-xl p-3 shadow-sm">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentWeek(addDays(currentWeek, -7))}
              className="rounded-lg"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-center">
              <p className="text-sm font-medium text-dark-text">Semana del</p>
              <p className="text-xs text-gray-500">
                {format(weekStart, 'd', { locale: es })} - {format(weekEnd, 'd MMM yyyy', { locale: es })}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentWeek(addDays(currentWeek, 7))}
              className="rounded-lg"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Planned Meals View */}
          <div className="space-y-3">
            {weekDays.map((day) => (
              <Card key={day.date.toISOString()} className="shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-primary-light rounded-lg flex items-center justify-center">
                        <span className="text-xs font-medium text-primary">{day.dayNumber}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-dark-text capitalize">{day.dayName}</p>
                        <p className="text-xs text-gray-500">
                          {format(day.date, 'd MMM', { locale: es })}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Planned Meals */}
                  {(day.lunch || day.dinner) ? (
                    <div className="space-y-2">
                      {day.lunch && (
                        <div className="flex items-center space-x-3 p-2 bg-primary-light/30 rounded-lg group">
                          <div 
                            className="w-10 h-10 bg-gray-200 rounded-lg overflow-hidden cursor-pointer"
                            onClick={() => {
                              setSelectedRecipeId(day.lunch.recetaId);
                              setShowRecipeModal(true);
                            }}
                          >
                            <img
                              src={day.lunch.receta?.imagenUrl || "/api/placeholder/40/40"}
                              alt={day.lunch.receta?.nombre || "Almuerzo"}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div 
                            className="flex-1 cursor-pointer"
                            onClick={() => {
                              setSelectedRecipeId(day.lunch.recetaId);
                              setShowRecipeModal(true);
                            }}
                          >
                            <p className="text-sm font-medium text-dark-text">
                              {day.lunch.receta?.nombre || "Almuerzo planificado"}
                            </p>
                            <p className="text-xs text-gray-500">Almuerzo • {day.lunch.receta?.tiempoMin || 30} min</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => setEditMeal({
                              id: day.lunch.id,
                              fecha: format(day.date, 'yyyy-MM-dd'),
                              momento: 'Almuerzo',
                              currentRecipeId: day.lunch.recetaId
                            })}
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                      {day.dinner && (
                        <div className="flex items-center space-x-3 p-2 bg-primary-light/30 rounded-lg group">
                          <div 
                            className="w-10 h-10 bg-gray-200 rounded-lg overflow-hidden cursor-pointer"
                            onClick={() => {
                              setSelectedRecipeId(day.dinner.recetaId);
                              setShowRecipeModal(true);
                            }}
                          >
                            <img
                              src={day.dinner.receta?.imagenUrl || "/api/placeholder/40/40"}
                              alt={day.dinner.receta?.nombre || "Cena"}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div 
                            className="flex-1 cursor-pointer"
                            onClick={() => {
                              setSelectedRecipeId(day.dinner.recetaId);
                              setShowRecipeModal(true);
                            }}
                          >
                            <p className="text-sm font-medium text-dark-text">
                              {day.dinner.receta?.nombre || "Cena planificada"}
                            </p>
                            <p className="text-xs text-gray-500">Cena • {day.dinner.receta?.tiempoMin || 30} min</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => setEditMeal({
                              id: day.dinner.id,
                              fecha: format(day.date, 'yyyy-MM-dd'),
                              momento: 'Cena',
                              currentRecipeId: day.dinner.recetaId
                            })}
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-4">No hay comidas planificadas</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="generar-plan" className="mt-4">
          {/* Week Navigator */}
          <div className="flex items-center justify-between mb-4 bg-white rounded-xl p-3 shadow-sm">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentWeek(addDays(currentWeek, -7))}
              className="rounded-lg"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-center">
              <p className="text-sm font-medium text-dark-text">Planificar semana del</p>
              <p className="text-xs text-gray-500">
                {format(weekStart, 'd', { locale: es })} - {format(weekEnd, 'd MMM yyyy', { locale: es })}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentWeek(addDays(currentWeek, 7))}
              className="rounded-lg"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Generate Plan Button */}
          <div className="mb-4">
            <Button
              onClick={handleGeneratePlan}
              disabled={generatePlanMutation.isPending || selectedMeals.size === 0}
              className="w-full bg-primary text-white py-3 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {generatePlanMutation.isPending ? 'Generando...' : `Generar Plan (${selectedMeals.size} comidas)`}
            </Button>
          </div>

          {/* Meal Selection Grid */}
          <div className="space-y-3">
            {weekDays.map((day) => (
              <Card key={day.date.toISOString()} className="shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-primary-light rounded-lg flex items-center justify-center">
                        <span className="text-xs font-medium text-primary">{day.dayNumber}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-dark-text capitalize">{day.dayName}</p>
                        <p className="text-xs text-gray-500">
                          {format(day.date, 'd MMM', { locale: es })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-1">
                        <Checkbox
                          checked={selectedMeals.has(`${format(day.date, 'yyyy-MM-dd')}-almuerzo`)}
                          onCheckedChange={(checked) => {
                            handleMealSelection(format(day.date, 'yyyy-MM-dd'), 'almuerzo', checked as boolean);
                          }}
                          className="w-5 h-5 border-primary data-[state=checked]:bg-primary"
                          disabled={!!day.lunch}
                        />
                        <span className="text-xs text-gray-600">Almuerzo</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Checkbox
                          checked={selectedMeals.has(`${format(day.date, 'yyyy-MM-dd')}-cena`)}
                          onCheckedChange={(checked) => {
                            handleMealSelection(format(day.date, 'yyyy-MM-dd'), 'cena', checked as boolean);
                          }}
                          className="w-5 h-5 border-primary data-[state=checked]:bg-primary"
                          disabled={!!day.dinner}
                        />
                        <span className="text-xs text-gray-600">Cena</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Recipe Detail Modal */}
      <RecipeDetail
        recipeId={selectedRecipeId}
        isOpen={showRecipeModal}
        onClose={() => {
          setShowRecipeModal(false);
          setSelectedRecipeId(null);
        }}
      />

      {/* Change Meal Modal */}
      {editMeal && (
        <ChangeMealModal
          isOpen={!!editMeal}
          onClose={() => setEditMeal(null)}
          mealId={editMeal.id}
          fecha={editMeal.fecha}
          momento={editMeal.momento}
          currentRecipeId={editMeal.currentRecipeId}
        />
      )}
    </section>
  );
}