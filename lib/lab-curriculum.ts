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
    // Write your code here
    
    return 0;
}
`,
  python: `# Write your code here
import sys

def main():
    pass

if __name__ == "__main__":
    main()
`,
  c: `#include <stdio.h>

int main() {
    // Write your code here
    
    return 0;
}
`,
};

export const LAB_COURSES: Record<"c" | "cpp" | "python" | "dsa", LabCourse> = {
  // =========================================================================
  // 1. C++ OBJECT ORIENTED PROGRAMMING LAB (Matches Screenshot)
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
        description: "Understanding encapsulation, class definition, public/private access specifiers, and member function definition.",
        note: {
          id: "cpp-lec1-note",
          title: "Introduction to Classes and Objects in C++",
          readTime: "04:30",
          content: `### 1. Introduction to Classes & Objects
A class in C++ is a user-defined blueprint or prototype from which objects are created. It encapsulates data members (variables) and member functions (methods) into a single logical unit.

\`\`\`cpp
#include <iostream>
using namespace std;

class Student {
private:
    int rollNumber;
    string name;

public:
    void setData(int r, string n) {
        rollNumber = r;
        name = n;
    }
    void display() {
        cout << "Roll: " << rollNumber << ", Name: " << name << endl;
    }
};
\`\`\`

### 2. Access Specifiers
- **private**: Data members and functions can only be accessed within the class.
- **public**: Members are accessible from anywhere outside the class.
- **protected**: Members are accessible within the class and its derived (child) classes.`,
          keyPoints: [
            "Encapsulation binds data and functions together, preventing unauthorized direct access.",
            "By default, all members in a C++ `class` are private (unlike a `struct` where members default to public).",
            "Member functions can be defined inside the class or outside using the scope resolution operator `::`.",
          ],
        },
        mcqs: [
          {
            id: "cpp-l1-q1",
            question: "What is the default access specifier for members of a C++ class?",
            options: ["public", "protected", "private", "internal"],
            correctIndex: 2,
            explanation: "In C++, members of a class are private by default, whereas in a struct they are public by default.",
          },
          {
            id: "cpp-l1-q2",
            question: "Which operator is used to define a member function outside the class definition?",
            options: [": (Single colon)", ":: (Scope resolution operator)", "-> (Arrow operator)", ". (Dot operator)"],
            correctIndex: 1,
            explanation: "The scope resolution operator `::` qualifies the function name with its enclosing class scope.",
          },
          {
            id: "cpp-l1-q3",
            question: "What will the following code output?",
            codeSnippet: `#include <iostream>
using namespace std;
class Box {
    int val = 10;
public:
    void print() { cout << val; }
};
int main() {
    Box b;
    b.print();
    return 0;
}`,
            options: ["Compilation Error", "10", "Garbage value", "0"],
            correctIndex: 1,
            explanation: "In modern C++, in-class member initialization `int val = 10;` is valid and initializes `val` to 10.",
          },
        ],
        codingProblem: {
          id: "cpp-prob-student-record",
          title: "Student Record Calculator",
          difficulty: "easy",
          description: "Create a class `Student` with private members `rollNumber`, `marks1`, `marks2`, and `marks3`. Read the student details from standard input and compute the total marks and average percentage.",
          inputFormat: "First line contains an integer `rollNumber`.\nSecond line contains three space-separated integers representing `marks1`, `marks2`, and `marks3`.",
          outputFormat: "Print the total marks and average percentage formatted as `Total: <sum>, Average: <avg>` (average rounded to 2 decimal places).",
          constraints: "1 <= rollNumber <= 10000\n0 <= marks <= 100",
          sampleInput: "101\n85 90 95",
          sampleOutput: "Total: 270, Average: 90.00",
          explanation: "Total = 85 + 90 + 95 = 270. Average = 270 / 3 = 90.00.",
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
        description: "Default constructors, parameterized constructors, copy constructors, constructor delegation, and deterministic destructors.",
        note: {
          id: "cpp-lec2-note",
          title: "Constructors, Destructors & RAII in C++",
          readTime: "05:00",
          content: `### 1. Constructors in C++
A constructor is a special member function with the same name as the class that is invoked automatically when an object is instantiated. It has no return type.

\`\`\`cpp
class Rectangle {
    int width, height;
public:
    // Parameterized constructor with initializer list
    Rectangle(int w, int h) : width(w), height(h) {}
    
    // Destructor
    ~Rectangle() {
        // Cleanup code
    }
};
\`\`\`

### 2. Copy Constructor
Initializes an object using another object of the same class:
\`\`\`cpp
Rectangle(const Rectangle &other) : width(other.width), height(other.height) {}
\`\`\``,
          keyPoints: [
            "Constructors cannot be virtual, but destructors should be declared virtual in polymorphic base classes.",
            "Member initializer lists (`: member(val)`) initialize members before the constructor body executes.",
            "RAII (Resource Acquisition Is Initialization) relies on destructors to release memory and resources safely.",
          ],
        },
        mcqs: [
          {
            id: "cpp-l2-q1",
            question: "Which constructor is called when an object is declared as: `MyClass obj2 = obj1;`?",
            options: ["Default constructor", "Copy constructor", "Move constructor", "Destructor"],
            correctIndex: 1,
            explanation: "Initializing a new object with an existing object of the same class invokes the copy constructor.",
          },
          {
            id: "cpp-l2-q2",
            question: "Why should a base class destructor be declared as virtual?",
            options: [
              "To allow private destructor access",
              "To ensure the derived class destructor is called when deleting via a base pointer",
              "To speed up object construction",
              "Virtual destructors are mandatory for all C++ classes",
            ],
            correctIndex: 1,
            explanation: "Without a virtual base destructor, deleting a derived object via a base pointer causes undefined behavior and resource leaks.",
          },
        ],
        codingProblem: {
          id: "cpp-prob-complex-numbers",
          title: "Complex Number Addition using Constructors",
          difficulty: "easy",
          description: "Design a class `Complex` with real and imaginary parts. Use parameterized constructors to initialize two complex numbers and write a method `add` that returns their sum in the format `A + Bi`.",
          inputFormat: "Single line containing four space-separated integers: `r1 i1 r2 i2`.",
          outputFormat: "Print the resultant complex number in the format `<R> + <I>i` (or `<R> - <I>i` if imaginary part is negative).",
          constraints: "-1000 <= r1, i1, r2, i2 <= 1000",
          sampleInput: "3 4 5 6",
          sampleOutput: "8 + 10i",
          explanation: "(3 + 4i) + (5 + 6i) = (3+5) + (4+6)i = 8 + 10i.",
          starterCode: CLEAN_LAB_STARTER_CODE,
          testCases: [
            { id: "cpp-l2-tc1", input: "3 4 5 6", expectedOutput: "8 + 10i", isSecret: false },
            { id: "cpp-l2-tc2", input: "10 -5 2 3", expectedOutput: "12 - 2i", isSecret: false },
            { id: "cpp-l2-tc3", input: "-20 -30 15 10", expectedOutput: "-5 - 20i", isSecret: true },
          ],
        },
      },
      {
        id: "cpp-lec18",
        lectureNumber: 18,
        unitNumber: 3,
        title: "Opening and Closing of Files & Stream Modes",
        description: "File stream classes (ifstream, ofstream, fstream), opening modes (ios::in, ios::out, ios::app, ios::binary), and error handling.",
        note: {
          id: "cpp-lec18-note",
          title: "File Handling & Stream Modes in C++",
          readTime: "03:00",
          content: `### 1. C++ File Streams Hierarchy
C++ provides standard classes in \`<fstream>\`:
- **ifstream**: Input file stream for reading data.
- **ofstream**: Output file stream for creating and writing data.
- **fstream**: Input and output stream for simultaneous read/write operations.

\`\`\`cpp
#include <fstream>
using namespace std;

int main() {
    ofstream outFile("data.txt", ios::out | ios::app);
    if (outFile.is_open()) {
        outFile << "Appending text to file\\n";
        outFile.close();
    }
    return 0;
}
\`\`\`

### 2. Common File Modes
| Mode Flag | Description |
| :--- | :--- |
| \`ios::in\` | Open file for reading |
| \`ios::out\` | Open file for writing (truncates existing file) |
| \`ios::app\` | Append data to the end of the file |
| \`ios::trunc\` | Truncate file if it already exists |
| \`ios::binary\` | Open in binary mode instead of text mode |`,
          keyPoints: [
            "Always check `file.is_open()` before reading or writing.",
            "Closing a stream explicitly with `.close()` flushes internal write buffers.",
            "Destructors of fstream objects close open files automatically when leaving scope.",
          ],
        },
        mcqs: [
          {
            id: "cpp-l18-q1",
            question: "Which file mode flag opens a file and appends content to the end without truncating?",
            options: ["ios::out", "ios::trunc", "ios::app", "ios::ate"],
            correctIndex: 2,
            explanation: "`ios::app` (append mode) ensures all write operations are performed at the end of the file.",
          },
          {
            id: "cpp-l18-q2",
            question: "Which header file is required to work with C++ file streams (ifstream, ofstream)?",
            options: ["<iostream>", "<fstream>", "<stdio.h>", "<iomanip>"],
            correctIndex: 1,
            explanation: "`#include <fstream>` contains declarations for ifstream, ofstream, and fstream.",
          },
        ],
        codingProblem: {
          id: "cpp-prob-file-word-counter",
          title: "Stream Word & Character Counter",
          difficulty: "easy",
          description: "Simulate a file stream processor. Given text from standard input, count the total number of lines, words, and non-whitespace characters.",
          inputFormat: "Multiline text from standard input until EOF.",
          outputFormat: "Print `Words: <count>, Characters: <count>`.",
          constraints: "Total characters <= 10000",
          sampleInput: "Object Oriented Programming in CPP\nFile streams and memory management",
          sampleOutput: "Words: 9, Characters: 62",
          explanation: "There are 9 space-separated words and 62 non-whitespace characters.",
          starterCode: CLEAN_LAB_STARTER_CODE,
          testCases: [
            { id: "cpp-l18-tc1", input: "Object Oriented Programming in CPP\nFile streams and memory management", expectedOutput: "Words: 9, Characters: 62", isSecret: false },
            { id: "cpp-l18-tc2", input: "Hello World", expectedOutput: "Words: 2, Characters: 10", isSecret: false },
            { id: "cpp-l18-tc3", input: "Data Structures and Algorithms in C++ STL", expectedOutput: "Words: 7, Characters: 35", isSecret: true },
          ],
        },
      },
    ],
  },

  // =========================================================================
  // 2. DATA STRUCTURES & ALGORITHMS LAB (Matches Screenshot)
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
          content: `### Two-Sum Problem Formulation
Given an array of integers \`nums\` and an integer \`target\`, find the indices of the two numbers such that they add up to \`target\`.

#### Approach 1: Hash Map (O(N) Time, O(N) Space)
We iterate through the array once. For each element \`x\`, we calculate its complement \`target - x\` and check if it already exists in our hash table.

\`\`\`python
def two_sum(nums, target):
    seen = {}
    for i, num in enumerate(nums):
        comp = target - num
        if comp in seen:
            return [seen[comp], i]
        seen[num] = i
    return []
\`\`\`

#### Approach 2: Two Pointers on Sorted Arrays (O(N log N) Time, O(1) Space)
If the array is sorted, we place one pointer at the start and one at the end, moving inward depending on whether the current sum is less than or greater than \`target\`.`,
          keyPoints: [
            "Hash maps allow complement lookup in O(1) average time.",
            "The two-pointer technique avoids extra space if the array is already sorted.",
          ],
        },
        mcqs: [
          {
            id: "dsa-l1-q1",
            question: "What is the optimal time complexity to solve the Two Sum problem using a hash map?",
            options: ["O(N^2)", "O(N log N)", "O(N)", "O(1)"],
            correctIndex: 2,
            explanation: "A single pass through the array with O(1) hash map lookups achieves O(N) linear time complexity.",
          },
          {
            id: "dsa-l1-q2",
            question: "When can the two-pointer technique be directly applied without extra memory?",
            options: [
              "When the array is sorted",
              "When the array has negative numbers only",
              "When the array size is a power of 2",
              "Any unsorted array",
            ],
            correctIndex: 0,
            explanation: "The directional decisions (moving left pointer rightward or right pointer leftward) depend on sorted monotonicity.",
          },
        ],
        codingProblem: {
          id: "dsa-prob-twosum",
          title: "Two Sum Indices Finder",
          difficulty: "easy",
          description: "Given an integer array and a target sum, output the 0-based indices of the two numbers that add up to target.",
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
        description: "LIFO stack mechanics for balancing brackets, matching opening with closing characters, and detecting syntax errors.",
        note: {
          id: "dsa-lec2-note",
          title: "Balanced Brackets using Stack (LIFO)",
          readTime: "03:45",
          content: `### Problem Overview
Given a string containing \`(\`, \`)\`, \`{\`, \`}\`, \`[\`, \`]\`, determine if the input string has valid matching parentheses.

\`\`\`python
def isValid(s: str) -> bool:
    stack = []
    mapping = {")": "(", "}": "{", "]": "["}
    for char in s:
        if char in mapping:
            top = stack.pop() if stack else '#'
            if mapping[char] != top:
                return False
        else:
            stack.append(char)
    return not stack
\`\`\``,
          keyPoints: [
            "Every closing bracket must match the most recently opened bracket.",
            "An empty stack at the end signifies complete balance.",
          ],
        },
        mcqs: [
          {
            id: "dsa-l2-q1",
            question: "Which data structure follows the Last-In, First-Out (LIFO) order?",
            options: ["Queue", "Stack", "Binary Heap", "Linked List"],
            correctIndex: 1,
            explanation: "Stacks strictly follow LIFO where the last element pushed is the first to be popped.",
          },
          {
            id: "dsa-l2-q2",
            question: "What is the time complexity of validating a string of length N using a stack?",
            options: ["O(N)", "O(N^2)", "O(log N)", "O(1)"],
            correctIndex: 0,
            explanation: "Each character is pushed and popped at most once, resulting in linear O(N) time.",
          },
        ],
        codingProblem: {
          id: "dsa-prob-valid-parens",
          title: "Valid Parentheses Checker",
          difficulty: "easy",
          description: "Given a string `s` containing just characters `(`, `)`, `{`, `}`, `[` and `]`, determine if the input string is valid. Print `Valid` or `Invalid`.",
          inputFormat: "A single line containing the bracket string `s`.",
          outputFormat: "Print `Valid` if brackets are balanced, otherwise `Invalid`.",
          constraints: "1 <= len(s) <= 10000",
          sampleInput: "()[]{}",
          sampleOutput: "Valid",
          explanation: "All brackets open and close in matching pairs.",
          starterCode: CLEAN_LAB_STARTER_CODE,
          testCases: [
            { id: "dsa-l2-tc1", input: "()[]{}", expectedOutput: "Valid", isSecret: false },
            { id: "dsa-l2-tc2", input: "(]", expectedOutput: "Invalid", isSecret: false },
            { id: "dsa-l2-tc3", input: "([{}])", expectedOutput: "Valid", isSecret: true },
          ],
        },
      },
    ],
  },

  // =========================================================================
  // 3. PYTHON PROGRAMMING LAB (Matches Screenshot)
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
Python strings are indexed starting at 0. Negative indices count backward from -1.

