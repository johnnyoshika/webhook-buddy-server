# Webhook Buddy Server

## Quick Start

When you only need a running server to test [Webhook Buddy Client](https://github.com/webhook-buddy/webhook-buddy-client), use `docker-compose` to quickly get the server up and running.

- `docker-compose up -d`

## Development Environment

### VS Code Setup

Install `Prettier - Code formatter` extension. Prettier will automatically format files on save.

### Postgres Setup

- `docker pull johnnyoshika/postgres_webhook_buddy:migration00004`

### Node Setup

- Use Node version 12+ (e.g. 12.16.1)
  - GraphQL subscriptions won't work with Node version 8 or less
- `npm install`

### Start Server

```
docker run --name postgres_webhook_buddy --env PGDATA=postgres -d -p 5432:5432 johnnyoshika/postgres_webhook_buddy:migration00004
npm start
```

## Explore

Go to: http://localhost:8000/graphql

### GraphQL Requests

#### Log In

```
mutation {
  login(input: { email: "lou@email.com", password: "1Password" }) {
    token
  }
}
```

#### Get Me

HTTP Headers:

```
{
  "x-token": "{token value from login mutation}"
}
```

Request:

```
{
  me {
    id
    firstName
    lastName
    email
  }
}
```

## Debug in VS Code

<kbd>F5</kbd>

_Note: Re-compile on file change isn't available in debug mode, so stop/start is required to reflect code changes._

## Build

```
npm run build
```

Deployable build will be in `dist` folder.

Command to run production app in Linux / macOS:

```
NODE_PATH=dist/ node ./dist/index.js
```

Command to run production app in Windows:

```
$env:NODE_PATH="dist/"
node ./dist/index.js
```

## Wiki

- [Create new dev database](https://github.com/johnnyoshika/webhook-buddy-server/wiki/Create-new-dev-database)
- [Send webhooks to local database](https://github.com/johnnyoshika/webhook-buddy-server/wiki/Send-webhooks-to-local-database)
- [Deployment](https://github.com/webhook-buddy/webhook-buddy-server/wiki/Deployment)
