import type { LanguageId, TestCase, Difficulty } from "./coding-types";

export type LeetCodeProblem = {
  id: string;
  problemNumber: number;
  title: string;
  slug: string;
  difficulty: Difficulty;
  category: "DSA" | "C++" | "Python" | "C";
  tags: string[];
  companyTags: string[];
  acceptance: string;
  description: string;
  examples: {
    input: string;
    output: string;
    explanation?: string;
  }[];
  constraints: string[];
  hints: string[];
  starterCode: Record<LanguageId, string>;
  testCases: TestCase[];
  editorial: {
    approachTitle: string;
    approachBody: string;
    timeComplexity: string;
    spaceComplexity: string;
    solutionCode: Record<LanguageId, string>;
  };
};

export const LEETCODE_PROBLEMS: LeetCodeProblem[] = [
  // 1. Two Sum
  {
    id: "two-sum",
    problemNumber: 1,
    title: "Two Sum",
    slug: "two-sum",
    difficulty: "easy",
    category: "DSA",
    tags: ["Array", "Hash Table", "Two Pointers"],
    companyTags: ["Google", "Amazon", "Microsoft", "Meta", "Apple"],
    acceptance: "53.8%",
    description: `Given an array of integers \`nums\` and an integer \`target\`, return *indices of the two numbers such that they add up to \`target\`*.

You may assume that each input would have ***exactly one solution***, and you may not use the same element twice.

You can return the answer in any order. Print the indices separated by a space.`,
    examples: [
      {
        input: "4 9\n2 7 11 15",
        output: "0 1",
        explanation: "Because nums[0] + nums[1] == 9, we return 0 1.",
      },
      {
        input: "3 6\n3 2 4",
        output: "1 2",
        explanation: "Because nums[1] + nums[2] == 6, we return 1 2.",
      },
      {
        input: "2 6\n3 3",
        output: "0 1",
        explanation: "Because nums[0] + nums[1] == 6, we return 0 1.",
      },
    ],
    constraints: [
      "2 <= nums.length <= 10^4",
      "-10^9 <= nums[i] <= 10^9",
      "-10^9 <= target <= 10^9",
      "Only one valid answer exists.",
    ],
    hints: [
      "A really brute force way would be to search for all possible pairs of numbers but that would be slow. Can you think of something faster?",
      "The second train of thought is, without changing the array, can we use additional space? For example, a hash map to look up if the difference `target - num` already exists in O(1) time?",
    ],
    starterCode: {
      cpp: `#include <iostream>
#include <vector>
#include <unordered_map>
using namespace std;

void twoSum(const vector<int>& nums, int target) {
    // Write your solution here
    
}

int main() {
    int n, target;
    if (!(cin >> n >> target)) return 0;
    vector<int> nums(n);
    for (int i = 0; i < n; i++) cin >> nums[i];
    twoSum(nums, target);
    return 0;
}
`,
      python: `import sys

def two_sum(nums, target):
    # Write your solution here
    pass

def main():
    lines = sys.stdin.read().split()
    if not lines:
        return
    n, target = int(lines[0]), int(lines[1])
    nums = [int(x) for x in lines[2:2+n]]
    two_sum(nums, target)

if __name__ == "__main__":
    main()
`,
      c: `#include <stdio.h>
#include <stdlib.h>

void twoSum(int nums[], int n, int target) {
    // Write your solution here
    
}

int main() {
    int n, target;
    if (scanf("%d %d", &n, &target) != 2) return 0;
    int* nums = (int*)malloc(n * sizeof(int));
    for (int i = 0; i < n; i++) scanf("%d", &nums[i]);
    twoSum(nums, n, target);
    free(nums);
    return 0;
}
`,
    },
    testCases: [
      { id: "tc-1", input: "4 9\n2 7 11 15", expectedOutput: "0 1" },
      { id: "tc-2", input: "3 6\n3 2 4", expectedOutput: "1 2" },
      { id: "tc-3", input: "2 6\n3 3", expectedOutput: "0 1" },
      { id: "tc-4", input: "5 10\n1 2 3 4 9", expectedOutput: "0 4", isSecret: true },
    ],
    editorial: {
      approachTitle: "One-Pass Hash Table",
      approachBody: `While we iterate and inserting elements into the table, we also look back to check if the current element's complement (\`target - nums[i]\`) already exists in the table. If it exists, we have found a solution and return the indices immediately.`,
      timeComplexity: "O(n) - We traverse the list containing n elements only once. Each lookup in the table costs only O(1) time.",
      spaceComplexity: "O(n) - The extra space required depends on the number of items stored in the hash table, which stores at most n elements.",
      solutionCode: {
        cpp: `#include <iostream>
#include <vector>
#include <unordered_map>
using namespace std;

int main() {
    int n, target;
    if (!(cin >> n >> target)) return 0;
    vector<int> nums(n);
    for (int i = 0; i < n; i++) cin >> nums[i];
    
    unordered_map<int, int> seen;
    for (int i = 0; i < n; i++) {
        int complement = target - nums[i];
        if (seen.find(complement) != seen.end()) {
            cout << seen[complement] << " " << i << endl;
            return 0;
        }
        seen[nums[i]] = i;
    }
    return 0;
}`,
        python: `import sys

def main():
    lines = sys.stdin.read().split()
    if not lines:
        return
    n, target = int(lines[0]), int(lines[1])
    nums = [int(x) for x in lines[2:2+n]]
    
    seen = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            print(f"{seen[complement]} {i}")
            return
        seen[num] = i

if __name__ == "__main__":
    main()`,
        c: `#include <stdio.h>
#include <stdlib.h>

int main() {
    int n, target;
    if (scanf("%d %d", &n, &target) != 2) return 0;
    int* nums = (int*)malloc(n * sizeof(int));
    for (int i = 0; i < n; i++) scanf("%d", &nums[i]);
    
    for (int i = 0; i < n; i++) {
        for (int j = i + 1; j < n; j++) {
            if (nums[i] + nums[j] == target) {
                printf("%d %d\n", i, j);
                free(nums);
                return 0;
            }
        }
    }
    free(nums);
    return 0;
}`,
      },
    },
  },

  // 2. Valid Parentheses
  {
    id: "valid-parentheses",
    problemNumber: 20,
    title: "Valid Parentheses",
    slug: "valid-parentheses",
    difficulty: "easy",
    category: "DSA",
    tags: ["String", "Stack"],
    companyTags: ["Meta", "Amazon", "Bloomberg", "Google", "Microsoft"],
    acceptance: "41.2%",
    description: `Given a string \`s\` containing just the characters \`'('\`, \`')'\`, \`'{'\`, \`'}'\`, \`'['\` and \`']'\`, determine if the input string is valid.

An input string is valid if:
1. Open brackets must be closed by the same type of brackets.
2. Open brackets must be closed in the correct order.
3. Every close bracket has a corresponding open bracket of the same type.

Print \`Valid\` if the string is valid, otherwise print \`Invalid\`.`,
    examples: [
      {
        input: "()[]{}",
        output: "Valid",
        explanation: "All brackets are closed in matching order.",
      },
      {
        input: "(]",
        output: "Invalid",
        explanation: "Closing bracket does not match open bracket.",
      },
      {
        input: "([{}])",
        output: "Valid",
      },
    ],
    constraints: [
      "1 <= s.length <= 10^4",
      "s consists of parentheses only '()[]{}'.",
    ],
    hints: [
      "Use a Last-In-First-Out (LIFO) stack to keep track of open brackets.",
      "When encountering a closing bracket, check if the top of the stack matches its corresponding opening bracket.",
    ],
    starterCode: {
      cpp: `#include <iostream>
#include <string>
#include <stack>
using namespace std;

void isValid(const string& s) {
    // Write your solution here
    
}

int main() {
    string s;
    if (cin >> s) {
        isValid(s);
    }
    return 0;
}
`,
      python: `import sys

def is_valid(s):
    # Write your solution here
    pass

if __name__ == "__main__":
    line = sys.stdin.read().strip()
    if line:
        is_valid(line)
`,
      c: `#include <stdio.h>
#include <string.h>

void isValid(char* s) {
    // Write your solution here
    
}

int main() {
    char s[10005];
    if (scanf("%s", s) == 1) {
        isValid(s);
    }
    return 0;
}
`,
    },
    testCases: [
      { id: "tc-1", input: "()[]{}", expectedOutput: "Valid" },
      { id: "tc-2", input: "(]", expectedOutput: "Invalid" },
      { id: "tc-3", input: "([{}])", expectedOutput: "Valid" },
      { id: "tc-4", input: "{[()]}", expectedOutput: "Valid", isSecret: true },
      { id: "tc-5", input: "((((", expectedOutput: "Invalid", isSecret: true },
    ],
    editorial: {
      approachTitle: "Stack-based Matching",
      approachBody: `Push opening brackets onto a stack. When a closing bracket is encountered, verify that the stack is non-empty and the top matches. At the end, the stack must be completely empty.`,
      timeComplexity: "O(n) - Single pass through the string.",
      spaceComplexity: "O(n) - Stack can hold up to n/2 opening brackets.",
      solutionCode: {
        cpp: `#include <iostream>
#include <string>
#include <stack>
using namespace std;

int main() {
    string s;
    if (!(cin >> s)) return 0;
    stack<char> st;
    for (char c : s) {
        if (c == '(' || c == '{' || c == '[') {
            st.push(c);
        } else {
            if (st.empty()) { cout << "Invalid" << endl; return 0; }
            char top = st.top(); st.pop();
            if ((c == ')' && top != '(') ||
                (c == '}' && top != '{') ||
                (c == ']' && top != '[')) {
                cout << "Invalid" << endl;
                return 0;
            }
        }
    }
    cout << (st.empty() ? "Valid" : "Invalid") << endl;
    return 0;
}`,
        python: `import sys

def main():
    s = sys.stdin.read().strip()
    if not s:
        return
    stack = []
    pairs = {')': '(', '}': '{', ']': '['}
    for c in s:
        if c in '({[':
            stack.append(c)
        elif c in pairs:
            if not stack or stack.pop() != pairs[c]:
                print("Invalid")
                return
    print("Valid" if not stack else "Invalid")

if __name__ == "__main__":
    main()`,
        c: `#include <stdio.h>
#include <string.h>

int main() {
    char s[10005];
    if (scanf("%s", s) != 1) return 0;
    char stack[10005];
    int top = -1;
    for (int i = 0; s[i]; i++) {
        char c = s[i];
        if (c == '(' || c == '{' || c == '[') {
            stack[++top] = c;
        } else {
            if (top < 0) { printf("Invalid\n"); return 0; }
            char t = stack[top--];
            if ((c == ')' && t != '(') || (c == '}' && t != '{') || (c == ']' && t != '[')) {
                printf("Invalid\n");
                return 0;
            }
        }
    }
    printf("%s\n", top == -1 ? "Valid" : "Invalid");
    return 0;
}`,
      },
    },
  },

  // 3. Palindrome Checker
  {
    id: "palindrome-number",
    problemNumber: 9,
    title: "Palindrome String & Number",
    slug: "palindrome-number",
    difficulty: "easy",
    category: "Python",
    tags: ["Math", "Two Pointers", "String"],
    companyTags: ["Amazon", "Microsoft", "TCS", "Infosys"],
    acceptance: "55.4%",
    description: `Given a string \`s\`, return \`True\` if it is a palindrome, or \`False\` otherwise.

A palindrome is a string that reads the same backward as forward, ignoring casing and whitespace.`,
    examples: [
      {
        input: "madam",
        output: "True",
        explanation: "'madam' reversed is 'madam'.",
      },
      {
        input: "hello",
        output: "False",
      },
      {
        input: "Race car",
        output: "True",
        explanation: "Ignoring spaces and casing, 'racecar' is a palindrome.",
      },
    ],
    constraints: [
      "1 <= s.length <= 10^5",
      "s consists only of printable ASCII characters.",
    ],
    hints: [
      "Clean the string by converting to lowercase and stripping non-alphanumeric characters, then compare from both ends.",
    ],
    starterCode: {
      python: `import sys

def is_palindrome(s):
    # Write your solution here
    pass

if __name__ == "__main__":
    line = sys.stdin.read().strip()
    is_palindrome(line)
`,
      cpp: `#include <iostream>
#include <string>
#include <algorithm>
using namespace std;

void isPalindrome(string s) {
    // Write your solution here
    
}

int main() {
    string s;
    getline(cin, s);
    isPalindrome(s);
    return 0;
}
`,
      c: `#include <stdio.h>
#include <string.h>
#include <ctype.h>

int main() {
    char s[10005];
    if (fgets(s, sizeof(s), stdin)) {
        // Write your solution here
    }
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
    editorial: {
      approachTitle: "Two Pointers",
      approachBody: `Maintain two pointers: one at the start and one at the end. Move them towards the center, skipping non-alphanumeric characters and comparing characters case-insensitively.`,
      timeComplexity: "O(n) - Single pass with two pointers.",
      spaceComplexity: "O(1) - Constant auxiliary memory.",
      solutionCode: {
        python: `import sys

def main():
    s = sys.stdin.read().strip()
    clean = "".join(c.lower() for c in s if c.isalnum())
    print("True" if clean == clean[::-1] else "False")

if __name__ == "__main__":
    main()`,
        cpp: `#include <iostream>
#include <string>
#include <cctype>
using namespace std;

int main() {
    string s;
    getline(cin, s);
    string clean = "";
    for (char c : s) if (isalnum(c)) clean += tolower(c);
    int i = 0, j = clean.size() - 1;
    while (i < j) {
        if (clean[i++] != clean[j--]) {
            cout << "False" << endl;
            return 0;
        }
    }
    cout << "True" << endl;
    return 0;
}`,
        c: `#include <stdio.h>
#include <string.h>
#include <ctype.h>

int main() {
    char s[10005], clean[10005];
    if (!fgets(s, sizeof(s), stdin)) return 0;
    int k = 0;
    for (int i = 0; s[i]; i++) {
        if (isalnum((unsigned char)s[i])) clean[k++] = tolower((unsigned char)s[i]);
    }
    clean[k] = '\0';
    int i = 0, j = k - 1;
    while (i < j) {
        if (clean[i++] != clean[j--]) {
            printf("False\n");
            return 0;
        }
    }
    printf("True\n");
    return 0;
}`,
      },
    },
  },

  // 4. Maximum Subarray (Kadane's)
  {
    id: "maximum-subarray",
    problemNumber: 53,
    title: "Maximum Subarray (Kadane's Algorithm)",
    slug: "maximum-subarray",
    difficulty: "medium",
    category: "DSA",
    tags: ["Array", "Divide and Conquer", "Dynamic Programming"],
    companyTags: ["Amazon", "Microsoft", "Apple", "Google", "LinkedIn"],
    acceptance: "51.1%",
    description: `Given an integer array \`nums\`, find the subarray with the largest sum, and return *its sum*.

A **subarray** is a contiguous non-empty sequence of elements within an array.`,
    examples: [
      {
        input: "9\n-2 1 -3 4 -1 2 1 -5 4",
        output: "6",
        explanation: "The subarray [4, -1, 2, 1] has the largest sum 6.",
      },
      {
        input: "1\n1",
        output: "1",
        explanation: "The subarray [1] has the largest sum 1.",
      },
      {
        input: "5\n5 4 -1 7 8",
        output: "23",
        explanation: "The subarray [5, 4, -1, 7, 8] has the largest sum 23.",
      },
    ],
    constraints: [
      "1 <= nums.length <= 10^5",
      "-10^4 <= nums[i] <= 10^4",
    ],
    hints: [
      "If you have figured out the O(n) solution, try coding another solution using the divide and conquer approach, which is more subtle.",
      "Kadane's Algorithm: at each index, decide whether to add nums[i] to the current running sum, or start a fresh subarray at nums[i].",
    ],
    starterCode: {
      cpp: `#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

void maxSubArray(const vector<int>& nums) {
    // Write your solution here
    
}

int main() {
    int n;
    if (cin >> n) {
        vector<int> nums(n);
        for (int i = 0; i < n; i++) cin >> nums[i];
        maxSubArray(nums);
    }
    return 0;
}
`,
      python: `import sys

def max_sub_array(nums):
    # Write your solution here
    pass

if __name__ == "__main__":
    lines = sys.stdin.read().split()
    if lines:
        n = int(lines[0])
        nums = [int(x) for x in lines[1:1+n]]
        max_sub_array(nums)
`,
      c: `#include <stdio.h>
#include <stdlib.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    int* nums = (int*)malloc(n * sizeof(int));
    for (int i = 0; i < n; i++) scanf("%d", &nums[i]);
    // Write your solution here
    free(nums);
    return 0;
}
`,
    },
    testCases: [
      { id: "tc-1", input: "9\n-2 1 -3 4 -1 2 1 -5 4", expectedOutput: "6" },
      { id: "tc-2", input: "1\n1", expectedOutput: "1" },
      { id: "tc-3", input: "5\n5 4 -1 7 8", expectedOutput: "23" },
      { id: "tc-4", input: "4\n-3 -2 -1 -4", expectedOutput: "-1", isSecret: true },
    ],
    editorial: {
      approachTitle: "Kadane's Dynamic Programming",
      approachBody: `Keep track of current_max and global_max. At step i, \`current_max = max(nums[i], current_max + nums[i])\`, and \`global_max = max(global_max, current_max)\`.`,
      timeComplexity: "O(n) - Single linear scan across the array.",
      spaceComplexity: "O(1) - Only two integer variables required.",
      solutionCode: {
        cpp: `#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int main() {
    int n;
    if (!(cin >> n)) return 0;
    vector<int> nums(n);
    for (int i = 0; i < n; i++) cin >> nums[i];
    
    long long cur = nums[0], best = nums[0];
    for (int i = 1; i < n; i++) {
        cur = max((long long)nums[i], cur + nums[i]);
        best = max(best, cur);
    }
    cout << best << endl;
    return 0;
}`,
        python: `import sys

def main():
    lines = sys.stdin.read().split()
    if not lines:
        return
    n = int(lines[0])
    nums = [int(x) for x in lines[1:1+n]]
    
    cur = best = nums[0]
    for x in nums[1:]:
        cur = max(x, cur + x)
        best = max(best, cur)
    print(best)

if __name__ == "__main__":
    main()`,
        c: `#include <stdio.h>
#include <stdlib.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    int* nums = (int*)malloc(n * sizeof(int));
    for (int i = 0; i < n; i++) scanf("%d", &nums[i]);
    
    long long cur = nums[0], best = nums[0];
    for (int i = 1; i < n; i++) {
        if (cur + nums[i] > nums[i]) cur = cur + nums[i];
        else cur = nums[i];
        if (cur > best) best = cur;
    }
    printf("%lld\n", best);
    free(nums);
    return 0;
}`,
      },
    },
  },

  // 5. Binary Search
  {
    id: "binary-search",
    problemNumber: 704,
    title: "Binary Search",
    slug: "binary-search",
    difficulty: "easy",
    category: "DSA",
    tags: ["Array", "Binary Search"],
    companyTags: ["Google", "Microsoft", "Apple", "Uber"],
    acceptance: "57.8%",
    description: `Given an array of integers \`nums\` which is sorted in ascending order, and an integer \`target\`, write a function to search \`target\` in \`nums\`. If \`target\` exists, then return its index. Otherwise, return \`-1\`.

You must write an algorithm with \`O(log n)\` runtime complexity.`,
    examples: [
      {
        input: "6 9\n-1 0 3 5 9 12",
        output: "4",
        explanation: "9 exists in nums and its index is 4.",
      },
      {
        input: "6 2\n-1 0 3 5 9 12",
        output: "-1",
        explanation: "2 does not exist in nums so return -1.",
      },
    ],
    constraints: [
      "1 <= nums.length <= 10^5",
      "-10^4 < nums[i], target < 10^4",
      "All the integers in nums are unique.",
      "nums is sorted in ascending order.",
    ],
    hints: [
      "Calculate mid = left + (right - left) / 2 to prevent integer overflow.",
      "If nums[mid] == target, return mid. If nums[mid] < target, search right half, else search left half.",
    ],
    starterCode: {
      cpp: `#include <iostream>
#include <vector>
using namespace std;

int search(const vector<int>& nums, int target) {
    // Write your solution here
    return -1;
}

int main() {
    int n, target;
    if (cin >> n >> target) {
        vector<int> nums(n);
        for (int i = 0; i < n; i++) cin >> nums[i];
        cout << search(nums, target) << endl;
    }
    return 0;
}
`,
      python: `import sys

def search(nums, target):
    # Write your solution here
    return -1

if __name__ == "__main__":
    lines = sys.stdin.read().split()
    if lines:
        n, target = int(lines[0]), int(lines[1])
        nums = [int(x) for x in lines[2:2+n]]
        print(search(nums, target))
`,
      c: `#include <stdio.h>
#include <stdlib.h>

int search(int nums[], int n, int target) {
    // Write your solution here
    return -1;
}

int main() {
    int n, target;
    if (scanf("%d %d", &n, &target) == 2) {
        int* nums = (int*)malloc(n * sizeof(int));
        for (int i = 0; i < n; i++) scanf("%d", &nums[i]);
        printf("%d\n", search(nums, n, target));
        free(nums);
    }
    return 0;
}
`,
    },
    testCases: [
      { id: "tc-1", input: "6 9\n-1 0 3 5 9 12", expectedOutput: "4" },
      { id: "tc-2", input: "6 2\n-1 0 3 5 9 12", expectedOutput: "-1" },
      { id: "tc-3", input: "1 5\n5", expectedOutput: "0" },
      { id: "tc-4", input: "5 100\n1 2 3 4 5", expectedOutput: "-1", isSecret: true },
    ],
    editorial: {
      approachTitle: "Iterative Binary Search",
      approachBody: `Halve the search space each step by comparing target with the middle element.`,
      timeComplexity: "O(log n) - In each step the search space is cut in half.",
      spaceComplexity: "O(1) - Only two boundary pointer variables.",
      solutionCode: {
        cpp: `#include <iostream>
#include <vector>
using namespace std;

int main() {
    int n, target;
    if (!(cin >> n >> target)) return 0;
    vector<int> nums(n);
    for (int i = 0; i < n; i++) cin >> nums[i];
    
    int l = 0, r = n - 1;
    while (l <= r) {
        int m = l + (r - l) / 2;
        if (nums[m] == target) { cout << m << endl; return 0; }
        if (nums[m] < target) l = m + 1;
        else r = m - 1;
    }
    cout << -1 << endl;
    return 0;
}`,
        python: `import sys

def main():
    lines = sys.stdin.read().split()
    if not lines:
        return
    n, target = int(lines[0]), int(lines[1])
    nums = [int(x) for x in lines[2:2+n]]
    
    l, r = 0, n - 1
    while l <= r:
        m = (l + r) // 2
        if nums[m] == target:
            print(m)
            return
        elif nums[m] < target:
            l = m + 1
        else:
            r = m - 1
    print(-1)

if __name__ == "__main__":
    main()`,
        c: `#include <stdio.h>
#include <stdlib.h>

int main() {
    int n, target;
    if (scanf("%d %d", &n, &target) != 2) return 0;
    int* nums = (int*)malloc(n * sizeof(int));
    for (int i = 0; i < n; i++) scanf("%d", &nums[i]);
    
    int l = 0, r = n - 1;
    while (l <= r) {
        int m = l + (r - l) / 2;
        if (nums[m] == target) { printf("%d\n", m); free(nums); return 0; }
        if (nums[m] < target) l = m + 1;
        else r = m - 1;
    }
    printf("-1\n");
    free(nums);
    return 0;
}`,
      },
    },
  },

  // 6. Reverse Linked List
  {
    id: "reverse-linked-list",
    problemNumber: 206,
    title: "Reverse Linked List",
    slug: "reverse-linked-list",
    difficulty: "easy",
    category: "DSA",
    tags: ["Linked List", "Recursion"],
    companyTags: ["Amazon", "Microsoft", "Apple", "Google", "Adobe"],
    acceptance: "75.6%",
    description: `Given the \`head\` of a singly linked list with \`n\` elements, reverse the list, and return *the reversed list*. Print the values of the reversed linked list separated by space.`,
    examples: [
      {
        input: "5\n1 2 3 4 5",
        output: "5 4 3 2 1",
        explanation: "1 -> 2 -> 3 -> 4 -> 5 becomes 5 -> 4 -> 3 -> 2 -> 1.",
      },
      {
        input: "2\n1 2",
        output: "2 1",
      },
    ],
    constraints: [
      "The number of nodes in the list is the range [0, 5000].",
      "-5000 <= Node.val <= 5000",
    ],
    hints: [
      "Keep a prev pointer initialized to NULL and a curr pointer initialized to head. Iteratively flip next pointers.",
    ],
    starterCode: {
      cpp: `#include <iostream>
#include <vector>
using namespace std;

int main() {
    int n;
    if (cin >> n) {
        vector<int> nums(n);
        for (int i = 0; i < n; i++) cin >> nums[i];
        // Reverse and print
        for (int i = n - 1; i >= 0; i--) {
            cout << nums[i] << (i == 0 ? "" : " ");
        }
        cout << endl;
    }
    return 0;
}
`,
      python: `import sys

def main():
    lines = sys.stdin.read().split()
    if not lines:
        return
    n = int(lines[0])
    nums = lines[1:1+n]
    print(" ".join(reversed(nums)))

if __name__ == "__main__":
    main()
`,
      c: `#include <stdio.h>
#include <stdlib.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    int* nums = (int*)malloc(n * sizeof(int));
    for (int i = 0; i < n; i++) scanf("%d", &nums[i]);
    for (int i = n - 1; i >= 0; i--) {
        printf("%d%s", nums[i], i == 0 ? "" : " ");
    }
    printf("\n");
    free(nums);
    return 0;
}
`,
    },
    testCases: [
      { id: "tc-1", input: "5\n1 2 3 4 5", expectedOutput: "5 4 3 2 1" },
      { id: "tc-2", input: "2\n1 2", expectedOutput: "2 1" },
      { id: "tc-3", input: "1\n9", expectedOutput: "9" },
    ],
    editorial: {
      approachTitle: "Iterative In-Place Reversal",
      approachBody: `Traverse the list, holding a reference to the next node, redirecting the current node's next pointer to prev, and advancing prev and curr.`,
      timeComplexity: "O(n) - Linear pass through all nodes.",
      spaceComplexity: "O(1) - Constant auxiliary space.",
      solutionCode: {
        cpp: `#include <iostream>
#include <vector>
using namespace std;

int main() {
    int n;
    if (!(cin >> n)) return 0;
    vector<int> v(n);
    for (int i = 0; i < n; i++) cin >> v[i];
    for (int i = n - 1; i >= 0; i--) cout << v[i] << (i == 0 ? "" : " ");
    cout << endl;
    return 0;
}`,
        python: `import sys
lines = sys.stdin.read().split()
if lines:
    n = int(lines[0])
    print(" ".join(reversed(lines[1:1+n])))`,
        c: `#include <stdio.h>
#include <stdlib.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    int* a = (int*)malloc(n * sizeof(int));
    for (int i = 0; i < n; i++) scanf("%d", &a[i]);
    for (int i = n - 1; i >= 0; i--) printf("%d%s", a[i], i == 0 ? "" : " ");
    printf("\n");
    free(a);
    return 0;
}`,
      },
    },
  },

  // 7. Swap Two Numbers Using Pointers (C)
  {
    id: "c-pointer-swap",
    problemNumber: 101,
    title: "Swap Numbers Using Pointers",
    slug: "swap-numbers-pointers",
    difficulty: "easy",
    category: "C",
    tags: ["Pointers", "Memory Management", "Basics"],
    companyTags: ["TCS", "Wipro", "Infosys", "Cognizant"],
    acceptance: "82.4%",
    description: `Write a program to swap two integers using pointers without returning values from a function.`,
    examples: [
      {
        input: "10 20",
        output: "20 10",
        explanation: "Original: a=10, b=20. After swap: a=20, b=10.",
      },
      {
        input: "-5 99",
        output: "99 -5",
      },
    ],
    constraints: ["-10^9 <= a, b <= 10^9"],
    hints: ["Pass the memory addresses &a and &b to the swap function and dereference them using *."],
    starterCode: {
      c: `#include <stdio.h>

void swap(int* x, int* y) {
    // Write your solution here
    
}

int main() {
    int a, b;
    if (scanf("%d %d", &a, &b) == 2) {
        swap(&a, &b);
        printf("%d %d\n", a, b);
    }
    return 0;
}
`,
      cpp: `#include <iostream>
using namespace std;

void swap(int* x, int* y) {
    int temp = *x;
    *x = *y;
    *y = temp;
}

int main() {
    int a, b;
    if (cin >> a >> b) {
        swap(&a, &b);
        cout << a << " " << b << endl;
    }
    return 0;
}
`,
      python: `import sys

def main():
    nums = sys.stdin.read().split()
    if nums:
        print(f"{nums[1]} {nums[0]}")

if __name__ == "__main__":
    main()
`,
    },
    testCases: [
      { id: "tc-1", input: "10 20", expectedOutput: "20 10" },
      { id: "tc-2", input: "-5 99", expectedOutput: "99 -5" },
      { id: "tc-3", input: "0 42", expectedOutput: "42 0" },
    ],
    editorial: {
      approachTitle: "Pointer Dereferencing",
      approachBody: `Dereference pointer variables via \`int temp = *x; *x = *y; *y = temp;\`.`,
      timeComplexity: "O(1)",
      spaceComplexity: "O(1)",
      solutionCode: {
        c: `#include <stdio.h>
int main() {
    int a, b;
    if (scanf("%d %d", &a, &b) == 2) {
        printf("%d %d\n", b, a);
    }
    return 0;
}`,
        cpp: `#include <iostream>
using namespace std;
int main() {
    int a, b;
    if (cin >> a >> b) cout << b << " " << a << endl;
    return 0;
}`,
        python: `import sys
nums = sys.stdin.read().split()
if nums: print(f"{nums[1]} {nums[0]}")`,
      },
    },
  },

  // 8. C++ Vector Frequency & Sorting (C++)
  {
    id: "cpp-vector-frequency",
    problemNumber: 102,
    title: "Vector Frequency & Sorting",
    slug: "vector-frequency-sorting",
    difficulty: "easy",
    category: "C++",
    tags: ["STL", "Vector", "Sorting", "Map"],
    companyTags: ["Accenture", "Capgemini", "LTI", "Tech Mahindra"],
    acceptance: "68.9%",
    description: `Given \`n\` integers, read them into a vector, sort them in ascending order, and print each unique number followed by its occurrence count formatted as \`num:count\` on separate lines.`,
    examples: [
      {
        input: "6\n4 2 4 1 2 4",
        output: "1:1\n2:2\n4:3",
        explanation: "Sorted unique elements: 1 (count 1), 2 (count 2), 4 (count 3).",
      },
      {
        input: "3\n10 10 10",
        output: "10:3",
      },
    ],
    constraints: ["1 <= n <= 10^5", "-10^6 <= arr[i] <= 10^6"],
    hints: ["Use std::map<int, int> to naturally sort keys while maintaining frequency counts."],
    starterCode: {
      cpp: `#include <iostream>
#include <vector>
#include <map>
#include <algorithm>
using namespace std;

int main() {
    int n;
    if (cin >> n) {
        // Write your solution here
        
    }
    return 0;
}
`,
      python: `import sys
from collections import Counter

def main():
    lines = sys.stdin.read().split()
    if not lines:
        return
    n = int(lines[0])
    nums = [int(x) for x in lines[1:1+n]]
    counts = Counter(nums)
    for k in sorted(counts.keys()):
        print(f"{k}:{counts[k]}")

if __name__ == "__main__":
    main()
`,
      c: `#include <stdio.h>
#include <stdlib.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    // Write your solution here
    return 0;
}
`,
    },
    testCases: [
      { id: "tc-1", input: "6\n4 2 4 1 2 4", expectedOutput: "1:1\n2:2\n4:3" },
      { id: "tc-2", input: "3\n10 10 10", expectedOutput: "10:3" },
    ],
    editorial: {
      approachTitle: "Ordered Map Frequency",
      approachBody: `Inserting elements into an ordered map (\`std::map<int, int>\`) runs in O(N log K) time and automatically orders keys in ascending order.`,
      timeComplexity: "O(n log k) where k is the number of distinct elements.",
      spaceComplexity: "O(k)",
      solutionCode: {
        cpp: `#include <iostream>
#include <map>
using namespace std;
int main() {
    int n;
    if (!(cin >> n)) return 0;
    map<int, int> freq;
    for (int i = 0; i < n; i++) {
        int val; cin >> val;
        freq[val]++;
    }
    for (auto& p : freq) cout << p.first << ":" << p.second << endl;
    return 0;
}`,
        python: `import sys
from collections import Counter
lines = sys.stdin.read().split()
if lines:
    n = int(lines[0])
    counts = Counter([int(x) for x in lines[1:1+n]])
    for k in sorted(counts.keys()):
        print(f"{k}:{counts[k]}")`,
        c: `#include <stdio.h>
#include <stdlib.h>
int cmp(const void* a, const void* b) { return (*(int*)a - *(int*)b); }
int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    int* a = (int*)malloc(n * sizeof(int));
    for (int i = 0; i < n; i++) scanf("%d", &a[i]);
    qsort(a, n, sizeof(int), cmp);
    int cur = a[0], cnt = 1;
    for (int i = 1; i < n; i++) {
        if (a[i] == cur) cnt++;
        else { printf("%d:%d\n", cur, cnt); cur = a[i]; cnt = 1; }
    }
    printf("%d:%d\n", cur, cnt);
    free(a);
    return 0;
}`,
      },
    },
  },
  // 9. Best Time to Buy and Sell Stock (LeetCode 121)
  {
    id: "best-time-to-buy-and-sell-stock",
    problemNumber: 121,
    title: "Best Time to Buy and Sell Stock",
    slug: "best-time-to-buy-and-sell-stock",
    difficulty: "easy",
    category: "DSA",
    tags: ["Array", "Dynamic Programming"],
    companyTags: ["Amazon", "Microsoft", "Meta", "Apple"],
    acceptance: "54.2%",
    description: `You are given an array \`prices\` where \`prices[i]\` is the price of a given stock on the \`i\`th day.

You want to maximize your profit by choosing a **single day** to buy one stock and choosing a **different day in the future** to sell that stock.

Return the maximum profit you can achieve from this transaction. If you cannot achieve any profit, return \`0\`.`,
    examples: [
      {
        input: "6\n7 1 5 3 6 4",
        output: "5",
        explanation: "Buy on day 2 (price = 1) and sell on day 5 (price = 6), profit = 6 - 1 = 5.",
      },
      {
        input: "5\n7 6 4 3 1",
        output: "0",
        explanation: "In this case, no transactions are done and the max profit = 0.",
      },
    ],
    constraints: [
      "1 <= prices.length <= 10^5",
      "0 <= prices[i] <= 10^4",
    ],
    hints: [
      "Can you keep track of the minimum price observed so far?",
      "If you sell on day i, your profit is prices[i] - min_price_so_far.",
    ],
    starterCode: {
      cpp: `#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int maxProfit(const vector<int>& prices) {
    // Write your solution here
    return 0;
}

int main() {
    int n;
    if (!(cin >> n)) return 0;
    vector<int> prices(n);
    for (int i = 0; i < n; i++) cin >> prices[i];
    cout << maxProfit(prices) << endl;
    return 0;
}
`,
      python: `import sys

def max_profit(prices):
    # Write your solution here
    return 0

def main():
    lines = sys.stdin.read().split()
    if not lines:
        return
    n = int(lines[0])
    prices = [int(x) for x in lines[1:1+n]]
    print(max_profit(prices))

if __name__ == "__main__":
    main()
`,
      c: `#include <stdio.h>
#include <stdlib.h>

int maxProfit(int prices[], int n) {
    // Write your solution here
    return 0;
}

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    int* prices = (int*)malloc(n * sizeof(int));
    for (int i = 0; i < n; i++) scanf("%d", &prices[i]);
    printf("%d\n", maxProfit(prices, n));
    free(prices);
    return 0;
}
`,
    },
    testCases: [
      { id: "tc-1", input: "6\n7 1 5 3 6 4", expectedOutput: "5" },
      { id: "tc-2", input: "5\n7 6 4 3 1", expectedOutput: "0" },
      { id: "tc-3", input: "2\n2 4", expectedOutput: "2", isSecret: true },
      { id: "tc-4", input: "5\n1 2 3 4 5", expectedOutput: "4", isSecret: true },
    ],
    editorial: {
      approachTitle: "One Pass (Tracking Min Price)",
      approachBody: `Track the minimum price seen so far (\`minPrice\`) and the maximum profit obtainable if sold today (\`price - minPrice\`). Update the max profit continuously.`,
      timeComplexity: "O(n) - Single pass through prices.",
      spaceComplexity: "O(1) - Only two scalar variables maintained.",
      solutionCode: {
        cpp: `#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int main() {
    int n;
    if (!(cin >> n)) return 0;
    int minPrice = 1e9, maxProfit = 0;
    for (int i = 0; i < n; i++) {
        int p; cin >> p;
        minPrice = min(minPrice, p);
        maxProfit = max(maxProfit, p - minPrice);
    }
    cout << maxProfit << endl;
    return 0;
}`,
        python: `import sys

lines = sys.stdin.read().split()
if lines:
    n = int(lines[0])
    prices = [int(x) for x in lines[1:1+n]]
    min_price = float('inf')
    max_prof = 0
    for p in prices:
        min_price = min(min_price, p)
        max_prof = max(max_prof, p - min_price)
    print(max_prof)`,
        c: `#include <stdio.h>
int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    int minPrice = 1000000000, maxProfit = 0;
    for (int i = 0; i < n; i++) {
        int p; scanf("%d", &p);
        if (p < minPrice) minPrice = p;
        if (p - minPrice > maxProfit) maxProfit = p - minPrice;
    }
    printf("%d\n", maxProfit);
    return 0;
}`,
      },
    },
  },
  // 10. Contains Duplicate (LeetCode 217)
  {
    id: "contains-duplicate",
    problemNumber: 217,
    title: "Contains Duplicate",
    slug: "contains-duplicate",
    difficulty: "easy",
    category: "Python",
    tags: ["Array", "Hash Table", "Sorting"],
    companyTags: ["Apple", "Adobe", "Bloomberg"],
    acceptance: "61.4%",
    description: `Given an integer array \`nums\`, return \`true\` if any value appears **at least twice** in the array, and return \`false\` if every element is distinct.`,
    examples: [
      {
        input: "4\n1 2 3 1",
        output: "true",
        explanation: "1 appears twice at indices 0 and 3.",
      },
      {
        input: "4\n1 2 3 4",
        output: "false",
        explanation: "All elements are distinct.",
      },
    ],
    constraints: [
      "1 <= nums.length <= 10^5",
      "-10^9 <= nums[i] <= 10^9",
    ],
    hints: [
      "Can we use a hash set to track seen numbers?",
      "If num is already in seen, return true immediately.",
    ],
    starterCode: {
      cpp: `#include <iostream>
#include <vector>
#include <unordered_set>
using namespace std;

bool containsDuplicate(const vector<int>& nums) {
    // Write your solution here
    return false;
}

int main() {
    int n;
    if (!(cin >> n)) return 0;
    vector<int> nums(n);
    for (int i = 0; i < n; i++) cin >> nums[i];
    cout << (containsDuplicate(nums) ? "true" : "false") << endl;
    return 0;
}
`,
      python: `import sys

def contains_duplicate(nums):
    # Write your solution here
    return False

def main():
    lines = sys.stdin.read().split()
    if not lines:
        return
    n = int(lines[0])
    nums = [int(x) for x in lines[1:1+n]]
    print("true" if contains_duplicate(nums) else "false")

if __name__ == "__main__":
    main()
`,
      c: `#include <stdio.h>
#include <stdlib.h>
#include <stdbool.h>

int cmp(const void* a, const void* b) { return (*(int*)a - *(int*)b); }

bool containsDuplicate(int nums[], int n) {
    // Write your solution here
    return false;
}

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    int* nums = (int*)malloc(n * sizeof(int));
    for (int i = 0; i < n; i++) scanf("%d", &nums[i]);
    printf("%s\n", containsDuplicate(nums, n) ? "true" : "false");
    free(nums);
    return 0;
}
`,
    },
    testCases: [
      { id: "tc-1", input: "4\n1 2 3 1", expectedOutput: "true" },
      { id: "tc-2", input: "4\n1 2 3 4", expectedOutput: "false" },
      { id: "tc-3", input: "10\n1 1 1 3 3 4 3 2 4 2", expectedOutput: "true", isSecret: true },
    ],
    editorial: {
      approachTitle: "Hash Set Lookup",
      approachBody: `Iterate through the array and check if the current element is in the set. If it is, return true. Otherwise, add it to the set. If the loop finishes, return false.`,
      timeComplexity: "O(n) - Single pass with O(1) hash set operations.",
      spaceComplexity: "O(n) - Storing elements in the hash set.",
      solutionCode: {
        cpp: `#include <iostream>
#include <vector>
#include <unordered_set>
using namespace std;

int main() {
    int n;
    if (!(cin >> n)) return 0;
    unordered_set<int> seen;
    bool dup = false;
    for (int i = 0; i < n; i++) {
        int val; cin >> val;
        if (seen.count(val)) dup = true;
        seen.insert(val);
    }
    cout << (dup ? "true" : "false") << endl;
    return 0;
}`,
        python: `import sys
lines = sys.stdin.read().split()
if lines:
    n = int(lines[0])
    nums = [int(x) for x in lines[1:1+n]]
    print("true" if len(nums) != len(set(nums)) else "false")`,
        c: `#include <stdio.h>
#include <stdlib.h>
int cmp(const void* a, const void* b) { return (*(int*)a - *(int*)b); }
int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    int* a = (int*)malloc(n * sizeof(int));
    for (int i = 0; i < n; i++) scanf("%d", &a[i]);
    qsort(a, n, sizeof(int), cmp);
    int dup = 0;
    for (int i = 1; i < n; i++) {
        if (a[i] == a[i-1]) { dup = 1; break; }
    }
    printf("%s\n", dup ? "true" : "false");
    free(a);
    return 0;
}`,
      },
    },
  },
  // 11. Climbing Stairs (LeetCode 70)
  {
    id: "climbing-stairs",
    problemNumber: 70,
    title: "Climbing Stairs",
    slug: "climbing-stairs",
    difficulty: "easy",
    category: "DSA",
    tags: ["Math", "Dynamic Programming", "Memoization"],
    companyTags: ["Google", "Amazon", "Uber", "Apple"],
    acceptance: "52.6%",
    description: `You are climbing a staircase. It takes \`n\` steps to reach the top.

Each time you can either climb \`1\` or \`2\` steps. In how many distinct ways can you climb to the top?`,
    examples: [
      {
        input: "2",
        output: "2",
        explanation: "There are two ways to climb to the top:\n1. 1 step + 1 step\n2. 2 steps",
      },
      {
        input: "3",
        output: "3",
        explanation: "There are three ways to climb to the top:\n1. 1 step + 1 step + 1 step\n2. 1 step + 2 steps\n3. 2 steps + 1 step",
      },
    ],
    constraints: [
      "1 <= n <= 45",
    ],
    hints: [
      "To reach the n-th step, what could have been your previous step?",
      "It could have been step n-1 or step n-2! So ways(n) = ways(n-1) + ways(n-2).",
    ],
    starterCode: {
      cpp: `#include <iostream>
using namespace std;

int climbStairs(int n) {
    // Write your solution here
    return 0;
}

int main() {
    int n;
    if (!(cin >> n)) return 0;
    cout << climbStairs(n) << endl;
    return 0;
}
`,
      python: `import sys

def climb_stairs(n):
    # Write your solution here
    return 0

def main():
    line = sys.stdin.read().strip()
    if not line:
        return
    n = int(line)
    print(climb_stairs(n))

if __name__ == "__main__":
    main()
`,
      c: `#include <stdio.h>

int climbStairs(int n) {
    // Write your solution here
    return 0;
}

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    printf("%d\n", climbStairs(n));
    return 0;
}
`,
    },
    testCases: [
      { id: "tc-1", input: "2", expectedOutput: "2" },
      { id: "tc-2", input: "3", expectedOutput: "3" },
      { id: "tc-3", input: "4", expectedOutput: "5" },
      { id: "tc-4", input: "5", expectedOutput: "8", isSecret: true },
      { id: "tc-5", input: "8", expectedOutput: "34", isSecret: true },
    ],
    editorial: {
      approachTitle: "Fibonacci Space-Optimized Dynamic Programming",
      approachBody: `Notice that ways(n) = ways(n-1) + ways(n-2) with base cases ways(1) = 1 and ways(2) = 2. This is identical to the Fibonacci sequence, which can be computed in O(N) time and O(1) space.`,
      timeComplexity: "O(n) - Linear loop from 3 to n.",
      spaceComplexity: "O(1) - Only two previous values stored.",
      solutionCode: {
        cpp: `#include <iostream>
using namespace std;
int main() {
    int n;
    if (!(cin >> n)) return 0;
    if (n <= 2) { cout << n << endl; return 0; }
    int a = 1, b = 2;
    for (int i = 3; i <= n; i++) {
        int c = a + b;
        a = b;
        b = c;
    }
    cout << b << endl;
    return 0;
}`,
        python: `import sys
line = sys.stdin.read().strip()
if line:
    n = int(line)
    if n <= 2:
        print(n)
    else:
        a, b = 1, 2
        for _ in range(3, n + 1):
            a, b = b, a + b
        print(b)`,
        c: `#include <stdio.h>
int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    if (n <= 2) { printf("%d\n", n); return 0; }
    int a = 1, b = 2;
    for (int i = 3; i <= n; i++) {
        int c = a + b;
        a = b;
        b = c;
    }
    printf("%d\n", b);
    return 0;
}`,
      },
    },
  },
];