\`\`\`python
s = "madam"
is_palindrome = s == s[::-1]
\`\`\`

The slice \`s[::-1]\` uses a step of \`-1\` to produce a reversed copy of the string in O(N) time.`,
          keyPoints: [
            "Strings are immutable in Python.",
            "Case-insensitive comparisons should normalize with `.lower()`.",
          ],
        },
        mcqs: [
          {
            id: "py-l1-q1",
            question: "What is the result of 'Computer'[1:4] in Python?",
            options: ["'omp'", "'ompu'", "'Com'", "'Compute'"],
            correctIndex: 0,
            explanation: "Slice [1:4] extracts characters at indices 1, 2, and 3 ('o', 'm', 'p').",
          },
          {
            id: "py-l1-q2",
            question: "Which method removes leading and trailing whitespace from a Python string?",
            options: ["trim()", "strip()", "clean()", "delete()"],
            correctIndex: 1,
            explanation: "`.strip()` strips leading and trailing whitespace characters.",
          },
        ],
        codingProblem: {
          id: "py-prob-palindrome",
          title: "Palindrome String Verifier",
          difficulty: "easy",
          description: "Given a string `s`, determine if it is a palindrome ignoring case and alphanumeric characters. Print `True` or `False`.",
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
    ],
  },

  // =========================================================================
  // 4. C PROGRAMMING LAB (Matches Screenshot)
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
A pointer is a variable that stores the memory address of another variable.

