import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Calendar, Clock, Users, Sparkles, Save } from "lucide-react";

interface WeeklyPlanGeneratorProps {
  onPlanGenerated?: (plan: any[]) => void;
}

interface Preferencias {
  vegetariano: boolean;
  sinGluten: boolean;
  tiempoMaximo: number;
}

export default function WeeklyPlanGenerator({ onPlanGenerated }: WeeklyPlanGeneratorProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [generatedPlan, setGeneratedPlan] = useState<any[]>([]);
  const [preferencias, setPreferencias] = useState<Preferencias>({
    vegetariano: false,
    sinGluten: false,
    tiempoMaximo: 60
  });

  // Get Monday of current week
  const getMonday = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  };

  const [fechaInicio, setFechaInicio] = useState(() => {
    return getMonday(new Date()).toISOString().split('T')[0];
  });

  // Generate meal plan mutation
  const generatePlanMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/generar-plan-semanal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fechaInicio,
          preferencias
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate meal plan');
      }
      
      return response.json();
    },
    onSuccess: (plan) => {
      setGeneratedPlan(plan);
      onPlanGenerated?.(plan);
      toast({
        title: "¡Plan generado!",
        description: `Se creó un plan con ${plan.length} comidas para la semana`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo generar el plan semanal",
        variant: "destructive",
      });
    },
  });

  // Save meal plan mutation
  const savePlanMutation = useMutation({
    mutationFn: async (planSemanal: any[]) => {
      const response = await fetch('/api/guardar-plan-semanal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planSemanal }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save meal plan');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "¡Plan guardado!",
        description: "Tu plan semanal se ha guardado exitosamente",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/comidas-semana'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo guardar el plan",
        variant: "destructive",
      });
    },
  });

  const handleGenerate = () => {
    generatePlanMutation.mutate();
  };

  const handleSave = () => {
    if (generatedPlan.length === 0) {
      toast({
        title: "Sin plan",
        description: "Primero genera un plan semanal",
        variant: "destructive",
      });
      return;
    }
    savePlanMutation.mutate(generatedPlan);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'short' 
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Generador de Plan Semanal
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Date Selection */}
          <div className="space-y-2">
            <Label htmlFor="fecha-inicio">Semana que inicia el:</Label>
            <Input
              id="fecha-inicio"
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
            />
          </div>

          {/* Preferences */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">Preferencias:</Label>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="vegetariano" className="text-sm">Solo recetas vegetarianas</Label>
              <Switch
                id="vegetariano"
                checked={preferencias.vegetariano}
                onCheckedChange={(checked) => 
                  setPreferencias(prev => ({ ...prev, vegetariano: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="sin-gluten" className="text-sm">Sin gluten</Label>
              <Switch
                id="sin-gluten"
                checked={preferencias.sinGluten}
                onCheckedChange={(checked) => 
                  setPreferencias(prev => ({ ...prev, sinGluten: checked }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tiempo-max" className="text-sm">Tiempo máximo de cocción (minutos):</Label>
              <Input
                id="tiempo-max"
                type="number"
                min="10"
                max="180"
                value={preferencias.tiempoMaximo}
                onChange={(e) => 
                  setPreferencias(prev => ({ ...prev, tiempoMaximo: parseInt(e.target.value) || 60 }))
                }
              />
            </div>
          </div>

          {/* Generate Button */}
          <Button 
            onClick={handleGenerate}
            disabled={generatePlanMutation.isPending}
            className="w-full"
          >
            {generatePlanMutation.isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Generando...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generar Plan Semanal
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Generated Plan Preview */}
      {generatedPlan.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Plan Generado</CardTitle>
            <Button 
              onClick={handleSave}
              disabled={savePlanMutation.isPending}
              size="sm"
            >
              {savePlanMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="h-3 w-3 mr-2" />
                  Guardar Plan
                </>
              )}
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {generatedPlan.reduce((acc: any, comida: any) => {
                const fecha = comida.fecha;
                if (!acc[fecha]) acc[fecha] = [];
                acc[fecha].push(comida);
                return acc;
              }, {}) && 
                Object.entries(
                  generatedPlan.reduce((acc: any, comida: any) => {
                    const fecha = comida.fecha;
                    if (!acc[fecha]) acc[fecha] = [];
                    acc[fecha].push(comida);
                    return acc;
                  }, {})
                ).map(([fecha, comidas]: [string, any]) => (
                  <div key={fecha} className="border rounded-lg p-3">
                    <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                      <Calendar className="h-3 w-3" />
                      {formatDate(fecha)}
                    </h4>
                    <div className="space-y-2">
                      {comidas.map((comida: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between text-xs bg-gray-50 p-2 rounded">
                          <div>
                            <span className="font-medium">{comida.momento}:</span>
                            <span className="ml-2">{comida.receta.nombre}</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-500">
                            <Clock className="h-3 w-3" />
                            <span>{comida.receta.tiempo_min}min</span>
                            <Users className="h-3 w-3" />
                            <span>{comida.receta.porciones_base}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              }
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}