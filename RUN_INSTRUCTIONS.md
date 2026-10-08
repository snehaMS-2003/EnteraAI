# How to Run the Entera Project

### Recommended: Start Full Stack (1 Command)
Run the combined development command in your terminal from the project root:
```powershell
npm run dev
```
*(Or run `.\start_project.ps1` on Windows, or `./start_project.sh` on Linux/macOS)*

This automatically starts both the Express backend (port 5000) and the Vite frontend (port 5173) concurrently.

---

### Alternative: Start in Separate Terminals (2 Terminals)

If you prefer running the backend and frontend in separate terminals:

#### Terminal 1: Backend Server
```powershell
cd server
node index.js
```
*Backend runs on `http://localhost:5000`*

#### Terminal 2: Frontend Application
```powershell
npm run client
```
*Frontend runs on `http://localhost:5173`*

---

### Production Mode
To run the precompiled production bundle:
```powershell
# 1. Build frontend
npm run build

# 2. Start production server
npm start
```
The server will host both the REST API and the optimized SPA from `dist/` on port 5000.

