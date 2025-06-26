import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Home, Utensils, ShoppingCart, Users, User } from "lucide-react";

const navItems = [
  { path: "/", label: "Inicio", icon: Home },
  { path: "/recipes", label: "Recetas", icon: Utensils },
  { path: "/shopping", label: "Compras", icon: ShoppingCart },
  { path: "/family", label: "Familia", icon: Users },
  { path: "/profile", label: "Perfil", icon: User },
];

export default function BottomNavigation() {
  const [location, setLocation] = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50 safe-area-bottom">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-around py-3">
          {navItems.map(({ path, label, icon: Icon }) => {
            const isActive = location === path;
            
            return (
              <Button
                key={path}
                variant="ghost"
                onClick={() => setLocation(path)}
                className={`flex flex-col items-center space-y-1 px-3 py-1 h-auto ${
                  isActive 
                    ? 'text-primary' 
                    : 'text-gray-400 hover:text-primary'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs font-medium">{label}</span>
              </Button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
