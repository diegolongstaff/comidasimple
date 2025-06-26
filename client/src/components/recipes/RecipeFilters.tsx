import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";

interface RecipeFiltersProps {
  selectedTags?: string[];
  onTagsChange?: (tags: string[]) => void;
}

export default function RecipeFilters({ selectedTags = [], onTagsChange }: RecipeFiltersProps) {
  const { data: tags = [] } = useQuery({
    queryKey: ['/api/tags'],
  });

  const handleTagToggle = (tagId: string) => {
    if (!onTagsChange) return;
    
    const newTags = selectedTags.includes(tagId)
      ? selectedTags.filter(id => id !== tagId)
      : [...selectedTags, tagId];
    
    onTagsChange(newTags);
  };

  // Fallback tags for display
  const displayTags = tags.length > 0 ? tags : [
    { id: "carne", nombre: "Carne", icono: "🥩" },
    { id: "huevo", nombre: "Huevo", icono: "🥚" },
    { id: "verdura", nombre: "Verdura", icono: "🥬" },
    { id: "pescado", nombre: "Pescado", icono: "🐟" },
    { id: "pollo", nombre: "Pollo", icono: "🐔" },
    { id: "vegetariano", nombre: "Vegetariano", icono: "🌱" },
  ];

  return (
    <div className="flex space-x-2 overflow-x-auto scrollbar-hide pb-2">
      {displayTags.map((tag: any) => {
        const isSelected = selectedTags.includes(tag.id);
        
        return (
          <Button
            key={tag.id}
            variant={isSelected ? "default" : "secondary"}
            size="sm"
            onClick={() => handleTagToggle(tag.id)}
            className={`flex-shrink-0 rounded-full text-xs font-medium transition-all ${
              isSelected
                ? 'bg-primary text-white hover:bg-primary/90'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {tag.icono && <span className="mr-1">{tag.icono}</span>}
            {tag.nombre}
          </Button>
        );
      })}
    </div>
  );
}
