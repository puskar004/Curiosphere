import type { CodingProblem } from "./coding-types";

export const CLEAN_STARTER_CODE: Record<string, string> = {
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
  cpp: `#include <iostream>
using namespace std;

int main() {
    // Write your solution here
    
    return 0;
}
`,
};


export const CODING_PROBLEMS: CodingProblem[] = [
  // --- PYTHON TRACK ---
  {
    id: "py-palindrome",
    title: "Palindrome Checker",
    track: "python",
    difficulty: "easy",
    tags: ["Strings", "CBSE Class 11", "Basics"],
    description:
      "Given a string `s`, determine if it is a palindrome. A string is a palindrome if it reads the same backwards as forwards (ignoring case and whitespace).",
    inputFormat: "A single line containing the string `s`.",
    outputFormat: "Print `True` if the string is a palindrome, otherwise print `False`.",
    constraints: "1 <= len(s) <= 1000",
    sampleInput: "madam",
    sampleOutput: "True",
    explanation: "'madam' reversed is 'madam', so it is a palindrome.",
    starterCode: CLEAN_STARTER_CODE,
    testCases: [
      { id: "tc-1", input: "madam", expectedOutput: "True" },
      { id: "tc-2", input: "hello", expectedOutput: "False" },
      { id: "tc-3", input: "Race car", expectedOutput: "True" },
      { id: "tc-4", input: "12321", expectedOutput: "True", isSecret: true },
    ],
  },
  {
    id: "py-second-largest",
    title: "Find Second Largest Element",
    track: "python",
    difficulty: "easy",
    tags: ["Arrays", "Lists", "CBSE CS"],
    description:
      "Given an array of integers, find the second largest unique element in the array. If no second largest element exists, print -1.",
    inputFormat: "Line 1: An integer n. Line 2: n space-separated integers.",
    outputFormat: "Print the second largest integer, or -1.",
    constraints: "2 <= n <= 10^5, -10^6 <= arr[i] <= 10^6",
    sampleInput: "5\n12 35 1 10 34",
    sampleOutput: "34",
    explanation: "The largest element is 35, and the second largest is 34.",
    starterCode: CLEAN_STARTER_CODE,
    testCases: [
      { id: "tc-1", input: "5\n12 35 1 10 34", expectedOutput: "34" },
      { id: "tc-2", input: "4\n10 10 10 10", expectedOutput: "-1" },
      { id: "tc-3", input: "3\n5 20 20", expectedOutput: "5" },
    ],
  },
  {
    id: "py-word-frequency",
    title: "Word Frequency Counter",
    track: "python",
    difficulty: "medium",
    tags: ["Dictionaries", "Hash Maps", "Strings"],
    description:
      "Given a sentence, count the frequency of each unique word (case-insensitive). Print the words sorted alphabetically followed by their frequency separated by a colon.",
    inputFormat: "A single line containing the sentence.",
    outputFormat: "Each unique word and its count formatted as `word: count` in alphabetical order on separate lines.",
    constraints: "1 <= len(text) <= 5000",
    sampleInput: "apple banana Apple apple Orange",
    sampleOutput: "apple: 3\nbanana: 1\norange: 1",
    explanation: "'apple' appears 3 times (case-insensitive), 'banana' 1 time, 'orange' 1 time.",
    starterCode: CLEAN_STARTER_CODE,
    testCases: [
      {
        id: "tc-1",
        input: "apple banana Apple apple Orange",
        expectedOutput: "apple: 3\nbanana: 1\norange: 1",
      },
      {
        id: "tc-2",
        input: "cat Dog dog CAT bird",
        expectedOutput: "bird: 1\ncat: 2\ndog: 2",
      },
    ],
  },

  // --- C TRACK ---
  {
    id: "c-pointer-swap",
    title: "Swap Two Numbers Using Pointers",
    track: "c",
    difficulty: "easy",
    tags: ["Pointers", "Memory", "Basics"],
    description:
      "Write a C program to swap two integers using pointers without returning values from a function.",
    inputFormat: "Two space-separated integers `a` and `b`.",
    outputFormat: "Print the swapped values separated by a space.",
    constraints: "-10^9 <= a, b <= 10^9",
    sampleInput: "10 20",
    sampleOutput: "20 10",
    explanation: "Original: a=10, b=20. After swap: a=20, b=10.",
    starterCode: CLEAN_STARTER_CODE,
    testCases: [
      { id: "tc-1", input: "10 20", expectedOutput: "20 10" },
      { id: "tc-2", input: "-5 99", expectedOutput: "99 -5" },
      { id: "tc-3", input: "0 42", expectedOutput: "42 0" },
    ],
  },
  {
    id: "c-armstrong",
    title: "Armstrong Number Checker",
    track: "c",
    difficulty: "easy",
    tags: ["Numbers", "Loops", "Math"],
    description:
      "An Armstrong number of three digits is an integer such that the sum of the cubes of its digits is equal to the number itself. Determine if a given positive integer n is an Armstrong number.",
    inputFormat: "A single positive integer `n`.",
    outputFormat: "Print `Yes` if n is an Armstrong number, otherwise `No`.",
    constraints: "1 <= n <= 9999",
    sampleInput: "153",
    sampleOutput: "Yes",
    explanation: "1^3 + 5^3 + 3^3 = 1 + 125 + 27 = 153.",
    starterCode: CLEAN_STARTER_CODE,
    testCases: [
      { id: "tc-1", input: "153", expectedOutput: "Yes" },
      { id: "tc-2", input: "370", expectedOutput: "Yes" },
      { id: "tc-3", input: "123", expectedOutput: "No" },
      { id: "tc-4", input: "1634", expectedOutput: "Yes", isSecret: true },
    ],
  },

  // --- C++ TRACK ---
  {
    id: "cpp-stl-vector-sort",
    title: "Vector Frequency & Sorting",
    track: "cpp",
    difficulty: "easy",
    tags: ["STL", "Sorting", "Vectors"],
    description:
      "Given n integers, read them into a vector, sort them in ascending order, and print each unique number followed by its occurrence count.",
    inputFormat: "Line 1: Integer n. Line 2: n space-separated integers.",
    outputFormat: "Sorted unique numbers with frequency as `num:count`.",
    constraints: "1 <= n <= 10^5",
    sampleInput: "6\n4 2 4 1 2 4",
    sampleOutput: "1:1\n2:2\n4:3",
    explanation: "Sorted elements: 1 (occurs 1 time), 2 (occurs 2 times), 4 (occurs 3 times).",
    starterCode: CLEAN_STARTER_CODE,
    testCases: [
      { id: "tc-1", input: "6\n4 2 4 1 2 4", expectedOutput: "1:1\n2:2\n4:3" },
      { id: "tc-2", input: "3\n10 10 10", expectedOutput: "10:3" },
    ],
  },

  // --- DSA TRACK ---
  {
    id: "dsa-two-sum",
    title: "Two Sum Problem",
    track: "dsa",
    difficulty: "easy",
    tags: ["Arrays", "Hash Map", "DSA Milestone"],
    description:
      "Given an array of integers `nums` and an integer `target`, return the indices of the two numbers such that they add up to `target`. You may assume that each input would have exactly one solution, and you may not use the same element twice. Print the 0-indexed indices separated by space in ascending order.",
    inputFormat: "Line 1: Two integers `n` (array length) and `target`.\nLine 2: `n` space-separated integers.",
    outputFormat: "Two indices `i` and `j` where `nums[i] + nums[j] == target`.",
    constraints: "2 <= n <= 10^5, -10^9 <= nums[i] <= 10^9",
    sampleInput: "4 9\n2 7 11 15",
    sampleOutput: "0 1",
    explanation: "nums[0] + nums[1] == 2 + 7 == 9, so output is 0 1.",
    starterCode: CLEAN_STARTER_CODE,
    testCases: [
      { id: "tc-1", input: "4 9\n2 7 11 15", expectedOutput: "0 1" },
      { id: "tc-2", input: "3 6\n3 2 4", expectedOutput: "1 2" },
      { id: "tc-3", input: "2 6\n3 3", expectedOutput: "0 1" },
    ],
  },
  {
    id: "dsa-valid-parentheses",
    title: "Valid Parentheses (Stack)",
    track: "dsa",
    difficulty: "easy",
    tags: ["Stack", "Strings", "DSA Milestone"],
    description:
      "Given a string `s` containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.\nAn input string is valid if open brackets are closed by the same type of brackets in the correct order.",
    inputFormat: "A single line containing the bracket string `s`.",
    outputFormat: "Print `Valid` if the string is balanced, otherwise `Invalid`.",
    constraints: "1 <= len(s) <= 10^4",
    sampleInput: "()[]{}",
    sampleOutput: "Valid",
    explanation: "All opening brackets are properly closed in correct order.",
    starterCode: CLEAN_STARTER_CODE,
    testCases: [
      { id: "tc-1", input: "()[]{}", expectedOutput: "Valid" },
      { id: "tc-2", input: "(]", expectedOutput: "Invalid" },
      { id: "tc-3", input: "([{}])", expectedOutput: "Valid" },
      { id: "tc-4", input: "{[()]}", expectedOutput: "Valid" },
    ],
  },
  {
    id: "dsa-binary-search",
    title: "Binary Search Algorithm",
    track: "dsa",
    difficulty: "medium",
    tags: ["Searching", "Divide and Conquer", "O(log N)"],
    description:
      "Given a sorted array of `n` integers and a `target` value, implement Binary Search to find the 0-based index of `target`. If target is not present, print -1.",
    inputFormat: "Line 1: `n` and `target`.\nLine 2: `n` sorted integers.",
    outputFormat: "Print the index of `target`, or `-1`.",
    constraints: "1 <= n <= 10^5, -10^9 <= target, arr[i] <= 10^9",
    sampleInput: "6 9\n-1 0 3 5 9 12",
    sampleOutput: "4",
    explanation: "9 exists in nums and its index is 4.",
    starterCode: CLEAN_STARTER_CODE,
    testCases: [
      { id: "tc-1", input: "6 9\n-1 0 3 5 9 12", expectedOutput: "4" },
      { id: "tc-2", input: "6 2\n-1 0 3 5 9 12", expectedOutput: "-1" },
    ],
  },
  {
    id: "dsa-max-subarray",
    title: "Maximum Subarray (Kadane's Algorithm)",
    track: "dsa",
    difficulty: "hard",
    tags: ["Dynamic Programming", "Kadane", "Arrays"],
    description:
      "Given an integer array `nums`, find the subarray with the largest sum, and print its sum.",
    inputFormat: "Line 1: Integer `n`.\nLine 2: `n` space-separated integers.",
    outputFormat: "Print the maximum subarray sum.",
    constraints: "1 <= n <= 10^5, -10^4 <= nums[i] <= 10^4",
    sampleInput: "9\n-2 1 -3 4 -1 2 1 -5 4",
    sampleOutput: "6",
    explanation: "The subarray [4, -1, 2, 1] has the largest sum 6.",
    starterCode: CLEAN_STARTER_CODE,
    testCases: [
      { id: "tc-1", input: "9\n-2 1 -3 4 -1 2 1 -5 4", expectedOutput: "6" },
      { id: "tc-2", input: "1\n1", expectedOutput: "1" },
      { id: "tc-3", input: "5\n5 4 -1 7 8", expectedOutput: "23" },
    ],
  },
];
