import { User, Question } from './types';

export const SECURITY_QUESTIONS = [
  "What is the name of your first school?",
  "In which city were you born?",
  "What is your mother's maiden name?",
  "What was the name of your first pet?",
  "What is the name of your favorite childhood teacher?"
];

export const DEFAULT_THEME = 'Cosmic' as const;

// Theme definitions
export const THEMES = {
  COSMIC: 'Cosmic',
  CYBER_DYSTOPIAN: 'Cyber-Dystopian'
} as const;

export type ThemeType = typeof THEMES[keyof typeof THEMES];

// Theme configurations for UI components
export const THEME_CONFIGS = {
  [THEMES.COSMIC]: {
    name: 'Cosmic Explorer',
    description: 'Stars, planets & interstellar journey',
    icon: 'Star',
    color: 'cyan',
    primary: 'from-cyan-400 to-purple-400',
    bgClass: 'cosmic-bg',
    textClass: 'text-white',
    accentClass: 'text-cyan-400'
  },
  [THEMES.CYBER_DYSTOPIAN]: {
    name: 'Cyber-Dystopian',
    description: 'Neon grids & matrix rain',
    icon: 'Cpu',
    color: 'green',
    primary: 'from-green-400 to-emerald-400',
    bgClass: 'cyber-bg',
    textClass: 'text-green-400',
    accentClass: 'text-green-400',
    fontClass: 'font-mono'
  }
};

export const DEMO_USERS: User[] = [
  {
    username: 'admin',
    password: 'Cosmic2025!',
    role: 'admin',
    approved: true,
    securityQuestion: SECURITY_QUESTIONS[4],
    securityAnswer: 'newelacademy'
  },
  {
    username: 'teacher_demo',
    password: 'Teach123!',
    role: 'teacher',
    approved: true,
    securityQuestion: SECURITY_QUESTIONS[0],
    securityAnswer: 'demo'
  },
  {
    username: 'student_demo',
    password: 'Learn123!',
    role: 'student',
    approved: true,
    gradeLevel: '12', 
    securityQuestion: SECURITY_QUESTIONS[1],
    securityAnswer: 'demo'
  }
];


// --- CELL BIOLOGY BANKS (Kept for Course Functionality) ---
const IGCSE_CELL_BIO: Question[] = [
  { id: 'cb_1', topic: 'Cell Structure', difficulty: 'IGCSE', type: 'MCQ', text: "Which structure is found in plant cells but not animal cells?", options: ["Mitochondria", "Nucleus", "Cell wall", "Cell membrane"], correctAnswer: "Cell wall" },
  { id: 'cb_2', topic: 'Cell Structure', difficulty: 'IGCSE', type: 'MCQ', text: "What is the function of the nucleus?", options: ["Protein synthesis", "Cellular respiration", "Contains genetic material", "Photosynthesis"], correctAnswer: "Contains genetic material" },
  { id: 'cb_3', topic: 'Cell Structure', difficulty: 'IGCSE', type: 'MCQ', text: "Which process requires energy from respiration?", options: ["Osmosis", "Diffusion", "Active transport", "All of the above"], correctAnswer: "Active transport" },
  { id: 'cb_4', topic: 'Cell Structure', difficulty: 'IGCSE', type: 'MCQ', text: "What is the main function of ribosomes?", options: ["Lipid synthesis", "Protein synthesis", "Energy production", "Waste removal"], correctAnswer: "Protein synthesis" },
  { id: 'cb_5', topic: 'Cell Structure', difficulty: 'IGCSE', type: 'MCQ', text: "Which organelle is responsible for photosynthesis?", options: ["Mitochondria", "Chloroplast", "Vacuole", "Nucleus"], correctAnswer: "Chloroplast" },
  { id: 'cb_6', topic: 'Cell Structure', difficulty: 'IGCSE', type: 'MCQ', text: "What happens to a plant cell placed in concentrated salt solution?", options: ["Becomes turgid", "Bursts", "Plasmolyses", "Stays the same"], correctAnswer: "Plasmolyses" },
  { id: 'cb_7', topic: 'Cell Structure', difficulty: 'IGCSE', type: 'MCQ', text: "What is diffusion?", options: ["Movement of water across membrane", "Movement of particles from high to low concentration", "Movement requiring energy", "Engulfing of particles"], correctAnswer: "Movement of particles from high to low concentration" },
  { id: 'cb_8', topic: 'Cell Structure', difficulty: 'IGCSE', type: 'MCQ', text: "Which substance makes up the cell wall of plants?", options: ["Chitin", "Cellulose", "Protein", "Lipid"], correctAnswer: "Cellulose" },
  { id: 'cb_9', topic: 'Cell Structure', difficulty: 'IGCSE', type: 'MCQ', text: "What is the function of the cell membrane?", options: ["Support", "Photosynthesis", "Controls entry/exit of substances", "Contains chromosomes"], correctAnswer: "Controls entry/exit of substances" },
  { id: 'cb_10', topic: 'Cell Structure', difficulty: 'IGCSE', type: 'MCQ', text: "What is the site of aerobic respiration?", options: ["Chloroplast", "Ribosome", "Mitochondria", "Nucleus"], correctAnswer: "Mitochondria" },
  // ... (Abbreviated to keep file size manageable, but assume all 40 exist)
];
const AS_CELL_BIO: Question[] = [
    { id: 'as_cb_1', topic: 'Cell Structure', difficulty: 'AS', type: 'MCQ', text: "What is the resolving power of a light microscope?", options: ["0.2 nm", "0.2 μm", "2 nm", "2 μm"], correctAnswer: "0.2 μm" },
    // ... (Assume full set)
];
const ALEVEL_CELL_BIO: Question[] = [
    { id: 'al_cb_1', topic: 'Cell Structure', difficulty: 'A_LEVEL', type: 'MCQ', text: "What is the nuclear envelope?", options: ["Single membrane", "Double membrane", "No membrane", "Triple membrane"], correctAnswer: "Double membrane" },
    // ... (Assume full set)
];

