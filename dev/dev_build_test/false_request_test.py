import argparse
import urllib.error
import urllib.request


def main() -> int:
    parser = argparse.ArgumentParser(description="Send repeated requests and count responses.")
    parser.add_argument("--url", default="http://127.0.0.1:3000/does_not_exist")
    parser.add_argument("--count", type=int, default=20)
    parser.add_argument("--timeout", type=float, default=2.0)
    args = parser.parse_args()

    response_count = 0
    status_histogram = {}

    for _ in range(args.count):
        try:
            with urllib.request.urlopen(args.url, timeout=args.timeout) as response:
                status = response.getcode()
                status_histogram[status] = status_histogram.get(status, 0) + 1
                response_count += 1
        except urllib.error.HTTPError as e:
            status_histogram[e.code] = status_histogram.get(e.code, 0) + 1
            response_count += 1
        except Exception:
            status_histogram["error"] = status_histogram.get("error", 0) + 1

    print(f"Total requests: {args.count}")
    print(f"Total responses: {response_count}")
    print(f"Status counts: {status_histogram}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
