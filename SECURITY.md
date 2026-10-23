# Security policy

## Supported versions

LaunchGrade is pre-1.0. Security fixes land on `main` and in the latest published release. If you are using a fork, pull from `main` before reporting.

| Version | Supported |
| --- | --- |
| 0.1.x | Yes |
| Older / forks | No |

## Reporting a vulnerability

Please **do not open a public issue** for a security problem.

Use GitHub's private vulnerability reporting:

<https://github.com/fastpresspages/launchgrade/security/advisories/new>

If that is unavailable, email **meetcode99@gmail.com** with:

- a description of the issue and its impact;
- the affected file, version or command;
- minimal reproduction steps;
- any suggested fix.

You can expect an acknowledgement within a few days. This is a small volunteer project, so please allow reasonable time before disclosure. We will credit you in the advisory unless you prefer to stay anonymous.

## Scope

LaunchGrade is a local command-line tool. It fetches public web pages and a small allowlist of well-known files. It does not execute page JavaScript, does not run a browser, and does not send page contents to a third party.

In scope:

- command injection or path traversal through CLI arguments;
- crashes or hangs caused by hostile HTML, headers or redirects;
- SSRF-style access to internal networks when the tool is used as a service;
- report output that executes injected script when opened (XSS in generated HTML);
- supply-chain issues in the published package;
- secrets accidentally committed to the repository.

Out of scope:

- the accuracy of a check or the fairness of a score;
- pages that intentionally serve different content to scanners;
- vulnerabilities in the site being scanned;
- denial of service against your own machine while scanning a hostile URL;
- social engineering.

## Using LaunchGrade safely

- Only scan URLs you are allowed to scan.
- Treat generated HTML reports as untrusted if the scanned page is untrusted. The renderer escapes page-derived text, but reports are still snapshots of external content.
- Do not run LaunchGrade against `localhost`, private IP ranges or internal hostnames in shared CI unless you understand the network exposure. The CLI deliberately allows local URLs so contributors can test fixtures; a hosted service must add its own egress restrictions.
- The GitHub Action accepts a URL input. Do not expose that input to untrusted pull requests without review.

## Dependencies

The runtime has zero npm dependencies. CI runs on GitHub-hosted runners. If a dependency is ever added, it must be justified in the pull request and pinned.