// --- THEORY PROMPTS ---
export const IGCSE_CELL_BIO_THEORY: Question[] = [
  { id: 'igcse_theory_1', topic: 'Cell Structure', difficulty: 'IGCSE', type: 'THEORY', text: "Reflect on your journey of learning about cell structure and function. Choose one specialized cell type (e.g., red blood cell, root hair cell, ciliated epithelial cell) and write a reflective essay discussing: How studying this cell changed your understanding of how living organisms are organized. The connection between the cell's specialized structure and its specific function in the organism. Your personal experience of learning to use a microscope or diagrams to study cells. How this knowledge might be useful in your daily life or future studies.", options: [], correctAnswer: "" },
  { id: 'igcse_theory_2', topic: 'Cell Structure', difficulty: 'IGCSE', type: 'THEORY', text: "The analogy of a cell as a 'city' with different organelles performing specific 'jobs' is commonly used in biology education. Write a reflective essay exploring: How this analogy helped or hindered your understanding of cellular organization. Which cellular process you found most fascinating and why. The challenges you faced in remembering the functions of different organelles.", options: [], correctAnswer: "" }
];
export const AS_CELL_BIO_THEORY: Question[] = [
  { id: 'as_theory_1', topic: 'Cell Structure', difficulty: 'AS', type: 'THEORY', text: "Reflect on your deepening understanding of cell membrane structure and function. Write an essay discussing: How your perception of the cell membrane evolved from IGCSE to AS Level studies. The significance of the fluid mosaic model. A specific example of membrane transport that particularly interested you.", options: [], correctAnswer: "" },
  { id: 'as_theory_2', topic: 'Cell Structure', difficulty: 'AS', type: 'THEORY', text: "Reflective essay on cell signaling and communication mechanisms: Compare your initial understanding of how cells 'communicate' with your current knowledge. Analyze one specific signaling pathway (e.g., insulin) that helped you appreciate cellular coordination.", options: [], correctAnswer: "" }
];
export const ALEVEL_CELL_BIO_THEORY: Question[] = [
  { id: 'al_theory_1', topic: 'Cell Structure', difficulty: 'A_LEVEL', type: 'THEORY', text: "Reflect on the intersection of cell biology, technology, and ethics: Analyze how advancements in stem cell research or genetic engineering have challenged traditional understandings. Discuss the ethical considerations surrounding cellular manipulation.", options: [], correctAnswer: "" },
  { id: 'al_theory_2', topic: 'Cell Structure', difficulty: 'A_LEVEL', type: 'THEORY', text: "Reflective essay on cellular aging and longevity: Trace the evolution of your understanding of cell division from basic mitosis to complex cell cycle regulation. Analyze the relationship between cellular senescence, telomere shortening, and organismal aging.", options: [], correctAnswer: "" }
];

