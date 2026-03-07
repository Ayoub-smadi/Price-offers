import { Link, useLocation } from "wouter";
import { FileText, History, PlusCircle, Settings, Quote } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from "@/components/ui/sidebar";

export function AppSidebar() {
  const [location] = useLocation();

  const navItems = [
    { title: "إنشاء عرض سعر", url: "/", icon: PlusCircle },
    { title: "السجل", url: "/history", icon: History },
  ];

  return (
    <Sidebar className="border-l border-border no-print rtl-reverse" side="right">
      <SidebarHeader className="p-4 border-b border-border/50">
        <div className="flex items-center gap-3 px-2">
          <div className="bg-primary/10 p-2 rounded-xl text-primary">
            <Quote className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-foreground">عروض الأسعار</h2>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-muted-foreground text-sm font-medium mt-4 mb-2 px-6">
            القائمة الرئيسية
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={location === item.url}
                    className={`
                      mx-3 my-1 rounded-xl px-4 py-6 transition-all duration-200
                      ${location === item.url 
                        ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20' 
                        : 'hover:bg-secondary text-foreground/80'}
                    `}
                  >
                    <Link href={item.url} className="flex items-center gap-3">
                      <item.icon className="w-5 h-5" />
                      <span className="text-base font-semibold">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
