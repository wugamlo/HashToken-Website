import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Hash, Calculator, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export function Navigation() {
  const [location] = useLocation();
  
  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Hash className="h-6 w-6 text-primary" />
            <span className="font-semibold text-lg">HashToken</span>
            <Badge variant="outline" className="text-xs">HTK</Badge>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="default"
              size="sm"
              asChild
            >
              <Link href="/">
                <Hash className="h-4 w-4 mr-2" />
                HashToken Info
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}