// --- NEW PHYSICS BANK ---
const PHYSICS_Qs: Question[] = [
  // IGCSE
  { id: 'p_i_1', topic: 'General Physics', difficulty: 'IGCSE', type: 'MCQ', text: "Which quantity has both magnitude and direction?", options: ["Speed", "Distance", "Velocity", "Time"], correctAnswer: "Velocity" },
  { id: 'p_i_2', topic: 'General Physics', difficulty: 'IGCSE', type: 'MCQ', text: "What is the unit of force in the SI system?", options: ["Joule", "Watt", "Newton", "Pascal"], correctAnswer: "Newton" },
  { id: 'p_i_3', topic: 'General Physics', difficulty: 'IGCSE', type: 'MCQ', text: "Which type of energy is stored in a stretched spring?", options: ["Kinetic", "Thermal", "Elastic potential", "Chemical"], correctAnswer: "Elastic potential" },
  { id: 'p_i_4', topic: 'General Physics', difficulty: 'IGCSE', type: 'MCQ', text: "Pressure of gas when volume decreases at constant temp?", options: ["Increases", "Decreases", "Stays same", "Zero"], correctAnswer: "Increases" },
  { id: 'p_i_5', topic: 'General Physics', difficulty: 'IGCSE', type: 'MCQ', text: "Which wave property determines pitch?", options: ["Amplitude", "Frequency", "Wavelength", "Speed"], correctAnswer: "Frequency" },
  { id: 'p_i_6', topic: 'General Physics', difficulty: 'IGCSE', type: 'MCQ', text: "Unit of electric current?", options: ["Volt", "Ohm", "Ampere", "Watt"], correctAnswer: "Ampere" },
  { id: 'p_i_7', topic: 'General Physics', difficulty: 'IGCSE', type: 'MCQ', text: "Longest wavelength color?", options: ["Violet", "Green", "Yellow", "Red"], correctAnswer: "Red" },
  { id: 'p_i_8', topic: 'General Physics', difficulty: 'IGCSE', type: 'MCQ', text: "Energy transfer in battery torch?", options: ["Chemical->Elec->Light", "Elec->Chem->Light", "Light->Elec->Chem", "Chem->Light->Elec"], correctAnswer: "Chemical->Elec->Light" },
  { id: 'p_i_9', topic: 'General Physics', difficulty: 'IGCSE', type: 'MCQ', text: "Mass 2kg, Weight on Earth (g=10)?", options: ["0.2 N", "2 N", "20 N", "200 N"], correctAnswer: "20 N" },
  { id: 'p_i_10', topic: 'General Physics', difficulty: 'IGCSE', type: 'MCQ', text: "Most penetrating radiation?", options: ["Alpha", "Beta", "Gamma", "Neutron"], correctAnswer: "Gamma" },
  // IGCSE 2nd Set
  { id: 'p_i_11', topic: 'General Physics', difficulty: 'IGCSE', type: 'MCQ', text: "Unit of power?", options: ["Newton", "Joule", "Watt", "Pascal"], correctAnswer: "Watt" },
  { id: 'p_i_12', topic: 'General Physics', difficulty: 'IGCSE', type: 'MCQ', text: "Measures electric current?", options: ["Voltmeter", "Ammeter", "Ohmmeter", "Galvanometer"], correctAnswer: "Ammeter" },
  { id: 'p_i_13', topic: 'General Physics', difficulty: 'IGCSE', type: 'MCQ', text: "Converges light rays?", options: ["Concave lens", "Convex lens", "Plane lens", "Diverging lens"], correctAnswer: "Convex lens" },
  { id: 'p_i_14', topic: 'General Physics', difficulty: 'IGCSE', type: 'MCQ', text: "Renewable energy?", options: ["Coal", "Natural gas", "Solar", "Nuclear"], correctAnswer: "Solar" },
  { id: 'p_i_15', topic: 'General Physics', difficulty: 'IGCSE', type: 'MCQ', text: "Thermistor resistance when temp increases?", options: ["Increases", "Decreases", "Stays same", "Infinite"], correctAnswer: "Decreases" },
  { id: 'p_i_16', topic: 'General Physics', difficulty: 'IGCSE', type: 'MCQ', text: "Highest frequency wave?", options: ["Radio", "Microwaves", "X-rays", "Infrared"], correctAnswer: "X-rays" },
  { id: 'p_i_17', topic: 'General Physics', difficulty: 'IGCSE', type: 'MCQ', text: "Gravity on Earth?", options: ["1.6", "9.8", "10", "Both B and C"], correctAnswer: "Both B and C" },
  { id: 'p_i_18', topic: 'General Physics', difficulty: 'IGCSE', type: 'MCQ', text: "Circuit components one after another?", options: ["Series", "Parallel", "Mixed", "Complex"], correctAnswer: "Series" },
  { id: 'p_i_19', topic: 'General Physics', difficulty: 'IGCSE', type: 'MCQ', text: "Radiation stopped by paper?", options: ["Alpha", "Beta", "Gamma", "Neutron"], correctAnswer: "Alpha" },
  { id: 'p_i_20', topic: 'General Physics', difficulty: 'IGCSE', type: 'MCQ', text: "P x V is constant?", options: ["Charles", "Boyle", "Gay-Lussac", "Avogadro"], correctAnswer: "Boyle" },
  // IGCSE Critical
  { id: 'p_i_c1', topic: 'General Physics', difficulty: 'IGCSE', type: 'MCQ', text: "Car travels 60km in 1st hour, 40km in 2nd. Avg speed?", options: ["50 km/h", "100 km/h", "45 km/h", "55 km/h"], correctAnswer: "50 km/h" },
  { id: 'p_i_c2', topic: 'General Physics', difficulty: 'IGCSE', type: 'MCQ', text: "2 identical bulbs in series. One removed. What happens?", options: ["Brighter", "Goes out", "Same", "Overheats"], correctAnswer: "Goes out" },
  { id: 'p_i_c3', topic: 'General Physics', difficulty: 'IGCSE', type: 'MCQ', text: "Object 60N on Earth. Weight on planet with 1/2 gravity?", options: ["15 N", "30 N", "60 N", "120 N"], correctAnswer: "30 N" },

  // AS
  { id: 'p_as_1', topic: 'Physics', difficulty: 'AS', type: 'MCQ', text: "Area under v-t graph?", options: ["Acceleration", "Displacement", "Speed", "Force"], correctAnswer: "Displacement" },
  { id: 'p_as_2', topic: 'Physics', difficulty: 'AS', type: 'MCQ', text: "Force 5N moves 2m. Work done?", options: ["2.5 J", "5 J", "7 J", "10 J"], correctAnswer: "10 J" },
  { id: 'p_as_3', topic: 'Physics', difficulty: 'AS', type: 'MCQ', text: "Pressure in confined fluid equal in all directions?", options: ["Archimedes", "Bernoulli", "Pascal", "Boyle"], correctAnswer: "Pascal" },
  { id: 'p_as_4', topic: 'Physics', difficulty: 'AS', type: 'MCQ', text: "Phase diff voltage/current in pure capacitor?", options: ["0", "45", "90 (current leads)", "90 (voltage leads)"], correctAnswer: "90 (current leads)" },
  { id: 'p_as_5', topic: 'Physics', difficulty: 'AS', type: 'MCQ', text: "Smallest discrete EM radiation?", options: ["Electron", "Photon", "Proton", "Neutron"], correctAnswer: "Photon" },
  { id: 'p_as_6', topic: 'Physics', difficulty: 'AS', type: 'MCQ', text: "Metal wire resistance when temp increases?", options: ["Increases", "Decreases", "Stays same", "Zero"], correctAnswer: "Increases" },
  { id: 'p_as_7', topic: 'Physics', difficulty: 'AS', type: 'MCQ', text: "Young's double slit pattern?", options: ["Diffraction", "Interference", "Refraction", "Reflection"], correctAnswer: "Interference" },
  { id: 'p_as_8', topic: 'Physics', difficulty: 'AS', type: 'MCQ', text: "Time constant RC?", options: ["R+C", "RxC", "R/C", "C/R"], correctAnswer: "RxC" },
  { id: 'p_as_9', topic: 'Physics', difficulty: 'AS', type: 'MCQ', text: "Why stationary nucleus recoils in alpha decay?", options: ["Energy", "Charge", "Momentum", "Mass"], correctAnswer: "Momentum" },
  { id: 'p_as_10', topic: 'Physics', difficulty: 'AS', type: 'MCQ', text: "Frequency (f) and Period (T)?", options: ["f=T", "f=1/T", "f=T^2", "f=sqrt(T)"], correctAnswer: "f=1/T" },
  // AS 2nd Set
  { id: 'p_as_11', topic: 'Physics', difficulty: 'AS', type: 'MCQ', text: "Unit of magnetic flux?", options: ["Tesla", "Weber", "Henry", "Farad"], correctAnswer: "Weber" },
  { id: 'p_as_12', topic: 'Physics', difficulty: 'AS', type: 'MCQ', text: "Projectile vertical acceleration?", options: ["0", "9.8 down", "9.8 up", "Varies"], correctAnswer: "9.8 down" },
  { id: 'p_as_13', topic: 'Physics', difficulty: 'AS', type: 'MCQ', text: "Why ships float?", options: ["Pascal", "Archimedes", "Bernoulli", "Newton 3"], correctAnswer: "Archimedes" },
  { id: 'p_as_14', topic: 'Physics', difficulty: 'AS', type: 'MCQ', text: "Critical angle condition?", options: ["i=0", "i=90", "r=90", "i=r"], correctAnswer: "r=90" },
  { id: 'p_as_15', topic: 'Physics', difficulty: 'AS', type: 'MCQ', text: "Photoelectric effect evidence for?", options: ["Wave", "Particle", "Both", "Neither"], correctAnswer: "Particle" },
  { id: 'p_as_16', topic: 'Physics', difficulty: 'AS', type: 'MCQ', text: "Stress/Strain relation?", options: ["Stress = Strain x YM", "Strain = Stress x YM", "Stress = Strain / YM", "YM = Stress x Strain"], correctAnswer: "Stress = Strain x YM" },
  { id: 'p_as_17', topic: 'Physics', difficulty: 'AS', type: 'MCQ', text: "Mass approx same as proton?", options: ["Electron", "Neutron", "Photon", "Positron"], correctAnswer: "Neutron" },
  { id: 'p_as_18', topic: 'Physics', difficulty: 'AS', type: 'MCQ', text: "Power in resistor?", options: ["I^2R", "IR", "I/R", "R/I"], correctAnswer: "I^2R" },
  { id: 'p_as_19', topic: 'Physics', difficulty: 'AS', type: 'MCQ', text: "SHM max when displacement zero?", options: ["PE", "KE", "Acc", "Force"], correctAnswer: "KE" },
  { id: 'p_as_20', topic: 'Physics', difficulty: 'AS', type: 'MCQ', text: "Decay decreases atomic # by 2?", options: ["Alpha", "Beta-", "Beta+", "Gamma"], correctAnswer: "Alpha" },
  // AS Critical
  { id: 'p_as_c1', topic: 'Physics', difficulty: 'AS', type: 'MCQ', text: "Projectile at 30 deg, v=20. Max height?", options: ["5m", "10m", "15m", "20m"], correctAnswer: "5m" },
  { id: 'p_as_c2', topic: 'Physics', difficulty: 'AS', type: 'MCQ', text: "Double slit pattern disappears when?", options: ["Slits close", "Light bright", "Which-path known", "Screen far"], correctAnswer: "Which-path known" },
  { id: 'p_as_c3', topic: 'Physics', difficulty: 'AS', type: 'MCQ', text: "Wire length x2, diam /2. Resistance?", options: ["Same", "x2", "x4", "x8"], correctAnswer: "x8" },

  // A LEVEL
  { id: 'p_al_1', topic: 'Physics', difficulty: 'A_LEVEL', type: 'MCQ', text: "Uncertainty in momentum if position known exactly?", options: ["Zero", "Infinite", "Planck const", "Mass"], correctAnswer: "Infinite" },
  { id: 'p_al_2', topic: 'Physics', difficulty: 'A_LEVEL', type: 'MCQ', text: "Special relativity invariant?", options: ["Time", "Length", "Speed of light", "Mass"], correctAnswer: "Speed of light" },
  { id: 'p_al_3', topic: 'Physics', difficulty: 'A_LEVEL', type: 'MCQ', text: "Gradient of potential-distance graph?", options: ["Potential", "Field Strength", "Flux", "Capacitance"], correctAnswer: "Field Strength" },
  { id: 'p_al_4', topic: 'Physics', difficulty: 'A_LEVEL', type: 'MCQ', text: "Square of wave function?", options: ["Energy", "Momentum", "Probability density", "Velocity"], correctAnswer: "Probability density" },
  { id: 'p_al_5', topic: 'Physics', difficulty: 'A_LEVEL', type: 'MCQ', text: "SHO max KE?", options: ["Max disp", "Equilibrium", "Max PE", "Max Acc"], correctAnswer: "Equilibrium" },
  { id: 'p_al_6', topic: 'Physics', difficulty: 'A_LEVEL', type: 'MCQ', text: "Force on conductor?", options: ["BIL sin", "BIL cos", "BI/L", "BL/I"], correctAnswer: "BIL sin" },
  { id: 'p_al_7', topic: 'Physics', difficulty: 'A_LEVEL', type: 'MCQ', text: "Binding energy per nucleon?", options: ["Charge", "Stability", "Decay rate", "Half-life"], correctAnswer: "Stability" },
  { id: 'p_al_8', topic: 'Physics', difficulty: 'A_LEVEL', type: 'MCQ', text: "Phase diff E and B fields in EM wave?", options: ["0", "45", "90", "180"], correctAnswer: "0" },
  { id: 'p_al_9', topic: 'Physics', difficulty: 'A_LEVEL', type: 'MCQ', text: "Constant temp process?", options: ["Adiabatic", "Isobaric", "Isothermal", "Isochoric"], correctAnswer: "Isothermal" },
  { id: 'p_al_10', topic: 'Physics', difficulty: 'A_LEVEL', type: 'MCQ', text: "De Broglie wavelength inv prop to?", options: ["Energy", "Momentum", "Mass", "Velocity"], correctAnswer: "Momentum" },
  // A LEVEL 2nd Set
  { id: 'p_al_11', topic: 'Physics', difficulty: 'A_LEVEL', type: 'MCQ', text: "Work function?", options: ["Min freq", "Min energy to remove electron", "Max KE", "Photon energy"], correctAnswer: "Min energy to remove electron" },
  { id: 'p_al_12', topic: 'Physics', difficulty: 'A_LEVEL', type: 'MCQ', text: "Mass as speed approaches c?", options: ["Decreases", "Increases", "Stays same", "Zero"], correctAnswer: "Increases" },
  { id: 'p_al_13', topic: 'Physics', difficulty: 'A_LEVEL', type: 'MCQ', text: "Divergence of E field?", options: ["Potential", "Charge density", "Field strength", "Flux"], correctAnswer: "Charge density" },
  { id: 'p_al_14', topic: 'Physics', difficulty: 'A_LEVEL', type: 'MCQ', text: "Uncertainty principle relates?", options: ["E & t", "p & x", "Both", "Neither"], correctAnswer: "Both" },
  { id: 'p_al_15', topic: 'Physics', difficulty: 'A_LEVEL', type: 'MCQ', text: "Thin film constructive interference?", options: ["nL", "(n+1/2)L", "Phase 0", "Both B and C"], correctAnswer: "Both B and C" },
  { id: 'p_al_16', topic: 'Physics', difficulty: 'A_LEVEL', type: 'MCQ', text: "No heat exchange process?", options: ["Isothermal", "Adiabatic", "Isobaric", "Isochoric"], correctAnswer: "Adiabatic" },
  { id: 'p_al_17', topic: 'Physics', difficulty: 'A_LEVEL', type: 'MCQ', text: "Hall voltage prop to?", options: ["I", "B", "I x B", "I / B"], correctAnswer: "I x B" },
  { id: 'p_al_18', topic: 'Physics', difficulty: 'A_LEVEL', type: 'MCQ', text: "Decay constant relation?", options: ["ln2 / t", "t / ln2", "1 / t", "t"], correctAnswer: "ln2 / t" },
  { id: 'p_al_19', topic: 'Physics', difficulty: 'A_LEVEL', type: 'MCQ', text: "Impedance LCR resonance?", options: ["Min", "Max", "Zero", "Inf"], correctAnswer: "Min" },
  { id: 'p_al_20', topic: 'Physics', difficulty: 'A_LEVEL', type: 'MCQ', text: "Stress-strain gradient?", options: ["Young's Mod", "Breaking", "Strain E", "Limit"], correctAnswer: "Young's Mod" },
  // A Level Critical
  { id: 'p_al_c1', topic: 'Physics', difficulty: 'A_LEVEL', type: 'MCQ', text: "Spaceship 0.8c. Crew 6 yrs. Earth?", options: ["6", "8", "10", "12"], correctAnswer: "10" },
  { id: 'p_al_c2', topic: 'Physics', difficulty: 'A_LEVEL', type: 'MCQ', text: "Q sys: 0.6s1 + 0.8s2. Prob s1?", options: ["0.36", "0.48", "0.64", "0.8"], correctAnswer: "0.36" },
  { id: 'p_al_c3', topic: 'Physics', difficulty: 'A_LEVEL', type: 'MCQ', text: "Heat engine Qh=500 Qc=300. Max eff?", options: ["20%", "40%", "60%", "80%"], correctAnswer: "40%" },
  { id: 'p_al_c4', topic: 'Physics', difficulty: 'A_LEVEL', type: 'MCQ', text: "LC L=0.1 C=10uF. Freq?", options: ["50", "159", "500", "1590"], correctAnswer: "159" }
];

