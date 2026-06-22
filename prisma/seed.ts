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
        const seed = (s + d) % 10;
        const status = seed === 0 ? "ABSENT" : seed === 3 ? "LATE" : seed === 7 ? "LEAVE" : "PRESENT";
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
