import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Theme = "light" | "dark" | "system";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  effectiveTheme: "light" | "dark";
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");
  const [effectiveTheme, setEffectiveTheme] = useState<"light" | "dark">("light");

  // Load theme from database or localStorage
  useEffect(() => {
    const loadTheme = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Load from database
        const { data } = await supabase
          .from("user_preferences")
          .select("theme")
          .eq("user_id", user.id)
          .maybeSingle();
        
        if (data?.theme) {
          setThemeState(data.theme as Theme);
        } else {
          // Create default preference
          await supabase
            .from("user_preferences")
            .insert({
              user_id: user.id,
              theme: "system",
            });
        }
      } else {
        // Load from localStorage
        const savedTheme = localStorage.getItem("theme") as Theme | null;
        if (savedTheme) {
          setThemeState(savedTheme);
        }
      }
    };

    loadTheme();
  }, []);

  // Apply theme to document
  useEffect(() => {
    const root = window.document.documentElement;
    
    const applyTheme = () => {
      let resolvedTheme: "light" | "dark" = "light";

      if (theme === "system") {
        resolvedTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
      } else {
        resolvedTheme = theme;
      }

      root.classList.remove("light", "dark");
      root.classList.add(resolvedTheme);
      setEffectiveTheme(resolvedTheme);
    };

    applyTheme();

    // Listen for system theme changes
    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = () => applyTheme();
      mediaQuery.addEventListener("change", handler);
      return () => mediaQuery.removeEventListener("change", handler);
    }
  }, [theme]);

  const setTheme = async (newTheme: Theme) => {
    setThemeState(newTheme);
    
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      // Save to database
      await supabase
        .from("user_preferences")
        .upsert({
          user_id: user.id,
          theme: newTheme,
        });
    } else {
      // Save to localStorage
      localStorage.setItem("theme", newTheme);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, effectiveTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
