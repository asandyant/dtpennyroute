# DTPennyRoute Starter

Mobile-friendly web app for Dollar Tree penny hunting.

## What is included

- Node/Express backend
- Login/signup foundation
- JSON database foundation
- Preloaded 6/1/26 penny drop list
- Preloaded earlier field-confirmed finds
- Penny List search
- My Penny Run saved hunt lists
- Report Find buttons
- PennyScore and Worth the Drive Score starter logic
- Render-ready setup

## Local run

```bash
npm install
npm start
```

Open:

```text
http://localhost:3000
```

## Render setup

Build command:

```bash
npm install
```

Start command:

```bash
npm start
```

Environment variables:

```text
NODE_ENV=production
SESSION_SECRET=change-this-to-a-long-random-secret
STORAGE_PATH=/opt/render/project/src/storage
```

For real persistence on Render, add a persistent disk mounted at:

```text
/opt/render/project/src/storage
```

