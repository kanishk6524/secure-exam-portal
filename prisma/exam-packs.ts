// Ready-made exam packs. Questions are original practice questions written for this portal (not copied from any
// real paper). Seed them with `npm run seed:exams`; create a placement drive for any company with
// `npm run exam:placement -- "Company Name"`.
export type PackQuestion = { text: string; options: [string, string, string, string]; answer: 0 | 1 | 2 | 3 }
export type PackSubject = { name: string; questions: PackQuestion[] }
export type ExamPack = {
  id: string
  title: string
  description: string
  durationMins: number
  marks: number
  negative: number
  subjects: PackSubject[]
}

const q = (text: string, options: [string, string, string, string], answer: 0 | 1 | 2 | 3): PackQuestion => ({ text, options, answer })

export const JEE_MAIN_MOCK: ExamPack = {
  id: "pack-jee-main-mock",
  title: "JEE Main Mock Test (Physics, Chemistry, Mathematics)",
  description: "Full-length style mock for engineering entrance practice. +4 for a correct answer, -1 for a wrong one, 3 hours.",
  durationMins: 180,
  marks: 4,
  negative: 1,
  subjects: [
    {
      name: "Physics",
      questions: [
        q("The SI unit of impulse is:", ["N·s", "N/s", "J·s", "W·s"], 0),
        q("A ball is thrown vertically upward at 20 m/s. Taking g = 10 m/s², the maximum height reached is:", ["10 m", "20 m", "40 m", "5 m"], 1),
        q("The work done by the centripetal force on a body moving in uniform circular motion is:", ["Positive", "Negative", "Zero", "Depends on the radius"], 2),
        q("Two resistors of 6 Ω and 3 Ω are connected in parallel. The equivalent resistance is:", ["9 Ω", "4.5 Ω", "2 Ω", "18 Ω"], 2),
        q("Which of the following is a scalar quantity?", ["Velocity", "Force", "Momentum", "Work"], 3),
        q("A simple pendulum of length 1 m is placed where g = π² m/s². Its time period is:", ["1 s", "2 s", "π s", "4 s"], 1),
        q("The kinetic energy of a 2 kg body moving at 3 m/s is:", ["6 J", "9 J", "12 J", "18 J"], 1),
        q("A convex lens has a power of +2 dioptre. Its focal length is:", ["2 m", "20 cm", "50 cm", "200 cm"], 2),
      ],
    },
    {
      name: "Chemistry",
      questions: [
        q("The atomic number of carbon is:", ["4", "6", "8", "12"], 1),
        q("The pH of a 0.01 M solution of the strong acid HCl is:", ["1", "2", "7", "12"], 1),
        q("The hybridisation of carbon in methane (CH₄) is:", ["sp", "sp²", "sp³", "dsp²"], 2),
        q("How many moles are present in 36 g of water (molar mass 18 g/mol)?", ["1", "2", "3", "0.5"], 1),
        q("Which element has the highest electronegativity?", ["Oxygen", "Chlorine", "Nitrogen", "Fluorine"], 3),
        q("Which is the noble gas with the lowest atomic number?", ["Neon", "Helium", "Argon", "Hydrogen"], 1),
        q("The IUPAC name of CH₃CH₂OH is:", ["Methanol", "Ethanol", "Propanol", "Ethanal"], 1),
        q("The value of Avogadro's number is approximately:", ["6.022 × 10²³", "6.022 × 10²⁰", "3.011 × 10²³", "1.6 × 10⁻¹⁹"], 0),
      ],
    },
    {
      name: "Mathematics",
      questions: [
        q("The value of ∫₀³ 2x dx is:", ["3", "6", "9", "18"], 2),
        q("The sum of the roots of x² − 5x + 6 = 0 is:", ["5", "6", "−5", "1"], 0),
        q("The number of distinct arrangements of the letters of the word MATH is:", ["12", "16", "24", "4"], 2),
        q("If A is a 2×2 matrix with det(A) = 3, then det(2A) equals:", ["6", "12", "9", "24"], 1),
        q("The sum of the first 10 natural numbers is:", ["45", "50", "55", "100"], 2),
        q("The slope of the line 2x + 3y = 6 is:", ["2/3", "−2/3", "3/2", "−3/2"], 1),
        q("lim (x→0) sin x / x equals:", ["0", "1", "∞", "Does not exist"], 1),
        q("Two fair coins are tossed. The probability of getting two heads is:", ["1/2", "1/3", "1/4", "3/4"], 2),
      ],
    },
  ],
}

