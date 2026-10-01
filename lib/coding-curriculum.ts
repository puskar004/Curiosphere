import type { LanguageId, TrackId } from "./coding-types";

export type CodingMCQ = {
  id: string;
  question: string;
  codeSnippet?: string;
  options: [string, string, string, string];
  correctIndex: number;
  explanation: string;
};

export type CodingChapter = {
  id: string;
  chapterNumber: number;
  unitNumber: number;
  title: string;
  description: string;
  topics: string[];
  codingProblemIds: string[];
};

export type CodingUnit = {
  unitNumber: number;
  title: string;
  description: string;
  chapters: CodingChapter[];
  mcqs: CodingMCQ[];
};

export type TrackCurriculum = {
  track: "python" | "c" | "cpp" | "dsa";
  title: string;
  tagline: string;
  icon: string;
  language: LanguageId;
  totalChapters: number;
  units: CodingUnit[];
};

export const CODING_CURRICULUM: Record<"python" | "c" | "cpp" | "dsa", TrackCurriculum> = {
  // ==========================================
  // 1. PYTHON TRACK
  // ==========================================
  python: {
    track: "python",
    title: "Python Programming & Computer Science",
    tagline: "Comprehensive CBSE Class 11–12 & Core Python Fundamentals to Advanced Applications",
    icon: "🐍",
    language: "python",
    totalChapters: 9,
    units: [
      {
        unitNumber: 1,
        title: "Unit 1: Python Fundamentals & Control Structures",
        description: "Variables, primitive data types, input/output, conditional logic, and looping constructs.",
        chapters: [
          {
            id: "py-ch1",
            chapterNumber: 1,
            unitNumber: 1,
            title: "Variables, Data Types & Standard I/O",
            description: "Understand Python memory model, dynamically typed variables, operators, and sys.stdin / print.",
            topics: ["Variables & Identifiers", "int, float, bool, str", "Arithmetic & Logical Operators", "Type Casting", "input() & sys.stdin"],
            codingProblemIds: ["py-palindrome"],
          },
          {
            id: "py-ch2",
            chapterNumber: 2,
            unitNumber: 1,
            title: "Conditional Branching (if, elif, else)",
            description: "Decision making statements, nested conditionals, ternary operators, and logical evaluation.",
            topics: ["if-else structure", "elif chains", "Nested conditions", "Short-circuit evaluation", "Truthiness in Python"],
            codingProblemIds: ["py-palindrome"],
          },
          {
            id: "py-ch3",
            chapterNumber: 3,
            unitNumber: 1,
            title: "Loops & Iterations (for, while, range)",
            description: "Definite and indefinite loops, loop control statements (break, continue, pass), and range generation.",
            topics: ["for loop with range()", "while loops", "break and continue", "Loop with else clause", "Nested loops"],
            codingProblemIds: ["py-second-largest"],
          },
        ],
        mcqs: [
          {
            id: "py-u1-q1",
            question: "What is the output of the following Python expression?",
            codeSnippet: "x = 7 // 2 + 7 % 2\nprint(x)",
            options: ["4", "4.5", "3.5", "5"],
            correctIndex: 0,
            explanation: "7 // 2 is integer floor division equal to 3. 7 % 2 is remainder 1. 3 + 1 = 4.",
          },
          {
            id: "py-u1-q2",
            question: "Which of the following data types in Python is IMMUTABLE?",
            options: ["List", "Dictionary", "Tuple", "Set"],
            correctIndex: 2,
            explanation: "Tuples, numbers, and strings are immutable in Python; lists, dictionaries, and sets are mutable.",
          },
          {
            id: "py-u1-q3",
            question: "What will the loop print?",
            codeSnippet: "for i in range(1, 6, 2):\n    print(i, end=' ')",
            options: ["1 2 3 4 5", "1 3 5", "1 3", "2 4 6"],
            correctIndex: 1,
            explanation: "range(start=1, stop=6, step=2) generates values 1, 3, 5.",
          },
          {
            id: "py-u1-q4",
            question: "What does the expression bool('False') evaluate to in Python?",
            options: ["False", "True", "None", "Error"],
            correctIndex: 1,
            explanation: "Any non-empty string in Python evaluates to True in boolean context, regardless of content.",
          },
        ],
      },
      {
        unitNumber: 2,
        title: "Unit 2: Core Data Structures (Strings, Lists, Tuples, Dicts)",
        description: "In-depth indexing, slicing, sequence operations, dictionary key-value mappings, and hashing.",
        chapters: [
          {
            id: "py-ch4",
            chapterNumber: 4,
            unitNumber: 2,
            title: "Strings & String Manipulation",
            description: "String slicing [start:stop:step], built-in methods (split, join, strip, replace), and formatting.",
            topics: ["Indexing & Slicing", "strip(), split(), join()", "find(), count(), replace()", "f-strings & format", "Palindrome & Pattern matching"],
            codingProblemIds: ["py-palindrome"],
          },
          {
            id: "py-ch5",
            chapterNumber: 5,
            unitNumber: 2,
            title: "Lists, Tuples & List Comprehensions",
            description: "Dynamic arrays in Python, list mutations, sorting, slicing, packing/unpacking, and list comprehensions.",
            topics: ["append(), extend(), pop()", "List slicing and shallow copies", "List Comprehension syntax", "Tuples vs Lists", "Tuple unpacking"],
            codingProblemIds: ["py-second-largest"],
          },
          {
            id: "py-ch6",
            chapterNumber: 6,
            unitNumber: 2,
            title: "Dictionaries & Sets",
            description: "Hash-based collections, O(1) average lookup, key-value iteration, and set algebra (union, intersection).",
            topics: ["Hash Maps in Python", "dict.get(), keys(), values(), items()", "Dictionary Comprehensions", "Set operations", "Frequency counting"],
            codingProblemIds: ["py-word-frequency"],
          },
        ],
        mcqs: [
          {
            id: "py-u2-q1",
            question: "What will be the output of this list comprehension?",
            codeSnippet: "nums = [x * 2 for x in range(4) if x % 2 == 0]\nprint(nums)",
            options: ["[0, 4]", "[0, 2, 4]", "[2, 6]", "[0, 1, 2, 3]"],
            correctIndex: 0,
            explanation: "range(4) is [0, 1, 2, 3]. Elements satisfying x % 2 == 0 are 0 and 2. Multiplied by 2: [0, 4].",
          },
          {
            id: "py-u2-q2",
            question: "What is the time complexity of searching a key in a Python dictionary on average?",
            options: ["O(N)", "O(log N)", "O(1)", "O(N log N)"],
            correctIndex: 2,
            explanation: "Python dictionaries use hash tables under the hood, yielding O(1) average time complexity for lookups.",
          },
          {
            id: "py-u2-q3",
            question: "What will be the result of s[::-1] for s = 'OpenAI'?",
            options: ["'OpenAI'", "'IAnepO'", "'IAnePO'", "'IAneoP'"],
            correctIndex: 1,
            explanation: "[::-1] reverses the string: 'O','p','e','n','A','I' backwards is 'I','A','n','e','p','O'.",
          },
        ],
      },
      {
        unitNumber: 3,
        title: "Unit 3: Functions, File I/O & Exception Handling",
        description: "Modular functions, recursion, lambda expressions, text/binary file persistence, and robust error handling.",
        chapters: [
          {
            id: "py-ch7",
            chapterNumber: 7,
            unitNumber: 3,
            title: "Functions, Scope & Recursion",
            description: "Function definitions, *args & **kwargs, local vs global scope, lambda functions, and recursive patterns.",
            topics: ["def statement & return", "Default & keyword arguments", "LEGB Scope rule", "Lambda anonymous functions", "Recursion & base cases"],
            codingProblemIds: ["py-palindrome", "py-twosum"],
          },
          {
            id: "py-ch8",
            chapterNumber: 8,
            unitNumber: 3,
            title: "File Handling (Text & CSV)",
            description: "Reading and writing files with the `with` context manager, file pointers (seek/tell), and structured processing.",
            topics: ["open() modes: r, w, a, r+", "with open(...) context manager", "readline() & readlines()", "seek() and tell()", "Working with CSV data"],
            codingProblemIds: [],
          },
          {
            id: "py-ch9",
            chapterNumber: 9,
            unitNumber: 3,
            title: "Exception Handling & Standard Modules",
            description: "Defensive programming with try-except-finally blocks, custom exceptions, and standard libraries (math, random, os).",
            topics: ["try, except, else, finally", "Handling ValueError, IndexError, ZeroDivisionError", "raise statement", "importing math, os, sys", "Modular code design"],
            codingProblemIds: ["py-twosum"],
          },
        ],
        mcqs: [
          {
            id: "py-u3-q1",
            question: "Which block in a try-except structure ALWAYS executes, regardless of whether an exception occurs?",
            options: ["try", "except", "else", "finally"],
            correctIndex: 3,
            explanation: "The finally block is guaranteed to run after try/except, whether an exception occurred or not (used for cleanup).",
          },
          {
            id: "py-u3-q2",
            question: "What is the output of the lambda expression?",
            codeSnippet: "f = lambda a, b: a if a > b else b\nprint(f(12, 25))",
            options: ["12", "25", "True", "None"],
            correctIndex: 1,
            explanation: "The lambda returns the maximum of the two arguments: since 25 > 12, it returns 25.",
          },
          {
            id: "py-u3-q3",
            question: "What does the 'a' mode in open('file.txt', 'a') do?",
            options: [
              "Opens for reading only",
              "Opens for writing and truncates existing content",
              "Opens for appending to the end of file without truncating",
              "Opens binary stream",
            ],
            correctIndex: 2,
            explanation: "'a' opens the file for writing and appends new data to the end without deleting existing data.",
          },
          {
            id: "py-u3-q4",
            question: "What is the return value of a Python function that does not have an explicit return statement?",
            options: ["0", "False", "None", "Undefined"],
            correctIndex: 2,
            explanation: "In Python, functions without an explicit return statement implicitly return the singleton None.",
          },
        ],
      },
    ],
  },

  // ==========================================
  // 2. C LANGUAGE TRACK
  // ==========================================
  c: {
    track: "c",
    title: "C Systems Programming & Foundations",
    tagline: "Low-level mastery from memory management, pointers, and structs to robust system algorithms",
    icon: "⚡",
    language: "c",
    totalChapters: 9,
    units: [
      {
        unitNumber: 1,
        title: "Unit 1: C Fundamentals & Control Flow",
        description: "Compilation pipeline, variable declarations, memory sizes, operators, conditionals, and loops.",
        chapters: [
          {
            id: "c-ch1",
            chapterNumber: 1,
            unitNumber: 1,
            title: "Structure of a C Program & Standard I/O",
            description: "Main entry point, preprocessor directives (#include, #define), data types (int, float, char), and printf/scanf.",
            topics: ["Header files & Preprocessor", "main() return code", "Format specifiers (%d, %f, %c, %s)", "Integer overflow & sizes", "Standard I/O buffers"],
            codingProblemIds: ["c-reverse-num", "c-prime-check"],
          },
          {
            id: "c-ch2",
            chapterNumber: 2,
            unitNumber: 1,
            title: "Operators, Expressions & Bitwise Logic",
            description: "Arithmetic, relational, logical, bitwise operators (&, |, ^, ~, <<, >>), and operator precedence.",
            topics: ["Arithmetic & Relational Operators", "Bitwise operations & masking", "Left and Right bit shifts", "Increment/Decrement (pre vs post)", "Ternary operator"],
            codingProblemIds: ["c-reverse-num"],
          },
          {
            id: "c-ch3",
            chapterNumber: 3,
            unitNumber: 1,
            title: "Control Flow (if-else, switch, loops)",
            description: "Structured control logic with while, for, do-while loops, and switch-case selection.",
            topics: ["if / else if / else", "switch-case & break statements", "for loop anatomy", "while & do-while differences", "break and continue"],
            codingProblemIds: ["c-reverse-num", "c-prime-check"],
          },
        ],
        mcqs: [
          {
            id: "c-u1-q1",
            question: "What is the output of the following C code?",
            codeSnippet: "int a = 5;\nint b = a++;\nprintf(\"%d %d\", a, b);",
            options: ["5 5", "6 5", "6 6", "5 6"],
            correctIndex: 1,
            explanation: "Post-increment a++ assigns the current value (5) to b first, then increments a to 6.",
          },
          {
            id: "c-u1-q2",
            question: "What is the size of 'char' in standard C across platforms?",
            options: ["1 byte", "2 bytes", "4 bytes", "Depends on architecture"],
            correctIndex: 0,
            explanation: "By C standard specification, sizeof(char) is always strictly defined as 1 byte.",
          },
          {
            id: "c-u1-q3",
            question: "What does the expression (1 << 3) evaluate to?",
            options: ["3", "6", "8", "16"],
            correctIndex: 2,
            explanation: "1 shifted left by 3 bits is 2^3 = 8 (binary: 0001 -> 1000).",
          },
        ],
      },
      {
        unitNumber: 2,
        title: "Unit 2: Functions, Arrays & Strings",
        description: "Modular functions, stack frames, call by value vs reference, array memory layouts, and null-terminated strings.",
        chapters: [
          {
            id: "c-ch4",
            chapterNumber: 4,
            unitNumber: 2,
            title: "Functions, Scope & Recursion",
            description: "Function prototypes, activation records, parameter passing, and recursive problem solving.",
            topics: ["Function signatures & prototypes", "Call by Value vs Pointer Reference", "Stack memory & local scope", "Static local variables", "Base condition in recursion"],
            codingProblemIds: ["c-reverse-num", "c-prime-check"],
          },
          {
            id: "c-ch5",
            chapterNumber: 5,
            unitNumber: 2,
            title: "1D & 2D Arrays",
            description: "Contiguous memory allocation, array indexing, row-major order for 2D matrices, and array passing.",
            topics: ["Array declaration & memory layout", "Array bounds & buffer overruns", "Passing arrays to functions", "2D Arrays & matrix multiplication", "Array element addressing"],
            codingProblemIds: ["c-reverse-num"],
          },
          {
            id: "c-ch6",
            chapterNumber: 6,
            unitNumber: 2,
            title: "C Strings & Standard Library (<string.h>)",
            description: "Null-terminated character arrays ('\\0'), strlen, strcpy, strcmp, strcat, and safe buffer practices.",
            topics: ["Null character '\\0' significance", "strlen vs sizeof", "strcpy, strncpy, strcmp", "strcat and buffer overflows", "fgets vs gets"],
            codingProblemIds: ["c-reverse-num"],
          },
        ],
        mcqs: [
          {
            id: "c-u2-q1",
            question: "What does strcmp(\"apple\", \"banana\") return?",
            options: ["0", "A positive integer", "A negative integer", "1"],
            correctIndex: 2,
            explanation: "strcmp compares ASCII character by character. 'a' (97) < 'b' (98), so it returns a negative value.",
          },
          {
            id: "c-u2-q2",
            question: "In C, when an array is passed to a function, what is actually passed?",
            options: [
              "A full copy of the entire array",
              "A pointer to the first element of the array",
              "The size of the array",
              "Reference to the last element",
            ],
            correctIndex: 1,
            explanation: "In C, array names decay to a pointer to the first element when passed as a function argument.",
          },
          {
            id: "c-u2-q3",
            question: "What is the length of the string \"Hello\\0World\" according to strlen()?",
            options: ["5", "11", "10", "6"],
            correctIndex: 0,
            explanation: "strlen() terminates as soon as it encounters the first null character '\\0', counting only 5 characters ('Hello').",
          },
        ],
      },
      {
        unitNumber: 3,
        title: "Unit 3: Pointers, Memory Allocation & Structures",
        description: "Direct memory addresses, pointer arithmetic, heap allocation (malloc/free), structs, and file streams.",
        chapters: [
          {
            id: "c-ch7",
            chapterNumber: 7,
            unitNumber: 3,
            title: "Pointers & Pointer Arithmetic",
            description: "Memory addresses, dereferencing (*), address-of operator (&), void pointers, and pointer arithmetic.",
            topics: ["Address-of & Dereference operators", "Pointer arithmetic & scaling", "Pointers and arrays equivalence", "Pointers to pointers (**ptr)", "Function pointers"],
            codingProblemIds: ["c-reverse-num", "c-prime-check"],
          },
          {
            id: "c-ch8",
            chapterNumber: 8,
            unitNumber: 3,
            title: "Dynamic Memory Allocation (malloc, calloc, free)",
            description: "Heap management, malloc, calloc, realloc, detecting memory leaks, and avoiding dangling pointers.",
            topics: ["Heap vs Stack memory", "malloc() vs calloc()", "realloc() resizing", "free() & dangling pointers", "Valgrind & memory leak prevention"],
            codingProblemIds: ["c-reverse-num"],
          },
          {
            id: "c-ch9",
            chapterNumber: 9,
            unitNumber: 3,
            title: "Structures, Unions & File I/O",
            description: "User-defined data types, struct padding, arrow operator (->), unions, and fopen/fread/fwrite.",
            topics: ["struct declaration & typedef", "Structure alignment & padding", "Arrow operator (ptr->member)", "Unions memory sharing", "File pointers (FILE*, fopen, fclose)"],
            codingProblemIds: ["c-prime-check"],
          },
        ],
        mcqs: [
          {
            id: "c-u3-q1",
            question: "What is the consequence of failing to call free() on memory allocated via malloc()?",
            options: ["Segmentation fault", "Memory leak", "Compilation error", "Dangling pointer"],
            correctIndex: 1,
            explanation: "Allocated heap memory that is never freed remains unreachable, leading to a memory leak.",
          },
          {
            id: "c-u3-q2",
            question: "If int *p = malloc(sizeof(int)), what is the correct way to access the value pointed by p?",
            options: ["&p", "*p", "p->val", "p.val"],
            correctIndex: 1,
            explanation: "The dereference operator * accesses the value at the address stored in pointer p.",
          },
          {
            id: "c-u3-q3",
            question: "What is the primary difference between a struct and a union in C?",
            options: [
              "Unions cannot contain pointers",
              "Structs allocate separate memory for each member, while unions share the same memory space for all members",
              "Structs are dynamically allocated; unions are static",
              "There is no difference",
            ],
            correctIndex: 1,
            explanation: "In a union, all members share the same starting memory location (size equals largest member); in a struct, every member has its own offset.",
          },
        ],
      },
    ],
  },

  // ==========================================
  // 3. C++ TRACK
  // ==========================================
  cpp: {
    track: "cpp",
    title: "C++ & Object-Oriented Software Design",
    tagline: "High-performance object-oriented programming, modern C++ paradigms, templates, and the STL",
    icon: "🚀",
    language: "cpp",
    totalChapters: 9,
    units: [
      {
        unitNumber: 1,
        title: "Unit 1: C++ Essentials & OOP Fundamentals",
        description: "Streams, references, encapsulation, classes, member functions, and constructors.",
        chapters: [
          {
            id: "cpp-ch1",
            chapterNumber: 1,
            unitNumber: 1,
            title: "C++ Syntax, I/O Streams & References",
            description: "Namespace std, cin/cout, type inference (auto), pass-by-reference (&), and inline functions.",
            topics: ["cin & cout with << and >>", "Namespaces & using namespace std", "References (&) vs Pointers (*)", "Default parameters", "auto keyword"],
            codingProblemIds: ["cpp-sort-vector"],
          },
          {
            id: "cpp-ch2",
            chapterNumber: 2,
            unitNumber: 1,
            title: "Classes, Objects & Constructors",
            description: "Encapsulation, access specifiers (public/private/protected), constructor overloading, and destructors.",
            topics: ["Access Specifiers", "Constructors & Destructors", "Constructor initializer lists", "this pointer", "Copy Constructor & Rule of Three"],
            codingProblemIds: ["cpp-sort-vector"],
          },
          {
            id: "cpp-ch3",
            chapterNumber: 3,
            unitNumber: 1,
            title: "Inheritance & Virtual Functions (Polymorphism)",
            description: "Single, multiple, and hierarchical inheritance, virtual functions, vtables, and runtime polymorphism.",
            topics: ["Base and Derived classes", "Public vs Private inheritance", "Virtual functions & vtable", "Pure virtual functions & Abstract classes", "override keyword"],
            codingProblemIds: ["cpp-sort-vector"],
          },
        ],
        mcqs: [
          {
            id: "cpp-u1-q1",
            question: "Which of the following is true about a reference in C++?",
            options: [
              "A reference can be reassigned to point to another object after initialization",
              "A reference cannot be null and must be initialized upon declaration",
              "References consume separate pointer arithmetic syntax",
              "References require free() or delete",
            ],
            correctIndex: 1,
            explanation: "References in C++ are aliases that must be bound to a valid object upon declaration and cannot be null.",
          },
          {
            id: "cpp-u1-q2",
            question: "What makes a C++ class an Abstract Base Class?",
            options: [
              "Having only private constructors",
              "Containing at least one pure virtual function (= 0)",
              "Inheriting from another abstract class",
              "Having no member variables",
            ],
            correctIndex: 1,
            explanation: "A class with at least one pure virtual function (e.g. virtual void draw() = 0;) is abstract and cannot be instantiated.",
          },
          {
            id: "cpp-u1-q3",
            question: "When is the destructor of an object called?",
            options: [
              "When the object goes out of scope or is deleted with `delete`",
              "Only when the entire program exits",
              "Explicitly by calling obj.destructor()",
              "Whenever an exception is caught",
            ],
            correctIndex: 0,
            explanation: "RAII in C++ guarantees that stack objects are destructed automatically when their enclosing scope exits, and heap objects when `delete` is invoked.",
          },
        ],
      },
      {
        unitNumber: 2,
        title: "Unit 2: Operator Overloading & Templates",
        description: "Custom operator syntax, generic programming, function templates, class templates, and exception safety.",
        chapters: [
          {
            id: "cpp-ch4",
            chapterNumber: 4,
            unitNumber: 2,
            title: "Operator Overloading & Friend Functions",
            description: "Overloading +, ==, <<, >>, operator[], and accessing private data with friend functions.",
            topics: ["operator keyword syntax", "Overloading binary operators (+, -)", "Stream insertion << and extraction >>", "friend classes & functions", "Subscript operator [] overloading"],
            codingProblemIds: ["cpp-sort-vector"],
          },
          {
            id: "cpp-ch5",
            chapterNumber: 5,
            unitNumber: 2,
            title: "Generic Programming: Templates",
            description: "Function templates and class templates for creating type-independent, reusable algorithms.",
            topics: ["template <typename T>", "Function template specialization", "Template class creation", "Multiple template parameters", "Non-type template parameters"],
            codingProblemIds: ["cpp-sort-vector"],
          },
          {
            id: "cpp-ch6",
            chapterNumber: 6,
            unitNumber: 2,
            title: "Exception Handling & Modern C++ Features",
            description: "throw, try, catch, standard exceptions (<stdexcept>), smart pointers (unique_ptr, shared_ptr).",
            topics: ["try-catch blocks", "std::runtime_error & out_of_range", "RAII resource management", "std::unique_ptr & std::shared_ptr", "nullptr vs NULL"],
            codingProblemIds: ["cpp-sort-vector"],
          },
        ],
        mcqs: [
          {
            id: "cpp-u2-q1",
            question: "Which smart pointer in modern C++ maintains strict exclusive ownership of a resource?",
            options: ["std::shared_ptr", "std::unique_ptr", "std::weak_ptr", "std::auto_ptr"],
            correctIndex: 1,
            explanation: "std::unique_ptr enforces single, exclusive ownership and cannot be copied, only moved.",
          },
          {
            id: "cpp-u2-q2",
            question: "Why should stream insertion operator << usually be overloaded as a friend function rather than a member function?",
            options: [
              "Because C++ prohibits member operator overloading",
              "Because the left-hand operand is std::ostream&, not the custom class object",
              "Because friends run faster than member functions",
              "Because streams are private in C++",
            ],
            correctIndex: 1,
            explanation: "In `cout << obj`, the left operand is std::ostream. To make it a member function, it would have to be defined inside std::ostream, which we cannot modify.",
          },
        ],
      },
      {
        unitNumber: 3,
        title: "Unit 3: Standard Template Library (STL)",
        description: "Vectors, maps, sets, priority queues, iterators, and high-performance algorithms (sort, binary_search).",
        chapters: [
          {
            id: "cpp-ch7",
            chapterNumber: 7,
            unitNumber: 3,
            title: "Sequence Containers (vector, deque, list)",
            description: "Dynamic array reallocation, vector operations (push_back, emplace_back), and deque performance.",
            topics: ["std::vector memory growth", "size() vs capacity()", "push_back vs emplace_back", "std::deque & std::list", "Iterators (begin, end)"],
            codingProblemIds: ["cpp-sort-vector"],
          },
          {
            id: "cpp-ch8",
            chapterNumber: 8,
            unitNumber: 3,
            title: "Associative & Unordered Containers (map, set, unordered_map)",
            description: "Red-Black Tree based ordered containers vs Hash table based unordered containers.",
            topics: ["std::set (unique, sorted)", "std::map (key-value, O(log N))", "std::unordered_map (O(1) hash)", "std::pair & std::tuple", "Custom comparator functions"],
            codingProblemIds: ["cpp-sort-vector"],
          },
          {
            id: "cpp-ch9",
            chapterNumber: 9,
            unitNumber: 3,
            title: "STL Algorithms & Lambda Expressions",
            description: "Built-in competitive programming algorithms: std::sort, lower_bound, upper_bound, and lambda functions.",
            topics: ["std::sort with custom lambdas", "std::binary_search", "lower_bound & upper_bound", "std::reverse & std::rotate", "accumulate and count_if"],
            codingProblemIds: ["cpp-sort-vector"],
          },
        ],
        mcqs: [
          {
            id: "cpp-u3-q1",
            question: "What is the average time complexity of inserting an element into std::unordered_map?",
            options: ["O(N)", "O(log N)", "O(1)", "O(N log N)"],
            correctIndex: 2,
            explanation: "std::unordered_map is implemented using a hash table, providing O(1) average insertion and lookup.",
          },
          {
            id: "cpp-u3-q2",
            question: "What does std::lower_bound(v.begin(), v.end(), x) return on a sorted vector?",
            options: [
              "An iterator to the first element that is >= x",
              "An iterator to the first element that is strictly > x",
              "The index of x",
              "True if x exists, False otherwise",
            ],
            correctIndex: 0,
            explanation: "lower_bound returns an iterator pointing to the first element that is not less than (i.e. >=) value x.",
          },
          {
            id: "cpp-u3-q3",
            question: "What underlying data structure does std::map use in standard C++ implementations?",
            options: ["Hash Table", "Red-Black Tree (Self-balancing BST)", "Min Heap", "Circular Buffer"],
            correctIndex: 1,
            explanation: "std::map maintains sorted keys using self-balancing binary search trees (typically Red-Black trees), giving O(log N) operations.",
          },
        ],
      },
    ],
  },

  // ==========================================
  // 4. DSA (DATA STRUCTURES & ALGORITHMS) TRACK
  // ==========================================
  dsa: {
    track: "dsa",
    title: "Data Structures & Algorithms (DSA)",
    tagline: "From asymptotic complexity analysis to advanced trees, graphs, dynamic programming, and interview patterns",
    icon: "🧠",
    language: "python", // default playground language, but multi-lang supported
    totalChapters: 9,
    units: [
      {
        unitNumber: 1,
        title: "Unit 1: Complexity Analysis & Linear Data Structures",
        description: "Big-O notation, array techniques (two pointers, sliding window), and linked list operations.",
        chapters: [
          {
            id: "dsa-ch1",
            chapterNumber: 1,
            unitNumber: 1,
            title: "Asymptotic Analysis & Big-O Notation",
            description: "Time complexity, auxiliary space complexity, Big-O, Omega, Theta notations, and worst vs average cases.",
            topics: ["Big-O, Omega, Theta", "Analyzing nested loop complexity", "Logarithmic time O(log N)", "Space complexity & recursion stack", "Common complexity classes"],
            codingProblemIds: ["dsa-reverse-list"],
          },
          {
            id: "dsa-ch2",
            chapterNumber: 2,
            unitNumber: 1,
            title: "Arrays, Two-Pointers & Sliding Window",
            description: "Linear array traversal, two-pointer convergence, prefix sums, and sliding window patterns.",
            topics: ["Two-pointer technique (opposite ends)", "Slow & Fast pointer pattern", "Fixed and dynamic sliding window", "Prefix Sum array", "Kadane's Algorithm"],
            codingProblemIds: ["py-twosum", "dsa-reverse-list"],
          },
          {
            id: "dsa-ch3",
            chapterNumber: 3,
            unitNumber: 1,
            title: "Linked Lists (Singly, Doubly, Circular)",
            description: "Node structures, pointer manipulation, reversal, cycle detection (Floyd's Tortoise and Hare).",
            topics: ["Singly Linked List implementation", "Pointer manipulation during deletion", "Reversing a Linked List", "Floyd's Cycle Detection", "Doubly Linked List advantages"],
            codingProblemIds: ["dsa-reverse-list"],
          },
        ],
        mcqs: [
          {
            id: "dsa-u1-q1",
            question: "What is the worst-case time complexity of binary search on a sorted array of size N?",
            options: ["O(1)", "O(log N)", "O(N)", "O(N log N)"],
            correctIndex: 1,
            explanation: "Binary search divides the search space in half at each iteration, resulting in O(log N) time.",
          },
          {
            id: "dsa-u1-q2",
            question: "What is the primary advantage of a Singly Linked List over an Array?",
            options: [
              "O(1) random access by index",
              "Dynamic sizing and O(1) insertion/deletion at known nodes without shifting",
              "Better cache locality",
              "Less memory overhead per element",
            ],
            correctIndex: 1,
            explanation: "Linked lists can insert or delete nodes in O(1) time once the node pointer is known, without shifting contiguous memory.",
          },
          {
            id: "dsa-u1-q3",
            question: "How does Floyd's Cycle-Finding Algorithm detect a loop in a linked list?",
            options: [
              "Using a hash map of visited nodes",
              "By moving one pointer by 1 step and another by 2 steps until they meet",
              "By counting the total number of nodes",
              "By sorting the node pointers",
            ],
            correctIndex: 1,
            explanation: "The fast pointer moves at 2x speed; if a cycle exists, the fast pointer will inevitably lap and meet the slow pointer.",
          },
        ],
      },
      {
        unitNumber: 2,
        title: "Unit 2: Stacks, Queues, Heaps & Recursion",
        description: "LIFO and FIFO mechanics, monotonic stacks, priority queues, and recursive backtracking.",
        chapters: [
          {
            id: "dsa-ch4",
            chapterNumber: 4,
            unitNumber: 2,
            title: "Stacks & Stack Applications",
            description: "LIFO principle, push/pop operations, balanced parentheses evaluation, and monotonic stacks.",
            topics: ["Stack LIFO behavior", "Array vs Linked List implementation", "Balanced Parentheses checker", "Next Greater Element (Monotonic stack)", "Infix to Postfix conversion"],
            codingProblemIds: ["dsa-valid-parens"],
          },
          {
            id: "dsa-ch5",
            chapterNumber: 5,
            unitNumber: 2,
            title: "Queues, Deques & Priority Queues (Heaps)",
            description: "FIFO queuing, circular queues, double-ended queues, binary min/max heaps, and heapify.",
            topics: ["FIFO principle", "Circular Queue implementation", "Double Ended Queue (Deque)", "Min Heap & Max Heap properties", "heapify in O(N) time"],
            codingProblemIds: ["dsa-valid-parens"],
          },
          {
            id: "dsa-ch6",
            chapterNumber: 6,
            unitNumber: 2,
            title: "Recursion & Backtracking",
            description: "Recursive call stack, backtracking decision trees, subset generation, and permutations.",
            topics: ["Base cases & recursion trees", "Subset generation pattern", "Permutations & Combinations", "N-Queens problem approach", "Pruning dead search paths"],
            codingProblemIds: ["dsa-valid-parens"],
          },
        ],
        mcqs: [
          {
            id: "dsa-u2-q1",
            question: "Which data structure is fundamentally used for function call execution and recursion in modern CPUs?",
            options: ["Queue", "Call Stack", "Heap", "Hash Table"],
            correctIndex: 1,
            explanation: "The system call stack stores active stack frames (local variables, return addresses) during function execution and recursion.",
          },
          {
            id: "dsa-u2-q2",
            question: "What is the time complexity to extract the minimum element from a Min-Heap of size N?",
            options: ["O(1)", "O(log N)", "O(N)", "O(N log N)"],
            correctIndex: 1,
            explanation: "Extracting min removes the root and bubbles down the replacement leaf, which takes O(log N) time to restore heap invariant.",
          },
          {
            id: "dsa-u2-q3",
            question: "Which of the following problems is best solved using a Monotonic Stack?",
            options: [
              "Finding the Next Greater Element for all elements in an array",
              "Breadth-First Search on a graph",
              "Binary tree level order traversal",
              "Matrix multiplication",
            ],
            correctIndex: 0,
            explanation: "A monotonic stack maintains elements in sorted order to find the next greater/smaller element in linear O(N) time.",
          },
        ],
      },
      {
        unitNumber: 3,
        title: "Unit 3: Trees, Graphs & Core Algorithms",
        description: "Binary Trees, BST properties, Graph representations (BFS/DFS), shortest paths, and sorting.",
        chapters: [
          {
            id: "dsa-ch7",
            chapterNumber: 7,
            unitNumber: 3,
            title: "Binary Trees & Binary Search Trees (BST)",
            description: "Tree traversals (Inorder, Preorder, Postorder, Level-order), BST search/insert/delete, and height calculation.",
            topics: ["Tree Terminology (root, leaf, height)", "Inorder, Preorder, Postorder traversals", "Breadth-First Level-Order traversal", "BST ordering property", "Validating a BST"],
            codingProblemIds: ["dsa-reverse-list"],
          },
          {
            id: "dsa-ch8",
            chapterNumber: 8,
            unitNumber: 8,
            title: "Graph Algorithms (BFS, DFS & Shortest Paths)",
            description: "Adjacency matrix vs list, BFS queue traversal, DFS recursion, cycle detection, and Dijkstra basics.",
            topics: ["Adjacency List representation", "BFS for shortest path in unweighted graphs", "DFS for connected components", "Cycle detection in directed vs undirected graphs", "Topological Sort"],
            codingProblemIds: ["dsa-reverse-list"],
          },
          {
            id: "dsa-ch9",
            chapterNumber: 9,
            unitNumber: 3,
            title: "Sorting, Searching & Introduction to DP",
            description: "Merge Sort, Quick Sort divide-and-conquer, Binary Search variations, and memoization fundamentals.",
            topics: ["Merge Sort O(N log N) guarantee", "Quick Sort partitioning", "Binary Search on answers", "Overlapping subproblems & Memoization", "Fibonacci & 0/1 Knapsack intuition"],
            codingProblemIds: ["py-twosum", "dsa-reverse-list", "dsa-valid-parens"],
          },
        ],
        mcqs: [
          {
            id: "dsa-u3-q1",
            question: "Which traversal of a Binary Search Tree produces elements in strictly ascending sorted order?",
            options: ["Preorder Traversal", "Inorder Traversal", "Postorder Traversal", "Level-order Traversal"],
            correctIndex: 1,
            explanation: "Inorder traversal visits Left Subtree -> Root -> Right Subtree, which yields sorted values for any valid BST.",
          },
          {
            id: "dsa-u3-q2",
            question: "Which algorithm finds the shortest path in an unweighted graph in O(V + E) time?",
            options: ["Depth-First Search (DFS)", "Breadth-First Search (BFS)", "Dijkstra's Algorithm", "Bellman-Ford"],
            correctIndex: 1,
            explanation: "BFS explores nodes layer by layer, guaranteeing the shortest path in an unweighted graph in O(V + E) time.",
          },
          {
            id: "dsa-u3-q3",
            question: "What is the worst-case time complexity of Quick Sort?",
            options: ["O(N log N)", "O(N)", "O(N^2)", "O(log N)"],
            correctIndex: 2,
            explanation: "When the chosen pivot is always the smallest or largest element (e.g. already sorted array with naive pivot), Quick Sort degrades to O(N^2).",
          },
          {
            id: "dsa-u3-q4",
            question: "What are the two key properties required for a problem to be solved using Dynamic Programming?",
            options: [
              "Optimal Substructure and Overlapping Subproblems",
              "Greedy Choice and Divide and Conquer",
              "Linear Time and Constant Space",
              "Breadth-First Search and Depth-First Search",
            ],
            correctIndex: 0,
            explanation: "Dynamic programming applies when a problem exhibits Optimal Substructure (optimal solution formed by optimal sub-solutions) and Overlapping Subproblems (subproblems recomputed multiple times).",
          },
        ],
      },
    ],
  },
};
