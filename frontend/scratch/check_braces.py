
import sys

def check_balance(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    stack = []
    for i, char in enumerate(content):
        if char == '{':
            stack.append(('{', i))
        elif char == '}':
            if not stack:
                print(f"Extra }} at index {i}")
            else:
                stack.pop()
        elif char == '(':
            stack.append(('(', i))
        elif char == ')':
            if not stack:
                print(f"Extra ) at index {i}")
            else:
                stack.pop()
        elif char == '[':
            stack.append(('[', i))
        elif char == ']':
            if not stack:
                print(f"Extra ] at index {i}")
            else:
                stack.pop()
    
    for char, i in stack:
        # Find line number
        line_no = content.count('\n', 0, i) + 1
        print(f"Unclosed {char} at line {line_no}")

if __name__ == "__main__":
    check_balance(sys.argv[1])
