import type { LanguageId, TestCase, Difficulty } from "./coding-types";

export type LabNote = {
  id: string;
  title: string;
  readTime: string;
  content: string;
  keyPoints: string[];
};

export type LabMCQ = {
  id: string;
  question: string;
  codeSnippet?: string;
  options: [string, string, string, string];
  correctIndex: number;
  explanation: string;
};

export type LabCodingProblem = {
  id: string;
  title: string;
  difficulty: Difficulty;
  companyTags?: string[];
  description: string;
  inputFormat: string;
  outputFormat: string;
  constraints: string;
  sampleInput: string;
  sampleOutput: string;
  explanation?: string;
  starterCode: Record<LanguageId, string>;
  testCases: TestCase[];
};

export type LabLecture = {
  id: string;
  lectureNumber: number;
  unitNumber: number;
  title: string;
  description: string;
  note: LabNote;
  mcqs: LabMCQ[];
  codingProblem: LabCodingProblem;
};

export type LabCourse = {
  id: "c" | "cpp" | "python" | "dsa";
  code: string;
  name: string;
  shortTitle: string;
  category: string;
  icon: string;
  accentColor: string;
  startDate: string;
  endDate: string;
  totalAssessments: number;
  defaultLanguage: LanguageId;
  lectures: LabLecture[];
};

export const CLEAN_LAB_STARTER_CODE: Record<LanguageId, string> = {
  cpp: `#include <iostream>
using namespace std;

int main() {
    // Write your solution here
    
    return 0;
}
`,
  python: `# Write your solution here
import sys

def main():
    pass

if __name__ == "__main__":
    main()
`,
  c: `#include <stdio.h>

int main() {
    // Write your solution here
    
    return 0;
}
`,
};

