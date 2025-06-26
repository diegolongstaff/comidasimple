import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";

interface FamilyData {
  familia: {
    id: string;
    nombre: string;
    chefId: string;
    codigoInvitacion: string;
  } | null;
  members: any[];
  isChef: boolean;
}

export default function Header() {
  const { user } = useAuth();
  
  const { data: familyData } = useQuery<FamilyData>({
    queryKey: ['/api/familias/mine'],
    enabled: !!user,
  });

  return (
    <header className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-50 safe-area-top">
      <div className="max-w-md mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* App Logo */}
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-dark-text">Comida Simple</h1>
              <p className="text-xs text-gray-500">
                {familyData?.familia?.nombre || 'Sin familia'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {/* Notifications */}
            <Button variant="ghost" size="icon" className="relative rounded-full">
              <Bell className="h-5 w-5 text-gray-600" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-warning text-white text-xs rounded-full flex items-center justify-center">
                2
              </span>
            </Button>
            {/* Profile Avatar */}
            <Avatar className="w-8 h-8 border-2 border-primary-light">
              <AvatarFallback className="bg-primary text-white text-sm">
                {user?.nombre?.charAt(0) || user?.email?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </div>
    </header>
  );
}
