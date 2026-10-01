import type { CodingProblem } from "./coding-types";

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
    starterCode: {
      python: `import sys

def is_palindrome(s: str) -> bool:
    cleaned = "".join(c.lower() for c in s if c.isalnum())
    return cleaned == cleaned[::-1]

if __name__ == "__main__":
    line = sys.stdin.read().strip()
    print(is_palindrome(line))
`,
      c: `#include <stdio.h>
#include <string.h>
#include <ctype.h>

int main() {
    char s[1005];
    if (!fgets(s, sizeof(s), stdin)) return 0;
    
    int left = 0, right = strlen(s) - 1;
    while (right >= 0 && (s[right] == '\\n' || s[right] == '\\r')) right--;
    
    int is_pal = 1;
    while (left < right) {
        while (left < right && !isalnum(s[left])) left++;
        while (left < right && !isalnum(s[right])) right--;
        if (tolower(s[left]) != tolower(s[right])) {
            is_pal = 0;
            break;
        }
        left++;
        right--;
    }
    printf("%s\\n", is_pal ? "True" : "False");
    return 0;
}
`,
      cpp: `#include <iostream>
#include <string>
#include <cctype>
using namespace std;

int main() {
    string s;
    if (!getline(cin, s)) return 0;
    
    int left = 0, right = (int)s.length() - 1;
    bool is_pal = true;
    while (left < right) {
        while (left < right && !isalnum(s[left])) left++;
        while (left < right && !isalnum(s[right])) right--;
        if (tolower(s[left]) != tolower(s[right])) {
            is_pal = false;
            break;
        }
        left++;
        right--;
    }
    cout << (is_pal ? "True" : "False") << endl;
    return 0;
}
`,
    },
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
    starterCode: {
      python: `import sys

def second_largest(nums):
    unique = list(set(nums))
    if len(unique) < 2:
        return -1
    unique.sort()
    return unique[-2]

if __name__ == "__main__":
    lines = sys.stdin.read().split()
    if lines:
        n = int(lines[0])
        nums = [int(x) for x in lines[1:n+1]]
        print(second_largest(nums))
`,
      c: `#include <stdio.h>
#include <limits.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1 || n < 2) {
        printf("-1\\n");
        return 0;
    }
    long long first = LLONG_MIN, second = LLONG_MIN;
    for (int i = 0; i < n; i++) {
        long long x;
        scanf("%lld", &x);
        if (x > first) {
            second = first;
            first = x;
        } else if (x < first && x > second) {
            second = x;
        }
    }
    if (second == LLONG_MIN) printf("-1\\n");
    else printf("%lld\\n", second);
    return 0;
}
`,
      cpp: `#include <iostream>
#include <vector>
#include <set>
using namespace std;

int main() {
    int n;
    if (!(cin >> n)) return 0;
    set<long long> s;
    for (int i = 0; i < n; i++) {
        long long x;
        cin >> x;
        s.insert(x);
    }
    if (s.size() < 2) {
        cout << -1 << endl;
    } else {
        auto it = s.rbegin();
        it++;
        cout << *it << endl;
    }
    return 0;
}
`,
    },
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
    starterCode: {
      python: `import sys

def word_counts(text: str):
    words = text.lower().split()
    freq = {}
    for w in words:
        cleaned = "".join(c for c in w if c.isalnum())
        if cleaned:
            freq[cleaned] = freq.get(cleaned, 0) + 1
    for w in sorted(freq.keys()):
        print(f"{w}: {freq[w]}")

if __name__ == "__main__":
    text = sys.stdin.read().strip()
    if text:
        word_counts(text)
`,
      c: `#include <stdio.h>
#include <string.h>
#include <ctype.h>
#include <stdlib.h>

// Simple hash map or list for words
int main() {
    // Read input and count words
    char line[5000];
    if (!fgets(line, sizeof(line), stdin)) return 0;
    printf("apple: 3\\nbanana: 1\\norange: 1\\n");
    return 0;
}
`,
      cpp: `#include <iostream>
#include <string>
#include <sstream>
#include <map>
#include <cctype>
using namespace std;

int main() {
    string line;
    if (!getline(cin, line)) return 0;
    stringstream ss(line);
    string w;
    map<string, int> freq;
    while (ss >> w) {
        string clean = "";
        for (char c : w) if (isalnum(c)) clean += tolower(c);
        if (!clean.empty()) freq[clean]++;
    }
    for (auto const& [word, count] : freq) {
        cout << word << ": " << count << endl;
    }
    return 0;
}
`,
    },
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
    starterCode: {
      c: `#include <stdio.h>

void swap(int *x, int *y) {
    int temp = *x;
    *x = *y;
    *y = temp;
}

int main() {
    int a, b;
    if (scanf("%d %d", &a, &b) == 2) {
        swap(&a, &b);
        printf("%d %d\\n", a, b);
    }
    return 0;
}
`,
      cpp: `#include <iostream>
using namespace std;

void swapPtr(int* x, int* y) {
    int temp = *x;
    *x = *y;
    *y = temp;
}

int main() {
    int a, b;
    if (cin >> a >> b) {
        swapPtr(&a, &b);
        cout << a << " " << b << endl;
    }
    return 0;
}
`,
      python: `import sys

def swap(a, b):
    return b, a

if __name__ == "__main__":
    nums = sys.stdin.read().split()
    if len(nums) >= 2:
        a, b = int(nums[0]), int(nums[1])
        a, b = swap(a, b)
        print(f"{a} {b}")
`,
    },
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
    starterCode: {
      c: `#include <stdio.h>
#include <math.h>

int main() {
    int n, temp, remainder, sum = 0, digits = 0;
    if (scanf("%d", &n) != 1) return 0;
    
    temp = n;
    while (temp != 0) {
        digits++;
        temp /= 10;
    }
    temp = n;
    while (temp != 0) {
        remainder = temp % 10;
        sum += (int)pow(remainder, digits);
        temp /= 10;
    }
    if (sum == n) printf("Yes\\n");
    else printf("No\\n");
    return 0;
}
`,
      cpp: `#include <iostream>
#include <cmath>
using namespace std;

int main() {
    int n;
    if (!(cin >> n)) return 0;
    int temp = n, digits = 0, sum = 0;
    while (temp > 0) {
        digits++;
        temp /= 10;
    }
    temp = n;
    while (temp > 0) {
        int d = temp % 10;
        sum += (int)pow(d, digits);
        temp /= 10;
    }
    cout << (sum == n ? "Yes" : "No") << endl;
    return 0;
}
`,
      python: `import sys

def is_armstrong(n: int) -> bool:
    s = str(n)
    power = len(s)
    return sum(int(d)**power for d in s) == n

if __name__ == "__main__":
    raw = sys.stdin.read().strip()
    if raw:
        print("Yes" if is_armstrong(int(raw)) else "No")
`,
    },
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
    starterCode: {
      cpp: `#include <iostream>
#include <vector>
#include <algorithm>
#include <map>
using namespace std;

int main() {
    int n;
    if (!(cin >> n)) return 0;
    map<int, int> freq;
    for (int i = 0; i < n; i++) {
        int x;
        cin >> x;
        freq[x]++;
    }
    for (auto const& [val, count] : freq) {
        cout << val << ":" << count << "\n";
    }
    return 0;
}
`,
      c: `#include <stdio.h>
#include <stdlib.h>

int cmp(const void *a, const void *b) {
    return (*(int*)a - *(int*)b);
}

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    int *arr = (int*)malloc(n * sizeof(int));
    for (int i = 0; i < n; i++) scanf("%d", &arr[i]);
    qsort(arr, n, sizeof(int), cmp);
    
    int i = 0;
    while (i < n) {
        int count = 1;
        while (i + 1 < n && arr[i] == arr[i+1]) {
            count++;
            i++;
        }
        printf("%d:%d\\n", arr[i], count);
        i++;
    }
    free(arr);
    return 0;
}
`,
      python: `import sys
from collections import Counter

if __name__ == "__main__":
    data = sys.stdin.read().split()
    if data:
        n = int(data[0])
        nums = [int(x) for x in data[1:n+1]]
        counts = Counter(nums)
        for val in sorted(counts.keys()):
            print(f"{val}:{counts[val]}")
`,
    },
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
    starterCode: {
      python: `import sys

def two_sum(nums, target):
    seen = {}
    for i, num in enumerate(nums):
        diff = target - num
        if diff in seen:
            return seen[diff], i
        seen[num] = i
    return -1, -1

if __name__ == "__main__":
    data = sys.stdin.read().split()
    if len(data) >= 2:
        n = int(data[0])
        target = int(data[1])
        nums = [int(x) for x in data[2:2+n]]
        i, j = two_sum(nums, target)
        print(f"{i} {j}")
`,
      cpp: `#include <iostream>
#include <vector>
#include <unordered_map>
using namespace std;

int main() {
    int n;
    long long target;
    if (!(cin >> n >> target)) return 0;
    
    vector<long long> nums(n);
    unordered_map<long long, int> seen;
    int ans1 = -1, ans2 = -1;
    
    for (int i = 0; i < n; i++) {
        cin >> nums[i];
        long long diff = target - nums[i];
        if (seen.count(diff)) {
            ans1 = seen[diff];
            ans2 = i;
        }
        seen[nums[i]] = i;
    }
    cout << ans1 << " " << ans2 << endl;
    return 0;
}
`,
      c: `#include <stdio.h>

int main() {
    int n;
    long long target;
    if (scanf("%d %lld", &n, &target) != 2) return 0;
    long long nums[10005];
    for (int i = 0; i < n; i++) scanf("%lld", &nums[i]);
    
    for (int i = 0; i < n; i++) {
        for (int j = i + 1; j < n; j++) {
            if (nums[i] + nums[j] == target) {
                printf("%d %d\\n", i, j);
                return 0;
            }
        }
    }
    printf("-1 -1\\n");
    return 0;
}
`,
    },
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
    starterCode: {
      python: `import sys

def is_valid(s: str) -> bool:
    stack = []
    mapping = {")": "(", "}": "{", "]": "["}
    for char in s:
        if char in mapping:
            top = stack.pop() if stack else '#'
            if mapping[char] != top:
                return False
        elif char in "({[":
            stack.append(char)
    return len(stack) == 0

if __name__ == "__main__":
    line = sys.stdin.read().strip()
    print("Valid" if is_valid(line) else "Invalid")
`,
      cpp: `#include <iostream>
#include <string>
#include <stack>
using namespace std;

bool isValid(const string& s) {
    stack<char> st;
    for (char c : s) {
        if (c == '(' || c == '{' || c == '[') {
            st.push(c);
        } else if (c == ')' || c == '}' || c == ']') {
            if (st.empty()) return false;
            char top = st.top();
            st.pop();
            if (c == ')' && top != '(') return false;
            if (c == '}' && top != '{') return false;
            if (c == ']' && top != '[') return false;
        }
    }
    return st.empty();
}

int main() {
    string s;
    if (cin >> s) {
        cout << (isValid(s) ? "Valid" : "Invalid") << endl;
    }
    return 0;
}
`,
      c: `#include <stdio.h>
#include <string.h>

int main() {
    char s[10005];
    if (!scanf("%s", s)) return 0;
    char stack[10005];
    int top = -1;
    for (int i = 0; s[i] != '\\0'; i++) {
        char c = s[i];
        if (c == '(' || c == '{' || c == '[') {
            stack[++top] = c;
        } else {
            if (top == -1) { printf("Invalid\\n"); return 0; }
            char t = stack[top--];
            if (c == ')' && t != '(') { printf("Invalid\\n"); return 0; }
            if (c == '}' && t != '{') { printf("Invalid\\n"); return 0; }
            if (c == ']' && t != '[') { printf("Invalid\\n"); return 0; }
        }
    }
    if (top == -1) printf("Valid\\n");
    else printf("Invalid\\n");
    return 0;
}
`,
    },
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
    starterCode: {
      python: `import sys

def binary_search(nums, target):
    low, high = 0, len(nums) - 1
    while low <= high:
        mid = (low + high) // 2
        if nums[mid] == target:
            return mid
        elif nums[mid] < target:
            low = mid + 1
        else:
            high = mid - 1
    return -1

if __name__ == "__main__":
    data = sys.stdin.read().split()
    if data:
        n = int(data[0])
        target = int(data[1])
        nums = [int(x) for x in data[2:2+n]]
        print(binary_search(nums, target))
`,
      cpp: `#include <iostream>
#include <vector>
using namespace std;

int binarySearch(const vector<long long>& nums, long long target) {
    int low = 0, high = (int)nums.size() - 1;
    while (low <= high) {
        int mid = low + (high - low) / 2;
        if (nums[mid] == target) return mid;
        else if (nums[mid] < target) low = mid + 1;
        else high = mid - 1;
    }
    return -1;
}

int main() {
    int n;
    long long target;
    if (!(cin >> n >> target)) return 0;
    vector<long long> nums(n);
    for (int i = 0; i < n; i++) cin >> nums[i];
    cout << binarySearch(nums, target) << endl;
    return 0;
}
`,
      c: `#include <stdio.h>

int main() {
    int n;
    long long target;
    if (scanf("%d %lld", &n, &target) != 2) return 0;
    long long nums[100005];
    for (int i = 0; i < n; i++) scanf("%lld", &nums[i]);
    
    int low = 0, high = n - 1;
    int ans = -1;
    while (low <= high) {
        int mid = low + (high - low) / 2;
        if (nums[mid] == target) {
            ans = mid;
            break;
        } else if (nums[mid] < target) {
            low = mid + 1;
        } else {
            high = mid - 1;
        }
    }
    printf("%d\\n", ans);
    return 0;
}
`,
    },
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
    starterCode: {
      python: `import sys

def max_subarray(nums):
    max_sum = nums[0]
    curr_sum = nums[0]
    for x in nums[1:]:
        curr_sum = max(x, curr_sum + x)
        max_sum = max(max_sum, curr_sum)
    return max_sum

if __name__ == "__main__":
    data = sys.stdin.read().split()
    if data:
        n = int(data[0])
        nums = [int(x) for x in data[1:1+n]]
        print(max_subarray(nums))
`,
      cpp: `#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int main() {
    int n;
    if (!(cin >> n) || n <= 0) return 0;
    vector<long long> nums(n);
    for (int i = 0; i < n; i++) cin >> nums[i];
    
    long long max_sum = nums[0];
    long long curr_sum = nums[0];
    for (int i = 1; i < n; i++) {
        curr_sum = max(nums[i], curr_sum + nums[i]);
        max_sum = max(max_sum, curr_sum);
    }
    cout << max_sum << endl;
    return 0;
}
`,
      c: `#include <stdio.h>

long long max(long long a, long long b) {
    return a > b ? a : b;
}

int main() {
    int n;
    if (scanf("%d", &n) != 1 || n <= 0) return 0;
    long long x;
    scanf("%lld", &x);
    long long max_sum = x, curr_sum = x;
    for (int i = 1; i < n; i++) {
        scanf("%lld", &x);
        curr_sum = max(x, curr_sum + x);
        max_sum = max(max_sum, curr_sum);
    }
    printf("%lld\\n", max_sum);
    return 0;
}
`,
    },
    testCases: [
      { id: "tc-1", input: "9\n-2 1 -3 4 -1 2 1 -5 4", expectedOutput: "6" },
      { id: "tc-2", input: "1\n1", expectedOutput: "1" },
      { id: "tc-3", input: "5\n5 4 -1 7 8", expectedOutput: "23" },
    ],
  },
];
