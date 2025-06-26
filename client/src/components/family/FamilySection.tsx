import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Copy, Share2, Crown, Edit2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useAuth } from "@/hooks/useAuth";

interface FamilySectionProps {
  expanded?: boolean;
}

interface FamilyMember {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  fechaNacimiento?: string;
  sexo?: string;
  pesoKg?: number;
  alturaCm?: number;
  grupoEdad?: string;
  esJefeFamilia?: boolean;
  usuarioId?: string; // Links to user account if they have one
}

interface FamilyData {
  familia: {
    id: string;
    nombre: string;
    chefId: string;
    codigoInvitacion: string;
  } | null;
  members: FamilyMember[];
  isChef: boolean;
}

export default function FamilySection({ expanded = false }: FamilySectionProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [inviteCode, setInviteCode] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [newMemberName, setNewMemberName] = useState("");
  const [showCreateFamily, setShowCreateFamily] = useState(false);
  const [showJoinFamily, setShowJoinFamily] = useState(false);
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);
  const [editForm, setEditForm] = useState({
    nombre: "",
    apellido: "",
    fechaNacimiento: "",
    sexo: "",
    pesoKg: "",
    alturaCm: "",
  });

  const { data: familyData, isLoading: familyLoading } = useQuery<FamilyData>({
    queryKey: ['/api/familias/mine'],
    enabled: !!user,
  });

  const createFamilyMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await fetch('/api/familias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: name }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create family');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/familias/mine'] });
      setShowCreateFamily(false);
      setFamilyName("");
      toast({
        title: "Familia creada",
        description: "¡Tu familia ha sido creada exitosamente!",
      });
    },
    onError: (error: any) => {
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
        description: error.message || "No se pudo crear la familia",
        variant: "destructive",
      });
    },
  });

  const joinFamilyMutation = useMutation({
    mutationFn: async (codigo: string) => {
      const response = await fetch('/api/familias/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigoInvitacion: codigo }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to join family');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/familias/mine'] });
      setShowJoinFamily(false);
      setInviteCode("");
      toast({
        title: "¡Te uniste a la familia!",
        description: "Ahora puedes planificar comidas juntos",
      });
    },
    onError: (error: any) => {
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
        description: error.message || "Código de invitación inválido",
        variant: "destructive",
      });
    },
  });

  const addMemberMutation = useMutation({
    mutationFn: async (nombre: string) => {
      const response = await fetch('/api/familias/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to add member');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/familias/mine'] });
      setNewMemberName("");
      toast({
        title: "Miembro agregado",
        description: "El miembro ha sido agregado a tu familia",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo agregar el miembro",
        variant: "destructive",
      });
    },
  });

  const editMemberMutation = useMutation({
    mutationFn: async ({ memberId, data }: { memberId: string; data: any }) => {
      const response = await fetch(`/api/familias/members/${memberId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update member');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/familias/mine'] });
      setEditingMember(null);
      toast({
        title: "Miembro actualizado",
        description: "Los datos del miembro han sido actualizados",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el miembro",
        variant: "destructive",
      });
    },
  });

  // Generate invitation code for family member
  const generateInvitationMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const response = await fetch(`/api/familias/members/${memberId}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to generate invitation');
      }
      return response.json();
    },
    onSuccess: (data) => {
      navigator.clipboard.writeText(data.invitationCode);
      toast({
        title: "Código de invitación generado",
        description: `Código ${data.invitationCode} copiado al portapapeles`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo generar la invitación",
        variant: "destructive",
      });
    },
  });

  const handleAddMember = () => {
    if (newMemberName.trim()) {
      addMemberMutation.mutate(newMemberName);
    }
  };

  const handleEditMember = (member: FamilyMember) => {
    setEditingMember(member);
    setEditForm({
      nombre: member.nombre,
      apellido: member.apellido || "",
      fechaNacimiento: member.fechaNacimiento || "",
      sexo: member.sexo || "",
      pesoKg: member.pesoKg?.toString() || "",
      alturaCm: member.alturaCm?.toString() || "",
    });
  };

  const handleSaveEdit = () => {
    if (!editingMember) return;
    
    const data: any = {
      nombre: editForm.nombre,
      apellido: editForm.apellido,
    };

    if (editForm.fechaNacimiento) data.fechaNacimiento = editForm.fechaNacimiento;
    if (editForm.sexo) data.sexo = editForm.sexo;
    if (editForm.pesoKg) data.pesoKg = parseFloat(editForm.pesoKg);
    if (editForm.alturaCm) data.alturaCm = parseFloat(editForm.alturaCm);

    editMemberMutation.mutate({ memberId: editingMember.id, data });
  };

  const calculateAge = (birthDate: string) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    const ageInMonths = (today.getFullYear() - birth.getFullYear()) * 12 + 
                       (today.getMonth() - birth.getMonth());
    
    if (ageInMonths < 12) return `${Math.floor(ageInMonths)} meses`;
    const years = Math.floor(ageInMonths / 12);
    return `${years} años`;
  };

  const handleCopyInviteCode = async () => {
    if (familyData?.familia?.codigoInvitacion) {
      try {
        await navigator.clipboard.writeText(familyData.familia.codigoInvitacion);
        toast({
          title: "Código copiado",
          description: "El código de invitación se copió al portapapeles",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "No se pudo copiar el código",
          variant: "destructive",
        });
      }
    }
  };

  if (familyLoading) {
    return (
      <section className="px-4 py-6 border-t border-gray-100">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
          <div className="h-24 bg-gray-200 rounded"></div>
        </div>
      </section>
    );
  }

  if (!familyData?.familia) {
    return (
      <section className="px-4 py-6 border-t border-gray-100">
        <div className="text-center py-8">
          <h2 className="text-xl font-semibold text-dark-text mb-4">Crear o Unirse a una Familia</h2>
          <p className="text-gray-600 mb-6">
            Las familias permiten planificar comidas juntos y compartir recetas
          </p>
          
          <div className="space-y-3">
            <Dialog open={showCreateFamily} onOpenChange={setShowCreateFamily}>
              <DialogTrigger asChild>
                <Button className="w-full bg-primary text-white">
                  Crear Nueva Familia
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Crear Nueva Familia</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    placeholder="Nombre de la familia"
                    value={familyName}
                    onChange={(e) => setFamilyName(e.target.value)}
                  />
                  <Button
                    onClick={() => createFamilyMutation.mutate(familyName)}
                    disabled={!familyName || createFamilyMutation.isPending}
                    className="w-full"
                  >
                    {createFamilyMutation.isPending ? "Creando..." : "Crear Familia"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={showJoinFamily} onOpenChange={setShowJoinFamily}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full">
                  Unirse a Familia Existente
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Unirse a una Familia</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    placeholder="Código de invitación (ej: ABC123)"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  />
                  <Button
                    onClick={() => joinFamilyMutation.mutate(inviteCode)}
                    disabled={!inviteCode || joinFamilyMutation.isPending}
                    className="w-full"
                  >
                    {joinFamilyMutation.isPending ? "Uniéndose..." : "Unirse"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </section>
    );
  }

  // User has a family - show family management
  return (
    <section className="px-4 py-6 border-t border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold text-dark-text">{familyData.familia.nombre}</h2>
          {familyData.isChef && (
            <Badge variant="default" className="mt-1">
              <Crown className="w-3 h-3 mr-1" />
              Chef de Familia
            </Badge>
          )}
        </div>
      </div>

      {/* Quick Add Member */}
      {familyData.isChef && (
        <div className="mb-4 p-3 bg-primary-light/30 rounded-lg">
          <div className="flex items-center space-x-2">
            <Input
              placeholder="Agregar miembro de familia (ej: María, Juan, etc.)"
              className="flex-1"
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleAddMember();
                }
              }}
              disabled={addMemberMutation.isPending}
            />
            <Button 
              size="sm" 
              className="bg-primary text-white"
              onClick={handleAddMember}
              disabled={!newMemberName.trim() || addMemberMutation.isPending}
            >
              <UserPlus className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Presiona Enter o el botón + para agregar. Luego puedes añadir detalles.
          </p>
        </div>
      )}

      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center space-x-3 mb-4">
            <div className="flex -space-x-2">
              {familyData.members.slice(0, 3).map((member, index) => (
                <Avatar key={member.id} className="w-10 h-10 border-2 border-white">
                  <AvatarFallback className="bg-primary text-white text-sm">
                    {member.nombre?.charAt(0) || 'M'}
                  </AvatarFallback>
                </Avatar>
              ))}
              {familyData.members.length > 3 && (
                <div className="w-10 h-10 bg-gray-200 rounded-full border-2 border-white flex items-center justify-center">
                  <span className="text-xs text-gray-600">+{familyData.members.length - 3}</span>
                </div>
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-dark-text">{familyData.familia.nombre}</p>
              <p className="text-xs text-gray-500">{familyData.members.length} miembros</p>
            </div>
          </div>

          {expanded && (
            <div className="space-y-2 mb-4">
              {familyData.members.map((member) => (
                <div key={member.id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg transition-colors">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-primary text-white text-sm">
                      {member.nombre?.charAt(0) || 'M'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-dark-text">
                      {member.nombre} {member.apellido}
                    </p>
                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                      {member.fechaNacimiento && (
                        <span>{calculateAge(member.fechaNacimiento)}</span>
                      )}
                      {member.grupoEdad && (
                        <Badge variant="outline" className="text-xs">
                          {member.grupoEdad.split(' ')[0]}
                        </Badge>
                      )}
                      {member.email && <span>{member.email}</span>}
                    </div>
                  </div>
                  {familyData.isChef && (
                    <div className="flex items-center space-x-1">
                      {/* Show invitation button only for members without user accounts */}
                      {!member.usuarioId && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => generateInvitationMutation.mutate(member.id)}
                          className="text-primary hover:text-primary-dark"
                          disabled={generateInvitationMutation.isPending}
                        >
                          <Share2 className="w-3 h-3" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditMember(member)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <Edit2 className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {familyData.isChef && familyData.familia.codigoInvitacion && (
            <div className="mt-4 p-3 bg-primary-light/30 rounded-lg">
              <div className="flex items-center space-x-2">
                <Share2 className="w-4 h-4 text-primary" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-dark-text">Código de Familia</p>
                  <p className="text-xs text-gray-500">Comparte este código para invitar miembros</p>
                </div>
              </div>
              <div className="mt-2 flex items-center space-x-2">
                <code className="flex-1 bg-white px-3 py-2 rounded text-sm font-mono text-dark-text">
                  {familyData.familia.codigoInvitacion}
                </code>
                <Button
                  onClick={handleCopyInviteCode}
                  size="sm"
                  className="bg-primary text-white hover:bg-primary/90"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Member Dialog */}
      <Dialog open={!!editingMember} onOpenChange={() => setEditingMember(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Miembro</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="editNombre">Nombre</Label>
                <Input
                  id="editNombre"
                  value={editForm.nombre}
                  onChange={(e) => setEditForm({ ...editForm, nombre: e.target.value })}
                  placeholder="Nombre"
                />
              </div>
              <div>
                <Label htmlFor="editApellido">Apellido</Label>
                <Input
                  id="editApellido"
                  value={editForm.apellido}
                  onChange={(e) => setEditForm({ ...editForm, apellido: e.target.value })}
                  placeholder="Apellido"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="editFechaNacimiento">Fecha de Nacimiento</Label>
              <Input
                id="editFechaNacimiento"
                type="date"
                value={editForm.fechaNacimiento}
                onChange={(e) => setEditForm({ ...editForm, fechaNacimiento: e.target.value })}
              />
              {editForm.fechaNacimiento && (
                <p className="text-xs text-gray-500 mt-1">
                  Edad: {calculateAge(editForm.fechaNacimiento)}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="editSexo">Sexo</Label>
              <Select value={editForm.sexo} onValueChange={(value) => setEditForm({ ...editForm, sexo: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar sexo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="masculino">Masculino</SelectItem>
                  <SelectItem value="femenino">Femenino</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="editPeso">Peso (kg)</Label>
                <Input
                  id="editPeso"
                  type="number"
                  step="0.1"
                  value={editForm.pesoKg}
                  onChange={(e) => setEditForm({ ...editForm, pesoKg: e.target.value })}
                  placeholder="0.0"
                />
              </div>
              <div>
                <Label htmlFor="editAltura">Altura (cm)</Label>
                <Input
                  id="editAltura"
                  type="number"
                  value={editForm.alturaCm}
                  onChange={(e) => setEditForm({ ...editForm, alturaCm: e.target.value })}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="flex space-x-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setEditingMember(null)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSaveEdit}
                disabled={!editForm.nombre.trim() || editMemberMutation.isPending}
                className="flex-1"
              >
                {editMemberMutation.isPending ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}