"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";

interface BreadcrumbItem {
  label: string;
  href: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
      <Link href="/" data-testid="breadcrumb-home">
        <span className="hover:text-foreground transition-colors cursor-pointer">Home</span>
      </Link>
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <ChevronRight className="h-4 w-4" />
          {index === items.length - 1 || item.href === "#" ? (
            <span className="text-foreground font-medium" data-testid={`breadcrumb-${item.label.toLowerCase().replace(/ /g, '-')}`}>
              {item.label}
            </span>
          ) : (
            <Link href={item.href} data-testid={`breadcrumb-${item.label.toLowerCase().replace(/ /g, '-')}`}>
              <span className="hover:text-foreground transition-colors cursor-pointer">
                {item.label}
              </span>
            </Link>
          )}
        </div>
      ))}
    </nav>
  );
}
