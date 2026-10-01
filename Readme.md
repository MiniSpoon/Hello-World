# Hello World

A one-page site. Portal opens and seals it.

The page itself is [`index.html`](index.html). Nothing here runs all the time except CloudFront, which is free while idle. There is no server, no load balancer, and no public IP.

## What AWS runs

| Piece | Purpose |
|---|---|
| Private S3 bucket | Holds `index.html` |
| CloudFront | HTTPS on `*.cloudfront.net` |
| CloudFront Function + key-value store | The gate. Key `gate` = `sealed` stops the page at the edge. A missing key means open. |
| SSM `/hello-world/kvs-arn` and `/hello-world/url` | Addresses Portal reads |

Sealing does not delete the site. The next request gets a short "gate is sealed" page and never reaches S3. Opening writes `gate=open`. Edges follow within a few seconds.

A quiet Hello World costs about nothing either way. The gate is here so Portal has a real switch, and so later projects can grow a more expensive one (an EC2 box, for example) behind the same buttons.

## Cost tags

Every resource is tagged:

| Key | Value |
|---|---|
| `Application` | `HelloWorld` |
| `Project` | `HelloWorld` |
| `Environment` | `personal` |
| `ManagedBy` | `cdk` |
| `Owner` | `tristan` (from `infra/cdk.json`) |
| `Component` | `site` / `site-cdn` / `gate` |

Filter Cost Explorer on `Application = HelloWorld` after the `Application` tag is activated (Billing → Cost allocation tags). Prometheus uses the same key.

## IAM (before the first deploy)

`grok-deploy` can create S3, CloudFront, and Lambda, and may only be allowed to create IAM roles for stacks it already knows. Attach [`docs/iam-policy.json`](docs/iam-policy.json) so it can create `HelloWorldStack-*` roles. An admin has to attach that policy.

## Deploy

From this machine, in `us-east-1` (the key-value store is a CloudFront resource):

```powershell
cd "C:\Users\Tristan\Projects\Hello World\infra"
npm install
npx cdk bootstrap   # first time in the account/region only
npx cdk deploy HelloWorldStack
```

Outputs: **SiteUrl**, plus the SSM paths Portal already expects. Deploy Portal after this, or before — Portal shows the stone as unbound until these parameters exist.

`cdk destroy` deletes the bucket and the site files. `index.html` stays in this folder.
