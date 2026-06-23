import type { Metadata } from "next";
import { CalendarClock, MapPin } from "lucide-react";
import type { Weekday } from "@prisma/client";
import { requirePermission, can } from "@/lib/rbac/authorize";
import {
  getTimetableSections,
  getTimetable,
  getSectionMeta,
  getDefaultSectionId,
  getEntryFormData,
} from "@/lib/timetable/queries";
import { WEEK_DAYS, WEEKDAY_LABELS, formatTime } from "@/lib/timetable/display";
import { PageHeader } from "@/components/dashboard/page-header";
import { SectionPicker } from "@/components/timetable/section-picker";
import { EntryDialog } from "@/components/timetable/entry-dialog";
import { deleteEntryAction } from "@/lib/timetable/actions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Timetable" };

export default async function TimetablePage({
  searchParams,
}: {
  searchParams: Promise<{ sectionId?: string }>;
}) {
  const user = await requirePermission("timetable:view");
  const sp = await searchParams;
  const canManage = can(user, "timetable:manage");
  const isSelfView = user.role === "STUDENT" || user.role === "PARENT";

  // Students/parents are locked to their own section; staff use a picker.
  const sectionId = isSelfView ? await getDefaultSectionId(user) : sp.sectionId;
  const sections = isSelfView ? [] : await getTimetableSections(user);
  const meta = sectionId ? await getSectionMeta(user, sectionId) : null;

  const grid = meta ? await getTimetable(meta.id) : null;
  const formData = canManage && meta ? await getEntryFormData(meta.schoolId) : { subjects: [], teachers: [] };

  return (
    <>
      <PageHeader
        title="Timetable"
        description={isSelfView ? "Your weekly class schedule." : "Weekly class schedules."}
        actions={
          canManage && meta ? (
            <EntryDialog mode="create" sectionId={meta.id} subjects={formData.subjects} teachers={formData.teachers} />
          ) : undefined
        }
      />

      {!isSelfView ? (
        <Card className="mb-4 p-4">
          <SectionPicker sections={sections} sectionId={sectionId ?? undefined} />
        </Card>
      ) : null}

      {!meta ? (
        <Card>
          <CardContent className="grid place-items-center py-14 text-center">
            <CalendarClock className="mb-3 size-8 text-muted-foreground" />
            <p className="text-sm font-medium">{isSelfView ? "No timetable available" : "Select a class & section"}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {isSelfView ? "You aren't enrolled in a section yet." : "Choose a section to view its weekly timetable."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="mb-3 text-sm font-medium">{meta.label}</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {WEEK_DAYS.map((day: Weekday) => {
              const periods = grid?.[day] ?? [];
              return (
                <Card key={day} className="flex flex-col">
                  <div className="border-b px-3 py-2">
                    <h3 className="text-sm font-semibold">{WEEKDAY_LABELS[day]}</h3>
                  </div>
                  <div className="flex-1 space-y-2 p-3">
                    {periods.length === 0 ? (
                      <p className="py-4 text-center text-xs text-muted-foreground">No classes</p>
                    ) : (
                      periods.map((p) => (
                        <div key={p.id} className="rounded-md border bg-muted/30 p-2.5">
                          <div className="flex items-start justify-between gap-1">
                            <span className="text-xs font-medium text-muted-foreground">
                              {formatTime(p.startTime)} – {formatTime(p.endTime)}
                            </span>
                            {canManage ? (
                              <div className="flex items-center">
                                <EntryDialog
                                  mode="edit"
                                  sectionId={meta.id}
                                  subjects={formData.subjects}
                                  teachers={formData.teachers}
                                  defaults={{ id: p.id, day: p.day, startTime: p.startTime, endTime: p.endTime, room: p.room ?? undefined, subjectId: p.subjectId, teacherId: p.teacherId ?? undefined }}
                                />
                                <form action={deleteEntryAction}>
                                  <input type="hidden" name="id" value={p.id} />
                                  <Button type="submit" variant="ghost" size="icon" className="size-7 text-destructive hover:text-destructive" aria-label="Delete period">
                                    ✕
                                  </Button>
                                </form>
                              </div>
                            ) : null}
                          </div>
                          <p className="mt-1 text-sm font-medium leading-tight">{p.subject}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            <Badge variant="secondary">{p.subjectCode}</Badge>
                            {p.room ? (
                              <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
                                <MapPin className="size-3" /> {p.room}
                              </span>
                            ) : null}
                          </div>
                          {p.teacher ? <p className="mt-1 truncate text-xs text-muted-foreground">{p.teacher}</p> : null}
                        </div>
                      ))
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
