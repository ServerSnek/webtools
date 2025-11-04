"use client";

import { LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { ToolCard } from "./ToolCard";

interface Tool {
  id: string;
  name: string;
  path: string;
  icon: LucideIcon;
  description?: string;
}

interface CategorySectionProps {
  title: string;
  tools: Tool[];
}

export function CategorySection({ title, tools }: CategorySectionProps) {
  const router = useRouter();

  return (
    <section className="space-y-6">
      <div className="flex items-center gap-3">
        <h2 className="text-2xl font-semibold">{title}</h2>
        <div className="flex-1 h-px bg-border"></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {tools.map((tool) => (
          <ToolCard
            key={tool.id}
            title={tool.name}
            description={tool.description || `Process your ${tool.name.toLowerCase()}`}
            icon={tool.icon}
            onClick={() => router.push(tool.path)}
          />
        ))}
      </div>
    </section>
  );
}
