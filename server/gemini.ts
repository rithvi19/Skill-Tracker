import { GoogleGenAI, Type } from "@google/genai";
import { AIRecommendation, RoadmapStep, RoadmapAdvisory, Difficulty } from "../src/types";
import { searchYouTubeTutorials, buildFallbackYouTubeSearchUrl } from "./youtube";

let aiInstance: GoogleGenAI | null = null;

export function getGemini(): GoogleGenAI | null {
  if (!aiInstance) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.warn("GEMINI_API_KEY is not defined. Utilizing offline rule-based roadmap generator.");
      return null;
    }
    aiInstance = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiInstance;
}

interface RawStepData {
  stepNumber: number;
  title: string;
  detailedExplanation: string;
  topics: string[];
  prerequisites: string[];
  practicalExercises: string[];
  miniProjects: string[];
  estimatedTime: string;
  difficulty: Difficulty;
  learningOutcome: string;
}

// Curated high-caliber roadmaps for popular domains when offline
function getCuratedOfflineRoadmapRaw(skillName: string, category: string, difficultyStr: string): RawStepData[] {
  const norm = skillName.toLowerCase();

  if (norm.includes("python")) {
    return [
      {
        stepNumber: 1,
        title: "Python Fundamentals & Syntax",
        detailedExplanation: "Master the building blocks of Python including variables, data types, operators, and basic input/output operations. Understand how Python executes scripts and write clean, readable code following PEP 8.",
        topics: ["Variables & Primitive Types (int, float, str, bool)", "Arithmetic & Logical Operators", "Console Input and Formatted Output (f-strings)", "Type Conversion and Casting"],
        prerequisites: ["Basic computer literacy", "Python 3 and VS Code or PyCharm installed"],
        practicalExercises: [
          "Write a script that calculates compound interest with user inputs",
          "Create a temperature converter between Celsius, Fahrenheit, and Kelvin",
          "Build a BMI calculator with input validation"
        ],
        miniProjects: ["Interactive Command-Line Tip & Split Bill Calculator"],
        estimatedTime: "4 - 6 hours",
        difficulty: "Beginner",
        learningOutcome: "Able to write standalone Python scripts using basic data types, arithmetic expressions, and formatted terminal outputs."
      },
      {
        stepNumber: 2,
        title: "Control Flow & Iteration",
        detailedExplanation: "Learn conditional logic (if-elif-else) and repetition structures (for and while loops). Discover loop controls, range generators, and iteration over string sequences.",
        topics: ["Conditional Branching (if, elif, else)", "Comparison & Membership Operators (in, not in)", "For Loops with range() and enumerate()", "While Loops, break, continue, and else clauses"],
        prerequisites: ["Step 1: Python Fundamentals"],
        practicalExercises: [
          "Implement a number guessing game with randomized targets and attempt counters",
          "Generate multiplication tables and prime number verifiers up to N",
          "Process user text to count vowels, consonants, and character frequency"
        ],
        miniProjects: ["Text-Based Rock-Paper-Scissors with multi-round score tracking"],
        estimatedTime: "5 - 8 hours",
        difficulty: "Beginner",
        learningOutcome: "Confident handling of branching logic, loops, and control flow to automate repetitive computational tasks."
      },
      {
        stepNumber: 3,
        title: "Data Structures & Collections",
        detailedExplanation: "Deep dive into Python's native collections: Lists, Tuples, Sets, and Dictionaries. Understand mutability, indexing, slicing, comprehensions, and nested structures.",
        topics: ["Lists & Tuples: Indexing, Slicing, and Built-in Methods", "Dictionaries: Key-Value Pairs, get(), items(), and keys()", "Sets: Uniqueness, Union, Intersection, and Difference", "List and Dictionary Comprehensions"],
        prerequisites: ["Step 2: Control Flow & Iteration"],
        practicalExercises: [
          "Deduplicate a list while preserving element order",
          "Build a student grade management registry calculating averages and medians",
          "Invert a key-value dictionary and handle collision values gracefully"
        ],
        miniProjects: ["Terminal Contact Book with search, add, edit, and delete functionality"],
        estimatedTime: "6 - 10 hours",
        difficulty: "Intermediate",
        learningOutcome: "Fluent in selecting and manipulating the optimal Python data structures for memory efficiency and speed."
      },
      {
        stepNumber: 4,
        title: "Functions, Modularity & Scope",
        detailedExplanation: "Structure clean, modular software using functions, parameter defaults, *args, **kwargs, lambda expressions, and scope (LEGB rule). Organize code into reusable modules and packages.",
        topics: ["Function Signatures, Positional & Keyword Arguments", "Variable Arguments (*args, **kwargs)", "Scope Hierarchy (Local, Enclosing, Global, Built-in)", "Lambdas, map(), filter(), and zip()", "Importing Modules & Standard Library"],
        prerequisites: ["Step 3: Data Structures & Collections"],
        practicalExercises: [
          "Write a recursion function to solve the Fibonacci sequence and factorials",
          "Create a mathematical utility module with custom statistical functions",
          "Filter and transform user datasets using list comprehensions and lambda callbacks"
        ],
        miniProjects: ["Modular Command-Line Quiz Application with timed question banks"],
        estimatedTime: "6 - 8 hours",
        difficulty: "Intermediate",
        learningOutcome: "Equipped to write clean, reusable, testable modular functions following DRY (Don't Repeat Yourself) design."
      },
      {
        stepNumber: 5,
        title: "Object-Oriented Programming (OOP) & Error Handling",
        detailedExplanation: "Transition from procedural to object-oriented programming. Create classes, instantiate objects, use constructors, inheritance, polymorphism, and encapsulate state. Master robust exception handling with try-except-finally.",
        topics: ["Classes, Instances, and the __init__ Constructor", "Instance, Class, and Static Methods", "Inheritance, super(), and Method Overriding", "Encapsulation & Private Attributes", "Try, Except, Else, and Finally Exception Handling"],
        prerequisites: ["Step 4: Functions & Modularity"],
        practicalExercises: [
          "Design a BankAccount class with deposit, withdrawal, and overdraft protections",
          "Implement an Employee hierarchy (Manager, Developer, Intern) calculating bonuses",
          "Wrap file operations with robust FileNotFoundError and ValueError exception guards"
        ],
        miniProjects: ["Object-Oriented Library Management & Book Checkout System"],
        estimatedTime: "8 - 12 hours",
        difficulty: "Intermediate",
        learningOutcome: "Capable of modeling real-world business domains using robust OOP architectures and resilient error handling."
      },
      {
        stepNumber: 6,
        title: "File I/O, Serialization & Working with APIs",
        detailedExplanation: "Read and write persistent files on disk (text, CSV, JSON). Connect to external RESTful APIs using the requests library, parse JSON payloads, and handle asynchronous external services.",
        topics: ["Context Managers (with open(...) as f)", "Reading and Writing CSV files (csv module)", "JSON Parsing and Serialization (json module)", "HTTP Requests with the 'requests' library (GET, POST)", "API Authentication and Headers"],
        prerequisites: ["Step 5: OOP & Error Handling"],
        practicalExercises: [
          "Parse a CSV inventory report and output summary metrics to a new JSON file",
          "Fetch real-time weather information from an open REST API using latitude/longitude",
          "Build a script that caches API responses locally to prevent redundant network calls"
        ],
        miniProjects: ["Live Currency Converter CLI with real-time exchange rates and historical logs"],
        estimatedTime: "8 - 14 hours",
        difficulty: "Advanced",
        learningOutcome: "Can build production-ready data pipelines connecting local storage to remote cloud APIs and persistent databases."
      }
    ];
  }

  if (norm.includes("web") || norm.includes("react") || norm.includes("frontend") || norm.includes("javascript")) {
    return [
      {
        stepNumber: 1,
        title: "HTML5 Semantic Structure & Modern CSS3",
        detailedExplanation: "Build accessible, responsive web interfaces using modern semantic HTML tags, Flexbox, CSS Grid, custom properties (CSS variables), and media queries for multi-device support.",
        topics: ["Semantic HTML5 Elements (header, nav, main, article, section, footer)", "CSS Box Model, Margin, Padding & Border", "Flexbox: Alignments, Directions, and Justifications", "CSS Grid: Templates, Areas, and Responsive layouts", "Responsive Design & Mobile-First Media Queries"],
        prerequisites: ["Web browser and code editor (VS Code)"],
        practicalExercises: [
          "Build a responsive landing page layout using pure Flexbox and CSS Grid",
          "Create a multi-column pricing table that stacks neatly on mobile viewports",
          "Implement accessible navigation with keyboard focus indicators and ARIA tags"
        ],
        miniProjects: ["Responsive Personal Portfolio Page with theme switcher and contact form"],
        estimatedTime: "6 - 10 hours",
        difficulty: "Beginner",
        learningOutcome: "Solid ability to convert UI design mockups into pixel-perfect, accessible, and responsive HTML/CSS web pages."
      },
      {
        stepNumber: 2,
        title: "Modern JavaScript (ES6+) Core & DOM Manipulation",
        detailedExplanation: "Master modern ECMAScript features: let/const, arrow functions, template literals, destructuring, spread/rest operators, modules, and dynamic manipulation of the Document Object Model (DOM).",
        topics: ["ES6 Variables & Scoping (let, const)", "Arrow Functions & Lexical 'this'", "Array Methods: map, filter, reduce, find, some", "DOM Selection, Event Listeners, and Dynamic Node Rendering", "Event Bubbling, Delegation, and Form Handling"],
        prerequisites: ["Step 1: HTML5 & CSS3"],
        practicalExercises: [
          "Build an interactive To-Do List with add, toggle, delete, and filter controls",
          "Create a dynamic modal popup that closes on escape key and outside clicks",
          "Implement a client-side search bar that filters displayed card elements in real-time"
        ],
        miniProjects: ["Interactive Kanban Task Board with drag-and-drop or column reordering"],
        estimatedTime: "8 - 12 hours",
        difficulty: "Beginner",
        learningOutcome: "Proficient in writing modern JavaScript to manipulate DOM elements, handle user interactions, and manage UI state."
      },
      {
        stepNumber: 3,
        title: "Asynchronous JavaScript, Promises & Fetch API",
        detailedExplanation: "Understand the JavaScript Event Loop, asynchronous execution, Callback queues, Promises, and async/await syntax. Query third-party REST APIs and handle HTTP status codes gracefully.",
        topics: ["The JavaScript Event Loop & Call Stack", "Promises: resolve, reject, then, catch, and finally", "Async/Await Syntax & Try/Catch Error Handling", "Fetch API with Headers, GET, and POST methods", "Loading States, Error Skeletons, and Debouncing Input"],
        prerequisites: ["Step 2: Modern JavaScript Core"],
        practicalExercises: [
          "Fetch and display a list of GitHub repositories with search debouncing",
          "Build a paginated card grid fetching data from a mock REST API",
          "Handle network failure states with friendly retry prompts"
        ],
        miniProjects: ["Real-Time Weather & Forecast Dashboard with geolocation lookup"],
        estimatedTime: "8 - 12 hours",
        difficulty: "Intermediate",
        learningOutcome: "Mastery over asynchronous programming, consuming remote web APIs, and building resilient network-connected interfaces."
      },
      {
        stepNumber: 4,
        title: "React Fundamentals: Components, Props & State",
        detailedExplanation: "Learn React's component-based mental model. Write declarative UI with JSX, pass data via props, manage local state with useState, and handle component side-effects with useEffect.",
        topics: ["JSX Syntax and Virtual DOM concepts", "Functional Components & Component Composition", "Props & Children Pattern", "useState Hook: Managing Interactive State", "useEffect Hook: Data Fetching and Cleanup Functions"],
        prerequisites: ["Step 3: Asynchronous JavaScript & Fetch API"],
        practicalExercises: [
          "Build a dynamic counter and rating widget with custom step controls",
          "Create an accordion FAQ list where only one item expands at a time",
          "Fetch API records inside useEffect with loading spinners and error states"
        ],
        miniProjects: ["Interactive Movie Search & Bookmark App with local storage persistence"],
        estimatedTime: "10 - 15 hours",
        difficulty: "Intermediate",
        learningOutcome: "Capable of architecting modular React applications using functional components, props, hooks, and clean lifecycle management."
      },
      {
        stepNumber: 5,
        title: "Advanced React & Global State Management",
        detailedExplanation: "Scale React applications using custom hooks, the Context API, useReducer for complex state machines, performance optimizations (useMemo, useCallback), and client-side routing.",
        topics: ["Context API & useContext for Global Theme and User Auth", "useReducer for Complex Multi-Action State Logic", "Custom Hook Development for Reusable Logic", "React Router: Client-Side Routing and Dynamic URL Parameters", "Performance Optimizations: React.memo, useMemo, and useCallback"],
        prerequisites: ["Step 4: React Fundamentals"],
        practicalExercises: [
          "Implement a global Theme Context supporting Dark/Light switching across the app",
          "Write a custom useDebounce hook and apply it to a live query input",
          "Build a shopping cart state reducer managing items, quantities, and discounts"
        ],
        miniProjects: ["Mini E-Commerce Storefront with routing, cart drawer, and checkout summary"],
        estimatedTime: "10 - 16 hours",
        difficulty: "Advanced",
        learningOutcome: "Able to build large-scale, performant React applications with sophisticated global state, custom hooks, and dynamic multi-page routing."
      },
      {
        stepNumber: 6,
        title: "Full-Stack Integration, Node/Express Backend & Deployment",
        detailedExplanation: "Connect your React frontend to an Express REST API backend. Implement secure authentication, environment variables, database storage, and deploy to modern cloud platforms like Render or Vercel.",
        topics: ["Node.js & Express Server Architecture", "Building RESTful API Endpoints with CRUD Operations", "JWT Bearer Token Authentication & Protected Routes", "CORS Configuration & Environment Variables (.env)", "Production Build Tooling (Vite build) and Cloud Deployment"],
        prerequisites: ["Step 5: Advanced React & State Management"],
        practicalExercises: [
          "Build an Express API with routes for skills, notes, and user verification",
          "Connect the frontend fetch requests with Authorization Bearer token headers",
          "Write an environment configuration loader preventing credential leaks"
        ],
        miniProjects: ["Full-Stack Skill Tracker & Notes Application with authentication and cloud database"],
        estimatedTime: "12 - 20 hours",
        difficulty: "Advanced",
        learningOutcome: "Autonomous full-stack web developer capable of designing, building, securing, and deploying complete web applications end-to-end."
      }
    ];
  }

  if (norm.includes("java")) {
    return [
      {
        stepNumber: 1,
        title: "Java Syntax, JVM & Core Foundations",
        detailedExplanation: "Understand the Java Virtual Machine (JVM), JDK vs JRE, compiled bytecode, primitive types, operators, and console I/O using the Scanner class.",
        topics: ["JVM, Bytecode, and JDK setup", "Primitive Data Types and Variables", "Arithmetic and Logical Operators", "Console Input with Scanner and formatted printf", "Compilation and Execution Lifecycle"],
        prerequisites: ["JDK 21+ and IntelliJ IDEA installed"],
        practicalExercises: [
          "Write a program calculating geometry formulas with validated user inputs",
          "Build a currency denomination breakdown utility",
          "Convert temperature values with precision formatting"
        ],
        miniProjects: ["Command-Line Utility Calculator with operation history"],
        estimatedTime: "5 - 8 hours",
        difficulty: "Beginner",
        learningOutcome: "Able to write, compile, and execute standard Java applications with clean class and method structures."
      },
      {
        stepNumber: 2,
        title: "Control Statements, Methods & Arrays",
        detailedExplanation: "Implement if-else conditionals, switch expressions (including modern enhanced switch), loops (for, while, do-while), method definitions, overloading, and 1D/2D arrays.",
        topics: ["If-Else Branching & Enhanced Switch Expressions", "For Loops, Enhanced For-Each, and While Loops", "Method Signatures, Parameters, Return Types, and Overloading", "Array Declaration, Iteration, and Manipulation"],
        prerequisites: ["Step 1: Java Syntax Foundations"],
        practicalExercises: [
          "Find maximum, minimum, and average in an array of integers",
          "Implement matrix addition and transposition using 2D arrays",
          "Create overloaded methods to calculate area for different shapes"
        ],
        miniProjects: ["Grade Book Processing Application with statistical metrics"],
        estimatedTime: "6 - 10 hours",
        difficulty: "Beginner",
        learningOutcome: "Mastery of structured procedural Java logic, iterative processing, and method modularity."
      },
      {
        stepNumber: 3,
        title: "Object-Oriented Programming (OOP) in Java",
        detailedExplanation: "Learn core OOP pillars in Java: Encapsulation, Inheritance, Polymorphism, and Abstraction. Use constructors, access modifiers, abstract classes, interfaces, and packages.",
        topics: ["Classes, Objects, and Constructors (this keyword)", "Encapsulation, Getters, and Setters", "Inheritance with extends and super keyword", "Polymorphism: Method Overriding and Dynamic Binding", "Abstract Classes vs Interfaces"],
        prerequisites: ["Step 2: Control Statements & Arrays"],
        practicalExercises: [
          "Model a BankAccount system with CheckingAccount and SavingsAccount subclasses",
          "Implement a PaymentGateway interface with CreditCard and PayPal implementations",
          "Design an inventory management hierarchy with custom business logic"
        ],
        miniProjects: ["Vehicle Rental Management System with polymorphic fee calculations"],
        estimatedTime: "10 - 15 hours",
        difficulty: "Intermediate",
        learningOutcome: "Fluent in designing modular, extensible Java class hierarchies adhering to SOLID design principles."
      },
      {
        stepNumber: 4,
        title: "Java Collections Framework & Generics",
        detailedExplanation: "Master Java's Collections framework: List (ArrayList, LinkedList), Set (HashSet, TreeSet), and Map (HashMap, TreeMap). Understand Generics, Comparable/Comparator, and Iterator patterns.",
        topics: ["ArrayList & LinkedList: Performance and Use-cases", "HashSet vs TreeSet: Hashing and Ordering", "HashMap & LinkedHashMap: Key-Value storage and collision handling", "Generics: Type Parameters and Wildcards", "Sorting with Comparable and Comparator"],
        prerequisites: ["Step 3: OOP in Java"],
        practicalExercises: [
          "Remove duplicates from a list while keeping natural sort order using TreeSet",
          "Build a frequency map counting word occurrences in a text corpus",
          "Sort employee records by multiple criteria (salary, then age) using Comparator"
        ],
        miniProjects: ["Customer Support Ticket Queue and Triage System"],
        estimatedTime: "8 - 14 hours",
        difficulty: "Intermediate",
        learningOutcome: "High confidence choosing the optimal collection type for speed, order, and concurrency requirements."
      },
      {
        stepNumber: 5,
        title: "Exception Handling, File I/O & Streams API",
        detailedExplanation: "Handle runtime and checked exceptions with try-catch-finally and try-with-resources. Perform modern file I/O with Java NIO, and process collections declaratively with the Java Streams API and Lambdas.",
        topics: ["Checked vs Unchecked Exceptions & Custom Exceptions", "Try-With-Resources and AutoCloseable", "Java NIO.2 (Files and Path classes)", "Functional Interfaces and Lambda Expressions", "Streams API: filter, map, collect, reduce, and groupingBy"],
        prerequisites: ["Step 4: Collections Framework"],
        practicalExercises: [
          "Parse a CSV file and convert rows into Java objects using try-with-resources",
          "Group a list of transactions by city and calculate totals using Streams groupingBy",
          "Create a custom InsufficientFundsException and enforce transaction boundaries"
        ],
        miniProjects: ["CSV Data Analysis & Reporting Tool using parallel Streams"],
        estimatedTime: "10 - 16 hours",
        difficulty: "Advanced",
        learningOutcome: "Skilled in modern functional Java, declarative stream pipelines, and bulletproof resource management."
      },
      {
        stepNumber: 6,
        title: "Spring Boot & RESTful Microservices",
        detailedExplanation: "Build enterprise-grade web backends with Spring Boot. Understand Dependency Injection, Inversion of Control (IoC), Spring Data JPA, Hibernate ORM, and build secure REST APIs.",
        topics: ["Spring Boot Architecture & Starter Dependencies", "Inversion of Control (IoC) & @Autowired Dependency Injection", "Building REST Controllers (@GetMapping, @PostMapping, @RequestBody)", "Spring Data JPA & Hibernate Entities", "Database Migrations and Application Deployment"],
        prerequisites: ["Step 5: Exceptions, File I/O & Streams API"],
        practicalExercises: [
          "Create a Spring Boot REST API for managing product catalogs",
          "Connect Spring Data JPA to an H2 or PostgreSQL database",
          "Implement request validation using Spring Validation annotations"
        ],
        miniProjects: ["Full-featured Spring Boot E-Commerce REST API with JPA persistence"],
        estimatedTime: "14 - 24 hours",
        difficulty: "Advanced",
        learningOutcome: "Production-ready Java backend engineer capable of architecting and deploying Spring Boot microservices."
      }
    ];
  }

  if (norm.includes("data structure") || norm.includes("algorithm") || norm.includes("dsa")) {
    return [
      {
        stepNumber: 1,
        title: "Time & Space Complexity Analysis (Big-O Notation)",
        detailedExplanation: "Master the mathematical foundation of algorithmic efficiency. Analyze worst-case, average-case, and best-case time complexity, space complexity, and auxiliary space using asymptotic Big-O notation.",
        topics: ["Big-O, Big-Omega, and Big-Theta Notations", "Constant O(1), Logarithmic O(log n), Linear O(n), and Quadratic O(n^2)", "Space Complexity vs Time Complexity Trade-offs", "Analyzing Nested Loops and Recursive Call Stacks"],
        prerequisites: ["Basic programming syntax in any language (Python, Java, C++, JS)"],
        practicalExercises: [
          "Determine the Big-O time and space of various iterative functions",
          "Compare linear search vs binary search execution steps on sorted arrays",
          "Optimize an O(n^2) duplicate element search down to O(n) using hash sets"
        ],
        miniProjects: ["Benchmarking Suite measuring actual CPU runtimes across input sizes N=10 to 1,000,000"],
        estimatedTime: "4 - 6 hours",
        difficulty: "Beginner",
        learningOutcome: "Able to intuitively inspect any code block and derive its exact computational and memory footprints."
      },
      {
        stepNumber: 2,
        title: "Arrays, Two Pointers & Sliding Window",
        detailedExplanation: "Harness the power of contiguous memory. Master Two-Pointer approaches, Fast & Slow pointers, and Sliding Window techniques to solve array problems in linear time.",
        topics: ["Array Memory Allocation and Contiguous Indexing", "Two-Pointers (Opposite Direction & Same Direction)", "Fixed-Size and Dynamic-Size Sliding Window", "Prefix Sum Arrays for Constant Time Range Queries"],
        prerequisites: ["Step 1: Complexity Analysis"],
        practicalExercises: [
          "Solve Two Sum on a sorted array using two pointers in O(n)",
          "Find the maximum sum subarray of size K using fixed sliding window",
          "Compute longest substring without repeating characters using dynamic sliding window"
        ],
        miniProjects: ["Real-time Stock Trading Max Profit Analyzer using Single-Pass Sliding Window"],
        estimatedTime: "6 - 10 hours",
        difficulty: "Beginner",
        learningOutcome: "Capable of converting brute-force quadratic array solutions into elegant linear single-pass algorithms."
      },
      {
        stepNumber: 3,
        title: "Linked Lists, Stacks & Queues",
        detailedExplanation: "Understand node-based data structures. Implement Singly and Doubly Linked Lists, reverse lists in-place, and utilize LIFO Stacks and FIFO Queues to solve parsing and buffering challenges.",
        topics: ["Singly vs Doubly Linked Lists & Pointer Manipulations", "Fast & Slow Pointers (Floyd's Cycle Detection)", "Stack Data Structure (LIFO) & Monotonic Stacks", "Queue & Deque Data Structures (FIFO)", "Parentheses Validation & Infix/Postfix Evaluation"],
        prerequisites: ["Step 2: Arrays & Two Pointers"],
        practicalExercises: [
          "Reverse a Singly Linked List in-place with O(1) extra space",
          "Detect cycles in a Linked List and return the cycle start node",
          "Implement a Valid Parentheses parser verifying matching bracket closures"
        ],
        miniProjects: ["Browser History Navigation Engine with Forward/Back stacks"],
        estimatedTime: "8 - 12 hours",
        difficulty: "Intermediate",
        learningOutcome: "Mastery of pointer manipulation and linear data structure mechanics for memory-efficient dynamic data handling."
      },
      {
        stepNumber: 4,
        title: "Hash Tables, Recursion & Binary Search",
        detailedExplanation: "Explore direct-address tables, hash functions, collision resolution (Chaining vs Open Addressing). Master divide-and-conquer recursion and the binary search paradigm on sorted spaces and answers.",
        topics: ["Hash Tables, Hash Functions, and O(1) Amortized Lookups", "Recursion Mechanics, Base Cases, and Stack Overflow", "Binary Search Template on Sorted Arrays", "Binary Search on Answer Space (Optimization problems)"],
        prerequisites: ["Step 3: Linked Lists, Stacks & Queues"],
        practicalExercises: [
          "Implement Group Anagrams using hash maps in linear time",
          "Find the first and last position of an element in a sorted array via Binary Search",
          "Solve the 'Search in Rotated Sorted Array' problem in O(log n)"
        ],
        miniProjects: ["Autocorrect Word Finder using Hashing and Binary Search"],
        estimatedTime: "8 - 14 hours",
        difficulty: "Intermediate",
        learningOutcome: "Fluent in applying O(1) hash maps and logarithmic binary search strategies to rapidly slash computational search spaces."
      },
      {
        stepNumber: 5,
        title: "Trees, Binary Search Trees (BST) & Heaps",
        detailedExplanation: "Dive into hierarchical structures. Understand Binary Trees, In-order/Pre-order/Post-order traversals, Breadth-First Search (Level-order), BST properties, and Binary Min/Max Heaps.",
        topics: ["Binary Tree Terminology & Traversal Algorithms (DFS vs BFS)", "Binary Search Trees (BST): Insertion, Search, and In-order property", "Tree Validation and Lowest Common Ancestor (LCA)", "Binary Heaps & Priority Queues (Heapify, Insertion, Extract-Min)"],
        prerequisites: ["Step 4: Recursion & Binary Search"],
        practicalExercises: [
          "Compute maximum depth and diameter of a Binary Tree",
          "Validate whether a Binary Tree meets the strict BST invariants",
          "Find the Kth largest element in an unsorted array using a Min-Heap in O(n log k)"
        ],
        miniProjects: ["Priority Task Scheduler Engine powered by Min-Heap queues"],
        estimatedTime: "10 - 16 hours",
        difficulty: "Advanced",
        learningOutcome: "Mastery of hierarchical tree representations, priority queues, and complex recursive tree transformations."
      },
      {
        stepNumber: 6,
        title: "Graphs & Dynamic Programming (DP) Foundations",
        detailedExplanation: "Model connected networks using Graphs (Adjacency Lists, DFS, BFS, Dijkstra's). Conquer Dynamic Programming by identifying overlapping subproblems and optimal substructure through Memoization and Tabulation.",
        topics: ["Graph Representations (Adjacency Matrix vs Adjacency List)", "Graph Traversals: Depth-First Search (DFS) & Breadth-First Search (BFS)", "Cycle Detection in Directed and Undirected Graphs", "Dynamic Programming: 1D DP (Fibonacci, Climbing Stairs, House Robber)", "Dynamic Programming: 2D DP (Longest Common Subsequence, 0/1 Knapsack)"],
        prerequisites: ["Step 5: Trees & Heaps"],
        practicalExercises: [
          "Count Connected Components in an undirected network using BFS",
          "Find the shortest path in an unweighted grid with obstacles using BFS",
          "Solve the Coin Change problem using bottom-up tabular DP"
        ],
        miniProjects: ["Maze Navigation & Shortest Path Finder Visualizer"],
        estimatedTime: "12 - 20 hours",
        difficulty: "Advanced",
        learningOutcome: "Equipped to tackle the most demanding algorithmic challenges, graph networks, and multi-stage optimization problems."
      }
    ];
  }

  // Generic dynamic fallback for any other skill (e.g. UI/UX, Cloud, Docker, Machine Learning, etc.)
  return [
    {
      stepNumber: 1,
      title: `${skillName} Core Foundations & Tooling`,
      detailedExplanation: `Establish fundamental concepts and environment setup for ${skillName}. Understand standard terminology, core principles, industry conventions, and configure your daily practice workspace.`,
      topics: ["Core Concepts & Definitions", "Tooling Setup & Workspace Configuration", "Basic Syntax & Operational Rules", "Industry Standards & Best Practices"],
      prerequisites: ["Basic familiarity with general computing principles"],
      practicalExercises: [
        `Complete a self-contained hello-world starter exercise for ${skillName}`,
        `Document key terminology and concepts in a personal cheat-sheet`,
        `Set up a version-controlled repository to store all code and notes`
      ],
      miniProjects: [`Basic Hands-On Starter Prototype demonstrating core concepts of ${skillName}`],
      estimatedTime: "4 - 8 hours",
      difficulty: "Beginner",
      learningOutcome: `Comfortable navigating the ecosystem and executing basic exercises in ${skillName}.`
    },
    {
      stepNumber: 2,
      title: `${skillName} Practical Execution & Intermediate Workflows`,
      detailedExplanation: `Move beyond the basics to implement standard patterns, common workflows, and intermediate techniques required for real-world projects in ${skillName}.`,
      topics: ["Standard Design Patterns", "State & Data Handling", "Error Prevention & Debugging", "Modular Workflow Construction"],
      prerequisites: ["Step 1: Core Foundations"],
      practicalExercises: [
        `Build a multi-component feature utilizing intermediate techniques`,
        `Debug and refactor an intentional edge-case error`,
        `Implement structured validation and clean error handling`
      ],
      miniProjects: [`Functional Mini-Application or Complete Workflow Prototype in ${skillName}`],
      estimatedTime: "6 - 12 hours",
      difficulty: "Intermediate",
      learningOutcome: `Able to build functional, modular workflows and solve standard intermediate challenges in ${skillName}.`
    },
    {
      stepNumber: 3,
      title: `Advanced Architecture, Optimization & Real-World Integration`,
      detailedExplanation: `Master advanced techniques, performance optimization, security, edge-case mitigation, and production-grade integration in ${skillName}.`,
      topics: ["Advanced Architectures & Custom Extensions", "Performance Benchmarking & Profiling", "Security, Privacy & Resiliency", "Production Deployment & Lifecycle Management"],
      prerequisites: ["Step 2: Practical Execution"],
      practicalExercises: [
        `Perform benchmark analysis and optimize execution latency by 30%+`,
        `Write automated integration tests covering mission-critical paths`,
        `Deploy the project to a live hosting environment with continuous integration`
      ],
      miniProjects: [`Production-Grade Capstone Project showcasing mastery of ${skillName}`],
      estimatedTime: "10 - 20 hours",
      difficulty: "Advanced",
      learningOutcome: `Autonomous mastery over ${skillName}, capable of designing and delivering production-ready implementations.`
    }
  ];
}

