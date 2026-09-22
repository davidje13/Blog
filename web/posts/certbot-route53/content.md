---
title: 'Configuring Certbot with Route53, the Safe Way'
author: David Evans
description:
  "How to use an IAM policy to properly limit certbot's permissions when
  changing DNS records in Route53"
created: 2026-09-15
tags:
  - security
  - web
---

# Configuring Certbot with Route53, the Safe Way

When using [Let's Encrypt](https://letsencrypt.org/) to get free SSL
certificates, it's necessary to prove ownership of the domain(s) you want to
issue a certificate for. Unlike "classic" certificate providers, Let's Encrypt
only issues relatively short-lived certificates, and requires re-confirmation of
domain ownership every time the certificate is renewed. This means it is crucial
to automate the process.

This article uses
[`certbot`](https://eff-certbot.readthedocs.io/en/stable/man/certbot.html) (as
it is the common choice of client for automation) to validate domain ownership
via DNS with Route53, but the guidance here is also valid for
[other ACME clients](https://letsencrypt.org/docs/client-options/) which support
DNS validation. In particular, this article focuses on how to run `certbot` as a
non-privileged user (e.g. directly on an EC2 instance, in a container, or on an
external server), and how to limit IAM permissions to the minimum necessary for
responding to the ACME DNS challenge.

## Validation methods

The ACME protocol[^*] (which is at the heart of Let's Encrypt's certificate
issuance) currently supports 2 ways to prove domain ownership so that a
certificate can be issued. These are termed "challenges", and are described in
detail on
[Let's Encrypt's documentation pages](https://letsencrypt.org/docs/challenge-types/).
A summary of the key points:

### HTTP-01 challenge

This is the most common challenge type, because it is often the easiest to set
up for small deployments. The service challenges you to serve a
randomly-generated file at a
[specific location](https://en.wikipedia.org/wiki/Well-known_URIs). If you can
do this, it proves you own the server which the domain points to. In `certbot`
this is enabled with the `--webroot` authentication flag.

The main downsides of this challenge type are:

- it is more complicated if you are load balancing multiple servers;
- you cannot issue a certificate in advance (e.g. before switching from a
  previous deployment
  [blue/green-style](https://en.wikipedia.org/wiki/Blue%E2%80%93green_deployment));
  and
- it does not support wildcard certificates.

### DNS-01 challenge

This challenges you to assign a randomly-generated
[`TXT` record](https://en.wikipedia.org/wiki/TXT_record) to the DNS for the
domain. If you can do this, it proves you own the DNS rules for the domain. In
`certbot`, this is enabled with the `--dns-*` authentication flags (the specific
flag depends on the DNS service being used).

The main downsides of this challenge type are:

- the ACME client must have permission to edit DNS records for the domain;
- some DNS providers do not offer APIs for making these changes automatically;
  and
- the time taken for DNS changes to propagate can be long and unpredictable.

Route53 provides an API for making changes to DNS records automatically, and
propagates changes quite rapidly. It is also possible (though not very
intuitive) to set up limited permissions for editing the records safely.
Overall, `certbot` and Route53 can be set up to provide a "best of both worlds"
approach to issuing SSL certificates.

### DNS-PERSIST-01 challenge

This is an
[upcoming challenge type](https://letsencrypt.org/2026/02/18/dns-persist-01)
which is not yet available for production use (as of September 2026). This also
relies on DNS records, but instead of issuing a new DNS challenge each time, it
uses a persistent DNS entry which denotes which account is permitted to issue
certificates for the domain. This simplifies renewal (and removes the delay due
to DNS propagation entirely), but introduces the new security risk of needing to
distribute and protect account credentials for a Let's Encrypt account.

## Installing `certbot` with `certbot-dns-route53`

Assuming you wish to set up a "DNS-01" challenge using
[AWS Route53](https://aws.amazon.com/route53/) as your DNS provider, you will
need `certbot`'s `dns-route53` plugin.

Annoyingly, the `certbot` which is included in most Linux distributions'
repositories does not include plugins for managing DNS entries, and installing
just the plugins via `pip` would lead to version incompatibilities. Instead, it
is necessary to uninstall any distribution-provided `certbot`, and install the
whole thing manually.

[Basic instructions are available for several platforms](https://certbot.eff.org/instructions),
but here are some more "security hardened" instructions for Debian-based
distributions. These set `certbot` up as a non-root user, with scheduled
automatic updates (but never installing updates which are newer than 30 days
old, to reduce the risk of supply chain attacks). Setting `certbot` up in this
way is not required for the rest of the article, but offers an additional layer
of security if a part of your server is compromised.

1. Be sure to uninstall any existing `certbot` installation first

2. Install dependencies:

   ```sh
   sudo apt-get install logrotate python3 python3-dev python3-venv;
   ```

3. Add a dedicated user and directories:

   ```sh
   sudo useradd \
     --system \
     --user-group certbot-runner \
     --shell /usr/sbin/nologin \
     --home /nonexistent;
   sudo mkdir -p \
     /opt/certbot/.cache \
     /etc/letsencrypt/renewal-hooks/deploy \
     /var/log/letsencrypt \
     /var/lib/letsencrypt;
   sudo chmod 0700 /var/log/letsencrypt;
   sudo chown -R certbot-runner:certbot-runner \
     /opt/certbot \
     /etc/letsencrypt \
     /var/log/letsencrypt \
     /var/lib/letsencrypt;
   ```

4. Set up `pip` (Python package manager) and install `certbot` and
   `certbot-dns-route53`:

   ```sh
   sudo -u certbot-runner python3 -m venv /opt/certbot/;
   sudo -u certbot-runner XDG_CACHE_HOME=/opt/certbot/.cache /opt/certbot/bin/pip install --upgrade pip;
   sudo -u certbot-runner XDG_CACHE_HOME=/opt/certbot/.cache /opt/certbot/bin/pip install --upgrade --uploaded-prior-to=P30D certbot certbot-dns-route53;
   ```

5. Configure:

   ```sh
   sudo tee /etc/letsencrypt/cli.ini >/dev/null <<EOF
   # Using logrotate instead
   max-log-backups = 0

   # Adjust interactive output regarding automated renewal (configured via systemd)
   preconfigured-renewal = True
   EOF

   sudo tee /etc/logrotate.d/certbot >/dev/null <<EOF
   /var/log/letsencrypt/*.log {
     weekly
     rotate 12
     notifempty
     missingok
     compress
   }
   EOF

   sudo chown root:certbot-runner /etc/letsencrypt/cli.ini;
   sudo chmod 0440 /etc/logrotate.d/certbot;
   ```

   If using nginx, it must reload its configuration after the certificates are
   updated. We can achieve that by adding a deploy hook, and giving the
   `certbot-runner` user permission to run this specific command as the root
   user via `sudo`:

   ```sh
   sudo tee /etc/sudoers.d/50-certbot-runner >/dev/null <<EOF
   Cmnd_Alias RELOAD_NGINX = /usr/sbin/nginx -s reload
   certbot-runner ALL=(root) NOPASSWD: RELOAD_NGINX
   EOF

   sudo tee /etc/letsencrypt/renewal-hooks/deploy/certbot-deploy >/dev/null <<EOF
   #!/bin/sh
   # permission for this sudo command is granted in 50-certbot-runner
   sudo /usr/sbin/nginx -s reload
   EOF

   sudo chmod 0440 /etc/sudoers.d/50-certbot-runner;
   sudo chmod 0755 /etc/letsencrypt/renewal-hooks/deploy/certbot-deploy;
   ```

   (when using a different web server, the command will obviously be different,
   or in some cases not needed at all).

6. Set up background renewal of certificates:

   ```sh
   sudo tee /lib/systemd/system/certbot.service >/dev/null <<EOF
   [Unit]
   Description=Certbot
   After=network.target

   [Service]
   Type=oneshot
   User=certbot-runner
   Environment="AWS_CONFIG_FILE=/opt/certbot/aws.config"
   ExecStart=/opt/certbot/bin/certbot -q renew --no-random-sleep-on-renew
   PrivateTmp=true
   EOF

   sudo tee /lib/systemd/system/certbot.timer >/dev/null <<EOF
   [Unit]
   Description=Run certbot twice daily

   [Timer]
   OnCalendar=00,12:00:00
   AccuracySec=600
   RandomizedDelaySec=43200
   Persistent=true

   [Install]
   WantedBy=timers.target
   EOF

   sudo chmod 0644 /lib/systemd/system/certbot.service /lib/systemd/system/certbot.timer;
   sudo systemctl enable --now certbot.timer;
   ```

7. Set up automatic updates: (here scheduled to check for updates at a random
   time every Wednesday morning)

   ```sh
   sudo tee /lib/systemd/system/certbot-update.service >/dev/null <<EOF
   [Unit]
   Description=Update certbot to latest version
   After=network.target

   [Service]
   Type=oneshot
   User=certbot-runner
   Environment="XDG_CACHE_HOME=/opt/certbot/.cache"
   ExecStart=/opt/certbot/bin/pip install --upgrade --uploaded-prior-to=P30D certbot certbot-dns-route53
   PrivateTmp=true
   EOF

   sudo tee /lib/systemd/system/certbot-update.timer >/dev/null <<EOF
   [Unit]
   Description=Certbot version update schedule

   [Timer]
   OnCalendar=Wed *-*-* 00:00:00
   AccuracySec=600
   RandomizedDelaySec=43200
   Persistent=true

   [Install]
   WantedBy=timers.target
   EOF

   sudo chmod 0644 /lib/systemd/system/certbot-update.service /lib/systemd/system/certbot-update.timer;
   sudo systemctl enable --now certbot-update.timer;
   ```

## Setting up Route53 IAM permissions

To update DNS entries, `certbot` requires permission to run
[`route53:ListHostedZones`](https://docs.aws.amazon.com/Route53/latest/APIReference/API_ListHostedZones.html),
[`route53:GetChange`](https://docs.aws.amazon.com/Route53/latest/APIReference/API_GetChange.html),
and
[`route53:ChangeResourceRecordSets`](https://docs.aws.amazon.com/Route53/latest/APIReference/API_ChangeResourceRecordSets.html).
Of those, the first two have no particular security concerns, but the third is
very dangerous: it allows editing _all_ DNS records; not just the
[`TXT` records](https://en.wikipedia.org/wiki/TXT_record), but
[`A`, `AAAA`, `CNAME`, etc. records](https://en.wikipedia.org/wiki/List_of_DNS_record_types)
too. If this user were compromised, an attacker would not only be able to get
certificates for the domain, but also update the DNS to point to their own
servers. This would give them total control over the domain, allowing them to
(among other things) act as an eavesdropping proxy, seeing and modifying
unencrypted traffic for all the clients. Very much a
["keys to the kingdom"](https://en.wiktionary.org/wiki/keys_to_the_kingdom)
situation.

Fortunately, IAM
[has a way to restrict access](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/specifying-conditions-route53.html),
not just by type of record, but also by record name. We'll set up both of these
restrictions so that `certbot` can only do the operations which it strictly
needs to do. The full IAM policy is:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["route53:ListHostedZones", "route53:GetChange"],
      "Resource": ["*"]
    },
    {
      "Effect": "Allow",
      "Action": ["route53:ChangeResourceRecordSets"],
      "Resource": ["arn:aws:route53:::hostedzone/*"],
      "Condition": {
        "ForAllValues:StringLike": {
          "route53:ChangeResourceRecordSetsNormalizedRecordNames": [
            "_acme-challenge.example.com",
            "_acme-challenge.*.example.com"
          ]
        },
        "ForAllValues:StringEquals": {
          "route53:ChangeResourceRecordSetsRecordTypes": ["TXT"]
        }
      }
    }
  ]
}
```

Things of note:

- This allows access to all hosted zones (`arn:aws:route53:::hostedzone/*`).
  This saves us needing to find the randomly-generated ID of the hosted zone we
  want to use. The `route53:ChangeResourceRecordSetsNormalizedRecordNames`
  condition will protect it by domain name anyway.
- `route53:ChangeResourceRecordSetsNormalizedRecordNames` is used to limit the
  records which `certbot` can modify to `_acme-challenge.*`; this is the only
  DNS record which is required by the ACME challenge.
- `route53:ChangeResourceRecordSetsRecordTypes` is used to limit the record
  types which `certbot` can modify to `TXT`; the only DNS record type which is
  required by the ACME challenge.

By using this access policy, we ensure that even if our `certbot-runner` user is
compromised, an attacker will not gain unfettered control over our DNS. They
will be able to issue themselves a certificate for our domain (which is
certainly bad enough!), but they will not be able to modify other records, such
as changing the server IP, or email records.

1. Create an IAM user with the above policy (substituting `example.com` as
   necessary)

2. Create an access key for the user and record the ID and secret. Note: it is
   also possible to attach an IAM role directly to an EC2 instance without
   creating an access key at all. In some ways, this is more secure (since the
   key cannot be leaked; only the EC2 instance can assume the IAM role), but in
   other ways it is less secure (all other processes running on the same EC2
   instance can assume the same IAM permissions). Personally I find that the
   trade-off is not worth it, and access keys remain the most secure option, but
   this decision will vary depending on your specific situation.

3. On the server where `certbot` runs:

   ```sh
   sudo vi /opt/certbot/aws.config
   ```

   Populate the file with:

   ```
   [default]
   aws_access_key_id=
   aws_secret_access_key=
   ```

   (filling in the values from the user created above)

   Save the file and run:

   ```sh
   sudo chmod 0400 /opt/certbot/aws.config;
   sudo chown certbot-runner:certbot-runner /opt/certbot/aws.config;
   ```

## Requesting a certificate

Finally, we can use this setup to request a certificate. Here is an example
which requests a wildcard certificate:

1. ```sh
   sudo -u certbot-runner AWS_CONFIG_FILE=/opt/certbot/aws.config /opt/certbot/bin/certbot certonly \
     --non-interactive \
     --agree-tos \
     --register-unsafely-without-email \
     --preferred-profile tlsserver \
     --keep-until-expiring \
     --cert-name wild \
     --dns-route53 \
     -d 'example.com' \
     -d '*.example.com'
   ```

   (replace `example.com` with your domain, and `wild` with whatever internal
   name you want to give the certificate).

   This step may take a minute or two, since it must wait for the challenge
   response DNS records to propagate.

   Note that `--preferred-profile tlsserver` is optional; it opts in to a
   shorter lifespan for the certificate, which is fine for us since we have
   automated its renewal anyway.

2. The certificates are stored in `/etc/letsencrypt/live/wild/`; for example, to
   configure nginx to use them:

   ```nginxconf
   ssl_certificate /etc/letsencrypt/live/wild/fullchain.pem;
   ssl_certificate_key /etc/letsencrypt/live/wild/privkey.pem;
   ```

Now that a certificate has been requested, `certbot` will automatically renew it
when it is close to expiry. And during renewal, it will automatically update the
DNS records with the next challenge.

## Bonus configuration: limit certificate issuance

If you know exactly which certificate authorities you want to get SSL
certificates from, you can add an extra DNS record to make this explicit. This
helps to avoid some risk if a certificate authority you are not using has a bug
in their verification method. It won't stop certificates issued by other
authorities from being valid, but it should stop well-behaved certificate
authorities from issuing certificates for your domain if they are not on the
list.

The DNS record is `CAA` (Certificate Authority Authorization), and it is quite
easy to configure:

- type: `CAA`
- name: `example.com` _(note: this automatically applies to all subdomains)_
- value: `0 issue "letsencrypt.org"`
- ttl: _(any appropriate time-to-live value)_

It is also possible to list multiple certificate authorities, and to restrict
the type of challenges which the authority may use. See
[Let's Encrypt's documentation](https://letsencrypt.org/docs/caa/) for more
details.

## More information / further reading

- [Let's Encrypt list of ACME challenge types](https://letsencrypt.org/docs/challenge-types/)
- [AWS Route53 fine-grained access control](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/specifying-conditions-route53.html)
- [Certificate Authority Authorization explanation](https://letsencrypt.org/docs/caa/)
- [`certbot` CLI documentation](https://eff-certbot.readthedocs.io/en/stable/man/certbot.html)

[^*]:
    Not to be confused with the
    [ACME corporation](https://en.wikipedia.org/wiki/Acme_Corporation)

*[ACME]: Automated Certificate Management Environment

*[IAM]: AWS Identity and Access Management
