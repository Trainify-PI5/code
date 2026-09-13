import React, { createContext, useContext, useState } from "react";

type Language = "en" | "es" | "pt-BR";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Barra Lateral
    "nav.home": "Home",
    "nav.courses": "Courses",
    "nav.analytics": "Analytics",
    "nav.certifications": "Certifications",
    "nav.settings": "Settings",
    "nav.support": "Support",
    "nav.notifications": "Notifications",
    "sidebar.startLearning": "Start Learning",
    "sidebar.learningPortal": "Learning Portal",

    // Barra Superior
    "topbar.search": "Search courses, analytics...",
    "topbar.profile": "Profile",
    "topbar.helpCenter": "Help Center",
    "topbar.expand": "Expand sidebar",
    "topbar.collapse": "Collapse sidebar",
    "topbar.lightMode": "Switch to light mode",
    "topbar.darkMode": "Switch to dark mode",

    // Início
    "home.welcomePrefix": "Welcome back,",
    "home.subtitle":
      "You are currently on track to complete your Q3 leadership objectives. Keep up the momentum.",
    "home.currentTrack": "Current Track",
    "home.moduleProgress": "Module 4 of 6",
    "home.estCompletion": "Est. completion: Oct 12",
    "home.featuredCourses": "Featured Courses",
    "home.viewAll": "View all",
    "home.active": "Active",
    "home.thisMonth": "this month",
    "home.avgScore": "Avg Score",
    "home.acrossDepts": "Across depts",
    "home.recentActivity": "Recent Activity",
    "home.viewActivityLog": "View Activity Log",
    "home.trackName": "Advanced Executive Leadership",
    "home.videoSeries": "Video Series",
    "home.interactiveQuiz": "Interactive Quiz",
    "home.course1Title": "Conflict Resolution in Agile Teams",
    "home.course1Desc":
      "Master the techniques to navigate and resolve interpersonal conflicts within fast-paced agile environments.",
    "home.course2Title": "Data-Driven Decision Making",
    "home.course2Desc":
      "Learn how to interpret complex datasets to drive strategic corporate initiatives and optimize operations.",
    "home.act1User": "Design Team",
    "home.act1Action": "completed",
    "home.act1Target": "Accessibility Guidelines",
    "home.act1Time": "2 hours ago",
    "home.act2User": "System",
    "home.act2Action": "assigned",
    "home.act2Target": "Compliance 2024",
    "home.act2Time": "Yesterday",
    "home.act3Action": "replied to",
    "home.act3Target": "Leadership 101",

    // Cursos
    "courses.title": "Available Courses",
    "courses.subtitle":
      "Explore and continue your learning journey to build new skills and advance your career at Trainify.",
    "courses.filterAll": "All",
    "courses.filterLeadership": "Leadership",
    "courses.filterTechnical": "Technical",
    "courses.filterSoftSkills": "Soft Skills",
    "courses.statusCompleted": "Completed",
    "courses.statusComplete": "Complete",
    "courses.statusNotStarted": "Not Started",
    "courses.reviewMaterial": "Review Material",
    "courses.resumeCourse": "Resume Course",
    "courses.startCourse": "Start Course",
    "courses.c1Title": "Strategic Decision Making in Complex Environments",
    "courses.c1Desc":
      "Learn frameworks for making high-stakes decisions when variables are uncertain and cross-functional alignment is critical.",
    "courses.c2Title": "Advanced Data Analytics with Python",
    "courses.c2Desc":
      "Master data manipulation, visualization, and predictive modeling using pandas, numpy, and scikit-learn.",
    "courses.c3Title": "Effective Conflict Resolution in Teams",
    "courses.c3Desc":
      "Develop practical strategies to navigate interpersonal disputes and foster psychological safety.",
    "courses.c4Title": "Inclusive Leadership in Global Organizations",
    "courses.c4Desc":
      "Build diverse teams and foster a culture of belonging across geographical and cultural boundaries.",

    // Análises
    "analytics.title": "Analytics Overview",
    "analytics.subtitle":
      "Track learner engagement and performance metrics across departments.",
    "analytics.exportReport": "Export Report",
    "analytics.filterData": "Filter Data",
    "analytics.totalLearners": "Total Active Learners",
    "analytics.totalCourses": "Total Courses",
    "analytics.activeEnrollments": "Active Enrollments",
    "analytics.completedEnrollments": "Completed Enrollments",
    "analytics.avgScore": "Average Score",
    "analytics.avgTime": "Avg Time to Complete",
    "analytics.completionRate": "Completion Rate",
    "analytics.vsLastMonth": "vs last month",
    "analytics.engagementOverTime": "Engagement Over Time",
    "analytics.last30Days": "Last 30 Days",
    "analytics.lastQuarter": "Last Quarter",
    "analytics.yearToDate": "Year to Date",
    "analytics.courseDistribution": "Course Distribution",
    "analytics.enrollmentsByCategory": "Enrollments by category",
    "analytics.deptPerformance": "Department Performance",
    "analytics.learnerProgress": "Detailed Learner Progress",
    "analytics.viewAll": "View All",
    "analytics.colName": "Learner Name",
    "analytics.colCourse": "Current Course",
    "analytics.colProgress": "Progress",
    "analytics.colScore": "Score",
    "analytics.colStatus": "Status",
    "analytics.statusInProgress": "In Progress",
    "analytics.statusCompleted": "Completed",
    "analytics.statusStarted": "Started",
    "analytics.week1": "Week 1",
    "analytics.week2": "Week 2",
    "analytics.week3": "Week 3",
    "analytics.week4": "Week 4",
    "analytics.week5": "Week 5",
    "analytics.week6": "Week 6",
    "analytics.leadership": "Leadership",
    "analytics.technical": "Technical",
    "analytics.compliance": "Compliance",
    "analytics.softSkills": "Soft Skills",
    "analytics.deptEngineering": "Engineering",
    "analytics.deptSales": "Sales",
    "analytics.deptMarketing": "Marketing",
    "analytics.deptHR": "HR",
    "analytics.courseReact": "Advanced React Patterns",
    "analytics.courseSecurity": "Data Security Basics",
    "analytics.courseLeadership": "Leadership 101",

    // Certificações
    "cert.title": "Certifications & Awards",
    "cert.subtitle":
      "View and share your achievements and completed credentials.",
    "cert.downloadAll": "Download All",
    "cert.totalEarned": "Total Earned",
    "cert.hoursLogged": "Hours Logged",
    "cert.avgScore": "Avg. Score",
    "cert.yourCredentials": "Your Credentials",
    "cert.issued": "Issued",
    "cert.score": "Score",
    "cert.downloadPdf": "Download PDF",
    "cert.share": "Share",
    "cert.skillLeadership": "Leadership",
    "cert.skillTechnical": "Technical",
    "cert.skillCommunication": "Communication",
    "cert.skillCompliance": "Compliance",
    "cert.c1Title": "Strategic Decision Making",
    "cert.c1Date": "Oct 15, 2024",
    "cert.c1Issuer": "Trainify Exec",
    "cert.c2Title": "Advanced React Patterns",
    "cert.c2Date": "Sep 02, 2024",
    "cert.c2Issuer": "Trainify Tech",
    "cert.c3Title": "Agile Team Conflict Resolution",
    "cert.c3Date": "Jul 18, 2024",
    "cert.c3Issuer": "Trainify SoftSkills",
    "cert.c4Title": "Data Security & Compliance",
    "cert.c4Date": "Jan 10, 2024",
    "cert.c4Issuer": "Trainify Sec",

    // Assistente de IA
    "nav.assistant": "IA Assistant",
    "ia.conversations": "Conversations",
    "ia.suggestedActions": "Suggested Actions",
    "ia.recent": "Recent",
    "ia.action1": "Generate Progress Report",
    "ia.action2": "Schedule Team Training",
    "ia.conv1Title": "Onboarding Course Plan",
    "ia.conv1Preview": "Here are the recommended modules for new...",
    "ia.conv2Title": "Q3 Compliance Completion",
    "ia.conv2Preview": "Generate a list of employees who haven't...",
    "ia.conv3Title": "Leadership Skills Path",
    "ia.conv3Preview": "I need a learning path for mid-level managers...",
    "ia.yesterday": "Yesterday",
    "ia.welcomeMessage":
      "Hello! I'm your Learning IA Assistant. I can help you build curriculums, analyze training data, or recommend courses for your team.\n\nHow can I assist you today?",
    "ia.assistantName": "IA Assistant",
    "ia.you": "You",
    "ia.inputPlaceholder":
      "Ask the IA Assistant to create plans, analyze data...",
    "ia.send": "Send",
    "ia.disclaimer":
      "IA Assistant can make mistakes. Consider verifying important data.",

    // Configurações
    "settings.title": "Settings",
    "settings.subtitle": "Manage your account preferences.",
    "settings.profile": "My Profile",
    "settings.security": "Security",
    "settings.personalInfo": "Personal Information",
    "settings.fullName": "Full Name",
    "settings.email": "Email Address",
    "settings.bio": "Bio",
    "settings.bioPlaceholder": "Tell us about yourself...",
    "settings.save": "Save Changes",
    "settings.change": "Change",
    "settings.changePassword": "Change Password",
    "settings.currentPassword": "Current Password",
    "settings.newPassword": "New Password",
    "settings.confirmNewPassword": "Confirm New Password",
    "settings.updatePassword": "Update Password",

    // Suporte
    "support.heroTitle": "How can we help you?",
    "support.heroSubtitle":
      "Search our knowledge base or get in touch with our learning support team.",
    "support.searchPlaceholder": "Search for articles, guides, or questions...",
    "support.guideTitle": "Getting Started Guide",
    "support.guideDesc":
      "New to Trainify? Learn the basics of navigating the platform.",
    "support.troubleTitle": "Troubleshooting",
    "support.troubleDesc":
      "Fix common issues with video playback or quiz submissions.",
    "support.forumTitle": "Community Forum",
    "support.forumDesc":
      "Ask questions and discuss topics with other learners.",
    "support.contactTitle": "Contact Support",
    "support.contactSubtitle":
      "If you can't find what you are looking for, our support team is ready to help.",
    "support.emailSupport": "Email Support",
    "support.emailResponse": "Expected response time: 2-4 hours",
    "support.phoneSupport": "Phone Support",
    "support.phoneHours": "Mon-Fri, 9am-6pm EST",
    "support.faqTitle": "Frequently Asked Questions",
    "support.faq1Q": "How do I print or download my certificate?",
    "support.faq1A":
      "Navigate to the Certifications tab from the left menu. Find the credential you want to download and click the download icon located at the bottom right of the certification card.",
    "support.faq2Q": "Is there a limit on how many courses I can take?",
    "support.faq2A":
      "No, all courses in your departmental track are fully available to you without limits. Some premium enterprise content may require manager approval.",
    "support.faq3Q": "I forgot my password, how do I reset it?",
    "support.faq3A":
      "Because Trainify uses Single Sign-On (SSO) with your corporate account, you will need to contact your local IT helpdesk to reset your password.",
    "support.faq4Q": "How often are the training materials updated?",
    "support.faq4A":
      "We update our course material quarterly. However, critical compliance and security courses are updated immediately as regulations change.",

    // Perfil
    "profile.myProfile": "My Profile",
    "profile.logout": "Sign Out",

    // Avaliação
    "assessment.title": "Knowledge Check",
    "assessment.completed": "Assessment Completed!",
    "assessment.completedDesc":
      "You've scored 100% on the Strategic Thinking knowledge check. Great work!",
    "assessment.totalScore": "Total Score",
    "assessment.timeSpent": "Time Spent",
    "assessment.returnToCourse": "Return to Course",
    "assessment.questionOf": "Question {current} of {total}",
    "assessment.complete": "Complete",
    "assessment.selectHint":
      "Select your answer to proceed to the next question.",
    "assessment.next": "Next Question",
    "assessment.finish": "Finish Assessment",
    "assessment.q1Text":
      "Which component of the OODA loop is most heavily influenced by an individual's cultural heritage and previous experience?",
    "assessment.q1o1": "Observe",
    "assessment.q1o2": "Orient",
    "assessment.q1o3": "Decide",
    "assessment.q1o4": "Act",
    "assessment.q2Text":
      "In the Cynefin framework, which domain represents problems where cause-and-effect can only be determined after the fact?",
    "assessment.q2o1": "Simple",
    "assessment.q2o2": "Complicated",
    "assessment.q2o3": "Complex",
    "assessment.q2o4": "Chaotic",
    "assessment.q3Text":
      "What is the primary goal of applying the Five Whys technique in root cause analysis?",
    "assessment.q3o1": "To identify the team member at fault",
    "assessment.q3o2": "To find a temporary workaround quickly",
    "assessment.q3o3":
      "To peel back thin layers of symptoms to find the underlying issue",
    "assessment.q3o4": "To generate five alternative solutions",

    // Conteúdo do Curso
    "content.courseTitle": "Strategic Decision Making in Complex Environments",
    "content.moduleInfo": "Module 3: Framework Analysis • 65% Progress",
    "content.courseGrade": "Course Grade",
    "content.gradeValue": "88% (Distinction)",
    "content.retakeAssessment": "Retake Assessment",
    "content.frameworkEvolution": "Framework Evolution",
    "content.downloadTranscript": "Download Transcript",
    "content.lessonPlan": "Lesson Plan",
    "content.lessonPlanInfo": "6 Lessons • 1h 45m Total",
    "content.markComplete": "Mark Course Complete",
    "content.lesson1": "The Psychology of Decision Making",
    "content.lesson2": "Cognitive Biases in Crisis",
    "content.lesson3": "Framework Analysis: OODA Loop",
    "content.lesson4": "Mid-Course Knowledge Check",
    "content.lesson4Duration": "10 Questions",
    "content.lesson5": "Group Dynamics and Alignment",
    "content.lesson6": "Strategic Roadmap Exercise",
    "content.lesson6Duration": "PDF Study",
    "content.lessonDesc1":
      "In this session, we dive deep into the OODA (Observe, Orient, Decide, Act) loop, a strategic framework originally developed by military strategist John Boyd.",
    "content.lessonDesc2":
      'We will examine how the "Orientation" phase is the most critical part of the loop, as it filters your observations through cultural heritage, genetic predisposition, and previous experience.',
    "content.bullet1": "Understanding the four stages of the OODA Loop.",
    "content.bullet2":
      'How to accelerate the "Decide" phase without losing accuracy.',
    "content.bullet3":
      "Real-world case studies in high-stakes corporate negotiation.",

    // Notificações
    "notif.title": "Notifications",
    "notif.subtitle":
      "Stay updated with your latest learning activities and team alerts.",
    "notif.markAllRead": "Mark all read",
    "notif.clearAll": "Clear all",
    "notif.n1Title": "Certification Completed",
    "notif.n1Desc":
      'Congratulations! You have successfully completed the "Strategic Decision Making" course.',
    "notif.n1Time": "2 hours ago",
    "notif.n2Title": "New mandatory course assigned",
    "notif.n2Desc":
      'Your manager has assigned "Data Security Basics" to your learning path. Due by Nov 15.',
    "notif.n2Time": "Yesterday",
    "notif.n3Title": "New Reply in Leadership Forum",
    "notif.n3Desc":
      'Marcus Chen replied: "Great point about cross-functional alignment. I think we..."',
    "notif.n3Time": "2 days ago",
  },

  es: {
    // Barra Lateral
    "nav.home": "Inicio",
    "nav.courses": "Cursos",
    "nav.analytics": "Análisis",
    "nav.certifications": "Certificaciones",
    "nav.settings": "Ajustes",
    "nav.support": "Soporte",
    "nav.notifications": "Notificaciones",
    "sidebar.startLearning": "Empezar a Aprender",
    "sidebar.learningPortal": "Portal de Aprendizaje",

    // Barra Superior
    "topbar.search": "Buscar cursos, análisis...",
    "topbar.profile": "Perfil",
    "topbar.helpCenter": "Centro de Ayuda",
    "topbar.expand": "Expandir menú lateral",
    "topbar.collapse": "Contraer menú lateral",
    "topbar.lightMode": "Cambiar a modo claro",
    "topbar.darkMode": "Cambiar a modo oscuro",

    // Início
    "home.welcomePrefix": "Bienvenido de nuevo,",
    "home.subtitle":
      "Actualmente estás en camino de completar tus objetivos de liderazgo del T3. Mantén el ritmo.",
    "home.currentTrack": "Vía Actual",
    "home.moduleProgress": "Módulo 4 de 6",
    "home.estCompletion": "Est. de finalización: Oct 12",
    "home.featuredCourses": "Cursos Destacados",
    "home.viewAll": "Ver todos",
    "home.active": "Activos",
    "home.thisMonth": "este mes",
    "home.avgScore": "Puntaje Prom.",
    "home.acrossDepts": "En deptos",
    "home.recentActivity": "Actividad Reciente",
    "home.viewActivityLog": "Ver Registro de Actividad",
    "home.trackName": "Liderazgo Ejecutivo Avanzado",
    "home.videoSeries": "Serie de Videos",
    "home.interactiveQuiz": "Quiz Interactivo",
    "home.course1Title": "Resolución de Conflictos en Equipos Ágiles",
    "home.course1Desc":
      "Domina las técnicas para navegar y resolver conflictos interpersonales en entornos ágiles.",
    "home.course2Title": "Toma de Decisiones Basada en Datos",
    "home.course2Desc":
      "Aprende a interpretar conjuntos de datos complejos para impulsar iniciativas corporativas estratégicas.",
    "home.act1User": "Equipo de Diseño",
    "home.act1Action": "completó",
    "home.act1Target": "Pautas de Accesibilidad",
    "home.act1Time": "Hace 2 horas",
    "home.act2User": "Sistema",
    "home.act2Action": "asignó",
    "home.act2Target": "Compliance 2024",
    "home.act2Time": "Ayer",
    "home.act3Action": "respondió",
    "home.act3Target": "Liderazgo 101",

    // Cursos
    "courses.title": "Cursos Disponibles",
    "courses.subtitle":
      "Explora y continúa tu viaje de aprendizaje para desarrollar nuevas habilidades y avanzar en tu carrera en Trainify.",
    "courses.filterAll": "Todos",
    "courses.filterLeadership": "Liderazgo",
    "courses.filterTechnical": "Técnico",
    "courses.filterSoftSkills": "Habilidades Blandas",
    "courses.statusCompleted": "Completado",
    "courses.statusComplete": "Completado",
    "courses.statusNotStarted": "No Iniciado",
    "courses.reviewMaterial": "Revisar Material",
    "courses.resumeCourse": "Reanudar Curso",
    "courses.startCourse": "Comenzar Curso",
    "courses.c1Title": "Toma de Decisiones Estratégicas en Entornos Complejos",
    "courses.c1Desc":
      "Aprende marcos de trabajo para tomar decisiones de alto impacto cuando las variables son inciertas.",
    "courses.c2Title": "Análisis de Datos Avanzado con Python",
    "courses.c2Desc":
      "Domina la manipulación de datos, visualización y modelado predictivo con pandas, numpy y scikit-learn.",
    "courses.c3Title": "Resolución Efectiva de Conflictos en Equipos",
    "courses.c3Desc":
      "Desarrolla estrategias para resolver disputas interpersonales y fomentar la seguridad psicológica.",
    "courses.c4Title": "Liderazgo Inclusivo en Organizaciones Globales",
    "courses.c4Desc":
      "Construye equipos diversos y fomenta una cultura de pertenencia más allá de las fronteras culturales.",

    // Análises
    "analytics.title": "Resumen de Análisis",
    "analytics.subtitle":
      "Sigue el compromiso y las métricas de rendimiento por departamento.",
    "analytics.exportReport": "Exportar Informe",
    "analytics.filterData": "Filtrar Datos",
    "analytics.totalLearners": "Total de Alumnos Activos",
    "analytics.totalCourses": "Total de Cursos",
    "analytics.activeEnrollments": "Matrículas Activas",
    "analytics.completedEnrollments": "Matrículas Completadas",
    "analytics.avgScore": "Puntuación Media",
    "analytics.avgTime": "Tiempo Promedio de Conclusión",
    "analytics.completionRate": "Tasa de Finalización",
    "analytics.vsLastMonth": "vs mes anterior",
    "analytics.engagementOverTime": "Compromiso a lo Largo del Tiempo",
    "analytics.last30Days": "Últimos 30 Días",
    "analytics.lastQuarter": "Último Trimestre",
    "analytics.yearToDate": "Año Actual",
    "analytics.courseDistribution": "Distribución de Cursos",
    "analytics.enrollmentsByCategory": "Matrículas por categoría",
    "analytics.deptPerformance": "Rendimiento por Departamento",
    "analytics.learnerProgress": "Progreso Detallado",
    "analytics.viewAll": "Ver Todos",
    "analytics.colName": "Nombre",
    "analytics.colCourse": "Curso Actual",
    "analytics.colProgress": "Progreso",
    "analytics.colScore": "Puntuación",
    "analytics.colStatus": "Estado",
    "analytics.statusInProgress": "En Progreso",
    "analytics.statusCompleted": "Completado",
    "analytics.statusStarted": "Iniciado",
    "analytics.week1": "Sem 1",
    "analytics.week2": "Sem 2",
    "analytics.week3": "Sem 3",
    "analytics.week4": "Sem 4",
    "analytics.week5": "Sem 5",
    "analytics.week6": "Sem 6",
    "analytics.leadership": "Liderazgo",
    "analytics.technical": "Técnico",
    "analytics.compliance": "Cumplimiento",
    "analytics.softSkills": "Habilidades Blandas",
    "analytics.deptEngineering": "Ingeniería",
    "analytics.deptSales": "Ventas",
    "analytics.deptMarketing": "Marketing",
    "analytics.deptHR": "RRHH",
    "analytics.courseReact": "Patrones Avanzados en React",
    "analytics.courseSecurity": "Seguridad de Datos",
    "analytics.courseLeadership": "Liderazgo 101",

    // Certificações
    "cert.title": "Certificaciones y Logros",
    "cert.subtitle": "Ve y comparte tus logros y credenciales completadas.",
    "cert.downloadAll": "Descargar Todo",
    "cert.totalEarned": "Total Obtenido",
    "cert.hoursLogged": "Horas Estudiadas",
    "cert.avgScore": "Puntuación Media",
    "cert.yourCredentials": "Tus Credenciales",
    "cert.issued": "Emitido el",
    "cert.score": "Puntuación",
    "cert.downloadPdf": "Descargar PDF",
    "cert.share": "Compartir",
    "cert.skillLeadership": "Liderazgo",
    "cert.skillTechnical": "Técnico",
    "cert.skillCommunication": "Comunicación",
    "cert.skillCompliance": "Cumplimiento",
    "cert.c1Title": "Toma de Decisiones Estratégicas",
    "cert.c1Date": "15 Oct 2024",
    "cert.c1Issuer": "Trainify Exec",
    "cert.c2Title": "Patrones Avanzados en React",
    "cert.c2Date": "02 Sep 2024",
    "cert.c2Issuer": "Trainify Tech",
    "cert.c3Title": "Resolución de Conflictos en Equipos Ágiles",
    "cert.c3Date": "18 Jul 2024",
    "cert.c3Issuer": "Trainify SoftSkills",
    "cert.c4Title": "Seguridad de Datos y Cumplimiento",
    "cert.c4Date": "10 Ene 2024",
    "cert.c4Issuer": "Trainify Sec",

    // Assistente de IA
    "nav.assistant": "Asistente IA",
    "ia.conversations": "Conversaciones",
    "ia.suggestedActions": "Acciones Sugeridas",
    "ia.recent": "Recientes",
    "ia.action1": "Generar Informe de Progreso",
    "ia.action2": "Programar Entrenamiento del Equipo",
    "ia.conv1Title": "Plan de Incorporación",
    "ia.conv1Preview": "Aquí están los módulos recomendados para nuevos...",
    "ia.conv2Title": "Cumplimiento Q3",
    "ia.conv2Preview": "Genera una lista de empleados que aún no han...",
    "ia.conv3Title": "Ruta de Habilidades de Liderazgo",
    "ia.conv3Preview": "Necesito una ruta para gerentes de nivel medio...",
    "ia.yesterday": "Ayer",
    "ia.welcomeMessage":
      "¡Hola! Soy tu Asistente de Aprendizaje IA. Puedo ayudarte a crear currículos, analizar datos de entrenamiento o recomendar cursos para tu equipo.\n\n¿Cómo puedo ayudarte hoy?",
    "ia.assistantName": "Asistente IA",
    "ia.you": "Tú",
    "ia.inputPlaceholder":
      "Pide al Asistente IA que cree planes, analice datos...",
    "ia.send": "Enviar",
    "ia.disclaimer":
      "El Asistente IA puede cometer errores. Considera verificar datos importantes.",

    // Configurações
    "settings.title": "Configuraciones",
    "settings.subtitle": "Gestiona las preferencias de tu cuenta.",
    "settings.profile": "Mi Perfil",
    "settings.security": "Seguridad",
    "settings.personalInfo": "Información Personal",
    "settings.fullName": "Nombre Completo",
    "settings.email": "Correo Electrónico",
    "settings.bio": "Biografía",
    "settings.bioPlaceholder": "Cuéntanos sobre ti...",
    "settings.save": "Guardar Cambios",
    "settings.change": "Cambiar",
    "settings.changePassword": "Cambiar Contraseña",
    "settings.currentPassword": "Contraseña Actual",
    "settings.newPassword": "Nueva Contraseña",
    "settings.confirmNewPassword": "Confirmar Nueva Contraseña",
    "settings.updatePassword": "Actualizar Contraseña",

    // Notificações
    "notif.title": "Notificaciones",
    "notif.subtitle":
      "Mantente actualizado con tus actividades de aprendizaje y alertas del equipo.",
    "notif.markAllRead": "Marcar todas como leídas",
    "notif.clearAll": "Limpiar todo",
    "notif.n1Title": "Certificación Completada",
    "notif.n1Desc":
      'Felicitaciones! Completaste exitosamente el curso "Toma de Decisiones Estratégicas".',
    "notif.n1Time": "Hace 2 horas",
    "notif.n2Title": "Nuevo curso obligatorio asignado",
    "notif.n2Desc":
      'Tu gerente asignó "Seguridad de Datos Básico" a tu ruta. Fecha límite: 15 de Nov.',
    "notif.n2Time": "Ayer",
    "notif.n3Title": "Nueva respuesta en el Foro de Liderazgo",
    "notif.n3Desc":
      'Marcus Chen respondió: "Excelente punto sobre alineación entre equipos. Creo que..."',
    "notif.n3Time": "Hace 2 días",

    // Suporte
    "support.heroTitle": "¿Cómo podemos ayudarte?",
    "support.heroSubtitle":
      "Busca en nuestra base de conocimiento o contáctanos.",
    "support.searchPlaceholder": "Buscar artículos, guías o preguntas...",
    "support.guideTitle": "Guía de Inicio",
    "support.guideDesc":
      "¿Nuevo en Trainify? Aprende lo básico sobre cómo navegar en la plataforma.",
    "support.troubleTitle": "Solución de Problemas",
    "support.troubleDesc":
      "Resuelve problemas comunes con la reproducción de video o envío de cuestionarios.",
    "support.forumTitle": "Foro de la Comunidad",
    "support.forumDesc": "Haz preguntas y discute temas con otros estudiantes.",
    "support.contactTitle": "Contactar Soporte",
    "support.contactSubtitle":
      "Si no encuentras lo que buscas, nuestro equipo está listo para ayudarte.",
    "support.emailSupport": "Soporte por Correo",
    "support.emailResponse": "Tiempo de respuesta esperado: 2-4 horas",
    "support.phoneSupport": "Soporte Telefónico",
    "support.phoneHours": "Lun-Vie, 9am-6pm EST",
    "support.faqTitle": "Preguntas Frecuentes",
    "support.faq1Q": "¿Cómo imprimo o descargo mi certificado?",
    "support.faq1A":
      "Ve a la pestaña Certificaciones en el menú izquierdo. Encuentra la credencial que deseas descargar y haz clic en el ícono de descarga en la esquina inferior derecha.",
    "support.faq2Q": "¿Hay un límite en la cantidad de cursos que puedo tomar?",
    "support.faq2A":
      "No, todos los cursos de tu ruta departamental están disponibles sin límites. Algunos contenidos premium pueden requerir aprobación del gerente.",
    "support.faq3Q": "Olvidé mi contraseña, ¿cómo la restablezco?",
    "support.faq3A":
      "Como Trainify usa Single Sign-On (SSO) con tu cuenta corporativa, deberás contactar al soporte de TI de tu empresa para restablecer la contraseña.",
    "support.faq4Q": "¿Con qué frecuencia se actualizan los materiales?",
    "support.faq4A":
      "Actualizamos nuestros materiales trimestralmente. Los cursos de cumplimiento y seguridad se actualizan inmediatamente cuando hay cambios regulatorios.",

    // Perfil
    "profile.myProfile": "Mi Perfil",
    "profile.logout": "Cerrar Sesión",

    // Avaliação
    "assessment.title": "Verificación de Conocimiento",
    "assessment.completed": "¡Evaluación Completada!",
    "assessment.completedDesc":
      "Obtuviste 100% en la verificación de Pensamiento Estratégico. ¡Excelente trabajo!",
    "assessment.totalScore": "Puntuación Total",
    "assessment.timeSpent": "Tiempo Empleado",
    "assessment.returnToCourse": "Volver al Curso",
    "assessment.questionOf": "Pregunta {current} de {total}",
    "assessment.complete": "Completado",
    "assessment.selectHint":
      "Selecciona tu respuesta para avanzar a la siguiente pregunta.",
    "assessment.next": "Siguiente Pregunta",
    "assessment.finish": "Finalizar Evaluación",
    "assessment.q1Text":
      "¿Qué componente del ciclo OODA está más influenciado por la herencia cultural y experiencia previa del individuo?",
    "assessment.q1o1": "Observar",
    "assessment.q1o2": "Orientar",
    "assessment.q1o3": "Decidir",
    "assessment.q1o4": "Actuar",
    "assessment.q2Text":
      "En el framework Cynefin, ¿qué dominio representa problemas donde la causa y efecto solo pueden determinarse después del hecho?",
    "assessment.q2o1": "Simple",
    "assessment.q2o2": "Complicado",
    "assessment.q2o3": "Complejo",
    "assessment.q2o4": "Caótico",
    "assessment.q3Text":
      "¿Cuál es el objetivo principal de aplicar la técnica de los Cinco Porqués en el análisis de causa raíz?",
    "assessment.q3o1": "Identificar al miembro del equipo responsable",
    "assessment.q3o2": "Encontrar rápidamente una solución temporal",
    "assessment.q3o3":
      "Eliminar capas de síntomas para encontrar el problema subyacente",
    "assessment.q3o4": "Generar cinco soluciones alternativas",

    // Conteúdo do Curso
    "content.courseTitle":
      "Toma de Decisiones Estratégicas en Entornos Complejos",
    "content.moduleInfo": "Módulo 3: Análisis de Framework • 65% de Progreso",
    "content.courseGrade": "Calificación del Curso",
    "content.gradeValue": "88% (Distinción)",
    "content.retakeAssessment": "Repetir Evaluación",
    "content.frameworkEvolution": "Evolución del Framework",
    "content.downloadTranscript": "Descargar Transcripción",
    "content.lessonPlan": "Plan de Lecciones",
    "content.lessonPlanInfo": "6 Lecciones • 1h 45m Total",
    "content.markComplete": "Marcar Curso como Completado",
    "content.lesson1": "La Psicología de la Toma de Decisiones",
    "content.lesson2": "Sesgos Cognitivos en Crisis",
    "content.lesson3": "Análisis de Framework: Loop OODA",
    "content.lesson4": "Verificación de Conocimiento",
    "content.lesson4Duration": "10 Preguntas",
    "content.lesson5": "Dinámica de Grupo y Alineación",
    "content.lesson6": "Ejercicio de Hoja de Ruta Estratégica",
    "content.lesson6Duration": "Estudio en PDF",
    "content.lessonDesc1":
      "En esta sesión, profundizamos en el loop OODA (Observar, Orientar, Decidir, Actuar), un framework estratégico desarrollado por el estratega militar John Boyd.",
    "content.lessonDesc2":
      'Examinaremos cómo la fase de "Orientación" es la parte más crítica del loop, ya que filtra tus observaciones a través de la herencia cultural, predisposición genética y experiencias previas.',
    "content.bullet1": "Comprender las cuatro etapas del Loop OODA.",
    "content.bullet2":
      'Cómo acelerar la fase de "Decisión" sin perder precisión.',
    "content.bullet3":
      "Casos de estudio reales en negociación corporativa de alto riesgo.",
  },

  "pt-BR": {
    // Barra Lateral
    "nav.home": "Início",
    "nav.courses": "Cursos",
    "nav.analytics": "Análises",
    "nav.certifications": "Certificados",
    "nav.settings": "Configurações",
    "nav.support": "Suporte",
    "nav.notifications": "Notificações",
    "sidebar.startLearning": "Começar a Aprender",
    "sidebar.learningPortal": "Portal de Ensino",

    // Barra Superior
    "topbar.search": "Pesquisar cursos, análises...",
    "topbar.profile": "Perfil",
    "topbar.helpCenter": "Central de Ajuda",
    "topbar.expand": "Expandir menu lateral",
    "topbar.collapse": "Recolher menu lateral",
    "topbar.lightMode": "Mudar para modo claro",
    "topbar.darkMode": "Mudar para modo escuro",

    // Início
    "home.welcomePrefix": "Bem-vindo de volta,",
    "home.subtitle":
      "Você está no caminho certo para concluir seus objetivos de liderança do 3º trimestre. Mantenha o ritmo.",
    "home.currentTrack": "Trilha Atual",
    "home.moduleProgress": "Módulo 4 de 6",
    "home.estCompletion": "Prev. de conclusão: 12 de Out",
    "home.featuredCourses": "Cursos em Destaque",
    "home.viewAll": "Ver todos",
    "home.active": "Ativos",
    "home.thisMonth": "este mês",
    "home.avgScore": "Nota Média",
    "home.acrossDepts": "Entre depts",
    "home.recentActivity": "Atividade Recente",
    "home.viewActivityLog": "Ver Histórico de Atividades",
    "home.trackName": "Liderança Executiva Avançada",
    "home.videoSeries": "Série de Vídeos",
    "home.interactiveQuiz": "Quiz Interativo",
    "home.course1Title": "Resolução de Conflitos em Times Ágeis",
    "home.course1Desc":
      "Domine as técnicas para navegar e resolver conflitos interpessoais em ambientes ágeis.",
    "home.course2Title": "Tomada de Decisão Baseada em Dados",
    "home.course2Desc":
      "Aprenda a interpretar conjuntos de dados complexos para impulsionar iniciativas corporativas.",
    "home.act1User": "Time de Design",
    "home.act1Action": "concluiu",
    "home.act1Target": "Diretrizes de Acessibilidade",
    "home.act1Time": "2 horas atrás",
    "home.act2User": "Sistema",
    "home.act2Action": "atribuiu",
    "home.act2Target": "Compliance 2024",
    "home.act2Time": "Ontem",
    "home.act3Action": "respondeu",
    "home.act3Target": "Liderança 101",

    // Cursos
    "courses.title": "Cursos Disponíveis",
    "courses.subtitle":
      "Explore e continue sua jornada de aprendizado para desenvolver novas habilidades e avançar em sua carreira na Trainify.",
    "courses.filterAll": "Todos",
    "courses.filterLeadership": "Liderança",
    "courses.filterTechnical": "Técnico",
    "courses.filterSoftSkills": "Soft Skills",
    "courses.statusCompleted": "Concluído",
    "courses.statusComplete": "Concluído",
    "courses.statusNotStarted": "Não Iniciado",
    "courses.reviewMaterial": "Revisar Material",
    "courses.resumeCourse": "Continuar Curso",
    "courses.startCourse": "Iniciar Curso",
    "courses.c1Title": "Tomada de Decisão Estratégica em Ambientes Complexos",
    "courses.c1Desc":
      "Aprenda frameworks para tomar decisões de alto impacto quando as variáveis são incertas.",
    "courses.c2Title": "Análise de Dados Avançada com Python",
    "courses.c2Desc":
      "Domine manipulação de dados, visualização e modelagem preditiva com pandas, numpy e scikit-learn.",
    "courses.c3Title": "Resolução de Conflitos em Equipes",
    "courses.c3Desc":
      "Desenvolva estratégias para resolver disputas interpessoais e promover segurança psicológica.",
    "courses.c4Title": "Liderança Inclusiva em Organizações Globais",
    "courses.c4Desc":
      "Construa equipes diversas e promova uma cultura de pertencimento além das fronteiras culturais.",

    // Análises
    "analytics.title": "Visão Geral de Análises",
    "analytics.subtitle":
      "Acompanhe o engajamento e métricas de desempenho por departamento.",
    "analytics.exportReport": "Exportar Relatório",
    "analytics.filterData": "Filtrar Dados",
    "analytics.totalLearners": "Total de Alunos Ativos",
    "analytics.totalCourses": "Total de Cursos",
    "analytics.activeEnrollments": "Matrículas Ativas",
    "analytics.completedEnrollments": "Matrículas Concluídas",
    "analytics.avgScore": "Nota Média",
    "analytics.avgTime": "Tempo Médio de Conclusão",
    "analytics.completionRate": "Taxa de Conclusão",
    "analytics.vsLastMonth": "vs mês anterior",
    "analytics.engagementOverTime": "Engajamento ao Longo do Tempo",
    "analytics.last30Days": "Últimos 30 Dias",
    "analytics.lastQuarter": "Último Trimestre",
    "analytics.yearToDate": "Ano Atual",
    "analytics.courseDistribution": "Distribuição de Cursos",
    "analytics.enrollmentsByCategory": "Matrículas por categoria",
    "analytics.deptPerformance": "Desempenho por Departamento",
    "analytics.learnerProgress": "Progresso dos Alunos",
    "analytics.viewAll": "Ver Todos",
    "analytics.colName": "Nome",
    "analytics.colCourse": "Curso Atual",
    "analytics.colProgress": "Progresso",
    "analytics.colScore": "Nota",
    "analytics.colStatus": "Status",
    "analytics.statusInProgress": "Em Andamento",
    "analytics.statusCompleted": "Concluído",
    "analytics.statusStarted": "Iniciado",
    "analytics.week1": "Sem 1",
    "analytics.week2": "Sem 2",
    "analytics.week3": "Sem 3",
    "analytics.week4": "Sem 4",
    "analytics.week5": "Sem 5",
    "analytics.week6": "Sem 6",
    "analytics.leadership": "Liderança",
    "analytics.technical": "Técnico",
    "analytics.compliance": "Conformidade",
    "analytics.softSkills": "Soft Skills",
    "analytics.deptEngineering": "Engenharia",
    "analytics.deptSales": "Vendas",
    "analytics.deptMarketing": "Marketing",
    "analytics.deptHR": "RH",
    "analytics.courseReact": "Padrões Avançados em React",
    "analytics.courseSecurity": "Segurança de Dados",
    "analytics.courseLeadership": "Liderança 101",

    // Certificações
    "cert.title": "Certificações e Conquistas",
    "cert.subtitle":
      "Veja e compartilhe suas conquistas e credenciais concluídas.",
    "cert.downloadAll": "Baixar Todos",
    "cert.totalEarned": "Total Conquistado",
    "cert.hoursLogged": "Horas Estudadas",
    "cert.avgScore": "Nota Média",
    "cert.yourCredentials": "Suas Credenciais",
    "cert.issued": "Emitido em",
    "cert.score": "Nota",
    "cert.downloadPdf": "Baixar PDF",
    "cert.share": "Compartilhar",
    "cert.skillLeadership": "Liderança",
    "cert.skillTechnical": "Técnico",
    "cert.skillCommunication": "Comunicação",
    "cert.skillCompliance": "Conformidade",
    "cert.c1Title": "Tomada de Decisão Estratégica",
    "cert.c1Date": "15 Out 2024",
    "cert.c1Issuer": "Trainify Exec",
    "cert.c2Title": "Padrões Avançados em React",
    "cert.c2Date": "02 Set 2024",
    "cert.c2Issuer": "Trainify Tech",
    "cert.c3Title": "Resolução de Conflitos em Times Ágeis",
    "cert.c3Date": "18 Jul 2024",
    "cert.c3Issuer": "Trainify SoftSkills",
    "cert.c4Title": "Segurança de Dados e Conformidade",
    "cert.c4Date": "10 Jan 2024",
    "cert.c4Issuer": "Trainify Sec",

    // Assistente de IA
    "nav.assistant": "Assistente IA",
    "ia.conversations": "Conversas",
    "ia.suggestedActions": "Ações Sugeridas",
    "ia.recent": "Recentes",
    "ia.action1": "Gerar Relatório de Progresso",
    "ia.action2": "Agendar Treinamento da Equipe",
    "ia.conv1Title": "Plano de Onboarding",
    "ia.conv1Preview": "Aqui estão os módulos recomendados para novos...",
    "ia.conv2Title": "Conclusão de Compliance Q3",
    "ia.conv2Preview": "Gere uma lista de colaboradores que ainda não...",
    "ia.conv3Title": "Trilha de Habilidades de Liderança",
    "ia.conv3Preview": "Preciso de uma trilha para gestores de nível médio...",
    "ia.yesterday": "Ontem",
    "ia.welcomeMessage":
      "Olá! Sou seu Assistente de Aprendizado IA. Posso ajudar você a criar currículos, analisar dados de treinamento ou recomendar cursos para sua equipe.\n\nComo posso te ajudar hoje?",
    "ia.assistantName": "Assistente IA",
    "ia.you": "Você",
    "ia.inputPlaceholder":
      "Pergunte ao Assistente IA para criar planos, analisar dados...",
    "ia.send": "Enviar",
    "ia.disclaimer":
      "O Assistente IA pode cometer erros. Considere verificar informações importantes.",

    // Configurações
    "settings.title": "Configurações",
    "settings.subtitle": "Gerencie as preferências da sua conta.",
    "settings.profile": "Meu Perfil",
    "settings.security": "Segurança",
    "settings.personalInfo": "Informações Pessoais",
    "settings.fullName": "Nome Completo",
    "settings.email": "E-mail",
    "settings.bio": "Bio",
    "settings.bioPlaceholder": "Fale um pouco sobre você...",
    "settings.save": "Salvar Alterações",
    "settings.change": "Alterar",
    "settings.changePassword": "Alterar Senha",
    "settings.currentPassword": "Senha Atual",
    "settings.newPassword": "Nova Senha",
    "settings.confirmNewPassword": "Confirmar Nova Senha",
    "settings.updatePassword": "Atualizar Senha",

    // Suporte
    "support.heroTitle": "Como podemos te ajudar?",
    "support.heroSubtitle":
      "Pesquise na nossa base de conhecimento ou entre em contato com nosso time de suporte.",
    "support.searchPlaceholder": "Pesquisar artigos, guias ou dúvidas...",
    "support.guideTitle": "Guia de Primeiros Passos",
    "support.guideDesc":
      "Novo no Trainify? Aprenda o básico sobre como navegar na plataforma.",
    "support.troubleTitle": "Solução de Problemas",
    "support.troubleDesc":
      "Resolva problemas comuns com reprodução de vídeo ou envio de quizzes.",
    "support.forumTitle": "Fórum da Comunidade",
    "support.forumDesc": "Faça perguntas e discuta tópicos com outros alunos.",
    "support.contactTitle": "Contato com Suporte",
    "support.contactSubtitle":
      "Se não encontrar o que procura, nossa equipe está pronta para ajudar.",
    "support.emailSupport": "Suporte por E-mail",
    "support.emailResponse": "Tempo de resposta esperado: 2-4 horas",
    "support.phoneSupport": "Suporte por Telefone",
    "support.phoneHours": "Seg-Sex, 9h-18h (horário de Brasília)",
    "support.faqTitle": "Perguntas Frequentes",
    "support.faq1Q": "Como imprimo ou baixo meu certificado?",
    "support.faq1A":
      "Acesse a aba Certificados no menu lateral. Encontre a credencial que deseja baixar e clique no ícone de download no canto inferior direito do card.",
    "support.faq2Q": "Existe limite de cursos que posso fazer?",
    "support.faq2A":
      "Não, todos os cursos da sua trilha departamental estão disponíveis sem limites. Alguns conteúdos premium podem exigir aprovação do gestor.",
    "support.faq3Q": "Esqueci minha senha, como a redefino?",
    "support.faq3A":
      "Como o Trainify utiliza Single Sign-On (SSO) com sua conta corporativa, entre em contato com o suporte de TI da sua empresa para redefinir a senha.",
    "support.faq4Q": "Com que frequência os materiais são atualizados?",
    "support.faq4A":
      "Atualizamos nossos materiais trimestralmente. Cursos de compliance e segurança são atualizados imediatamente quando há mudanças regulatórias.",

    // Perfil
    "profile.myProfile": "Meu Perfil",
    "profile.logout": "Sair da conta",

    // Avaliação
    "assessment.title": "Verificação de Conhecimento",
    "assessment.completed": "Avaliação Concluída!",
    "assessment.completedDesc":
      "Você tirou 100% na verificação de conhecimento de Pensamento Estratégico. Excelente trabalho!",
    "assessment.totalScore": "Pontuação Total",
    "assessment.timeSpent": "Tempo Gasto",
    "assessment.returnToCourse": "Voltar ao Curso",
    "assessment.questionOf": "Questão {current} de {total}",
    "assessment.complete": "Concluído",
    "assessment.selectHint":
      "Selecione sua resposta para avançar para a próxima questão.",
    "assessment.next": "Próxima Questão",
    "assessment.finish": "Finalizar Avaliação",
    "assessment.q1Text":
      "Qual componente do ciclo OODA é mais influenciado pela herança cultural e experiência prévia do indivíduo?",
    "assessment.q1o1": "Observar",
    "assessment.q1o2": "Orientar",
    "assessment.q1o3": "Decidir",
    "assessment.q1o4": "Agir",
    "assessment.q2Text":
      "No framework Cynefin, qual domínio representa problemas onde a causa e efeito só podem ser determinados após o fato?",
    "assessment.q2o1": "Simples",
    "assessment.q2o2": "Complicado",
    "assessment.q2o3": "Complexo",
    "assessment.q2o4": "Caótico",
    "assessment.q3Text":
      "Qual é o objetivo principal de aplicar a técnica dos Cinco Porquês na análise de causa raiz?",
    "assessment.q3o1": "Identificar o membro da equipe responsável",
    "assessment.q3o2": "Encontrar rapidamente uma solução temporária",
    "assessment.q3o3":
      "Remover camadas de sintomas para encontrar o problema subjacente",
    "assessment.q3o4": "Gerar cinco soluções alternativas",

    // Conteúdo do Curso
    "content.courseTitle":
      "Tomada de Decisão Estratégica em Ambientes Complexos",
    "content.moduleInfo": "Módulo 3: Análise de Framework • 65% de Progresso",
    "content.courseGrade": "Nota do Curso",
    "content.gradeValue": "88% (Distinção)",
    "content.retakeAssessment": "Refazer Avaliação",
    "content.frameworkEvolution": "Evolução do Framework",
    "content.downloadTranscript": "Baixar Transcrição",
    "content.lessonPlan": "Plano de Aulas",
    "content.lessonPlanInfo": "6 Aulas • 1h 45m Total",
    "content.markComplete": "Marcar Curso como Concluído",
    "content.lesson1": "A Psicologia da Tomada de Decisão",
    "content.lesson2": "Vieses Cognitivos em Crises",
    "content.lesson3": "Análise de Framework: Loop OODA",
    "content.lesson4": "Verificação de Conhecimento",
    "content.lesson4Duration": "10 Questões",
    "content.lesson5": "Dinâmicas de Grupo e Alinhamento",
    "content.lesson6": "Exercício de Roadmap Estratégico",
    "content.lesson6Duration": "Estudo em PDF",
    "content.lessonDesc1":
      "Nesta sessão, mergulhamos no loop OODA (Observar, Orientar, Decidir, Agir), um framework estratégico desenvolvido pelo estrategista militar John Boyd.",
    "content.lessonDesc2":
      'Examinaremos como a fase de "Orientação" é a parte mais crítica do loop, pois filtra suas observações através da herança cultural, predisposição genética e experiências anteriores.',
    "content.bullet1": "Entendendo as quatro etapas do Loop OODA.",
    "content.bullet2": 'Como acelerar a fase de "Decisão" sem perder precisão.',
    "content.bullet3":
      "Estudos de caso reais em negociação corporativa de alto risco.",

    // Notificações
    "notif.title": "Notificações",
    "notif.subtitle":
      "Fique atualizado com suas atividades de aprendizado e alertas da equipe.",
    "notif.markAllRead": "Marcar todas como lidas",
    "notif.clearAll": "Limpar tudo",
    "notif.n1Title": "Certificação Concluída",
    "notif.n1Desc":
      'Parabéns! Você concluiu com sucesso o curso "Tomada de Decisão Estratégica".',
    "notif.n1Time": "2 horas atrás",
    "notif.n2Title": "Novo curso obrigatório atribuído",
    "notif.n2Desc":
      'Seu gestor atribuiu "Segurança de Dados Básico" à sua trilha. Prazo: 15 de Nov.',
    "notif.n2Time": "Ontem",
    "notif.n3Title": "Nova resposta no Fórum de Liderança",
    "notif.n3Desc":
      'Marcus Chen respondeu: "Ótimo ponto sobre alinhamento entre equipes. Acho que..."',
    "notif.n3Time": "2 dias atrás",
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined,
);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem("language");
    return (saved as Language) || "pt-BR";
  });

  const setLanguage = (lang: Language) => {
    localStorage.setItem("language", lang);
    setLanguageState(lang);
  };

  const t = (key: string) => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