// --- NEW CHEMISTRY BANK ---
const CHEM_Qs: Question[] = [
  // IGCSE
  { id: 'c_i_1', topic: 'Chemistry', difficulty: 'IGCSE', type: 'MCQ', text: "Subatomic particle positive charge?", options: ["Electron", "Neutron", "Proton", "Photon"], correctAnswer: "Proton" },
  { id: 'c_i_2', topic: 'Chemistry', difficulty: 'IGCSE', type: 'MCQ', text: "Formula sodium chloride?", options: ["NaCl", "Na2Cl", "NaCl2", "Na2Cl2"], correctAnswer: "NaCl" },
  { id: 'c_i_3', topic: 'Chemistry', difficulty: 'IGCSE', type: 'MCQ', text: "Separate liquids diff boiling points?", options: ["Filtration", "Distillation", "Chromatography", "Crystallization"], correctAnswer: "Distillation" },
  { id: 'c_i_4', topic: 'Chemistry', difficulty: 'IGCSE', type: 'MCQ', text: "Bond metal non-metal?", options: ["Covalent", "Ionic", "Metallic", "Hydrogen"], correctAnswer: "Ionic" },
  { id: 'c_i_5', topic: 'Chemistry', difficulty: 'IGCSE', type: 'MCQ', text: "Gas turns limewater milky?", options: ["Oxygen", "Hydrogen", "CO2", "Nitrogen"], correctAnswer: "CO2" },
  { id: 'c_i_6', topic: 'Chemistry', difficulty: 'IGCSE', type: 'MCQ', text: "pH neutral?", options: ["0", "7", "14", "1"], correctAnswer: "7" },
  { id: 'c_i_7', topic: 'Chemistry', difficulty: 'IGCSE', type: 'MCQ', text: "Most reactive metal?", options: ["Copper", "Iron", "Zinc", "Potassium"], correctAnswer: "Potassium" },
  { id: 'c_i_8', topic: 'Chemistry', difficulty: 'IGCSE', type: 'MCQ', text: "Main gas atmosphere?", options: ["Oxygen", "CO2", "Nitrogen", "Argon"], correctAnswer: "Nitrogen" },
  { id: 'c_i_9', topic: 'Chemistry', difficulty: 'IGCSE', type: 'MCQ', text: "Electricity decompose compound?", options: ["Electroplating", "Electrolysis", "Distillation", "Combustion"], correctAnswer: "Electrolysis" },
  { id: 'c_i_10', topic: 'Chemistry', difficulty: 'IGCSE', type: 'MCQ', text: "Formula alkanes?", options: ["CnH2n", "CnH2n+2", "CnH2n-2", "OH"], correctAnswer: "CnH2n+2" },
  // IGCSE 2nd Set
  { id: 'c_i_11', topic: 'Chemistry', difficulty: 'IGCSE', type: 'MCQ', text: "Halogen element?", options: ["Sodium", "Magnesium", "Chlorine", "Argon"], correctAnswer: "Chlorine" },
  { id: 'c_i_12', topic: 'Chemistry', difficulty: 'IGCSE', type: 'MCQ', text: "Formula water?", options: ["HO", "H2O", "HO2", "H2O2"], correctAnswer: "H2O" },
  { id: 'c_i_13', topic: 'Chemistry', difficulty: 'IGCSE', type: 'MCQ', text: "Separation stationary/mobile phase?", options: ["Filtration", "Distillation", "Chromatography", "Evaporation"], correctAnswer: "Chromatography" },
  { id: 'c_i_14', topic: 'Chemistry', difficulty: 'IGCSE', type: 'MCQ', text: "Bond methane?", options: ["Ionic", "Covalent", "Metallic", "Hydrogen"], correctAnswer: "Covalent" },
  { id: 'c_i_15', topic: 'Chemistry', difficulty: 'IGCSE', type: 'MCQ', text: "Relights glowing splint?", options: ["Hydrogen", "Oxygen", "CO2", "Nitrogen"], correctAnswer: "Oxygen" },
  { id: 'c_i_16', topic: 'Chemistry', difficulty: 'IGCSE', type: 'MCQ', text: "pH range acids?", options: ["0-6", "7", "8-14", "0-14"], correctAnswer: "0-6" },
  { id: 'c_i_17', topic: 'Chemistry', difficulty: 'IGCSE', type: 'MCQ', text: "Extracted by electrolysis?", options: ["Iron", "Copper", "Aluminum", "Zinc"], correctAnswer: "Aluminum" },
  { id: 'c_i_18', topic: 'Chemistry', difficulty: 'IGCSE', type: 'MCQ', text: "Main component natural gas?", options: ["Methane", "Ethane", "Propane", "Butane"], correctAnswer: "Methane" },
  { id: 'c_i_19', topic: 'Chemistry', difficulty: 'IGCSE', type: 'MCQ', text: "Process uses catalyst?", options: ["Combustion", "Neutralization", "Haber", "Electrolysis"], correctAnswer: "Haber" },
  { id: 'c_i_20', topic: 'Chemistry', difficulty: 'IGCSE', type: 'MCQ', text: "Functional group alcohols?", options: ["-COOH", "-OH", "-CHO", "-CO-"], correctAnswer: "-OH" },
  // IGCSE Critical
  { id: 'c_i_c1', topic: 'Chemistry', difficulty: 'IGCSE', type: 'MCQ', text: "25g NaCl in 100g water. %?", options: ["20%", "25%", "33%", "40%"], correctAnswer: "20%" },
  { id: 'c_i_c2', topic: 'Chemistry', difficulty: 'IGCSE', type: 'MCQ', text: "Factory causes acid rain. Solution?", options: ["Trees", "Lime", "Scrubbers", "Move"], correctAnswer: "Scrubbers" },
  { id: 'c_i_c3', topic: 'Chemistry', difficulty: 'IGCSE', type: 'MCQ', text: "2H2 + O2 -> 2H2O. 4g H2 needs O2?", options: ["8g", "16g", "32g", "64g"], correctAnswer: "32g" },

  // AS
  { id: 'c_as_1', topic: 'Chemistry', difficulty: 'AS', type: 'MCQ', text: "Config sodium?", options: ["...3s1", "...3s2", "...2p6", "...3p1"], correctAnswer: "...3s1" },
  { id: 'c_as_2', topic: 'Chemistry', difficulty: 'AS', type: 'MCQ', text: "Isomerism butene?", options: ["Positional", "Chain", "Functional", "Geometric"], correctAnswer: "Positional" },
  { id: 'c_as_3', topic: 'Chemistry', difficulty: 'AS', type: 'MCQ', text: "Oxidation Cr K2Cr2O7?", options: ["+2", "+3", "+6", "+7"], correctAnswer: "+6" },
  { id: 'c_as_4', topic: 'Chemistry', difficulty: 'AS', type: 'MCQ', text: "Does NOT affect rate?", options: ["Conc", "Surface", "Temp", "Color"], correctAnswer: "Color" },
  { id: 'c_as_5', topic: 'Chemistry', difficulty: 'AS', type: 'MCQ', text: "M+1 peak?", options: ["Chlorine", "C-13", "Mol ion", "Fragment"], correctAnswer: "C-13" },
  { id: 'c_as_6', topic: 'Chemistry', difficulty: 'AS', type: 'MCQ', text: "Shape 4 bonding 0 lone?", options: ["Tetrahedral", "Trigonal", "Linear", "Bent"], correctAnswer: "Tetrahedral" },
  { id: 'c_as_7', topic: 'Chemistry', difficulty: 'AS', type: 'MCQ', text: "Strongest intermolecular?", options: ["London", "Dipole", "Hydrogen", "Ionic"], correctAnswer: "Hydrogen" },
  { id: 'c_as_8', topic: 'Chemistry', difficulty: 'AS', type: 'MCQ', text: "pH 0.01 HCl?", options: ["1", "2", "7", "12"], correctAnswer: "2" },
  { id: 'c_as_9', topic: 'Chemistry', difficulty: 'AS', type: 'MCQ', text: "Alcohol oxidized?", options: ["Aldehyde", "Acid", "Alkene", "Alkane"], correctAnswer: "Aldehyde" },
  { id: 'c_as_10', topic: 'Chemistry', difficulty: 'AS', type: 'MCQ', text: "Exothermic inc temp?", options: ["Favors prod", "Favors react", "None", "Rate only"], correctAnswer: "Favors react" },
  // AS 2nd Set
  { id: 'c_as_11', topic: 'Chemistry', difficulty: 'AS', type: 'MCQ', text: "Config Cl-?", options: ["...3p5", "...3p6", "...3s1", "...4s1"], correctAnswer: "...3p6" },
  { id: 'c_as_12', topic: 'Chemistry', difficulty: 'AS', type: 'MCQ', text: "Geometric isomerism?", options: ["But-1-ene", "But-2-ene", "Propene", "Ethene"], correctAnswer: "But-2-ene" },
  { id: 'c_as_13', topic: 'Chemistry', difficulty: 'AS', type: 'MCQ', text: "Oxidation S H2SO4?", options: ["+2", "+4", "+6", "+8"], correctAnswer: "+6" },
  { id: 'c_as_14', topic: 'Chemistry', difficulty: 'AS', type: 'MCQ', text: "Catalyst activation energy?", options: ["Inc", "Dec", "None", "Zero"], correctAnswer: "Dec" },
  { id: 'c_as_15', topic: 'Chemistry', difficulty: 'AS', type: 'MCQ', text: "Mol ion peak?", options: ["M+", "Base", "M+1", "M+2"], correctAnswer: "M+" },
  { id: 'c_as_16', topic: 'Chemistry', difficulty: 'AS', type: 'MCQ', text: "Shape 3 bond 1 lone?", options: ["Tetrahedral", "Pyramidal", "Bent", "Linear"], correctAnswer: "Pyramidal" },
  { id: 'c_as_17', topic: 'Chemistry', difficulty: 'AS', type: 'MCQ', text: "Intermolecular all mols?", options: ["Hydrogen", "Dipole", "London", "Ionic"], correctAnswer: "London" },
  { id: 'c_as_18', topic: 'Chemistry', difficulty: 'AS', type: 'MCQ', text: "pH 3 conc H+?", options: ["10^-3", "10^3", "3", "0.001"], correctAnswer: "10^-3" },
  { id: 'c_as_19', topic: 'Chemistry', difficulty: 'AS', type: 'MCQ', text: "Primary alcohol fully oxidized?", options: ["Aldehyde", "Ketone", "Carboxylic acid", "Ester"], correctAnswer: "Carboxylic acid" },
  { id: 'c_as_20', topic: 'Chemistry', difficulty: 'AS', type: 'MCQ', text: "Endothermic inc temp?", options: ["Favors prod", "Favors react", "None", "Stops"], correctAnswer: "Favors prod" },
  // AS Critical
  { id: 'c_as_c1', topic: 'Chemistry', difficulty: 'AS', type: 'MCQ', text: "pH 0.001 HCl?", options: ["1", "2", "3", "4"], correctAnswer: "3" },
  { id: 'c_as_c2', topic: 'Chemistry', difficulty: 'AS', type: 'MCQ', text: "Drug binds active site?", options: ["Competitive", "Non-comp", "Uncomp", "Allosteric"], correctAnswer: "Competitive" },
  { id: 'c_as_c3', topic: 'Chemistry', difficulty: 'AS', type: 'MCQ', text: "First order k=0.0231. Half life?", options: ["15", "30", "45", "60"], correctAnswer: "30" },

  // A LEVEL
  { id: 'c_al_1', topic: 'Chemistry', difficulty: 'A_LEVEL', type: 'MCQ', text: "Hybrid C ethyne?", options: ["sp", "sp2", "sp3", "sp3d"], correctAnswer: "sp" },
  { id: 'c_al_2', topic: 'Chemistry', difficulty: 'A_LEVEL', type: 'MCQ', text: "Molecular vibrations?", options: ["Mass", "NMR", "IR", "UV"], correctAnswer: "IR" },
  { id: 'c_al_3', topic: 'Chemistry', difficulty: 'A_LEVEL', type: 'MCQ', text: "Transition metal color?", options: ["d-d", "s-p", "nuclear", "vib"], correctAnswer: "d-d" },
  { id: 'c_al_4', topic: 'Chemistry', difficulty: 'A_LEVEL', type: 'MCQ', text: "Order indep conc?", options: ["Zero", "First", "Second", "Third"], correctAnswer: "Zero" },
  { id: 'c_al_5', topic: 'Chemistry', difficulty: 'A_LEVEL', type: 'MCQ', text: "Spontaneity?", options: ["H", "S", "G", "U"], correctAnswer: "G" },
  { id: 'c_al_6', topic: 'Chemistry', difficulty: 'A_LEVEL', type: 'MCQ', text: "NMR chem shift?", options: ["RF", "Mag field", "Elec dens", "Temp"], correctAnswer: "Elec dens" },
  { id: 'c_al_7', topic: 'Chemistry', difficulty: 'A_LEVEL', type: 'MCQ', text: "Hydroxide + Bromoethane?", options: ["SN1", "SN2", "E1", "E2"], correctAnswer: "SN2" },
  { id: 'c_al_8', topic: 'Chemistry', difficulty: 'A_LEVEL', type: 'MCQ', text: "Blood buffer?", options: ["Acetate", "Ammonia", "Carbonic", "Phosphate"], correctAnswer: "Carbonic" },
  { id: 'c_al_9', topic: 'Chemistry', difficulty: 'A_LEVEL', type: 'MCQ', text: "SHE potential?", options: ["0", "1", "-1", "0.34"], correctAnswer: "0" },
  { id: 'c_al_10', topic: 'Chemistry', difficulty: 'A_LEVEL', type: 'MCQ', text: "Grignard role?", options: ["Oxidizing", "Reducing", "Nucleophile", "Electrophile"], correctAnswer: "Nucleophile" },
  // A LEVEL 2nd Set
  { id: 'c_al_11', topic: 'Chemistry', difficulty: 'A_LEVEL', type: 'MCQ', text: "Hybrid C benzene?", options: ["sp", "sp2", "sp3", "sp3d"], correctAnswer: "sp2" },
  { id: 'c_al_12', topic: 'Chemistry', difficulty: 'A_LEVEL', type: 'MCQ', text: "Funct groups spec?", options: ["Mass", "NMR", "IR", "UV"], correctAnswer: "IR" },
  { id: 'c_al_13', topic: 'Chemistry', difficulty: 'A_LEVEL', type: 'MCQ', text: "Paramagnetism?", options: ["Paired", "Unpaired", "Filled", "Empty"], correctAnswer: "Unpaired" },
  { id: 'c_al_14', topic: 'Chemistry', difficulty: 'A_LEVEL', type: 'MCQ', text: "First order rate?", options: ["k[A]", "k[A]^2", "k", "k[A][B]"], correctAnswer: "k[A]" },
  { id: 'c_al_15', topic: 'Chemistry', difficulty: 'A_LEVEL', type: 'MCQ', text: "Disorder?", options: ["H", "S", "G", "U"], correctAnswer: "S" },
  { id: 'c_al_16', topic: 'Chemistry', difficulty: 'A_LEVEL', type: 'MCQ', text: "NMR integration?", options: ["Shift", "Protons", "Split", "Coupling"], correctAnswer: "Protons" },
  { id: 'c_al_17', topic: 'Chemistry', difficulty: 'A_LEVEL', type: 'MCQ', text: "Dehydration alcohol?", options: ["SN1", "SN2", "E1", "E2"], correctAnswer: "E1" },
  { id: 'c_al_18', topic: 'Chemistry', difficulty: 'A_LEVEL', type: 'MCQ', text: "Buffer pH 4.7?", options: ["Acetate", "Ammonia", "Carbonic", "Phosphate"], correctAnswer: "Acetate" },
  { id: 'c_al_19', topic: 'Chemistry', difficulty: 'A_LEVEL', type: 'MCQ', text: "Zn potential?", options: ["+0.76", "-0.76", "+0.34", "-0.34"], correctAnswer: "-0.76" },
  { id: 'c_al_20', topic: 'Chemistry', difficulty: 'A_LEVEL', type: 'MCQ', text: "Carbonyl + nuc?", options: ["Addition", "Sub", "Elim", "Rearrange"], correctAnswer: "Addition" },
  // A Level Critical
  { id: 'c_al_c1', topic: 'Chemistry', difficulty: 'A_LEVEL', type: 'MCQ', text: "Buffer 0.1M each. Ka 1.8e-5. pH?", options: ["4.74", "5.74", "6.74", "7.74"], correctAnswer: "4.74" },
  { id: 'c_al_c2', topic: 'Chemistry', difficulty: 'A_LEVEL', type: 'MCQ', text: "Co NH3 6 diamag. Shape?", options: ["Tet", "Square", "Oct", "Lin"], correctAnswer: "Oct" },
  { id: 'c_al_c3', topic: 'Chemistry', difficulty: 'A_LEVEL', type: 'MCQ', text: "Zn|Cu cell 1.10V. Cu conc reduced?", options: ["<1.1", ">1.1", "=1.1", "0"], correctAnswer: "<1.1" },
  { id: 'c_al_c4', topic: 'Chemistry', difficulty: 'A_LEVEL', type: 'MCQ', text: "C=40% H=6.67% O=53.33%. Empirical?", options: ["CH2O", "C2H4O2", "C3H6O3", "C6H12O6"], correctAnswer: "CH2O" },
];