export const COLLEGE_ENTRANCE_MOCK: ExamPack = {
  id: "pack-college-entrance-mock",
  title: "College Entrance Mock Test (CET style)",
  description: "General college entrance practice: quantitative aptitude, reasoning, English and general awareness. +2 correct, -1 wrong, 90 minutes.",
  durationMins: 90,
  marks: 2,
  negative: 1,
  subjects: [
    {
      name: "Quantitative Aptitude",
      questions: [
        q("What is 15% of 200?", ["20", "25", "30", "35"], 2),
        q("A car travels at 60 km/h for 2.5 hours. The distance covered is:", ["120 km", "150 km", "140 km", "180 km"], 1),
        q("The simple interest on ₹1000 at 10% per annum for 2 years is:", ["₹100", "₹150", "₹200", "₹220"], 2),
        q("The LCM of 12 and 18 is:", ["6", "36", "72", "216"], 1),
        q("The average of 10, 20 and 30 is:", ["15", "20", "25", "60"], 1),
        q("If 5 workers finish a job in 12 days, 10 workers (same rate) will finish it in:", ["24 days", "6 days", "8 days", "10 days"], 1),
      ],
    },
    {
      name: "Logical Reasoning",
      questions: [
        q("Find the next number: 2, 4, 8, 16, ?", ["24", "30", "32", "64"], 2),
        q("Find the next number: 3, 6, 11, 18, 27, ?", ["36", "38", "40", "45"], 1),
        q("Which one is the odd one out?", ["Apple", "Banana", "Carrot", "Mango"], 2),
        q("Rahul is taller than Amit, and Amit is taller than Sumit. Who is the shortest?", ["Rahul", "Amit", "Sumit", "Cannot be said"], 2),
        q("The angle between the hour and minute hands of a clock at 3:00 is:", ["60°", "90°", "120°", "180°"], 1),
        q("Which number does not belong: 4, 9, 16, 20, 25?", ["4", "9", "20", "25"], 2),
      ],
    },
    {
      name: "English",
      questions: [
        q("Choose the synonym of ABUNDANT:", ["Plentiful", "Rare", "Weak", "Small"], 0),
        q("Choose the correct sentence:", ["She don't like tea.", "She doesn't like tea.", "She not like tea.", "She didn't likes tea."], 1),
        q("The idiom 'a piece of cake' means:", ["A dessert", "Something very easy", "A small gift", "A difficult task"], 1),
        q("The plural of 'child' is:", ["Childs", "Childes", "Children", "Childrens"], 2),
        q("Fill in the blank: He ___ to school every day.", ["go", "goes", "going", "gone"], 1),
        q("Choose the antonym of SCARCE:", ["Rare", "Limited", "Plentiful", "Tiny"], 2),
      ],
    },
    {
      name: "General Awareness",
      questions: [
        q("The capital of India is:", ["Mumbai", "Kolkata", "New Delhi", "Chennai"], 2),
        q("The chemical symbol of gold is:", ["Ag", "Au", "Gd", "Go"], 1),
        q("The largest planet in our solar system is:", ["Earth", "Saturn", "Jupiter", "Neptune"], 2),
        q("The national bird of India is:", ["Sparrow", "Peacock", "Eagle", "Parrot"], 1),
      ],
    },
  ],
}