\`\`\`c
void swap(int *a, int *b) {
    int temp = *a;
    *a = *b;
    *b = temp;
}
\`\`\`

Passing memory addresses allows the function to mutate variables residing in the caller's stack frame.`,
          keyPoints: [
            "The `&` operator returns the memory address of a variable.",
            "The `*` dereference operator accesses the value stored at that address.",
          ],
        },
        mcqs: [
          {
            id: "c-l1-q1",
            question: "What is the size of an integer pointer (int*) on a 64-bit operating system?",
            options: ["4 bytes", "8 bytes", "2 bytes", "16 bytes"],
            correctIndex: 1,
            explanation: "On 64-bit architectures, memory addresses are 64 bits wide (8 bytes).",
          },
          {
            id: "c-l1-q2",
            question: "What does the expression `*ptr` do when `ptr` is a pointer to `int`?",
            options: [
              "Returns the memory address of ptr",
              "Accesses the value of the integer stored at the address in ptr",
              "Increments ptr by 4 bytes",
              "Frees the memory at ptr",
            ],
            correctIndex: 1,
            explanation: "Dereferencing retrieves the value located at the target memory address.",
          },
        ],
        codingProblem: {
          id: "c-prob-swap",
          title: "Pointer Swap Operation",
          difficulty: "easy",
          description: "Read two integers `a` and `b`, swap their values using pointers, and print the swapped values.",
          inputFormat: "Two space-separated integers `a` and `b`.",
          outputFormat: "Print the swapped integers separated by a space.",
          constraints: "-10^6 <= a, b <= 10^6",
          sampleInput: "10 20",
          sampleOutput: "20 10",
          explanation: "10 and 20 are swapped to 20 10.",
          starterCode: CLEAN_LAB_STARTER_CODE,
          testCases: [
            { id: "c-l1-tc1", input: "10 20", expectedOutput: "20 10", isSecret: false },
            { id: "c-l1-tc2", input: "-5 99", expectedOutput: "99 -5", isSecret: false },
            { id: "c-l1-tc3", input: "0 42", expectedOutput: "42 0", isSecret: true },
          ],
        },
      },
    ],
  },
};
