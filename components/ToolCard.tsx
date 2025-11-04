"use client";

import { LucideIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ToolCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  onClick?: () => void;
}

export function ToolCard({ title, description, icon: Icon, onClick }: ToolCardProps) {
  return (
    <Card className="hover-elevate transition-all duration-150 cursor-pointer group" onClick={onClick} data-testid={`card-tool-${title.toLowerCase().replace(/\s+/g, "-")}`}>
      <CardHeader className="space-y-3">
        <div className="flex items-center justify-center h-12 w-12 rounded-md bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
          <Icon className="h-6 w-6" />
        </div>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button className="w-full" data-testid={`button-select-${title.toLowerCase().replace(/\s+/g, "-")}`}>
          Select Files
        </Button>
      </CardContent>
    </Card>
  );
}