/** Template for a company placement drive. `companyName` is filled in by the seed / the exam:placement script. */
export function placementPack(companyName: string, id: string): ExamPack {
  return {
    id,
    title: `Placement Drive: ${companyName} (Round 1: Aptitude and Technical)`,
    description: `Online assessment for ${companyName}'s campus placement. Aptitude, reasoning, verbal and computer science fundamentals. +1 for a correct answer, no negative marking, 60 minutes.`,
    durationMins: 60,
    marks: 1,
    negative: 0,
    subjects: [
      {
        name: "Quantitative Aptitude",
        questions: [
          q("A train 120 m long passes a pole in how many seconds if its speed is 36 km/h?", ["10 s", "12 s", "15 s", "20 s"], 1),
          q("An article bought for ₹500 is sold for ₹600. The profit percentage is:", ["10%", "15%", "20%", "25%"], 2),
          q("Two numbers are in the ratio 2:3 and their sum is 50. The larger number is:", ["20", "25", "30", "35"], 2),
          q("One pipe fills a tank in 6 hours and another in 3 hours. Together they fill it in:", ["1 hour", "2 hours", "4.5 hours", "9 hours"], 1),
          q("What is 25% of 80?", ["15", "20", "25", "30"], 1),
          q("The average of five numbers is 12. Their sum is:", ["17", "48", "60", "72"], 2),
        ],
      },
      {
        name: "Logical Reasoning",
        questions: [
          q("Find the next number: 1, 4, 9, 16, ?", ["20", "24", "25", "36"], 2),
          q("If CAT is coded as DBU (each letter moved one step forward), then DOG is coded as:", ["EPH", "EOH", "DPH", "CPH"], 0),
          q("A man faces north and turns right. He now faces:", ["West", "South", "East", "North-west"], 2),
          q("Pointing to a man, a woman says: 'His mother is the only daughter of my mother.' How is the man related to the woman?", ["Brother", "Son", "Nephew", "Father"], 1),
          q("Which of these is a prime number?", ["21", "27", "29", "33"], 2),
        ],
      },
      {
        name: "Verbal Ability",
        questions: [
          q("Choose the synonym of RAPID:", ["Slow", "Quick", "Late", "Heavy"], 1),
          q("Choose the correctly spelt word:", ["Neccessary", "Necessary", "Necesary", "Neccesary"], 1),
          q("Fill in the blank: She has been working here ___ 2019.", ["for", "since", "from", "by"], 1),
          q("Choose the antonym of EXPAND:", ["Grow", "Stretch", "Contract", "Spread"], 2),
          q("Fill in the blank: Neither of the boys ___ present.", ["were", "are", "was", "have been"], 2),
        ],
      },
      {
        name: "Computer Science Fundamentals",
        questions: [
          q("The time complexity of binary search on a sorted array of n elements is:", ["O(n)", "O(log n)", "O(n log n)", "O(1)"], 1),
          q("Which data structure follows the LIFO principle?", ["Queue", "Stack", "Array", "Linked list"], 1),
          q("Which SQL statement is used to retrieve data from a table?", ["GET", "FETCH", "SELECT", "OPEN"], 2),
          q("The worst-case time complexity of quicksort is:", ["O(n log n)", "O(n)", "O(n²)", "O(log n)"], 2),
          q("Which OSI layer is responsible for routing packets between networks?", ["Data link", "Network", "Transport", "Session"], 1),
          q("The ability of one interface to have many implementations is called:", ["Encapsulation", "Inheritance", "Polymorphism", "Abstraction"], 2),
          q("Which property must a primary key have?", ["It may contain duplicates", "It must be unique and not null", "It must be a string", "It can be empty"], 1),
          q("The default port of HTTP is:", ["21", "25", "80", "443"], 2),
        ],
      },
      {
        name: "Code Output",
        questions: [
          q("What does this Python code print?\n\nprint(len(\"hello\"))", ["4", "5", "6", "Error"], 1),
          q("What does this Python code print?\n\nprint(2 ** 3)", ["6", "8", "9", "5"], 1),
          q("What does this Python code print?\n\nprint(10 // 3)", ["3.33", "3", "4", "1"], 1),
          q("What does this Python code print?\n\nfor i in range(3):\n    print(i, end=\"\")", ["123", "012", "0 1 2 3", "Error"], 1),
        ],
      },
    ],
  }
}

/** A short exam for showing the portal live: real-time server timer, proctoring and auto-submit all work in a couple of minutes. */
export function liveDemoPack(id: string, minutes: number): ExamPack {
  return {
    id,
    title: `Live Demo Exam (${minutes} minute${minutes === 1 ? "" : "s"})`,
    description: `Short live demonstration exam with a real server-side ${minutes}-minute countdown and full proctoring. Answer and press Submit yourself. +4 for a correct answer, -1 for a wrong one.`,
    durationMins: minutes,
    marks: 4,
    negative: 1,
    subjects: [
      {
        name: "Quick Round",
        questions: [
          q("Which data structure follows the LIFO principle?", ["Queue", "Stack", "Array", "Heap"], 1),
          q("What is 15% of 200?", ["20", "25", "30", "35"], 2),
          q("The time complexity of binary search is:", ["O(n)", "O(log n)", "O(n²)", "O(1)"], 1),
          q("Which of these is a prime number?", ["21", "27", "29", "33"], 2),
          q("Which HTTP status code means 'Not Found'?", ["200", "301", "404", "500"], 2),
          q("The SI unit of force is:", ["Joule", "Newton", "Watt", "Pascal"], 1),
        ],
      },
    ],
  }
}

export const STATIC_PACKS: ExamPack[] = [JEE_MAIN_MOCK, COLLEGE_ENTRANCE_MOCK, placementPack("Sample Company", "pack-placement-sample"), liveDemoPack("pack-live-demo", 1)]
