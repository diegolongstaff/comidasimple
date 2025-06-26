import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Link } from "wouter";
import logoPath from "@assets/Comida Simple - Simplified Logo for app.png";

export default function Landing() {
  const handleGoogleLogin = () => {
    window.location.href = "/api/auth/google";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-primary-light/20 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        {/* Logo and Branding */}
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <img src={logoPath} alt="Comida Simple" className="h-24 w-24" />
          </div>
          <h1 className="text-4xl font-bold text-teal-700 dark:text-teal-300 mb-3">Comida Simple</h1>
          <p className="text-lg text-gray-600 mb-2">Comé sano y ahorrá</p>
          <p className="text-sm text-gray-500">Planificación familiar de comidas inteligente</p>
        </div>

        {/* Features */}
        <div className="space-y-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-dark-text">Planificación Semanal</h3>
                  <p className="text-sm text-gray-600">Organiza almuerzos y cenas para toda la familia</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-accent/20 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-dark-text">Recetas Inteligentes</h3>
                  <p className="text-sm text-gray-600">Sugerencias basadas en tus preferencias</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-warning/20 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6.5-5v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-dark-text">Lista de Compras</h3>
                  <p className="text-sm text-gray-600">Genera automáticamente tu lista semanal</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Authentication Options */}
        <div className="space-y-4">
          {/* Create Account / Sign In Options */}
          <div className="grid grid-cols-2 gap-3">
            <Link href="/register">
              <Button 
                className="w-full bg-teal-600 hover:bg-teal-700 text-white py-3 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
              >
                Crear Cuenta
              </Button>
            </Link>
            <Link href="/login">
              <Button 
                variant="outline"
                className="w-full border-teal-200 text-teal-700 hover:bg-teal-50 dark:border-teal-700 dark:text-teal-300 dark:hover:bg-teal-950 py-3 text-lg font-semibold rounded-xl"
              >
                Iniciar Sesión
              </Button>
            </Link>
          </div>
          
          <p className="text-center text-xs text-gray-500">
            Al registrarte, aceptas nuestros términos de servicio y política de privacidad
          </p>
        </div>
      </div>
    </div>
  );
}
