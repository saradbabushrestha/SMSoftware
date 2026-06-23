import { PrismaClient, type UserRole, type Gender } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "../src/lib/auth/demo-accounts";
import { PERMISSIONS } from "../src/lib/rbac/permissions";

const db = new PrismaClient();

const SCHOOL_CODE = "GHS";

const FIRST_NAMES = [
  "Aarav", "Sita", "Bina", "Ram", "Gita", "Hari", "Maya", "Niran", "Puja", "Sunil",
  "Anita", "Kiran", "Deepa", "Rohan", "Sneha", "Bibek", "Asha", "Manish", "Rekha", "Sagar",
];
const LAST_NAMES = ["Sharma", "Karki", "Thapa", "Gurung", "Shrestha", "Rai", "Magar", "Adhikari"];

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length];
}

async function main() {
  console.log("⏳ Seeding database…");

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  // 1) Permission catalog (mirror of the code-level matrix).
  for (const key of Object.keys(PERMISSIONS)) {
    await db.permission.upsert({
      where: { key },
      update: { description: PERMISSIONS[key as keyof typeof PERMISSIONS] },
      create: { key, description: PERMISSIONS[key as keyof typeof PERMISSIONS] },
    });
  }
  console.log(`  ✓ ${Object.keys(PERMISSIONS).length} permissions`);

  // 2) School + academic year.
  const school = await db.school.upsert({
    where: { code: SCHOOL_CODE },
    update: {},
    create: {
      name: "Greenwood High School",
      code: SCHOOL_CODE,
      email: "info@greenwood.edu",
      phone: "+977-1-4000000",
      city: "Kathmandu",
      country: "Nepal",
    },
  });

  const academicYear = await db.academicYear.upsert({
    where: { schoolId_name: { schoolId: school.id, name: "2024-2025" } },
    update: { status: "ACTIVE" },
    create: {
      schoolId: school.id,
      name: "2024-2025",
      startDate: new Date("2024-04-01"),
      endDate: new Date("2025-03-31"),
      status: "ACTIVE",
    },
  });
  console.log(`  ✓ school "${school.name}" + academic year ${academicYear.name}`);

  // 3) Classes (Grade 6–10) each with sections A & B.
  const grades = [6, 7, 8, 9, 10];
  const sections: { id: string; classId: string; grade: number; name: string }[] = [];
  for (const g of grades) {
    const klass = await db.schoolClass.upsert({
      where: { schoolId_code: { schoolId: school.id, code: `G${g}` } },
      update: {},
      create: { schoolId: school.id, name: `Grade ${g}`, code: `G${g}`, capacity: 80 },
    });
    for (const sec of ["A", "B"]) {
      const section = await db.section.upsert({
        where: { classId_name: { classId: klass.id, name: sec } },
        update: {},
        create: { classId: klass.id, name: sec, capacity: 40 },
      });
      sections.push({ id: section.id, classId: klass.id, grade: g, name: sec });
    }
  }
  console.log(`  ✓ ${grades.length} classes, ${sections.length} sections`);

  // 4) Subjects.
  const subjects = [
    { name: "Mathematics", code: "MATH" },
    { name: "Science", code: "SCI" },
    { name: "English", code: "ENG" },
    { name: "Social Studies", code: "SOC" },
    { name: "Computer Science", code: "CMP" },
  ];
  for (const s of subjects) {
    await db.subject.upsert({
      where: { schoolId_code: { schoolId: school.id, code: s.code } },
      update: {},
      create: { schoolId: school.id, name: s.name, code: s.code, credits: 4 },
    });
  }
  console.log(`  ✓ ${subjects.length} subjects`);

  // 5) Demo accounts (one per role).
  async function createUser(
    email: string,
    role: UserRole,
    firstName: string,
    lastName: string,
    schoolId: string | null,
  ) {
    return db.user.upsert({
      where: { email },
      update: { role, firstName, lastName, schoolId, status: "ACTIVE" },
      create: {
        email,
        passwordHash,
        role,
        firstName,
        lastName,
        schoolId,
        status: "ACTIVE",
        emailVerified: new Date(),
      },
    });
  }

  const roleNames: Record<UserRole, [string, string]> = {
    SUPER_ADMIN: ["Alex", "Morgan"],
    SCHOOL_ADMIN: ["Priya", "Rana"],
    PRINCIPAL: ["David", "Koirala"],
    TEACHER: ["Sunita", "Lama"],
    STUDENT: ["Aarav", "Sharma"],
    PARENT: ["Mahesh", "Sharma"],
    ACCOUNTANT: ["Rita", "Bhandari"],
    LIBRARIAN: ["Gopal", "Joshi"],
  };

  const demoUsers: Record<string, { id: string }> = {};
  for (const acc of DEMO_ACCOUNTS) {
    const [fn, ln] = roleNames[acc.role];
    const u = await createUser(
      acc.email,
      acc.role,
      fn,
      ln,
      acc.role === "SUPER_ADMIN" ? null : school.id,
    );
    demoUsers[acc.role] = u;
  }
  console.log(`  ✓ ${DEMO_ACCOUNTS.length} demo accounts (password: ${DEMO_PASSWORD})`);

  // 6) Profiles for the headline demo teacher / student / parent.
  const teacher = await db.teacher.upsert({
    where: { userId: demoUsers.TEACHER.id },
    update: {},
    create: {
      schoolId: school.id,
      userId: demoUsers.TEACHER.id,
      employeeId: "EMP-0001",
      qualification: "M.Sc. Mathematics",
      experienceYrs: 8,
      joinedOn: new Date("2018-06-01"),
    },
  });

  // Make the demo teacher the class teacher of Grade 10 A.
  const grade10A = sections.find((s) => s.grade === 10 && s.name === "A")!;
  await db.section.update({
    where: { id: grade10A.id },
    data: { classTeacherId: teacher.id },
  });

  const demoStudent = await db.student.upsert({
    where: { userId: demoUsers.STUDENT.id },
    update: {},
    create: {
      schoolId: school.id,
      userId: demoUsers.STUDENT.id,
      admissionNumber: "ADM-0001",
      rollNumber: "10A-01",
      gender: "MALE",
      dateOfBirth: new Date("2009-05-14"),
      nationality: "Nepali",
      admittedOn: new Date("2024-04-05"),
      status: "ACTIVE",
    },
  });
  await db.enrollment.upsert({
    where: { studentId_academicYearId: { studentId: demoStudent.id, academicYearId: academicYear.id } },
    update: {},
    create: {
      schoolId: school.id,
      studentId: demoStudent.id,
      sectionId: grade10A.id,
      academicYearId: academicYear.id,
      rollNumber: "10A-01",
    },
  });

  const guardian = await db.guardian.upsert({
    where: { userId: demoUsers.PARENT.id },
    update: {},
    create: { schoolId: school.id, userId: demoUsers.PARENT.id, occupation: "Engineer" },
  });
  await db.studentGuardian.upsert({
    where: { studentId_guardianId: { studentId: demoStudent.id, guardianId: guardian.id } },
    update: {},
    create: { studentId: demoStudent.id, guardianId: guardian.id, relation: "FATHER", isPrimary: true },
  });
  console.log("  ✓ demo teacher / student / parent profiles linked");

  // 7) Extra students to make the rosters feel real.
  let created = 0;
  for (let i = 2; i <= 16; i++) {
    const fn = pick(FIRST_NAMES, i + 3);
    const ln = pick(LAST_NAMES, i);
    const email = `student${i}@greenwood.edu`;
    const u = await createUser(email, "STUDENT", fn, ln, school.id);
    const section = pick(sections, i);
    const adm = `ADM-${String(i).padStart(4, "0")}`;
    const student = await db.student.upsert({
      where: { userId: u.id },
      update: {},
      create: {
        schoolId: school.id,
        userId: u.id,
        admissionNumber: adm,
        rollNumber: `${section.grade}${section.name}-${String(i).padStart(2, "0")}`,
        gender: (i % 2 === 0 ? "FEMALE" : "MALE") as Gender,
        nationality: "Nepali",
        admittedOn: new Date(2024, 3, (i % 27) + 1),
        status: "ACTIVE",
      },
    });
    await db.enrollment.upsert({
      where: { studentId_academicYearId: { studentId: student.id, academicYearId: academicYear.id } },
      update: {},
      create: {
        schoolId: school.id,
        studentId: student.id,
        sectionId: section.id,
        academicYearId: academicYear.id,
      },
    });
    created++;
  }

  // 8) A couple more teachers for headcount.
  for (let i = 2; i <= 6; i++) {
    const fn = pick(FIRST_NAMES, i);
    const ln = pick(LAST_NAMES, i + 2);
    const u = await createUser(`teacher${i}@greenwood.edu`, "TEACHER", fn, ln, school.id);
    await db.teacher.upsert({
      where: { userId: u.id },
      update: {},
      create: {
        schoolId: school.id,
        userId: u.id,
        employeeId: `EMP-${String(i).padStart(4, "0")}`,
        qualification: "B.Ed.",
        experienceYrs: (i * 2) % 12,
        joinedOn: new Date(2020, i % 12, 1),
      },
    });
  }
  console.log(`  ✓ ${created} extra students + 5 extra teachers`);

  // 9) Assign subjects to teachers for a realistic roster.
  const allSubjects = await db.subject.findMany({ where: { schoolId: school.id }, orderBy: { code: "asc" } });
  const byCode = (code: string) => allSubjects.find((s) => s.code === code)!;
  const allTeachers = await db.teacher.findMany({ where: { schoolId: school.id, deletedAt: null }, orderBy: { employeeId: "asc" } });
  for (let i = 0; i < allTeachers.length; i++) {
    const t = allTeachers[i];
    const subs =
      t.employeeId === "EMP-0001"
        ? [byCode("MATH"), byCode("SCI")] // headline demo teacher teaches Mathematics & Science
        : [allSubjects[i % allSubjects.length]];
    await db.teacher.update({
      where: { id: t.id },
      data: { subjects: { set: subs.map((s) => ({ id: s.id })) } },
    });
  }
  console.log(`  ✓ subjects assigned to ${allTeachers.length} teachers`);

  // 10) Demo attendance for Grade 10 · A over recent weekdays.
  const section10A = await db.section.findFirst({
    where: { name: "A", class: { code: "G10", schoolId: school.id } },
  });
  if (section10A) {
    const roster = await db.enrollment.findMany({
      where: { sectionId: section10A.id, deletedAt: null },
      select: { studentId: true },
    });
    const markedBy = demoUsers.TEACHER.id;
    let attendanceRecords = 0;
    const today = new Date();
    const base = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
    for (let d = 0; d < 20; d++) {
      const date = new Date(base - d * 86400000);
      const dow = date.getUTCDay();
      if (dow === 0 || dow === 6) continue; // skip weekends
      for (let s = 0; s < roster.length; s++) {
        // Mostly present, with deterministic variety so percentages look real.
        // The first student is intentionally an "at-risk" case (frequent absences).
        const seed = (s + d) % 10;
        const status =
          s === 0
            ? d % 3 === 0
              ? "ABSENT"
              : seed === 5
                ? "LATE"
                : "PRESENT"
            : seed === 0
              ? "ABSENT"
              : seed === 3
                ? "LATE"
                : seed === 7
                  ? "LEAVE"
                  : "PRESENT";
        await db.attendance.upsert({
          where: { studentId_date: { studentId: roster[s].studentId, date } },
          update: { status, sectionId: section10A.id, markedById: markedBy },
          create: {
            schoolId: school.id,
            sectionId: section10A.id,
            studentId: roster[s].studentId,
            date,
            status,
            markedById: markedBy,
          },
        });
        attendanceRecords++;
      }
    }
    console.log(`  ✓ ${attendanceRecords} attendance records for Grade 10 · A`);
  }

  // 11) Demo exam + published grades for Grade 10.
  const g10 = await db.schoolClass.findFirst({ where: { code: "G10", schoolId: school.id } });
  if (g10) {
    const examName = "Mid-Term Examination 2024";
    let exam = await db.exam.findFirst({ where: { schoolId: school.id, classId: g10.id, name: examName, deletedAt: null } });
    if (!exam) {
      exam = await db.exam.create({
        data: {
          schoolId: school.id,
          classId: g10.id,
          academicYearId: academicYear.id,
          name: examName,
          type: "MIDTERM",
          maxMarks: 100,
          examDate: new Date("2024-09-15"),
          published: true,
        },
      });
    }
    const g10Roster = await db.enrollment.findMany({
      where: { section: { classId: g10.id }, deletedAt: null },
      select: { studentId: true },
    });
    const gradedSubjects = [byCode("MATH"), byCode("SCI"), byCode("ENG")];
    let resultCount = 0;
    for (let s = 0; s < g10Roster.length; s++) {
      for (let j = 0; j < gradedSubjects.length; j++) {
        const marks = 55 + ((s * 7 + j * 11) % 45); // deterministic 55–99
        await db.examResult.upsert({
          where: { examId_studentId_subjectId: { examId: exam.id, studentId: g10Roster[s].studentId, subjectId: gradedSubjects[j].id } },
          update: { marksObtained: marks, maxMarks: 100 },
          create: { examId: exam.id, studentId: g10Roster[s].studentId, subjectId: gradedSubjects[j].id, marksObtained: marks, maxMarks: 100 },
        });
        resultCount++;
      }
    }
    console.log(`  ✓ exam "${examName}" + ${resultCount} published results`);
  }

  // 12) Demo fee invoices + payments (Nepal gateways) for Grade 10 students.
  if (g10) {
    const g10Students = await db.enrollment.findMany({
      where: { section: { classId: g10.id }, deletedAt: null },
      include: { student: true },
    });
    const accountant = demoUsers.ACCOUNTANT.id;
    const ensureInvoice = async (
      studentId: string,
      title: string,
      category: "TUITION" | "TRANSPORT",
      amount: number,
      dueDate: Date,
    ) => {
      let inv = await db.invoice.findFirst({ where: { studentId, title, deletedAt: null } });
      if (!inv) inv = await db.invoice.create({ data: { schoolId: school.id, studentId, category, title, amount, dueDate } });
      return inv;
    };
    const addPayment = async (invoiceId: string, amount: number, method: "ESEWA" | "KHALTI", reference: string) => {
      if ((await db.payment.count({ where: { invoiceId } })) > 0) return;
      await db.payment.create({ data: { schoolId: school.id, invoiceId, amount, method, reference, recordedById: accountant } });
      const inv = await db.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
      const paid = (await db.payment.aggregate({ where: { invoiceId }, _sum: { amount: true } }))._sum.amount ?? 0;
      await db.invoice.update({
        where: { id: invoiceId },
        data: { status: paid >= inv.amount ? "PAID" : paid > 0 ? "PARTIAL" : "PENDING" },
      });
    };

    let invoiceCount = 0;
    for (const e of g10Students) {
      // Tuition for everyone (future due), transport for everyone (past due → overdue if unpaid).
      const tuition = await ensureInvoice(e.studentId, "Tuition fee — Term 1", "TUITION", 24000, new Date(Date.now() + 30 * 86400000));
      const transport = await ensureInvoice(e.studentId, "Transport — Term 1", "TRANSPORT", 6000, new Date(Date.now() - 10 * 86400000));
      invoiceCount += 2;
      // The demo student (ADM-0001) shows a paid tuition + partial transport.
      if (e.student.admissionNumber === "ADM-0001") {
        await addPayment(tuition.id, 24000, "ESEWA", "ESEWA-DEMO0001");
        await addPayment(transport.id, 3000, "KHALTI", "KHALTI-DEMO0001");
      }
    }
    console.log(`  ✓ ${invoiceCount} invoices + demo eSewa/Khalti payments`);
  }

  // 13) Demo library: books + a couple of loans (one overdue).
  const bookDefs = [
    { title: "A Brief History of Time", author: "Stephen Hawking", category: "Science", totalCopies: 3 },
    { title: "To Kill a Mockingbird", author: "Harper Lee", category: "Fiction", totalCopies: 4 },
    { title: "Clean Code", author: "Robert C. Martin", category: "Reference", totalCopies: 2 },
    { title: "Sapiens", author: "Yuval Noah Harari", category: "History", totalCopies: 3 },
    { title: "The Hobbit", author: "J.R.R. Tolkien", category: "Fiction", totalCopies: 5 },
  ];
  const books: Record<string, { id: string; availableCopies: number; totalCopies: number }> = {};
  for (const b of bookDefs) {
    let book = await db.book.findFirst({ where: { schoolId: school.id, title: b.title, deletedAt: null } });
    if (!book) book = await db.book.create({ data: { schoolId: school.id, ...b, availableCopies: b.totalCopies } });
    books[b.title] = book;
  }

  const addLoan = async (title: string, memberId: string, dueDate: Date) => {
    const book = books[title];
    const existing = await db.bookLoan.count({ where: { bookId: book.id, memberId, status: "BORROWED" } });
    if (existing > 0 || book.availableCopies <= 0) return;
    await db.bookLoan.create({ data: { schoolId: school.id, bookId: book.id, memberId, dueDate, status: "BORROWED" } });
    await db.book.update({ where: { id: book.id }, data: { availableCopies: { decrement: 1 } } });
    book.availableCopies -= 1;
  };
  // Demo student has an overdue book; demo teacher has a current loan.
  await addLoan("A Brief History of Time", demoUsers.STUDENT.id, new Date(Date.now() - 7 * 86400000));
  await addLoan("Clean Code", demoUsers.TEACHER.id, new Date(Date.now() + 7 * 86400000));
  console.log(`  ✓ ${bookDefs.length} books + demo loans`);

  // 14b) Demo events + a registration (only when empty).
  if ((await db.event.count({ where: { schoolId: school.id } })) === 0) {
    const now = Date.now();
    const D = 86400000;
    const H = 3600000;
    const defs = [
      { title: "Parent–Teacher Meeting", type: "MEETING" as const, location: "Assembly hall", startsAt: now + 3 * D, endsAt: now + 3 * D + 3 * H, capacity: 200, description: "Term 1 progress discussion for all grades." },
      { title: "Annual Sports Day", type: "SPORTS" as const, location: "Main ground", startsAt: now + 7 * D, endsAt: now + 7 * D + 6 * H, capacity: 0, description: "Track and field events for all grades." },
      { title: "Inter-school Quiz Competition", type: "COMPETITION" as const, location: "Auditorium", startsAt: now + 14 * D, capacity: 50, description: "Represent the school in the regional quiz." },
      { title: "Robotics Workshop", type: "WORKSHOP" as const, location: "Computer Lab", startsAt: now - 10 * D, endsAt: now - 10 * D + 3 * H, capacity: 30, description: "Hands-on introduction to robotics." },
    ];
    let sportsId = "";
    for (const e of defs) {
      const created = await db.event.create({
        data: {
          schoolId: school.id,
          title: e.title,
          type: e.type,
          location: e.location,
          description: e.description,
          startsAt: new Date(e.startsAt),
          endsAt: e.endsAt ? new Date(e.endsAt) : null,
          capacity: e.capacity,
          registrationOpen: true,
          createdById: demoUsers.SCHOOL_ADMIN.id,
        },
      });
      if (e.type === "SPORTS") sportsId = created.id;
    }
    if (sportsId) {
      await db.eventRegistration.create({ data: { eventId: sportsId, userId: demoUsers.STUDENT.id } });
    }
    console.log(`  ✓ ${defs.length} events + 1 registration`);
  }

  // 14) Demo audit trail (only when empty — real actions append here at runtime).
  if ((await db.auditLog.count({ where: { schoolId: school.id } })) === 0) {
    const now = Date.now();
    const H = 3_600_000;
    const events: { action: string; userId: string | null; entityType?: string; metadata?: object; ip?: string; ago: number }[] = [
      { action: "auth.login", userId: demoUsers.SCHOOL_ADMIN.id, ip: "27.34.18.5", ago: 0.5 * H },
      { action: "student.create", userId: demoUsers.SCHOOL_ADMIN.id, entityType: "Student", metadata: { admissionNumber: "ADM-0042" }, ago: 1 * H },
      { action: "attendance.mark", userId: demoUsers.TEACHER.id, entityType: "Section", metadata: { count: 28 }, ago: 2 * H },
      { action: "payment.record", userId: demoUsers.ACCOUNTANT.id, entityType: "Invoice", metadata: { amount: 24000, method: "ESEWA" }, ago: 3 * H },
      { action: "exam.publish", userId: demoUsers.TEACHER.id, entityType: "Exam", metadata: { published: true }, ago: 5 * H },
      { action: "book.issue", userId: demoUsers.LIBRARIAN.id, entityType: "Book", ago: 7 * H },
      { action: "auth.login.failed", userId: null, metadata: { email: "unknown@greenwood.edu" }, ip: "102.89.4.7", ago: 26 * H },
      { action: "user.create", userId: demoUsers.SUPER_ADMIN.id, entityType: "User", metadata: { role: "ACCOUNTANT" }, ago: 30 * H },
      { action: "invoice.create", userId: demoUsers.ACCOUNTANT.id, entityType: "Invoice", metadata: { amount: 6000 }, ago: 50 * H },
      { action: "grade.save", userId: demoUsers.TEACHER.id, entityType: "Exam", metadata: { subjectId: "MATH", count: 3 }, ago: 72 * H },
    ];
    for (const e of events) {
      await db.auditLog.create({
        data: {
          action: e.action,
          userId: e.userId,
          schoolId: e.userId === demoUsers.SUPER_ADMIN.id ? null : school.id,
          entityType: e.entityType,
          metadata: e.metadata,
          ip: e.ip,
          createdAt: new Date(now - e.ago),
        },
      });
    }
    console.log(`  ✓ ${events.length} demo audit events`);
  }

  // 15) Demo assignments + a graded submission for Grade 10 · A.
  if (section10A && (await db.assignment.count({ where: { schoolId: school.id } })) === 0) {
    const now = Date.now();
    const D = 86400000;
    const a1 = await db.assignment.create({
      data: {
        schoolId: school.id,
        sectionId: section10A.id,
        subjectId: byCode("MATH").id,
        title: "Algebra worksheet",
        description: "Complete exercises 1–10 from chapter 4 and show your working.",
        dueDate: new Date(now + 3 * D),
        maxPoints: 20,
        createdById: demoUsers.TEACHER.id,
      },
    });
    await db.assignment.create({
      data: {
        schoolId: school.id,
        sectionId: section10A.id,
        subjectId: byCode("ENG").id,
        title: "Essay: My hometown",
        description: "Write a 300-word descriptive essay about your hometown.",
        dueDate: new Date(now - 2 * D),
        maxPoints: 50,
        createdById: demoUsers.TEACHER.id,
      },
    });
    await db.submission.create({
      data: {
        assignmentId: a1.id,
        studentId: demoStudent.id,
        content: "x = 4; y = -2; (full working attached in notebook).",
        status: "GRADED",
        grade: 18,
        feedback: "Great work — watch the sign on Q7.",
        gradedAt: new Date(),
        gradedById: demoUsers.TEACHER.id,
      },
    });
    console.log("  ✓ 2 assignments + 1 graded submission");
  }

  // 16) Demo transport routes + student assignments (only when empty).
  if ((await db.route.count({ where: { schoolId: school.id } })) === 0) {
    const r1 = await db.route.create({
      data: { schoolId: school.id, name: "Route 1 — Lakeside", vehicleNumber: "Ba 12 Pa 3456", driverName: "Krishna Tamang", driverPhone: "+977-9800000001", capacity: 30, fare: 3000, description: "Lakeside → School via Ring Road." },
    });
    await db.route.create({
      data: { schoolId: school.id, name: "Route 2 — Hilltop", vehicleNumber: "Ba 9 Cha 1122", driverName: "Bikash Rai", driverPhone: "+977-9800000002", capacity: 25, fare: 2500, description: "Hilltop → School via Old Town." },
    });
    const riders = await db.student.findMany({ where: { schoolId: school.id, deletedAt: null }, orderBy: { admissionNumber: "asc" }, take: 3 });
    for (const s of riders) {
      await db.transportAssignment.create({ data: { routeId: r1.id, studentId: s.id, stop: "Main gate" } }).catch(() => undefined);
    }
    console.log(`  ✓ 2 routes + ${riders.length} riders`);
  }

  // 17) Demo hostel rooms + occupants (only when empty).
  if ((await db.room.count({ where: { schoolId: school.id } })) === 0) {
    const rm1 = await db.room.create({
      data: { schoolId: school.id, block: "Block A", number: "101", gender: "BOYS", capacity: 3, wardenName: "Mr. Sharma", notes: "Ground floor, near common room." },
    });
    await db.room.create({
      data: { schoolId: school.id, block: "Block B", number: "201", gender: "GIRLS", capacity: 3, wardenName: "Mrs. Karki" },
    });
    const occupants = await db.student.findMany({ where: { schoolId: school.id, deletedAt: null }, orderBy: { admissionNumber: "asc" }, take: 2 });
    let bed = 1;
    for (const s of occupants) {
      await db.roomAssignment.create({ data: { roomId: rm1.id, studentId: s.id, bedNumber: `B${bed++}` } }).catch(() => undefined);
    }
    console.log(`  ✓ 2 rooms + ${occupants.length} occupants`);
  }

  // 18) Demo weekly timetable for Grade 10 · A (only when empty).
  if (section10A && (await db.timetableEntry.count({ where: { sectionId: section10A.id } })) === 0) {
    const subs = ["MATH", "SCI", "ENG", "SOC", "CMP"].map(byCode);
    const periods = [["09:00", "09:45"], ["09:45", "10:30"], ["10:45", "11:30"], ["11:30", "12:15"]];
    const days = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"] as const;
    let count = 0;
    for (let di = 0; di < days.length; di++) {
      for (let pi = 0; pi < periods.length; pi++) {
        const subj = subs[(di + pi) % subs.length];
        await db.timetableEntry.create({
          data: {
            schoolId: school.id,
            sectionId: section10A.id,
            subjectId: subj.id,
            // Assign the demo teacher only to Mathematics (avoids teacher clashes).
            teacherId: subj.code === "MATH" ? teacher.id : null,
            day: days[di],
            startTime: periods[pi][0],
            endTime: periods[pi][1],
            room: "R-204",
          },
        });
        count++;
      }
    }
    console.log(`  ✓ ${count} timetable periods for Grade 10 · A`);
  }

  // 19) Demo payroll — payslips for each teacher across the last two months (only when empty).
  if ((await db.payrollRecord.count({ where: { schoolId: school.id } })) === 0) {
    const now = new Date();
    const months = [0, 1].map((back) => {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - back, 1));
      return { key: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`, back };
    });
    let payslips = 0;
    for (const t of allTeachers) {
      // Stable-ish salary derived from the employee number so the demo is varied but deterministic.
      const seed = Number(t.employeeId.replace(/\D/g, "")) || 1;
      const basicSalary = 35000 + (seed % 6) * 2500;
      const allowances = 4000 + (seed % 4) * 1000;
      const deductions = 1500;
      const tax = Math.round(basicSalary * 0.1);
      const netPay = Math.max(0, basicSalary + allowances - deductions - tax);
      for (const m of months) {
        // Previous month is paid; current month is still a draft.
        const paid = m.back > 0;
        await db.payrollRecord.create({
          data: {
            schoolId: school.id,
            teacherId: t.id,
            month: m.key,
            basicSalary,
            allowances,
            deductions,
            tax,
            netPay,
            status: paid ? "PAID" : "DRAFT",
            paidAt: paid ? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - m.back, 28)) : null,
          },
        });
        payslips++;
      }
    }
    console.log(`  ✓ ${payslips} payslips for ${allTeachers.length} teachers`);
  }

  // 20) Demo accounting ledger — income & expense entries for the current month (only when empty).
  if ((await db.ledgerEntry.count({ where: { schoolId: school.id } })) === 0) {
    const now = new Date();
    const day = (n: number) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), n));
    const entries: { type: "INCOME" | "EXPENSE"; category: string; amount: number; date: Date; description?: string }[] = [
      { type: "INCOME", category: "Tuition fees", amount: 850000, date: day(3), description: "Monthly tuition collection" },
      { type: "INCOME", category: "Admission fees", amount: 120000, date: day(5) },
      { type: "INCOME", category: "Transport", amount: 65000, date: day(6), description: "Bus route fees" },
      { type: "EXPENSE", category: "Salaries", amount: 540000, date: day(28), description: "Staff payroll" },
      { type: "EXPENSE", category: "Utilities", amount: 38000, date: day(10), description: "Electricity & water" },
      { type: "EXPENSE", category: "Supplies", amount: 22000, date: day(12), description: "Stationery & lab materials" },
      { type: "EXPENSE", category: "Maintenance", amount: 15000, date: day(15) },
    ];
    for (const e of entries) {
      await db.ledgerEntry.create({ data: { schoolId: school.id, createdById: demoUsers.ACCOUNTANT.id, ...e } });
    }
    console.log(`  ✓ ${entries.length} ledger entries (income & expense)`);
  }

  // 21) Demo announcements — a pinned all-staff notice + audience-targeted ones (only when empty).
  if ((await db.announcement.count({ where: { schoolId: school.id } })) === 0) {
    const now = new Date();
    const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);
    const announcements: {
      title: string;
      body: string;
      audience: "ALL" | "STAFF" | "STUDENTS" | "PARENTS";
      pinned?: boolean;
      publishedAt: Date;
      authorId: string;
    }[] = [
      {
        title: "Welcome to the 2024–2025 academic year",
        body: "A warm welcome back to all students, parents and staff. Classes resume on schedule. Please check your timetable and fee statements in the portal.",
        audience: "ALL",
        pinned: true,
        publishedAt: daysAgo(2),
        authorId: demoUsers.SCHOOL_ADMIN.id,
      },
      {
        title: "Staff meeting — Friday 4:00 PM",
        body: "All teaching and administrative staff are requested to attend the monthly review meeting in the conference hall.",
        audience: "STAFF",
        publishedAt: daysAgo(1),
        authorId: demoUsers.PRINCIPAL.id,
      },
      {
        title: "Mid-term examinations begin next week",
        body: "Students should review the exam schedule and report to their halls 15 minutes before each paper. Admit cards are available in the portal.",
        audience: "STUDENTS",
        publishedAt: daysAgo(1),
        authorId: demoUsers.PRINCIPAL.id,
      },
      {
        title: "Parent–teacher meeting invitation",
        body: "Parents are invited to meet subject teachers this Saturday between 10:00 AM and 1:00 PM to discuss student progress.",
        audience: "PARENTS",
        publishedAt: daysAgo(3),
        authorId: demoUsers.SCHOOL_ADMIN.id,
      },
    ];
    for (const a of announcements) {
      await db.announcement.create({ data: { schoolId: school.id, ...a } });
    }
    console.log(`  ✓ ${announcements.length} announcements (pinned + audience-targeted)`);
  }

  // 22) Demo messages — a small thread + a welcome, mixing read/unread (only when empty).
  if ((await db.message.count({ where: { schoolId: school.id } })) === 0) {
    const now = Date.now();
    const at = (minsAgo: number) => new Date(now - minsAgo * 60 * 1000);
    const msgs: {
      senderId: string;
      recipientId: string;
      subject: string;
      body: string;
      createdAt: Date;
      readAt: Date | null;
    }[] = [
      {
        senderId: demoUsers.PARENT.id,
        recipientId: demoUsers.TEACHER.id,
        subject: "Question about this week's homework",
        body: "Hello, could you clarify which chapters are covered in the upcoming assignment? Thank you.",
        createdAt: at(180),
        readAt: at(160),
      },
      {
        senderId: demoUsers.TEACHER.id,
        recipientId: demoUsers.PARENT.id,
        subject: "Re: Question about this week's homework",
        body: "Hi! It covers chapters 4 and 5. The assignment is due Friday. Happy to help if there are questions.",
        createdAt: at(150),
        readAt: null,
      },
      {
        senderId: demoUsers.SCHOOL_ADMIN.id,
        recipientId: demoUsers.STUDENT.id,
        subject: "Welcome to the new term",
        body: "We're glad to have you back. Please review your timetable and let us know if anything looks off.",
        createdAt: at(60),
        readAt: null,
      },
    ];
    for (const m of msgs) {
      await db.message.create({ data: { schoolId: school.id, ...m } });
    }
    console.log(`  ✓ ${msgs.length} messages (read + unread)`);
  }

  // 23) Demo teacher evaluation (only when empty).
  if ((await db.teacherEvaluation.count({ where: { schoolId: school.id } })) === 0) {
    const demoTeacher = await db.teacher.findFirst({ where: { userId: demoUsers.TEACHER.id } });
    if (demoTeacher) {
      await db.teacherEvaluation.create({
        data: {
          schoolId: school.id,
          teacherId: demoTeacher.id,
          evaluatorId: demoUsers.PRINCIPAL.id,
          period: "2024 — Term 1",
          teaching: 4,
          classroom: 5,
          collaboration: 4,
          punctuality: 5,
          comment: "Strong subject command and excellent rapport with students. Continue mentoring junior staff next term.",
        },
      });
      console.log("  ✓ 1 teacher evaluation");
    }
  }

  // 24) Subscriptions — Greenwood on Pro, plus a second tenant on Trial (idempotent).
  const sunrise = await db.school.upsert({
    where: { code: "SAC" },
    update: {},
    create: { name: "Sunrise Academy", code: "SAC", email: "info@sunrise.edu", city: "Pokhara", country: "Nepal" },
  });
  await db.subscription.upsert({
    where: { schoolId: school.id },
    update: {},
    create: {
      schoolId: school.id,
      plan: "PRO",
      status: "ACTIVE",
      seats: 100,
      priceNpr: 25000,
      renewsAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      note: "Annual commitment, billed monthly.",
    },
  });
  await db.subscription.upsert({
    where: { schoolId: sunrise.id },
    update: {},
    create: {
      schoolId: sunrise.id,
      plan: "TRIAL",
      status: "TRIALING",
      seats: 25,
      priceNpr: 0,
      renewsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
  });
  console.log("  ✓ subscriptions (Greenwood Pro · Active, Sunrise Trial)");

  // 25) Demo report submissions — one pending, one already approved (only when empty).
  if ((await db.reportSubmission.count({ where: { schoolId: school.id } })) === 0) {
    await db.reportSubmission.create({
      data: {
        schoolId: school.id,
        title: "Term 1 academic performance report",
        category: "Academic",
        period: "2024 — Term 1",
        summary: "Grade 10 averages improved 6% over last term. Mathematics remains the weakest subject; recommend extra tutorials.",
        submittedById: demoUsers.TEACHER.id,
        status: "SUBMITTED",
      },
    });
    await db.reportSubmission.create({
      data: {
        schoolId: school.id,
        title: "Monthly attendance summary",
        category: "Attendance",
        period: "September 2024",
        summary: "Overall attendance 92%. Three students flagged below 75% and referred to counselling.",
        submittedById: demoUsers.TEACHER.id,
        status: "APPROVED",
        reviewedById: demoUsers.PRINCIPAL.id,
        reviewedAt: new Date(),
        reviewNote: "Approved. Good follow-up on the at-risk students.",
      },
    });
    console.log("  ✓ 2 report submissions (1 pending, 1 approved)");
  }

  console.log("✅ Seed complete.");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