// Generates an AI advisory analyzing user progress and recommending next steps
export function computeRoadmapAdvisory(
  steps: RoadmapStep[],
  skillName: string
): RoadmapAdvisory {
  const completedSteps = steps.filter(s => s.completed);
  const total = steps.length;
  const nextIncomplete = steps.find(s => !s.completed);

  if (completedSteps.length === total && total > 0) {
    return {
      recommendationText: `Incredible achievement! You have completed all ${total} learning steps for "${skillName}". Consider building a comprehensive capstone project or sharing your knowledge with the developer community.`,
      identifiedGaps: ["No major knowledge gaps identified. Review advanced topics periodically."],
      practiceSuggestions: [
        "Contribute to open-source repositories utilizing this skill.",
        "Build a showcase portfolio project to demonstrate end-to-end expertise.",
        "Conduct mock technical interviews or write technical blog tutorials."
      ]
    };
  }

  if (completedSteps.length === 0) {
    const firstStep = steps[0];
    return {
      nextStepNumber: 1,
      nextStepTitle: firstStep?.title || "Foundations",
      recommendationText: `Welcome to your learning journey for "${skillName}". Start by tackling Step 1: "${firstStep?.title || 'Foundations'}". Focus on mastering the basic syntax and core principles before moving forward.`,
      identifiedGaps: ["Initial foundational concepts pending completion."],
      practiceSuggestions: [
        "Dedicate 45 minutes of daily uninterrupted focus time.",
        "Watch the recommended tutorial videos for Step 1.",
        "Complete the hands-on practical exercises to build muscle memory."
      ]
    };
  }

  const nextStep = nextIncomplete || steps[0];
  const lastCompleted = completedSteps[completedSteps.length - 1];

  return {
    nextStepNumber: nextStep.stepNumber,
    nextStepTitle: nextStep.title,
    recommendationText: `Great progress! You have completed ${completedSteps.length} of ${total} steps (${Math.round((completedSteps.length / total) * 100)}%). Your next focus should be Step ${nextStep.stepNumber}: "${nextStep.title}".`,
    identifiedGaps: nextStep.prerequisites && nextStep.prerequisites.length > 0
      ? [`Prerequisites to keep in mind: ${nextStep.prerequisites.join(", ")}`]
      : ["Ensure previous exercise code remains clean and organized."],
    practiceSuggestions: [
      `Review key topics in Step ${nextStep.stepNumber}: ${nextStep.topics.slice(0, 3).join(", ")}.`,
      "Watch the attached YouTube video guides before attempting practical exercises.",
      `Complete the mini-project: "${nextStep.miniProjects[0] || 'Step project'}" for hands-on practice.`
    ]
  };
}

