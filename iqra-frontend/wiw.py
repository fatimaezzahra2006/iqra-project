from fpdf import FPDF

class AestheticPlanner(FPDF):
    def header(self):
        # خلفية وردية ناعمة جداً للم الصفحة
        self.set_fill_color(255, 245, 247) 
        self.rect(0, 0, 210, 297, 'F')
        
        # العنوان الرئيسي
        self.set_font("helvetica", "B", 20)
        self.set_text_color(219, 112, 147) # PaleVioletRed
        self.cell(0, 20, "IQRA PROJECT - WORK PLAN", 0, 1, 'C')
        self.ln(5)

    def week_section(self, title):
        self.set_font("helvetica", "B", 14)
        self.set_fill_color(255, 182, 193) # LightPink
        self.set_text_color(255, 255, 255)
        self.cell(0, 12, f"  {title}", 0, 1, 'L', True)
        self.ln(3)

    def add_task(self, day, task, files):
        self.set_font("helvetica", "B", 10)
        self.set_text_color(219, 112, 147)
        self.cell(20, 8, f"Day {day}:", 0, 0)
        
        self.set_font("helvetica", "", 10)
        self.set_text_color(60, 60, 60)
        self.multi_cell(0, 8, f"{task} \nFiles: {files}", border='B')
        self.ln(2)

# إنشاء المستند
pdf = AestheticPlanner()
pdf.add_page()

data = [
    ("WEEK 1: SETUP & BASE PAGES", [
        ("1", "Repair Navbar, Footer, and Router", "App.js, Navbar.js, Footer.js"),
        ("2", "Home Page - Figma Optimized", "pages/Home.js"),
        ("3", "Platform Main Page", "pages/Platform.js"),
        ("6-7", "Django Setup + CORS Testing", "settings.py, urls.py")
    ]),
    ("WEEK 2: AI ENGINE (RAG)", [
        ("8", "Prepare PDF Dataset", "ai_engine/data_files/"),
        ("9", "Enhance ingest.py (Multi-PDF)", "ingest.py"),
        ("12", "SmartModule Page Logic", "pages/SmartModule/index.js"),
        ("13-14", "SmartModule CSS & UI Polish", "SmartModule.css")
    ]),
    ("WEEK 3: CORE AI FEATURES", [
        ("15", "F1: Diagnostic Form Implementation", "StudyPlan.js"),
        ("18", "F2: Image Exercise Upload", "GapAnalyzer.js"),
        ("20", "F2: Gemini Vision Integration", "rag_service.py"),
        ("21", "F3: Career Orientation Quiz", "CareerAdvisor.js")
    ]),
    ("WEEK 4: FINAL DEMO & SFE", [
        ("23", "F3: Data Visualization (Chart.js)", "CareerAdvisor.js"),
        ("26", "Full Responsive Optimization", "Global CSS"),
        ("28", "Documentation & README", "README.md"),
        ("29-30", "FINAL DEMO & SFE REPORT", "Academic Submission")
    ])
]

for week_title, tasks in data:
    pdf.week_section(week_title)
    for day, task, files in tasks:
        pdf.add_task(day, task, files)
    pdf.ln(4)

# حفظ الملف
pdf.output("IQRA_Work_Plan_Aesthetic.pdf")
print("✨ Done! Your elegant PDF is ready: IQRA_Work_Plan_Aesthetic.pdf")