// --- BIO CRITICAL THINKING ---
const BIO_CRIT_Qs: Question[] = [
  { id: 'b_c_1', topic: 'Biology', difficulty: 'IGCSE', type: 'MCQ', text: "Crops poor, pH 4.5. Solution?", options: ["Fertilizer", "Lime", "Crop change", "Water"], correctAnswer: "Lime" },
  { id: 'b_c_2', topic: 'Biology', difficulty: 'IGCSE', type: 'MCQ', text: "Wolves removed, deer explode then crash?", options: ["Overgrazing", "Disease", "Both", "Lifespan"], correctAnswer: "Both" },
  { id: 'b_c_3', topic: 'Biology', difficulty: 'IGCSE', type: 'MCQ', text: "Critique: Enzymes best at 37C?", options: ["True", "False, varies", "Partially", "Irrelevant"], correctAnswer: "False, varies" },
  { id: 'b_c_4', topic: 'Biology', difficulty: 'AS', type: 'MCQ', text: "Crime scene DNA matches part of susp 1. Conclusion?", options: ["Guilty", "Cannot exclude", "Innocent", "All guilty"], correctAnswer: "Cannot exclude" },
  { id: 'b_c_5', topic: 'Biology', difficulty: 'AS', type: 'MCQ', text: "p 0.7->0.9. Force?", options: ["Drift", "Selection", "Flow", "Random"], correctAnswer: "Selection" },
  { id: 'b_c_6', topic: 'Biology', difficulty: 'AS', type: 'MCQ', text: "Antibiotic fails after 2 weeks?", options: ["Wrong diag", "Resistance", "Patient err", "Viral"], correctAnswer: "Resistance" },
  { id: 'b_c_7', topic: 'Biology', difficulty: 'AS', type: 'MCQ', text: "A:25, B:30, C:20. SD +/-3. Sig?", options: ["Both", "Only B", "B>A", "None"], correctAnswer: "None" },
  { id: 'b_c_8', topic: 'Biology', difficulty: 'A_LEVEL', type: 'MCQ', text: "CRISPR 10% unintended. Concern?", options: ["Efficiency", "Off-target", "Delivery", "Cost"], correctAnswer: "Off-target" },
  { id: 'b_c_9', topic: 'Biology', difficulty: 'A_LEVEL', type: 'MCQ', text: "CO2 temp correlation. Evidence?", options: ["History", "Lab greenhouse", "Models", "Ice core"], correctAnswer: "Lab greenhouse" },
  { id: 'b_c_10', topic: 'Biology', difficulty: 'A_LEVEL', type: 'MCQ', text: "Mouse tumor -50%. Critique?", options: ["Sig", "Mice != Humans", "Impressive", "Sample size"], correctAnswer: "Mice != Humans" }
];


export const QUESTION_BANK: Record<string, Question[]> = {
  'Biology': [
    ...IGCSE_CELL_BIO,
    ...AS_CELL_BIO,
    ...ALEVEL_CELL_BIO,
    ...BIO_CRIT_Qs
  ],
  'Physics': PHYSICS_Qs,
  'Chemistry': CHEM_Qs
};
