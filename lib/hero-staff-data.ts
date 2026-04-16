export type HeroStaffMember = {
  name: string
  specialty: string
  bio: string
}

/** Equipo del card del hero (editar bios y fotos cuando tengáis material real). */
export const HERO_STAFF: HeroStaffMember[] = [
  {
    name: "Marina López",
    specialty: "Fisioterapia deportiva",
    bio: "Especialista en readaptación y prevención de lesiones en deportistas de alto rendimiento y aficionados. Combina ejercicio terapéutico con pautas de entrenamiento seguras para volver a la actividad con confianza.",
  },
  {
    name: "Jordi Martínez",
    specialty: "Traumatología",
    bio: "Enfoque en recuperación postoperatoria y tratamiento de patologías músculo-esqueléticas tras traumatismos. Prioriza la progresión gradual y el control del dolor en cada fase de la rehabilitación.",
  },
  {
    name: "Andrea Vidal",
    specialty: "Suelo pélvico",
    bio: "Atención integral a mujer y hombre en disfunciones del suelo pélvico, pre y postparto, y dolor pélvico. Sesiones respetuosas y basadas en evidencia para mejorar la calidad de vida.",
  },
  {
    name: "Marc Soler",
    specialty: "Neurología",
    bio: "Experiencia en neurorehabilitación y trastornos del equilibrio y la marcha. Trabaja objetivos funcionales junto al paciente y la familia para ganar autonomía en el día a día.",
  },
  {
    name: "Laura Fernández",
    specialty: "Pediatría",
    bio: "Fisioterapia infantil con un lenguaje cercano y juegos terapéuticos. Aborda alteraciones del desarrollo motor, posturales y respiratorias desde la primera infancia.",
  },
  {
    name: "Pau Ruiz",
    specialty: "Fisioterapia respiratoria",
    bio: "Tratamiento de patologías respiratorias y reeducación ventilatoria. Enseña técnicas de drenaje, ejercicios y hábitos para respirar mejor y reducir la fatiga.",
  },
  {
    name: "Cristina Vega",
    specialty: "Geriatría",
    bio: "Acompaña a personas mayores en el mantenimiento de la movilidad, la fuerza y el equilibrio para prevenir caídas. Adapta cada plan a las capacidades y preferencias de cada persona.",
  },
  {
    name: "Óscar Herrera",
    specialty: "Medicina manual",
    bio: "Técnicas manuales precisas para mejorar la movilidad articular y reducir tensiones. Integra el trabajo manual con ejercicio y educación terapéutica.",
  },
  {
    name: "Núria Camps",
    specialty: "Fisioterapia oncológica",
    bio: "Apoyo durante y después de tratamientos oncológicos: fatiga, cicatrices, linfedema y bienestar general. Intervenciones suaves y respetuosas con el proceso de cada paciente.",
  },
  {
    name: "Alberto Reyes",
    specialty: "Fisioterapia deportiva",
    bio: "Perfil orientado a equipos y deporte amateur con foco en prevención y retorno al juego. Valoración funcional y planes progresivos alineados con el entrenador cuando procede.",
  },
  {
    name: "Elena Castro",
    specialty: "Osteopatía",
    bio: "Visión global del cuerpo para abordar dolor y restricciones con técnicas osteopáticas suaves. Coordina con el resto del equipo cuando el caso lo requiere.",
  },
  {
    name: "Daniel Pardo",
    specialty: "Columna y postura",
    bio: "Aborda cervicalgias, lumbalgias y hábitos posturales en trabajo y vida cotidiana. Combina terapia manual, ejercicio y recomendaciones ergonómicas sencillas de aplicar.",
  },
  {
    name: "Silvia Ramos",
    specialty: "Dolor crónico",
    bio: "Enfoque multidimensional del dolor persistente: educación, movimiento gradual y estrategias de autocuidado. Busca reducir la limitación y mejorar la confianza en el cuerpo.",
  },
  {
    name: "Víctor Moya",
    specialty: "Readaptación deportiva",
    bio: "Diseña retornos al deporte tras lesión con pruebas progresivas y criterios de carga claros. Objetivo: rendimiento seguro sin recaídas innecesarias.",
  },
]

export function staffAvatarSrc(seed: string) {
  const q = encodeURIComponent(seed)
  return `https://api.dicebear.com/7.x/notionists/svg?seed=${q}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`
}
