"use client";

import { useState } from "react";
import type { SchoolClass, Subject } from "@/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, BookOpen, GraduationCap } from "lucide-react";

interface ClassesClientProps {
  classes: SchoolClass[];
  subjects: Subject[];
}

export function ClassesClient({
  classes,
  subjects,
}: ClassesClientProps) {
  const [tab, setTab] = useState<"classes" | "subjects">("classes");
  const [search, setSearch] = useState("");

  const filteredClasses = classes.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.form_level && c.form_level.toLowerCase().includes(search.toLowerCase()))
  );

  const filteredSubjects = subjects.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Tab Switcher & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 p-1 bg-muted rounded-lg w-fit">
          <button
            type="button"
            onClick={() => setTab("classes")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              tab === "classes" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Classes ({classes.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("subjects")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              tab === "subjects" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Subjects & Curriculum ({subjects.length})
          </button>
        </div>

        <div className="relative max-w-xs w-full">
          <Search className="size-4 absolute left-3 top-2.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${tab}...`}
            className="pl-9 h-9 text-sm"
          />
        </div>
      </div>

      {/* Classes View */}
      {tab === "classes" && (
        <Card className="shadow-xs border-border">
          <CardHeader className="pb-3 border-b border-border/50">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <GraduationCap className="size-4 text-primary" />
              School Classes Roster
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {filteredClasses.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                No classes match the filter criteria.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredClasses.map((cls) => (
                  <div key={cls.id} className="p-4 rounded-xl border border-border bg-card shadow-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-base text-foreground">{cls.name}</h3>
                      <Badge variant="outline" className="text-xs">
                        {cls.form_level}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Program: <strong className="text-foreground">{cls.program?.name ?? "General Stream"}</strong>
                    </p>
                    <div className="pt-2 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
                      <span>Class Teacher:</span>
                      <strong className="text-foreground">{cls.class_teacher?.full_name ?? "Unassigned"}</strong>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Subjects View */}
      {tab === "subjects" && (
        <Card className="shadow-xs border-border">
          <CardHeader className="pb-3 border-b border-border/50">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <BookOpen className="size-4 text-primary" />
              Curriculum Subjects Directory
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {filteredSubjects.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                No subjects found.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSubjects.map((sub) => (
                  <div key={sub.id} className="p-4 rounded-xl border border-border bg-card shadow-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-sm text-foreground">{sub.name}</h3>
                      <Badge variant={sub.is_elective ? "secondary" : "default"} className="text-xs font-mono">
                        {sub.code}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Type: <strong className="text-foreground">{sub.is_elective ? "Elective Subject" : "Core Subject"}</strong>
                    </p>
                    {sub.department && (
                      <p className="text-xs text-muted-foreground">
                        Department: <span className="text-foreground">{sub.department}</span>
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
