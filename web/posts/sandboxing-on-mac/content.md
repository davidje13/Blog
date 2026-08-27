---
title: 'Sandboxing Node.js on Mac'
author: David Evans
description:
  'A guide on using MacOS’ sandbox-exec command to limit the potential damage
  from NPM supply chain attacks.'
created: 2026-08-25
modified: 2026-08-27
tags:
  - web
  - security
---

# Sandboxing Node.js on Mac

Node.js' NPM package ecosystem has always been a wild-west, with developers
blindly downloading and executing code from hundreds or even thousands of
contributors with full user permissions on their computer, making it an easy
target for supply chain attacks. This issue has been highlighted repeatedly over
the past year by multiple waves of "Shai-Hulud" compromises
([September](https://www.stepsecurity.io/blog/ctrl-tinycolor-and-40-npm-packages-compromised),
[November](https://unit42.paloaltonetworks.com/npm-supply-chain-attack/),
[April](https://www.stepsecurity.io/blog/a-mini-shai-hulud-has-appeared),
[May](https://snyk.io/blog/tanstack-npm-packages-compromised/),
[May again](https://www.microsoft.com/en-us/security/blog/2026/05/20/mini-shai-hulud-compromised-antv-npm-packages-enable-ci-cd-credential-theft/),
[June](https://www.sonatype.com/blog/new-shai-hulud-miasma-wave-hits-hundreds-of-npm-packages),
[August](https://securitylabs.datadoghq.com/articles/npm-worm-compromises-popular-npm-packages/)).

I've been pushing my own projects towards fewer dependencies (especially
transitive dependencies), but there will always be the potential for
compromises.

This problem is not unique to NPM or Node.js; similar issues are well known for
[Python](https://blog.pypi.org/posts/2026-04-02-incident-report-litellm-telnyx-supply-chain-attack/),
[Rust](https://blog.rust-lang.org/2026/08/20/supply-chain-attack-on-arrayref/),
and
[Golang](https://socket.dev/blog/malicious-package-exploits-go-module-proxy-caching-for-persistence)'s
package ecosystems. The risk applies anywhere there are unvetted dependencies,
especially when deeply-nested transitive dependencies are common. This post
focuses on Node.js in particular, but the techniques described here can be
applied to other runtimes with a bit of work.

## First steps

The most common attacks observed so far in the NPM ecosystem use install-time
scripts. For whatever crazy reason, the default NPM configuration will eagerly
execute a package-defined script whenever the package is installed. Fortunately
these scripts are very rarely needed for legitimate purposes any more, and are
easily disabled by adding `--ignore-scripts` to the `npm` command (or better:
`ignore-scripts=true` to a project-level `.npmrc` file).

With that simple change, we block the vast majority of _currently observed_
attacks.

But this attack vector is only used because it is the lowest-effort way to
compromise _most_ users. There is nothing to stop an attacker from going further
and embedding their payload inside a package's own code. Consider a build or
test tool which is intentionally executed by the developer, or any library that
might be loaded during unit tests with full system access.

We can defend ourselves a bit more by only using package versions after they
have been available for a period of time. For NPM: add `min-release-age=7` to
`.npmrc` (or run with `--min-release-age=7` when installing new dependencies or
updating versions). Doing so allows time for security companies to scan the
dependencies and potentially spot suspicious changes, or for other users to fall
victim and report the compromise. Generally internet sources recommend 7 days
for this, but you can set it higher if you want to be extra-safe (with a
trade-off of not picking up security fixes quickly). It's also possible to
explicitly override the `min-release-age` for individual commands (e.g. if you
know you need to update a particular package to the latest version to fix a
security issue).

But even with these protections, it's still possible to end up using a
dependency which has been compromised.

## Limiting the damage

If we end up downloading and executing a compromised dependency, we want to
minimise any potential damage which could be done by the payload. In particular,
we want to block:

- exfiltration of local secrets, such as SSH keys or Git / NPM credentials;
- reading unrelated files which may contain sensitive data;
- tampering with system files or configuration;
- rendering the system or data unusable (e.g. ransomware).

But there are also some things we won't realistically be able to prevent:

- if a malicious dependency gets all the way to production, it will be able to
  manipulate our app's behaviour and potentially exfiltrate or modify user data;
- we cannot restrict access too much or the tools will not work at all (e.g.
  code formatters must be able to write project files, so an attacker could
  modify or destroy our current working state);
- secrets which are available during test runs can be exfiltrated if the app has
  any network access;
- some denial-of-service attacks such as exhausting the processor (e.g. fork
  bombs) or filling up the disk are out of scope for this article.

As always, the best defences are layered: dependencies should be vetted as much
as is practical before being used, even on developer workstations, and
credentials should be cycled if any compromise is detected, even if it appears
to have been contained. The rest of this article shows an approach which limits
the damage when all other precautions have failed.

## How about Docker?

One way to sandbox commands is to run them inside a container. With Docker, that
looks something like this:

```sh
docker run --rm -it --mount type=bind,src=.,dst=/work -w /work node:26-alpine sh
```

(I won't go through explaining how to install Docker on Mac; that's covered
elsewhere, so this assumes you already have it set up)

The command leaves you in an interactive shell where you can run commands that
have access to the current directory and network, but are otherwise isolated. It
works as a decent sandbox, with some limitations (most notably: since the
project's hidden `.git` directory is accessible, it's possible for a motivated
attacker to escape the sandbox by adding a
[Git Hook](https://git-scm.com/book/ms/v2/Customizing-Git-Git-Hooks) which will
run outside the container when you perform any Git actions).

Besides the limited protection, the main disadvantage is that this is quite
"heavy": behind the scenes, Docker runs a Linux Virtual Machine, then uses
Linux's layered filesystem to implement the container. This occupies a chunk of
RAM and adds some overhead to all filesystem operations (though it has improved
significantly over recent years and the bind mount mostly alleviates filesystem
delays for project files). It also needs Docker Desktop (which requires a paid
license if used in a large enough company, regardless of the number of employees
actually using it).

So can we do better?

## `sandbox-exec`

MacOS contains a comprehensive sandboxing tool which can be used to achieve a
good level of isolation, but it takes a bit of configuration.

The tool is `sandbox-exec`, and it's used by various system dæmons to limit the
impact if a system utility is compromised. Officially the tool is deprecated and
undocumented, but the
[recommended alternative](https://developer.apple.com/documentation/xcode/configuring-the-macos-app-sandbox)
is impractically cumbersome, and `sandbox-exec` is used widely enough that it is
likely to stick around for a good while yet. AI companies are also increasingly
using it to limit the impact of prompt injection attacks.

If you'd like to jump to a working `sandbox-exec` setup for Node.js, see the
final [Node.js policy](#node-js-policy) below. Otherwise, continue reading to
see how to set up a policy from scratch.

## Figuring out a policy

Setting up a `sandbox-exec` policy for an existing process requires a bit of
trial-and-error: begin with a very restrictive policy, run the program, then
check the sandbox logs to see what got blocked. Repeat until the program is able
to do everything it needs to do. It's best explained by example:

### Worked example for `curl`

To run any command at all, some basic permissions are needed. Let's begin with a
policy that blocks as much as possible, but still allows us to launch an
executable:

```sh
cat > my-policy.sb <<EOF
(version 1)
(deny default)

(allow sysctl-read)
(allow process-exec)
(allow file-read*
  (require-all
    (file-mode #o0004)
    (require-any
      (literal "/")
      (literal "/dev")
      (subpath "/System")
      (subpath "/bin")
      (subpath "/usr")
      (subpath "/etc")
      (subpath "/var")
      (subpath "/private")
    )
  )
)
EOF
```

We can launch an arbitrary process sandboxed by this policy with:

```sh
sandbox-exec -f my-policy.sb curl example.com
```

Which will produce:

> ```text
> curl: (6) Could not resolve host: example.com
> ```

The failure tells us that the sandbox has worked, and (in this case) has
correctly blocked an attempt to access the network. We can find out exactly why
our `curl` command failed by checking the sandbox logs. The following command
streams all sandbox errors as they happen:

```sh
log stream --style compact --predicate 'sender=="Sandbox" && messageType=="error"'
```

But it can be a bit noisy; there are lots of system processes using this
sandboxing, and they frequently try to access things they're not allowed to
(presumably because the sandboxing rules were retrofitted imperfectly to
existing processes, rather then built-up alongside them), for example:

> ```text
> [...] (Sandbox) Sandbox: findmybeaconingd(507) deny(1) mach-lookup com.apple.timed.xpc
> ```

So it's useful to filter the output further with `grep` to highlight the
relevant errors. I currently use this command to filter out some of the noisier
system services:

```sh
log stream --style compact --predicate 'sender=="Sandbox" && messageType=="error"' --color always | grep -ve ' \(searchpartyuseragent\|spotlightknowledged\|imagent\|findmydeviced\|findmybeaconingd\|locationd\|triald\|adprivacyd\|duetexpertd\|parsec-fbf\|MessagesBlastDoorService\)('
```

As a convenience, I added an alias for this filtered view to my `~/.zprofile`:

```sh
alias sb-debug="log stream --style compact --predicate 'sender==\"Sandbox\" && messageType==\"error\"' --color always | grep -ve ' \\(searchpartyuseragent\\|spotlightknowledged\\|imagent\\|findmydeviced\\|findmybeaconingd\\|locationd\\|triald\\|adprivacyd\\|duetexpertd\\|parsec-fbf\\|MessagesBlastDoorService\\)('"
```

Running the sandboxed `curl` command while the logs are being streamed will show
something like this:

> ```text
> 2000-01-01 00:00:00.000 E  kernel[0:35ba7] (Sandbox) Sandbox: curl(3473) deny(1) file-read-data /dev/dtracehelper
> 2000-01-01 00:00:00.000 E  kernel[0:35a4f] (Sandbox) Sandbox: curl(3473) deny(1) mach-lookup com.apple.system.notification_center
> 2000-01-01 00:00:00.000 E  kernel[0:35a4f] (Sandbox) Sandbox: curl(3473) deny(1) mach-lookup com.apple.system.opendirectoryd.libinfo
> 2000-01-01 00:00:00.000 E  kernel[0:35a4f] (Sandbox) 1 duplicate report for Sandbox: curl(3473) deny(1) mach-lookup com.apple.system.opendirectoryd.libinfo
> 2000-01-01 00:00:00.000 E  kernel[0:35a4f] (Sandbox) Sandbox: curl(3473) deny(1) mach-lookup com.apple.logd
> 2000-01-01 00:00:00.000 E  kernel[0:35a4f] (Sandbox) Sandbox: curl(3473) deny(1) mach-lookup com.apple.system.opendirectoryd.libinfo
> 2000-01-01 00:00:00.000 E  kernel[0:35ba7] (Sandbox) Sandbox: curl(3473) deny(1) file-read-metadata /Users/me
> 2000-01-01 00:00:00.000 E  kernel[0:35a4f] (Sandbox) Sandbox: curl(3473) deny(1) mach-lookup com.apple.diagnosticd
> 2000-01-01 00:00:00.000 E  kernel[0:35a4f] (Sandbox) 4 duplicate reports for Sandbox: curl(3473) deny(1) mach-lookup com.apple.diagnosticd
> 2000-01-01 00:00:00.000 E  kernel[0:35a4f] (Sandbox) Sandbox: curl(3473) deny(1) mach-lookup com.apple.system.opendirectoryd.libinfo
> 2000-01-01 00:00:00.000 E  kernel[0:35a4f] (Sandbox) Sandbox: curl(3473) deny(1) mach-lookup com.apple.diagnosticd
> 2000-01-01 00:00:00.000 E  kernel[0:35a4f] (Sandbox) 3 duplicate reports for Sandbox: curl(3473) deny(1) mach-lookup com.apple.diagnosticd
> 2000-01-01 00:00:00.000 E  kernel[0:35a4f] (Sandbox) Sandbox: curl(3473) deny(1) mach-lookup com.apple.system.opendirectoryd.libinfo
> 2000-01-01 00:00:00.000 E  kernel[0:35ba8] (Sandbox) Sandbox: curl(3473) deny(1) file-read-data /Library/Preferences/.GlobalPreferences.plist
> 2000-01-01 00:00:00.000 E  kernel[0:35a4f] (Sandbox) Sandbox: curl(3473) deny(1) mach-lookup com.apple.diagnosticd
> 2000-01-01 00:00:00.000 E  kernel[0:3502d] (Sandbox) 1 duplicate report for Sandbox: curl(3473) deny(1) mach-lookup com.apple.diagnosticd
> 2000-01-01 00:00:00.000 E  kernel[0:3502d] (Sandbox) Sandbox: curl(3473) deny(1) mach-lookup com.apple.SystemConfiguration.configd
> 2000-01-01 00:00:00.000 E  kernel[0:3502d] (Sandbox) Sandbox: curl(3473) deny(1) mach-lookup com.apple.system.opendirectoryd.libinfo
> 2000-01-01 00:00:00.000 E  kernel[0:3502d] (Sandbox) Sandbox: curl(3473) deny(1) mach-lookup com.apple.diagnosticd
> 2000-01-01 00:00:00.000 E  kernel[0:35baa] (Sandbox) Sandbox: curl(3473) deny(1) file-read-data /Library/Preferences/com.apple.networkd.plist
> 2000-01-01 00:00:00.000 E  kernel[0:3502d] (Sandbox) Sandbox: curl(3473) deny(1) mach-lookup com.apple.diagnosticd
> 2000-01-01 00:00:00.000 E  kernel[0:35baa] (Sandbox) Sandbox: curl(3473) deny(1) file-read-data /Library/Preferences/com.apple.networkd.plist
> 2000-01-01 00:00:00.000 E  kernel[0:3502d] (Sandbox) Sandbox: curl(3473) deny(1) mach-lookup com.apple.diagnosticd
> 2000-01-01 00:00:00.000 E  kernel[0:35baa] (Sandbox) 2 duplicate reports for Sandbox: curl(3473) deny(1) mach-lookup com.apple.diagnosticd
> 2000-01-01 00:00:00.000 E  kernel[0:35baa] (Sandbox) Sandbox: curl(3473) deny(1) network-outbound /private/var/run/mDNSResponder
> 2000-01-01 00:00:00.000 E  kernel[0:3502d] (Sandbox) Sandbox: curl(3473) deny(1) mach-lookup com.apple.diagnosticd
> ```

Stripping out the irrelevent information and duplicates, we see that the
following actions were denied:

```text
file-read-data /dev/dtracehelper
file-read-data /Library/Preferences/.GlobalPreferences.plist
file-read-data /Library/Preferences/com.apple.networkd.plist
file-read-metadata /Users/me
mach-lookup com.apple.diagnosticd
mach-lookup com.apple.logd
mach-lookup com.apple.system.notification_center
mach-lookup com.apple.system.opendirectoryd.libinfo
mach-lookup com.apple.SystemConfiguration.configd
network-outbound /private/var/run/mDNSResponder
```

We can decide which of those we actually want to allow, and add them to the
policy. For example, let's allow everything it tried to do:

```sh
cat >> my-policy.sb <<EOF
(allow file-read-data
  (literal "/dev/dtracehelper")
  (literal "/Library/Preferences/.GlobalPreferences.plist")
  (literal "/Library/Preferences/com.apple.networkd.plist")
)
(allow file-read-metadata (subpath "/Users"))
(allow mach-lookup
  (global-name "com.apple.diagnosticd")
  (global-name "com.apple.logd")
  (global-name "com.apple.system.notification_center")
  (global-name "com.apple.system.opendirectoryd.libinfo")
  (global-name "com.apple.SystemConfiguration.configd")
)
(allow network-outbound (literal "/private/var/run/mDNSResponder"))
EOF
```

The syntax is readable enough. Whitespace and newlines are ignored, and
parentheses `()` are used to group sections. Each section begins with `allow` or
`deny`, then an action (which we can get from the logs), then optionally one or
more requirements (variously called predicates or filters). The exact
requirements depend on the type of action, but it is usually a path or
identifier.

Running our sandboxed `curl` command now gives us a new error:

> ```text
> curl: (7) Failed to connect to example.com port 80 after 67 ms: Couldn't connect to server
> ```

The DNS lookup has succeeded, but the actual connection was blocked. Again, we
can look at the sandbox logs to see what happened:

> ```text
> [...] Sandbox: curl(3575) deny(1) file-write-data /dev/dtracehelper
> [...] Sandbox: curl(3575) deny(1) ipc-posix-shm-read-data apple.shm.notification_center
> [...] 5 duplicate reports for Sandbox: curl(3575) deny(1) ipc-posix-shm-read-data apple.shm.notification_center
> [...] Sandbox: curl(3575) deny(1) file-read-data /dev/autofs_nowait
> [...] Sandbox: curl(3575) deny(1) file-read-data /Users/me/.CFUserTextEncoding
> [...] Sandbox: curl(3575) deny(1) ipc-posix-shm-read-data apple.shm.notification_center
> [...] Sandbox: curl(3575) deny(1) file-read-data /dev/autofs_nowait
> [...] Sandbox: curl(3575) deny(1) file-read-data /Users/me/.CFUserTextEncoding
> [...] Sandbox: curl(3575) deny(1) ipc-posix-shm-read-data apple.shm.notification_center
> [...] 16 duplicate reports for Sandbox: curl(3575) deny(1) ipc-posix-shm-read-data apple.shm.notification_center
> [...] Sandbox: curl(3575) deny(1) file-read-data /Users/me/Library/Preferences/ByHost/.GlobalPreferences.[snip].plist
> [...] Sandbox: curl(3575) deny(1) ipc-posix-shm-read-data apple.shm.notification_center
> [...] 2 duplicate reports for Sandbox: curl(3575) deny(1) ipc-posix-shm-read-data apple.shm.notification_center
> [...] Sandbox: curl(3575) deny(1) file-read-data /Users/me/Library/Preferences/.GlobalPreferences.plist
> [...] Sandbox: curl(3575) deny(1) ipc-posix-shm-read-data apple.shm.notification_center
> [...] Sandbox: curl(3575) deny(1) file-read-data /Users/me/Library/Preferences/.GlobalPreferences_m.plist
> [...] Sandbox: curl(3575) deny(1) ipc-posix-shm-read-data apple.shm.notification_center
> [...] 6 duplicate reports for Sandbox: curl(3575) deny(1) ipc-posix-shm-read-data apple.shm.notification_center
> [...] Sandbox: curl(3575) deny(1) system-socket domain:32 type:2 protocol:2
> [...] Sandbox: curl(3575) deny(1) ipc-posix-shm-read-data apple.shm.notification_center
> [...] Sandbox: curl(3575) deny(1) system-socket domain:32 type:2 protocol:2
> [...] Sandbox: curl(3575) deny(1) ipc-posix-shm-read-data apple.shm.notification_center
> [...] Sandbox: curl(3575) deny(1) network-outbound remote:*:80
> ```

Simplified and deduplicated:

```text
file-read-data /dev/autofs_nowait
file-read-data /Users/me/.CFUserTextEncoding
file-read-data /Users/me/Library/Preferences/.GlobalPreferences_m.plist
file-read-data /Users/me/Library/Preferences/.GlobalPreferences.plist
file-read-data /Users/me/Library/Preferences/ByHost/.GlobalPreferences.[snip].plist
file-write-data /dev/dtracehelper
ipc-posix-shm-read-data apple.shm.notification_center
network-outbound remote:*:80
system-socket domain:32 type:2 protocol:2
```

A lot of these are noisy things that `curl` doesn't strictly need. We could
allow everything it wants, but for now let's just give it the network access:

```sh
cat >> my-policy.sb <<EOF
(allow network-outbound)
(allow system-socket
  (require-all
    (socket-domain AF_SYSTEM)
    (socket-protocol 2)
  )
)
EOF
```

Now our `curl` command works!

> ```text
> <!doctype html><html lang="en"><head><title>Example Domain</title>[...]
> ```

It will still produce a lot of sandbox warnings when it runs, because we didn't
allow everything that it tries to do. It's up to us to decide how much of the
optional functionality we need or want to enable. If we decide to deny some
actions, we can make that choice explicit to avoid the log noise:

```sh
cat >> my-policy.sb <<EOF
(deny file-write-data
  (literal "/dev/dtracehelper")
  (with no-log)
)
EOF
```

Explicitly denying and not logging these unnecessary actions is beneficial
because it makes it easier to spot if the command suddenly starts trying to
access something unexpected; an indication of a potential compromise.

### Allowing access to the current working directory

Many commands (Node.js included) need access to files in the current working
directory and the ability to traverse (if not read) the parent folders. Tools
also commonly try to read configuration files from the current user's home
directory. `sandbox-exec` has no way to express these needs, but we can use a
helper shell function to amend our policy:

```sh
sb-substitute() {
  # replace placeholders
  sed -e "s|PWD|$PWD|g" -e "s|HOME|$HOME|g" "$1";

  # allow access to list contents of parent directories
  echo '(allow file-read-metadata';
  local DIR="$PWD";
  while [ "$DIR" != "/" ]; do
    echo '(literal "'"$DIR"'")'
    DIR="$(dirname "$DIR")";
  done
  echo ')';
}

sb() {
  sandbox-exec -p "$(sb-substitute "$HOME/my-policy.sb")" "$@";
}
```

(these can be defined in `~/.zprofile` if using the default `zsh` shell to make
them globally available).

Now we can update our policy to allow read/write access to files in the current
directory, and we can selectively exclude sub-directories (`.git` in this case):

```sh
cat >> my-policy.sb <<EOF
(allow file-read* file-write* (subpath "PWD"))
(deny file* file-read* file-write* (regex "\\.git(/|$)"))
EOF
```

And the wrapper function means we can execute commands inside our sandbox with:

```sh
sb curl example.com
```

## Node.js policy

Node.js is a much bigger executable than `curl`^^\[citation needed\]^^, but by
following the same process explained above, I have derived this policy for
running common Node.js programs. Depending on which features of Node.js you're
using, you may need to extend it.

```sandbox-exec-policy
(version 1)
(deny default)

; allow launching executables
(allow process-exec)
(allow process-fork)
(allow signal (target children))

; reading system information (e.g. OS detection) & shared preferences
(allow sysctl-read)
(allow file-read*
  (literal "/Library/Preferences/.GlobalPreferences.plist")
  (literal "/Library/Preferences/com.apple.networkd.plist")
  (literal "HOME/Library/Preferences/.GlobalPreferences.plist")
  (literal "HOME/Library/Preferences/.GlobalPreferences_m.plist")
  (literal "HOME/.CFUserTextEncoding")
)
(allow user-preference-read
  (preference-domain "kcfpreferencesanyapplication")
)

; adding extra restrictions
(allow file-chroot)

; shared memory access (Node.js wants this, but does work without it)
(allow ipc-posix-shm-read-data)

; listening on local ports and connecting to local services
(allow network-bind (local ip "localhost:*"))
(allow network-inbound (local ip "localhost:*"))
(allow network-outbound
  (remote ip "localhost:*")
  (remote unix-socket (path-literal "/private/var/run/mDNSResponder"))
)
(allow system-socket (require-all (socket-domain AF_SYSTEM) (socket-protocol 2)))

; configuring terminal
(allow file-read-data (require-all (file-mode #o0004) (regex "^/dev/tty")))
(allow file-ioctl file-write-data (require-all (file-mode #o0002) (regex "^/dev/tty")))
(allow file-ioctl file-read-data file-write-data (regex "^/dev/ttys"))

; common devices
(allow file-read*
  (literal "/dev/random")
  (literal "/dev/urandom")
  (literal "/dev/autofs_nowait")
)
(allow file-read* file-write-data
  (literal "/dev/null")
  (literal "/dev/zero")
)

; reading files in most places (as long as they are guest-readable)
(allow file-read* (require-all (file-mode #o0004) (require-any
  (literal "/")
  (literal "/dev")
  (subpath "/System")
  (subpath "/Library/Preferences/Logging")
  (subpath "/bin")
  (subpath "/sbin")
  (subpath "/usr")
  (subpath "/etc")
  (subpath "/var")
  (subpath "/tmp")
  (subpath "/private")
)))
(allow file-read-metadata (subpath "/dev"))
(allow file-read-metadata (require-all (file-mode #o0001) (require-any
  (literal "/opt")
  (literal "/Library")
  (literal "/Users")
)))

; temp files
(allow file-read* file-write* (subpath "/private/var/folders"))
(deny file-write* (literal "/private/var/folders"))

; libraries used by Node.js
(allow mach-lookup
  (global-name "com.apple.coreservices.launchservicesd")
  (global-name "com.apple.diagnosticd")
  (global-name "com.apple.FSEvents")
  (global-name "com.apple.logd")
  (global-name "com.apple.SystemConfiguration.DNSConfiguration")
  (global-name "com.apple.system.notification_center")
  (global-name "com.apple.system.opendirectoryd.libinfo")
  (global-name "com.apple.SystemConfiguration.DNSConfiguration")
)
(allow file-ioctl file-read* file-write-data (literal "/dev/dtracehelper"))

; access to npm-related files and folders
(allow file-read-metadata (literal "HOME") (subpath "HOME/.npm"))
(allow file-read-data (literal "HOME/.npm/_logs"))
(allow file-read* file-write* (subpath "HOME/.npm/_logs") (subpath "HOME/.npm/_cacache"))
(allow file-read* (subpath "/usr/local/lib/node_modules"))

; read/write access to all files in the current directory, except .git
(allow file-read* file-write* (subpath "PWD"))
(deny file* file-read* file-write* (regex "\\.git(/|$)"))

; explicitly deny access to some locations, even if the files are accidentally world-readable
(deny file* file-read* file-write*
  (subpath "HOME/.ssh")
  (literal "HOME/.npmrc")
  (literal "HOME/.gitconfig")
  (with no-log) ; we expect legitimate tasks to try reading these files sometimes
)
```

As
[explained in the section above](#allowing-access-to-the-current-working-directory),
this policy has some placeholders that need to be substituted. To do this, I've
added the following scripts to my `~/.zprofile` file, which expects to find the
above policy saved as `~/nodejs-policy.sb`:

```sh
sb-substitute() {
  sed -e "s|PWD|$PWD|g" -e "s|HOME|$HOME|g" "$1";

  # allow access to list contents of parent directories
  echo '(allow file-read-metadata';
  local DIR="$PWD";
  while [ "$DIR" != "/" ]; do
    echo '(literal "'"$DIR"'")'
    DIR="$(dirname "$DIR")";
  done
  echo ')';
}

# Sandbox without network access
sb() {
  sandbox-exec -p "$(sb-substitute "$HOME/nodejs-policy.sb")" "$@";
}

# Sandbox with network access (e.g. for npm install)
sb-net() {
  sandbox-exec -p "$(sb-substitute "$HOME/nodejs-policy.sb") (allow network-outbound)" "$@";
}
```

This defines two commands:

- `sb` runs a command inside a sandbox. For example `sb npm test`. The sandbox
  has the necessary permissions for Node.js to run happily, but blocks access to
  large parts of the system and network.
- `sb-net` is for when a command is expected to need network access (e.g. to
  download something, like `sb-net npm install`). It grants outbound network
  access on top of the permissions given by `sb`.

**Important:** Both `sb` and `sb-net` block access to `~/.npmrc` (which may
contain secrets), so if you're relying on your global `.npmrc` file to set the
`--ignore-scripts` flag or other security features, you'll need to switch to
putting that in per-project files (recommended), or adding it explicitly when
you run the command.

With this setup, I've got into the habit of running:

```sh
sb-net npm install
sb npm test
sb npm start
# etc
```

## Limitations

Once a process is inside a sandbox, it cannot get out by any means. This is a
good thing for security, but means you cannot perform activities like launching
a browser (e.g. for tests). With the necessary permissions, it is possible to
communicate with existing processes (such as a docker dæmon), which may provide
a suitable escape-hatch without compromising security too much (the exact
balance will depend on your situation).

## More information / further reading

- [Sandboxing code on MacOS by Lucas Wiman](https://lucaswiman.github.io/blog/2023-06-04--macos-sandbox/)
  is a good introduction to the `sandbox-exec` command and lists some of the
  common predicates.
- ["Apple's Sandbox Guide" by fG!](https://reverse.put.as/wp-content/uploads/2011/09/Apple-Sandbox-Guide-v0.2.pdf),
  reverse-engineers a lot of the available features of `sandbox-exec` and is a
  good reference for available actions.