/**
 * Main generator: orchestrates AI roadmap compilation with Gemini (or curated offline fallback)
 * and enriches every step with targeted YouTube video recommendations.
 */
export async function generateLearningRoadmapWithVideos(
  skillName: string,
  category: string,
  difficultyStr: string = "Intermediate",
  existingCompletedStepNumbers: number[] = []
): Promise<Omit<AIRecommendation, 'id' | 'skillId' | 'createdAt'>> {
  const ai = getGemini();
  let rawSteps: RawStepData[] = [];

  if (ai) {
    try {
      const prompt = `You are a world-class senior technical educator and curriculum architect. Generate a comprehensive, progressive learning roadmap for mastering the skill "${skillName}" (Category: "${category}", Target Level: "${difficultyStr}").
Provide between 4 to 6 logical sequential learning steps, ordered strictly from foundational to advanced.
Each step must contain:
1. stepNumber (number 1 to N)
2. title (concise, professional step title)
3. detailedExplanation (2-3 sentences explaining core concepts and importance)
4. topics (array of 3-5 specific topics to learn)
5. prerequisites (array of prerequisites or previous steps)
6. practicalExercises (array of 2-3 specific hands-on coding/practical exercises)
7. miniProjects (array of 1 specific mini-project)
8. estimatedTime (e.g. "4 - 6 hours")
9. difficulty ("Beginner" | "Intermediate" | "Advanced")
10. learningOutcome (concise statement of what student can do after this step)

Return clean JSON matching the requested schema without markdown code blocks.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          systemInstruction: "You are an elite curriculum architect designing real-world learning paths. Return pure JSON only.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              steps: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    stepNumber: { type: Type.INTEGER },
                    title: { type: Type.STRING },
                    detailedExplanation: { type: Type.STRING },
                    topics: { type: Type.ARRAY, items: { type: Type.STRING } },
                    prerequisites: { type: Type.ARRAY, items: { type: Type.STRING } },
                    practicalExercises: { type: Type.ARRAY, items: { type: Type.STRING } },
                    miniProjects: { type: Type.ARRAY, items: { type: Type.STRING } },
                    estimatedTime: { type: Type.STRING },
                    difficulty: { type: Type.STRING },
                    learningOutcome: { type: Type.STRING }
                  },
                  required: ["stepNumber", "title", "detailedExplanation", "topics", "practicalExercises", "miniProjects", "estimatedTime", "difficulty", "learningOutcome"]
                }
              }
            },
            required: ["steps"]
          }
        }
      });

      const text = response.text?.trim();
      if (text) {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed.steps) && parsed.steps.length > 0) {
          rawSteps = parsed.steps.map((s: any, idx: number) => ({
            stepNumber: s.stepNumber || idx + 1,
            title: s.title || `Step ${idx + 1}`,
            detailedExplanation: s.detailedExplanation || `Learn core principles of ${s.title || skillName}.`,
            topics: Array.isArray(s.topics) ? s.topics : [],
            prerequisites: Array.isArray(s.prerequisites) ? s.prerequisites : [],
            practicalExercises: Array.isArray(s.practicalExercises) ? s.practicalExercises : [],
            miniProjects: Array.isArray(s.miniProjects) ? s.miniProjects : [],
            estimatedTime: s.estimatedTime || "4 - 6 hours",
            difficulty: (["Beginner", "Intermediate", "Advanced"].includes(s.difficulty) ? s.difficulty : "Intermediate") as Difficulty,
            learningOutcome: s.learningOutcome || "Practical command over relevant techniques."
          }));
        }
      }
    } catch (err) {
      console.warn("[Gemini API] Could not generate dynamic roadmap via Gemini. Utilizing curated roadmap:", err);
    }
  }

  // Fallback to rich curated roadmap if AI is offline or failed
  if (rawSteps.length === 0) {
    rawSteps = getCuratedOfflineRoadmapRaw(skillName, category, difficultyStr);
  }

  // Enrich each step with YouTube tutorial videos asynchronously
  const enrichedSteps: RoadmapStep[] = await Promise.all(
    rawSteps.map(async (rawStep) => {
      const isAlreadyCompleted = existingCompletedStepNumbers.includes(rawStep.stepNumber);
      const ytResult = await searchYouTubeTutorials(
        skillName,
        rawStep.title,
        rawStep.topics,
        3
      );

      return {
        ...rawStep,
        completed: isAlreadyCompleted,
        completedAt: isAlreadyCompleted ? new Date().toISOString() : undefined,
        started: isAlreadyCompleted || rawStep.stepNumber === 1,
        completedExercises: [],
        videos: ytResult.videos,
        fallbackSearchUrl: ytResult.fallbackSearchUrl
      };
    })
  );

  // Generate personalized advisory
  const advisory = computeRoadmapAdvisory(enrichedSteps, skillName);

  // Legacy string steps for backward compatibility with older UI views
  const simpleStepStrings = enrichedSteps.map(s => `${s.stepNumber}. ${s.title} - ${s.detailedExplanation.slice(0, 90)}...`);

  return {
    steps: simpleStepStrings,
    roadmapSteps: enrichedSteps,
    advisory,
    topics: enrichedSteps.flatMap(s => s.topics),
    projects: enrichedSteps.flatMap(s => s.miniProjects),
    exercises: enrichedSteps.flatMap(s => s.practicalExercises),
    roadmap: simpleStepStrings,
    interviewPrep: [],
    advanced: []
  };
}

// Preserve existing function name for backward compatibility
export async function generateRecommendations(
  skillName: string,
  category: string,
  difficultyStr: string = "Intermediate"
): Promise<Omit<AIRecommendation, 'id' | 'skillId' | 'createdAt'>> {
  return await generateLearningRoadmapWithVideos(skillName, category, difficultyStr);
}
