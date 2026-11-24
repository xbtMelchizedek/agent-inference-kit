# Security

Report vulnerabilities privately through GitHub's **Report a vulnerability** button on this repository (Security tab, then Advisories). Please don't open a public issue.

In scope:
- A `run` command in `kit.json` that does something other than what its summary says, or that the validator should have refused.
- Script or markup injection into the page from `kit.json`, the justweight snapshot or the GitHub API.
- The `traction` command leaking its token into output or files, or sending it anywhere but api.github.com.

Issues in a listed tool belong in that tool's own repository, through its SECURITY.md.
