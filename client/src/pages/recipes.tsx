import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/layout/Header";
import BottomNavigation from "@/components/layout/BottomNavigation";
import RecipeCard from "@/components/recipes/RecipeCard";
import RecipeFilters from "@/components/recipes/RecipeFilters";
import RecipeDetail from "@/components/recipes/RecipeDetail";
import RecipeEditModal from "@/components/recipes/RecipeEditModal";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Recipes() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("recetas");

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
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
  }, [isAuthenticated, isLoading, toast]);

  // Get official recipes
  const { data: recetasOficiales, isLoading: isLoadingRecetasOficiales } = useQuery({
    queryKey: ['/api/recetas', selectedTags.join(',')],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedTags.length > 0) {
        params.append('tags', selectedTags.join(','));
      }
      const url = `/api/recetas${params.toString() ? '?' + params.toString() : ''}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch recipes');
      return response.json();
    },
    enabled: isAuthenticated,
  });

  // Get user's personal recipes
  const { data: misRecetas, isLoading: isLoadingMisRecetas } = useQuery({
    queryKey: ['/api/recetas/mis-recetas', selectedTags.join(',')],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedTags.length > 0) {
        params.append('tags', selectedTags.join(','));
      }
      const url = `/api/recetas/mis-recetas${params.toString() ? '?' + params.toString() : ''}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch user recipes');
      return response.json();
    },
    enabled: isAuthenticated,
  });

  // Filter recipes based on search query for each tab
  const filteredRecetasOficiales = recetasOficiales?.filter((receta: any) =>
    receta.nombre?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    receta.descripcion?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const filteredMisRecetas = misRecetas?.filter((receta: any) =>
    receta.nombre?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    receta.descripcion?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral">
      <Header />
      
      <main className="max-w-md mx-auto pb-20">
        <div className="px-4 py-6">
          {/* Header Section */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-dark-text">Recetas</h1>
            <Button 
              size="icon"
              className="bg-primary hover:bg-primary/90"
              onClick={() => toast({ title: "Agregar receta", description: "Función próximamente" })}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Search Bar */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar recetas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white border-gray-200"
            />
          </div>
          
          {/* Filters */}
          <RecipeFilters 
            selectedTags={selectedTags}
            onTagsChange={setSelectedTags}
          />
          
          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="recetas">Recetas</TabsTrigger>
              <TabsTrigger value="mis-recetas">Mis Recetas</TabsTrigger>
            </TabsList>
            
            <TabsContent value="recetas" className="mt-4">
              {/* Official Recipes Grid */}
              {isLoadingRecetasOficiales ? (
                <div className="grid grid-cols-2 gap-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="bg-white rounded-xl shadow-sm overflow-hidden">
                      <div className="aspect-square bg-gray-200 animate-pulse"></div>
                      <div className="p-3">
                        <div className="h-4 bg-gray-200 rounded animate-pulse mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded animate-pulse w-2/3"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {filteredRecetasOficiales.map((receta: any) => (
                    <RecipeCard 
                      key={receta.id} 
                      receta={receta} 
                      onRecipeClick={setSelectedRecipeId}
                      onEditClick={setEditingRecipeId}
                      showEditButton={true}
                    />
                  ))}
                </div>
              )}
              
              {/* Empty State */}
              {!isLoadingRecetasOficiales && filteredRecetasOficiales.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500">No se encontraron recetas oficiales</p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="mis-recetas" className="mt-4">
              {/* User's Personal Recipes Grid */}
              {isLoadingMisRecetas ? (
                <div className="grid grid-cols-2 gap-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="bg-white rounded-xl shadow-sm overflow-hidden">
                      <div className="aspect-square bg-gray-200 animate-pulse"></div>
                      <div className="p-3">
                        <div className="h-4 bg-gray-200 rounded animate-pulse mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded animate-pulse w-2/3"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {filteredMisRecetas.map((receta: any) => (
                    <RecipeCard 
                      key={receta.id} 
                      receta={receta} 
                      onRecipeClick={setSelectedRecipeId}
                    />
                  ))}
                </div>
              )}
              
              {/* Empty State */}
              {!isLoadingMisRecetas && filteredMisRecetas.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500">
                    {searchQuery || selectedTags.length > 0 
                      ? "No se encontraron recetas propias con esos criterios" 
                      : "Aún no tienes recetas propias. ¡Edita una receta oficial para crear tu primera receta personalizada!"
                    }
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <BottomNavigation />
      
      {/* Recipe Detail Modal */}
      {selectedRecipeId && (
        <RecipeDetail 
          recipeId={selectedRecipeId}
          isOpen={true}
          onClose={() => setSelectedRecipeId(null)}
        />
      )}
      
      {/* Recipe Edit Modal */}
      {editingRecipeId && (
        <RecipeEditModal
          recipeId={editingRecipeId}
          onClose={() => setEditingRecipeId(null)}
          onSave={() => setActiveTab("mis-recetas")}
        />
      )}
    </div>
  );
}