export const LAB_COURSES: Record<"c" | "cpp" | "python" | "dsa", LabCourse> = {
  // =========================================================================
  // 1. C++ OBJECT ORIENTED PROGRAMMING LAB (CS202)
  // =========================================================================
  cpp: {
    id: "cpp",
    code: "2028_CSE202_Object Oriented Programming_LAB",
    name: "Object Oriented Programming using C++ LAB",
    shortTitle: "C++ OOP Lab",
    category: "Object Oriented Programming",
    icon: "🚀",
    accentColor: "from-blue-600 to-indigo-700",
    startDate: "6 Aug, 26",
    endDate: "31 Jan, 27",
    totalAssessments: 55,
    defaultLanguage: "cpp",
    lectures: [
      {
        id: "cpp-lec1",
        lectureNumber: 1,
        unitNumber: 1,
        title: "Classes, Objects & Member Functions",
        description: "Understanding encapsulation, class definition, access specifiers, and member function implementation.",
        note: {
          id: "cpp-lec1-note",
          title: "Introduction to Classes and Objects in C++",
          readTime: "04:30",
          content: `### 1. Classes & Objects in C++
A class is a blueprint binding data members and member functions into a single unit. Objects are runtime instances of classes.
Access specifiers:
- **private**: Accessible only inside the class.
- **public**: Accessible from outside the class.
- **protected**: Accessible in derived classes.`,
          keyPoints: [
            "Encapsulation protects data integrity by restricting direct external access.",
            "Default member access in C++ `class` is private (unlike `struct`).",
          ],
        },
        mcqs: [
          {
            id: "cpp-l1-q1",
            question: "What is the default access specifier for members of a C++ class?",
            options: ["public", "protected", "private", "internal"],
            correctIndex: 2,
            explanation: "Members of a class default to private in C++.",
          },
          {
            id: "cpp-l1-q2",
            question: "Which operator defines a member function outside the class definition?",
            options: [": (Colon)", ":: (Scope resolution operator)", "-> (Arrow)", ". (Dot)"],
            correctIndex: 1,
            explanation: "`::` is the scope resolution operator in C++.",
          },
        ],
        codingProblem: {
          id: "cpp-prob-student-record",
          title: "Student Record Calculator",
          difficulty: "easy",
          companyTags: ["Infosys", "Capgemini", "University Exam"],
          description: "Create a class `Student` with members `rollNumber`, `marks1`, `marks2`, and `marks3`. Read inputs and print total and average marks.",
          inputFormat: "First line: `rollNumber`\nSecond line: three space-separated integers `marks1 marks2 marks3`.",
          outputFormat: "Print `Total: <sum>, Average: <avg>` (average rounded to 2 decimals).",
          constraints: "1 <= rollNumber <= 10000\n0 <= marks <= 100",
          sampleInput: "101\n85 90 95",
          sampleOutput: "Total: 270, Average: 90.00",
          explanation: "85 + 90 + 95 = 270. Average = 270 / 3 = 90.00.",
          starterCode: CLEAN_LAB_STARTER_CODE,
          testCases: [
            { id: "cpp-l1-tc1", input: "101\n85 90 95", expectedOutput: "Total: 270, Average: 90.00", isSecret: false },
            { id: "cpp-l1-tc2", input: "102\n70 80 90", expectedOutput: "Total: 240, Average: 80.00", isSecret: false },
            { id: "cpp-l1-tc3", input: "505\n100 100 98", expectedOutput: "Total: 298, Average: 99.33", isSecret: true },
          ],
        },
      },
      {
        id: "cpp-lec2",
        lectureNumber: 2,
        unitNumber: 1,
        title: "Constructors, Destructors & Initializer Lists",
        description: "Parameterized constructors, copy constructors, constructor delegation, and RAII cleanup.",
        note: {
          id: "cpp-lec2-note",
          title: "Constructors & Resource Management in C++",
          readTime: "05:00",
          content: `### Constructors & Destructors
Constructors initialize object state on creation. Destructors perform cleanup when the object goes out of scope.`,
          keyPoints: [
            "Constructors cannot return values and cannot be virtual.",
            "Member initializer lists run before the constructor body.",
          ],
        },
        mcqs: [
          {
            id: "cpp-l2-q1",
            question: "Which constructor is invoked by: `MyClass obj2 = obj1;`?",
            options: ["Default constructor", "Copy constructor", "Move constructor", "Destructor"],
            correctIndex: 1,
            explanation: "Initializing a new object with an existing instance calls the copy constructor.",
          },
        ],
        codingProblem: {
          id: "cpp-prob-rect-area",
          title: "Rectangle Area with Parameterized Constructor",
          difficulty: "easy",
          companyTags: ["Wipro", "TCS"],
          description: "Define a class `Rectangle` taking `length` and `breadth` in constructor. Calculate and print its area and perimeter.",
          inputFormat: "Two integers `length` and `breadth` separated by a space.",
          outputFormat: "Print `Area: <area>, Perimeter: <perimeter>`.",
          constraints: "1 <= length, breadth <= 10^4",
          sampleInput: "5 4",
          sampleOutput: "Area: 20, Perimeter: 18",
          explanation: "Area = 5 * 4 = 20. Perimeter = 2 * (5 + 4) = 18.",
          starterCode: CLEAN_LAB_STARTER_CODE,
          testCases: [
            { id: "cpp-l2-tc1", input: "5 4", expectedOutput: "Area: 20, Perimeter: 18", isSecret: false },
            { id: "cpp-l2-tc2", input: "10 10", expectedOutput: "Area: 100, Perimeter: 40", isSecret: false },
            { id: "cpp-l2-tc3", input: "12 8", expectedOutput: "Area: 96, Perimeter: 40", isSecret: true },
          ],
        },
      },
      {
        id: "cpp-lec3",
        lectureNumber: 3,
        unitNumber: 2,
        title: "Operator Overloading: Complex Numbers",
        description: "Overloading binary operator `+` and `*` to perform arithmetic on user-defined types.",
        note: {
          id: "cpp-lec3-note",
          title: "Operator Overloading Principles in C++",
          readTime: "04:30",
          content: `### Operator Overloading
Allows existing C++ operators to be redefined for user-defined classes. Cannot invent new operators or alter precedence.`,
          keyPoints: [
            "Operators like `::`, `.`, `.*`, and `?:` cannot be overloaded.",
          ],
        },
        mcqs: [
          {
            id: "cpp-l3-q1",
            question: "Which of the following operators CANNOT be overloaded in C++?",
            options: ["+", ":: (Scope resolution)", "==", "[]"],
            correctIndex: 1,
            explanation: "Scope resolution `::` cannot be overloaded.",
          },
        ],
        codingProblem: {
          id: "cpp-prob-complex-add",
          title: "Complex Number Addition via Operator Overloading",
          difficulty: "easy",
          companyTags: ["Accenture", "Infosys"],
          description: "Read real and imaginary parts of two complex numbers. Overload operator `+` to compute their sum.",
          inputFormat: "Four space-separated integers: `r1 i1 r2 i2`.",
          outputFormat: "Print the resulting sum formatted as `r+ii` (e.g. `7+5i`).",
          constraints: "-1000 <= r, i <= 1000",
          sampleInput: "3 2 4 3",
          sampleOutput: "7+5i",
          explanation: "(3+2i) + (4+3i) = 7+5i.",
          starterCode: CLEAN_LAB_STARTER_CODE,
          testCases: [
            { id: "cpp-l3-tc1", input: "3 2 4 3", expectedOutput: "7+5i", isSecret: false },
            { id: "cpp-l3-tc2", input: "1 1 2 2", expectedOutput: "3+3i", isSecret: false },
            { id: "cpp-l3-tc3", input: "10 5 -2 -3", expectedOutput: "8+2i", isSecret: true },
          ],
        },
      },
      {
        id: "cpp-lec4",
        lectureNumber: 4,
        unitNumber: 3,
        title: "Inheritance & Polymorphism: Shape Hierarchy",
        description: "Single, multilevel, hierarchical inheritance and runtime polymorphism using pure virtual functions.",
        note: {
          id: "cpp-lec4-note",
          title: "Inheritance & Virtual Functions in C++",
          readTime: "05:00",
          content: `### Polymorphism & Virtual Functions
Virtual functions enable late/dynamic binding so derived implementations are called via base pointers at runtime.`,
          keyPoints: [
            "A class containing at least one pure virtual function (`virtual void f() = 0;`) is abstract.",
          ],
        },
        mcqs: [
          {
            id: "cpp-l4-q1",
            question: "What makes a C++ class abstract?",
            options: ["Having private members", "Having at least one pure virtual function", "Having a destructor", "Having templates"],
            correctIndex: 1,
            explanation: "Pure virtual function `= 0` makes a class abstract.",
          },
        ],
        codingProblem: {
          id: "cpp-prob-shape-poly",
          title: "Shape Area Calculator via Polymorphism",
          difficulty: "medium",
          companyTags: ["Amazon", "TCS Digital"],
          description: "Given shape type (1 for Circle with radius r, 2 for Square with side s). Compute and print area as an integer.",
          inputFormat: "First line: `type` (1 or 2). Second line: dimension `r` or `s`.",
          outputFormat: "Print the integer area (use pi = 3.14 for circle, truncated to int).",
          constraints: "1 <= dimension <= 1000",
          sampleInput: "1\n10",
          sampleOutput: "314",
          explanation: "Circle area = 3.14 * 10 * 10 = 314.",
          starterCode: CLEAN_LAB_STARTER_CODE,
          testCases: [
            { id: "cpp-l4-tc1", input: "1\n10", expectedOutput: "314", isSecret: false },
            { id: "cpp-l4-tc2", input: "2\n5", expectedOutput: "25", isSecret: false },
            { id: "cpp-l4-tc3", input: "2\n12", expectedOutput: "144", isSecret: true },
          ],
        },
      },
      {
        id: "cpp-lec5",
        lectureNumber: 5,
        unitNumber: 4,
        title: "STL Vector & Map Frequency Analysis",
        description: "Harnessing the C++ Standard Template Library (`std::vector`, `std::map`) for associative lookups.",
        note: {
          id: "cpp-lec5-note",
          title: "C++ STL Containers & Iterators",
          readTime: "04:00",
          content: `### STL Containers
- \`std::vector\`: Dynamic contiguous array with amortized O(1) push_back.
- \`std::map\`: Balanced Red-Black tree maintaining sorted keys with O(log N) operations.`,
          keyPoints: [
            "STL vectors automatically handle resizing.",
            "std::map keeps keys in ascending order.",
          ],
        },
        mcqs: [
          {
            id: "cpp-l5-q1",
            question: "What is the average time complexity of insertion into a std::map?",
            options: ["O(1)", "O(log N)", "O(N)", "O(N log N)"],
            correctIndex: 1,
            explanation: "std::map is a Red-Black tree with logarithmic O(log N) operations.",
          },
        ],
        codingProblem: {
          id: "cpp-prob-stl-frequency",
          title: "Sorted Element Frequency Counter",
          difficulty: "easy",
          companyTags: ["Google", "Adobe"],
          description: "Given N integers, count the frequency of each distinct element and print them in ascending key order.",
          inputFormat: "First line: `N`\nSecond line: `N` space-separated integers.",
          outputFormat: "Print each key and frequency in format `key:count` on separate lines.",
          constraints: "1 <= N <= 10^5",
          sampleInput: "6\n4 2 4 1 2 4",
          sampleOutput: "1:1\n2:2\n4:3",
          explanation: "1 appears 1 time, 2 appears 2 times, 4 appears 3 times.",
          starterCode: CLEAN_LAB_STARTER_CODE,
          testCases: [
            { id: "cpp-l5-tc1", input: "6\n4 2 4 1 2 4", expectedOutput: "1:1\n2:2\n4:3", isSecret: false },
            { id: "cpp-l5-tc2", input: "3\n10 10 10", expectedOutput: "10:3", isSecret: false },
            { id: "cpp-l5-tc3", input: "5\n9 3 9 1 3", expectedOutput: "1:1\n3:2\n9:2", isSecret: true },
          ],
        },
      },
    ],
  },

  // =========================================================================
  // 2. DATA STRUCTURES & ALGORITHMS LAB (CS205)
  // =========================================================================
  dsa: {
    id: "dsa",
    code: "2028_CSE205_Data Structures and Algorithms_LAB",
    name: "Data Structures and Algorithms LAB",
    shortTitle: "DSA Lab",
    category: "Algorithms & Core CS",
    icon: "🧠",
    accentColor: "from-emerald-600 to-teal-700",
    startDate: "6 Aug, 26",
    endDate: "31 Jan, 27",
    totalAssessments: 50,
    defaultLanguage: "python",
    lectures: [
      {
        id: "dsa-lec1",
        lectureNumber: 1,
        unitNumber: 1,
        title: "Two Sum & Two-Pointer Techniques",
        description: "Optimizing search space from O(N^2) to O(N) using hash maps and opposite-end two-pointer convergence.",
        note: {
          id: "dsa-lec1-note",
          title: "Two-Pointer Technique & Hash-Based Lookup",
          readTime: "04:00",
          content: `### Two Sum Formulation
Given an array and target, find two indices summing to target in O(N) time using a hash map for O(1) complement lookup.`,
          keyPoints: [
            "Hash maps provide O(1) complement lookup.",
          ],
        },
        mcqs: [
          {
            id: "dsa-l1-q1",
            question: "What is the optimal time complexity to solve Two Sum with a hash map?",
            options: ["O(N^2)", "O(N log N)", "O(N)", "O(1)"],
            correctIndex: 2,
            explanation: "Single pass with O(1) hash map lookup gives O(N).",
          },
        ],
        codingProblem: {
          id: "dsa-prob-twosum",
          title: "Two Sum Indices Finder",
          difficulty: "easy",
          companyTags: ["Amazon", "Google", "TCS Digital"],
          description: "Given an integer array and target sum, output the 0-based indices of the two numbers that add up to target.",
          inputFormat: "First line: `N target`\nSecond line: `N` space-separated integers.",
          outputFormat: "Print the two indices separated by a space (smaller index first).",
          constraints: "2 <= N <= 10^5\n-10^9 <= nums[i], target <= 10^9",
          sampleInput: "4 9\n2 7 11 15",
          sampleOutput: "0 1",
          explanation: "nums[0] + nums[1] = 2 + 7 = 9.",
          starterCode: CLEAN_LAB_STARTER_CODE,
          testCases: [
            { id: "dsa-l1-tc1", input: "4 9\n2 7 11 15", expectedOutput: "0 1", isSecret: false },
            { id: "dsa-l1-tc2", input: "3 6\n3 2 4", expectedOutput: "1 2", isSecret: false },
            { id: "dsa-l1-tc3", input: "5 20\n1 5 15 25 30", expectedOutput: "1 2", isSecret: true },
          ],
        },
      },
      {
        id: "dsa-lec2",
        lectureNumber: 2,
        unitNumber: 1,
        title: "Stack Applications: Valid Parentheses",
        description: "LIFO stack mechanics for balancing brackets, matching opening with closing characters, and syntax validation.",
        note: {
          id: "dsa-lec2-note",
          title: "Balanced Brackets using Stack (LIFO)",
          readTime: "03:45",
          content: `### Stack Bracket Matching
Push opening brackets; on closing bracket verify top of stack matches. Empty stack at end denotes valid string.`,
          keyPoints: [
            "Stack follows Last-In First-Out (LIFO).",
          ],
        },
        mcqs: [
          {
            id: "dsa-l2-q1",
            question: "Which data structure follows LIFO order?",
            options: ["Queue", "Stack", "Binary Heap", "Linked List"],
            correctIndex: 1,
            explanation: "Stack is LIFO.",
          },
        ],
        codingProblem: {
          id: "dsa-prob-valid-parens",
          title: "Valid Parentheses Checker",
          difficulty: "easy",
          companyTags: ["Microsoft", "Adobe"],
          description: "Given a string `s` containing brackets `()[]{}` determine if brackets are balanced.",
          inputFormat: "A single line containing bracket string `s`.",
          outputFormat: "Print `Valid` if balanced, otherwise `Invalid`.",
          constraints: "1 <= len(s) <= 10000",
          sampleInput: "()[]{}",
          sampleOutput: "Valid",
          explanation: "All pairs match.",
          starterCode: CLEAN_LAB_STARTER_CODE,
          testCases: [
            { id: "dsa-l2-tc1", input: "()[]{}", expectedOutput: "Valid", isSecret: false },
            { id: "dsa-l2-tc2", input: "(]", expectedOutput: "Invalid", isSecret: false },
            { id: "dsa-l2-tc3", input: "([{}])", expectedOutput: "Valid", isSecret: true },
          ],
        },
      },
      {
        id: "dsa-lec3",
        lectureNumber: 3,
        unitNumber: 2,
        title: "Linked List Reversal & Pointer Manipulation",
        description: "Iterative pointer updates (`prev`, `curr`, `next`) to reverse a singly linked list in O(N) time and O(1) space.",
        note: {
          id: "dsa-lec3-note",
          title: "Singly Linked List Reversal Algorithm",
          readTime: "04:00",
          content: `### Reversing Linked List
Iterate while updating pointers: \`curr.next = prev\`, then shift \`prev\` and \`curr\`.`,
          keyPoints: [
            "Runs in O(N) time with O(1) memory.",
          ],
        },
        mcqs: [
          {
            id: "dsa-l3-q1",
            question: "What is the auxiliary space complexity of iteratively reversing a linked list?",
            options: ["O(N)", "O(1)", "O(log N)", "O(N^2)"],
            correctIndex: 1,
            explanation: "Only 3 pointer variables are used, giving O(1) space.",
          },
        ],
        codingProblem: {
          id: "dsa-prob-reverse-list",
          title: "Singly Linked List Inversion",
          difficulty: "easy",
          companyTags: ["Apple", "Uber", "Amazon"],
          description: "Given N space-separated integers representing nodes in a linked list, reverse the list and print the new order.",
          inputFormat: "First line: `N`\nSecond line: `N` space-separated integers.",
          outputFormat: "Print the reversed values separated by a space.",
          constraints: "1 <= N <= 10^5",
          sampleInput: "5\n1 2 3 4 5",
          sampleOutput: "5 4 3 2 1",
          explanation: "Nodes are printed in reverse order.",
          starterCode: CLEAN_LAB_STARTER_CODE,
          testCases: [
            { id: "dsa-l3-tc1", input: "5\n1 2 3 4 5", expectedOutput: "5 4 3 2 1", isSecret: false },
            { id: "dsa-l3-tc2", input: "2\n10 20", expectedOutput: "20 10", isSecret: false },
            { id: "dsa-l3-tc3", input: "1\n42", expectedOutput: "42", isSecret: true },
          ],
        },
      },
      {
        id: "dsa-lec4",
        lectureNumber: 4,
        unitNumber: 2,
        title: "Binary Search in Logarithmic Time",
        description: "Divide-and-conquer search on sorted arrays, calculating mid safely (`mid = low + (high - low) / 2`).",
        note: {
          id: "dsa-lec4-note",
          title: "Binary Search Invariants & Complexity",
          readTime: "03:30",
          content: `### Binary Search
Halves search space each iteration, guaranteeing O(log N) worst-case time complexity on sorted data.`,
          keyPoints: [
            "Requires monotonically sorted data.",
          ],
        },
        mcqs: [
          {
            id: "dsa-l4-q1",
            question: "What is the maximum number of comparisons for binary search on an array of 1024 elements?",
            options: ["1024", "10", "11", "512"],
            correctIndex: 1,
            explanation: "log2(1024) = 10 comparisons.",
          },
        ],
        codingProblem: {
          id: "dsa-prob-binary-search",
          title: "Binary Search Target Index",
          difficulty: "easy",
          companyTags: ["Google", "Bloomberg"],
          description: "Given sorted array of N distinct integers and a target value, return target's index or -1 if not present.",
          inputFormat: "First line: `N target`\nSecond line: `N` space-separated sorted integers.",
          outputFormat: "Print the 0-based index or -1.",
          constraints: "1 <= N <= 10^5\n-10^9 <= nums[i], target <= 10^9",
          sampleInput: "6 9\n-1 0 3 5 9 12",
          sampleOutput: "4",
          explanation: "9 exists at index 4.",
          starterCode: CLEAN_LAB_STARTER_CODE,
          testCases: [
            { id: "dsa-l4-tc1", input: "6 9\n-1 0 3 5 9 12", expectedOutput: "4", isSecret: false },
            { id: "dsa-l4-tc2", input: "6 2\n-1 0 3 5 9 12", expectedOutput: "-1", isSecret: false },
            { id: "dsa-l4-tc3", input: "1 5\n5", expectedOutput: "0", isSecret: true },
          ],
        },
      },
      {
        id: "dsa-lec5",
        lectureNumber: 5,
        unitNumber: 3,
        title: "Kadane's Algorithm: Maximum Subarray",
        description: "Dynamic programming approach for largest contiguous subarray sum in linear O(N) time.",
        note: {
          id: "dsa-lec5-note",
          title: "Kadane's Algorithm Mechanics",
          readTime: "04:30",
          content: `### Maximum Subarray Sum
\`currentMax = max(x, currentMax + x)\` and \`globalMax = max(globalMax, currentMax)\`.`,
          keyPoints: [
            "Runs in single pass O(N) with O(1) space.",
          ],
        },
        mcqs: [
          {
            id: "dsa-l5-q1",
            question: "What is the time complexity of Kadane's algorithm?",
            options: ["O(N^2)", "O(N log N)", "O(N)", "O(1)"],
            correctIndex: 2,
            explanation: "Single linear pass O(N).",
          },
        ],
        codingProblem: {
          id: "dsa-prob-max-subarray",
          title: "Maximum Subarray Sum",
          difficulty: "medium",
          companyTags: ["Amazon", "Microsoft", "LinkedIn"],
          description: "Given an integer array `nums`, find the subarray with the largest sum and return its sum.",
          inputFormat: "First line: `N`\nSecond line: `N` space-separated integers.",
          outputFormat: "Print the maximum subarray sum.",
          constraints: "1 <= N <= 10^5\n-10^4 <= nums[i] <= 10^4",
          sampleInput: "9\n-2 1 -3 4 -1 2 1 -5 4",
          sampleOutput: "6",
          explanation: "Subarray [4, -1, 2, 1] has the largest sum = 6.",
          starterCode: CLEAN_LAB_STARTER_CODE,
          testCases: [
            { id: "dsa-l5-tc1", input: "9\n-2 1 -3 4 -1 2 1 -5 4", expectedOutput: "6", isSecret: false },
            { id: "dsa-l5-tc2", input: "1\n1", expectedOutput: "1", isSecret: false },
            { id: "dsa-l5-tc3", input: "5\n5 4 -1 7 8", expectedOutput: "23", isSecret: true },
          ],
        },
      },
      {
        id: "dsa-lec6",
        lectureNumber: 6,
        unitNumber: 4,
        title: "Dynamic Programming: Climbing Stairs",
        description: "Optimal subproblems, recurrence relation f(n) = f(n-1) + f(n-2), and space-optimized Fibonacci DP.",
        note: {
          id: "dsa-lec6-note",
          title: "Fibonacci Sequence DP Formulation",
          readTime: "03:45",
          content: `### Climbing Stairs
To reach step n, you could have come from step n-1 or n-2. Thus ways(n) = ways(n-1) + ways(n-2).`,
          keyPoints: [
            "Identical to Fibonacci sequence.",
            "Can be computed in O(N) time and O(1) space.",
          ],
        },
        mcqs: [
          {
            id: "dsa-l6-q1",
            question: "How many ways are there to climb 3 stairs if you can take 1 or 2 steps?",
            options: ["2", "3", "4", "5"],
            correctIndex: 1,
            explanation: "3 ways: (1+1+1), (1+2), (2+1).",
          },
        ],
        codingProblem: {
          id: "dsa-prob-climb-stairs",
          title: "Distinct Stair Climbing Ways",
          difficulty: "easy",
          companyTags: ["Google", "Amazon"],
          description: "It takes `n` steps to reach the top. Each time you can climb 1 or 2 steps. In how many distinct ways can you climb to the top?",
          inputFormat: "A single integer `n`.",
          outputFormat: "Print the total number of distinct ways.",
          constraints: "1 <= n <= 45",
          sampleInput: "3",
          sampleOutput: "3",
          explanation: "1+1+1, 1+2, 2+1.",
          starterCode: CLEAN_LAB_STARTER_CODE,
          testCases: [
            { id: "dsa-l6-tc1", input: "2", expectedOutput: "2", isSecret: false },
            { id: "dsa-l6-tc2", input: "3", expectedOutput: "3", isSecret: false },
            { id: "dsa-l6-tc3", input: "5", expectedOutput: "8", isSecret: true },
          ],
        },
      },
    ],
  },

  // =========================================================================
  // 3. PYTHON PROGRAMMING LAB (CS101)
  // =========================================================================
  python: {
    id: "python",
    code: "2028_CSE101_Python Programming_LAB",
    name: "Python Programming & Computational Problem Solving LAB",
    shortTitle: "Python Lab",
    category: "Python Core",
    icon: "🐍",
    accentColor: "from-amber-500 to-orange-600",
    startDate: "6 Aug, 26",
    endDate: "31 Jan, 27",
    totalAssessments: 50,
    defaultLanguage: "python",
    lectures: [
      {
        id: "py-lec1",
        lectureNumber: 1,
        unitNumber: 1,
        title: "String Processing & Palindrome Algorithms",
        description: "Master string indexing, slicing, reversal tricks, sanitization, and palindrome testing in Python.",
        note: {
          id: "py-lec1-note",
          title: "String Slicing & Algorithmic Manipulation",
          readTime: "03:30",
          content: `### String Slicing in Python
\`s[::-1]\` produces a reversed string in O(N) time using step -1.`,
          keyPoints: [
            "Strings are immutable in Python.",
          ],
        },
        mcqs: [
          {
            id: "py-l1-q1",
            question: "What is 'Computer'[1:4] in Python?",
            options: ["'omp'", "'ompu'", "'Com'", "'Compute'"],
            correctIndex: 0,
            explanation: "Indices 1, 2, 3 give 'omp'.",
          },
        ],
        codingProblem: {
          id: "py-prob-palindrome",
          title: "Palindrome String Verifier",
          difficulty: "easy",
          companyTags: ["TCS NQT", "Cognizant", "Infosys"],
          description: "Given a string `s`, determine if it is a palindrome. Print `True` or `False`.",
          inputFormat: "A single line containing the string `s`.",
          outputFormat: "Print `True` if palindrome, else `False`.",
          constraints: "1 <= len(s) <= 1000",
          sampleInput: "madam",
          sampleOutput: "True",
          explanation: "'madam' backwards is 'madam'.",
          starterCode: CLEAN_LAB_STARTER_CODE,
          testCases: [
            { id: "py-l1-tc1", input: "madam", expectedOutput: "True", isSecret: false },
            { id: "py-l1-tc2", input: "hello", expectedOutput: "False", isSecret: false },
            { id: "py-l1-tc3", input: "12321", expectedOutput: "True", isSecret: true },
          ],
        },
      },
      {
        id: "py-lec2",
        lectureNumber: 2,
        unitNumber: 2,
        title: "Collections & Hash Sets: Contains Duplicate",
        description: "Utilizing Python `set` for O(1) membership testing and identifying duplicate elements.",
        note: {
          id: "py-lec2-note",
          title: "Python Set & Membership Complexity",
          readTime: "03:45",
          content: `### Set Data Structure
A set in Python uses a hash table. Checking \`x in s\` has average O(1) time complexity.`,
          keyPoints: [
            "Sets do not allow duplicate keys.",
          ],
        },
        mcqs: [
          {
            id: "py-l2-q1",
            question: "What is the average time complexity of checking membership in a Python set?",
            options: ["O(1)", "O(N)", "O(log N)", "O(N^2)"],
            correctIndex: 0,
            explanation: "Hash sets have average O(1) lookup.",
          },
        ],
        codingProblem: {
          id: "py-prob-contains-dup",
          title: "Duplicate Value Detector",
          difficulty: "easy",
          companyTags: ["Apple", "Adobe"],
          description: "Given array of N integers, return `true` if any value appears at least twice, otherwise `false`.",
          inputFormat: "First line: `N`\nSecond line: `N` space-separated integers.",
          outputFormat: "Print `true` or `false`.",
          constraints: "1 <= N <= 10^5",
          sampleInput: "4\n1 2 3 1",
          sampleOutput: "true",
          explanation: "1 appears twice.",
          starterCode: CLEAN_LAB_STARTER_CODE,
          testCases: [
            { id: "py-l2-tc1", input: "4\n1 2 3 1", expectedOutput: "true", isSecret: false },
            { id: "py-l2-tc2", input: "4\n1 2 3 4", expectedOutput: "false", isSecret: false },
            { id: "py-l2-tc3", input: "5\n9 8 7 6 9", expectedOutput: "true", isSecret: true },
          ],
        },
      },
      {
        id: "py-lec3",
        lectureNumber: 3,
        unitNumber: 2,
        title: "Dictionary Word & Character Frequency",
        description: "Building associative frequency tables in Python using dictionaries and sorting keys.",
        note: {
          id: "py-lec3-note",
          title: "Python Dictionaries & Key Value Mapping",
          readTime: "03:30",
          content: `### Python Dictionaries
Dictionaries map hashable keys to arbitrary values with fast O(1) access.`,
          keyPoints: [
            "Keys must be hashable (immutable).",
          ],
        },
        mcqs: [
          {
            id: "py-l3-q1",
            question: "Which data type CANNOT be used as a dictionary key in Python?",
            options: ["int", "string", "tuple", "list"],
            correctIndex: 3,
            explanation: "Lists are mutable and unhashable.",
          },
        ],
        codingProblem: {
          id: "py-prob-word-count",
          title: "Word Frequency Analyzer",
          difficulty: "easy",
          companyTags: ["Amazon", "Uber"],
          description: "Count the frequency of each unique space-separated word. Print them sorted alphabetically formatted as `word:count`.",
          inputFormat: "A single line containing words separated by spaces.",
          outputFormat: "Print each `word:count` on a new line.",
          constraints: "1 <= words <= 1000",
          sampleInput: "apple banana apple orange banana apple",
          sampleOutput: "apple:3\nbanana:2\norange:1",
          explanation: "apple:3, banana:2, orange:1.",
          starterCode: CLEAN_LAB_STARTER_CODE,
          testCases: [
            { id: "py-l3-tc1", input: "apple banana apple orange banana apple", expectedOutput: "apple:3\nbanana:2\norange:1", isSecret: false },
            { id: "py-l3-tc2", input: "cat dog bird", expectedOutput: "bird:1\ncat:1\ndog:1", isSecret: false },
            { id: "py-l3-tc3", input: "hello hello world", expectedOutput: "hello:2\nworld:1", isSecret: true },
          ],
        },
      },
    ],
  },

  // =========================================================================
  // 4. C PROGRAMMING LAB (CS101)
  // =========================================================================
  c: {
    id: "c",
    code: "2028_C programming_LAB_Reappear_Regular",
    name: "C Programming & Systems Engineering LAB",
    shortTitle: "C Lab",
    category: "C Foundations",
    icon: "⚡",
    accentColor: "from-sky-600 to-blue-700",
    startDate: "6 Aug, 26",
    endDate: "31 Jan, 27",
    totalAssessments: 84,
    defaultLanguage: "c",
    lectures: [
      {
        id: "c-lec1",
        lectureNumber: 1,
        unitNumber: 1,
        title: "Pointers & Value Swapping",
        description: "Understanding pointer addresses (&), dereferencing (*), and implementing pass-by-reference swap.",
        note: {
          id: "c-lec1-note",
          title: "Pointer Mechanics in C",
          readTime: "04:15",
          content: `### Pointers in C
Pointers store memory addresses of variables. Passing addresses allows mutating caller stack frames.`,
          keyPoints: [
            "`&` gets the memory address.",
            "`*` dereferences the value at that address.",
          ],
        },
        mcqs: [
          {
            id: "c-l1-q1",
            question: "What is the size of an int* pointer on a 64-bit operating system?",
            options: ["4 bytes", "8 bytes", "2 bytes", "16 bytes"],
            correctIndex: 1,
            explanation: "Addresses on 64-bit OS are 8 bytes.",
          },
        ],
        codingProblem: {
          id: "c-prob-swap",
          title: "Pointer Swap Operation",
          difficulty: "easy",
          companyTags: ["Qualcomm", "Embedded", "TCS Ninja"],
          description: "Read two integers `a` and `b`, swap their values using pointers, and print the swapped values.",
          inputFormat: "Two space-separated integers `a` and `b`.",
          outputFormat: "Print the swapped integers separated by a space.",
          constraints: "-10^6 <= a, b <= 10^6",
          sampleInput: "10 20",
          sampleOutput: "20 10",
          explanation: "10 and 20 swapped give 20 10.",
          starterCode: CLEAN_LAB_STARTER_CODE,
          testCases: [
            { id: "c-l1-tc1", input: "10 20", expectedOutput: "20 10", isSecret: false },
            { id: "c-l1-tc2", input: "-5 99", expectedOutput: "99 -5", isSecret: false },
            { id: "c-l1-tc3", input: "0 42", expectedOutput: "42 0", isSecret: true },
          ],
        },
      },
      {
        id: "c-lec2",
        lectureNumber: 2,
        unitNumber: 1,
        title: "Bitwise Operators & Even-Odd Checking",
        description: "Harnessing bitwise AND (`& 1`) and shift operators for high-speed hardware level arithmetic.",
        note: {
          id: "c-lec2-note",
          title: "Bitwise Operations in C",
          readTime: "03:30",
          content: `### Bitwise Operators
\`n & 1\` tests the least significant bit (LSB). If LSB is 1, number is odd; if 0, even.`,
          keyPoints: [
            "Bitwise operations execute in 1 CPU clock cycle.",
          ],
        },
        mcqs: [
          {
            id: "c-l2-q1",
            question: "What does the expression (x & 1) evaluate to for an odd number?",
            options: ["0", "1", "x", "-1"],
            correctIndex: 1,
            explanation: "Odd numbers have LSB set to 1.",
          },
        ],
        codingProblem: {
          id: "c-prob-bitwise-evenodd",
          title: "Bitwise Even-Odd Classifier",
          difficulty: "easy",
          companyTags: ["Intel", "ARM"],
          description: "Given an integer `N`, determine if it is Even or Odd using bitwise AND operator `&`.",
          inputFormat: "A single integer `N`.",
          outputFormat: "Print `Even` or `Odd`.",
          constraints: "-10^9 <= N <= 10^9",
          sampleInput: "42",
          sampleOutput: "Even",
          explanation: "42 is even.",
          starterCode: CLEAN_LAB_STARTER_CODE,
          testCases: [
            { id: "c-l2-tc1", input: "42", expectedOutput: "Even", isSecret: false },
            { id: "c-l2-tc2", input: "17", expectedOutput: "Odd", isSecret: false },
            { id: "c-l2-tc3", input: "0", expectedOutput: "Even", isSecret: true },
          ],
        },
      },
      {
        id: "c-lec3",
        lectureNumber: 3,
        unitNumber: 2,
        title: "Prime Number Generator & Loop Control",
        description: "Optimizing primality tests up to `sqrt(N)` with break conditions and iteration control.",
        note: {
          id: "c-lec3-note",
          title: "Primality Testing Complexity",
          readTime: "04:00",
          content: `### Primality Testing
Trial division up to \`sqrt(N)\` reduces complexity from O(N) to O(sqrt(N)).`,
          keyPoints: [
            "2 is the only even prime number.",
          ],
        },
        mcqs: [
          {
            id: "c-l3-q1",
            question: "What is the time complexity of checking if N is prime using trial division up to sqrt(N)?",
            options: ["O(N)", "O(sqrt(N))", "O(log N)", "O(1)"],
            correctIndex: 1,
            explanation: "Loops up to sqrt(N).",
          },
        ],
        codingProblem: {
          id: "c-prob-prime-check",
          title: "Primality Verifier",
          difficulty: "easy",
          companyTags: ["TCS", "Cognizant"],
          description: "Given an integer `N`, print `Prime` if it is a prime number, otherwise print `Not Prime`.",
          inputFormat: "An integer `N`.",
          outputFormat: "Print `Prime` or `Not Prime`.",
          constraints: "1 <= N <= 10^9",
          sampleInput: "29",
          sampleOutput: "Prime",
          explanation: "29 has no divisors other than 1 and 29.",
          starterCode: CLEAN_LAB_STARTER_CODE,
          testCases: [
            { id: "c-l3-tc1", input: "29", expectedOutput: "Prime", isSecret: false },
            { id: "c-l3-tc2", input: "1", expectedOutput: "Not Prime", isSecret: false },
            { id: "c-l3-tc3", input: "4", expectedOutput: "Not Prime", isSecret: true },
            { id: "c-l3-tc4", input: "97", expectedOutput: "Prime", isSecret: true },
          ],
        },
      },
    ],
  },
};
