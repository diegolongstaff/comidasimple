import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/layout/Header";
import BottomNavigation from "@/components/layout/BottomNavigation";
import WeeklyPlanner from "@/components/meal-planning/WeeklyPlanner";
import RecipeCard from "@/components/recipes/RecipeCard";
import RecipeFilters from "@/components/recipes/RecipeFilters";
import FamilySection from "@/components/family/FamilySection";
import GroceryListPreview from "@/components/grocery/GroceryListPreview";
import WeeklyPlanGenerator from "@/components/meal-planning/WeeklyPlanGenerator";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function Home() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

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
        {/* Weekly Planner Section */}
        <WeeklyPlanner />

        {/* Recipe Discovery Section */}
        <section className="px-4 py-6 border-t border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-dark-text">Descubrir Recetas</h2>
            <Button variant="ghost" className="text-primary text-sm font-medium">
              Ver todas →
            </Button>
          </div>

          <RecipeFilters />
          
          <div className="grid grid-cols-2 gap-3 mt-4">
            <RecipeCard />
            <RecipeCard />
          </div>
        </section>

        {/* Family Section */}
        <FamilySection />

        {/* Grocery List Preview */}
        <GroceryListPreview />


      </main>

      <BottomNavigation />

      {/* Floating Action Button */}
      <Button
        className="fixed bottom-20 right-4 w-14 h-14 bg-primary text-white rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all z-40"
        size="icon"
      >
        <Plus className="h-6 w-6" />
      </Button>
    </div>
  );
}
