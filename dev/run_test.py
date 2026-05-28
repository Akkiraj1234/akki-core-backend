import subprocess
import os
from pathlib import Path

# path
root_path = Path(__file__).parent.parent
test_path = f"{root_path}/test"





def main():
    print(test_path)


if __name__ == "__main__":
    main()